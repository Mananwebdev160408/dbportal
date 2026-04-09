import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, QueryResult } from './types.js';

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
    const params: (string | number)[] = [];

    const filterEntries = Object.entries(filters).filter(([_, val]) => val.trim().length > 0);
    if (filterEntries.length > 0) {
      sql += ' WHERE ';
      const clauses = filterEntries.map(([field, value], idx) => {
        const safeField = this.toSafeIdentifier(field);
        params.push(`%${value}%`);
        return `"${safeField}"::text ILIKE $${params.length}`;
      });
      sql += clauses.join(' AND ');
    }

    if (sortBy) {
      const safeSortBy = this.toSafeIdentifier(sortBy);
      sql += ` ORDER BY "${safeSortBy}" ${sortOrder.toUpperCase()}`;
    }

    // Parameters for LIMIT and OFFSET
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(safeLimit, safeOffset);

    const client = await this.getClient();
    const result = await client.query(sql, params);
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

  async query(query: string): Promise<QueryResult> {
    const startTime = performance.now();
    const client = await this.getClient();
    const result = (await client.query(query)) as any;
    const endTime = performance.now();
    
    return {
      data: result.rows,
      telemetry: {
        executionTimeMs: Math.round(endTime - startTime),
        affectedRows: result.rowCount ?? result.rows.length
      }
    };
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
