import EmptyState from '../EmptyState';

interface TableViewProps {
  rows: Record<string, unknown>[];
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export default function TableView({ rows }: TableViewProps) {
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
    }, new Set())
  );

  return (
    <div className="table-responsive-wrapper" style={{ minWidth: '100%', width: 'max-content' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>
                <div className="th-content">
                  <span>{col}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable key
            <tr key={rowIdx}>
              {columns.map((col) => {
                const val = row[col];
                if (val === null || val === undefined) {
                  return (
                    <td key={col}>
                      <span className="null-val">null</span>
                    </td>
                  );
                }
                if (typeof val === 'object') {
                  const summary = JSON.stringify(val).substring(0, 50);
                  return (
                    <td
                      key={col}
                      className="json-cell"
                      title="Click to log to console"
                      onClick={() => console.log(`[dbportal] Row ${rowIdx} — ${col}:`, val)}
                    >
                      <code dangerouslySetInnerHTML={{ __html: `${escapeHtml(summary)}${summary.length >= 50 ? '...' : ''}` }} />
                    </td>
                  );
                }
                return <td key={col}>{String(val)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
