import type {
  DatabaseDriver,
  DriverCapabilities,
  DriverQueryInput,
  StructuredQuery,
  QueryResult,
  DatabaseSchema,
  TableSchema,
  ForeignKeySchema,
} from "./types.js";

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
      mongodbModule = await import("mongodb");
    } catch {
      throw new Error(
        "MongoDB driver not found. Install it with: npm install mongodb",
      );
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
    return collections
      .map((collection) => collection.name)
      .sort((a, b) => a.localeCompare(b));
  }

  async getTableData(
    name: string,
    limit: number,
    offset: number = 0,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "asc",
    filters: Record<string, string> = {},
  ): Promise<Record<string, unknown>[]> {
    const db = await this.getDatabase();
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(limit, 500))
      : 100;
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;

    const mongoFilter: Record<string, any> = {};
    for (const [field, value] of Object.entries(filters)) {
      if (value.trim().length > 0) {
        mongoFilter[field] = { $regex: value, $options: "i" };
      }
    }

    let cursor: any = db.collection(name).find(mongoFilter);

    if (sortBy) {
      cursor = cursor.sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
    }

    return cursor.skip(safeOffset).limit(safeLimit).toArray();
  }

  async getTableCount(name: string): Promise<number> {
    const db = await this.getDatabase();
    return db.collection(name).countDocuments({});
  }

  async getSchema(): Promise<DatabaseSchema> {
    const db = await this.getDatabase();
    const collections = await db.listCollections().toArray();

    const tables = [];
    for (const collection of collections) {
      const sample = await db
        .collection(collection.name)
        .find({})
        .limit(1)
        .toArray();
      const doc = sample[0] ?? {};
      const columns = Object.keys(doc).map((key) => ({
        name: key,
        type: this.inferType((doc as any)[key]),
        isNullable:
          (doc as any)[key] === null || (doc as any)[key] === undefined,
        isPrimary: key === "_id",
      }));

      tables.push({
        name: collection.name,
        columns,
        foreignKeys: [] as ForeignKeySchema[],
      });
    }

    const tablesWithKeys = inferVirtualForeignKeys(tables);

    return {
      dbType: "mongodb",
      tables: tablesWithKeys.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async query(input: DriverQueryInput): Promise<QueryResult> {
    const startTime = performance.now();
    let data: Record<string, unknown>[];

    if (typeof input === "string") {
      let parsed: any;
      try {
        parsed = JSON.parse(input);
      } catch {
        throw new Error(
          'MongoDB query expects structured JSON. Example: {"collection":"users","filter":{},"limit":50}',
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
        affectedRows: data.length,
      },
    };
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
    const pathname = parsed.pathname.replace(/^\//, "");

    if (!pathname) {
      return "test";
    }

    return decodeURIComponent(pathname);
  }

  private async getDatabase(): Promise<MongoDatabase> {
    if (!this.database) {
      await this.connect();
    }

    if (!this.database) {
      throw new Error("MongoDB database was not initialized.");
    }

    return this.database;
  }

  private async executeStructuredQuery(
    input: StructuredQuery,
  ): Promise<Record<string, unknown>[]> {
    const collectionName =
      typeof input.collection === "string" ? input.collection.trim() : "";
    if (!collectionName) {
      throw new Error('MongoDB structured query requires "collection".');
    }

    const db = await this.getDatabase();

    // Check for aggregation pipeline
    if (input.pipeline && Array.isArray(input.pipeline)) {
      return (db.collection(collectionName) as any)
        .aggregate(input.pipeline)
        .toArray();
    }

    const filter = this.toPlainObject(input.filter);
    const projection = this.toOptionalPlainObject(input.projection);
    const sort = this.toOptionalSort(input.sort);
    const limit = Number.isFinite(input.limit)
      ? Math.max(1, Math.min(Number(input.limit), 500))
      : 100;

    let cursor: {
      project: (spec: Record<string, unknown>) => typeof cursor;
      sort: (spec: Record<string, 1 | -1>) => typeof cursor;
      limit: (count: number) => {
        toArray: () => Promise<Record<string, unknown>[]>;
      };
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

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error("MongoDB filter must be a JSON object.");
    }

    return value as Record<string, unknown>;
  }

  private toOptionalPlainObject(
    value: unknown,
  ): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        "MongoDB projection must be a JSON object when provided.",
      );
    }

    return value as Record<string, unknown>;
  }

  private toOptionalSort(value: unknown): Record<string, 1 | -1> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error("MongoDB sort must be a JSON object when provided.");
    }

    const normalized: Record<string, 1 | -1> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw === 1 || raw === -1) {
        normalized[key] = raw;
        continue;
      }

      throw new Error("MongoDB sort values must be 1 or -1.");
    }

    return normalized;
  }

  private inferType(value: unknown): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    const t = typeof value;
    if (t === "object") return "object";
    return t;
  }
}

