import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import EmptyState from './components/EmptyState';
import OverviewView from './components/views/OverviewView';
import TableView from './components/views/TableView';
import DocumentsView from './components/views/DocumentsView';
import JsonView from './components/views/JsonView';
import InspectorView from './components/views/InspectorView';
import QueryWorkbench from './components/views/QueryWorkbench';

export type ViewMode = 'table' | 'documents' | 'json' | 'inspector';
export type AppMode = 'overview' | 'table' | 'query';

export interface DriverCapabilities {
  rawQuery: boolean;
  structuredQuery: boolean;
}

export interface TableOverview {
  name: string;
  count: number;
}

export interface DatabaseOverview {
  dbType: string;
  totalTables: number;
  totalRecords: number;
  tables: TableOverview[];
}

const getPreferredTheme = (): 'dark' | 'light' => {
  const stored = localStorage.getItem('dbportal-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getPreferredTheme);
  const [tables, setTables] = useState<string[]>([]);
  const [dbType, setDbType] = useState('');
  const [capabilities, setCapabilities] = useState<DriverCapabilities>({
    rawQuery: false,
    structuredQuery: false,
  });
  const [appMode, setAppMode] = useState<AppMode>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentTable, setCurrentTable] = useState('');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Discovering database structure...');
  const [statusError, setStatusError] = useState(false);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Apply theme to <body>
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dbportal-theme', next);
  };

  const showStatus = (msg: string, isError = false) => {
    setStatus(msg);
    setStatusError(isError);
  };

  // Load tables list on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [tablesRes, capabilitiesRes] = await Promise.all([
          fetch('/api/tables'),
          fetch('/api/capabilities'),
        ]);

        const tablesPayload = await tablesRes.json();
        const capabilitiesPayload = await capabilitiesRes.json();

        if (!tablesRes.ok) throw new Error(tablesPayload.error || 'Failed to initialize.');
        if (!capabilitiesRes.ok) throw new Error(capabilitiesPayload.error || 'Failed to load capabilities.');

        setDbType(tablesPayload.dbType || capabilitiesPayload.dbType || 'Connected');
        setTables(tablesPayload.tables || []);
        setCapabilities(capabilitiesPayload.capabilities || { rawQuery: false, structuredQuery: false });
        setLoading(false);
        loadOverview();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        showStatus(msg, true);
        setError(msg);
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOverview = useCallback(async () => {
    setAppMode('overview');
    setCurrentTable('');
    setData([]);
    setSearch('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/overview');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load overview.');
      setOverview(payload);
      showStatus('Overview loaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTable = useCallback(async (name: string) => {
    setAppMode('table');
    setCurrentTable(name);
    setData([]);
    setSearch('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/data/${encodeURIComponent(name)}?limit=200`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load table data.');
      setData(payload.data || []);
      showStatus(`Showing ${(payload.data || []).length} records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const openQueryWorkspace = useCallback(() => {
    setAppMode('query');
    setCurrentTable('');
    setSearch('');
    setError('');
    setLoading(false);
    showStatus('Query workspace ready');
  }, []);

  const handleReload = () => {
    setReloadKey((k) => k + 1);
    if (appMode === 'overview') {
      loadOverview();
    } else if (currentTable) {
      loadTable(currentTable);
    }
  };

  const filteredData =
    appMode === 'table' && search.trim()
      ? data.filter((row) =>
          Object.values(row).some((val) => String(val).toLowerCase().includes(search.toLowerCase()))
        )
      : data;

  const renderContent = () => {
    if (loading) {
      return (
        <EmptyState>
          <div className="loading-pulse" />
          <p>{appMode === 'overview' ? 'Loading overview...' : 'Fetching records...'}</p>
        </EmptyState>
      );
    }

    if (error) {
      return (
        <EmptyState>
          <p className="error-msg">{error}</p>
        </EmptyState>
      );
    }

    if (appMode === 'overview' && overview) {
      return <OverviewView overview={overview} onTableClick={loadTable} />;
    }

    if (appMode === 'table') {
      if (viewMode === 'documents') return <DocumentsView rows={filteredData} />;
      if (viewMode === 'json') return <JsonView rows={filteredData} />;
      if (viewMode === 'inspector') return <InspectorView key={reloadKey} rows={filteredData} />;
      return <TableView rows={filteredData} />;
    }

    if (appMode === 'query') {
      return (
        <QueryWorkbench
          dbType={dbType}
          tables={tables}
          capabilities={capabilities}
          onStatus={showStatus}
        />
      );
    }

    return (
      <EmptyState>
        <p>Select a table from the sidebar to get started.</p>
      </EmptyState>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar
        tables={tables}
        activeTable={currentTable}
        appMode={appMode}
        onOverviewClick={loadOverview}
        onTableClick={loadTable}
        onQueryClick={openQueryWorkspace}
      />
      <main className="main-area">
        <Toolbar
          title={appMode === 'overview' ? 'Overview' : appMode === 'query' ? 'Query Workspace' : currentTable || 'Select a Table'}
          dbType={dbType}
          theme={theme}
          viewMode={viewMode}
          search={search}
          searchDisabled={appMode !== 'table'}
          reloadDisabled={loading || appMode === 'query'}
          viewDisabled={appMode !== 'table'}
          status={status}
          statusError={statusError}
          onThemeToggle={toggleTheme}
          onViewChange={setViewMode}
          onSearchChange={setSearch}
          onReload={handleReload}
        />
        <div className="data-container">{renderContent()}</div>
      </main>
    </div>
  );
}
