'use client';

import { useState, useEffect } from 'react';
import { Database, Container, Layers, Server, Zap, Play, Plus, FileCode, Cpu, HardDrive, Disc, Box, Check, Copy } from 'lucide-react';

interface SimulatorProps {
  onToast: (msg: string) => void;
}

export default function Simulator({ onToast }: SimulatorProps) {
  const [simMode, setSimMode] = useState<'db' | 'docker'>('db');
  const [activeDb, setActiveDb] = useState<'postgres' | 'mongo' | 'mysql' | 'redis'>('postgres');
  const [dbTab, setDbTab] = useState<'data' | 'schema' | 'query'>('data');
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT u.id, u.username, COUNT(o.id) as total_orders FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id;"
  );
  const [queryOutput, setQueryOutput] = useState('⚡ Read-only query engine ready.');
  const [cpuUsage, setCpuUsage] = useState('3.8%');

  const [containers, setContainers] = useState([
    { name: 'redis-cache', image: 'redis:7-alpine', status: 'Running', ports: '6379:6379', cpu: '0.4%', ram: '14.2 MB' },
    { name: 'postgres-db', image: 'postgres:16', status: 'Running', ports: '5432:5432', cpu: '1.8%', ram: '124 MB' },
    { name: 'api-gateway', image: 'express-api:latest', status: 'Running', ports: '3000:3000', cpu: '1.2%', ram: '88 MB' },
    { name: 'nginx-proxy', image: 'nginx:alpine', status: 'Stopped', ports: '80:80', cpu: '0.0%', ram: '0 MB' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const val = (Math.random() * 3.2 + 2.0).toFixed(1);
      setCpuUsage(`${val}%`);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleContainer = (index: number) => {
    setContainers((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          const isRunning = c.status === 'Running';
          const nextStatus = isRunning ? 'Stopped' : 'Running';
          onToast(`Container "${c.name}" ${nextStatus.toLowerCase()}!`);
          return {
            ...c,
            status: nextStatus,
            cpu: isRunning ? '0.0%' : '1.4%',
            ram: isRunning ? '0 MB' : '48 MB',
          };
        }
        return c;
      })
    );
  };

  const handleRunSql = () => {
    setQueryOutput('⏳ Running query in read-only sandbox...');
    setTimeout(() => {
      setQueryOutput(`⚡ Executed in ${(Math.random() * 1.2 + 0.5).toFixed(1)}ms — 3 rows returned. Read-only enforced.`);
      onToast('SQL Query executed!');
    }, 300);
  };

  const dbData = {
    postgres: {
      name: 'production_pg',
      tables: ['users', 'orders', 'products', 'audit_logs', 'sessions'],
      rows: [
        { id: 'usr_9f81a', username: 'alex_dev', email: 'alex@company.com', role: 'admin', created: '2026-03-12 10:24' },
        { id: 'usr_3b20c', username: 'sarah_m', email: 'sarah@design.io', role: 'editor', created: '2026-04-01 14:15' },
        { id: 'usr_7e41d', username: 'manan_g', email: 'manan@dbportal.org', role: 'owner', created: '2026-05-18 09:00' },
        { id: 'usr_1c99f', username: 'chen_we', email: 'chen@cloud.net', role: 'viewer', created: '2026-06-20 16:40' },
      ],
    },
    mongo: {
      name: 'user_analytics',
      tables: ['events_v2', 'user_sessions', 'funnel_dropoffs', 'telemetry'],
      rows: [
        { id: '65f8a1...3b', username: 'page_view', email: 'usr_9f81a', role: 'web_desktop', created: '2026-07-20 13:00' },
        { id: '65f8a2...4c', username: 'btn_click', email: 'usr_3b20c', role: 'ios_app', created: '2026-07-20 13:02' },
        { id: '65f8a3...8d', username: 'export_csv', email: 'usr_7e41d', role: 'web_desktop', created: '2026-07-20 13:05' },
      ],
    },
    mysql: {
      name: 'store_ecommerce',
      tables: ['inventory', 'transactions', 'coupons', 'shipments'],
      rows: [
        { id: 'item_101', username: 'Developer Laptop Pro', email: 'SKU-LAP-2026', role: '142 units', created: '2026-07-19' },
        { id: 'item_102', username: 'Mechanical Keyboard', email: 'SKU-KBD-991', role: '530 units', created: '2026-07-19' },
      ],
    },
    redis: {
      name: 'cache_fleet',
      tables: ['sess:*', 'rate_limit:*', 'token_blocklist', 'metrics:live'],
      rows: [
        { id: 'sess:9f81a', username: 'string', email: '3599s', role: '{"uid": 102, "auth": true}', created: '128 B' },
        { id: 'rate:ip_12', username: 'zset', email: '45s', role: '[ts_1, ts_2, ts_3]', created: '256 B' },
      ],
    },
  };

  const currentDb = dbData[activeDb];

  return (
    <section id="simulator" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
      {/* Section Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Live Product Sandbox
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-sans">
          Interactive simulator showing real <code className="text-rose-300 bg-slate-900 px-2 py-0.5 rounded font-mono">dbportal</code> features. Try switching drivers, tables, or container states below.
        </p>
      </div>

      {/* Main Container Window */}
      <div className="glass-panel border border-white/10 border-t-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
            <span className="text-xs font-mono font-medium text-slate-300">
              dbportal v1.1.0 — <span className="text-slate-400">127.0.0.1:4444</span>
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#080a11]/60 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setSimMode('db')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                simMode === 'db'
                  ? 'text-rose-200 bg-rose-500/20 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-rose-400" />
              <span>Database Fleet</span>
            </button>
            <button
              onClick={() => setSimMode('docker')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                simMode === 'docker'
                  ? 'text-rose-200 bg-rose-500/20 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Container className="w-3.5 h-3.5 text-sky-400" />
              <span>Docker Manager</span>
            </button>
          </div>
        </div>


        {/* DATABASE MODE */}
        {simMode === 'db' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
            {/* Sidebar */}
            <aside className="lg:col-span-3 bg-[#080a11] border-r border-[#1e2638] p-4 space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Fleets (4)</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={() => setActiveDb('postgres')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    activeDb === 'postgres'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-900/40 hover:bg-slate-800 border border-[#1e2638] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-rose-400" />
                    <div>
                      <div className="font-bold text-white">production_pg</div>
                      <div className="text-[10px] text-slate-400">PostgreSQL 16</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Read-only</span>
                </button>

                <button
                  onClick={() => setActiveDb('mongo')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    activeDb === 'mongo'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-900/40 hover:bg-slate-800 border border-[#1e2638] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-slate-200">user_analytics</div>
                      <div className="text-[10px] text-slate-500">MongoDB 7</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Doc</span>
                </button>

                <button
                  onClick={() => setActiveDb('mysql')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    activeDb === 'mysql'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-900/40 hover:bg-slate-800 border border-[#1e2638] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-sky-400" />
                    <div>
                      <div className="font-bold text-slate-200">store_ecommerce</div>
                      <div className="text-[10px] text-slate-500">MySQL 8</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Read-only</span>
                </button>

                <button
                  onClick={() => setActiveDb('redis')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    activeDb === 'redis'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-900/40 hover:bg-slate-800 border border-[#1e2638] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-rose-400" />
                    <div>
                      <div className="font-bold text-slate-200">cache_fleet</div>
                      <div className="text-[10px] text-slate-500">Redis 7</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">K-V</span>
                </button>
              </div>

              {/* Table List */}
              <div className="pt-3 border-t border-[#1e2638] space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tables in <span className="text-rose-300 lowercase">{currentDb.name}</span>
                </div>
                <div className="space-y-1 text-xs">
                  {currentDb.tables.map((t, idx) => (
                    <button
                      key={t}
                      className={`w-full flex items-center justify-between p-2 rounded transition ${
                        idx === 0
                          ? 'bg-slate-800 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span>📄 {t}</span>
                      <span className="text-[10px] text-slate-500">TBL</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Area */}
            <main className="lg:col-span-9 p-5 flex flex-col justify-between bg-[#0b0e17] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e2638] pb-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDbTab('data')}
                    className={`px-3 py-1.5 rounded transition ${
                      dbTab === 'data' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Table Inspector
                  </button>
                  <button
                    onClick={() => setDbTab('schema')}
                    className={`px-3 py-1.5 rounded transition ${
                      dbTab === 'schema' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ER Graph Visualizer
                  </button>
                  <button
                    onClick={() => setDbTab('query')}
                    className={`px-3 py-1.5 rounded transition ${
                      dbTab === 'query' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Read-Only SQL Editor
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Records: <strong className="text-white">{currentDb.rows.length}</strong></span>
                  <span className="px-2 py-0.5 bg-slate-900 text-rose-300 rounded border border-[#1e2638] text-[11px]">
                    1.2ms
                  </span>
                </div>
              </div>

              {/* View 1: Data Table */}
              {dbTab === 'data' && (
                <div className="overflow-x-auto rounded-lg border border-[#1e2638] bg-[#080a11]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0e121e] border-b border-[#1e2638] text-slate-300">
                      <tr>
                        <th className="p-3">id</th>
                        <th className="p-3">col_1</th>
                        <th className="p-3">col_2</th>
                        <th className="p-3">attribute</th>
                        <th className="p-3">created</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2638] text-slate-300">
                      {currentDb.rows.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-3 font-semibold text-rose-300">{r.id}</td>
                          <td className="p-3 text-white">{r.username}</td>
                          <td className="p-3 text-slate-300">{r.email}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-[#1e2638]">
                              {r.role}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{r.created}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onToast(`Viewing document drawer for record ${r.id}`)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded text-[11px] transition"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: ER Schema */}
              {dbTab === 'schema' && (
                <div className="p-4 rounded-lg border border-[#1e2638] bg-[#080a11] min-h-[280px] flex flex-col items-center justify-center relative">
                  <div className="text-xs text-slate-400 mb-2 font-mono">Relational Entity-Relationship Diagram</div>
                  <svg className="w-full h-64" viewBox="0 0 600 220" fill="none">
                    <path d="M160 80 C 230 80, 230 140, 300 140" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                    <path d="M440 140 C 490 140, 490 80, 540 80" stroke="#38bdf8" strokeWidth="2" />

                    <g transform="translate(40, 30)">
                      <rect width="120" height="90" rx="6" fill="#0e121e" stroke="#f43f5e" strokeWidth="1.5" />
                      <rect width="120" height="24" rx="6" fill="#141a2b" />
                      <text x="12" y="16" fill="#fb7185" fontFamily="monospace" fontSize="11" fontWeight="bold">users</text>
                      <text x="12" y="42" fill="#94a3b8" fontFamily="monospace" fontSize="9">🔑 id (PK)</text>
                      <text x="12" y="58" fill="#94a3b8" fontFamily="monospace" fontSize="9">email</text>
                      <text x="12" y="74" fill="#94a3b8" fontFamily="monospace" fontSize="9">created_at</text>
                    </g>

                    <g transform="translate(260, 90)">
                      <rect width="130" height="105" rx="6" fill="#0e121e" stroke="#38bdf8" strokeWidth="1.5" />
                      <rect width="130" height="24" rx="6" fill="#141a2b" />
                      <text x="12" y="16" fill="#38bdf8" fontFamily="monospace" fontSize="11" fontWeight="bold">orders</text>
                      <text x="12" y="42" fill="#94a3b8" fontFamily="monospace" fontSize="9">🔑 id (PK)</text>
                      <text x="12" y="58" fill="#fb7185" fontFamily="monospace" fontSize="9">🔗 user_id (FK)</text>
                      <text x="12" y="74" fill="#94a3b8" fontFamily="monospace" fontSize="9">total_amount</text>
                      <text x="12" y="90" fill="#94a3b8" fontFamily="monospace" fontSize="9">status</text>
                    </g>

                    <g transform="translate(460, 30)">
                      <rect width="120" height="90" rx="6" fill="#0e121e" stroke="#818cf8" strokeWidth="1.5" />
                      <rect width="120" height="24" rx="6" fill="#141a2b" />
                      <text x="12" y="16" fill="#818cf8" fontFamily="monospace" fontSize="11" fontWeight="bold">products</text>
                      <text x="12" y="42" fill="#94a3b8" fontFamily="monospace" fontSize="9">🔑 id (PK)</text>
                      <text x="12" y="58" fill="#94a3b8" fontFamily="monospace" fontSize="9">title</text>
                      <text x="12" y="74" fill="#94a3b8" fontFamily="monospace" fontSize="9">price</text>
                    </g>
                  </svg>
                </div>
              )}

              {/* View 3: SQL Workspace */}
              {dbTab === 'query' && (
                <div className="space-y-3 font-mono">
                  <div className="bg-[#080a11] border border-[#1e2638] rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400 border-b border-[#1e2638] pb-2">
                      <span>Read-Only Query Workspace</span>
                      <button
                        onClick={handleRunSql}
                        className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
                      >
                        <Play className="w-3 h-3 fill-current" /> Run Query
                      </button>
                    </div>
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="w-full bg-[#0e121e] p-3 rounded border border-[#1e2638] text-rose-300 focus:outline-none focus:border-rose-500/50 resize-none font-mono text-xs"
                      rows={3}
                    />
                  </div>
                  <div className="bg-[#080a11] rounded-lg p-3 border border-[#1e2638] text-xs text-rose-300">
                    {queryOutput}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-[#1e2638]">
                <span>Read-Only Safety: <strong className="text-rose-400">ENFORCED</strong></span>
                <span>http://127.0.0.1:4444</span>
              </div>
            </main>
          </div>
        )}

        {/* DOCKER MODE */}
        {simMode === 'docker' && (
          <div className="p-6 space-y-6 bg-[#080a11]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="bg-[#0e121e] border border-[#1e2638] rounded-lg p-3">
                <div className="text-xs text-slate-400">Active Containers</div>
                <div className="text-2xl font-bold text-rose-400 mt-1 flex items-center justify-between">
                  <span>{containers.filter((c) => c.status === 'Running').length} Active</span>
                  <Box className="w-5 h-5 opacity-40" />
                </div>
              </div>

              <div className="bg-[#0e121e] border border-[#1e2638] rounded-lg p-3">
                <div className="text-xs text-slate-400">CPU Usage</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1 flex items-center justify-between">
                  <span>{cpuUsage}</span>
                  <Cpu className="w-5 h-5 opacity-40" />
                </div>
              </div>

              <div className="bg-[#0e121e] border border-[#1e2638] rounded-lg p-3">
                <div className="text-xs text-slate-400">RAM Footprint</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1 flex items-center justify-between">
                  <span>342 MB</span>
                  <HardDrive className="w-5 h-5 opacity-40" />
                </div>
              </div>

              <div className="bg-[#0e121e] border border-[#1e2638] rounded-lg p-3">
                <div className="text-xs text-slate-400">Images & Volumes</div>
                <div className="text-2xl font-bold text-slate-200 mt-1 flex items-center justify-between">
                  <span>6 Volumes</span>
                  <Disc className="w-5 h-5 opacity-40" />
                </div>
              </div>
            </div>

            <div className="bg-[#0e121e] border border-[#1e2638] rounded-lg overflow-hidden font-mono">
              <div className="p-4 bg-[#141a2b] border-b border-[#1e2638] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-sm text-white">Docker Daemon Manager</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => onToast('Opening Container Launcher (pulled redis:alpine)')}
                    className="px-3.5 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Launch Container
                  </button>
                  <button
                    onClick={() => onToast('Exported clean docker-compose.yml!')}
                    className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#1e2638] font-bold transition flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5 text-rose-400" /> Export Compose
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080a11] border-b border-[#1e2638] text-slate-400">
                    <tr>
                      <th className="p-3">Container</th>
                      <th className="p-3">Image</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ports</th>
                      <th className="p-3">CPU / RAM</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2638] text-slate-300">
                    {containers.map((c, idx) => (
                      <tr key={c.name} className="hover:bg-slate-900/50 transition">
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              c.status === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{c.name}</span>
                        </td>
                        <td className="p-3 text-cyan-300">{c.image}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              c.status === 'Running'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{c.ports}</td>
                        <td className="p-3 text-slate-400">
                          {c.cpu} / {c.ram}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => toggleContainer(idx)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[10px]"
                          >
                            {c.status === 'Running' ? 'Stop' : 'Start'}
                          </button>
                          <button
                            onClick={() => onToast(`Viewing logs for ${c.name}`)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30 transition text-[10px]"
                          >
                            Logs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

