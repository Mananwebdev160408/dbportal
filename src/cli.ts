#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import dotenv from "dotenv";
import express from "express";
// Rate limiting import removed
import open from "open";
import { DatabaseManager } from "./index.js";
import { DockerService, ContainerLaunchConfig } from "./docker-service.js";
import { isReadOnlySqlQuery } from "./query-safety.js";
import {
  registerConnectionStringForRedaction,
  sanitizeErrorMessage,
} from "./error-sanitizer.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve the built React frontend from frontend/dist
const frontendDist = path.resolve(__dirname, "..", "frontend", "dist");

const MAX_PORT_SCAN = 25;

interface CliOptions {
  host: string;
  port: number;
  docker: boolean;
  write: boolean;
}

// Some database drivers echo the raw connection string, or a fragment of
// it, inside their error messages (e.g. when a password contains an
// unescaped "@" and URL parsing fails). Every error surfaced to a console
// log or an API response goes through toMessage(), so credentials are
// scrubbed here rather than at each individual call site.
const toMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "Unknown error";
  return sanitizeErrorMessage(message);
};

const parseLimit = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? "100"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 500);
};

const parsePortOption = (value: string | undefined, source: string): number => {
  if (!value) {
    throw new Error(source + " requires a port value.");
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(source + " must be an integer between 0 and 65535.");
  }

  return port;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    host: process.env.HOST?.trim() || "127.0.0.1",
    port: parsePortOption(process.env.PORT ?? "0", "PORT"),
    docker: false,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      console.log(
        "Usage: dbportal [--host <host>] [--port <port>] [--docker] [--write]",
      );
      process.exit(0);
    }

    if (arg === "--docker") {
      options.docker = true;
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--host") {
      const host = argv[index + 1]?.trim();
      if (!host) {
        throw new Error("--host requires a host value.");
      }
      options.host = host;
      index += 1;
      continue;
    }

    if (arg.startsWith("--host=")) {
      const host = arg.slice("--host=".length).trim();
      if (!host) {
        throw new Error("--host requires a host value.");
      }
      options.host = host;
      continue;
    }

    if (arg === "--port" || arg === "-p") {
      options.port = parsePortOption(argv[index + 1], arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      options.port = parsePortOption(arg.slice("--port=".length), "--port");
      continue;
    }

    throw new Error("Unknown option: " + arg);
  }

  return options;
};

const hostForUrl = (host: string): string => {
  if (host === "0.0.0.0" || host === "::") {
    return "localhost";
  }

  return host.includes(":") ? "[" + host + "]" : host;
};

const isSqlDriver = (kind: string): boolean => {
  const value = kind.toLowerCase();
  return (
    value.includes("postgres") ||
    value.includes("cockroach") ||
    value.includes("mysql") ||
    value.includes("mssql") ||
    value.includes("sqlserver") ||
    value.includes("sqlite")
  );
};

const isMongoDriver = (kind: string): boolean =>
  kind.toLowerCase().includes("mongo");

const hasMutatingMongoStages = (pipeline: unknown): boolean => {
  if (!Array.isArray(pipeline)) {
    return false;
  }

  const blockedStages = new Set(["$out", "$merge"]);
  for (const stage of pipeline) {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
      continue;
    }

    const stageOperator = Object.keys(stage)[0];
    if (stageOperator && blockedStages.has(stageOperator)) {
      return true;
    }
  }

  return false;
};

const checkPortAvailable = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
};

const listenOnAvailablePort = async (
  app: express.Express,
  startPort: number,
  host: string,
): Promise<{ server: ReturnType<express.Express["listen"]>; port: number }> => {
  if (startPort === 0) {
    return new Promise((resolve, reject) => {
      const activeServer = app.listen(0, host, () => {
        const address = activeServer.address();
        resolve({
          server: activeServer,
          port:
            typeof address === "object" && address !== null ? address.port : 0,
        });
      });
      activeServer.once("error", reject);
    });
  }

  for (let port = startPort; port < startPort + MAX_PORT_SCAN; port += 1) {
    const isAvailable = await checkPortAvailable(port, host);
    if (isAvailable) {
      try {
        const server = await new Promise<ReturnType<express.Express["listen"]>>(
          (resolve, reject) => {
            const activeServer = app.listen(port, host, () =>
              resolve(activeServer),
            );
            activeServer.once("error", reject);
          },
        );
        return { server, port };
      } catch (error) {
        // Fallback to loop if starting Express still fails
      }
    }
  }

  throw new Error(
    `Unable to find an available port between ${startPort} and ${startPort + MAX_PORT_SCAN - 1}.`,
  );
};

