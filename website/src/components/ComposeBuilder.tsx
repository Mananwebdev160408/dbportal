'use client';

import { useState } from 'react';
import {
  IconCode,
  IconCopy,
  IconCheck,
  IconBox,
} from '@tabler/icons-react';


interface ComposeBuilderProps {
  onToast: (msg: string) => void;
}


export default function ComposeBuilder({ onToast }: ComposeBuilderProps) {
  const [selectedPreset, setSelectedPreset] = useState<'postgres' | 'redis' | 'mongo' | 'nginx'>('postgres');
  const [port, setPort] = useState('5432');
  const [copied, setCopied] = useState(false);

  const presets = {
    postgres: {
      name: 'PostgreSQL 16',
      image: 'postgres:16-alpine',
      defaultPort: '5432',
      env: ['POSTGRES_USER=postgres', 'POSTGRES_PASSWORD=secret', 'POSTGRES_DB=app_db'],
    },
    redis: {
      name: 'Redis 7',
      image: 'redis:7-alpine',
      defaultPort: '6379',
      env: [],
    },
    mongo: {
      name: 'MongoDB 7',
      image: 'mongo:7-jammy',
      defaultPort: '27017',
      env: ['MONGO_INITDB_ROOT_USERNAME=root', 'MONGO_INITDB_ROOT_PASSWORD=secret'],
    },
    nginx: {
      name: 'Nginx Alpine',
      image: 'nginx:alpine',
      defaultPort: '80',
      env: [],
    },
  };

  const curr = presets[selectedPreset];

  const generateComposeYml = () => {
    let envString = '';
    if (curr.env.length > 0) {
      envString = `    environment:\n${curr.env.map((e) => `      - ${e}`).join('\n')}\n`;
    }

    return `version: '3.8'

services:
  ${selectedPreset}_db:
    image: ${curr.image}
    container_name: local_${selectedPreset}_dbportal
    ports:
      - "${port || curr.defaultPort}:${curr.defaultPort}"
${envString}    restart: unless-stopped`;
  };

  const handleCopy = () => {
    const yml = generateComposeYml();
    navigator.clipboard.writeText(yml);
    setCopied(true);
    onToast('Exported clean docker-compose.yml!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="compose-builder" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24">
      <div className="glass-panel rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-sans">
            Visual Container Launcher & Compose Exporter
          </h2>
          <p className="text-slate-400 text-sm font-sans">
            Launch containers directly in <code className="text-rose-300 font-mono">dbportal</code> or export valid <code className="text-rose-300 font-mono">docker-compose.yml</code> specs.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
          {/* Preset Form */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Container Preset
              </label>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {(Object.keys(presets) as Array<keyof typeof presets>).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key);
                      setPort(presets[key].defaultPort);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPreset === key
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold shadow-md'
                        : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconBox className="w-4 h-4 text-rose-400" stroke={1.8} />
                      <span className="font-semibold text-white">{presets[key].name}</span>
                    </div>

                    <div className="text-[10px] text-slate-500">{presets[key].image}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Host Port Binding
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder={curr.defaultPort}
                className="w-full bg-[#080a11] border border-[#1e2638] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 font-mono"
              />
            </div>

            <div className="bg-[#080a11] p-3.5 rounded-lg border border-[#1e2638] text-xs space-y-2">
              <span className="font-bold text-slate-300">Environment Defaults:</span>
              <div className="space-y-1">
                {curr.env.map((e) => (
                  <div key={e} className="text-[11px] text-rose-300">
                    + ENV {e}
                  </div>
                ))}
                {curr.env.length === 0 && <div className="text-[11px] text-slate-500">No environment variables required</div>}
              </div>
            </div>
          </div>

          {/* Code Block Exporter */}
          <div className="bg-[#080a11] border border-[#1e2638] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-[#1e2638] pb-2">
                <span className="flex items-center gap-2 text-rose-300 font-semibold">
                  <IconCode className="w-5 h-5 text-rose-400" stroke={1.8} /> docker-compose.yml
                </span>

                <span className="text-rose-400 text-[10px] font-bold">VALID YML</span>
              </div>
              <pre className="text-xs text-rose-300 bg-[#0e121e] p-4 rounded-lg border border-[#1e2638] overflow-x-auto whitespace-pre font-mono leading-relaxed select-all">
                {generateComposeYml()}
              </pre>
            </div>

            <div className="pt-4 border-t border-[#1e2638] space-y-3 font-sans">
              <button
                onClick={handleCopy}
                className="w-full py-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {copied ? <IconCheck className="w-4 h-4 text-white" stroke={2} /> : <IconCopy className="w-4 h-4 text-white" stroke={2} />}
                <span>{copied ? 'Copied docker-compose.yml!' : 'Export docker-compose.yml'}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
