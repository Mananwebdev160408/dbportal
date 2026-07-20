'use client';

import { useState } from 'react';
import { IconCopy, IconCheck, IconTerminal2 } from '@tabler/icons-react';

interface CliBuilderProps {
  onToast: (msg: string) => void;
}

export default function CliBuilder({ onToast }: CliBuilderProps) {
  const [mode, setMode] = useState<'npx' | 'docker'>('npx');
  const [port, setPort] = useState('');
  const [envFile, setEnvFile] = useState('.env');
  const [readOnly, setReadOnly] = useState(true);
  const [copied, setCopied] = useState(false);

  const getGeneratedCommand = () => {
    if (mode === 'docker') {
      let cmd = 'npx dbportal --docker';
      if (port.trim()) cmd += ` --port ${port.trim()}`;
      return cmd;
    }

    let cmd = 'npx dbportal';
    const flags: string[] = [];

    if (port.trim() && port.trim() !== '4444') {
      flags.push(`--port ${port.trim()}`);
    }
    if (envFile.trim() && envFile.trim() !== '.env') {
      flags.push(`--env ${envFile.trim()}`);
    }
    if (readOnly) {
      flags.push('--read-only');
    }

    if (flags.length > 0) {
      cmd += ' ' + flags.join(' ');
    }
    return cmd;
  };

  const command = getGeneratedCommand();

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    onToast(`Copied "${command}" to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="quickstart" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
      <div className="glass-panel border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-sans">
            Interactive CLI Command Builder
          </h2>
          <p className="text-slate-400 text-sm font-sans">
            Tailor startup parameters, port bindings, and connection flags visually.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
          {/* Options Panel */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Execution Mode
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setMode('npx')}
                  className={`p-3 rounded-lg border text-left font-mono transition ${
                    mode === 'npx'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-white mb-0.5">npx dbportal</div>
                  <div className="text-[10px] text-slate-500">Auto .env explorer</div>
                </button>

                <button
                  onClick={() => setMode('docker')}
                  className={`p-3 rounded-lg border text-left font-mono transition ${
                    mode === 'docker'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-white mb-0.5">--docker</div>
                  <div className="text-[10px] text-slate-500">Docker Daemon GUI</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Custom Web GUI Port
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="4444 (Default)"
                className="w-full bg-[#080a11] border border-[#1e2638] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 font-mono"
              />
            </div>

            {mode === 'npx' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Environment File Path
                  </label>
                  <input
                    type="text"
                    value={envFile}
                    onChange={(e) => setEnvFile(e.target.value)}
                    placeholder=".env"
                    className="w-full bg-[#080a11] border border-[#1e2638] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#080a11] border border-[#1e2638] rounded-lg">
                  <div className="text-xs">
                    <div className="font-bold text-slate-200">Enforce Read-Only Safety</div>
                    <div className="text-[10px] text-slate-400">Block destructive SQL queries</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={readOnly}
                    onChange={(e) => setReadOnly(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Generated Command Output */}
          <div className="bg-[#080a11] border border-[#1e2638] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-[#1e2638] pb-2">
                <span className="flex items-center gap-2 font-semibold text-slate-300">
                  <IconTerminal2 className="w-5 h-5 text-rose-400" stroke={1.8} /> Shell Command
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
                {copied ? <IconCheck className="w-4 h-4 text-white" stroke={2} /> : <IconCopy className="w-4 h-4 text-white" stroke={2} />}
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
