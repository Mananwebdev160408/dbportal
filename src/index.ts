import { MongoDriver } from './drivers/mongodb-driver.js';
import { MySqlDriver } from './drivers/mysql-driver.js';
import { PostgresDriver } from './drivers/postgres-driver.js';
import type { DatabaseDriver, DriverCapabilities, DriverQueryInput } from './drivers/types.js';

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

export class DatabaseManager {
  private readonly databaseUrl: string;
  private readonly driver: DatabaseDriver;
  private readonly databaseKind: SupportedDatabase;

  constructor(databaseUrl: string = process.env.DATABASE_URL ?? '') {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Add it to your environment or .env file.');
    }

    this.databaseUrl = databaseUrl;
    const { driver, kind } = this.createDriver(this.databaseUrl);
    this.driver = driver;
    this.databaseKind = kind;
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

  async getTableData(name: string, limit: number): Promise<Record<string, unknown>[]> {
    return this.driver.getTableData(name, limit);
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

  async query(raw: DriverQueryInput): Promise<Record<string, unknown>[]> {
    if (!this.driver.query) {
      throw new Error('Raw query execution is not supported for this database driver.');
    }

    return this.driver.query(raw);
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
