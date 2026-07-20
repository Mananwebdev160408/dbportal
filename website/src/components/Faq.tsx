'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does dbportal discover connection strings automatically?',
      a: 'When executed without flags (npx dbportal), the CLI scans the current working directory for a .env file. It reads DATABASE_URL as well as DATABASE_URL_1 through DATABASE_URL_10, identifies the protocol prefix (e.g. postgres://, mongodb://, sqlite:), and initializes native driver pools.',
    },
    {
      q: 'Do I need Docker Desktop running to use Docker mode?',
      a: 'You need either Docker Engine, Docker Desktop, or OrbStack running locally on your machine. dbportal connects directly to the local Docker UNIX socket (/var/run/docker.sock) or Windows pipe (//./pipe/docker_engine) using dockerode.',
    },
    {
      q: 'Is dbportal safe to use with sensitive development or staging databases?',
      a: 'Yes! All connection pools opened by dbportal enforce read-only execution modes. Write transactions, updates, and table drops are explicitly forbidden in driver queries, giving you peace of mind while browsing live schemas.',
    },
    {
      q: 'Can I install dbportal globally on my system?',
      a: 'Yes, run "npm i -g dbportal". Once installed globally, you can type "dbportal" or "dbportal --docker" anywhere in your terminal without using npx.',
    },
    {
      q: 'What is the memory and performance footprint of dbportal?',
      a: 'dbportal runs as a lightweight Node.js Express server consuming ~45 MB of RAM and boots in under 1 second — unlike heavy Electron desktop applications like Docker Desktop or DBeaver which often require over 1 GB of memory.',
    },
    {
      q: 'How do I contribute to dbportal under GSSoC 2026?',
      a: 'Visit our GitHub repository at github.com/Mananwebdev160408/dbportal or join our Discord server! Check open issues tagged with GSSoC 2026, submit pull requests, and collaborate with our maintainers.',
    },
  ];

  return (
    <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 font-sans">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto font-sans">
          Everything you need to know about setting up and operating dbportal.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((f, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={f.q}
              className="tech-card rounded-xl overflow-hidden border border-[#1e2638] transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-sans text-sm sm:text-base font-semibold text-white hover:text-rose-300 transition"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{f.q}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
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

