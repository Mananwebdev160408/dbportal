import { useEffect, useMemo, useState } from "react";
import { CopyIcon, CheckIcon } from "../Icons";

interface ColumnSchema {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

interface DatabaseSchema {
  dbType: string;
  tables: TableSchema[];
}

type SqlOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "LIKE"
  | "IS NULL"
  | "IS NOT NULL";

const OPERATORS: SqlOperator[] = [
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "LIKE",
  "IS NULL",
  "IS NOT NULL",
];

const VALUELESS_OPERATORS = new Set<SqlOperator>(["IS NULL", "IS NOT NULL"]);

interface Condition {
  id: string;
  connector: "AND" | "OR";
  column: string;
  operator: SqlOperator;
  value: string;
}

interface OrderBy {
  column: string;
  direction: "ASC" | "DESC";
}

interface BuilderState {
  table: string;
  columns: string[];
  conditions: Condition[];
  orderBy: OrderBy | null;
  limit: number;
}

interface SqlQueryBuilderProps {
  dbId: string;
  dbType: string;
  tables: string[];
  onApply: (sql: string) => void;
}

const STORAGE_PREFIX = "dbportal-sql-query-builder";

const emptyState = (table: string): BuilderState => ({
  table,
  columns: [],
  conditions: [],
  orderBy: null,
  limit: 100,
});

const loadState = (dbId: string, fallbackTable: string): BuilderState => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${dbId}`);
    if (!raw) return emptyState(fallbackTable);
    const parsed = JSON.parse(raw) as BuilderState;
    return {
      table: parsed.table || fallbackTable,
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      orderBy: parsed.orderBy ?? null,
      limit: typeof parsed.limit === "number" ? parsed.limit : 100,
    };
  } catch {
    return emptyState(fallbackTable);
  }
};

const quoteIdentifier = (dbType: string, name: string): string => {
  const type = dbType.toLowerCase();
  if (type.includes("mysql") || type.includes("mariadb")) {
    return `\`${name}\``;
  }
  if (type.includes("mssql") || type.includes("sqlserver")) {
    return `[${name}]`;
  }
  return `"${name}"`;
};

const formatValue = (value: string): string => {
  if (value.trim() === "") return "''";
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value.trim() !== "") {
    return String(numeric);
  }
  return `'${value.replace(/'/g, "''")}'`;
};

const buildSql = (dbType: string, state: BuilderState): string => {
  if (!state.table) return "";

  const isMssql =
    dbType.toLowerCase().includes("mssql") ||
    dbType.toLowerCase().includes("sqlserver");

  const columnList =
    state.columns.length > 0
      ? state.columns.map((c) => quoteIdentifier(dbType, c)).join(", ")
      : "*";

  const topClause = isMssql ? `TOP ${state.limit} ` : "";
  const table = quoteIdentifier(dbType, state.table);

  let sql = `SELECT ${topClause}${columnList} FROM ${table}`;

  const validConditions = state.conditions.filter((c) => c.column);
  if (validConditions.length > 0) {
    const clause = validConditions
      .map((c, index) => {
        const col = quoteIdentifier(dbType, c.column);
        const predicate = VALUELESS_OPERATORS.has(c.operator)
          ? `${col} ${c.operator}`
          : `${col} ${c.operator} ${formatValue(c.value)}`;
        return index === 0 ? predicate : `${c.connector} ${predicate}`;
      })
      .join(" ");
    sql += ` WHERE ${clause}`;
  }

  if (state.orderBy?.column) {
    sql += ` ORDER BY ${quoteIdentifier(dbType, state.orderBy.column)} ${state.orderBy.direction}`;
  }

  if (!isMssql) {
    sql += ` LIMIT ${state.limit}`;
  }

  return `${sql};`;
};

