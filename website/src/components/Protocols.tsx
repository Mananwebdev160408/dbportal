'use client';

import { useState } from 'react';
import { IconDatabase, IconCopy, IconCheck } from '@tabler/icons-react';

interface ProtocolsProps {
  onToast: (msg: string) => void;
}

export default function Protocols({ onToast }: ProtocolsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const drivers = [
    {
      name: 'PostgreSQL & CockroachDB',
      protocol: 'postgresql:// / postgres://',
      example: 'postgresql://postgres:secret@localhost:5432/production_db',
      badge: 'Native Pool',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    },
    {
      name: 'MongoDB Driver',
      protocol: 'mongodb:// / mongodb+srv://',
      example: 'mongodb://root:pass@127.0.0.1:27017/analytics_db',
      badge: 'BSON Engine',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    },
    {
      name: 'MySQL & MariaDB',
      protocol: 'mysql:// / mysql2://',
      example: 'mysql://admin:password@localhost:3306/ecommerce_db',
      badge: 'Binary Stream',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    },
    {
      name: 'SQLite 3 (Embedded)',
      protocol: 'sqlite: / sqlite3:',
      example: 'sqlite://./data/application.sqlite3',
      badge: 'Zero Server',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    },
    {
      name: 'Redis K-V Store',
      protocol: 'redis:// / rediss://',
      example: 'redis://:session_secret@127.0.0.1:6379/0',
      badge: 'In-Memory',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    },
    {
      name: 'Microsoft SQL Server',
      protocol: 'mssql:// / sqlserver://',
      example: 'mssql://sa:StrongPass123@localhost:1433/enterprise_db',
      badge: 'T-SQL Pool',
      color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
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
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-display">
          Supported Connection Protocols
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-sans">
          Place your database connection strings in your <code className="text-rose-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">.env</code> file — <code className="text-rose-300 font-mono">dbportal</code> auto-detects drivers seamlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
        {drivers.map((d, idx) => (
          <div key={d.name} className="tech-card p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm sm:text-base font-sans flex items-center gap-2.5">
                  <IconDatabase className="w-5 h-5 text-rose-400" stroke={1.8} /> {d.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${d.color}`}>
                  {d.badge}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mb-3">
                Protocols: <code className="text-slate-200">{d.protocol}</code>
              </div>
              <div className="bg-[#080a11]/30 p-3 rounded-lg border border-[#1e2638]/50 text-xs text-slate-300 break-all select-all">
                {d.example}
              </div>
            </div>

            <button
              onClick={() => handleCopy(d.example, idx)}
              className="w-full py-2.5 rounded bg-[#080a11]/45 hover:bg-[#080a11]/70 text-slate-300 border border-[#1e2638]/60 hover:border-rose-500/40 text-xs transition flex items-center justify-center gap-2 font-sans font-medium"
            >
              {copiedIdx === idx ? <IconCheck className="w-4 h-4 text-rose-400" stroke={2} /> : <IconCopy className="w-4 h-4 text-slate-400" stroke={1.8} />}
              <span>{copiedIdx === idx ? 'Copied' : 'Copy Connection String'}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
