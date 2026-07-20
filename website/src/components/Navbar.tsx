'use client';

import { IconTerminal, IconCopy, IconCheck, IconMessage, IconExternalLink, IconBrandGithub, IconBrandNpm } from '@tabler/icons-react';
import { useState } from 'react';

interface NavbarProps {
  onToast: (msg: string) => void;
}


export function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function NpmIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0H1.763zM5.13 5.13h13.74v13.74h-3.435V8.565h-3.435v10.305H5.13V5.13z"/>
    </svg>
  );
}

export default function Navbar({ onToast }: NavbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npx dbportal');
    setCopied(true);
    onToast('Copied "npx dbportal" to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080a11]/90 border-b border-[#1e2638] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:border-rose-400 transition">
            <IconTerminal size={16} stroke={1.75} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white group-hover:text-rose-300 transition font-mono">
              dbportal
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-rose-400 border border-rose-500/30">
              v1.1.0
            </span>
          </div>
        </a>

        {/* Action Links */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Copy */}
          <button
            onClick={handleCopy}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1e2638] hover:border-rose-400/40 transition"
          >
            <span className="text-rose-400 font-bold">$</span>
            <span>npx dbportal</span>
            {copied ? <IconCheck size={14} stroke={2} className="text-rose-400 ml-1" /> : <IconCopy size={14} stroke={1.75} className="text-slate-400 ml-1" />}
          </button>

          {/* npmjs Link */}
          <a
            href="https://www.npmjs.com/package/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
          >
            <IconBrandNpm size={16} className="text-rose-400" />
            <span className="hidden sm:inline">npmjs.com/dbportal</span>
            <IconExternalLink size={14} className="text-rose-400/70" />
          </a>

          {/* GitHub Link */}
          <a
            href="https://github.com/Mananwebdev160408/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#1e2638] transition"
          >
            <IconBrandGithub size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          {/* Discord */}
          <a
            href="https://discord.gg/YnRq6df2RY"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
          >
            <IconMessage size={16} />
            <span className="hidden lg:inline">Discord</span>
          </a>
        </div>


      </div>
    </header>
  );
}
