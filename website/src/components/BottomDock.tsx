'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  IconHome,
  IconLayoutGrid,
  IconDatabase,
  IconSparkles,
  IconCode,
  IconTerminal2,
  IconShieldCheck,
  IconChartBar,
  IconHelpCircle,
  IconUsers,
  IconCopy,
  IconCheck,
  IconBrandGithub,
} from '@tabler/icons-react';
import DbPortalLogo from './DbPortalLogo';

interface BottomDockProps {
  onToast?: (msg: string) => void;
}

export default function BottomDock({ onToast }: BottomDockProps) {
  const [activeSection, setActiveSection] = useState('hero');
  const [copied, setCopied] = useState(false);

  // Framer Motion Scroll Progress Tracker
  const { scrollYProgress } = useScroll();

  // Dynamic Conic Gradient Border starting from top (270deg) and filling clockwise with scroll
  const borderBackground = useTransform(
    scrollYProgress,
    (progress) => {
      const pct = Math.min(Math.max(progress * 100, 0.5), 100);
      return `conic-gradient(from 270deg at 50% 50%, #f43f5e 0%, #fb7185 ${pct}%, rgba(255, 255, 255, 0.12) ${pct}%, rgba(255, 255, 255, 0.12) 100%)`;
    }
  );

  const dockItems = [
    { id: 'hero', label: 'Overview', key: '1', icon: IconHome },
    { id: 'simulator', label: 'Sandbox', key: '2', icon: IconLayoutGrid },
    { id: 'protocols', label: 'Drivers', key: '3', icon: IconDatabase },
    { id: 'features', label: 'Features', key: '4', icon: IconSparkles },
    { id: 'compose-builder', label: 'Compose', key: '5', icon: IconCode },
    { id: 'quickstart', label: 'CLI Setup', key: '6', icon: IconTerminal2 },
    { id: 'security', label: 'Security', key: '7', icon: IconShieldCheck },
    { id: 'matrix', label: 'Benchmarks', key: '8', icon: IconChartBar },
    { id: 'faq', label: 'FAQ', key: '9', icon: IconHelpCircle },
    { id: 'community', label: 'Community', key: '0', icon: IconUsers },
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
      {/* Outer Dock Wrapper with Framer Motion Conic Scroll Border */}
      <div className="relative rounded-full p-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Dynamic Framer Motion Scroll Progress Conic Glow Border */}
        <motion.div
          className="absolute -inset-[200%] pointer-events-none z-0 shadow-[0_0_20px_rgba(244,63,94,0.6)]"
          style={{ background: borderBackground }}
        />

        {/* Inner Dock Bar */}
        <div className="bg-[#0e1320]/90 border border-white/10 backdrop-blur-2xl rounded-full p-2 flex items-center gap-1 font-sans text-xs relative z-10">
          
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
                      ? 'active text-rose-300 bg-rose-500/25 border border-rose-500/50 shadow-[0_0_18px_rgba(244,63,94,0.35)] scale-105'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                  }`}
                  aria-label={item.label}
                >
                  <Icon size={19} stroke={1.75} />
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
              {copied ? <IconCheck size={15} stroke={2} className="text-rose-300" /> : <IconCopy size={15} stroke={1.75} className="text-rose-400" />}
              <span className="hidden md:inline font-semibold">npx dbportal</span>
            </button>

            <a
              href="https://github.com/Mananwebdev160408/dbportal"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="GitHub Repository"
            >
              <IconBrandGithub size={19} stroke={1.75} />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
