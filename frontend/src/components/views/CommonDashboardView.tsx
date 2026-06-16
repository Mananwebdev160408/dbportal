import { useMemo, useState } from "react";
import type { MultiDatabaseOverview, TableOverview } from "../../App";
import EmptyState from "../EmptyState";

interface CommonDashboardViewProps {
  overview: MultiDatabaseOverview;
  activeDbId: string;
  onDatabaseOverview: (dbId: string) => void;
  onQueryClick: (dbId?: string) => void;
  onSchemaClick: (dbId?: string) => void;
  onTableClick: (name: string, dbId?: string) => void;
  onOpenConnectionBuilder: () => void;
}

const formatNumber = (value: number) => value.toLocaleString();

const getDbInitial = (dbType: string) =>
  (dbType || "?").trim().slice(0, 1).toUpperCase();

export default function CommonDashboardView({
  overview,
  activeDbId,
  onDatabaseOverview,
  onQueryClick,
  onSchemaClick,
  onTableClick,
  onOpenConnectionBuilder,
}: CommonDashboardViewProps) {
  const databases = overview.databases || [];
  const [selectedDbId, setSelectedDbId] = useState(
    databases.find((db) => db.id === activeDbId)?.id || databases[0]?.id || "",
  );

  const selectedDb =
    databases.find((db) => db.id === selectedDbId) || databases[0];

  const dbTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const db of databases) {
      const type = db.dbType || "unknown";
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      count,
      percent: databases.length > 0 ? (count / databases.length) * 100 : 0,
    }));
  }, [databases]);

  const typeSummary =
    dbTypes.length > 0 ? dbTypes.map((item) => item.type).join(", ") : "None";
  const maxRecords = databases.reduce(
    (max, db) => Math.max(max, db.totalRecords || 0),
    0,
  );
  const topTables = selectedDb?.tables?.slice(0, 8) || [];

  const colors = [
    "var(--accent)",
    "#06b6d4",
    "#3b82f6",
    "#14b8a6",
    "#ff9f0a",
    "#bf5af2",
  ];

  let cumulative = 0;
  const donutStops = dbTypes
    .map((segment, index) => {
      const start = cumulative;
      cumulative += segment.percent;
      return `${colors[index % colors.length]} ${start}% ${cumulative}%`;
    })
    .join(", ");

  if (databases.length === 0) {
    return (
      <EmptyState>
        <p>No connected databases were reported by the overview endpoint.</p>
      </EmptyState>
    );
  }

  return (
    <div className="common-dashboard-wrap">
      <div className="fleet-summary-bar">
        <div className="fleet-summary-item">
          <span className="metric-label">CONNECTED_DATABASES</span>
          <strong>{formatNumber(overview.totalDbs || databases.length)}</strong>
        </div>
        <div className="fleet-summary-item">
          <span className="metric-label">TOTAL_OBJECTS</span>
          <strong>{formatNumber(overview.totalTables || 0)}</strong>
        </div>
        <div className="fleet-summary-item">
          <span className="metric-label">TOTAL_RECORDS</span>
          <strong>{formatNumber(overview.totalRecords || 0)}</strong>
        </div>
        <div className="fleet-summary-item wide">
          <span className="metric-label">DATABASE_TYPES</span>
          <strong>{typeSummary}</strong>
        </div>
      </div>

      <div
        className="common-section-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3>Fleet Health</h3>
          <p>{databases.length} database nodes reporting aggregate metadata</p>
        </div>
        <button
          className="icon-btn"
          onClick={onOpenConnectionBuilder}
          type="button"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span>Connection String Builder</span>
        </button>
      </div>

      <div className="health-card-grid">
        {databases.map((db) => (
          <article key={db.id} className="health-card">
            <div className="health-card-head">
              <div className="db-type-mark" aria-hidden="true">
                {getDbInitial(db.dbType)}
              </div>
              <div className="health-title">
                <h4>{db.name}</h4>
                <span>{db.dbType || "unknown"}</span>
              </div>
              <span className="health-status">ONLINE</span>
            </div>

            <div className="health-stats">
              <div>
                <span>Objects</span>
                <strong>{formatNumber(db.totalTables || 0)}</strong>
              </div>
              <div>
                <span>Records</span>
                <strong>{formatNumber(db.totalRecords || 0)}</strong>
              </div>
            </div>

            <button
              className="db-jump-link"
              type="button"
              onClick={() => onDatabaseOverview(db.id)}
            >
              Open Database Overview
            </button>
          </article>
        ))}
      </div>

      <div className="common-insight-grid">
        <section className="insight-card">
          <h4>Cross-Database Size Comparison</h4>
          <div className="fleet-bar-list">
            {databases.map((db) => {
              const width =
                maxRecords > 0
                  ? ((db.totalRecords || 0) / maxRecords) * 100
                  : 0;
              return (
                <button
                  key={db.id}
                  className="fleet-bar-row"
                  type="button"
                  onClick={() => onDatabaseOverview(db.id)}
                >
                  <div className="bar-row-head">
                    <span>{db.name}</span>
                    <span>{formatNumber(db.totalRecords || 0)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.max(width, 4)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="insight-card">
          <h4>Database Type Distribution</h4>
          {dbTypes.length > 0 ? (
            <>
              <div className="donut-wrap">
                <div
                  className="donut-chart"
                  style={{
                    background: `conic-gradient(${donutStops || "var(--line) 0% 100%"})`,
                  }}
                />
                <div className="donut-center">
                  {formatNumber(databases.length)}
                </div>
              </div>
              <div className="legend-list">
                {dbTypes.map((segment, index) => (
                  <div key={segment.type} className="legend-item">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        className="legend-indicator"
                        style={{ background: colors[index % colors.length] }}
                      />
                      <span>{segment.type}</span>
                    </div>
                    <span>{segment.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="insight-empty">No database types detected.</p>
          )}
        </section>
      </div>

      <section className="quick-actions-panel">
        <div className="quick-actions-head">
          <div>
            <h3>Quick Actions</h3>
            <p>Route common dashboard actions to a selected database.</p>
          </div>
          <select
            value={selectedDb?.id || ""}
            onChange={(event) => setSelectedDbId(event.target.value)}
            aria-label="Select database for quick actions"
          >
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name}
              </option>
            ))}
          </select>
        </div>

        <div className="quick-action-row">
          <button type="button" onClick={() => onQueryClick(selectedDb?.id)}>
            Open Query Console
          </button>
          <button type="button" onClick={() => onSchemaClick(selectedDb?.id)}>
            Open Schema Visualizer
          </button>
        </div>

        <div className="jump-table-list">
          {topTables.length > 0 ? (
            topTables.map((table: TableOverview) => (
              <button
                key={table.name}
                type="button"
                onClick={() => onTableClick(table.name, selectedDb?.id)}
              >
                <span>{table.name}</span>
                <strong>{formatNumber(table.count || 0)}</strong>
              </button>
            ))
          ) : (
            <p className="insight-empty">No tables available for quick jump.</p>
          )}
        </div>
      </section>
    </div>
  );
}
