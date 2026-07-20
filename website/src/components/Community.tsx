import { MessageSquare, Kanban, ExternalLink } from 'lucide-react';

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

export default function Community() {
  return (
    <section id="community" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24 text-center">
      <div className="glass-panel border border-white/10 border-t-white/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-3 font-sans">Open-Source & Community</h2>
        <p className="text-slate-300 max-w-xl mx-auto mb-8 text-sm sm:text-base font-sans">
          <code className="text-rose-300 font-mono">dbportal</code> is an active open-source project featured in{' '}
          <strong>GirlScript Summer of Code (GSSoC) 2026</strong>. Contributions and feedback are welcome!
        </p>


        <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
          <a
            href="https://www.npmjs.com/package/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 transition flex items-center gap-2 text-xs font-mono"
          >
            <NpmIcon className="w-4 h-4 text-rose-400" /> View on npmjs.com <ExternalLink className="w-3 h-3 text-rose-400/70" />
          </a>

          <a
            href="https://github.com/Mananwebdev160408/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold border border-[#1e2638] transition flex items-center gap-2 text-xs"
          >
            <GithubIcon className="w-4 h-4 text-white" /> Star on GitHub
          </a>

          <a
            href="https://discord.gg/YnRq6df2RY"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-2 text-xs shadow-lg shadow-indigo-600/30"
          >
            <MessageSquare className="w-4 h-4" /> Join Discord Server
          </a>

          <a
            href="https://github.com/users/Mananwebdev160408/projects/2"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1e2638] transition flex items-center gap-2 text-xs"
          >
            <Kanban className="w-4 h-4 text-rose-400" /> Project Roadmap
          </a>
        </div>

        <div className="pt-8 border-t border-[#1e2638] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 font-mono">
          <div>
            Maintained by{' '}
            <a
              href="https://github.com/Mananwebdev160408"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-rose-300 font-bold transition"
            >
              Manan Gupta
            </a>{' '}
            & contributors.
          </div>
          <div className="flex items-center gap-4">
            <span>License: MIT</span>
            <span>Package: dbportal v1.1.0</span>
          </div>
        </div>
      </div>
    </section>
  );
}

