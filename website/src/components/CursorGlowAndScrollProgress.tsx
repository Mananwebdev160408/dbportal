'use client';

import { useEffect, useState } from 'react';

export default function CursorGlowAndScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const total = document.documentElement.scrollHeight - window.innerHeight;
          if (total > 0) {
            setScrollProgress(window.scrollY / total);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* 1. Top Glowing Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-slate-900/50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-300 transition-all duration-150 ease-out shadow-[0_0_15px_rgba(244,63,94,0.9)]"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* 2. Interactive Cursor Light Beam Ambient Glow */}
      <div
        className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-500"
        style={{
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(244,63,94,0.08), transparent 80%)`,
        }}
      />
    </>
  );
}
