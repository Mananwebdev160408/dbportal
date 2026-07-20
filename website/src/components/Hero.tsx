'use client';

import { useState } from 'react';
import { ShieldCheck, WifiOff, Copy, Check, ExternalLink, Sparkles, Database, Container, Layers } from 'lucide-react';

interface HeroProps {
  onToast: (msg: string) => void;
}

function NpmIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0H1.763zM5.13 5.13h13.74v13.74h-3.435V8.565h-3.435v10.305H5.13V5.13z"/>
    </svg>
  );
}

export default function Hero({ onToast }: HeroProps) {
  const [activeTab, setActiveTab] = useState<'npx' | 'install' | 'docker'>('npx');
  const [copied, setCopied] = useState(false);

  const getCommand = () => {
    if (activeTab === 'npx') return 'npx dbportal';
    if (activeTab === 'install') return 'npm i -g dbportal';
    return 'npx dbportal --docker';
  };

  const handleCopy = () => {
    const cmd = getCommand();
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    onToast(`Copied "${cmd}" to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="hero" className="pt-8 sm:pt-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center scroll-mt-24">
      {/* Top Status Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <a
          href="https://www.npmjs.com/package/dbportal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono hover:bg-rose-500/20 transition backdrop-blur-md"
        >
          <NpmIcon className="w-3.5 h-3.5 text-rose-400" />
          <span>npm v1.1.0</span>
          <ExternalLink className="w-3 h-3 text-rose-400/70" />
        </a>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans font-medium backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
          <span>GSSoC 2026 Featured</span>
        </div>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto font-sans">
        Single-Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-rose-200">Database Explorer</span> & Docker Manager
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
        Stop wrestling with heavy desktop clients. Inspect PostgreSQL, Mongo, MySQL, SQLite, Redis & Docker containers directly in your browser — zero config, 100% local, read-only safe.
      </p>

      {/* Glassmorphic Launcher & Command Showcase */}
      <div className="max-w-3xl mx-auto glass-panel rounded-2xl border border-white/10 border-t-white/20 p-6 sm:p-8 shadow-2xl text-left">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm font-sans">Quick Launcher</h3>
              <p className="text-xs text-slate-400 font-sans">Run locally in any project directory</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#080a11]/60 p-1 rounded-xl border border-white/10 backdrop-blur-md font-mono text-xs">
            <button
              onClick={() => setActiveTab('npx')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'npx'
                  ? 'bg-rose-500/25 text-rose-200 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              npx
            </button>
            <button
              onClick={() => setActiveTab('install')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'install'
                  ? 'bg-rose-500/25 text-rose-200 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              global install
            </button>
            <button
              onClick={() => setActiveTab('docker')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'docker'
                  ? 'bg-rose-500/25 text-rose-200 font-bold border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              --docker
            </button>
          </div>
        </div>

        {/* Command Box */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-[#080a11]/80 backdrop-blur-xl p-4 rounded-xl border border-white/10 gap-3">
            <div className="flex items-center gap-3 font-mono text-sm sm:text-base">
              <span className="text-rose-400 font-bold">$</span>
              <span className="text-white font-semibold select-all tracking-wide">{getCommand()}</span>
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white border border-rose-400/40 text-xs font-sans font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              <span>{copied ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>

          {/* Key Value Propositions Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left font-sans">
                <div className="text-xs font-bold text-white">Auto .env Fleet</div>
                <div className="text-[11px] text-slate-400">PG, Mongo, MySQL, Redis</div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left font-sans">
                <div className="text-xs font-bold text-white">Read-Only Safe</div>
                <div className="text-[11px] text-slate-400">Zero mutation risk</div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="text-left font-sans">
                <div className="text-xs font-bold text-white">100% Localhost</div>
                <div className="text-[11px] text-slate-400">Bound to 127.0.0.1:4444</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


