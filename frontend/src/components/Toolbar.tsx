import { useState, useRef, useEffect } from 'react';
import type { ViewMode } from '../App';

interface ToolbarProps {
  title: string;
  dbType: string;
  theme: 'dark' | 'light';
  viewMode: ViewMode;
  search: string;
  searchDisabled: boolean;
  reloadDisabled: boolean;
  viewDisabled: boolean;
  status: string;
  statusError: boolean;
  onThemeToggle: () => void;
  onViewChange: (v: ViewMode) => void;
  onSearchChange: (v: string) => void;
  onReload: () => void;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const ReloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ViewIcons: Record<ViewMode, JSX.Element> = {
  table: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  json: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
  inspector: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const ViewLabels: Record<ViewMode, string> = {
  table: 'Table View',
  documents: 'Cards View',
  json: 'JSON View',
  inspector: 'Inspector View',
};

export default function Toolbar({
  title, dbType, theme, viewMode, search, searchDisabled,
  reloadDisabled, viewDisabled, status, statusError,
  onThemeToggle, onViewChange, onSearchChange, onReload,
}: ToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewSelect = (v: ViewMode) => {
    onViewChange(v);
    setIsDropdownOpen(false);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-title-group">
        <h2 className="toolbar-title">{title}</h2>
        {dbType && (
          <span className={`badge${dbType ? ' accent' : ''}`}>{dbType}</span>
        )}
        <span className={`status-text${statusError ? ' error' : ''}`}>{status}</span>
      </div>

      <div className="toolbar-controls">
        <div className="search-box">
          <SearchIcon />
          <input
            type="text"
            id="search-input"
            placeholder="Search records..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={searchDisabled}
            aria-label="Filter rows"
          />
        </div>

        <div className={`dropdown-container${isDropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
          <button
            className="icon-btn dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            disabled={viewDisabled}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ViewIcons[viewMode]}</div>
              <span>{ViewLabels[viewMode]}</span>
            </div>
            <ChevronIcon />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu" role="listbox">
              {(Object.keys(ViewLabels) as ViewMode[]).map((v) => (
                <button
                  key={v}
                  className={`dropdown-item${viewMode === v ? ' active' : ''}`}
                  onClick={() => handleViewSelect(v)}
                  type="button"
                  role="option"
                  aria-selected={viewMode === v}
                >
                  {ViewIcons[v]}
                  <span>{ViewLabels[v]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={onThemeToggle} type="button" aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          className="reload-btn"
          onClick={onReload}
          disabled={reloadDisabled}
          type="button"
          aria-label="Reload data"
        >
          <ReloadIcon />
          <span>Reload</span>
        </button>
      </div>
    </header>
  );
}
