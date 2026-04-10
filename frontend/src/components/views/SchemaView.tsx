import { useEffect, useState, useCallback } from 'react';
import EmptyState from '../EmptyState';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MarkerType, 
  useNodesState, 
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node
} from '@xyflow/react';
import dagre from 'dagre';

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

const TableNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`schema-node${selected ? ' active' : ''}`} style={{
      width: 140,
      height: 52,
      borderRadius: 10,
      background: selected ? 'var(--accent-soft)' : 'var(--surface-raised)',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--line-strong)'}`,
      color: selected ? 'var(--accent)' : 'var(--text)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontFamily: 'var(--font-mono)',
      boxShadow: selected ? 'var(--glow-accent)' : 'var(--shadow-subtle)',
      cursor: 'pointer'
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontWeight: 600 }}>{data.label as string}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: 4 }}>{data.fieldCount as number} fields</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const nodeTypes = {
  tableMode: TableNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 140, height: 52 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - 70,
        y: nodeWithPosition.y - 26,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function SchemaView({ dbId, dbType, refreshKey, onStatus }: SchemaViewProps) {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

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
        
        // Transform schema to raw nodes and edges
        const initialNodes: Node[] = payload.tables.map((t: TableSchema) => ({
          id: t.name,
          type: 'tableMode',
          position: { x: 0, y: 0 },
          data: { label: t.name, fieldCount: t.columns.length, table: t },
        }));

        const initialEdges: Edge[] = [];
        payload.tables.forEach((t: TableSchema) => {
          t.foreignKeys.forEach((fk, idx) => {
            initialEdges.push({
              id: `edge-${t.name}-${fk.column}-${fk.refTable}-${fk.refColumn}-${idx}`,
              source: t.name,
              target: fk.refTable,
              label: fk.column,
              animated: true,
              style: { stroke: 'var(--text-muted)', strokeWidth: 1.5, opacity: 0.6 },
              labelStyle: { fill: 'var(--text)', fontSize: 10, fontFamily: 'var(--font-mono)' },
              labelBgStyle: { fill: 'var(--surface)', fillOpacity: 0.8 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'var(--text-muted)',
              },
            });
          });
        });

        // Run dagre layout computation
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges, 'TB');
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        const defaultSelected = payload.tables?.[0]?.name ?? null;
        setSelectedTableName(defaultSelected);

        // Visually select the first node
        if (defaultSelected) {
          setNodes((nds) => nds.map(n => ({ ...n, selected: n.id === defaultSelected })));
        }

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
  }, [dbId, refreshKey, onStatus, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedTableName(node.id);
  }, []);

  const selectedTable = schema?.tables.find((t) => t.name === selectedTableName) ?? null;

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
          </div>
        </div>

        <div className="schema-map">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={3}
            attributionPosition="bottom-left"
          >
            <Background color="var(--line-strong)" gap={20} size={1} />
            <Controls />
          </ReactFlow>
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
