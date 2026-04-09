import EmptyState from '../EmptyState';

interface TableViewProps {
  rows: Record<string, unknown>[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string>;
  dbId?: string;
  dbType?: string;
  tableName?: string;
  onSort?: (col: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

import { useState } from 'react';

export default function TableView({ rows, sortBy, sortOrder, filters = {}, dbId, dbType, tableName, onSort, onFilterChange }: TableViewProps) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filters);

  const isMongo = dbType?.toLowerCase().includes('mongo');
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

  const handleFilterTyped = (col: string, val: string) => {
    onFilterChange?.({ ...filters, [col]: val });
  };

  const handleLocalFilterChange = (col: string, val: string) => {
    setLocalFilters(prev => ({ ...prev, [col]: val }));
  };

  const startEdit = (rowIdx: number, col: string, val: unknown) => {
    if (!isMongo) return;
    setEditingCell({ rowIdx, col });
    setEditValue(String(val ?? ''));
  };

  const handleSave = async (rowIdx: number, col: string) => {
    if (!dbId || !tableName) return;
    const row = rows[rowIdx];
    const identifier = row._id || row.id;

    if (!identifier) {
      alert('Cannot update record: No unique identifier (_id or id) found.');
      setEditingCell(null);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/data/${tableName}/update?dbId=${dbId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { _id: identifier },
          update: { [col]: editValue }
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || 'Update failed');
      }

      // Optimistically update local state (simplification: just close editor)
      // In a real app, we'd trigger a reload or update the row ref
      setEditingCell(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async () => {
    const fieldName = prompt('Enter new field name:');
    if (!fieldName) return;
    
    // In MongoDB, we can just update a record with a new field to 'create' it
    // We'll apply this to the first record or as a generic hint.
    // Real schema mutation in Mongo is just writing data.
    alert(`Field "${fieldName}" ready. Edit any row to add values for this field.`);
  };

  return (
    <div className="table-view-container">

      <div className="table-responsive-wrapper" style={{ minWidth: '100%', width: 'max-content' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>#_ID</th>
              {columns.map((col) => (
                <th 
                  key={col} 
                  className={sortBy === col ? 'active-sort' : ''}
                  onClick={() => onSort?.(col)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="th-content">
                    <span>{col.toUpperCase()}</span>
                    {sortBy === col && (
                      <span className="sort-arrow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
            <tr className="filter-row">
              <th className="filter-cell-id">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.3 }}>
                  <path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/>
                </svg>
              </th>
              {columns.map((col) => (
                <th key={`filter-${col}`} className="filter-cell">
                  <input 
                    type="text"
                    placeholder="Filter..."
                    value={localFilters[col] || ''}
                    onChange={(e) => handleLocalFilterChange(col, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFilterTyped(col, localFilters[col] || '');
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
                <td style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                  {(rowIdx + 1).toString().padStart(3, '0')}
                </td>
                {columns.map((col) => {
                  const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.col === col;
                  const val = row[col];
                  
                  if (isEditing) {
                    return (
                      <td key={col} className="editing-cell" onClick={(e) => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSave(rowIdx, col)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(rowIdx, col);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                        />
                      </td>
                    );
                  }

                  if (val === null || val === undefined) {
                    return (
                      <td key={col} onDoubleClick={() => startEdit(rowIdx, col, null)}>
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
                        title={isMongo ? "Double click to edit string value" : "Click to log to console"}
                        onClick={() => !isMongo && console.log(`[dbportal] Row ${rowIdx} — ${col}:`, val)}
                        onDoubleClick={() => startEdit(rowIdx, col, summary)}
                      >
                        <code dangerouslySetInnerHTML={{ __html: `${escapeHtml(summary)}${summary.length >= 50 ? '...' : ''}` }} />
                      </td>
                    );
                  }
                  return (
                    <td key={col} onDoubleClick={() => startEdit(rowIdx, col, val)}>
                      {String(val)}
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