export function inferVirtualForeignKeys(tables: TableSchema[]): TableSchema[] {
  const normalize = (name: string): string => {
    let n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (n.endsWith("ies")) {
      n = n.slice(0, -3) + "y";
    } else if (n.endsWith("s") && !n.endsWith("ss")) {
      n = n.slice(0, -1);
    }
    return n;
  };

  const tableNames = tables.map((t) => t.name);
  const normalizedToTableName = new Map<string, string>();
  for (const table of tables) {
    normalizedToTableName.set(normalize(table.name), table.name);
  }

  // Common aliases for references (singular forms)
  const aliases: Record<string, string> = {
    author: "users",
    owner: "users",
    creator: "users",
    member: "users",
    commentedby: "users",
    sharedby: "users",
    userfollowed: "users",
    userfollowing: "users",
    follower: "users",
    to: "users",
    from: "users",
  };

  for (const table of tables) {
    const mappedColumns = new Set<string>();

    for (const col of table.columns) {
      if (col.isPrimary) continue;

      const colNameLower = col.name.toLowerCase();
      let targetTable: string | null = null;

      // Check if column name ends with ids/id/Id/_id/_ids (case-insensitive)
      let prefix = "";
      if (colNameLower.endsWith("_ids")) {
        prefix = col.name.slice(0, -4);
      } else if (colNameLower.endsWith("ids")) {
        prefix = col.name.slice(0, -3);
      } else if (colNameLower.endsWith("_id") && colNameLower !== "_id") {
        prefix = col.name.slice(0, -3);
      } else if (colNameLower.endsWith("id") && colNameLower !== "id") {
        prefix = col.name.slice(0, -2);
      }

      if (prefix) {
        const normPrefix = normalize(prefix);
        if (normPrefix === "parent" || normPrefix === "child") {
          targetTable = table.name;
        } else if (normalizedToTableName.has(normPrefix)) {
          targetTable = normalizedToTableName.get(normPrefix)!;
        } else {
          const aliasTarget = aliases[normPrefix];
          if (aliasTarget && tableNames.includes(aliasTarget)) {
            targetTable = aliasTarget;
          }
        }
      } else {
        const normCol = normalize(col.name);
        if (normalizedToTableName.has(normCol)) {
          if (col.type === "object" || col.type === "array") {
            targetTable = normalizedToTableName.get(normCol)!;
          }
        } else if (aliases[normCol] && tableNames.includes(aliases[normCol])) {
          if (col.type === "object" || col.type === "array") {
            targetTable = aliases[normCol];
          }
        } else {
          // Check if column ends with normalized table name (e.g. 'viewedstory' ends with 'story')
          for (const [normT, origT] of normalizedToTableName.entries()) {
            if (
              normCol.endsWith(normT) &&
              (col.type === "object" || col.type === "array")
            ) {
              targetTable = origT;
              break;
            }
          }
        }
      }

      if (targetTable) {
        const targetTableSchema = tables.find((t) => t.name === targetTable);
        const hasIdColumn = targetTableSchema?.columns.some(
          (c) => c.name === "_id",
        );
        if (hasIdColumn && !mappedColumns.has(col.name)) {
          table.foreignKeys.push({
            table: table.name,
            column: col.name,
            refTable: targetTable,
            refColumn: "_id",
          });
          mappedColumns.add(col.name);
        }
      }
    }
  }

  return tables;
}