export default function SqlQueryBuilder({
  dbId,
  dbType,
  tables,
  onApply,
}: SqlQueryBuilderProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [state, setState] = useState<BuilderState>(() =>
    loadState(dbId, tables[0] || ""),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState(loadState(dbId, tables[0] || ""));
  }, [dbId, tables]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/schema?dbId=${dbId}`)
      .then((res) => res.json())
      .then((payload: DatabaseSchema) => {
        if (!cancelled) setSchema(payload);
      })
      .catch(() => {
        if (!cancelled) setSchema(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dbId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}-${dbId}`, JSON.stringify(state));
  }, [dbId, state]);

  const columnsForTable = useMemo(() => {
    return schema?.tables.find((t) => t.name === state.table)?.columns ?? [];
  }, [schema, state.table]);

  const sql = useMemo(() => buildSql(dbType, state), [dbType, state]);

  const setTable = (table: string) => {
    setState((prev) => ({ ...emptyState(table), limit: prev.limit }));
  };

  const toggleColumn = (column: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.includes(column)
        ? prev.columns.filter((c) => c !== column)
        : [...prev.columns, column],
    }));
  };

  const addCondition = () => {
    setState((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: `${Date.now()}`,
          connector: "AND",
          column: columnsForTable[0]?.name || "",
          operator: "=",
          value: "",
        },
      ],
    }));
  };

  const updateCondition = (id: string, patch: Partial<Condition>) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  };

  const removeCondition = (id: string) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write denied
    }
  };

  if (tables.length === 0) {
    return null;
  }

  return (
    <div className="query-builder">
      <div className="query-group">
        <label htmlFor="builder-table">Table</label>
        <select
          id="builder-table"
          className="query-input"
          value={state.table}
          onChange={(e) => setTable(e.target.value)}
        >
          {tables.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {columnsForTable.length > 0 && (
        <div className="query-group">
          <label>Columns (none selected = *)</label>
          <div className="query-builder-columns">
            {columnsForTable.map((col) => (
              <label key={col.name} className="query-builder-checkbox">
                <input
                  type="checkbox"
                  checked={state.columns.includes(col.name)}
                  onChange={() => toggleColumn(col.name)}
                />
                {col.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="query-group">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label>Conditions</label>
          <button
            type="button"
            className="query-example-btn"
            onClick={addCondition}
          >
            + Add condition
          </button>
        </div>
        {state.conditions.map((condition, index) => (
          <div key={condition.id} className="query-builder-condition-row">
            {index > 0 && (
              <select
                className="query-input"
                value={condition.connector}
                onChange={(e) =>
                  updateCondition(condition.id, {
                    connector: e.target.value as "AND" | "OR",
                  })
                }
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}
            <select
              className="query-input"
              value={condition.column}
              onChange={(e) =>
                updateCondition(condition.id, { column: e.target.value })
              }
            >
              <option value="">Select column</option>
              {columnsForTable.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
            <select
              className="query-input"
              value={condition.operator}
              onChange={(e) =>
                updateCondition(condition.id, {
                  operator: e.target.value as SqlOperator,
                })
              }
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {!VALUELESS_OPERATORS.has(condition.operator) && (
              <input
                type="text"
                className="query-input"
                placeholder="value"
                value={condition.value}
                onChange={(e) =>
                  updateCondition(condition.id, { value: e.target.value })
                }
              />
            )}
            <button
              type="button"
              className="query-example-btn"
              onClick={() => removeCondition(condition.id)}
              aria-label="Remove condition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="query-grid-two compact">
        <div className="query-group">
          <label htmlFor="builder-order-column">Order By</label>
          <select
            id="builder-order-column"
            className="query-input"
            value={state.orderBy?.column ?? ""}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                orderBy: e.target.value
                  ? {
                      column: e.target.value,
                      direction: prev.orderBy?.direction ?? "ASC",
                    }
                  : null,
              }))
            }
          >
            <option value="">None</option>
            {columnsForTable.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
        <div className="query-group">
          <label htmlFor="builder-order-direction">Direction</label>
          <select
            id="builder-order-direction"
            className="query-input"
            value={state.orderBy?.direction ?? "ASC"}
            disabled={!state.orderBy}
            onChange={(e) =>
              setState((prev) =>
                prev.orderBy
                  ? {
                      ...prev,
                      orderBy: {
                        ...prev.orderBy,
                        direction: e.target.value as "ASC" | "DESC",
                      },
                    }
                  : prev,
              )
            }
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
      </div>

      <div className="query-group">
        <label htmlFor="builder-limit">Limit</label>
        <input
          id="builder-limit"
          type="number"
          min={1}
          className="query-input"
          value={state.limit}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              limit: Math.max(1, Number(e.target.value) || 1),
            }))
          }
        />
      </div>

      <div className="query-group">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label>Generated Query</label>
          <button type="button" className="query-example-btn" onClick={copySql}>
            {copied ? (
              <>
                <CheckIcon size={12} style={{ marginRight: 5 }} />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon size={12} style={{ marginRight: 5 }} />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="query-builder-preview">{sql}</pre>
      </div>

      <button
        type="button"
        className="query-run-btn"
        onClick={() => onApply(sql)}
        disabled={!state.table}
      >
        Insert into Editor
      </button>
    </div>
  );
}
