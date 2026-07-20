'use client';

import { useState } from 'react';
import { Database, Copy, Check, ExternalLink } from 'lucide-react';

interface ProtocolsProps {
  onToast: (msg: string) => void;
}

export default function Protocols({ onToast }: ProtocolsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const drivers = [
    {
      name: 'PostgreSQL & CockroachDB',
      protocol: 'postgres://, postgresql://, cockroachdb://',
      example: 'postgres://user:password@localhost:5432/my_database',
      badge: 'Relational',
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
    {
      name: 'MongoDB',
      protocol: 'mongodb://, mongodb+srv://',
      example: 'mongodb://root:secret@localhost:27017/analytics_db',
      badge: 'Document',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    {
      name: 'MySQL & MariaDB',
      protocol: 'mysql://, mariadb://',
      example: 'mysql://root:password@localhost:3306/ecommerce',
      badge: 'Relational',
      color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    },
    {
      name: 'SQLite',
      protocol: 'sqlite:',
      example: 'sqlite:./data/local_dev.db',
      badge: 'File-based',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    {
      name: 'Redis',
      protocol: 'redis://, rediss://',
      example: 'redis://:secretpass@localhost:6379/0',
      badge: 'In-Memory',
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
    {
      name: 'SQL Server (MSSQL)',
      protocol: 'mssql://',
      example: 'mssql://sa:StrongPass123@localhost:1433/enterprise_db',
      badge: 'Enterprise',
      color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    },
  ];

  const handleCopy = (str: string, idx: number) => {
    navigator.clipboard.writeText(str);
    setCopiedIdx(idx);
    onToast(`Copied connection string example!`);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <section id="protocols" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Supported Connection Protocols
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-sans">
          Place your database connection strings in your <code className="text-rose-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">.env</code> file — <code className="text-rose-300 font-mono">dbportal</code> auto-detects drivers seamlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {drivers.map((d, idx) => (
          <div key={d.name} className="tech-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm font-sans flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-400" /> {d.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${d.color}`}>
                  {d.badge}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mb-3">
                Protocols: <code className="text-slate-200">{d.protocol}</code>
              </div>
              <div className="bg-[#080a11] p-3 rounded-lg border border-[#1e2638] text-xs text-slate-300 break-all select-all">
                {d.example}
              </div>
            </div>

            <button
              onClick={() => handleCopy(d.example, idx)}
              className="w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1e2638] hover:border-rose-500/40 text-xs transition flex items-center justify-center gap-1.5 font-sans font-medium"
            >
              {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-rose-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedIdx === idx ? 'Copied' : 'Copy Connection String'}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

