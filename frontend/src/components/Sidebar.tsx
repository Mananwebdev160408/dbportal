import { useState } from 'react';
import type { AppMode, DatabaseConnectionInfo, DriverCapabilities } from '../App';

interface SidebarProps {
  connections: DatabaseConnectionInfo[];
  activeDbId: string;
  tables: string[];
  activeTable: string;
  appMode: AppMode;
  capabilities: DriverCapabilities;
  onOverviewClick: () => void;
  onQueryClick: () => void;
  onSchemaClick: () => void;
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

const SchemaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="8.5" y="14" width="7" height="7" />
    <path d="M10 7h4" />
    <path d="M12 10v4" />
  </svg>
);

const DbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, color: 'var(--text)' }}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

export default function Sidebar({ 
  connections, activeDbId, tables, activeTable, appMode, capabilities,
  onOverviewClick, onQueryClick, onSchemaClick, onTableClick, onDbChange 
}: SidebarProps) {
  const [tableFilter, setTableFilter] = useState('');

  const filteredTables = tables.filter(t => 
    t.toLowerCase().includes(tableFilter.toLowerCase())
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
                <span className="conn-tag">{activeDbId === conn.id ? 'LIVE' : 'READY'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="section-divider" />

        <div className="section-label">Workspace</div>

        <button
          className={`overview-btn${appMode === 'overview' ? ' active' : ''}`}
          onClick={onOverviewClick}
          type="button"
        >
          <GridIcon />
          <span>Overview</span>
        </button>

        {(capabilities.rawQuery || capabilities.structuredQuery) && (
          <button
            className={`overview-btn${appMode === 'query' ? ' active' : ''}`}
            onClick={onQueryClick}
            type="button"
          >
            <QueryIcon />
            <span>Query Console</span>
          </button>
        )}

        <button
          className={`overview-btn${appMode === 'schema' ? ' active' : ''}`}
          onClick={onSchemaClick}
          type="button"
        >
          <SchemaIcon />
          <span>Schema</span>
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
