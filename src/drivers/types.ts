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
}

export type DriverQueryInput = string | StructuredQuery;

export interface DatabaseDriver {
  connect(): Promise<void>;
  getCapabilities(): DriverCapabilities;
  getTables(): Promise<string[]>;
  getTableCount(name: string): Promise<number>;
  getTableData(name: string, limit: number): Promise<Record<string, unknown>[]>;
  query?(query: DriverQueryInput): Promise<Record<string, unknown>[]>;
  close?(): Promise<void>;
}
