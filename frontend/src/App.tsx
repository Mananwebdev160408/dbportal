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

export interface DatabaseConnectionInfo {
  id: string;
  name: string;
  kind: string;
}

export interface MultiDatabaseOverview {
  totalDbs: number;
  totalRecords: number;
  totalTables: number;
  databases: (DatabaseOverview & { id: string; name: string })[];
}

export type Theme = 'midnight' | 'solar' | 'cobalt' | 'matrix';
export type AppearanceMode = 'light' | 'dark';

const getPreferredTheme = (): Theme => {
  const stored = localStorage.getItem('dbportal-theme') as Theme;
  if (['midnight', 'solar', 'cobalt', 'matrix'].includes(stored)) return stored;
  return 'midnight';
};

const getPreferredMode = (): AppearanceMode => {
  const stored = localStorage.getItem('dbportal-mode') as AppearanceMode;
  if (['light', 'dark'].includes(stored)) return stored;
  return 'dark';
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [mode, setMode] = useState<AppearanceMode>(getPreferredMode);
  const [connections, setConnections] = useState<DatabaseConnectionInfo[]>([]);
  const [activeDbId, setActiveDbId] = useState<string>('primary');
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
  const [overview, setOverview] = useState<MultiDatabaseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Establishing technical link...');
  const [statusError, setStatusError] = useState(false);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Apply theme & mode to <body>
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-mode', mode);
  }, [theme, mode]);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('dbportal-theme', newTheme);
  };

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem('dbportal-mode', next);
  };

  const showStatus = (msg: string, isError = false) => {
    setStatus(msg);
    setStatusError(isError);
  };

  // Load connections and initial state
  useEffect(() => {
    const init = async () => {
      try {
        const connRes = await fetch('/api/connections');
        const connPayload = await connRes.json();
        if (!connRes.ok) throw new Error(connPayload.error || 'Failed to list connections.');
        
        const list = connPayload.connections || [];
        setConnections(list);
        
        // Use primary or first available
        const initialId = list.find((c: DatabaseConnectionInfo) => c.id === 'primary')?.id || list[0]?.id || 'primary';
        setActiveDbId(initialId);
        
        await loadDatabaseMetadata(initialId);
        setLoading(false);
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

  const loadDatabaseMetadata = async (dbId: string) => {
    try {
      const [tablesRes, capabilitiesRes] = await Promise.all([
        fetch(`/api/tables?dbId=${dbId}`),
        fetch(`/api/capabilities?dbId=${dbId}`),
      ]);

      const tablesPayload = await tablesRes.json();
      const capabilitiesPayload = await capabilitiesRes.json();

      if (!tablesRes.ok) throw new Error(tablesPayload.error || 'Failed to load tables.');
      setTables(tablesPayload.tables || []);
      setDbType(tablesPayload.dbType || 'Connected');
      setCapabilities(capabilitiesPayload.capabilities || { rawQuery: false, structuredQuery: false });
    } catch (err: unknown) {
      throw err;
    }
  };

  const loadOverview = useCallback(async () => {
    setAppMode('overview');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/overview');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load multi-overview.');
      setOverview(payload);
      showStatus('All systems active');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchDatabase = async (dbId: string) => {
    setActiveDbId(dbId);
    setLoading(true);
    try {
      await loadDatabaseMetadata(dbId);
      setAppMode('overview'); // Or keep current? Usually switch DB implies seeing what's in it
      showStatus(`Switched to ${dbId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadTable = useCallback(async (
    name: string, 
    targetDbId?: string,
    sField?: string,
    sOrder?: 'asc' | 'desc',
    currentFilters?: Record<string, string>
  ) => {
    const dbToUse = targetDbId || activeDbId;
    if (targetDbId && targetDbId !== activeDbId) {
      setActiveDbId(targetDbId);
      await loadDatabaseMetadata(targetDbId);
    }
    
    setAppMode('table');
    setCurrentTable(name);
    setData([]);
    setLoading(true);
    setError('');

    try {
      let url = `/api/data/${encodeURIComponent(name)}?dbId=${dbToUse}&limit=200`;
      if (sField) {
        url += `&sortBy=${encodeURIComponent(sField)}&sortOrder=${sOrder || 'asc'}`;
      }
      if (currentFilters && Object.keys(currentFilters).length > 0) {
        url += `&filters=${encodeURIComponent(JSON.stringify(currentFilters))}`;
      }

      const res = await fetch(url);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load table data.');
      setData(payload.data || []);
      showStatus(`Packet stream optimized: ${(payload.data || []).length} records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeDbId]);

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
      const activeDbData = overview.databases.find(db => db.id === activeDbId) || overview.databases[0];
      return <OverviewView 
        overview={activeDbData ? { ...overview, databases: [activeDbData] } : overview} 
        onTableClick={loadTable} 
      />;
    }

    if (appMode === 'table') {
      if (viewMode === 'documents') return <DocumentsView rows={filteredData} />;
      if (viewMode === 'json') return <JsonView rows={filteredData} />;
      if (viewMode === 'inspector') return <InspectorView key={reloadKey} rows={filteredData} />;
      return (
        <TableView 
          rows={data} 
          sortBy={sortBy}
          sortOrder={sortOrder}
          filters={filters}
          dbId={activeDbId}
          dbType={dbType}
          tableName={currentTable}
          onSort={(field) => {
            const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
            setSortBy(field);
            setSortOrder(nextOrder);
            loadTable(currentTable, activeDbId, field, nextOrder, filters);
          }}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            loadTable(currentTable, activeDbId, sortBy, sortOrder, newFilters);
          }}
        />
      );
    }

    if (appMode === 'query') {
      return (
        <QueryWorkbench
          dbId={activeDbId}
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
        connections={connections}
        activeDbId={activeDbId}
        tables={tables}
        activeTable={currentTable}
        appMode={appMode}
        onOverviewClick={loadOverview}
        onTableClick={loadTable}
        onQueryClick={openQueryWorkspace}
        onDbChange={switchDatabase}
      />
      <main className="main-area">
        <Toolbar
          title={appMode === 'overview' ? 'Overview' : appMode === 'query' ? 'Query Workspace' : currentTable || 'Select a Table'}
          dbType={appMode === 'overview' && (overview?.databases?.length ?? 0) > 1 ? 'MULTI-LINK' : dbType}
          theme={theme}
          mode={mode}
          viewMode={viewMode}
          search={search}
          searchDisabled={appMode !== 'table'}
          reloadDisabled={loading || appMode === 'query'}
          viewDisabled={appMode !== 'table'}
          status={status}
          statusError={statusError}
          onThemeChange={toggleTheme}
          onModeToggle={toggleMode}
          onViewChange={setViewMode}
          onSearchChange={setSearch}
          onReload={handleReload}
        />
        <div className="data-container">{renderContent()}</div>
      </main>
    </div>
  );
}
