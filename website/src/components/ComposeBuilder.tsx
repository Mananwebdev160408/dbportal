'use client';

import { useState } from 'react';
import { FileCode, Copy, Check, Container, Plus, Trash2 } from 'lucide-react';

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
      env: ['POSTGRES_USER=postgres', 'POSTGRES_PASSWORD=secret', 'POSTGRES_DB=dev_db'],
      volumes: ['pg_data:/var/lib/postgresql/data'],
    },
    redis: {
      name: 'Redis 7 Alpine',
      image: 'redis:7-alpine',
      defaultPort: '6379',
      env: ['ALLOW_EMPTY_PASSWORD=yes'],
      volumes: ['redis_data:/data'],
    },
    mongo: {
      name: 'MongoDB 7',
      image: 'mongo:7',
      defaultPort: '27017',
      env: ['MONGO_INITDB_ROOT_USERNAME=root', 'MONGO_INITDB_ROOT_PASSWORD=secret'],
      volumes: ['mongo_data:/data/db'],
    },
    nginx: {
      name: 'Nginx Proxy',
      image: 'nginx:alpine',
      defaultPort: '80',
      env: [],
      volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
    },
  };

  const curr = presets[selectedPreset];

  const generateComposeYml = () => {
    const activePort = port.trim() || curr.defaultPort;
    let yml = `version: '3.8'\n\nservices:\n  ${selectedPreset}_service:\n    image: ${curr.image}\n    container_name: dbportal_${selectedPreset}\n    ports:\n      - "${activePort}:${curr.defaultPort}"`;

    if (curr.env.length > 0) {
      yml += `\n    environment:`;
      curr.env.forEach((e) => {
        yml += `\n      - ${e}`;
      });
    }

    if (curr.volumes.length > 0) {
      yml += `\n    volumes:`;
      curr.volumes.forEach((v) => {
        yml += `\n      - ${v}`;
      });
    }

    yml += `\n    restart: always`;
    return yml;
  };

  const handleCopy = () => {
    const yml = generateComposeYml();
    navigator.clipboard.writeText(yml);
    setCopied(true);
    onToast('Exported docker-compose.yml to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="compose-builder" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
      <div className="glass-panel border border-white/10 border-t-white/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(Object.keys(presets) as Array<keyof typeof presets>).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key);
                      setPort(presets[key].defaultPort);
                    }}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedPreset === key
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-bold'
                        : 'bg-slate-900 border-[#1e2638] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Container className="w-3.5 h-3.5 text-rose-400" />
                      <span>{presets[key].name}</span>
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
                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <FileCode className="w-4 h-4" /> docker-compose.yml
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
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied docker-compose.yml!' : 'Export docker-compose.yml'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

