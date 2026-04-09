import type { DatabaseOverview } from '../../App';
import EmptyState from '../EmptyState';

interface OverviewViewProps {
  overview: DatabaseOverview;
  onTableClick: (name: string) => void;
}

export default function OverviewView({ overview, onTableClick }: OverviewViewProps) {
  const counts = overview.tables.map((table) => table.count);
  const totalTables = overview.totalTables;
  const totalRecords = overview.totalRecords;
  const activeTables = counts.filter((count) => count > 0).length;
  const emptyTables = Math.max(totalTables - activeTables, 0);
  const avgPerTable = totalTables > 0 ? totalRecords / totalTables : 0;

  const topTable = overview.tables[0];
  const topShare = totalRecords > 0 && topTable ? (topTable.count / totalRecords) * 100 : 0;

  const topFive = overview.tables.slice(0, 5);
  const maxCount = topFive.reduce((max, table) => Math.max(max, table.count), 0);

  const sortedCounts = [...counts].sort((a, b) => a - b);
  const mid = Math.floor(sortedCounts.length / 2);
  const medianPerTable =
    sortedCounts.length === 0
      ? 0
      : sortedCounts.length % 2 === 0
      ? (sortedCounts[mid - 1] + sortedCounts[mid]) / 2
      : sortedCounts[mid];

  const concentrationRatio =
    totalRecords > 0 ? ((topFive.reduce((sum, table) => sum + table.count, 0) / totalRecords) * 100).toFixed(1) : '0.0';

  const topFiveTotal = topFive.reduce((sum, table) => sum + table.count, 0);
  const othersCount = Math.max(totalRecords - topFiveTotal, 0);
  const donutSegments = [...topFive.map((table) => ({ label: table.name, value: table.count })), { label: 'Others', value: othersCount }]
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      percent: totalRecords > 0 ? (item.value / totalRecords) * 100 : 0,
    }));

  let cumulative = 0;
  const donutStops = donutSegments
    .map((segment, index) => {
      const start = cumulative;
      cumulative += segment.percent;
      const end = cumulative;
      const colors = ['#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#64748b'];
      const color = colors[index % colors.length];
      return `${color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="overview-wrap">
      <div className="overview-metrics">
        <div className="metric-card">
          <span className="metric-label">Database Type</span>
          <span className="metric-value">{overview.dbType || '—'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Tables / Collections</span>
          <span className="metric-value">{overview.totalTables.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Records</span>
          <span className="metric-value">{overview.totalRecords.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Objects</span>
          <span className="metric-value">{activeTables.toLocaleString()}</span>
        </div>
      </div>

      <div className="insights-grid">
        <div className="insight-card">
          <h4>Data Distribution</h4>
          {totalRecords > 0 ? (
            <>
              <div className="donut-wrap">
                <div className="donut-chart" style={{ background: `conic-gradient(${donutStops})` }} />
                <div className="donut-center">{totalRecords.toLocaleString()}</div>
              </div>
              <div className="legend-list">
                {donutSegments.map((segment) => (
                  <div key={segment.label} className="legend-item">
                    <span>{segment.label}</span>
                    <span>{segment.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="insight-empty">No records available to build distribution chart.</p>
          )}
        </div>

        <div className="insight-card">
          <h4>Top Objects by Records</h4>
          {topFive.length > 0 ? (
            <div className="bar-chart-list">
              {topFive.map((table) => {
                const width = maxCount > 0 ? (table.count / maxCount) * 100 : 0;
                return (
                  <button
                    key={table.name}
                    className="bar-row"
                    type="button"
                    onClick={() => onTableClick(table.name)}
                  >
                    <div className="bar-row-head">
                      <span>{table.name}</span>
                      <span>{table.count.toLocaleString()}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.max(width, 4)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="insight-empty">No objects found.</p>
          )}
        </div>
      </div>

      <div className="explain-grid">
        <div className="explain-card">
          <h4>What This Means</h4>
          <ul>
            <li>
              Top object: <strong>{topTable ? topTable.name : '—'}</strong>
              {topTable ? ` (${topShare.toFixed(1)}% of all records)` : ''}
            </li>
            <li>
              Empty objects: <strong>{emptyTables.toLocaleString()}</strong>
            </li>
            <li>
              Average records/object: <strong>{avgPerTable.toFixed(1)}</strong>
            </li>
            <li>
              Median records/object: <strong>{medianPerTable.toFixed(1)}</strong>
            </li>
            <li>
              Top-5 concentration: <strong>{concentrationRatio}%</strong>
            </li>
          </ul>
        </div>

        <div className="explain-card">
          <h4>Suggested Actions</h4>
          <ul>
            <li>Review highly concentrated datasets for indexing and query optimization.</li>
            <li>Inspect empty objects before migration or archival to reduce clutter.</li>
            <li>Use query workspace to sample largest collections quickly.</li>
          </ul>
        </div>
      </div>

      <div className="overview-card">
        <h3 className="overview-card-title">Objects by Record Count</h3>
        {overview.tables.length > 0 ? (
          <table className="overview-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              {overview.tables.map((table, index) => (
                <tr key={table.name} onClick={() => onTableClick(table.name)}>
                  <td>{index + 1}</td>
                  <td>{table.name}</td>
                  <td>{table.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>
            <p>No tables or collections found.</p>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
