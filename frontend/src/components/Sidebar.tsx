import { useState } from 'react';
import type { AppMode, DatabaseConnectionInfo } from '../App';

interface SidebarProps {
  connections: DatabaseConnectionInfo[];
  activeDbId: string;
  tables: string[];
  activeTable: string;
  appMode: AppMode;
  onOverviewClick: () => void;
  onQueryClick: () => void;
  onTableClick: (name: string) => void;
  onDbChange: (id: string) => void;
}

const TableIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M3 15h18" />
    <path d="M9 3v18" /><path d="M15 3v18" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M9 21V9" />
  </svg>
);

const QueryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
  </svg>
);

const DbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, color: '#fff' }}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

export default function Sidebar({ 
  connections, activeDbId, tables, activeTable, appMode, 
  onOverviewClick, onQueryClick, onTableClick, onDbChange 
}: SidebarProps) {
  const [tableFilter, setTableFilter] = useState('');

  const filteredTables = tables.filter(t => 
    t.toLowerCase().includes(tableFilter.toLowerCase())
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <DbIcon />
        </div>
        <div>
          <h1 className="brand">dbportal</h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Multi-Link System v3.0
          </div>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="db-selector-wrapper">
          <div className="section-label">Active Connection</div>
          <div className="db-connection-list">
            {connections.map((conn) => (
              <button
                key={conn.id}
                className={`db-connection-item${activeDbId === conn.id ? ' active' : ''}`}
                onClick={() => onDbChange(conn.id)}
                type="button"
              >
                <div className="indicator" />
                <div className="conn-info">
                  <span className="name">{conn.name}</span>
                  <span className="kind">{conn.kind.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="section-divider" />

        <button
          className={`overview-btn${appMode === 'overview' ? ' active' : ''}`}
          onClick={onOverviewClick}
          type="button"
        >
          <GridIcon />
          <span>General Overview</span>
        </button>

        <button
          className={`overview-btn${appMode === 'query' ? ' active' : ''}`}
          onClick={onQueryClick}
          type="button"
        >
          <QueryIcon />
          <span>Central Query Console</span>
        </button>

        <div className="table-nav-group">
          <div className="section-label-row">
            <span className="section-label">
              {activeDbId === 'primary' ? 'Primary' : activeDbId.toUpperCase()} Schema
            </span>
            <span className="count-badge">{tables.length}</span>
          </div>
          
          <div className="sidebar-search">
            <input 
              type="text" 
              placeholder="Filter objects..." 
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          <div className="table-list">
            {filteredTables.length === 0 && (
              <div className="list-empty-state">
                {tableFilter ? 'No matches' : 'No tables detected'}
              </div>
            )}
            {filteredTables.map((name) => (
              <button
                key={name}
                className={`table-item${activeTable === name && appMode === 'table' ? ' active' : ''}`}
                onClick={() => onTableClick(name)}
                type="button"
                title={name}
              >
                <TableIcon />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
