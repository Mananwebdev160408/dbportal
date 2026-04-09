import type { AppMode } from '../App';

interface SidebarProps {
  tables: string[];
  activeTable: string;
  appMode: AppMode;
  onOverviewClick: () => void;
  onQueryClick: () => void;
  onTableClick: (name: string) => void;
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

export default function Sidebar({ tables, activeTable, appMode, onOverviewClick, onQueryClick, onTableClick }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <DbIcon />
        </div>
        <h1 className="brand">dbportal</h1>
      </div>

      <div className="sidebar-scroll">
        <button
          className={`overview-btn${appMode === 'overview' ? ' active' : ''}`}
          onClick={onOverviewClick}
          type="button"
        >
          <GridIcon />
          <span>Overview</span>
        </button>

        <button
          className={`overview-btn${appMode === 'query' ? ' active' : ''}`}
          onClick={onQueryClick}
          type="button"
        >
          <QueryIcon />
          <span>Query</span>
        </button>

        {tables.length > 0 && (
          <div className="table-nav-group">
            <div className="section-label">Tables &amp; Collections</div>
            <div className="table-list">
              {tables.map((name) => (
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
        )}
      </div>
    </aside>
  );
}
