import { useState } from "react";
import type {
  AppMode,
  ConnectionHealth,
  ConnectionHealthStatus,
  DatabaseConnectionInfo,
  DriverCapabilities,
} from "../App";
import { StarIcon } from "./Icons";

const HEALTH_STATUS_COLORS: Record<ConnectionHealthStatus, string> = {
  healthy: "#22c55e",
  degraded: "#eab308",
  slow: "#f97316",
  unreachable: "#ef4444",
  unknown: "#9ca3af",
};

const healthStatusColor = (health?: ConnectionHealth): string =>
  HEALTH_STATUS_COLORS[health?.status ?? "unknown"];

const formatHealthTooltip = (health?: ConnectionHealth): string => {
  if (!health || health.status === "unknown") {
    return "Never checked";
  }

  const lastChecked = health.lastCheckedAt
    ? new Date(health.lastCheckedAt).toLocaleTimeString()
    : "never";

  if (health.status === "unreachable") {
    const reason = health.error ? `: ${health.error}` : "";
    return `Unreachable${reason}\nLast checked: ${lastChecked}`;
  }

  return `Latency: ${health.latencyMs}ms\nLast checked: ${lastChecked}`;
};

interface TableWithCount {
  name: string;
  count: number;
}

interface SidebarProps {
  connections: DatabaseConnectionInfo[];
  activeDbId: string;
  tables: string[];
  tableCounts?: Record<string, number>;
  activeTable: string;
  appMode: AppMode;
  capabilities: DriverCapabilities;
  onCommonDashboardClick: () => void;
  onOverviewClick: () => void;
  onQueryClick: () => void;
  onSchemaClick: () => void;
  onTableClick: (name: string) => void;
  onDbChange: (id: string) => void;
  pinnedTables: string[];
  onTogglePin: (name: string) => void;
  onOpenConnectionBuilder: () => void;
}

const TableIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

const GridIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h18v18H3z" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const DashboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="8" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="15" width="7" height="6" />
  </svg>
);

const QueryIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </svg>
);

const SchemaIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="8.5" y="14" width="7" height="7" />
    <path d="M10 7h4" />
    <path d="M12 10v4" />
  </svg>
);

const DbIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 20, color: "var(--text)" }}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

