import type { MultiDatabaseOverview, DatabaseOverview, TableOverview } from '../../App';
import EmptyState from '../EmptyState';

interface OverviewViewProps {
  overview: MultiDatabaseOverview;
  onTableClick: (name: string, dbId?: string) => void;
}

export default function OverviewView({ overview, onTableClick }: OverviewViewProps) {
  // Always work with the provided databases (App.tsx will filter to the active one)
  const single = overview.databases[0];
  if (!single) return <EmptyState><p>No active database node selected.</p></EmptyState>;
  
  const counts = single.tables.map((table: TableOverview) => table.count);
  const totalTables = single.totalTables;
  const totalRecords = single.totalRecords;
  const activeTables = counts.filter((count: number) => count > 0).length;
  const emptyTables = Math.max(totalTables - activeTables, 0);
  const avgPerTable = totalTables > 0 ? totalRecords / totalTables : 0;

  const topTable = single.tables[0];
  const topShare = totalRecords > 0 && topTable ? (topTable.count / totalRecords) * 100 : 0;

  const topFive = single.tables.slice(0, 5);
  const maxCount = topFive.reduce((max: number, table: TableOverview) => Math.max(max, table.count), 0);

  const sortedCounts = [...counts].sort((a, b) => a - b);
  const mid = Math.floor(sortedCounts.length / 2);
  const medianPerTable =
    sortedCounts.length === 0
      ? 0
      : sortedCounts.length % 2 === 0
      ? (sortedCounts[mid - 1] + sortedCounts[mid]) / 2
      : sortedCounts[mid];

  const concentrationRatio =
    totalRecords > 0 ? ((topFive.reduce((sum: number, table: TableOverview) => sum + table.count, 0) / totalRecords) * 100).toFixed(1) : '0.0';

  const topFiveTotal = topFive.reduce((sum: number, table: TableOverview) => sum + table.count, 0);
  const othersCount = Math.max(totalRecords - topFiveTotal, 0);
  const donutSegments = [...topFive.map((table: TableOverview) => ({ label: table.name, value: table.count })), { label: 'Others', value: othersCount }]
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      percent: totalRecords > 0 ? (item.value / totalRecords) * 100 : 0,
    }));

  let cumulative = 0;
  const colors = ['var(--accent)', '#06b6d4', '#3b82f6', '#14b8a6', '#ff9f0a', '#48484a'];
  const donutSegmentsWithColor = donutSegments.map((segment, index) => {
    const color = colors[index % colors.length];
    return { ...segment, color };
  });

  const donutStops = donutSegmentsWithColor
    .map((segment) => {
      const start = cumulative;
      cumulative += segment.percent;
      const end = cumulative;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="overview-wrap">
      <div className="overview-metrics">
        <div className="metric-card">
          <span className="metric-label">SYS_ID // DB_TYPE</span>
          <span className="metric-value">{single.dbType || '—'}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">TOTAL_OBJECTS</span>
          <span className="metric-value">{single.totalTables.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">RECORD_COUNT</span>
          <span className="metric-value">{single.totalRecords.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">ACTIVE_HANDLES</span>
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
                {donutSegmentsWithColor.map((segment) => (
                  <div key={segment.label} className="legend-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="legend-indicator" style={{ background: segment.color }} />
                      <span>{segment.label}</span>
                    </div>
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
              {topFive.map((table: TableOverview) => {
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

      </div>

      <div className="overview-card">
        <h3 className="overview-card-title">Objects by Record Count</h3>
        {single.tables.length > 0 ? (
          <table className="overview-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Records</th>
              </tr>
            </thead>
            <tbody>
              {single.tables.map((table: TableOverview, index: number) => (
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
