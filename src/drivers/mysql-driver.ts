import type { DatabaseDriver, DriverCapabilities, DriverQueryInput } from './types.js';

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

  async getTableData(name: string, limit: number): Promise<Record<string, unknown>[]> {
    const safeName = this.toSafeIdentifier(name);
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 100;
    const connection = await this.getConnection();
    const [rows] = await connection.execute<Record<string, unknown>[]>(
      `SELECT * FROM \`${safeName}\` LIMIT ?`,
      [safeLimit]
    );

    return rows;
  }

  async query(rawQuery: DriverQueryInput): Promise<Record<string, unknown>[]> {
    if (typeof rawQuery !== 'string') {
      throw new Error('MySQL query endpoint expects a SQL string.');
    }

    const connection = await this.getConnection();
    const [rows] = await connection.execute<Record<string, unknown>[]>(rawQuery);

    if (Array.isArray(rows)) {
      return rows;
    }

    return [];
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
