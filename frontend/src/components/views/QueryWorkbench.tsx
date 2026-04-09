import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../EmptyState';
import TableView from './TableView';
import JsonView from './JsonView';
import type { DriverCapabilities } from '../../App';

type ResultMode = 'table' | 'json';

interface QueryWorkbenchProps {
  dbId: string;
  dbType: string;
  tables: string[];
  capabilities: DriverCapabilities;
  onStatus: (msg: string, isError?: boolean) => void;
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
  mode: 'raw' | 'structured';
  payload: string;
  createdAt: number;
}

const HISTORY_KEY = 'dbportal-query-history';

const parseJsonObject = (label: string, value: string): Record<string, unknown> | undefined => {
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

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
};

const buildMongoPayload = (
  collection: string,
  filterText: string,
  projectionText: string,
  sortText: string,
  limitText: string
): StructuredQueryPayload => {
  const trimmedCollection = collection.trim();
  if (!trimmedCollection) {
    throw new Error('Collection is required.');
  }

  const limitNum = Number.parseInt(limitText || '100', 10);
  if (!Number.isFinite(limitNum) || limitNum <= 0) {
    throw new Error('Limit must be a positive integer.');
  }

  const payload: StructuredQueryPayload = {
    collection: trimmedCollection,
    limit: Math.min(limitNum, 500),
  };

  const filter = parseJsonObject('Filter', filterText);
  const projection = parseJsonObject('Projection', projectionText);
  const sort = parseJsonObject('Sort', sortText);

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
        throw new Error('Sort values must be 1 or -1.');
      }

      normalizedSort[key] = value;
    }

    payload.sort = normalizedSort;
  }

  return payload;
};

const formatSqlIdentifier = (databaseType: string, identifier: string): string => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return trimmed;
  }

  const normalizedType = databaseType.toLowerCase();
  if (normalizedType.includes('postgres')) {
    return `"${trimmed.replace(/"/g, '""')}"`;
  }

  if (normalizedType.includes('mysql') || normalizedType.includes('mariadb')) {
    return `\`${trimmed.replace(/`/g, '``')}\``;
  }

  return trimmed;
};

