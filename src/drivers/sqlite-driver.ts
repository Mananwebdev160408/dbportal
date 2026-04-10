import path from 'node:path';
import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, QueryResult, DatabaseSchema, TableSchema } from './types.js';

type SqliteDatabase = {
  all: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  get: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>>;
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number }>;
  close: () => Promise<void>;
};

export class SqliteDriver implements DatabaseDriver {
  private db: SqliteDatabase | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    if (this.db) return;

    let sqlite3Module: any;
    let sqliteModule: any;
    try {
      sqlite3Module = await import('sqlite3');
      sqliteModule = await import('sqlite');
    } catch {
      throw new Error('SQLite driver not found. Install it with: npm install sqlite sqlite3');
    }

    const filename = this.resolveFilename(this.connectionString);
    const db = await sqliteModule.open({
      filename,
      driver: sqlite3Module.Database,
    });

    this.db = db as SqliteDatabase;
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: true,
      structuredQuery: false,
    };
  }

  async getTables(): Promise<string[]> {
    const db = await this.getDb();
    const rows = await db.all(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
    );
    return rows.map((row) => String(row.name));
  }

  async getTableCount(name: string): Promise<number> {
    const safeName = this.toSafeIdentifier(name);
    const db = await this.getDb();
    const row = await db.get(`SELECT COUNT(*) as count FROM "${safeName}"`);
    const parsed = Number.parseInt(String(row?.count ?? '0'), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async getTableData(
    name: string,
    limit: number,
    offset: number = 0,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, string> = {}
  ): Promise<Record<string, unknown>[]> {
    const safeName = this.toSafeIdentifier(name);
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 100;
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;

    let sql = `SELECT * FROM "${safeName}"`;
    const params: unknown[] = [];

    const filterEntries = Object.entries(filters).filter(([_, val]) => val.trim().length > 0);
    if (filterEntries.length > 0) {
      sql += ' WHERE ';
      const clauses = filterEntries.map(([field, value]) => {
        const safeField = this.toSafeIdentifier(field);
        params.push(`%${value}%`);
        return `"${safeField}" LIKE ?`;
      });
      sql += clauses.join(' AND ');
    }

    if (sortBy) {
      const safeSortBy = this.toSafeIdentifier(sortBy);
      sql += ` ORDER BY "${safeSortBy}" ${sortOrder.toUpperCase()}`;
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const db = await this.getDb();
    return db.all(sql, params);
  }

  async query(rawQuery: DriverQueryInput): Promise<QueryResult> {
    if (typeof rawQuery !== 'string') {
      throw new Error('SQLite query endpoint expects a SQL string.');
    }

    const db = await this.getDb();
    const startTime = performance.now();
    const trimmed = rawQuery.trim().toLowerCase();

    let data: Record<string, unknown>[] = [];
    let affectedRows = 0;

    if (trimmed.startsWith('select') || trimmed.startsWith('with') || trimmed.startsWith('pragma')) {
      data = await db.all(rawQuery);
      affectedRows = data.length;
    } else {
      const result = await db.run(rawQuery);
      affectedRows = Number(result?.changes ?? 0);
    }

    const endTime = performance.now();
    return {
      data,
      telemetry: {
        executionTimeMs: Math.round(endTime - startTime),
        affectedRows,
      },
    };
  }

  async getSchema(): Promise<DatabaseSchema> {
    const db = await this.getDb();
    const tableRows = await db.all(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
    );

    const tables: TableSchema[] = [];
    for (const row of tableRows) {
      const tableName = String(row.name);
      const columnsInfo = await db.all(`PRAGMA table_info("${tableName}")`);
      const fkInfo = await db.all(`PRAGMA foreign_key_list("${tableName}")`);

      const columns = columnsInfo.map((col) => ({
        name: String(col.name),
        type: String(col.type ?? 'text'),
        isNullable: col.notnull === 0,
        isPrimary: col.pk === 1,
      }));

      const foreignKeys = fkInfo.map((fk) => ({
        table: tableName,
        column: String(fk.from),
        refTable: String(fk.table),
        refColumn: String(fk.to),
      }));

      tables.push({ name: tableName, columns, foreignKeys });
    }

    return {
      dbType: 'sqlite',
      tables,
    };
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.db.close();
    this.db = null;
  }

  private async getDb(): Promise<SqliteDatabase> {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) {
      throw new Error('SQLite database was not initialized.');
    }
    return this.db;
  }

  private resolveFilename(urlString: string): string {
    if (!urlString.startsWith('sqlite:')) {
      return urlString;
    }

    const parsed = new URL(urlString);
    const rawPath = decodeURIComponent(parsed.pathname || '');
    if (!rawPath || rawPath === '/') {
      return ':memory:';
    }

    let filePath = rawPath;
    if (filePath.startsWith('/') && /^[A-Za-z]:/.test(filePath.slice(1))) {
      filePath = filePath.slice(1);
    }

    return path.normalize(filePath);
  }

  private toSafeIdentifier(name: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error('Invalid SQLite identifier.');
    }
    return name;
  }
}
