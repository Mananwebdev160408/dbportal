'use client';

import { useState } from 'react';
import Hero from '@/components/Hero';
import Simulator from '@/components/Simulator';
import Protocols from '@/components/Protocols';
import Features from '@/components/Features';
import ComposeBuilder from '@/components/ComposeBuilder';
import CliBuilder from '@/components/CliBuilder';
import Security from '@/components/Security';
import ComparisonMatrix from '@/components/ComparisonMatrix';
import Faq from '@/components/Faq';
import Community from '@/components/Community';
import BottomDock from '@/components/BottomDock';

interface ToastItem {
  id: number;
  message: string;
}

export default function Home() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  return (
    <div className="relative min-h-screen bg-[#080a11] text-slate-100 selection:bg-rose-500/30 selection:text-rose-200">
      {/* Background Ambient Radial Lighting Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.15),transparent_70%)]" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_65%)]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,63,94,0.08),transparent_65%)]" />
      </div>

      {/* Toast Notification */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto px-4 py-3 rounded-xl border border-rose-500/30 bg-[#0e1320]/90 text-rose-300 font-sans text-xs font-semibold shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-slide-in"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Main Sections */}
      <main className="relative z-10 space-y-28 pt-12 pb-36">
        <Hero onToast={addToast} />
        <Simulator onToast={addToast} />
        <Protocols onToast={addToast} />
        <Features />
        <ComposeBuilder onToast={addToast} />
        <CliBuilder onToast={addToast} />
        <Security />
        <ComparisonMatrix />
        <Faq />
        <Community />
      </main>

      {/* Bottom Command Dock */}
      <BottomDock onToast={addToast} />
    </div>
  );
}