export default function QueryWorkbench({ dbId, dbType, tables, capabilities, onStatus }: QueryWorkbenchProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [collection, setCollection] = useState(tables[0] || '');
  const [filterText, setFilterText] = useState('{}');
  const [projectionText, setProjectionText] = useState('');
  const [sortText, setSortText] = useState('');
  const [limitText, setLimitText] = useState('100');
  const [pipelineText, setPipelineText] = useState('[\n  { "$match": { } }\n]');
  const [queryMode, setQueryMode] = useState<'structured' | 'aggregation'>('structured');
  const [resultMode, setResultMode] = useState<ResultMode>('table');
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([]);
  const [telemetry, setTelemetry] = useState<QueryTelemetry | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as QueryHistoryEntry[]) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch {
      return [];
    }
  });
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<QueryHistoryEntry | null>(null);

  const supportsStructured = capabilities.structuredQuery;
  const supportsRaw = capabilities.rawQuery;
  const activeObjectName = useMemo(
    () => collection || tables[0] || (supportsStructured ? 'collection' : 'table'),
    [collection, supportsStructured, tables]
  );

  const helperText = useMemo(() => {
    if (supportsStructured && !supportsRaw) {
      return 'Mongo-style query engine: fill filter/projection/sort JSON and run.';
    }

    if (supportsRaw && !supportsStructured) {
      return 'SQL query engine: write a raw SQL query and run.';
    }

    if (supportsRaw && supportsStructured) {
      return 'This driver supports both raw and structured query modes.';
    }

    return 'This driver does not currently expose query execution.';
  }, [supportsRaw, supportsStructured]);

  const queryRecommendations = useMemo(() => {
    if (supportsStructured && !supportsRaw) {
      return [
        'Start with a small filter like {} or {"status":"active"}.',
        'Use projection to keep only the fields you need.',
        'Sort uses 1 for ascending and -1 for descending.',
        'Limit is capped at 500 records to keep the UI responsive.',
      ];
    }

    if (supportsRaw && !supportsStructured) {
      return [
        'Start with SELECT queries before trying writes or DDL.',
        'Add LIMIT early while exploring a table.',
        'Use WHERE and ORDER BY to narrow and rank results.',
        'Quote mixed-case Postgres identifiers, for example "AcademicCalendarEvent".',
        'Be careful with UPDATE, DELETE, DROP, and TRUNCATE on shared databases.',
      ];
    }

    if (supportsRaw && supportsStructured) {
      return [
        'Pick the mode that matches the driver: SQL for relational, structured JSON for MongoDB.',
        'Keep query payloads tight and add filters before expanding result sets.',
        'Use history to iterate quickly on the same query shape.',
      ];
    }

    return ['This database driver does not currently expose query execution.'];
  }, [supportsRaw, supportsStructured]);

  const rawExamples = useMemo(() => {
    const name = formatSqlIdentifier(dbType, activeObjectName);
    return [
      {
        label: 'First 50 rows',
        sql: `SELECT * FROM ${name} LIMIT 50;`,
      },
      {
        label: 'Recent records',
        sql: `SELECT * FROM ${name} ORDER BY 1 DESC LIMIT 25;`,
      },
    ];
  }, [activeObjectName, dbType]);

  const structuredExamples = useMemo(() => {
    const name = activeObjectName;
    return [
      {
        label: 'Basic filter',
        query: {
          collection: name,
          filter: {},
          limit: 25,
        },
      },
      {
        label: 'Projected fields',
        query: {
          collection: name,
          filter: { status: 'active' },
          projection: { _id: 0, name: 1, email: 1 },
          sort: { createdAt: -1 as 1 | -1 },
          limit: 25,
        },
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

  const persistHistory = (next: QueryHistoryEntry[]) => {
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const addHistory = (mode: QueryHistoryEntry['mode'], payload: string) => {
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
      throw new Error('Raw query is not supported by this driver.');
    }

    const query = rawQuery.trim();
    if (!query) {
      throw new Error('Query cannot be empty.');
    }

    const res = await fetch(`/api/query?dbId=${dbId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || 'Query execution failed.');
    }

    addHistory('raw', query);
    return payload.data as Record<string, unknown>[];
  };

  const runStructuredQuery = async () => {
    if (!supportsStructured) {
      throw new Error('Structured query is not supported by this driver.');
    }

    const query = queryMode === 'aggregation' 
      ? { collection, pipeline: JSON.parse(pipelineText) }
      : buildMongoPayload(collection, filterText, projectionText, sortText, limitText);

    const res = await fetch(`/api/query?dbId=${dbId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || 'Query execution failed.');
    }

    addHistory('structured', JSON.stringify(query, null, 2));
    setTelemetry(payload.telemetry);
    return payload.data as Record<string, unknown>[];
  };

  const runQuery = async () => {
    setRunning(true);
    setRunError('');
    setTelemetry(null);

    try {
      let rows: Record<string, unknown>[] = [];
      if (supportsStructured && !supportsRaw) {
        rows = await runStructuredQuery();
      } else {
        const query = rawQuery.trim();
        const res = await fetch(`/api/query?dbId=${dbId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Query failed');
        setTelemetry(payload.telemetry);
        rows = payload.data;
        addHistory('raw', query);
      }
      
      setResultRows(Array.isArray(rows) ? rows : []);
      onStatus(`Query executed successfully`, false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown query error';
      setRunError(message);
      onStatus(message, true);
    } finally {
      setRunning(false);
    }
  };

  const applyHistory = (entry: QueryHistoryEntry) => {
    if (entry.mode === 'raw') {
      setRawQuery(entry.payload);
      return;
    }

    try {
      const parsed = JSON.parse(entry.payload) as StructuredQueryPayload;
      setCollection(parsed.collection || collection);
      setFilterText(parsed.filter ? JSON.stringify(parsed.filter, null, 2) : '{}');
      setProjectionText(parsed.projection ? JSON.stringify(parsed.projection, null, 2) : '');
      setSortText(parsed.sort ? JSON.stringify(parsed.sort, null, 2) : '');
      setLimitText(String(parsed.limit ?? 100));
    } catch {
      setRunError('Selected history entry cannot be parsed.');
    }
  };

  const resetQueryEditor = () => {
    setRawQuery('');
    setCollection(tables[0] || '');
    setFilterText('{}');
    setProjectionText('');
    setSortText('');
    setLimitText('100');
    setRunError('');
    onStatus('Query editor reset', false);
  };

  const applyRawExample = (sql: string) => {
    setRawQuery(sql);
    setRunError('');
    onStatus('Raw query example loaded', false);
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
    setProjectionText(query.projection ? JSON.stringify(query.projection, null, 2) : '');
    setSortText(query.sort ? JSON.stringify(query.sort, null, 2) : '');
    setLimitText(String(query.limit ?? 100));
    setRunError('');
    onStatus('Structured query example loaded', false);
  };

  return (
    <div className="query-workspace">
      <section className="query-panel">
        <div className="query-header">
          <h3>Query Engine</h3>
          <span className="query-helper">{helperText}</span>
          <span className="query-helper">Active Link: {dbId} // {dbType || 'Unknown'}</span>
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
                <button key={example.label} type="button" className="query-example-btn" onClick={() => applyRawExample(example.sql)}>
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
        </div>

        {supportsStructured && (
          <div className="query-group">
            <label htmlFor="query-collection">Collection/Table</label>
            <div style={{ display: 'flex', gap: '10px' }}>
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
              {dbType.toLowerCase().includes('mongo') && (
                <div className="query-mode-toggle">
                  <button 
                    className={`mode-btn ${queryMode === 'structured' ? 'active' : ''}`}
                    onClick={() => setQueryMode('structured')}
                  >
                    FIND
                  </button>
                  <button 
                    className={`mode-btn ${queryMode === 'aggregation' ? 'active' : ''}`}
                    onClick={() => setQueryMode('aggregation')}
                  >
                    AGGREGATE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {supportsStructured && queryMode === 'aggregation' && (
           <div className="query-group">
              <label htmlFor="query-pipeline">Pipeline (JSON Array)</label>
              <textarea
                id="query-pipeline"
                className="query-textarea query-textarea-lg"
                value={pipelineText}
                onChange={(event) => setPipelineText(event.target.value)}
                spellCheck={false}
              />
           </div>
        )}

        {supportsStructured && queryMode === 'structured' && (
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
            <label htmlFor="query-raw">Raw Query</label>
            <textarea
              id="query-raw"
              className="query-textarea query-textarea-lg"
              value={rawQuery}
              onChange={(event) => setRawQuery(event.target.value)}
              spellCheck={false}
              placeholder={dbType.toLowerCase().includes('mysql') ? 'SELECT * FROM users LIMIT 50;' : 'SELECT * FROM users LIMIT 50;'}
            />
          </div>
        )}

        <div className="query-actions">
          <button type="button" className="query-run-btn" onClick={runQuery} disabled={running || (!supportsRaw && !supportsStructured)}>
            {running ? 'Running...' : 'Run Query'}
          </button>
          <button
            type="button"
            className="query-clear-btn"
            onClick={() => {
              setResultRows([]);
              setRunError('');
              onStatus('Query results cleared', false);
            }}
          >
            Clear Results
          </button>
          <button type="button" className="query-clear-btn secondary" onClick={resetQueryEditor}>
            Reset Editor
          </button>
        </div>

        <div className="query-help-card subtle">
          <div className="query-help-title">Tips</div>
          <p className="query-help-copy">
            Use history to revisit a query, switch between table and JSON results for debugging, and keep raw SQL or structured
            JSON focused on the selected database object: {activeObjectName}.
          </p>
        </div>

        {runError && <p className="query-error">{runError}</p>}

        <div className="query-history">
          <div className="query-history-title">Recent Queries</div>
          {history.length === 0 ? (
            <p className="query-history-empty">No recent queries yet.</p>
          ) : (
            <div className="query-history-list">
              {history.map((entry) => (
                <button key={entry.id} type="button" className="query-history-item" onClick={() => setSelectedHistoryEntry(entry)}>
                  <span className="query-history-mode">{entry.mode === 'raw' ? 'SQL' : 'Structured'}</span>
                  <code>{entry.payload.slice(0, 120)}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="query-result-panel">
        <div className="query-result-header">
          <h3>Results</h3>
          <div className="query-result-tabs">
            <button type="button" className={`result-tab${resultMode === 'table' ? ' active' : ''}`} onClick={() => setResultMode('table')}>
              Table
            </button>
            <button type="button" className={`result-tab${resultMode === 'json' ? ' active' : ''}`} onClick={() => setResultMode('json')}>
              JSON
            </button>
          </div>
        </div>

        <div className="query-result-body">
          {telemetry && (
            <div className="telemetry-strip">
              <div className="telemetry-item">
                <span className="telemetry-label">LATENCY</span>
                <span className="telemetry-value">{telemetry.executionTimeMs}ms</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">RECORDS_IMPACTED</span>
                <span className="telemetry-value">{telemetry.affectedRows ?? resultRows.length}</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">STATUS</span>
                <span className="telemetry-value success">READY</span>
              </div>
            </div>
          )}
          {resultRows.length === 0 ? (
            <EmptyState>
              <p>Run a query to see results here.</p>
            </EmptyState>
          ) : resultMode === 'table' ? (
            <TableView 
              rows={resultRows} 
              dbId={dbId}
              dbType={dbType}
              tableName={collection}
            />
          ) : (
            <JsonView rows={resultRows} />
          )}
        </div>
      </section>

      {selectedHistoryEntry && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryEntry(null)}>
          <div className="technical-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-badge">HISTORY_DEEP_INSPECT</span>
                <h4 className="modal-title">Query Entry: {selectedHistoryEntry.id}</h4>
              </div>
              <button className="modal-close" onClick={() => setSelectedHistoryEntry(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">TIMESTAMP</span>
                  <span className="meta-value">{new Date(selectedHistoryEntry.createdAt).toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">QUERY_MODE</span>
                  <span className="meta-value">{selectedHistoryEntry.mode.toUpperCase()}</span>
                </div>
              </div>
              <div className="modal-content-area">
                <span className="meta-label">FULL_PAYLOAD</span>
                <pre className="modal-code-block">{selectedHistoryEntry.payload}</pre>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="query-run-btn" 
                  onClick={async () => {
                    applyHistory(selectedHistoryEntry);
                    setSelectedHistoryEntry(null);
                    // Short timeout to allow state to settle
                    setTimeout(() => runQuery(), 50);
                  }}
                >
                  RUN IMMEDIATELY
                </button>
                <button 
                  className="query-run-btn secondary" 
                  onClick={() => {
                    applyHistory(selectedHistoryEntry);
                    setSelectedHistoryEntry(null);
                  }}
                >
                  LOAD INTO EDITOR
                </button>
              </div>
              <button className="query-clear-btn" onClick={() => setSelectedHistoryEntry(null)}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
