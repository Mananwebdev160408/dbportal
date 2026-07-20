'use client';

import { useState } from 'react';
import { IconChevronDown, IconHelpCircle } from '@tabler/icons-react';

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does dbportal discover connection strings automatically?',
      a: 'When executed without flags (npx dbportal), the CLI scans the current working directory for a .env file. It reads DATABASE_URL as well as DATABASE_URL_1 through DATABASE_URL_10, identifies the protocol prefix (e.g. postgres://, mongodb://, sqlite:), and initializes native driver pools.',
    },
    {
      q: 'Is dbportal really read-only safe?',
      a: 'Yes. dbportal strictly enforces read-only connection parameters on PostgreSQL, Mongo, MySQL, and SQLite drivers, as well as enforcing read-only query safety checks to eliminate accidental mutations.',
    },
    {
      q: 'Does dbportal send any telemetry or cloud analytics?',
      a: 'Zero. dbportal operates completely air-gapped on 127.0.0.1:4444. No data, credentials, metrics, or telemetry ever leaves your localhost environment.',
    },
    {
      q: 'How does dbportal find my database connections?',
      a: 'When executed inside a project folder, dbportal auto-parses your local .env file looking for standard DATABASE_URL, MONGO_URI, MYSQL_URL, and REDIS_URL environment variables.',
    },
    {
      q: 'Can I manage local Docker containers with dbportal?',
      a: 'Yes. By running `npx dbportal --docker`, dbportal attaches directly to your local Docker socket (/var/run/docker.sock), giving you an instant GUI for container status, logs, metrics, and compose exports.',
    },
    {
      q: 'Why single-command execution instead of installing an app?',
      a: 'Heavy desktop DB apps require updates, license keys, and disk space. `npx dbportal` launches instantly on demand and leaves zero background daemon footprint after exit.',
    },
  ];

  return (
    <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-3 font-sans">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-400 text-sm font-sans">
          Everything you need to know about dbportal architecture, security, and usage.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={f.q}
              className="tech-card rounded-xl overflow-hidden border border-[#1e2638] bg-[#0c101c]"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-sans text-sm sm:text-base font-semibold text-white hover:text-rose-300 transition"
              >
                <span className="flex items-center gap-2.5">
                  <IconHelpCircle size={18} stroke={1.75} className="text-rose-400 shrink-0" />
                  <span>{f.q}</span>
                </span>
                <IconChevronDown
                  size={18}
                  stroke={1.75}
                  className={`text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-rose-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-[#1e2638] bg-[#080a11] font-sans">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

