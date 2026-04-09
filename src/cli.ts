#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import open from 'open';
import { DatabaseManager } from './index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve the built React frontend from frontend/dist
const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const HOST = '127.0.0.1';
const MAX_PORT_SCAN = 25;

const toMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const parseLimit = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? '100'), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 500);
};

const listenOnAvailablePort = async (
  app: express.Express,
  startPort: number
): Promise<{ server: ReturnType<express.Express['listen']>; port: number }> => {
  for (let port = startPort; port < startPort + MAX_PORT_SCAN; port += 1) {
    try {
      const server = await new Promise<ReturnType<express.Express['listen']>>((resolve, reject) => {
        const activeServer = app.listen(port, HOST, () => resolve(activeServer));
        activeServer.once('error', reject);
      });

      return { server, port };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'EADDRINUSE') {
        throw error;
      }
    }
  }

  throw new Error(`Unable to find an available port between ${startPort} and ${startPort + MAX_PORT_SCAN - 1}.`);
};

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Add it to your .env file before running dbportal.');
    process.exitCode = 1;
    return;
  }

  const manager = new DatabaseManager(process.env.DATABASE_URL);
  try {
    await manager.connect();
  } catch (error) {
    console.error(`Database connection failed: ${toMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Serve the built React app
  app.use(express.static(frontendDist));

  app.get('/api/tables', async (_request, response) => {
    try {
      const tables = await manager.getTables();
      response.status(200).json({ tables, dbType: manager.getKind() });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get('/api/capabilities', (_request, response) => {
    response.status(200).json({
      dbType: manager.getKind(),
      capabilities: manager.getCapabilities(),
    });
  });

  app.get('/api/overview', async (_request, response) => {
    try {
      const overview = await manager.getOverview();
      response.status(200).json(overview);
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.get('/api/data/:name', async (request, response) => {
    const { name } = request.params;
    const limit = parseLimit(request.query.limit);

    try {
      const data = await manager.getTableData(name, limit);
      response.status(200).json({ name, limit, data });
    } catch (error) {
      response.status(500).json({ error: toMessage(error) });
    }
  });

  app.post('/api/query', async (request, response) => {
    const bodyQuery = request.body?.query;
    const query = bodyQuery !== undefined ? bodyQuery : request.body;

    if (typeof query === 'string' && !query.trim()) {
      response.status(400).json({ error: 'Query string cannot be empty.' });
      return;
    }

    if (typeof query !== 'string' && (typeof query !== 'object' || query === null || Array.isArray(query))) {
      response.status(400).json({
        error:
          'Query must be a string or a structured JSON object. For MongoDB, use: {"collection":"name","filter":{},"limit":50}',
      });
      return;
    }

    try {
      const data = await manager.query(query);
      response.status(200).json({ data });
    } catch (error) {
      response.status(400).json({ error: toMessage(error) });
    }
  });

  // SPA fallback — serve index.html for any unmatched GET route
  app.get('/{*path}', (_request, response) => {
    response.sendFile(path.join(frontendDist, 'index.html'));
  });

  let server: ReturnType<express.Express['listen']> | null = null;

  try {
    const started = await listenOnAvailablePort(app, Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 3000);
    server = started.server;
    const uiUrl = `http://localhost:${started.port}`;

    console.log(`dbportal connected (${manager.getKind()}).`);
    console.log(`Dashboard running at ${uiUrl}`);

    try {
      await open(uiUrl);
    } catch {
      console.log(`Unable to auto-open browser. Visit ${uiUrl} manually.`);
    }
  } catch (error) {
    console.error(`Server startup failed: ${toMessage(error)}`);
    await manager.close();
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

    await manager.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    shutdown().catch(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown().catch(() => {
      process.exit(1);
    });
  });
};

main().catch((error) => {
  console.error(`Fatal error: ${toMessage(error)}`);
  process.exit(1);
});
