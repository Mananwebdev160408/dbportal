import type { DatabaseDriver, DriverCapabilities, DriverQueryInput } from './types.js';

export class PostgresDriver implements DatabaseDriver {
  private client: { connect: () => Promise<unknown>; query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; end: () => Promise<void> } | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    let pgModule: { Client: new (config: { connectionString: string }) => { connect: () => Promise<unknown>; query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; end: () => Promise<void> } };
    try {
      pgModule = await import('pg');
    } catch {
      throw new Error('PostgreSQL driver not found. Install it with: npm install pg');
    }

    const client = new pgModule.Client({ connectionString: this.connectionString });
    await client.connect();
    this.client = client;
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: true,
      structuredQuery: false,
    };
  }

  async getTables(): Promise<string[]> {
    const client = await this.getClient();
    const result = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name ASC`
    );

    return result.rows.map((row) => String(row.table_name));
  }

  async getTableData(name: string, limit: number): Promise<Record<string, unknown>[]> {
    const safeName = this.toSafeIdentifier(name);
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 100;
    const sql = `SELECT * FROM "${safeName}" LIMIT $1`;
    const client = await this.getClient();
    const result = await client.query(sql, [safeLimit]);
    return result.rows;
  }

  async getTableCount(name: string): Promise<number> {
    const safeName = this.toSafeIdentifier(name);
    const client = await this.getClient();
    const result = await client.query(`SELECT COUNT(*)::bigint AS count FROM "${safeName}"`);
    const raw = result.rows[0]?.count;
    const parsed = Number.parseInt(String(raw ?? '0'), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async query(rawQuery: DriverQueryInput): Promise<Record<string, unknown>[]> {
    if (typeof rawQuery !== 'string') {
      throw new Error('PostgreSQL query endpoint expects a SQL string.');
    }

    const client = await this.getClient();
    const result = await client.query(rawQuery);
    return result.rows;
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.end();
    this.client = null;
  }

  private async getClient() {
    if (!this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error('PostgreSQL client was not initialized.');
    }

    return this.client;
  }

  private toSafeIdentifier(name: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error('Invalid PostgreSQL table name.');
    }

    return name;
  }
}
