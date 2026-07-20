'use client';

import { useEffect, useState } from 'react';
import { Home, LayoutDashboard, Database, Sparkles, FileCode, Terminal, ShieldCheck, BarChart2, HelpCircle, Users, Copy, Check } from 'lucide-react';
import DbPortalLogo from './DbPortalLogo';

interface BottomDockProps {
  onToast?: (msg: string) => void;
}

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function BottomDock({ onToast }: BottomDockProps) {
  const [activeSection, setActiveSection] = useState('hero');
  const [copied, setCopied] = useState(false);

  const dockItems = [
    { id: 'hero', label: 'Overview', key: '1', icon: Home },
    { id: 'simulator', label: 'Sandbox', key: '2', icon: LayoutDashboard },
    { id: 'protocols', label: 'Drivers', key: '3', icon: Database },
    { id: 'features', label: 'Features', key: '4', icon: Sparkles },
    { id: 'compose-builder', label: 'Compose', key: '5', icon: FileCode },
    { id: 'quickstart', label: 'CLI Setup', key: '6', icon: Terminal },
    { id: 'security', label: 'Security', key: '7', icon: ShieldCheck },
    { id: 'matrix', label: 'Benchmarks', key: '8', icon: BarChart2 },
    { id: 'faq', label: 'FAQ', key: '9', icon: HelpCircle },
    { id: 'community', label: 'Community', key: '0', icon: Users },
  ];

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '-20% 0px -50% 0px',
      threshold: 0.1,
    });

    dockItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && ((e.key >= '1' && e.key <= '9') || e.key === '0')) {
        const keyVal = e.key;
        const target = dockItems.find((item) => item.key === keyVal);
        if (target) {
          e.preventDefault();
          const targetEl = document.getElementById(target.id);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
            if (onToast) onToast(`Navigated to ${target.label}`);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToast]);

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection(id);
    const targetEl = document.getElementById(id);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText('npx dbportal');
    setCopied(true);
    if (onToast) onToast('Copied "npx dbportal" to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-[95vw]">
      <div className="bg-[#0e1320]/80 border border-white/10 border-t-white/20 backdrop-blur-2xl rounded-full p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-1 font-sans text-xs">
        
        {/* Brand Badge inside Dock */}
        <a
          href="#hero"
          onClick={(e) => handleNavClick('hero', e)}
          className="dock-item relative flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition"
          aria-label="dbportal"
        >
          <DbPortalLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
          <span className="dock-tooltip font-mono font-bold text-rose-300">
            dbportal
          </span>
        </a>




        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Navigation Items */}
        {dockItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <div key={item.id} className="relative flex items-center">
              <a
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(item.id, e)}
                className={`dock-item flex items-center justify-center p-2.5 sm:p-3 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'active text-rose-300 bg-rose-500/25 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-105'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                }`}
                aria-label={item.label}
              >
                <Icon className="w-4 h-4" />
                <span className="dock-tooltip font-sans">
                  {item.label}
                </span>

              </a>

              {(idx === 2 || idx === 6) && <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />}
            </div>
          );
        })}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Quick Actions inside Dock */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleQuickCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-mono transition shadow-inner"
            title="Copy startup command"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-rose-300" /> : <Copy className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden md:inline font-semibold">npx dbportal</span>
          </button>

          <a
            href="https://github.com/Mananwebdev160408/dbportal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        </div>

      </div>
    </nav>
  );

}