export default function Sidebar({
  connections,
  activeDbId,
  tables,
  activeTable,
  appMode,
  capabilities,
  onCommonDashboardClick,
  onOverviewClick,
  onQueryClick,
  onSchemaClick,
  onTableClick,
  onDbChange,
  tableCounts = {},
  pinnedTables = [],
  onTogglePin,
  onOpenConnectionBuilder,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentDbPinned = tables.filter((t) =>
    pinnedTables.includes(`${activeDbId}:${t}`),
  );

  const filteredPinned = currentDbPinned.filter((t) =>
    t.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentDbUnpinned = filteredTables.filter(
    (t) => !pinnedTables.includes(`${activeDbId}:${t}`),
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-glow" aria-hidden="true" />
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="logo-icon">
            <DbIcon />
          </div>
          <div className="brand-block">
            <h1 className="brand">dbportal</h1>
          </div>
        </div>

        <div className="sidebar-meta-strip">
          <span className="meta-pill">{connections.length} Connections</span>
          <span className="meta-pill accent">{tables.length} Tables</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search tables / collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sidebar-search-input"
            aria-label="Filter tables"
          />
        </div>

        <button
          className={`overview-btn common-dashboard-btn${appMode === "common" ? " active" : ""}`}
          onClick={onCommonDashboardClick}
          type="button"
        >
          <DashboardIcon />
          <span>Common Dashboard</span>
        </button>

        <div className="db-selector-wrapper">
          <div className="section-label">Active Connection</div>
          <div className="db-connection-list">
            {connections.map((conn) => (
              <button
                key={conn.id}
                className={`db-connection-item${activeDbId === conn.id ? " active" : ""}`}
                onClick={() => onDbChange(conn.id)}
                type="button"
              >
                <div
                  className="indicator"
                  title={formatHealthTooltip(conn.health)}
                  aria-label={formatHealthTooltip(conn.health)}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: healthStatusColor(conn.health),
                    flexShrink: 0,
                  }}
                />
                <div className="conn-info">
                  <span className="name">{conn.name}</span>
                  <span className="kind">{conn.kind.toUpperCase()}</span>
                </div>
                <span className="conn-tag">
                  {activeDbId === conn.id ? "LIVE" : "READY"}
                </span>
              </button>
            ))}
            <button
              className="db-connection-item connection-builder-btn"
              onClick={onOpenConnectionBuilder}
              type="button"
              style={{
                marginTop: "8px",
                justifyContent: "center",
                borderStyle: "dashed",
                borderColor: "var(--line-strong)",
                opacity: 0.75,
              }}
            >
              <span
                className="name"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 12, height: 12 }}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Build Connection URI
              </span>
            </button>
          </div>
        </div>

        <div className="section-divider" />

        <div className="section-label">Workspace</div>

        <button
          className={`overview-btn${appMode === "overview" ? " active" : ""}`}
          onClick={onOverviewClick}
          type="button"
        >
          <GridIcon />
          <span>Overview</span>
        </button>

        {(capabilities.rawQuery || capabilities.structuredQuery) && (
          <button
            className={`overview-btn${appMode === "query" ? " active" : ""}`}
            onClick={() => onQueryClick()}
            type="button"
          >
            <QueryIcon />
            <span>Query Console</span>
          </button>
        )}

        <button
          className={`overview-btn${appMode === "schema" ? " active" : ""}`}
          onClick={() => onSchemaClick()}
          type="button"
        >
          <SchemaIcon />
          <span>Schema</span>
        </button>

        <div className="table-nav-group">
          <div className="section-label-row">
            <span className="section-label">
              {activeDbId === "primary" ? "Primary" : activeDbId.toUpperCase()}{" "}
              Schema
            </span>
            <span className="count-badge">{tables.length}</span>
          </div>

          {filteredPinned.length > 0 && (
            <>
              <div
                className="section-label-row pinned-label-row"
                style={{ marginTop: "12px", marginBottom: "6px" }}
              >
                <span
                  className="section-label"
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    opacity: 0.8,
                    paddingLeft: 0,
                    borderLeft: "none",
                  }}
                >
                  📌 Pinned Tables
                </span>
                <span className="count-badge">{filteredPinned.length}</span>
              </div>
              <div
                className="pinned-table-list"
                style={{ display: "grid", gap: "2px", marginBottom: "12px" }}
              >
                {filteredPinned.map((name) => (
                  <div
                    key={`pinned-${name}`}
                    className={`table-item${activeTable === name && appMode === "table" ? " active" : ""}`}
                    onClick={() => onTableClick(name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onTableClick(name);
                      }
                    }}
                    title={name}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <TableIcon />
                    <span style={{ marginRight: "auto" }}>{name}</span>

                    {tableCounts[name] !== undefined && (
                      <span
                        style={{
                          marginLeft: "8px",
                          marginRight: "6px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          background: "var(--accent, #6366f1)",
                          color: "#fff",
                          borderRadius: "999px",
                          padding: "1px 7px",
                          minWidth: "20px",
                          textAlign: "center",
                          opacity: 0.85,
                        }}
                      >
                        {tableCounts[name] > 9999 ? "9999+" : tableCounts[name]}
                      </span>
                    )}

                    <button
                      className="pin-btn pinned"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(name);
                      }}
                      type="button"
                      aria-label="Unpin table"
                    >
                      <StarIcon filled={true} size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div
                className="section-divider"
                style={{ margin: "8px 0 12px" }}
              />
            </>
          )}

          {filteredPinned.length > 0 && currentDbUnpinned.length > 0 && (
            <div
              className="section-label-row"
              style={{ marginTop: "4px", marginBottom: "6px" }}
            >
              <span
                className="section-label"
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: 0.8,
                  paddingLeft: 0,
                  borderLeft: "none",
                }}
              >
                Tables
              </span>
              <span className="count-badge">{currentDbUnpinned.length}</span>
            </div>
          )}

          <div className="table-list">
            {currentDbUnpinned.length === 0 && (
              <div className="list-empty-state">
                {searchQuery ? "No matches" : "No tables detected"}
              </div>
            )}
            {currentDbUnpinned.map((name) => {
              const isPinned = pinnedTables.includes(`${activeDbId}:${name}`);
              return (
                <div
                  key={name}
                  className={`table-item${activeTable === name && appMode === "table" ? " active" : ""}`}
                  onClick={() => onTableClick(name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onTableClick(name);
                    }
                  }}
                  title={name}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <TableIcon />
                  <span style={{ marginRight: "auto" }}>{name}</span>

                  {tableCounts[name] !== undefined && (
                    <span
                      style={{
                        marginLeft: "8px",
                        marginRight: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background: "var(--accent, #6366f1)",
                        color: "#fff",
                        borderRadius: "999px",
                        padding: "1px 7px",
                        minWidth: "20px",
                        textAlign: "center",
                        opacity: 0.85,
                      }}
                    >
                      {tableCounts[name] > 9999 ? "9999+" : tableCounts[name]}
                    </span>
                  )}

                  <button
                    className={`pin-btn${isPinned ? " pinned" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(name);
                    }}
                    type="button"
                    aria-label={isPinned ? "Unpin table" : "Pin table"}
                  >
                    <StarIcon filled={isPinned} size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
