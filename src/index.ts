import { MongoDriver } from "./drivers/mongodb-driver.js";
import { MySqlDriver } from "./drivers/mysql-driver.js";
import { PostgresDriver } from "./drivers/postgres-driver.js";
import { SqliteDriver } from "./drivers/sqlite-driver.js";
import { MsSqlDriver } from "./drivers/mssql-driver.js";
import { RedisDriver } from "./drivers/redis-driver.js";
import type {
  DatabaseDriver,
  DriverCapabilities,
  DriverQueryInput,
  DatabaseSchema,
} from "./drivers/types.js";

export type SupportedDatabase = string;

export interface DriverRegistration {
  kind: string;
  protocols: string[];
  create: (databaseUrl: string) => DatabaseDriver;
}

const driverRegistry = new Map<string, DriverRegistration>();

const normalizeProtocol = (protocol: string): string => {
  const value = protocol.toLowerCase();
  return value.endsWith(":") ? value : `${value}:`;
};

export const registerDatabaseDriver = (
  registration: DriverRegistration,
): void => {
  for (const protocol of registration.protocols) {
    driverRegistry.set(normalizeProtocol(protocol), registration);
  }
};

export const listSupportedProtocols = (): string[] => {
  return Array.from(driverRegistry.keys()).sort();
};

const registerBuiltInDrivers = (): void => {
  if (driverRegistry.size > 0) {
    return;
  }

  registerDatabaseDriver({
    kind: "postgres",
    protocols: ["postgres:", "postgresql:"],
    create: (databaseUrl) => new PostgresDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "cockroachdb",
    protocols: ["cockroachdb:", "cockroach:"],
    create: (databaseUrl) => new PostgresDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "mongodb",
    protocols: ["mongodb:", "mongodb+srv:"],
    create: (databaseUrl) => new MongoDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "mysql",
    protocols: ["mysql:", "mariadb:"],
    create: (databaseUrl) => new MySqlDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "sqlite",
    protocols: ["sqlite:", "sqlite3:"],
    create: (databaseUrl) => new SqliteDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "sqlserver",
    protocols: ["mssql:", "sqlserver:"],
    create: (databaseUrl) => new MsSqlDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: "redis",
    protocols: ["redis:", "rediss:"],
    create: (databaseUrl) => new RedisDriver(databaseUrl),
  });
};

registerBuiltInDrivers();

export type ConnectionHealthStatus =
  | "healthy"
  | "degraded"
  | "slow"
  | "unreachable"
  | "unknown";

export interface ConnectionHealth {
  status: ConnectionHealthStatus;
  latencyMs: number | null;
  lastCheckedAt: string | null;
  error: string | null;
}

// Thresholds match the health monitor spec: <100ms healthy, 100-500ms
// degraded, >500ms slow, ping failure/timeout unreachable.
const HEALTHY_LATENCY_MS = 100;
const DEGRADED_LATENCY_MS = 500;

const classifyLatency = (latencyMs: number): ConnectionHealthStatus => {
  if (latencyMs < HEALTHY_LATENCY_MS) return "healthy";
  if (latencyMs <= DEGRADED_LATENCY_MS) return "degraded";
  return "slow";
};

export interface TableOverview {
  name: string;
  count: number;
}

export interface DatabaseOverview {
  dbType: SupportedDatabase;
  totalTables: number;
  totalRecords: number;
  tables: TableOverview[];
}

export class DatabaseConnection {
  private readonly databaseUrl: string;
  private readonly driver: DatabaseDriver;
  private readonly databaseKind: SupportedDatabase;
  private readonly id: string;
  private readonly name: string;
  private lastHealth: ConnectionHealth = {
    status: "unknown",
    latencyMs: null,
    lastCheckedAt: null,
    error: null,
  };

