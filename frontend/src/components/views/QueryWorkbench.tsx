import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import EmptyState from "../EmptyState";
import VisualQueryBuilder from "./VisualQueryBuilder";
import SqlQueryBuilder from "./SqlQueryBuilder";
import TableView from "./TableView";
import JsonView from "./JsonView";
import type { DriverCapabilities } from "../../App";
import { CopyIcon, CheckIcon } from "../Icons";

type ResultMode = "table" | "json";

interface QueryWorkbenchProps {
  dbId: string;
  dbType: string;
  tables: string[];
  capabilities: DriverCapabilities;
  onStatus: (msg: string, isError?: boolean) => void;
  maskSensitive?: boolean;
}

interface StructuredQueryPayload {
  collection: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  pipeline?: any[];
}

interface QueryTelemetry {
  executionTimeMs: number;
  affectedRows?: number;
}

interface QueryHistoryEntry {
  id: string;
  mode: "raw" | "structured";
  payload: string;
  createdAt: number;
}

const HISTORY_KEY_PREFIX = "dbportal-query-history";
const BOOKMARK_KEY_PREFIX = "dbportal-query-bookmarks";
const FAVORITE_KEY_PREFIX = "dbportal-query-favorites";
const UNGROUPED_FOLDER = "Ungrouped";

interface BookmarkEntry {
  id: string;
  name: string;
  mode: "raw" | "structured";
  payload: string;
  createdAt: number;
}

interface FavoriteEntry {
  id: string;
  name: string;
  connectionId: string;
  folder: string;
  tags: string[];
  mode: "raw" | "structured";
  payload: string;
  createdAt: number;
}

const loadFavorites = (
  favoriteKey: string,
  legacyBookmarkKey: string,
  connectionId: string,
): FavoriteEntry[] => {
  try {
    const raw = localStorage.getItem(favoriteKey);
    if (raw) {
      const parsed = JSON.parse(raw) as FavoriteEntry[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // fall through to migration below
  }

  // Migrate legacy flat bookmarks (no folders/tags) the first time this
  // connection is opened after the favorites feature shipped, so existing
  // saved queries aren't silently lost.
  try {
    const legacyRaw = localStorage.getItem(legacyBookmarkKey);
    const legacyEntries = legacyRaw
      ? (JSON.parse(legacyRaw) as BookmarkEntry[])
      : [];
    if (!Array.isArray(legacyEntries) || legacyEntries.length === 0) {
      return [];
    }
    const migrated: FavoriteEntry[] = legacyEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      connectionId,
      folder: UNGROUPED_FOLDER,
      tags: [],
      mode: entry.mode,
      payload: entry.payload,
      createdAt: entry.createdAt,
    }));
    localStorage.setItem(favoriteKey, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
};

const parseJsonObject = (
  label: string,
  value: string,
): Record<string, unknown> | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (typeof parsed !== "object" || parsed ==== null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
};

const buildMongoPayload = (
  collection: string,
  filterText: string,
  projectionText: string,
  sortText: string,
  limitText: string,
): StructuredQueryPayload => {
  const trimmedCollection = collection.trim();
  if (!trimmedCollection) {
    throw new Error("Collection is required.");
  }

  const limitNum = Number.parseInt(limitText || "100", 10);
  if (!Number.isFinite(limitNum) || limitNum <= 0) {
    throw new Error("Limit must be a positive integer.");
  }

  const payload: StructuredQueryPayload = {
    collection: trimmedCollection,
    limit: Math.min(limitNum, 500),
  };

  const filter = parseJsonObject("Filter", filterText);
  const projection = parseJsonObject("Projection", projectionText);
  const sort = parseJsonObject("Sort", sortText);

  if (filter) {
    payload.filter = filter;
  }

  if (projection) {
    payload.projection = projection;
  }

  if (sort) {
    const normalizedSort: Record<string, 1 | -1> = {};
    for (const [key, value] of Object.entries(sort)) {
      if (value !== 1 && value !== -1) {
        throw new Error("Sort values must be 1 or -1.");
      }

      normalizedSort[key] = value;
    }

    payload.sort = normalizedSort;
  }

  return payload;
};

const formatSqlIdentifier = (
  databaseType: string,
  identifier: string,
): string => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return trimmed;
  }

  const normalizedType = databaseType.toLowerCase();
  if (
    normalizedType.includes("postgres") ||
    normalizedType.includes("cockroach")
  ) {
    return `"${trimmed.replace(/"/g, '""')}"`;
  }

  if (normalizedType.includes("mysql") || normalizedType.includes("mariadb")) {
    return `\`${trimmed.replace(/`/g, "``")}\``;
  }

  if (
    normalizedType.includes("mssql") ||
    normalizedType.includes("sqlserver")
  ) {
    return `[${trimmed.replace(/]/g, "]]")}]`;
  }

  return trimmed;
};

