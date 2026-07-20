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


        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Engineered for Developer Velocity & Safety
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-sans">
          No cloud telemetry, no account registration, no heavy Electron VM bloat. Pure local speed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Feature 1 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconDatabase size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Multi-Driver Database Fleet</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
            Native driver support for PostgreSQL, CockroachDB, MongoDB, MySQL, MariaDB, SQLite, SQL Server & Redis.
          </p>
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white/5 text-rose-300 border border-white/10">PostgreSQL</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">MongoDB</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">MySQL</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">SQLite</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-rose-300 border border-white/10">Redis</span>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconBox size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Instant Docker Daemon GUI</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
            Bridges directly to your local Docker socket via <code className="text-rose-300 font-mono">dockerode</code>. Monitor live metrics, launch images, and manage volumes.
          </p>
          <div className="text-xs font-mono text-rose-400 font-bold">
            $ dbportal --docker
          </div>
        </div>

        {/* Feature 3 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconShieldCheck size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Read-Only Enforced Safety</h3>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-sans">
            Prevents accidental database mutations, table drops, or rogue UPDATE queries during local inspection and debugging sessions.
          </p>
          <div className="text-xs font-mono text-rose-300 flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> 100% Safe Connection Layer
          </div>
        </div>

        {/* Feature 4 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconGitFork size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Relational ER Schema Visualizer</h3>
          <p className="text-slate-400 text-xs leading-relaxed font-sans">
            Auto-inspects foreign key constraints and schema metadata to dynamically render interactive entity-relationship maps.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconLayoutDashboard size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">Multi-Connection Fleet Dashboard</h3>
          <p className="text-slate-400 text-xs leading-relaxed font-sans">
            Specify <code className="text-rose-300 font-mono">DATABASE_URL_1</code> through <code className="text-rose-300 font-mono">DATABASE_URL_10</code> in your <code className="text-slate-300 font-mono">.env</code> file for unified fleet inspection.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="tech-card p-6">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <IconCode size={20} stroke={1.75} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">docker-compose.yml Exporter</h3>
          <p className="text-slate-400 text-xs leading-relaxed font-sans">
            Configure container environment variables, ports, and volume mounts visually, then export clean, valid <code className="text-rose-300 font-mono">docker-compose.yml</code> files.
          </p>
        </div>


      </div>
    </section>
  );
}
