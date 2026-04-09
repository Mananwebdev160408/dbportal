import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, QueryResult } from './types.js';

type MySqlConnection = {
  execute: <T = unknown>(sql: string, values?: any) => Promise<[T, unknown]>;
  end: () => Promise<void>;
};

export class MySqlDriver implements DatabaseDriver {
  private connection: MySqlConnection | null = null;

  constructor(private readonly connectionUri: string) {}

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    let mysqlModule: { createConnection: (uri: string) => Promise<any> };
    try {
      mysqlModule = await import('mysql2/promise');
    } catch {
      throw new Error('MySQL driver not found. Install it with: npm install mysql2');
    }

    this.connection = await mysqlModule.createConnection(this.connectionUri);
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: true,
      structuredQuery: false,
    };
  }

  async getTables(): Promise<string[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute<Array<{ table_name: string }>>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`
    );

    return rows.map((row) => row.table_name);
  }

  async getTableCount(name: string): Promise<number> {
    const safeName = this.toSafeIdentifier(name);
    const connection = await this.getConnection();
    const [rows] = await connection.execute<Array<{ count: number | string }>>(
      `SELECT COUNT(*) AS count FROM \`${safeName}\``
    );

    const raw = rows[0]?.count;
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

    let sql = `SELECT * FROM \`${safeName}\``;
    const params: any[] = [];

    const filterEntries = Object.entries(filters).filter(([_, val]) => val.trim().length > 0);
    if (filterEntries.length > 0) {
      sql += ' WHERE ';
      const clauses = filterEntries.map(([field, value]) => {
        const safeField = this.toSafeIdentifier(field);
        params.push(`%${value}%`);
        return `\`${safeField}\` LIKE ?`;
      });
      sql += clauses.join(' AND ');
    }

    if (sortBy) {
      const safeSortBy = this.toSafeIdentifier(sortBy);
      sql += ` ORDER BY \`${safeSortBy}\` ${sortOrder.toUpperCase()}`;
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const connection = await this.getConnection();
    const [rows] = await connection.execute<Record<string, unknown>[]>(sql, params);

    return rows;
  }


  async query(rawQuery: DriverQueryInput): Promise<QueryResult> {
    if (typeof rawQuery !== 'string') {
      throw new Error('MySQL query endpoint expects a SQL string.');
    }

    const startTime = performance.now();
    const connection = await this.getConnection();
    const [rows]: [any, any] = await connection.execute(rawQuery);
    const endTime = performance.now();
    
    return {
      data: Array.isArray(rows) ? rows : [rows],
      telemetry: {
        executionTimeMs: Math.round(endTime - startTime),
        affectedRows: Array.isArray(rows) ? rows.length : (rows as any).affectedRows || 0
      }
    };
  }

  async close(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.end();
    this.connection = null;
  }

  private async getConnection(): Promise<MySqlConnection> {
    if (!this.connection) {
      await this.connect();
    }

    if (!this.connection) {
      throw new Error('MySQL connection was not initialized.');
    }

    return this.connection;
  }

  private toSafeIdentifier(name: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error('Invalid MySQL table name.');
    }

    return name;
  }
}
