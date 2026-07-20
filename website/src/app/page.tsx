'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

import Hero from '@/components/Hero';
import Protocols from '@/components/Protocols';
import Features from '@/components/Features';
import BottomDock from '@/components/BottomDock';
import ScrollConvergingBackground from '@/components/ScrollConvergingBackground';
import CursorGlowAndScrollProgress from '@/components/CursorGlowAndScrollProgress';
import InitialPreloader from '@/components/InitialPreloader';

// Dynamic Lazy-Loaded Heavy Interactive Components
const Simulator = dynamic(() => import('@/components/Simulator'), {
  loading: () => (
    <div className="min-h-[420px] max-w-7xl mx-auto rounded-2xl bg-[#0e1320]/40 border border-white/5 flex items-center justify-center text-slate-500 font-mono text-xs">
      <span className="w-2 h-2 rounded-full bg-rose-500/50 animate-ping mr-2" />
      Loading Sandbox Simulator...
    </div>
  ),
});

const ComposeBuilder = dynamic(() => import('@/components/ComposeBuilder'), {
  loading: () => (
    <div className="min-h-[320px] max-w-7xl mx-auto rounded-2xl bg-[#0e1320]/40 border border-white/5 flex items-center justify-center text-slate-500 font-mono text-xs">
      Loading Docker Compose Exporter...
    </div>
  ),
});

const CliBuilder = dynamic(() => import('@/components/CliBuilder'), {
  loading: () => (
    <div className="min-h-[320px] max-w-7xl mx-auto rounded-2xl bg-[#0e1320]/40 border border-white/5 flex items-center justify-center text-slate-500 font-mono text-xs">
      Loading CLI Generator...
    </div>
  ),
});

const Security = dynamic(() => import('@/components/Security'));
const ComparisonMatrix = dynamic(() => import('@/components/ComparisonMatrix'));
const Faq = dynamic(() => import('@/components/Faq'));
const Community = dynamic(() => import('@/components/Community'));

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
      {/* 1. High-Craft System Boot Preloader */}
      <InitialPreloader />

      {/* 2. Interactive Cursor Light Beam Ambient Glow */}
      <CursorGlowAndScrollProgress />

      {/* 3. Scroll-Reactive Converging 3D Background Artwork */}
      <ScrollConvergingBackground />

      {/* 4. Background Ambient Radial Lighting Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.15),transparent_70%)]" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,63,94,0.06),transparent_65%)]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,63,94,0.08),transparent_65%)]" />
      </div>

      {/* 5. Toast Notifications */}
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

      {/* 6. Main Lazy-Loaded Page Sections */}
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

      {/* 7. Bottom Navigation Command Dock */}
      <BottomDock onToast={addToast} />
    </div>
  );
}