  constructor(id: string, databaseUrl: string) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing.");
    }

    this.id = id;
    this.databaseUrl = databaseUrl;
    const { driver, kind } = this.createDriver(this.databaseUrl);
    this.driver = driver;
    this.databaseKind = kind;

    // Extract a friendly name from URL
    try {
      const url = new URL(databaseUrl);
      const dbName = url.pathname.replace(/^\//, "") || url.hostname;
      this.name = `${this.databaseKind[0].toUpperCase() + this.databaseKind.slice(1)} (${dbName})`;
    } catch {
      this.name = `${this.databaseKind} (${id})`;
    }
  }

  getId(): string {
    return this.id;
  }
  getName(): string {
    return this.name;
  }
  getKind(): SupportedDatabase {
    return this.databaseKind;
  }
  getCapabilities(): DriverCapabilities {
    return this.driver.getCapabilities();
  }

  async connect(): Promise<void> {
    await this.driver.connect();
  }

  async getTables(): Promise<string[]> {
    return this.driver.getTables();
  }

  async getTableData(
    name: string,
    limit: number,
    offset: number = 0,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc",
    filters: Record<string, string> = {},
  ): Promise<Record<string, unknown>[]> {
    return this.driver.getTableData(
      name,
      limit,
      offset,
      sortBy,
      sortOrder,
      filters,
    );
  }

  async getOverview(): Promise<DatabaseOverview> {
    const tableNames = await this.getTables();
    const counts = await Promise.all(
      tableNames.map(async (name) => ({
        name,
        count: await this.driver.getTableCount(name),
      })),
    );

    const totalRecords = counts.reduce((sum, item) => sum + item.count, 0);
    const tables = counts.sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );

    return {
      dbType: this.databaseKind,
      totalTables: tableNames.length,
      totalRecords,
      tables,
    };
  }

  async getSchema(): Promise<DatabaseSchema> {
    const schema = await this.driver.getSchema();
    return { ...schema, dbType: this.databaseKind };
  }

  async query(raw: DriverQueryInput): Promise<any> {
    if (!this.driver.query) {
      throw new Error(
        "Raw query execution is not supported for this database driver.",
      );
    }
    return this.driver.query(raw);
  }

  async close(): Promise<void> {
    if (this.driver.close) {
      await this.driver.close();
    }
  }

  /**
   * Runs a lightweight liveness check against this connection and records
   * the result. Used by the background health monitor and exposed to the
   * frontend via GET /api/health so status dots reflect real latency
   * instead of only whether the last arbitrary request happened to succeed.
   */
  async checkHealth(): Promise<ConnectionHealth> {
    const start = performance.now();
    try {
      if (this.driver.ping) {
        await this.driver.ping();
      } else {
        // Fallback for drivers without a native ping: any successful read
        // proves the connection is alive.
        await this.driver.getTables();
      }
      const latencyMs = Math.round(performance.now() - start);
      this.lastHealth = {
        status: classifyLatency(latencyMs),
        latencyMs,
        lastCheckedAt: new Date().toISOString(),
        error: null,
      };
    } catch (err) {
      this.lastHealth = {
        status: "unreachable",
        latencyMs: null,
        lastCheckedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
    return this.lastHealth;
  }

  getLastHealth(): ConnectionHealth {
    return this.lastHealth;
  }

  private createDriver(urlString: string): {
    driver: DatabaseDriver;
    kind: SupportedDatabase;
  } {
    const parsed = new URL(urlString);
    const protocol = normalizeProtocol(parsed.protocol);
    const registration = driverRegistry.get(protocol);

    if (registration) {
      return {
        driver: registration.create(urlString),
        kind: registration.kind,
      };
    }

    throw new Error(
      `Unsupported DATABASE_URL protocol "${protocol}". Supported protocols: ${listSupportedProtocols().join(", ")}`,
    );
  }
}

export interface MultiDatabaseOverview {
  totalDbs: number;
  totalRecords: number;
  totalTables: number;
  databases: (DatabaseOverview & { id: string; name: string })[];
}

export class DatabaseManager {
  private readonly connections = new Map<string, DatabaseConnection>();
  private healthMonitorTimer: ReturnType<typeof setInterval> | null = null;

  addConnection(id: string, url: string): DatabaseConnection {
    const conn = new DatabaseConnection(id, url);
    this.connections.set(id, conn);
    return conn;
  }

  getConnection(id: string): DatabaseConnection {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Database connection "${id}" not found.`);
    return conn;
  }

  listConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  async connectAll(): Promise<void> {
    await Promise.all(this.listConnections().map((c) => c.connect()));
  }

  async closeAll(): Promise<void> {
    this.stopHealthMonitor();
    await Promise.all(this.listConnections().map((c) => c.close()));
  }

  async getMultiOverview(): Promise<MultiDatabaseOverview> {
    const overviews = await Promise.all(
      this.listConnections().map(async (conn) => {
        const ov = await conn.getOverview();
        return { ...ov, id: conn.getId(), name: conn.getName() };
      }),
    );

    return {
      totalDbs: overviews.length,
      totalRecords: overviews.reduce((s, o) => s + o.totalRecords, 0),
      totalTables: overviews.reduce((s, o) => s + o.totalTables, 0),
      databases: overviews,
    };
  }

  /** Runs a health check against every connection without throwing. */
  async checkAllHealth(): Promise<void> {
    await Promise.all(
      this.listConnections().map((conn) =>
        conn.checkHealth().catch(() => {
          // checkHealth() already catches driver errors internally and
          // records them on the connection; this guards Promise.all against
          // anything unexpected so one bad connection can't block the rest.
        }),
      ),
    );
  }

  /**
   * Starts background health polling on the given interval. Safe to call
   * multiple times, only one timer is ever active per manager instance.
   */
  startHealthMonitor(intervalMs: number): void {
    this.stopHealthMonitor();
    this.healthMonitorTimer = setInterval(() => {
      void this.checkAllHealth();
    }, intervalMs);
    this.healthMonitorTimer.unref?.();
  }

  stopHealthMonitor(): void {
    if (this.healthMonitorTimer) {
      clearInterval(this.healthMonitorTimer);
      this.healthMonitorTimer = null;
    }
  }
}
