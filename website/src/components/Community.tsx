function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function NpmIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0H1.763zM5.13 5.13h13.74v13.74h-3.435V8.565h-3.435v10.305H5.13V5.13z"/>
    </svg>
  );
}

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function ArrowUpRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  );
}

function HeartIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function KanbanIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 7v7M12 7v4M16 7v9" />
    </svg>
  );
}

export default function Community() {
  return (
    <section id="community" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24">
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans font-medium mb-3">
          <HeartIcon className="w-3.5 h-3.5 text-rose-400" />
          <span>Open-Source Ecosystem</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Community & Contributions
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-sans">
          <code className="text-rose-300 font-mono">dbportal</code> is an open-source project featured in <strong className="text-white">GirlScript Summer of Code (GSSoC) 2026</strong>.
        </p>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: GitHub */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <GithubIcon className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Star on GitHub</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Audit the codebase, report issues, and submit pull requests under GSSoC 2026.
            </p>
          </div>
          <a
            href="https://github.com/Mananwebdev160408/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-rose-500/30 shadow-sm"
          >
            <span>GitHub Repository</span>
            <ArrowUpRightIcon className="w-3.5 h-3.5 text-rose-300" />
          </a>
        </div>

        {/* Card 2: Discord */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <DiscordIcon className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Join Discord</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Collaborate directly with maintainers, ask questions, and discuss features.
            </p>
          </div>
          <a
            href="https://discord.gg/YnRq6df2RY"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 border border-rose-400/40"
          >
            <span>Discord Server</span>
            <ArrowUpRightIcon className="w-3.5 h-3.5 text-white/80" />
          </a>
        </div>

        {/* Card 3: Roadmap & npm */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <KanbanIcon className="w-5 h-5 text-rose-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-sans">Roadmap & npm</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Track project milestones and inspect npm registry package distribution.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/users/Mananwebdev160408/projects/2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>Roadmap</span>
            </a>
            <a
              href="https://www.npmjs.com/package/dbportal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <NpmIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>npm</span>
            </a>
          </div>
        </div>
      </div>


      {/* Maintainer Footer */}
      <div className="glass-panel rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 font-sans">
        <div className="flex items-center gap-2">
          <span>Maintained with care by</span>
          <a
            href="https://github.com/Mananwebdev160408"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-rose-300 font-bold transition underline underline-offset-4"
          >
            Manan Gupta
          </a>
          <span>& contributors</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
          <span>License: MIT</span>
          <span>Version: 1.1.0</span>
        </div>
      </div>
    </section>
  );
}


