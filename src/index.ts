import { MongoDriver } from './drivers/mongodb-driver.js';
import { MySqlDriver } from './drivers/mysql-driver.js';
import { PostgresDriver } from './drivers/postgres-driver.js';
import { SqliteDriver } from './drivers/sqlite-driver.js';
import { MsSqlDriver } from './drivers/mssql-driver.js';
import { RedisDriver } from './drivers/redis-driver.js';
import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, DatabaseSchema } from './drivers/types.js';

export type SupportedDatabase = string;

export interface DriverRegistration {
  kind: string;
  protocols: string[];
  create: (databaseUrl: string) => DatabaseDriver;
}

const driverRegistry = new Map<string, DriverRegistration>();

const normalizeProtocol = (protocol: string): string => {
  const value = protocol.toLowerCase();
  return value.endsWith(':') ? value : `${value}:`;
};

export const registerDatabaseDriver = (registration: DriverRegistration): void => {
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
    kind: 'postgres',
    protocols: ['postgres:', 'postgresql:'],
    create: (databaseUrl) => new PostgresDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: 'mongodb',
    protocols: ['mongodb:', 'mongodb+srv:'],
    create: (databaseUrl) => new MongoDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: 'mysql',
    protocols: ['mysql:', 'mariadb:'],
    create: (databaseUrl) => new MySqlDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: 'sqlite',
    protocols: ['sqlite:', 'sqlite3:'],
    create: (databaseUrl) => new SqliteDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: 'sqlserver',
    protocols: ['mssql:', 'sqlserver:'],
    create: (databaseUrl) => new MsSqlDriver(databaseUrl),
  });

  registerDatabaseDriver({
    kind: 'redis',
    protocols: ['redis:', 'rediss:'],
    create: (databaseUrl) => new RedisDriver(databaseUrl),
  });
};

registerBuiltInDrivers();

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

  constructor(id: string, databaseUrl: string) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing.');
    }

    this.id = id;
    this.databaseUrl = databaseUrl;
    const { driver, kind } = this.createDriver(this.databaseUrl);
    this.driver = driver;
    this.databaseKind = kind;

    // Extract a friendly name from URL
    try {
      const url = new URL(databaseUrl);
      const dbName = url.pathname.replace(/^\//, '') || url.hostname;
      this.name = `${this.databaseKind.charAt(0).toUpperCase() + this.databaseKind.slice(1)} (${dbName})`;
    } catch {
      this.name = `${this.databaseKind} (${id})`;
    }
  }

  getId(): string { return this.id; }
  getName(): string { return this.name; }
  getKind(): SupportedDatabase { return this.databaseKind; }
  getCapabilities(): DriverCapabilities { return this.driver.getCapabilities(); }

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
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, string> = {}
  ): Promise<Record<string, unknown>[]> {
    return this.driver.getTableData(name, limit, offset, sortBy, sortOrder, filters);
  }

  async getOverview(): Promise<DatabaseOverview> {
    const tableNames = await this.getTables();
    const counts = await Promise.all(
      tableNames.map(async (name) => ({
        name,
        count: await this.driver.getTableCount(name),
      }))
    );

    const totalRecords = counts.reduce((sum, item) => sum + item.count, 0);
    const tables = counts.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      dbType: this.databaseKind,
      totalTables: tableNames.length,
      totalRecords,
      tables,
    };
  }

  async getSchema(): Promise<DatabaseSchema> {
    return this.driver.getSchema();
  }

  async query(raw: DriverQueryInput): Promise<any> {
    if (!this.driver.query) {
      throw new Error('Raw query execution is not supported for this database driver.');
    }
    return this.driver.query(raw);
  }

  async updateRecord(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
    if (!this.driver.updateRecord) {
      throw new Error('Record mutation is not supported for this database driver.');
    }
    return this.driver.updateRecord(collection, filter, update);
  }

  async close(): Promise<void> {
    if (this.driver.close) {
      await this.driver.close();
    }
  }

  private createDriver(urlString: string): { driver: DatabaseDriver; kind: SupportedDatabase } {
    const parsed = new URL(urlString);
    const protocol = normalizeProtocol(parsed.protocol);
    const registration = driverRegistry.get(protocol);

    if (registration) {
      return { driver: registration.create(urlString), kind: registration.kind };
    }

    throw new Error(
      `Unsupported DATABASE_URL protocol "${protocol}". Supported protocols: ${listSupportedProtocols().join(', ')}`
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
    await Promise.all(this.listConnections().map(c => c.connect()));
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.listConnections().map(c => c.close()));
  }

  async getMultiOverview(): Promise<MultiDatabaseOverview> {
    const overviews = await Promise.all(
      this.listConnections().map(async (conn) => {
        const ov = await conn.getOverview();
        return { ...ov, id: conn.getId(), name: conn.getName() };
      })
    );

    return {
      totalDbs: overviews.length,
      totalRecords: overviews.reduce((s, o) => s + o.totalRecords, 0),
      totalTables: overviews.reduce((s, o) => s + o.totalTables, 0),
      databases: overviews,
    };
  }
}
