#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import open from "open";
import { DatabaseManager } from "./index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve the built React frontend from frontend/dist
const frontendDist = path.resolve(__dirname, "..", "frontend", "dist");

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? "0", 10);
const HOST = "127.0.0.1";
const MAX_PORT_SCAN = 25;

const toMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const parseLimit = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? "100"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 500);
};

const isSqlDriver = (kind: string): boolean => {
  const value = kind.toLowerCase();
  return value.includes('postgres') || value.includes('mysql') || value.includes('mssql') || value.includes('sqlserver') || value.includes('sqlite');
};

const isMongoDriver = (kind: string): boolean => kind.toLowerCase().includes('mongo');

const isReadOnlySqlQuery = (query: string): boolean => {
  const normalized = query.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ').trim().toLowerCase();

  // Read-only entry points we allow in this app.
  const startsReadOnly = /^(select|with|show|describe|desc|explain|pragma)\b/.test(normalized);
  if (!startsReadOnly) {
    return false;
  }

  // Block known mutating/privileged statements even if hidden in CTEs.
  const forbidden = /\b(insert|update|delete|drop|truncate|alter|create|replace|merge|grant|revoke|commit|rollback|savepoint|attach|detach)\b/;
  return !forbidden.test(normalized);
};

const hasMutatingMongoStages = (pipeline: unknown): boolean => {
  if (!Array.isArray(pipeline)) {
    return false;
  }

  const blockedStages = new Set(['$out', '$merge']);
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      continue;
    }

    const stageOperator = Object.keys(stage)[0];
    if (stageOperator && blockedStages.has(stageOperator)) {
      return true;
    }
  }

  return false;
};

import net from "node:net";

const checkPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        // Also check explicitly on 127.0.0.1 for Windows compatibility
        const server2 = net.createServer();
        server2.once("error", () => resolve(false));
        server2.once("listening", () => {
          server2.close(() => resolve(true));
        });
        server2.listen(port, "127.0.0.1");
      });
    });
    server.listen(port, "0.0.0.0");
  });
};

const listenOnAvailablePort = async (
  app: express.Express,
  startPort: number,
): Promise<{ server: ReturnType<express.Express["listen"]>; port: number }> => {
  if (startPort === 0) {
    return new Promise((resolve, reject) => {
      const activeServer = app.listen(0, "127.0.0.1", () => {
        const address = activeServer.address();
        resolve({
          server: activeServer,
          port: typeof address === "object" && address !== null ? address.port : 0,
        });
      });
      activeServer.once("error", reject);
    });
  }

  for (let port = startPort; port < startPort + MAX_PORT_SCAN; port += 1) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      try {
        const server = await new Promise<ReturnType<express.Express["listen"]>>(
          (resolve, reject) => {
            const activeServer = app.listen(port, "127.0.0.1", () =>
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
  const urls: { id: string; url: string }[] = [];
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

  const manager = new DatabaseManager();
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

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Serve the built React app
  app.use(express.static(frontendDist));

  app.get("/api/connections", (_request, response) => {
    const list = manager.listConnections().map((c) => ({
      id: c.getId(),
      name: c.getName(),
      kind: c.getKind(),
    }));
    response.status(200).json({ connections: list });
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

  app.get('/api/data/:name', async (request, response) => {
    const dbId = String(request.query.dbId || 'primary');
    const { name } = request.params;
    const limit = parseLimit(request.query.limit);
    const offset = Number.parseInt(String(request.query.offset || '0'), 10);
    const sortBy = request.query.sortBy ? String(request.query.sortBy) : undefined;
    const sortOrder = (request.query.sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
    
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
      const data = await conn.getTableData(name, limit, offset, sortBy, sortOrder, filters);
      response.status(200).json({ 
        name, 
        limit, 
        offset,
        sortBy,
        sortOrder,
        filters,
        data 
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

      if (typeof query === 'string') {
        if (!isSqlDriver(dbKind)) {
          response.status(400).json({ error: 'String queries are only supported for SQL drivers.' });
          return;
        }

        if (!isReadOnlySqlQuery(query)) {
          response.status(403).json({ error: 'Only read-only SQL statements are allowed in this build.' });
          return;
        }
      } else if (isMongoDriver(dbKind)) {
        const mongoQuery = query as { pipeline?: unknown };
        if (hasMutatingMongoStages(mongoQuery.pipeline)) {
          response.status(403).json({ error: 'MongoDB write pipeline stages are disabled. Remove $out/$merge.' });
          return;
        }
      }

      const result = await conn.query(query);
      response.status(200).json(result);
    } catch (error) {
      response.status(400).json({ error: toMessage(error) });
    }
  });

  // SPA fallback — serve index.html for any unmatched route
  app.use((request, response) => {
    response.sendFile(path.join(frontendDist, "index.html"));
  });

  let server: ReturnType<express.Express["listen"]> | null = null;

  try {
    const started = await listenOnAvailablePort(
      app,
      Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 0,
    );
    server = started.server;
    const uiUrl = `http://localhost:${started.port}`;

    console.log(`dbportal connected (${urls.length} database(s)).`);
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
