import EmptyState from '../EmptyState';

interface DocumentsViewProps {
  rows: Record<string, unknown>[];
}

export default function DocumentsView({ rows }: DocumentsViewProps) {
  if (!rows.length) {
    return (
      <EmptyState>
        <p>No records found in this table.</p>
      </EmptyState>
    );
  }

  return (
    <div className="doc-grid">
      {rows.map((row, index) => (
        <article key={index} className="doc-card">
          <div className="doc-header">
            <span style={{ fontFamily: 'var(--font-mono)' }}>Record {index + 1}</span>
          </div>
          <pre className="doc-body">{JSON.stringify(row, null, 2)}</pre>
        </article>
      ))}
    </div>
  );
}
