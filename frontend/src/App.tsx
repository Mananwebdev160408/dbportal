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

export type ConnectionHealthStatus =
  | "healthy"
  | "degraded"
  | "slow"
  | "unreachable"
  | "unknown";

export interface ConnectionHealth {
  status: ConnectionHealthStatus;
  latencyMs: number | null;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface DatabaseConnectionInfo {
  id: string;
  name: string;
  kind: string;
  isAlive?: boolean;
  health?: ConnectionHealth;
}

export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
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

const withConnectionHealth = async (
  conn: DatabaseConnectionInfo,
): Promise<DatabaseConnectionInfo> => {
  try {
    const res = await fetch(`/api/health?dbId=${conn.id}`);
    const health: ConnectionHealth = await res.json();
    return { ...conn, isAlive: health.status !== "unreachable", health };
  } catch {
    return {
      ...conn,
      isAlive: false,
      health: {
        status: "unreachable",
        latencyMs: null,
        lastCheckedAt: null,
        error: "Unable to reach the server.",
      },
    };
  }
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [mode, setMode] = useState<AppearanceMode>(getPreferredMode);
  const [connections, setConnections] = useState<DatabaseConnectionInfo[]>([]);
  const [healthCheckConfig, setHealthCheckConfig] = useState<HealthCheckConfig>(
    { enabled: true, intervalMs: 60_000 },
  );
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
    if (!search.trim()) {
      setGlobalResults([]);
      setGlobalSearchLoading(false);
      return;
    }

    setGlobalSearchLoading(true);

    const timerId = setTimeout(async () => {
      try {
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
    }, 300);

    return () => clearTimeout(timerId);
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
    const parsed = stored ? parseInt(stored, 10) : 240;
    return isNaN(parsed) ? 240 : Math.max(180, Math.min(480, parsed));
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
        if (configPayload.healthCheck) {
          setHealthCheckConfig({
            enabled: Boolean(configPayload.healthCheck.enabled),
            intervalMs: configPayload.healthCheck.intervalMs ?? 60_000,
          });
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
          (list ?? []).map((conn: DatabaseConnectionInfo) =>
            withConnectionHealth(conn),
          ),
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
      connections.map((conn) => withConnectionHealth(conn)),
    );
    setConnections(updated);
  }, [connections]);

  // Poll health on the server-configured interval (default 60s, see
  // /api/config) so sidebar status dots stay accurate after initial load.
  // The effect re-runs whenever `connections` changes (i.e. after the first
  // health check populates the list), so the interval always closes over the
  // latest snapshot — no stale-closure issues. Disabled entirely when the
  // backend reports health checking as off, per the "can be disabled
  // globally" requirement.
  useEffect(() => {
    if (isDockerMode || connections.length === 0 || !healthCheckConfig.enabled)
      return;

    const intervalId = setInterval(async () => {
      const updated = await Promise.all(
        connections.map((conn) => withConnectionHealth(conn)),
      );
      setConnections(updated);
    }, healthCheckConfig.intervalMs);

    return () => clearInterval(intervalId);
  }, [connections, isDockerMode, healthCheckConfig]);

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
        .catch(err => console.error(err))