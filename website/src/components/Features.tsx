import {
  IconDatabase,
  IconBox,
  IconShieldCheck,
  IconGitFork,
  IconLayoutDashboard,
  IconCode,
} from '@tabler/icons-react';

export default function Features() {
  return (
    <section id="features" className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-display">
          Engineered for Developer Velocity & Safety
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-sans">
          No cloud telemetry, no account registration, no heavy Electron VM bloat. Pure local speed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Row 1 - Card 1: Multi-Driver Database Fleet (spans 2 cols) */}
        <div className="tech-card p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconDatabase size={20} stroke={1.75} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Multi-Driver Database Fleet</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans max-w-xl">
              Native driver support for PostgreSQL, CockroachDB, MongoDB, MySQL, MariaDB, SQLite, SQL Server & Redis. No generic query parser wrapper — pure native performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[11px] mt-2">
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-rose-300 border border-[#1e2638]/50">PostgreSQL</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-slate-300 border border-[#1e2638]/50">MongoDB</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-slate-300 border border-[#1e2638]/50">MySQL</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-slate-300 border border-[#1e2638]/50">SQLite</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-rose-300 border border-[#1e2638]/50">Redis</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-slate-300 border border-[#1e2638]/50">CockroachDB</span>
            <span className="px-3 py-1 rounded bg-[#080a11]/40 text-slate-300 border border-[#1e2638]/50">SQL Server</span>
          </div>
        </div>

        {/* Row 1 - Card 2: Instant Docker Daemon GUI (spans 1 col) */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconBox size={20} stroke={1.75} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Instant Docker Daemon GUI</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
              Bridges directly to your local Docker socket via <code className="text-rose-300 font-mono">dockerode</code>. Monitor live metrics, launch images, and manage volumes.
            </p>
          </div>
          <div className="text-xs font-mono text-rose-400 font-bold bg-[#080a11]/40 border border-[#1e2638]/40 p-2.5 rounded-lg">
            $ dbportal --docker
          </div>
        </div>

        {/* Row 2 - Card 3: Read-Only Enforced Safety (spans 1 col) */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconShieldCheck size={20} stroke={1.75} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Read-Only Safety</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
              Prevents accidental database mutations, table drops, or rogue UPDATE queries during local inspection and debugging sessions.
            </p>
          </div>
          <div className="text-xs font-mono text-rose-300 flex items-center gap-2 font-semibold bg-[#080a11]/40 border border-[#1e2638]/40 p-2.5 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span> 
            <span>100% Safe Connection Layer</span>
          </div>
        </div>

        {/* Row 2 - Card 4: Relational ER Schema Visualizer (spans 2 cols) */}
        <div className="tech-card p-6 md:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-start">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                <IconGitFork size={20} stroke={1.75} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-sans">Relational ER Schema Visualizer</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans max-w-md">
                Auto-inspects foreign key constraints and schema metadata to dynamically render interactive entity-relationship maps. Drag, zoom, and inspect fields instantly.
              </p>
            </div>
            {/* Visual ER Map mock inside the card */}
            <div className="w-full sm:w-48 bg-[#080a11]/40 border border-[#1e2638]/50 rounded-lg p-3 font-mono text-[9px] text-slate-400 space-y-1.5 shrink-0 self-center">
              <div className="flex items-center justify-between border-b border-[#1e2638]/50 pb-1 text-white font-bold">
                <span>🔗 users_table</span>
                <span className="text-rose-400 font-bold">PK</span>
              </div>
              <div>id: uuid</div>
              <div>email: varchar</div>
              <div className="text-rose-300">orders_count: integer</div>
            </div>
          </div>
        </div>

        {/* Row 3 - Card 5: Multi-Connection Fleet Dashboard (spans 1 col) */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconLayoutDashboard size={20} stroke={1.75} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Multi-Connection Dashboard</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
              Specify <code className="text-rose-300 font-mono">DATABASE_URL_1</code> through <code className="text-rose-300 font-mono">DATABASE_URL_10</code> in your <code className="text-slate-300 font-mono">.env</code> file for unified fleet inspection.
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-400 space-y-1 bg-[#080a11]/40 border border-[#1e2638]/40 p-2.5 rounded-lg">
            <div>DATABASE_URL_1=postgres://...</div>
            <div>DATABASE_URL_2=mongodb://...</div>
          </div>
        </div>

        {/* Row 3 - Card 6: docker-compose.yml Exporter (spans 2 cols) */}
        <div className="tech-card p-6 md:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-start">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2">
                <IconCode size={20} stroke={1.75} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-sans">docker-compose.yml Exporter</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans max-w-md">
                Configure container environment variables, ports, and volume mounts visually, then export clean, valid <code className="text-rose-300 font-mono">docker-compose.yml</code> files for fast local scaffolding.
              </p>
            </div>
            <div className="w-full sm:w-48 bg-[#080a11]/40 border border-[#1e2638]/50 rounded-lg p-3 font-mono text-[9px] text-slate-500 space-y-1 shrink-0 self-center">
              <div><span className="text-rose-300">services:</span></div>
              <div className="pl-3"><span className="text-white">dbportal:</span></div>
              <div className="pl-6">image: postgres:alpine</div>
              <div className="pl-6">ports: - "5432:5432"</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