const main = async () => {
  const options = parseCliOptions(process.argv.slice(2));
  let dockerService: DockerService | null = null;
  const urls: { id: string; url: string }[] = [];

  if (options.docker) {
    dockerService = new DockerService();
    const isDockerAvailable = await dockerService.checkConnection();
    if (!isDockerAvailable) {
      console.error(
        "Docker daemon is not running or accessible. Please start Docker and try again.",
      );
      process.exitCode = 1;
      return;
    }
  } else {
    if (process.env.DATABASE_URL) {
      urls.push({ id: "primary", url: process.env.DATABASE_URL });
    }

    // Look for DATABASE_URL_1, DATABASE_URL_2, etc.
    for (let i = 1; i <= 10; i++) {
      const url = process.env[`DATABASE_URL_${i}`];
      if (url) {
        urls.push({ id: `db_${i}`, url });
      }
    }

    if (urls.length === 0) {
      console.error(
        "No DATABASE_URL found in .env. Please provide at least one connection string.",
      );
      process.exitCode = 1;
      return;
    }
  }

  for (const item of urls) {
    registerConnectionStringForRedaction(item.url);
  }

  const manager = new DatabaseManager();
  if (!options.docker) {
    for (const item of urls) {
      manager.addConnection(item.id, item.url);
    }

    try {
      await manager.connectAll();
    } catch (error) {
      console.error(`Database connection failed: ${toMessage(error)}`);
      process.exitCode = 1;
      return;
    }
  }

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Rate limiting disabled

  // Serve the built React app
  app.use(express.static(frontendDist));

  app.get("/api/config", (_request, response) => {
    response.status(200).json({
      mode: options.docker ? "docker" : "database",
      writeMode: options.write,
    });
  });

  app.get("/api/connections", (_request, response) => {
    const list = manager.listConnections().map((c) => ({
      id: c.getId(),
      name: c.getName(),
      kind: c.getKind(),
    }));
    response.status(200).json({ connections: list });
  });

  // Docker Routes (only active in dockerMode)
  app.get("/api/docker/containers", async (_request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    try {
      const list = await dockerService.listContainers();
      response.status(200).json({ containers: list });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/containers/:id/logs", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { id } = request.params;
    try {
      const logs = await dockerService.getContainerLogs(id);
      response.status(200).json({ logs });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/containers/:id/stats", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { id } = request.params;
    try {
      const stats = await dockerService.getContainerStats(id);
      response.status(200).json(stats);
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/containers/:id/inspect", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { id } = request.params;
    try {
      const details = await dockerService.inspectContainer(id);
      response.status(200).json(details);
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/docker/containers/:id/action", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { id } = request.params;
    const action = request.body?.action;
    if (
      action !== "start" &&
      action !== "stop" &&
      action !== "restart" &&
      action !== "delete"
    ) {
      response
        .status(400)
        .json({ error: "Action must be start, stop, restart, or delete." });
      return;
    }
    try {
      await dockerService.performAction(id, action);
      response.status(200).json({ success: true });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/images", async (_request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    try {
      const list = await dockerService.listImages();
      response.status(200).json({ images: list });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.delete("/api/docker/images/:id", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { id } = request.params;
    try {
      await dockerService.removeImage(id);
      response.status(200).json({ success: true });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/volumes", async (_request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    try {
      const list = await dockerService.listVolumes();
      response.status(200).json({ volumes: list });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.delete("/api/docker/volumes/:name", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { name } = request.params;
    try {
      await dockerService.removeVolume(name);
      response.status(200).json({ success: true });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  // ── Bulk Actions ──────────────────────────────────────────────────────────
  app.post("/api/docker/containers/bulk-action", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { ids, action } = request.body as { ids: string[]; action: string };
    if (!Array.isArray(ids) || ids.length === 0) {
      response.status(400).json({ error: "ids must be a non-empty array." });
      return;
    }
    if (action !== "stop" && action !== "delete") {
      response.status(400).json({ error: "action must be stop or delete." });
      return;
    }
    try {
      const results = await dockerService.performBulkAction(ids, action);
      response.status(200).json({ results });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/docker/images/bulk-delete", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { ids } = request.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      response.status(400).json({ error: "ids must be a non-empty array." });
      return;
    }
    try {
      const results = await dockerService.removeImages(ids);
      response.status(200).json({ results });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/docker/volumes/bulk-delete", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const { names } = request.body as { names: string[] };
    if (!Array.isArray(names) || names.length === 0) {
      response.status(400).json({ error: "names must be a non-empty array." });
      return;
    }
    try {
      const results = await dockerService.removeVolumes(names);
      response.status(200).json({ results });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/hub/search", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const query = String(request.query.query || "");
    if (!query) {
      response.status(400).json({ error: "query parameter is required." });
      return;
    }
    try {
      const results = await dockerService.searchDockerHub(query);
      response.status(200).json({ results });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/docker/hub/tags", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const repo = String(request.query.repo || "");
    if (!repo) {
      response.status(400).json({ error: "repo parameter is required." });
      return;
    }
    try {
      const tags = await dockerService.getDockerHubTags(repo);
      response.status(200).json({ tags });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/docker/hub/run", async (request, response) => {
    if (!options.docker || !dockerService) {
      response.status(400).json({ error: "Docker mode is not enabled." });
      return;
    }
    const configs = request.body?.configs as ContainerLaunchConfig[];
    if (!Array.isArray(configs) || configs.length === 0) {
      response
        .status(400)
        .json({ error: "configs array is required and cannot be empty." });
      return;
    }

    // Set headers for chunked streaming
    response.setHeader("Content-Type", "text/plain");
    response.setHeader("Transfer-Encoding", "chunked");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    const log = (msg: string) => {
      response.write(`${msg}\n`);
    };

    try {
      for (const config of configs) {
        log(`[INFO] Preparing container ${config.name || config.image}...`);
        await dockerService.runContainer(config, (status) => {
          log(`[PROGRESS] ${config.name || config.image}: ${status}`);
        });
        log(`[SUCCESS] Container ${config.name || config.image} is running!`);
      }
      log(`[COMPLETE] All containers started successfully.`);
      response.end();
    } catch (error) {
      log(`[ERROR] ${toMessage(error)}`);
      response.end();
    }
  });

  app.get("/api/tables", async (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    try {
      const conn = manager.getConnection(dbId);
      const tables = await conn.getTables();
      response.status(200).json({ tables, dbType: conn.getKind() });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/capabilities", (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    try {
      const conn = manager.getConnection(dbId);
      response.status(200).json({
        dbType: conn.getKind(),
        capabilities: conn.getCapabilities(),
      });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/overview", async (request, response) => {
    const dbId = request.query.dbId ? String(request.query.dbId) : null;
    try {
      if (dbId) {
        const conn = manager.getConnection(dbId);
        const overview = await conn.getOverview();
        response.status(200).json(overview);
      } else {
        const multiOverview = await manager.getMultiOverview();
        response.status(200).json(multiOverview);
      }
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/schema", async (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    try {
      const conn = manager.getConnection(dbId);
      const schema = await conn.getSchema();
      response.status(200).json(schema);
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get("/api/global-search", async (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    const search = String(request.query.query || "").trim();

    if (!search) {
      response.status(400).json({
        error: "Search query is required.",
      });
      return;
    }

    try {
      const conn = manager.getConnection(dbId);

      const tables = await conn.getTables();

      const results: {
        table: string;
        count: number;
        rows: Record<string, unknown>[];
      }[] = [];

      for (const table of tables) {
        try {
          const rows = await conn.getTableData(table, 100);

          const matches = rows.filter((row) =>
            Object.values(row).some((value) =>
              String(value).toLowerCase().includes(search.toLowerCase()),
            ),
          );

          if (matches.length > 0) {
            results.push({
              table,
              count: matches.length,
              rows: matches.slice(0, 10),
            });
          }
        } catch {
          // Ignore table-level failures
        }
      }

      response.status(200).json({
        query: search,
        totalTables: results.length,
        results,
      });
    } catch (error) {
      response.status(500).json({
        error: toMessage(error),
      });
    }
  });

  app.get("/api/data/:name", async (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    const { name } = request.params;
    const limit = parseLimit(request.query.limit);
    const offset = Number.parseInt(String(request.query.offset || "0"), 10);
    const sortBy = request.query.sortBy
      ? String(request.query.sortBy)
      : undefined;
    const sortOrder = (request.query.sortOrder === "desc" ? "desc" : "asc") as
      | "asc"
      | "desc";

    let filters: Record<string, string> = {};
    if (request.query.filters) {
      try {
        filters = JSON.parse(String(request.query.filters));
      } catch {
        filters = {};
      }
    }

    try {
      const conn = manager.getConnection(dbId);
      const data = await conn.getTableData(
        name,
        limit,
        offset,
        sortBy,
        sortOrder,
        filters,
      );
      response.status(200).json({
        name,
        limit,
        offset,
        sortBy,
        sortOrder,
        filters,
        data,
      });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post("/api/query", async (request, response) => {
    const dbId = String(request.query.dbId || "primary");
    const bodyQuery = request.body?.query;
    const query = bodyQuery !== undefined ? bodyQuery : request.body;

    if (typeof query === "string" && !query.trim()) {
      response.status(400).json({ error: "Query string cannot be empty." });
      return;
    }

    try {
      const conn = manager.getConnection(dbId);
      const dbKind = conn.getKind();

      if (typeof query === "string") {
        if (!isSqlDriver(dbKind)) {
          response.status(400).json({
            error: "String queries are only supported for SQL drivers.",
          });
          return;
        }

        if (!isReadOnlySqlQuery(query) && !options.write) {
          response.status(403).json({
            error:
              "Write mode is disabled. Start dbportal with --write flag to enable INSERT, UPDATE, and DELETE.",
          });
          return;
        }
      } else if (isMongoDriver(dbKind)) {
        const mongoQuery = query as { pipeline?: unknown };
        if (hasMutatingMongoStages(mongoQuery.pipeline)) {
          response.status(403).json({
            error:
              "MongoDB write pipeline stages are disabled. Remove $out/$merge.",
          });
          return;
        }
      }

      const result = await conn.query(query);
      response.status(200).json(result);
    } catch (error) {
      const message = toMessage(error);
      const isTimeout =
        message.toLowerCase().includes("timed out") ||
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("etimedout") ||
        message.toLowerCase().includes("killed");
      response.status(isTimeout ? 504 : 400).json({
        error: message,
        ...(isTimeout && {
          timeout: true,
          retryAfter: 5,
          suggestion:
            "The database connection timed out. This usually means the server is unreachable, the connection string is incorrect, or the database is overloaded. Please verify your connection details and try again.",
        }),
      });
    }
  });

  // SPA fallback — serve index.html for any unmatched route, except for API and static assets
  app.use((request, response) => {
    if (
      request.path.startsWith("/api/") ||
      request.path.startsWith("/assets/") ||
      path.extname(request.path)
    ) {
      response.status(404).json({ error: "Not found" });
      return;
    }
    response.sendFile(path.join(frontendDist, "index.html"));
  });

  let server: ReturnType<express.Express["listen"]> | null = null;

  try {
    const started = await listenOnAvailablePort(
      app,
      options.port,
      options.host,
    );
    server = started.server;
    const uiUrl = "http://" + hostForUrl(options.host) + ":" + started.port;

    if (options.docker) {
      console.log(`dbportal connected (Docker Mode).`);
    } else {
      console.log(`dbportal connected (${urls.length} database(s)).`);
    }
    console.log(`Dashboard running at ${uiUrl}`);

    try {
      await open(uiUrl);
    } catch {
      console.log(`Unable to auto-open browser. Visit ${uiUrl} manually.`);
    }
  } catch (error) {
    console.error(`Server startup failed: ${toMessage(error)}`);
    await manager.closeAll();
    process.exitCode = 1;
    return;
  }

  const shutdown = async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve());
      });
      server = null;
    }

    await manager.closeAll();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    shutdown().catch(() => {
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown().catch(() => {
      process.exit(1);
    });
  });
};

main().catch((error) => {
  console.error(`Fatal error: ${toMessage(error)}`);
  process.exit(1);
});