export default function QueryWorkbench({
  dbId,
  dbType,
  tables,
  capabilities,
  onStatus,
  maskSensitive = false,
}: QueryWorkbenchProps) {
  interface QueryTab {
    id: string;
    title: string;
    rawQuery: string;
  }
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: "tab-1",
      title: "Query 1",
      rawQuery: "",
    },
  ]);

  const [activeTabId, setActiveTabId] = useState("tab-1");

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const rawQuery = activeTab?.rawQuery ?? "";

  const setRawQuery = (value: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, rawQuery: value } : tab,
      ),
    );
  };
  const [showSqlBuilder, setShowSqlBuilder] = useState(() => {
    return localStorage.getItem("dbportal-sql-builder-visible") === "true";
  });
  useEffect(() => {
    localStorage.setItem(
      "dbportal-sql-builder-visible",
      String(showSqlBuilder),
    );
  }, [showSqlBuilder]);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [panelWidth, setPanelWidth] = useState(() => {
    const stored = localStorage.getItem("dbportal-query-panel-width");
    return stored ? parseInt(stored, 10) : 420;
  });

  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(300, Math.min(800, startWidth + delta));
        setPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [panelWidth],
  );

  useEffect(() => {
    localStorage.setItem("dbportal-query-panel-width", String(panelWidth));
  }, [panelWidth]);
  const [collection, setCollection] = useState(tables[0] || "");
  const [filterText, setFilterText] = useState("{}");
  const [projectionText, setProjectionText] = useState("");
  const [sortText, setSortText] = useState("");
  const [limitText, setLimitText] = useState("100");
  const [pipelineText, setPipelineText] = useState('[\n  { "$match": { } }\n]');
  const [queryMode, setQueryMode] = useState<"structured" | "aggregation">(
    "structured",
  );
  const [resultMode, setResultMode] = useState<ResultMode>("table");
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([]);
  const [telemetry, setTelemetry] = useState<QueryTelemetry | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [runError, setRunError] = useState("");
  const historyKey = `${HISTORY_KEY_PREFIX}:${dbType}:${dbId}`;
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? (JSON.parse(raw) as QueryHistoryEntry[]) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch {
      return [];
    }
  });
  const [selectedHistoryEntry, setSelectedHistoryEntry] =
    useState<QueryHistoryEntry | null>(null);
  const favoriteKey = `${FAVORITE_KEY_PREFIX}:${dbType}:${dbId}`;
  const legacyBookmarkKey = `${BOOKMARK_KEY_PREFIX}:${dbType}:${dbId}`;
  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() =>
    loadFavorites(favoriteKey, legacyBookmarkKey, dbId),
  );
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteFolder, setFavoriteFolder] = useState("");
  const [favoriteTags, setFavoriteTags] = useState("");
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [runRequestId, setRunRequestId] = useState(0);
  const favoriteImportInputRef = useRef<HTMLInputElement>(null);

  const existingFolders = useMemo(
    () =>
      Array.from(
        new Set(favorites.map((f) => f.folder).filter(Boolean)),
      ).sort(),
    [favorites],
  );

  const filteredFavorites = useMemo(() => {
    const query = favoriteSearch.trim().toLowerCase();
    if (!query) return favorites;
    return favorites.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.tags.some((t) => t.toLowerCase().includes(query)) ||
        f.payload.toLowerCase().includes(query),
    );
  }, [favorites, favoriteSearch]);

  const favoritesByFolder = useMemo(() => {
    const groups = new Map<string, FavoriteEntry[]>();
    for (const entry of filteredFavorites) {
      const folder = entry.folder || UNGROUPED_FOLDER;
      const list = groups.get(folder) ?? [];
      list.push(entry);
      groups.set(folder, list);
    }
    const folderNames = Array.from(groups.keys()).sort((a, b) => {
      if (a === UNGROUPED_FOLDER) return 1;
      if (b === UNGROUPED_FOLDER) return -1;
      return a.localeCompare(b);
    });
    return folderNames.map((folder) => ({
      folder,
      entries: groups.get(folder) ?? [],
    }));
  }, [filteredFavorites]);

  const supportsStructured = capabilities.structuredQuery;
  const supportsRaw = capabilities.rawQuery;
  const activeObjectName = useMemo(
    () =>
      collection || tables[0] || (supportsStructured ? "collection" : "table"),
    [collection, supportsStructured, tables],
  );

  const helperText = useMemo(() => {
    if (supportsStructured && !supportsRaw) {
      return "Mongo-style query engine: fill filter/projection/sort JSON and run.";
    }

    if (supportsRaw && !supportsStructured) {
      return "SQL query engine (read-only): run SELECT/SHOW/EXPLAIN style queries.";
    }

    if (supportsRaw && supportsStructured) {
      return "This driver supports both raw and structured query modes.";
    }

    return "This driver does not currently expose query execution.";
  }, [supportsRaw, supportsStructured]);

  const queryRecommendations = useMemo(() => {
    if (supportsStructured && !supportsRaw) {
      return [
        'Start with a small filter like {} or {"status":"active"}.',
        "Use projection to keep only the fields you need.",
        "Sort uses 1 for ascending and -1 for descending.",
        "Limit is capped at 500 records to keep the UI responsive.",
      ];
    }

    if (supportsRaw && !supportsStructured) {
      return [
        "Use SELECT/SHOW/EXPLAIN queries in this read-only mode.",
        "Add LIMIT early while exploring a table.",
        "Use WHERE and ORDER BY to narrow and rank results.",
        'Quote mixed-case Postgres identifiers, for example "AcademicCalendarEvent".',
        "Write statements are blocked in this build.",
      ];
    }

    if (supportsRaw && supportsStructured) {
      return [
        "Pick the mode that matches the driver: SQL for relational, structured JSON for MongoDB.",
        "Keep query payloads tight and add filters before expanding result sets.",
        "Use history to iterate quickly on the same query shape.",
      ];
    }

    return ["This database driver does not currently expose query execution."];
  }, [supportsRaw, supportsStructured]);

  const rawExamples = useMemo(() => {
    const name = formatSqlIdentifier(dbType, activeObjectName);
    const isMsSql =
      dbType.toLowerCase().includes("mssql") ||
      dbType.toLowerCase().includes("sqlserver");
    return [
      {
        label: "First 50 rows",
        sql: isMsSql
          ? `SELECT TOP 50 * FROM ${name};`
          : `SELECT * FROM ${name} LIMIT 50;`,
      },
      {
        label: "Recent records",
        sql: isMsSql
          ? `SELECT TOP 25 * FROM ${name} ORDER BY 1 DESC;`
          : `SELECT * FROM ${name} ORDER BY 1 DESC LIMIT 25;`,
      },
    ];
  }, [activeObjectName, dbType]);

  const structuredExamples = useMemo(() => {
    const name = activeObjectName;
    return [
      {
        label: "Basic filter",
        query: {
          collection: name,
          filter: {},
          limit: 25,
        },
      },
      {
        label: "Projected fields",
        query: {
          collection: name,
          filter: { status: "active" },
          projection: { _id: 0, name: 1, email: 1 },
          sort: { createdAt: -1 as 1 | -1 },
          limit: 25,
        },
      },
    ];
  }, [activeObjectName]);

  const aggregationExamples = useMemo(() => {
    const name = activeObjectName;
    return [
      {
        label: "Status breakdown",
        pipeline: [
          { $match: { status: { $exists: true } } },
          { $group: { _id: "$status", total: { $sum: 1 } } },
          { $sort: { total: -1 as 1 | -1 } },
        ],
      },
      {
        label: "Top users by spend",
        pipeline: [
          { $match: { totalSpent: { $gt: 0 } } },
          {
            $group: {
              _id: "$userId",
              orders: { $sum: 1 },
              totalSpent: { $sum: "$totalSpent" },
            },
          },
          { $sort: { totalSpent: -1 as 1 | -1 } },
          { $limit: 10 },
        ],
      },
      {
        label: "Recent trend (daily)",
        pipeline: [
          {
            $match: {
              createdAt: {
                $gte: {
                  $dateSubtract: {
                    startDate: "$$NOW",
                    unit: "day",
                    amount: 30,
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 as 1 | -1 } },
        ],
      },
      {
        label: "Multi-metric facet",
        pipeline: [
          {
            $facet: {
              totalDocs: [{ $count: "count" }],
              topStatuses: [
                { $match: { status: { $exists: true } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $sort: { count: -1 as 1 | -1 } },
                { $limit: 5 },
              ],
              newest: [{ $sort: { createdAt: -1 as 1 | -1 } }, { $limit: 5 }],
            },
          },
        ],
      },
      {
        label: "Collection sample",
        pipeline: [{ $sample: { size: 25 } }],
      },
    ];
  }, [activeObjectName]);

  useEffect(() => {
    if (!supportsStructured) {
      return;
    }

    if (collection && tables.includes(collection)) {
      return;
    }

    if (tables.length > 0) {
      setCollection(tables[0]);
    }
  }, [collection, supportsStructured, tables]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? (JSON.parse(raw) as QueryHistoryEntry[]) : [];
      setHistory(Array.isArray(parsed) ? parsed.slice(0, 8) : []);
    } catch {
      setHistory([]);
    }
    setSelectedHistoryEntry(null);
  }, [historyKey]);

  const persistHistory = (next: QueryHistoryEntry[]) => {
    setHistory(next);
    localStorage.setItem(historyKey, JSON.stringify(next));
  };

  const addHistory = (mode: QueryHistoryEntry["mode"], payload: string) => {
    const item: QueryHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode,
      payload,
      createdAt: Date.now(),
    };

    const next = [item, ...history].slice(0, 8);
    persistHistory(next);
  };

  const runRawQuery = async () => {
    if (!supportsRaw) {
      throw new Error("Raw query is not supported by this driver.");
    }

    const query = activeTab.rawQuery.trim();
    if (!query) {
      throw new Error("Query cannot be empty.");
    }

    const startTime = performance.now();
    const res = await fetch(`/api/query?dbId=${dbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || "Query execution failed.");
    }

    addHistory("raw", query);
    const executionTimeMs = Math.round(performance.now() - startTime);
    setTelemetry({ executionTimeMs, affectedRows: payload.data?.length ?? 0 });
    return payload.data as Record<string, unknown>[];
  };

  const runStructuredQuery = async () => {
    if (!supportsStructured) {
      throw new Error("Structured query is not supported by this driver.");
    }

    const query =
      queryMode === "aggregation"
        ? { collection, pipeline: JSON.parse(pipelineText) }
        : buildMongoPayload(
            collection,
            filterText,
            projectionText,
            sortText,
            limitText,
          );

    const res = await fetch(`/api/query?dbId=${dbId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || "Query execution failed.");
    }

    addHistory("structured", JSON.stringify(query, null, 2));
    setTelemetry(payload.telemetry);
    return payload.data as Record<string, unknown>[];
  };

  const runQuery = async () => {
    setRunning(true);
    setRunError("");
    setTelemetry(null);

    try {
      let rows: Record<string, unknown>[] = [];
      if (supportsStructured && !supportsRaw) {
        rows = await runStructuredQuery();
      } else {
        const query = activeTab.rawQuery.trim();
        const startTime = performance.now();
        const res = await fetch(`/api/query?dbId=${dbId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Query failed");
        const executionTimeMs = Math.round(performance.now() - startTime);
        setTelemetry(
          payload.telemetry ?? {
            executionTimeMs,
            affectedRows: payload.data?.length ?? 0,
          },
        );
        rows = payload.data;
        addHistory("raw", query);
      }

      setResultRows(Array.isArray(rows) ? rows : []);
      onStatus(`Query executed successfully`, false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown query error";
      const isTimeout =
        message.toLowerCase().includes("timed out") ||
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("etimedout");
      setRunError(
        isTimeout
          ? `${message}\n\nYou can retry the query once the database is reachable.`
          : message,
      );
      onStatus(message, true);
    } finally {
      setRunning(false);
    }
  };

  // "Run immediately" on a favorite loads its state via loadFavorite() and
  // bumps this counter; runQuery() reads from the freshly-committed state
  // once the effect fires, avoiding the stale-closure issue that would
  // happen from calling runQuery() synchronously right after the setters.
  useEffect(() => {
    if (runRequestId > 0) {
      runQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runRequestId]);

  const applyHistory = (entry: QueryHistoryEntry) => {
    if (entry.mode === "raw") {
      setRawQuery(entry.payload);
      return;
    }

    try {
      const parsed = JSON.parse(entry.payload) as StructuredQueryPayload;
      setCollection(parsed.collection || collection);
      setFilterText(
        parsed.filter ? JSON.stringify(parsed.filter, null, 2) : "{}",
      );
      setProjectionText(
        parsed.projection ? JSON.stringify(parsed.projection, null, 2) : "",
      );
      setSortText(parsed.sort ? JSON.stringify(parsed.sort, null, 2) : "");
      setLimitText(String(parsed.limit ?? 100));
    } catch {
      setRunError("Selected history entry cannot be parsed.");
    }
  };

  const persistFavorites = (next: FavoriteEntry[]) => {
    setFavorites(next);
    localStorage.setItem(favoriteKey, JSON.stringify(next));
  };

  const saveFavorite = () => {
    const name = favoriteName.trim();
    if (!name) {
      onStatus("Please enter a name for the favorite.", true);
      return;
    }

    let payload: string;
    try {
      payload =
        supportsStructured && !supportsRaw
          ? JSON.stringify(
              buildMongoPayload(
                collection,
                filterText,
                projectionText,
                sortText,
                limitText,
              ),
              null,
              2,
            )
          : activeTab.rawQuery.trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid query";
      onStatus(`Cannot save favorite: ${msg}`, true);
      return;
    }

    if (!payload) {
      onStatus("Nothing to save — query is empty.", true);
      return;
    }

    const tags = favoriteTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const item: FavoriteEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      connectionId: dbId,
      folder: favoriteFolder.trim() || UNGROUPED_FOLDER,
      tags,
      mode: supportsStructured && !supportsRaw ? "structured" : "raw",
      payload,
      createdAt: Date.now(),
    };

    persistFavorites([item, ...favorites]);
    setFavoriteName("");
    setFavoriteFolder("");
    setFavoriteTags("");
    onStatus(`Favorite "${name}" saved!`, false);
  };

  const deleteFavorite = (id: string) => {
    persistFavorites(favorites.filter((f) => f.id !== id));
    onStatus("Favorite deleted.", false);
  };

  const loadFavorite = (entry: FavoriteEntry) => {
    if (entry.mode === "raw") {
      setRawQuery(entry.payload);
    } else {
      try {
        const parsed = JSON.parse(entry.payload) as StructuredQueryPayload;
        setCollection(parsed.collection || collection);
        setFilterText(
          parsed.filter ? JSON.stringify(parsed.filter, null, 2) : "{}",
        );
        setProjectionText(
          parsed.projection ? JSON.stringify(parsed.projection, null, 2) : "",
        );
        setSortText(parsed.sort ? JSON.stringify(parsed.sort, null, 2) : "");
        setLimitText(String(parsed.limit ?? 100));
      } catch {
        setRunError("Favorite cannot be parsed.");
      }
    }
    onStatus(`Favorite "${entry.name}" loaded!`, false);
  };

  const runFavoriteImmediately = (entry: FavoriteEntry) => {
    loadFavorite(entry);
    setRunRequestId((id) => id + 1);
  };

  const exportFavorites = () => {
    if (favorites.length === 0) {
      onStatus("No favorites to export.", true);
      return;
    }
    const blob = new Blob([JSON.stringify(favorites, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dbportal-favorites-${dbId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onStatus("Favorites exported.", false);
  };

  const importFavorites = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FavoriteEntry[];
      if (!Array.isArray(parsed)) {
        throw new Error("File does not contain a favorites array.");
      }

      const existingKeys = new Set(
        favorites.map((f) => `${f.name}::${f.connectionId}`),
      );
      const incoming = parsed.filter(
        (f) =>
          f &&
          typeof f.name === "string" &&
          typeof f.payload === "string" &&
          !existingKeys.has(`${f.name}::${f.connectionId ?? dbId}`),
      );

      if (incoming.length === 0) {
        onStatus("Nothing new to import — all entries already exist.", false);
        return;
      }

      const normalized: FavoriteEntry[] = incoming.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        connectionId: f.connectionId ?? dbId,
        folder: f.folder || UNGROUPED_FOLDER,
        tags: Array.isArray(f.tags) ? f.tags : [],
        mode: f.mode === "structured" ? "structured" : "raw",
        payload: f.payload,
        createdAt: f.createdAt ?? Date.now(),
      }));

      persistFavorites([...normalized, ...favorites]);
      onStatus(`Imported ${normalized.length} favorite(s).`, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid favorites file";
      onStatus(`Import failed: ${msg}`, true);
    }
  };

  const resetQueryEditor = () => {
    setRawQuery("");
    setCollection(tables[0] || "");
    setFilterText("{}");
    setProjectionText("");
    setSortText("");
    setLimitText("100");
    setRunError("");
    onStatus("Query editor reset", false);
  };

  const handleSort = useCallback((col: string) => {
    setSortBy((prev) => {
      if (prev === col) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return col;
      }
      setSortOrder("asc");
      return col;
    });
  }, []);

  const sortedResultRows = useMemo(() => {
    if (!sortBy) return resultRows;
    return [...resultRows].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      const cmp = sa.localeCompare(sb);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [resultRows, sortBy, sortOrder]);

  const copyResults = async () => {
    if (resultRows.length === 0) return;
    const text = JSON.stringify(resultRows, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write denied
    }
  };

  const applyRawExample = (sql: string) => {
    setRawQuery(sql);
    setRunError("");
    onStatus("Raw query example loaded", false);
  };

  const applyStructuredExample = (query: {
    collection: string;
    filter?: Record<string, unknown>;
    projection?: Record<string, unknown>;
    sort?: Record<string, 1 | -1>;
    limit?: number;
  }) => {
    setCollection(query.collection);
    setFilterText(JSON.stringify(query.filter ?? {}, null, 2));
    setProjectionText(
      query.projection ? JSON.stringify(query.projection, null, 2) : "",
    );
    setSortText(query.sort ? JSON.stringify(query.sort, null, 2) : "");
    setLimitText(String(query.limit ?? 100));
    setRunError("");
    onStatus("Structured query example loaded", false);
  };

  const applyAggregationExample = (pipeline: Record<string, unknown>[]) => {
    setCollection(activeObjectName || collection);
    setQueryMode("aggregation");
    setPipelineText(JSON.stringify(pipeline, null, 2));
    setRunError("");
    onStatus("Aggregation pipeline example loaded", false);
  };

  return (
    <div
      className="query-workspace"
      style={{ gridTemplateColumns: `${panelWidth}px 4px 1fr` }}
    >
      <section className="query-panel">
        <div className="query-header">
          <h3>Query Engine</h3>
          <span className="query-helper">{helperText}</span>
          <span className="query-helper">
            Connection: {dbId} ({dbType || "Unknown"})
          </span>
        </div>

        <div className="query-help-card">
          <div className="query-help-title">Recommendations</div>
          <ul className="query-tip-list">
            {queryRecommendations.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>

        <div className="query-help-card">
          <div className="query-help-title">Quick examples</div>
          {supportsRaw && (
            <div className="query-example-list">
              {rawExamples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="query-example-btn"
                  onClick={() => applyRawExample(example.sql)}
                >
                  <span>{example.label}</span>
                  <code>{example.sql}</code>
                </button>
              ))}
            </div>
          )}
          {supportsStructured && (
            <div className="query-example-list">
              {structuredExamples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="query-example-btn"
                  onClick={() => applyStructuredExample(example.query)}
                >
                  <span>{example.label}</span>
                  <code>{JSON.stringify(example.query)}</code>
                </button>
              ))}
            </div>
          )}
          {supportsStructured && dbType.toLowerCase().includes("mongo") && (
            <div className="query-example-list">
              {aggregationExamples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="query-example-btn"
                  onClick={() =>
                    applyAggregationExample(
                      example.pipeline as Record<string, unknown>[],
                    )
                  }
                >
                  <span>{example.label} (Aggregate)</span>
                  <code>{JSON.stringify(example.pipeline)}</code>
                </button>
              ))}
            </div>
          )}
        </div>
        {supportsStructured && (
          <VisualQueryBuilder
            tables={tables}
            columns={[]}
            onApply={(filter, col, lim) => {
              setCollection(col);
              setFilterText(JSON.stringify(filter, null, 2));
              setLimitText(String(lim));
              onStatus(
                "Visual query applied — click Run Query to execute.",
                false,
              );
            }}
          />
        )}
        {supportsStructured && (
          <div className="query-group">
            <label htmlFor="query-collection">Collection/Table</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <select
                id="query-collection"
                className="query-input"
                style={{ flex: 1 }}
                value={collection}
                onChange={(event) => setCollection(event.target.value)}
              >
                {tables.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {dbType.toLowerCase().includes("mongo") && (
                <div className="query-mode-toggle">
                  <button
                    className={`mode-btn ${queryMode === "structured" ? "active" : ""}`}
                    onClick={() => setQueryMode("structured")}
                  >
                    FIND
                  </button>
                  <button
                    className={`mode-btn ${queryMode === "aggregation" ? "active" : ""}`}
                    onClick={() => setQueryMode("aggregation")}
                  >
                    AGGREGATE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {supportsStructured && queryMode === "aggregation" && (
          <div className="query-group">
            <label htmlFor="query-pipeline">Pipeline (JSON Array)</label>
            <textarea
              id="query-pipeline"
              className="query-textarea query-textarea-lg"
              value={pipelineText}
              onChange={(event) => setPipelineText(event.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  runQuery();
                }
              }}
              spellCheck={false}
            />
          </div>
        )}

        {supportsStructured && queryMode === "structured" && (
          <>
            <div className="query-grid-two">
              <div className="query-group">
                <label htmlFor="query-filter">Filter (JSON)</label>
                <textarea
                  id="query-filter"
                  className="query-textarea"
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="query-group">
                <label htmlFor="query-projection">Projection (JSON)</label>
                <textarea
                  id="query-projection"
                  className="query-textarea"
                  value={projectionText}
                  onChange={(event) => setProjectionText(event.target.value)}
                  spellCheck={false}
                  placeholder='{"name":1,"email":1}'
                />
              </div>
            </div>

            <div className="query-grid-two compact">
              <div className="query-group">
                <label htmlFor="query-sort">Sort (JSON)</label>
                <input
                  id="query-sort"
                  className="query-input"
                  value={sortText}
                  onChange={(event) => setSortText(event.target.value)}
                  placeholder='{"createdAt":-1}'
                />
              </div>

              <div className="query-group">
                <label htmlFor="query-limit">Limit</label>
                <input
                  id="query-limit"
                  className="query-input"
                  value={limitText}
                  onChange={(event) => setLimitText(event.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </>
        )}

        {supportsRaw && (
          <div className="query-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label>Query Builder</label>
              <button
                type="button"
                className="query-example-btn"
                onClick={() => setShowSqlBuilder((prev) => !prev)}
              >
                {showSqlBuilder ? "Hide Builder" : "Show Builder"}
              </button>
            </div>
            {showSqlBuilder && (
              <SqlQueryBuilder
                dbId={dbId}
                dbType={dbType}
                tables={tables}
                onApply={(sql) => {
                  setRawQuery(sql);
                  onStatus(
                    "Query inserted into editor — click Run Query to execute.",
                    false,
                  );
                }}
              />
            )}
          </div>
        )}

        {supportsRaw && (
          <>
            <div className="query-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={tab.id === activeTabId ? "active" : ""}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.title}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newTab = {
                    id: `tab-${Date.now()}`,
                    title: `Query ${tabs.length + 1}`,
                    rawQuery: "",
                  };

                  setTabs((prev) => [...prev, newTab]);
                  setActiveTabId(newTab.id);
                }}
              >
                + New Tab
              </button>
            </div>

            <div className="query-group">
              <label htmlFor="query-raw">Raw Query</label>
              <textarea
                id="query-raw"
                className="query-textarea query-textarea-lg"
                value={activeTab.rawQuery}
                onChange={(event) => {
                  setTabs((prev) =>
                    prev.map((tab) =>
                      tab.id === activeTabId
                        ? { ...tab, rawQuery: event.target.value }
                        : tab,
                    ),
                  );
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    runQuery();
                  }
                }}
                spellCheck={false}
                placeholder={
                  dbType.toLowerCase().includes("mssql") ||
                  dbType.toLowerCase().includes("sqlserver")
                    ? "SELECT TOP 50 * FROM users;"
                    : "SELECT * FROM users LIMIT 50;"
                }
              />
            </div>
          </>
        )}

        <div className="query-actions">
          <button
            type="button"
            className="query-run-btn"
            onClick={runQuery}
            disabled={running || (!supportsRaw && !supportsStructured)}
          >
            {running ? "Running..." : "Run Query"}
          </button>
          <button
            type="button"
            className="query-clear-btn"
            onClick={() => {
              setResultRows([]);
              setRunError("");
              onStatus("Query results cleared", false);
            }}
          >
            Clear Results
          </button>
          <button
            type="button"
            className="query-clear-btn secondary"
            onClick={resetQueryEditor}
          >
            Reset Editor
          </button>
        </div>

        <div className="query-help-card subtle">
          <div className="query-help-title">Tips</div>
          <p className="query-help-copy">
            Use history to revisit a query, switch between table and JSON
            results for debugging, and keep raw SQL or structured JSON focused
            on the selected database object: {activeObjectName}.
          </p>
        </div>

        {runError && <p className="query-error">{runError}</p>}

        {/* Favorites */}
        <div className="query-history">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="query-history-title">Favorites</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="query-example-btn"
                onClick={exportFavorites}
              >
                Export
              </button>
              <button
                type="button"
                className="query-example-btn"
                onClick={() => favoriteImportInputRef.current?.click()}
              >
                Import
              </button>
              <input
                ref={favoriteImportInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFavorites(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              type="text"
              className="query-input"
              placeholder="Name..."
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveFavorite();
              }}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              className="query-input"
              placeholder="Folder (optional)"
              value={favoriteFolder}
              onChange={(e) => setFavoriteFolder(e.target.value)}
              list="favorite-folder-options"
              style={{ flex: 1 }}
            />
            <datalist id="favorite-folder-options">
              {existingFolders.map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
            <input
              type="text"
              className="query-input"
              placeholder="Tags (comma separated)"
              value={favoriteTags}
              onChange={(e) => setFavoriteTags(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="query-run-btn"
              onClick={saveFavorite}
            >
              Save
            </button>
          </div>

          <input
            type="text"
            className="query-input"
            placeholder="Search favorites by name, tag, or query text..."
            value={favoriteSearch}
            onChange={(e) => setFavoriteSearch(e.target.value)}
            style={{ marginTop: "8px" }}
            aria-label="Search favorites"
          />

          {favorites.length === 0 ? (
            <p className="query-history-empty">No favorites yet.</p>
          ) : filteredFavorites.length === 0 ? (
            <p className="query-history-empty">
              No favorites match "{favoriteSearch}".
            </p>
          ) : (
            favoritesByFolder.map(({ folder, entries }) => (
              <div key={folder} className="query-favorite-folder">
                <div className="query-favorite-folder-title">{folder}</div>
                <div className="query-history-list">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="query-history-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onDoubleClick={() => loadFavorite(entry)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="query-history-mode">
                          {entry.mode === "raw" ? "SQL" : "Structured"}
                        </span>
                        <strong style={{ marginLeft: "6px" }}>
                          {entry.name}
                        </strong>
                        {entry.tags.length > 0 && (
                          <span style={{ marginLeft: "6px" }}>
                            {entry.tags.map((tag) => (
                              <span key={tag} className="query-favorite-tag">
                                {tag}
                              </span>
                            ))}
                          </span>
                        )}
                        <code style={{ display: "block" }}>
                          {entry.payload.length > 80
                            ? `${entry.payload.slice(0, 80)}...`
                            : entry.payload}
                        </code>
                      </div>
                      <button
                        type="button"
                        className="query-clear-btn"
                        style={{ flexShrink: 0 }}
                        onClick={() => loadFavorite(entry)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="query-clear-btn"
                        style={{ flexShrink: 0 }}
                        onClick={() => runFavoriteImmediately(entry)}
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        className="query-clear-btn"
                        style={{ flexShrink: 0 }}
                        onClick={() => deleteFavorite(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="query-history">
          <div className="query-history-title">Recent Queries</div>
          {history.length === 0 ? (
            <p className="query-history-empty">No recent queries yet.</p>
          ) : (
            <div className="query-history-list">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="query-history-item"
                  onClick={() => setSelectedHistoryEntry(entry)}
                >
                  <span className="query-history-mode">
                    {entry.mode === "raw" ? "SQL" : "Structured"}
                  </span>
                  <code>{entry.payload.slice(0, 120)}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="query-panel-resizer" onMouseDown={handlePanelMouseDown} />
      <section className="query-result-panel">
        <div className="query-result-header">
          <h3>Results</h3>
          <div className="query-result-tabs">
            <button
              type="button"
              className={`result-tab${resultMode === "table" ? " active" : ""}`}
              onClick={() => setResultMode("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={`result-tab${resultMode === "json" ? " active" : ""}`}
              onClick={() => setResultMode("json")}
            >
              JSON
            </button>
            {resultRows.length > 0 && (
              <button
                type="button"
                className="result-tab"
                onClick={copyResults}
                title="Copy results to clipboard"
              >
                {copied ? (
                  <>
                    <CheckIcon size={12} style={{ marginRight: 5 }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon size={12} style={{ marginRight: 5 }} />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="query-result-body">
          {telemetry && (
            <div className="telemetry-strip">
              <div className="telemetry-item">
                <span className="telemetry-label">Latency</span>
                <span className="telemetry-value">
                  {telemetry.executionTimeMs}ms
                </span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Rows</span>
                <span className="telemetry-value">
                  {telemetry.affectedRows ?? resultRows.length}
                </span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Status</span>
                <span className="telemetry-value success">Ready</span>
              </div>
            </div>
          )}
          {resultRows.length === 0 ? (
            <EmptyState>
              <p>Run a query to see results here.</p>
            </EmptyState>
          ) : resultMode === "table" ? (
            <TableView
              rows={sortedResultRows}
              maskSensitive={maskSensitive}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <JsonView rows={resultRows} maskSensitive={maskSensitive} />
          )}
        </div>
      </section>

      {selectedHistoryEntry && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedHistoryEntry(null)}
        >
          <div className="technical-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-badge">History Entry</span>
                <h4 className="modal-title">{selectedHistoryEntry.id}</h4>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelectedHistoryEntry(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Time</span>
                  <span className="meta-value">
                    {new Date(selectedHistoryEntry.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Mode</span>
                  <span className="meta-value">
                    {selectedHistoryEntry.mode.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="modal-content-area">
                <span className="meta-label">Query</span>
                <pre className="modal-code-block">
                  {selectedHistoryEntry.payload}
                </pre>
              </div>
            </div>
            <div
              className="modal-footer"
              style={{ justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="query-run-btn"
                  onClick={async () => {
                    applyHistory(selectedHistoryEntry);
                    setSelectedHistoryEntry(null);
                    // Short timeout to allow state to settle
                    setTimeout(() => runQuery(), 50);
                  }}
                >
                  Run
                </button>
                <button
                  className="query-run-btn secondary"
                  onClick={() => {
                    applyHistory(selectedHistoryEntry);
                    setSelectedHistoryEntry(null);
                  }}
                >
                  Load into Editor
                </button>
              </div>
              <button
                className="query-clear-btn"
                onClick={() => setSelectedHistoryEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
