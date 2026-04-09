import { useState } from 'react';
import EmptyState from '../EmptyState';

interface InspectorViewProps {
  rows: Record<string, unknown>[];
}

const getRowLabel = (row: Record<string, unknown>, index: number): string => {
  const preferredKeys = ['id', '_id', 'name', 'title', 'email'];
  for (const key of preferredKeys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val);
    }
  }
  const firstKey = Object.keys(row)[0];
  if (!firstKey) return `Record ${index + 1}`;
  return `${firstKey}: ${String(row[firstKey])}`;
};

const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export default function InspectorView({ rows }: InspectorViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!rows.length) {
    return (
      <EmptyState>
        <p>No records found in this table.</p>
      </EmptyState>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, rows.length - 1));
  const selectedRow = rows[safeIndex] ?? {};

  return (
    <div className="inspector-layout">
      <section className="inspector-list">
        {rows.map((row, index) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: no stable key
            key={index}
            className={`inspector-row-btn${index === safeIndex ? ' active' : ''}`}
            onClick={() => setSelectedIndex(index)}
            type="button"
          >
            <span className="inspector-row-title">{getRowLabel(row, index)}</span>
            <span className="inspector-row-meta">{Object.keys(row).length} field(s)</span>
          </button>
        ))}
      </section>

      <section className="inspector-detail">
        {Object.keys(selectedRow).length > 0 ? (
          Object.entries(selectedRow).map(([key, value]) => (
            <article key={key} className="field-card">
              <div className="field-key">{key}</div>
              <pre className="field-value">{formatFieldValue(value)}</pre>
            </article>
          ))
        ) : (
          <EmptyState>
            <p>No fields in selected record.</p>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
