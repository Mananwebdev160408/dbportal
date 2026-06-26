import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import EmptyState from "./components/EmptyState";
import SkeletonTableLoader from "./components/SkeletonTableLoader";
import DockerSidebar, { DockerContainerInfo } from "./components/DockerSidebar";
import { AlertTriangleIcon } from "./components/Icons";
import ConnectionStringBuilderModal from "./components/ConnectionStringBuilderModal";
const OverviewView = lazy(() => import("./components/views/OverviewView"));
const CommonDashboardView = lazy(
  () => import("./components/views/CommonDashboardView"),
);
const TableView = lazy(() => import("./components/views/TableView"));
const DocumentsView = lazy(() => import("./components/views/DocumentsView"));
const JsonView = lazy(() => import("./components/views/JsonView"));
const InspectorView = lazy(() => import("./components/views/InspectorView"));
const QueryWorkbench = lazy(() => import("./components/views/QueryWorkbench"));
const SchemaView = lazy(() => import("./components/views/SchemaView"));

const DockerDashboardView = lazy(
  () => import("./components/views/DockerDashboardView"),
);
const DockerRunnerView = lazy(
  () => import("./components/views/DockerRunnerView"),
);
const DockerImagesView = lazy(
  () => import("./components/views/DockerImagesView"),
);
const DockerVolumesView = lazy(
  () => import("./components/views/DockerVolumesView"),
);

export type ViewMode = "table" | "documents" | "json" | "inspector";
export type AppMode =
  | "common"
  | "overview"
  | "table"
  | "query"
  | "schema"
  | "docker";

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
  isAlive?: boolean;
}

export interface MultiDatabaseOverview {
  totalDbs: number;
  totalRecords: number;
  totalTables: number;
  databases: (DatabaseOverview & { id: string; name: string })[];
}

export type Theme = "midnight" | "solar" | "cobalt" | "matrix";
export type AppearanceMode = "light" | "dark";

const getPreferredTheme = (): Theme => {
  const stored = localStorage.getItem("dbportal-theme") as Theme;
  if (["midnight", "solar", "cobalt", "matrix"].includes(stored)) return stored;
  return "midnight";
};

