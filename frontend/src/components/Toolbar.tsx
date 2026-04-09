import type { ViewMode, Theme, AppearanceMode } from '../App';
import { useState, useRef, useEffect } from 'react';
interface ToolbarProps {
  title: string;
  dbType: string;
  theme: Theme;
  mode: AppearanceMode;
  viewMode: ViewMode;
  search: string;
  searchDisabled: boolean;
  reloadDisabled: boolean;
  viewDisabled: boolean;
  status: string;
  statusError: boolean;
  onThemeChange: (t: Theme) => void;
  onModeToggle: () => void;
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

const PaletteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1l-.1-.1C12.7 18.8 12.5 18.4 12.5 18c0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8.4-10-8.4z"/>
  </svg>
);

const ChevronIcon = () => (
  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 6.3-1.4 1.4"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
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

const ThemeLabels: Record<Theme, string> = {
  midnight: 'Midnight Obsidian',
  solar: 'Solar Flare',
  cobalt: 'Cobalt Sea',
  matrix: 'Matrix Green',
};

const ThemeColors: Record<Theme, string> = {
  midnight: '#00f2ff',
  solar: '#ff9f0a',
  cobalt: '#0a84ff',
  matrix: '#32d74b',
};

export default function Toolbar({
  title, dbType, theme, mode, viewMode, search, searchDisabled,
  reloadDisabled, viewDisabled, status, statusError,
  onThemeChange, onModeToggle, onViewChange, onSearchChange, onReload,
}: ToolbarProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsViewOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewSelect = (v: ViewMode) => {
    onViewChange(v);
    setIsViewOpen(false);
  };

  const handleThemeSelect = (t: Theme) => {
    onThemeChange(t);
    setIsThemeOpen(false);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-title-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="toolbar-title">{title}</h2>
            {dbType && (
              <span className={`badge${dbType ? ' accent' : ''}`}>{dbType}</span>
            )}
          </div>
          <span className={`status-text${statusError ? ' error' : ''}`}>{status}</span>
        </div>
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

        <div className={`dropdown-container${isViewOpen ? ' open' : ''}`} ref={dropdownRef}>
          <button
            className="icon-btn dropdown-trigger"
            onClick={() => setIsViewOpen(!isViewOpen)}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isViewOpen}
            disabled={viewDisabled}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ViewIcons[viewMode]}</div>
              <span>{ViewLabels[viewMode]}</span>
            </div>
            <ChevronIcon />
          </button>

          {isViewOpen && (
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

        <div className={`dropdown-container${isThemeOpen ? ' open' : ''}`} ref={themeRef}>
          <button
            className="icon-btn dropdown-trigger"
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isThemeOpen}
            style={{ minWidth: 160 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ThemeColors[theme] }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{ThemeLabels[theme].toUpperCase()}</span>
            </div>
            <ChevronIcon />
          </button>

          {isThemeOpen && (
            <div className="dropdown-menu" role="listbox">
              {(Object.keys(ThemeLabels) as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`dropdown-item${theme === t ? ' active' : ''}`}
                  onClick={() => handleThemeSelect(t)}
                  type="button"
                  role="option"
                  aria-selected={theme === t}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ThemeColors[t], marginRight: 4 }} />
                  <span>{ThemeLabels[t]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="icon-btn"
          onClick={onModeToggle}
          type="button"
          aria-label="Toggle light/dark mode"
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
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
