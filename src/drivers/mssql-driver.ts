import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, QueryResult, DatabaseSchema, TableSchema } from './types.js';

type SqlConnection = {
  connect: () => Promise<void>;
  close: () => Promise<void>;
  request: () => {
    input: (name: string, value: unknown) => void;
    query: (sql: string) => Promise<{ recordset: Record<string, unknown>[] }>;
  };
};

export class MsSqlDriver implements DatabaseDriver {
  private pool: SqlConnection | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    if (this.pool) return;

    let mssqlModule: any;
    try {
      mssqlModule = await import('mssql');
    } catch {
      throw new Error('SQL Server driver not found. Install it with: npm install mssql');
    }

    const pool = new mssqlModule.ConnectionPool(this.connectionString);
    await pool.connect();
    this.pool = pool as SqlConnection;
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: true,
      structuredQuery: false,
    };
  }

  async getTables(): Promise<string[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(
      `SELECT TABLE_SCHEMA, TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_SCHEMA, TABLE_NAME`
    );

    return result.recordset.map((row) => this.formatTableName(String(row.TABLE_SCHEMA), String(row.TABLE_NAME)));
  }

  async getTableCount(name: string): Promise<number> {
    const safeName = this.toSafeIdentifier(name);
    const pool = await this.getPool();
    const result = await pool.request().query(`SELECT COUNT(*) AS count FROM ${safeName}`);
    const raw = result.recordset[0]?.count;
    const parsed = Number.parseInt(String(raw ?? '0'), 10);
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

    let sql = `SELECT * FROM ${safeName}`;
    const request = (await this.getPool()).request();
    let paramIndex = 0;

    const filterEntries = Object.entries(filters).filter(([_, val]) => val.trim().length > 0);
    if (filterEntries.length > 0) {
      sql += ' WHERE ';
      const clauses = filterEntries.map(([field, value]) => {
        const safeField = this.toSafeIdentifier(field, false);
        const paramName = `p${paramIndex++}`;
        request.input(paramName, `%${value}%`);
        return `CAST(${safeField} AS NVARCHAR(MAX)) LIKE @${paramName}`;
      });
      sql += clauses.join(' AND ');
    }

    if (sortBy) {
      const safeSortBy = this.toSafeIdentifier(sortBy, false);
      sql += ` ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}`;
    }

    sql += ` OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY`;

    const result = await request.query(sql);
    return result.recordset;
  }

  async query(rawQuery: DriverQueryInput): Promise<QueryResult> {
    if (typeof rawQuery !== 'string') {
      throw new Error('SQL Server query endpoint expects a SQL string.');
    }

    const startTime = performance.now();
    const pool = await this.getPool();
    const result = await pool.request().query(rawQuery);
    const endTime = performance.now();

    return {
      data: result.recordset ?? [],
      telemetry: {
        executionTimeMs: Math.round(endTime - startTime),
        affectedRows: Array.isArray(result.recordset) ? result.recordset.length : 0,
      },
    };
  }

  async getSchema(): Promise<DatabaseSchema> {
    const pool = await this.getPool();
    const columnsResult = await pool.request().query(
      `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`
    );

    const primaryResult = await pool.request().query(
      `SELECT tc.TABLE_SCHEMA, tc.TABLE_NAME, kcu.COLUMN_NAME
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
       JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
         ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
       WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`
    );

    const foreignResult = await pool.request().query(
      `SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME,
              ccu.TABLE_SCHEMA AS FOREIGN_TABLE_SCHEMA,
              ccu.TABLE_NAME AS FOREIGN_TABLE_NAME,
              ccu.COLUMN_NAME AS FOREIGN_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
         ON kcu.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
       WHERE kcu.CONSTRAINT_NAME IN (
         SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
       )`
    );

    const primaryMap = new Map<string, Set<string>>();
    for (const row of primaryResult.recordset) {
      const key = this.formatTableName(String(row.TABLE_SCHEMA), String(row.TABLE_NAME));
      if (!primaryMap.has(key)) {
        primaryMap.set(key, new Set());
      }
      primaryMap.get(key)!.add(String(row.COLUMN_NAME));
    }

    const tableMap = new Map<string, TableSchema>();
    for (const row of columnsResult.recordset) {
      const key = this.formatTableName(String(row.TABLE_SCHEMA), String(row.TABLE_NAME));
      if (!tableMap.has(key)) {
        tableMap.set(key, { name: key, columns: [], foreignKeys: [] });
      }
      tableMap.get(key)!.columns.push({
        name: String(row.COLUMN_NAME),
        type: String(row.DATA_TYPE),
        isNullable: String(row.IS_NULLABLE).toLowerCase() === 'yes',
        isPrimary: primaryMap.get(key)?.has(String(row.COLUMN_NAME)) ?? false,
      });
    }

    for (const row of foreignResult.recordset) {
      const tableKey = this.formatTableName(String(row.TABLE_SCHEMA), String(row.TABLE_NAME));
      if (!tableMap.has(tableKey)) {
        tableMap.set(tableKey, { name: tableKey, columns: [], foreignKeys: [] });
      }
      const refKey = this.formatTableName(String(row.FOREIGN_TABLE_SCHEMA), String(row.FOREIGN_TABLE_NAME));
      tableMap.get(tableKey)!.foreignKeys.push({
        table: tableKey,
        column: String(row.COLUMN_NAME),
        refTable: refKey,
        refColumn: String(row.FOREIGN_COLUMN_NAME),
      });
    }

    return {
      dbType: 'sqlserver',
      tables: Array.from(tableMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async close(): Promise<void> {
    if (!this.pool) return;
    await this.pool.close();
    this.pool = null;
  }

  private async getPool(): Promise<SqlConnection> {
    if (!this.pool) {
      await this.connect();
    }
    if (!this.pool) {
      throw new Error('SQL Server connection was not initialized.');
    }
    return this.pool;
  }

  private formatTableName(schema: string, name: string): string {
    if (schema && schema.toLowerCase() !== 'dbo') {
      return `${schema}.${name}`;
    }
    return name;
  }

  private toSafeIdentifier(name: string, allowSchema: boolean = true): string {
    const parts = allowSchema ? name.split('.') : [name];
    if (parts.some((p) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p))) {
      throw new Error('Invalid SQL Server identifier.');
    }
    return parts.map((p) => `[${p}]`).join('.');
  }
}