const getPreferredMode = (): AppearanceMode => {
  const stored = localStorage.getItem("dbportal-mode") as AppearanceMode;
  if (["light", "dark"].includes(stored)) return stored;
  return "dark";
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [mode, setMode] = useState<AppearanceMode>(getPreferredMode);
  const [connections, setConnections] = useState<DatabaseConnectionInfo[]>([]);
  const [activeDbId, setActiveDbId] = useState<string>("primary");
  const [pinnedTables, setPinnedTables] = useState<string[]>(() => {
    const stored = localStorage.getItem("dbportal-pinned-tables");
    return stored ? JSON.parse(stored) : [];
  });
  const [tables, setTables] = useState<string[]>([]);
  const [dbType, setDbType] = useState("");
  const [capabilities, setCapabilities] = useState<DriverCapabilities>({
    rawQuery: false,
    structuredQuery: false,
  });
  const [appMode, setAppMode] = useState<AppMode>("common");
  const [isDockerMode, setIsDockerMode] = useState(false);
  const [containers, setContainersList] = useState<DockerContainerInfo[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [dockerRefreshKey, setDockerRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentTable, setCurrentTable] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [overview, setOverview] = useState<MultiDatabaseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [statusError, setStatusError] = useState(false);
  const [search, setSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);

  useEffect(() => {
    const runGlobalSearch = async () => {
      if (!search.trim()) {
        setGlobalResults([]);
        return;
      }

      try {
        setGlobalSearchLoading(true);

        const res = await fetch(
          `/api/global-search?query=${encodeURIComponent(search)}`,
        );

        const text = await res.text();
        const payload = text ? JSON.parse(text) : {};

        if (res.ok) {
          setGlobalResults(payload.results || []);
        }
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setGlobalSearchLoading(false);
      }
    };

    runGlobalSearch();
  }, [search]);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [schemaReloadKey, setSchemaReloadKey] = useState(0);
  const [maskSensitive, setMaskSensitive] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(200);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [writeMode, setWriteMode] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showConnectionStringBuilder, setShowConnectionStringBuilder] =
    useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem("dbportal-sidebar-width");
    return stored ? parseInt(stored, 10) : 240;
  });

  const handleSidebarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(180, Math.min(480, startWidth + delta));
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth],
  );

  useEffect(() => {
    localStorage.setItem("dbportal-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  // Apply theme & mode to <body>
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    document.body.setAttribute("data-mode", mode);
  }, [theme, mode]);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("dbportal-theme", newTheme);
  };

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("dbportal-mode", next);
  };

  const handleTogglePin = useCallback(
    (tableName: string) => {
      const key = `${activeDbId}:${tableName}`;
      setPinnedTables((prev) => {
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        localStorage.setItem("dbportal-pinned-tables", JSON.stringify(next));
        return next;
      });
    },
    [activeDbId],
  );

  const showStatus = useCallback((msg: string, isError = false) => {
    setStatus(msg);
    setStatusError(isError);
  }, []);

  const refreshContainers = useCallback(async () => {
    try {
      const res = await fetch("/api/docker/containers");
      const data = await res.json();
      if (res.ok) {
        setContainersList(data.containers || []);
        showStatus("Container list refreshed");
      } else {
        showStatus(data.error || "Failed to refresh containers", true);
      }
    } catch (err: unknown) {
      showStatus(
        (err as Error).message || "Failed to refresh containers",
        true,
      );
    }
  }, [showStatus]);

  // Load connections and initial state
  useEffect(() => {
    const init = async () => {
      try {
        const configRes = await fetch("/api/config");
        const configPayload = await configRes.json();
        if (configPayload.writeMode) {
          setWriteMode(true);
        }
        if (configPayload.mode === "docker") {
          setIsDockerMode(true);
          setAppMode("docker");

          const containersRes = await fetch("/api/docker/containers");
          const containersPayload = await containersRes.json();
          if (containersRes.ok) {
            const list = containersPayload.containers || [];
            setContainersList(list);
            if (list.length > 0) {
              setSelectedContainerId(list[0].id);
            }
          }
          setLoading(false);
          showStatus("Docker engine connected");
          return;
        }

        const connRes = await fetch("/api/connections");
        const connPayload = await connRes.json();
        if (!connRes.ok)
          throw new Error(connPayload.error || "Failed to list connections.");

        const list = connPayload.connections || [];

        // Check health for each connection
        const withHealth = await Promise.all(
          list.map(async (conn: DatabaseConnectionInfo) => {
            try {
              const res = await fetch(`/api/health?dbId=${conn.id}`);
              return { ...conn, isAlive: res.ok };
            } catch {
              return { ...conn, isAlive: false };
            }
          }),
        );
        setConnections(withHealth);

        // Use primary or first available
        const initialId =
          list.find((c: DatabaseConnectionInfo) => c.id === "primary")?.id ||
          list[0]?.id ||
          "primary";
        setActiveDbId(initialId);

        await loadDatabaseMetadata(initialId);

        // Fetch the dashboard overview immediately on load
        const overviewRes = await fetch("/api/overview");
        const overviewPayload = await overviewRes.json();
        if (overviewRes.ok) {
          setOverview(overviewPayload);
          showStatus("Fleet dashboard ready");
        }

        setLoading(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
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

      if (!tablesRes.ok)
        throw new Error(tablesPayload.error || "Failed to load tables.");
      setTables(tablesPayload.tables || []);
      setDbType(tablesPayload.dbType || "Connected");
      setCapabilities(
        capabilitiesPayload.capabilities || {
          rawQuery: false,
          structuredQuery: false,
        },
      );
    } catch (err: unknown) {
      throw err;
    }
  };
  const checkConnectionHealth = useCallback(async () => {
    const updated = await Promise.all(
      connections.map(async (conn) => {
        try {
          const res = await fetch(`/api/health?dbId=${conn.id}`);
          return { ...conn, isAlive: res.ok };
        } catch {
          return { ...conn, isAlive: false };
        }
      }),
    );
    setConnections(updated);
  }, [connections]);

  // Poll health every 30 s so sidebar dots stay accurate after initial load.
  // The effect re-runs whenever `connections` changes (i.e. after the first
  // health check populates the list), so the interval always closes over the
  // latest snapshot — no stale-closure issues.
  useEffect(() => {
    if (isDockerMode || connections.length === 0) return;

    const intervalId = setInterval(async () => {
      const updated = await Promise.all(
        connections.map(async (conn) => {
          try {
            const res = await fetch(`/api/health?dbId=${conn.id}`);
            return { ...conn, isAlive: res.ok };
          } catch {
            return { ...conn, isAlive: false };
          }
        }),
      );
      setConnections(updated);
    }, 30_000);

    return () => clearInterval(intervalId);
  }, [connections, isDockerMode]);

  const loadOverview = useCallback(async () => {
    setAppMode("overview");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/overview");
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload.error || "Failed to load multi-overview.");
      setOverview(payload);
      showStatus("Connected");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommonDashboard = useCallback(async () => {
    setAppMode("common");
    setCurrentTable("");
    setSearch("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/overview");
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload.error || "Failed to load common dashboard.");
      setOverview(payload);
      showStatus("Fleet dashboard ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
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
      // Preserve query/schema mode; only reset to overview when leaving a specific table
      setAppMode((prev) => (prev === "table" ? "overview" : prev));
      showStatus(`Switched to ${dbId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showStatus(msg, true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openDatabaseOverview = useCallback(
    async (dbId: string) => {
      await switchDatabase(dbId);
      setAppMode("overview");
      setCurrentTable("");
      setSearch("");
      setError("");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const loadTable = useCallback(
    async (
      name: string,
      targetDbId?: string,
      sField?: string,
      sOrder?: "asc" | "desc",
      currentFilters?: Record<string, string>,
      targetPage = 0,
      mode: "replace" | "append" = "replace",
      targetPageSize = pageSize,
    ) => {
      const dbToUse = targetDbId || activeDbId;
      const shouldAppend = mode === "append";

      if (targetDbId && targetDbId !== activeDbId) {
        setActiveDbId(targetDbId);
        await loadDatabaseMetadata(targetDbId);
      }

      setAppMode("table");
      setCurrentTable(name);
      setError("");

      if (shouldAppend) {
        setLoadingMore(true);
      } else {
        setData([]);
        setLoading(true);
      }

      try {
        const offset = targetPage * targetPageSize;
        let url = `/api/data/${encodeURIComponent(
          name,
        )}?dbId=${dbToUse}&limit=${targetPageSize}&offset=${offset}`;

        if (sField) {
          url += `&sortBy=${encodeURIComponent(sField)}&sortOrder=${
            sOrder || "asc"
          }`;
        }

        if (currentFilters && Object.keys(currentFilters).length > 0) {
          url += `&filters=${encodeURIComponent(JSON.stringify(currentFilters))}`;
        }

        const res = await fetch(url);
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error || "Failed to load table data.");
        }

        const rows: Record<string, unknown>[] = payload.data || [];
        const loadedCount = shouldAppend
          ? data.length + rows.length
          : rows.length;

        setData((prev) => (shouldAppend ? [...prev, ...rows] : rows));
        setPage(targetPage);
        setHasNextPage(rows.length === targetPageSize);

        showStatus(
          rows.length > 0
            ? `Loaded ${loadedCount} rows${
                rows.length === targetPageSize ? " - scroll for more" : ""
              }`
            : shouldAppend
              ? "No more records found"
              : "No records found",
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        showStatus(msg, true);
        setError(msg);
      } finally {
        if (shouldAppend) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [activeDbId, data.length, pageSize, showStatus],
  );

  const openQueryWorkspace = useCallback(
    async (targetDbId?: string) => {
      const resolvedDbId =
        typeof targetDbId === "string" ? targetDbId : undefined;
      if (resolvedDbId && resolvedDbId !== activeDbId) {
        setActiveDbId(resolvedDbId);
        setLoading(true);
        try {
          await loadDatabaseMetadata(resolvedDbId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          showStatus(msg, true);
          setError(msg);
          setLoading(false);
          return;
        }
      }
      setAppMode("query");
      setCurrentTable("");
      setSearch("");
      setError("");
      setLoading(false);
      showStatus("Query workspace ready");
    },
    [activeDbId],
  );

  const openSchemaVisualizer = useCallback(
    async (targetDbId?: string) => {
      const resolvedDbId =
        typeof targetDbId === "string" ? targetDbId : undefined;
      if (resolvedDbId && resolvedDbId !== activeDbId) {
        setActiveDbId(resolvedDbId);
        setLoading(true);
        try {
          await loadDatabaseMetadata(resolvedDbId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          showStatus(msg, true);
          setError(msg);
          setLoading(false);
          return;
        }
      }
      setAppMode("schema");
      setCurrentTable("");
      setSearch("");
      setError("");
      setLoading(false);
      showStatus("Schema visualizer ready");
    },
    [activeDbId],
  );

  const handleReload = () => {
    setReloadKey((k) => k + 1);
    if (isDockerMode) {
      setDockerRefreshKey((k) => k + 1);
      fetch("/api/docker/containers")
        .then((res) => res.json())
        .then((data) => {
          setContainersList(data.containers || []);
        });
      showStatus("Refreshed containers list");
      return;
    }
    if (appMode === "common") {
      loadCommonDashboard();
    } else if (appMode === "overview") {
      loadOverview();
    } else if (currentTable) {
      setData([]);
      setPage(0);
      loadTable(
        currentTable,
        activeDbId,
        sortBy,
        sortOrder,
        filters,
        0,
        "replace",
      );
    } else if (appMode === "schema") {
      setSchemaReloadKey((k) => k + 1);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPageSize(newLimit);
    setPage(0);
    setData([]);

    if (appMode === "table" && currentTable) {
      loadTable(
        currentTable,
        activeDbId,
        sortBy,
        sortOrder,
        filters,
        0,
        "replace",
        newLimit,
      );
    }
  };

  const loadMoreRows = useCallback(() => {
    if (
      loading ||
      loadingMore ||
      !hasNextPage ||
      !currentTable ||
      appMode !== "table"
    ) {
      return;
    }

    loadTable(
      currentTable,
      activeDbId,
      sortBy,
      sortOrder,
      filters,
      page + 1,
      "append",
      pageSize,
    );
  }, [
    activeDbId,
    appMode,
    currentTable,
    filters,
    hasNextPage,
    loadTable,
    loading,
    loadingMore,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  const filteredData =
    appMode === "table" && search.trim()
      ? data.filter((row) =>
          Object.values(row).some((val) =>
            String(val).toLowerCase().includes(search.toLowerCase()),
          ),
        )
      : data;

  const renderContent = () => {
    if (loading) {
      if (appMode === "table") {
        return <SkeletonTableLoader rows={8} columns={5} />;
      }
      return (
        <EmptyState>
          <div className="loading-pulse" />
          <p>
            {appMode === "common"
              ? "Loading common dashboard..."
              : appMode === "overview"
                ? "Loading overview..."
                : "Fetching records..."}
          </p>
        </EmptyState>
      );
    }

    if (error) {
      return (
        <EmptyState onRetry={handleReload}>
          <AlertTriangleIcon
            size={40}
            style={{ color: "var(--warning)", marginBottom: "8px" }}
          />
          <p className="error-msg">Failed to connect to the backend.</p>
          <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>{error}</p>
          <button
            className="reload-btn"
            style={{ marginTop: "16px" }}
            onClick={() => setShowConnectionStringBuilder(true)}
            type="button"
          >
            Open Connection Builder
          </button>
        </EmptyState>
      );
    }

    if (appMode === "common" && overview) {
      return (
        <CommonDashboardView
          overview={overview}
          activeDbId={activeDbId}
          onDatabaseOverview={openDatabaseOverview}
          onQueryClick={openQueryWorkspace}
          onSchemaClick={openSchemaVisualizer}
          onTableClick={loadTable}
          onOpenConnectionBuilder={() => setShowConnectionStringBuilder(true)}
        />
      );
    }

    if (appMode === "overview" && overview) {
      const activeDbData =
        overview.databases.find((db) => db.id === activeDbId) ||
        overview.databases[0];
      return (
        <OverviewView
          overview={
            activeDbData ? { ...overview, databases: [activeDbData] } : overview
          }
          onTableClick={loadTable}
        />
      );
    }

    if (appMode === "table") {
      if (viewMode === "documents")
        return (
          <DocumentsView rows={filteredData} maskSensitive={maskSensitive} />
        );
      if (viewMode === "json")
        return <JsonView rows={filteredData} maskSensitive={maskSensitive} />;
      if (viewMode === "inspector")
        return (
          <InspectorView
            key={reloadKey}
            rows={filteredData}
            maskSensitive={maskSensitive}
          />
        );
      return (
        <TableView
          tableName={currentTable}
          rows={data}
          maskSensitive={maskSensitive}
          sortBy={sortBy}
          sortOrder={sortOrder}
          filters={filters}
          hasNextPage={hasNextPage}
          isLoadingMore={loadingMore}
          onLoadMore={loadMoreRows}
          onSort={(field) => {
            const nextOrder =
              sortBy === field && sortOrder === "asc" ? "desc" : "asc";

            setSortBy(field);
            setSortOrder(nextOrder);
            setPage(0);
            setData([]);

            loadTable(
              currentTable,
              activeDbId,
              field,
              nextOrder,
              filters,
              0,
              "replace",
            );
          }}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(0);
            setData([]);

            loadTable(
              currentTable,
              activeDbId,
              sortBy,
              sortOrder,
              newFilters,
              0,
              "replace",
            );
          }}
        />
      );
    }

    if (appMode === "query") {
      return (
        <QueryWorkbench
          dbId={activeDbId}
          dbType={dbType}
          tables={tables}
          capabilities={capabilities}
          onStatus={showStatus}
          maskSensitive={maskSensitive}
        />
      );
    }

    if (appMode === "schema") {
      return (
        <SchemaView
          dbId={activeDbId}
          dbType={dbType}
          refreshKey={schemaReloadKey}
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

  if (isDockerMode) {
    return (
      <div
        className="app-layout"
        style={{ gridTemplateColumns: `${sidebarWidth}px 4px 1fr` }}
      >
        <DockerSidebar
          containers={containers}
          selectedContainerId={selectedContainerId}
          onStatusChange={showStatus}
          onRefreshContainers={refreshContainers}
          onSelectContainer={(id) => {
            setSelectedContainerId(id);
            if (id === "__runner__") {
              showStatus("Docker container wizard active");
            } else {
              showStatus("Loaded container details");
            }
          }}
        />
        <div className="sidebar-resizer" onMouseDown={handleSidebarMouseDown} />
        <main className="main-area">
          <Toolbar
            title={
              selectedContainerId === "__runner__"
                ? "Launch Containers"
                : selectedContainerId === "__images__"
                  ? "Local Docker Images"
                  : selectedContainerId === "__volumes__"
                    ? "Local Docker Volumes"
                    : containers.find((c) => c.id === selectedContainerId)
                        ?.name || "Docker Container"
            }
            dbType="Docker"
            theme={theme}
            mode={mode}
            viewMode={viewMode}
            search=""
            searchDisabled={false}
            reloadDisabled={loading}
            viewDisabled={true}
            status={status}
            statusError={statusError}
            onThemeChange={toggleTheme}
            onModeToggle={toggleMode}
            onViewChange={setViewMode}
            onSearchChange={setSearch}
            onReload={handleReload}
            maskSensitive={maskSensitive}
            onMaskToggle={() => setMaskSensitive((v) => !v)}
            rowLimit={pageSize}
            onLimitChange={handleLimitChange}
            isDocker={true}
          />
          <div className="data-container">
            <Suspense
              fallback={
                <EmptyState>
                  <div className="loading-pulse" />
                  <p>Loading Docker view...</p>
                </EmptyState>
              }
            >
              {loading ? (
                <EmptyState>
                  <div className="loading-pulse" />
                  <p>Connecting to Docker...</p>
                </EmptyState>
              ) : selectedContainerId === "__runner__" ? (
                <DockerRunnerView
                  onRefreshSidebar={() => {
                    fetch("/api/docker/containers")
                      .then((res) => res.json())
                      .then((data) => {
                        setContainersList(data.containers || []);
                      });
                  }}
                  onStatusChange={showStatus}
                />
              ) : selectedContainerId === "__images__" ? (
                <DockerImagesView onStatusChange={showStatus} />
              ) : selectedContainerId === "__volumes__" ? (
                <DockerVolumesView onStatusChange={showStatus} />
              ) : (
                <DockerDashboardView
                  key={dockerRefreshKey}
                  containerId={selectedContainerId}
                  containers={containers}
                  onStatusChange={showStatus}
                  onRefresh={() => {
                    fetch("/api/docker/containers")
                      .then((res) => res.json())
                      .then((data) => {
                        setContainersList(data.containers || []);
                      });
                  }}
                  onDeleted={() => {
                    fetch("/api/docker/containers")
                      .then((res) => res.json())
                      .then((data) => {
                        const list = data.containers || [];
                        setContainersList(list);
                        if (list.length > 0) {
                          setSelectedContainerId(list[0].id);
                        } else {
                          setSelectedContainerId("");
                        }
                      });
                  }}
                />
              )}
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  const activeDbData = overview?.databases?.find((db) => db.id === activeDbId);
  const tableCounts: Record<string, number> = {};
  if (activeDbData?.tables) {
    for (const t of activeDbData.tables) {
      tableCounts[t.name] = t.count;
    }
  }

  return (
    <div
      className="app-layout"
      style={{ gridTemplateColumns: `${sidebarWidth}px 4px 1fr` }}
    >
      <Sidebar
        connections={connections}
        activeDbId={activeDbId}
        tables={tables}
        tableCounts={tableCounts}
        activeTable={currentTable}
        appMode={appMode}
        capabilities={capabilities}
        onCommonDashboardClick={loadCommonDashboard}
        onOverviewClick={loadOverview}
        onTableClick={loadTable}
        onQueryClick={openQueryWorkspace}
        onSchemaClick={openSchemaVisualizer}
        onDbChange={switchDatabase}
        pinnedTables={pinnedTables}
        onTogglePin={handleTogglePin}
        onOpenConnectionBuilder={() => setShowConnectionStringBuilder(true)}
      />
      <div className="sidebar-resizer" onMouseDown={handleSidebarMouseDown} />
      <main className="main-area">
        {writeMode && (
          <div
            style={{
              background: "#7c2d12",
              color: "#fef3c7",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid #b45309",
            }}
          >
            <AlertTriangleIcon size={15} style={{ color: "#fbbf24" }} />
            ⚠️ Write mode enabled — INSERT, UPDATE, and DELETE operations are
            allowed. Use with caution.
          </div>
        )}
        <Toolbar
          title={
            appMode === "common"
              ? "Common Dashboard"
              : appMode === "overview"
                ? "Overview"
                : appMode === "query"
                  ? "Query Console"
                  : appMode === "schema"
                    ? "Schema"
                    : currentTable || "Select a Table"
          }
          dbType={
            appMode === "common"
              ? "Fleet"
              : appMode === "overview" && (overview?.databases?.length ?? 0) > 1
                ? "Overview"
                : dbType
          }
          theme={theme}
          mode={mode}
          viewMode={viewMode}
          search={search}
          searchDisabled={false}
          reloadDisabled={loading || appMode === "query"}
          viewDisabled={appMode !== "table"}
          status={status}
          statusError={statusError}
          onThemeChange={toggleTheme}
          onModeToggle={toggleMode}
          onViewChange={setViewMode}
          onSearchChange={setSearch}
          onReload={handleReload}
          maskSensitive={maskSensitive}
          onMaskToggle={() => setMaskSensitive((v) => !v)}
          rowLimit={pageSize}
          onLimitChange={handleLimitChange}
        />
        <div className="data-container">
          {search.trim() && (
            <div
              style={{
                padding: "12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h3>Global Search Results</h3>

              {globalSearchLoading ? (
                <p>Searching...</p>
              ) : globalResults.length === 0 ? (
                <p>No matches found.</p>
              ) : (
                globalResults.map((result) => (
                  <div
                    key={result.table}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadTable(result.table)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadTable(result.table);
                      }
                    }}
                    aria-label={`Open table ${result.table} — ${result.count} matches`}
                    style={{
                      marginBottom: "12px",
                      padding: "8px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{result.table}</strong>
                    <p>{result.count} matches</p>

                    {result.rows?.map((row: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px",
                          marginTop: "6px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          background: "rgba(255,255,255,0.02)",
                          fontSize: "12px",
                        }}
                      >
                        {Object.entries(row).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          <Suspense
            fallback={
              <EmptyState>
                <div className="loading-pulse" />
                <p>Loading view...</p>
              </EmptyState>
            }
          >
            {renderContent()}
          </Suspense>
        </div>
      </main>
      {showConnectionStringBuilder && (
        <ConnectionStringBuilderModal
          onClose={() => setShowConnectionStringBuilder(false)}
        />
      )}
    </div>
  );
}
