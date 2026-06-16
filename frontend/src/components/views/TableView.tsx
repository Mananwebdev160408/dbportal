import { useState, useRef, useCallback, useEffect } from "react";
import EmptyState from "../EmptyState";

const SENSITIVE_KEYS = ["password", "token", "secret"];

const isSensitiveColumn = (col: string): boolean =>
  SENSITIVE_KEYS.some((k) => col.toLowerCase().includes(k));

interface TableViewProps {
  rows: Record<string, unknown>[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, string>;
  onSort?: (col: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  maskSensitive?: boolean;
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  onPageChange?: (page: number) => void;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const exportCSV = (rows: Record<string, unknown>[], columns: string[]) => {
  if (!rows.length) return;
  const csv = [
    columns.join(","),
    ...rows.map((r) =>
      columns.map((h) => JSON.stringify(r[h] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "table_export.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const ROW_HEIGHT = 42;
const OVERSCAN_ROWS = 10;
const LOAD_MORE_THRESHOLD = 320;

export default function TableView({
  rows,
  sortBy,
  sortOrder,
  filters = {},
  onSort,
  onFilterChange,
  maskSensitive = false,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
}: TableViewProps) {
  const [localFilters, setLocalFilters] =
    useState<Record<string, string>>(filters);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const dragState = useRef<{
    col: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const loadMoreRequestedRef = useRef(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
        setViewportHeight(entries[0].contentRect.height || 480);
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isLoadingMore) {
      loadMoreRequestedRef.current = false;
    }
  }, [isLoadingMore, rows.length]);

  useEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [sortBy, sortOrder, filters]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;

      setScrollTop(target.scrollTop);
      setViewportHeight(target.clientHeight);

      const distanceFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;

      if (
        distanceFromBottom < LOAD_MORE_THRESHOLD &&
        hasNextPage &&
        !isLoadingMore &&
        !loadMoreRequestedRef.current
      ) {
        loadMoreRequestedRef.current = true;
        onLoadMore?.();
      }
    },
    [hasNextPage, isLoadingMore, onLoadMore],
  );

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, col: string) => {
      e.preventDefault();
      e.stopPropagation();

      const startWidth = colWidths[col] ?? DEFAULT_COL_WIDTH;
      dragState.current = { col, startX: e.clientX, startWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragState.current) return;

        const delta = moveEvent.clientX - dragState.current.startX;
        const newWidth = Math.max(
          MIN_COL_WIDTH,
          dragState.current.startWidth + delta,
        );

        setColWidths((prev) => ({
          ...prev,
          [dragState.current!.col]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [colWidths],
  );

  const totalRawWidth =
    60 +
    columns.reduce(
      (sum, col) => sum + (colWidths[col] ?? DEFAULT_COL_WIDTH),
      0,
    );

  const shouldScale = containerWidth > 0 && totalRawWidth < containerWidth;
  const scaleFactor = shouldScale ? containerWidth / totalRawWidth : 1;

  const idColWidth = 60 * scaleFactor;
  const getColWidth = (col: string) => {
    const raw = colWidths[col] ?? DEFAULT_COL_WIDTH;
    return raw * scaleFactor;
  };

  const visibleStart = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  );

  const visibleEnd = Math.min(
    rows.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS,
  );

  const visibleRows = rows.slice(visibleStart, visibleEnd);
  const topSpacerHeight = visibleStart * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(
    0,
    (rows.length - visibleEnd) * ROW_HEIGHT,
  );

  return (
    <div className="table-view-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 1rem",
        }}
      >
        <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
          Loaded <strong style={{ color: "var(--text)" }}>{rows.length}</strong>{" "}
          rows
          {hasNextPage ? " - scroll to load more" : " - end of results"}
        </span>

        <button
          className="export-csv-btn"
          onClick={() => exportCSV(rows, columns)}
        >
          Export loaded CSV
        </button>
      </div>

      <div
        className="table-responsive-wrapper"
        ref={wrapperRef}
        onScroll={handleScroll}
        style={{
          width: "100%",
          maxHeight: "calc(100vh - 260px)",
          overflow: "auto",
        }}
      >
        <table
          className="data-table"
          style={{
            tableLayout: "fixed",
            width: shouldScale ? "100%" : `${totalRawWidth}px`,
            minWidth: "100%",
          }}
        >
          <thead>
            <tr>
              <th style={{ width: `${idColWidth}px` }}>#_ID</th>
              {columns.map((col) => (
                <th
                  key={col}
                  className={sortBy === col ? "active-sort" : ""}
                  onClick={() => onSort?.(col)}
                  style={{
                    cursor: "pointer",
                    width: `${getColWidth(col)}px`,
                    minWidth: `${MIN_COL_WIDTH}px`,
                    position: "relative",
                    userSelect: "none",
                  }}
                >
                  <div className="th-content">
                    <span>{col.toUpperCase()}</span>
                    {sortBy === col && (
                      <span className="sort-arrow">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>

                  <span
                    className="col-resize-handle"
                    onMouseDown={(e) => handleMouseDown(e, col)}
                    title="Drag to resize"
                  />
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
            {topSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + 1}
                  style={{
                    height: `${topSpacerHeight}px`,
                    padding: 0,
                    border: 0,
                  }}
                />
              </tr>
            )}

            {visibleRows.map((row, visibleIdx) => {
              const rowIdx = visibleStart + visibleIdx;

              return (
                <tr key={rowIdx} style={{ height: `${ROW_HEIGHT}px` }}>
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
                        <td key={col} className="json-cell" title={titleText}>
                          <code
                            dangerouslySetInnerHTML={{
                              __html: `${escapeHtml(summary)}${
                                fullJson.length >= 50 ? "..." : ""
                              }`,
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
                      <td
                        key={col}
                        title={
                          maskSensitive && isSensitiveColumn(col)
                            ? "Masked"
                            : String(val)
                        }
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {bottomSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + 1}
                  style={{
                    height: `${bottomSpacerHeight}px`,
                    padding: 0,
                    border: 0,
                  }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.6rem 1rem",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          fontSize: "0.8rem",
          color: "var(--text-dim)",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
          {isLoadingMore
            ? "Loading more rows..."
            : hasNextPage
              ? `Loaded ${rows.length} rows - scroll to load more`
              : `Loaded ${rows.length} rows - end of results`}
        </span>
      </div>
    </div>
  );
}
