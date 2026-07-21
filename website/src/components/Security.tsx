import {
  IconLock,
  IconShieldCheck,
  IconWifiOff,
  IconCpu,
  IconKey,
  IconFileCheck,
} from '@tabler/icons-react';

export default function Security() {
  return (
    <section id="security" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-display">
          Security & Local Architecture
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base font-sans">
          Built with an unyielding local-first security stance. Inspect databases without compromising sensitive local or production data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Localhost Binding Only (127.0.0.1) - Spans 2 columns */}
        <div className="tech-card p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconLock size={20} stroke={1.75} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Localhost Binding Only (127.0.0.1)</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans max-w-xl">
              dbportal binds strictly to your loopback address 127.0.0.1:4444. It is never exposed over public networks, external interfaces, or remote IP addresses.
            </p>
          </div>
          <div className="text-[10px] font-mono text-rose-300 mt-4 bg-[#080a11]/40 border border-[#1e2638]/40 p-2.5 rounded-lg inline-flex items-center gap-2 self-start">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Local bound socket active: 127.0.0.1:4444</span>
          </div>
        </div>

        {/* Card 2: Enforced Read-Only Execution Engine - Spans 1 column */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconShieldCheck size={20} stroke={1.75} />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Enforced Read-Only Engine</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              All database connections operate under strict read-only parameters. Destructive transactions like UPDATE, DELETE, and DROP are blocked at driver level.
            </p>
          </div>
        </div>

        {/* Card 3: Zero Cloud Telemetry & 100% Offline - Spans 1 column */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconWifiOff size={20} stroke={1.75} />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Zero Cloud Telemetry</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Zero analytics tracking, zero third-party cloud pings, zero tracking scripts. Operates fully air-gapped without active internet connections.
            </p>
          </div>
        </div>

        {/* Card 4: Local Docker Socket Isolation - Spans 1 column */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconCpu size={20} stroke={1.75} />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Docker Socket Isolation</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Communicates directly with your local Docker daemon socket (/var/run/docker.sock or //./pipe/docker_engine) using native dockerode bindings.
            </p>
          </div>
        </div>

        {/* Card 5: Zero Cloud Credential Storage - Spans 1 column */}
        <div className="tech-card p-6 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <IconKey size={20} stroke={1.75} />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Zero Credential Storage</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Your database connection credentials remain isolated inside your local .env file. No tokens or keys are saved externally.
            </p>
          </div>
        </div>

        {/* Card 6: Open Source MIT License Integrity - Spans 3 columns */}
        <div className="tech-card p-6 md:col-span-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex gap-4 items-start max-w-2xl">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <IconFileCheck size={20} stroke={1.75} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 font-sans">Open Source MIT License Integrity</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                Fully transparent codebase published on GitHub and npmjs. Audit the source code, verify dependencies, and contribute directly to GSSoC 2026.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono text-xs">
            <a
              href="https://github.com/Mananwebdev160408/dbportal"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#080a11]/45 hover:bg-[#080a11]/70 border border-[#1e2638]/60 hover:border-rose-500/40 text-slate-300 rounded transition"
            >
              GitHub Repository
            </a>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-400">License: MIT</span>
          </div>
        </div>

      </div>
    </section>
  );
}
