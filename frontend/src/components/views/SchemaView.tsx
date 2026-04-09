import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '../EmptyState';

interface ColumnSchema {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
}

interface ForeignKeySchema {
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  foreignKeys: ForeignKeySchema[];
}

interface DatabaseSchema {
  dbType: string;
  tables: TableSchema[];
}

interface SchemaViewProps {
  dbId: string;
  dbType: string;
  refreshKey: number;
  onStatus: (msg: string, isError?: boolean) => void;
}

export default function SchemaView({ dbId, dbType, refreshKey, onStatus }: SchemaViewProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    mode: 'pan' | 'node' | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    nodeName?: string;
    nodeX?: number;
    nodeY?: number;
  }>({ mode: null, startX: 0, startY: 0, originX: 0, originY: 0 });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/schema?dbId=${dbId}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load schema.');
        if (!alive) return;
        setSchema(payload);
        setSelected(payload.tables?.[0]?.name ?? null);
        onStatus(`Schema ready for ${dbId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (!alive) return;
        setError(msg);
        onStatus(msg, true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [dbId, refreshKey, onStatus]);

  const layout = useMemo(() => {
    const tables = schema?.tables ?? [];
    const count = tables.length || 1;

    if (count <= 8) {
      const radius = Math.max(160, Math.min(320, 110 + Math.sqrt(count) * 70));
      const width = Math.round(radius * 2 + 300);
      const height = Math.round(radius * 2 + 240);
      const centerX = width / 2;
      const centerY = height / 2;

      const nodes = tables.map((table, index) => {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        return { table, x, y };
      });

      const nodeMap = new Map(nodes.map((n) => [n.table.name, n]));
      const edges = tables.flatMap((table) =>
        table.foreignKeys
          .map((fk) => {
            const from = nodeMap.get(table.name);
            const to = nodeMap.get(fk.refTable);
            if (!from || !to) return null;
            return {
              from,
              to,
              label: `${fk.column} → ${fk.refTable}.${fk.refColumn}`,
            };
          })
          .filter(Boolean)
      ) as Array<{ from: typeof nodes[number]; to: typeof nodes[number]; label: string }>;

      return { width, height, nodes, edges };
    }

    const columns = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / columns);
    const cellW = 180;
    const cellH = 120;
    const width = columns * cellW + 160;
    const height = rows * cellH + 140;
    const offsetX = 80;
    const offsetY = 70;

    const nodes = tables.map((table, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = offsetX + col * cellW;
      const y = offsetY + row * cellH;
      return { table, x, y };
    });

    const nodeMap = new Map(nodes.map((n) => [n.table.name, n]));

    const edges = tables.flatMap((table) =>
      table.foreignKeys
        .map((fk) => {
          const from = nodeMap.get(table.name);
          const to = nodeMap.get(fk.refTable);
          if (!from || !to) return null;
          return {
            from,
            to,
            label: `${fk.column} → ${fk.refTable}.${fk.refColumn}`,
          };
        })
        .filter(Boolean)
    ) as Array<{ from: typeof nodes[number]; to: typeof nodes[number]; label: string }>;

    return { width, height, nodes, edges };
  }, [schema]);

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!schema) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const node of layout.nodes) {
      next[node.table.name] = { x: node.x, y: node.y };
    }
    setNodePositions(next);
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [schema, layout.nodes]);

  const selectedTable = schema?.tables.find((t) => t.name === selected) ?? schema?.tables[0] ?? null;

  const clampScale = (value: number) => Math.min(2.2, Math.max(0.55, value));

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => clampScale(Number((s + delta).toFixed(2))));
  };

  const onPointerDownCanvas = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as HTMLElement).closest('.schema-node')) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      mode: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const onPointerMoveCanvas = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragState.current.mode !== 'pan') return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    setPan({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    });
  };

  const onPointerUpCanvas = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragState.current.mode) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current.mode = null;
  };

  const onNodePointerDown = (event: React.PointerEvent<SVGGElement>, name: string) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pos = nodePositions[name];
    dragState.current = {
      mode: 'node',
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      nodeName: name,
      nodeX: pos?.x ?? 0,
      nodeY: pos?.y ?? 0,
    };
    setSelected(name);
  };

  const onNodePointerMove = (event: React.PointerEvent<SVGGElement>) => {
    if (dragState.current.mode !== 'node' || !dragState.current.nodeName) return;
    const dx = (event.clientX - dragState.current.startX) / scale;
    const dy = (event.clientY - dragState.current.startY) / scale;
    const name = dragState.current.nodeName;
    setNodePositions((prev) => ({
      ...prev,
      [name]: {
        x: (dragState.current.nodeX ?? 0) + dx,
        y: (dragState.current.nodeY ?? 0) + dy,
      },
    }));
  };

  const onNodePointerUp = (event: React.PointerEvent<SVGGElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current.mode = null;
  };

  const onResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <EmptyState>
        <div className="loading-pulse" />
        <p>Scanning schema...</p>
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

  if (!schema || schema.tables.length === 0) {
    return (
      <EmptyState>
        <p>No schema metadata available.</p>
      </EmptyState>
    );
  }

  return (
    <div className="schema-layout">
      <section className="schema-canvas">
        <div className="schema-canvas-head">
          <div>
            <h3>Schema Visualizer</h3>
            <p>{dbType.toUpperCase()} · {schema.tables.length} tables</p>
          </div>
          <div className="schema-legend">
            <span className="legend-dot primary" />
            <span>Primary key</span>
            <span className="legend-dot foreign" />
            <span>Foreign key</span>
            <button type="button" className="schema-reset" onClick={onResetView}>
              Reset View
            </button>
          </div>
        </div>

        <div className="schema-map">
          <svg
            className="schema-svg"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label="Schema map"
            onWheel={onWheel}
            onPointerDown={onPointerDownCanvas}
            onPointerMove={onPointerMoveCanvas}
            onPointerUp={onPointerUpCanvas}
          >
            <defs>
              <marker id="schemaArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L10,3 L0,6 Z" className="schema-edge-arrow" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
              {layout.edges.map((edge, idx) => {
                const from = nodePositions[edge.from.table.name] ?? { x: edge.from.x, y: edge.from.y };
                const to = nodePositions[edge.to.table.name] ?? { x: edge.to.x, y: edge.to.y };
                return (
                  <line
                    key={`${edge.label}-${idx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className="schema-edge"
                    markerEnd="url(#schemaArrow)"
                  />
                );
              })}

              {layout.nodes.map((node) => {
                const pos = nodePositions[node.table.name] ?? { x: node.x, y: node.y };
                return (
                  <g
                    key={node.table.name}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onPointerDown={(event) => onNodePointerDown(event, node.table.name)}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    className={`schema-node${selected === node.table.name ? ' active' : ''}`}
                  >
                    <rect x={-70} y={-26} width={140} height={52} rx={10} />
                    <text x={0} y={-4} textAnchor="middle">
                      {node.table.name}
                    </text>
                    <text x={0} y={14} textAnchor="middle">
                      {node.table.columns.length} fields
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </section>

      <aside className="schema-panel">
        <div className="schema-panel-head">
          <span className="schema-panel-title">Table Inspector</span>
          <span className="schema-panel-sub">{selectedTable?.name ?? '—'}</span>
        </div>

        {selectedTable ? (
          <>
            <div className="schema-section">
              <div className="schema-section-title">Columns</div>
              <div className="schema-columns">
                {selectedTable.columns.map((col) => (
                  <div key={col.name} className="schema-column-row">
                    <div className="schema-column-name">
                      <span className={`schema-key ${col.isPrimary ? 'primary' : col.name.endsWith('_id') ? 'foreign' : ''}`} />
                      {col.name}
                    </div>
                    <div className="schema-column-meta">
                      <span>{col.type}</span>
                      <span>{col.isNullable ? 'NULL' : 'NOT NULL'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="schema-section">
              <div className="schema-section-title">Relations</div>
              {selectedTable.foreignKeys.length === 0 ? (
                <div className="schema-empty">No foreign keys detected.</div>
              ) : (
                <div className="schema-relations">
                  {selectedTable.foreignKeys.map((fk, idx) => (
                    <div key={`${fk.column}-${idx}`} className="schema-relation-row">
                      <span>{fk.column}</span>
                      <span>→</span>
                      <span>{fk.refTable}.{fk.refColumn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="schema-empty">Select a table to inspect.</div>
        )}
      </aside>
    </div>
  );
}
