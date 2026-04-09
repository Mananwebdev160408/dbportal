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
  query?(query: DriverQueryInput): Promise<QueryResult>;
  updateRecord?(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void>;
  close?(): Promise<void>;
}
