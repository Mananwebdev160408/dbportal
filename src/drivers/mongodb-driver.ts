import type { DatabaseDriver, DriverCapabilities, DriverQueryInput, StructuredQuery, QueryResult } from './types.js';

type MongoDatabase = {
  listCollections: () => { toArray: () => Promise<Array<{ name: string }>> };
  collection: (name: string) => {
    countDocuments: (filter: Record<string, unknown>) => Promise<number>;
    find: (filter: Record<string, unknown>) => {
      limit: (count: number) => {
        toArray: () => Promise<Record<string, unknown>[]>;
      };
    };
  };
};

type MongoClientLike = {
  connect: () => Promise<unknown>;
  db: (name: string) => MongoDatabase;
  close: () => Promise<void>;
};

export class MongoDriver implements DatabaseDriver {
  private client: MongoClientLike | null = null;
  private database: MongoDatabase | null = null;

  constructor(private readonly connectionString: string) {}

  async connect(): Promise<void> {
    if (this.client && this.database) {
      return;
    }

    let mongodbModule: { MongoClient: new (uri: string) => MongoClientLike };
    try {
      mongodbModule = await import('mongodb');
    } catch {
      throw new Error('MongoDB driver not found. Install it with: npm install mongodb');
    }

    const client = new mongodbModule.MongoClient(this.connectionString);
    await client.connect();

    const dbName = this.resolveDatabaseName(this.connectionString);
    this.client = client;
    this.database = client.db(dbName);
  }

  getCapabilities(): DriverCapabilities {
    return {
      rawQuery: false,
      structuredQuery: true,
    };
  }

  async getTables(): Promise<string[]> {
    const db = await this.getDatabase();
    const collections = await db.listCollections().toArray();
    return collections.map((collection) => collection.name).sort((a, b) => a.localeCompare(b));
  }

  async getTableData(
    name: string,
    limit: number,
    offset: number = 0,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, string> = {}
  ): Promise<Record<string, unknown>[]> {
    const db = await this.getDatabase();
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 100;
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;

    const mongoFilter: Record<string, any> = {};
    for (const [field, value] of Object.entries(filters)) {
      if (value.trim().length > 0) {
        mongoFilter[field] = { $regex: value, $options: 'i' };
      }
    }

    let cursor: any = db.collection(name).find(mongoFilter);

    if (sortBy) {
      cursor = cursor.sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });
    }

    return cursor.skip(safeOffset).limit(safeLimit).toArray();
  }

  async getTableCount(name: string): Promise<number> {
    const db = await this.getDatabase();
    return db.collection(name).countDocuments({});
  }

  async query(input: DriverQueryInput): Promise<QueryResult> {
    const startTime = performance.now();
    let data: Record<string, unknown>[];

    if (typeof input === 'string') {
      let parsed: any;
      try {
        parsed = JSON.parse(input);
      } catch {
        throw new Error(
          'MongoDB query expects structured JSON. Example: {"collection":"users","filter":{},"limit":50}'
        );
      }
      data = await this.executeStructuredQuery(parsed);
    } else {
      data = await this.executeStructuredQuery(input);
    }

    const endTime = performance.now();
    return {
      data,
      telemetry: {
        executionTimeMs: Math.round(endTime - startTime),
        affectedRows: data.length
      }
    };
  }

  async updateRecord(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
    const db = await this.getDatabase();
    await (db.collection(collection) as any).updateOne(filter, { $set: update });
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.close();
    this.client = null;
    this.database = null;
  }

  private resolveDatabaseName(urlString: string): string {
    const parsed = new URL(urlString);
    const pathname = parsed.pathname.replace(/^\//, '');

    if (!pathname) {
      return 'test';
    }

    return decodeURIComponent(pathname);
  }

  private async getDatabase(): Promise<MongoDatabase> {
    if (!this.database) {
      await this.connect();
    }

    if (!this.database) {
      throw new Error('MongoDB database was not initialized.');
    }

    return this.database;
  }

  private async executeStructuredQuery(input: StructuredQuery): Promise<Record<string, unknown>[]> {
    const collectionName = typeof input.collection === 'string' ? input.collection.trim() : '';
    if (!collectionName) {
      throw new Error('MongoDB structured query requires "collection".');
    }

    const db = await this.getDatabase();
    
    // Check for aggregation pipeline
    if (input.pipeline && Array.isArray(input.pipeline)) {
      return (db.collection(collectionName) as any).aggregate(input.pipeline).toArray();
    }

    const filter = this.toPlainObject(input.filter);
    const projection = this.toOptionalPlainObject(input.projection);
    const sort = this.toOptionalSort(input.sort);
    const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(Number(input.limit), 500)) : 100;

    let cursor: {
      project: (spec: Record<string, unknown>) => typeof cursor;
      sort: (spec: Record<string, 1 | -1>) => typeof cursor;
      limit: (count: number) => { toArray: () => Promise<Record<string, unknown>[]> };
      toArray: () => Promise<Record<string, unknown>[]>;
    } = db.collection(collectionName).find(filter) as any;

    if (projection) {
      cursor = cursor.project(projection);
    }

    if (sort) {
      cursor = cursor.sort(sort);
    }

    return cursor.limit(limit).toArray();
  }

  private toPlainObject(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) {
      return {};
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('MongoDB filter must be a JSON object.');
    }

    return value as Record<string, unknown>;
  }

  private toOptionalPlainObject(value: unknown): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('MongoDB projection must be a JSON object when provided.');
    }

    return value as Record<string, unknown>;
  }

  private toOptionalSort(value: unknown): Record<string, 1 | -1> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('MongoDB sort must be a JSON object when provided.');
    }

    const normalized: Record<string, 1 | -1> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw === 1 || raw === -1) {
        normalized[key] = raw;
        continue;
      }

      throw new Error('MongoDB sort values must be 1 or -1.');
    }

    return normalized;
  }
}
