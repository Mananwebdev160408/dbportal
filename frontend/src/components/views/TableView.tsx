import { useState } from "react";
import EmptyState from "../EmptyState";

const SENSITIVE_KEYS = ["password", "token", "secret"];

const isSensitiveColumn = (col: string): boolean =>
  SENSITIVE_KEYS.some((k) => col.toLowerCase().includes(k));

const exportCSV = (rows: Record<string, unknown>[], columns: string[]) => {
  const header = columns.join(",");
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? "";
        const str =
          typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csvString = [header, ...csvRows].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

interface TableViewProps {
  rows: Record<string, unknown>[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, string>;
  onSort?: (col: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  maskSensitive?: boolean;
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export default function TableView({
  rows,
  sortBy,
  sortOrder,
  filters = {},
  onSort,
  onFilterChange,
  maskSensitive = false,
}: TableViewProps) {
  const [localFilters, setLocalFilters] =
    useState<Record<string, string>>(filters);

  if (!rows.length) {
    return (
      <EmptyState>
        <p>No records found in this table.</p>
      </EmptyState>
    );
  }

  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  const handleFilterTyped = (col: string, val: string) => {
    onFilterChange?.({ ...filters, [col]: val });
  };

  const handleLocalFilterChange = (col: string, val: string) => {
    setLocalFilters((prev) => ({ ...prev, [col]: val }));
  };

  return (
      <div className="table-view-container">
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0.5rem 1rem" }}>
          <button
            className="export-csv-btn"
            onClick={() => exportCSV(rows, columns)}
          >
            Export CSV ↓
          </button>
        </div>
        <div
          className="table-responsive-wrapper"
        style={{ minWidth: "100%", width: "max-content" }}
        >
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>#_ID</th>
              {columns.map((col) => (
                <th
                  key={col}
                  className={sortBy === col ? "active-sort" : ""}
                  onClick={() => onSort?.(col)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="th-content">
                    <span>{col.toUpperCase()}</span>
                    {sortBy === col && (
                      <span className="sort-arrow">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
            <tr className="filter-row">
              <th className="filter-cell-id">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  style={{ opacity: 0.3 }}
                >
                  <path d="m21 21-4.3-4.3" />
                  <circle cx="11" cy="11" r="8" />
                </svg>
              </th>
              {columns.map((col) => (
                <th key={`filter-${col}`} className="filter-cell">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={localFilters[col] || ""}
                    onChange={(e) =>
                      handleLocalFilterChange(col, e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFilterTyped(col, localFilters[col] || "");
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td style={{ color: "var(--text-dim)", fontSize: "10px" }}>
                  {(rowIdx + 1).toString().padStart(3, "0")}
                </td>
                {columns.map((col) => {
                  const val = row[col];

                  if (val === null || val === undefined) {
                    return (
                      <td key={col}>
                        <span className="null-val">null</span>
                      </td>
                    );
                  }
                  if (typeof val === "object") {
                    const fullJson = JSON.stringify(val);
                    const summary = fullJson.substring(0, 50);
                    const titleText = `Read-only preview\n\n${fullJson}`;
                    return (
                      <td
                        key={col}
                        className="json-cell"
                        title={titleText}
                        onClick={() =>
                          console.log(`[dbportal] Row ${rowIdx} — ${col}:`, val)
                        }
                      >
                        <code
                          dangerouslySetInnerHTML={{
                            __html: `${escapeHtml(summary)}${fullJson.length >= 50 ? "..." : ""}`,
                          }}
                        />
                      </td>
                    );
                  }
                  const displayVal =
                    maskSensitive && isSensitiveColumn(col)
                      ? "*****"
                      : String(val);
                  return (
                    <td key={col} title={maskSensitive && isSensitiveColumn(col) ? "Masked" : String(val)}>
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
