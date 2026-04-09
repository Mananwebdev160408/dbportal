import { useMemo, useState } from 'react';
import EmptyState from '../EmptyState';
import TableView from './TableView';
import JsonView from './JsonView';
import type { DriverCapabilities } from '../../App';

type ResultMode = 'table' | 'json';

interface QueryWorkbenchProps {
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

export default function QueryWorkbench({ dbType, tables, capabilities, onStatus }: QueryWorkbenchProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [collection, setCollection] = useState(tables[0] || '');
  const [filterText, setFilterText] = useState('{}');
  const [projectionText, setProjectionText] = useState('');
  const [sortText, setSortText] = useState('');
  const [limitText, setLimitText] = useState('100');
  const [resultMode, setResultMode] = useState<ResultMode>('table');
  const [resultRows, setResultRows] = useState<Record<string, unknown>[]>([]);
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

  const supportsStructured = capabilities.structuredQuery;
  const supportsRaw = capabilities.rawQuery;

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

    const res = await fetch('/api/query', {
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

    const query = buildMongoPayload(collection, filterText, projectionText, sortText, limitText);

    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error || 'Query execution failed.');
    }

    addHistory('structured', JSON.stringify(query, null, 2));
    return payload.data as Record<string, unknown>[];
  };

  const runQuery = async () => {
    setRunning(true);
    setRunError('');

    try {
      const rows = supportsStructured && !supportsRaw ? await runStructuredQuery() : await runRawQuery();
      setResultRows(Array.isArray(rows) ? rows : []);
      onStatus(`Query executed: ${Array.isArray(rows) ? rows.length : 0} record(s)`, false);
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

  return (
    <div className="query-workspace">
      <section className="query-panel">
        <div className="query-header">
          <h3>Query Engine</h3>
          <span className="query-helper">{helperText}</span>
        </div>

        {supportsStructured && (
          <div className="query-group">
            <label htmlFor="query-collection">Collection/Table</label>
            <select
              id="query-collection"
              className="query-input"
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
            >
              {tables.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {supportsStructured && (
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
        </div>

        {runError && <p className="query-error">{runError}</p>}

        <div className="query-history">
          <div className="query-history-title">Recent Queries</div>
          {history.length === 0 ? (
            <p className="query-history-empty">No recent queries yet.</p>
          ) : (
            <div className="query-history-list">
              {history.map((entry) => (
                <button key={entry.id} type="button" className="query-history-item" onClick={() => applyHistory(entry)}>
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
          {resultRows.length === 0 ? (
            <EmptyState>
              <p>Run a query to see results here.</p>
            </EmptyState>
          ) : resultMode === 'table' ? (
            <TableView rows={resultRows} />
          ) : (
            <JsonView rows={resultRows} />
          )}
        </div>
      </section>
    </div>
  );
}
