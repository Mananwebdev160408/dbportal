export interface DriverCapabilities {
  rawQuery: boolean;
  structuredQuery: boolean;
}

export interface StructuredQuery {
  collection?: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  pipeline?: any[]; // MongoDB aggregation support
}

export interface QueryTelemetry {
  executionTimeMs: number;
  affectedRows?: number;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  telemetry: QueryTelemetry;
}

export type DriverQueryInput = string | StructuredQuery;

export interface ColumnSchema {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
}

export interface ForeignKeySchema {
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  foreignKeys: ForeignKeySchema[];
}

export interface DatabaseSchema {
  dbType: string;
  tables: TableSchema[];
}

export interface DatabaseDriver {
  connect(): Promise<void>;
  getCapabilities(): DriverCapabilities;
  getTables(): Promise<string[]>;
  getTableCount(name: string): Promise<number>;
  getTableData(
    name: string,
    limit: number,
    offset?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Promise<Record<string, unknown>[]>;
  getSchema(): Promise<DatabaseSchema>;
  query?(query: DriverQueryInput): Promise<QueryResult>;
  close?(): Promise<void>;
}
