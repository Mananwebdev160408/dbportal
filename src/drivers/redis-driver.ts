import type { DatabaseDriver, DriverCapabilities, DatabaseSchema, QueryResult } from './types.js';

type RedisClient = {
  connect: () => Promise<void>;
  quit: () => Promise<void>;
  dbSize: () => Promise<number>;
  scan: (cursor: number, options: { MATCH?: string; COUNT?: number }) => Promise<{ cursor: number; keys: string[] }>;
  type: (key: string) => Promise<string>;
  get: (key: string) => Promise<string | null>;
  hLen: (key: string) => Promise<number>;
  lLen: (key: string) => Promise<number>;
  sCard: (key: string) => Promise<number>;
  zCard: (key: string) => Promise<number>;
  xLen: (key: string) => Promise<number>;
  ttl: (key: string) => Promise<number>;
};

export class RedisDriver implements DatabaseDriver {
  private client: RedisClient | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    if (this.client) return;

    let redisModule: any;
    try {
      redisModule = await import('redis');
    } catch {
      throw new Error('Redis driver not found. Install it with: npm install redis');
    }

    const client = redisModule.createClient({ url: this.connectionString });
    await client.connect();
    this.client = client as RedisClient;
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: false,
      structuredQuery: false,
    };
  }

  async getTables(): Promise<string[]> {
    return ['keys'];
  }

  async getTableCount(): Promise<number> {
    const client = await this.getClient();
    return client.dbSize();
  }

  async getTableData(
    _name: string,
    limit: number,
    offset: number = 0
  ): Promise<Record<string, unknown>[]> {
    const client = await this.getClient();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 100;
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
    const target = safeOffset + safeLimit;

    let cursor = 0;
    const keys: string[] = [];

    do {
      const result = await client.scan(cursor, { COUNT: 250 });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0 && keys.length < target);

    const slice = keys.slice(safeOffset, target);
    const rows = await Promise.all(
      slice.map(async (key) => {
        const type = await client.type(key);
        const ttl = await client.ttl(key);
        const value = await this.getValueSummary(client, key, type);
        return { key, type, ttl, value };
      })
    );

    return rows;
  }

  async query(): Promise<QueryResult> {
    throw new Error('Redis does not support raw SQL queries in this UI.');
  }

  async getSchema(): Promise<DatabaseSchema> {
    return {
      dbType: 'redis',
      tables: [
        {
          name: 'keys',
          columns: [
            { name: 'key', type: 'string', isNullable: false, isPrimary: true },
            { name: 'type', type: 'string', isNullable: false, isPrimary: false },
            { name: 'ttl', type: 'number', isNullable: true, isPrimary: false },
            { name: 'value', type: 'string', isNullable: true, isPrimary: false },
          ],
          foreignKeys: [],
        },
      ],
    };
  }

  async close(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.client) {
      await this.connect();
    }
    if (!this.client) {
      throw new Error('Redis client was not initialized.');
    }
    return this.client;
  }

  private async getValueSummary(client: RedisClient, key: string, type: string): Promise<string> {
    if (type === 'string') {
      const value = await client.get(key);
      if (value === null) return '';
      return value.length > 180 ? `${value.slice(0, 180)}…` : value;
    }
    if (type === 'hash') {
      const count = await client.hLen(key);
      return `${count} fields`;
    }
    if (type === 'list') {
      const count = await client.lLen(key);
      return `${count} items`;
    }
    if (type === 'set') {
      const count = await client.sCard(key);
      return `${count} members`;
    }
    if (type === 'zset') {
      const count = await client.zCard(key);
      return `${count} members`;
    }
    if (type === 'stream') {
      const count = await client.xLen(key);
      return `${count} entries`;
    }
    return type;
  }
}
