'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CliBuilderProps {
  onToast: (msg: string) => void;
}

export default function CliBuilder({ onToast }: CliBuilderProps) {
  const [mode, setMode] = useState<'npx' | 'install' | 'docker'>('npx');
  const [port, setPort] = useState('');
  const [copied, setCopied] = useState(false);

  let command = 'npx dbportal';
  if (mode === 'install') command = 'npm i -g dbportal && dbportal';
  if (mode === 'docker') command = 'npx dbportal --docker';
  if (port.trim()) command += ` --port ${port.trim()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    onToast(`Copied command: "${command}"`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="quickstart" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
      <div className="glass-panel border border-white/10 border-t-white/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-sans">
            CLI Command Builder & Setup Guide
          </h2>
          <p className="text-slate-400 text-sm font-sans">
            Generate custom startup commands or install globally via npm
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 font-mono">
          {/* Options Form */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Execution Target
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setMode('npx')}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    mode === 'npx'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  npx
                </button>
                <button
                  onClick={() => setMode('install')}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    mode === 'install'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  global install
                </button>
                <button
                  onClick={() => setMode('docker')}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    mode === 'docker'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  --docker
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Custom Port Flag (--port)
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="4444 (Default)"
                className="w-full bg-[#080a11] border border-[#1e2638] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 font-mono"
              />
            </div>

            <div className="bg-[#080a11] p-3.5 rounded-lg border border-[#1e2638] text-xs space-y-1.5 text-slate-300 font-sans">
              <span className="font-bold text-rose-400 font-mono">📁 .env Setup:</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Add <code className="text-rose-300 font-mono">DATABASE_URL="postgres://user:pass@localhost:5432/db"</code> in your project directory. Supports up to 10 numbered URLs (<code className="text-rose-300 font-mono">DATABASE_URL_1</code> to <code className="text-rose-300 font-mono">DATABASE_URL_10</code>).
              </p>
            </div>
          </div>

          {/* Generated Command Output */}
          <div className="bg-[#080a11] border border-[#1e2638] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-[#1e2638] pb-2">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" /> Shell Command
                </span>
                <span className="text-rose-400 text-[10px] font-bold">READY</span>
              </div>
              <div className="text-sm font-bold text-rose-300 bg-[#0e121e] p-4 rounded-lg border border-[#1e2638] break-all select-all">
                {command}
              </div>
            </div>

            <div className="pt-4 border-t border-[#1e2638] space-y-3 font-sans">
              <button
                onClick={handleCopy}
                className="w-full py-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Command'}</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center font-mono">
                npm package: <a href="https://www.npmjs.com/package/dbportal" target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline">npmjs.com/package/dbportal</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

