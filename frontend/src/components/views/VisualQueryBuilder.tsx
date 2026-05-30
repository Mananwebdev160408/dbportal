import { useState } from "react";

type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "exists"
  | "not_exists";

interface FilterRule {
  id: string;
  field: string;
  operator: Operator;
  value: string;
}

interface VisualQueryBuilderProps {
  tables: string[];
  columns: string[];
  onApply: (filter: Record<string, unknown>, collection: string, limit: number) => void;
}

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "exists", label: "Exists" },
  { value: "not_exists", label: "Not Exists" },
];

function buildMongoFilter(rules: FilterRule[]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  for (const rule of rules) {
    if (!rule.field) continue;
    switch (rule.operator) {
      case "equals":
        filter[rule.field] = rule.value;
        break;
      case "not_equals":
        filter[rule.field] = { $ne: rule.value };
        break;
      case "contains":
        filter[rule.field] = { $regex: rule.value, $options: "i" };
        break;
      case "greater_than":
        filter[rule.field] = { $gt: isNaN(Number(rule.value)) ? rule.value : Number(rule.value) };
        break;
      case "less_than":
        filter[rule.field] = { $lt: isNaN(Number(rule.value)) ? rule.value : Number(rule.value) };
        break;
      case "exists":
        filter[rule.field] = { $exists: true };
        break;
      case "not_exists":
        filter[rule.field] = { $exists: false };
        break;
    }
  }
  return filter;
}

export default function VisualQueryBuilder({
  tables,
  columns,
  onApply,
}: VisualQueryBuilderProps) {
  const [selectedTable, setSelectedTable] = useState(tables[0] || "")
  const [rules, setRules] = useState<FilterRule[]>([
    { id: "1", field: "", operator: "equals", value: "" },
  ])
  const [limit, setLimit] = useState(25)

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        field: "",
        operator: "equals",
        value: "",
      },
    ])
  }

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  const handleApply = () => {
    const filter = buildMongoFilter(rules.filter((r) => r.field))
    onApply(filter, selectedTable, limit)
  }

  const noValue = (op: Operator) => op === "exists" || op === "not_exists"

  return (
    <div className="query-help-card" style={{ marginBottom: "1rem" }}>
      <div className="query-help-title" style={{ marginBottom: "0.75rem" }}>
        🔧 Visual Query Builder
      </div>

      {/* Collection selector */}
      <div className="query-group" style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Collection / Table</label>
        <select
          className="query-input"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
        >
          {tables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Filter rules */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {rules.map((rule, idx) => (
          <div key={rule.id} style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            {idx > 0 && (
              <span style={{ fontSize: "0.7rem", opacity: 0.5, minWidth: "24px" }}>AND</span>
            )}

            {/* Field selector */}
            <select
              className="query-input"
              style={{ flex: 1, minWidth: "100px" }}
              value={rule.field}
              onChange={(e) => updateRule(rule.id, { field: e.target.value })}
            >
              <option value="">Select field...</option>
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>

            {/* Operator selector */}
            <select
              className="query-input"
              style={{ flex: 1, minWidth: "110px" }}
              value={rule.operator}
              onChange={(e) => updateRule(rule.id, { operator: e.target.value as Operator })}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>

            {/* Value input */}
            {!noValue(rule.operator) && (
              <input
                className="query-input"
                style={{ flex: 1, minWidth: "80px" }}
                placeholder="Value..."
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
              />
            )}

            {/* Remove rule */}
            {rules.length > 1 && (
              <button
                type="button"
                className="query-clear-btn"
                style={{ flexShrink: 0, padding: "4px 8px" }}
                onClick={() => removeRule(rule.id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add rule + Limit */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="query-clear-btn secondary"
          onClick={addRule}
        >
          + Add Filter
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Limit</label>
          <input
            className="query-input"
            style={{ width: "70px" }}
            value={limit}
            inputMode="numeric"
            onChange={(e) => setLimit(Number(e.target.value) || 25)}
          />
        </div>
      </div>

      {/* Apply button */}
      <button
        type="button"
        className="query-run-btn"
        style={{ width: "100%" }}
        onClick={handleApply}
      >
        ▶ Apply Query
      </button>
    </div>
  )
}