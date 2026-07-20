"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InitialPreloaderProps {
  onComplete?: () => void;
}

export default function InitialPreloader({
  onComplete,
}: InitialPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1600; // Smooth 1.6s progress fill

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const pct = Math.min(Math.floor((elapsed / duration) * 100), 100);

      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(step);
      } else {
        setIsZooming(true);
        setTimeout(() => {
          setIsLoading(false);
          if (onComplete) onComplete();
        }, 500);
      }
    };

    const animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [onComplete]);

  // SVG Gauge dimensions clearly outside the central logo
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.35, ease: "easeOut" },
          }}
          className="fixed inset-0 z-[100] bg-[#080a11] flex flex-col items-center justify-center pointer-events-auto selection:bg-rose-500/30 text-white font-sans overflow-hidden transform-gpu"
        >
          {/* Crimson Laser Beam Ambient Glow behind Keyhole */}
          <motion.div
            animate={
              isZooming
                ? { scale: [1, 20], opacity: [0.8, 0] }
                : { opacity: [0.6, 0.9, 0.6], scale: [0.95, 1.05, 0.95] }
            }
            transition={
              isZooming
                ? { duration: 0.5, ease: [0.7, 0, 0.1, 1] }
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
            className="absolute w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.6)_0%,rgba(244,63,94,0.15)_50%,transparent_75%)] pointer-events-none transform-gpu"
          />

          {/* Central 3D Keyhole Iris & Gauge Ring Wrapper */}
          <motion.div
            animate={
              isZooming
                ? {
                    scale: 28,
                    opacity: [1, 0.85, 0],
                  }
                : { scale: 1, opacity: 1 }
            }
            transition={{
              duration: 0.55,
              ease: [0.7, 0, 0.1, 1],
            }}
            className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center pointer-events-none transform-gpu will-change-transform"
          >
            {/* 1. Large Circular Gauge Ring (Outside Logo Boundary) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible z-20">
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="4"
              />
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                fill="none"
                stroke="url(#laserGradient)"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-75 ease-out filter drop-shadow-[0_0_15px_rgba(244,63,94,0.95)]"
              />
              <defs>
                <linearGradient
                  id="laserGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#9f1239" />
                  <stop offset="50%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
            </svg>

            {/* 2. Central Keyhole Logo Iris */}
            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="dbportal keyhole iris logo"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_0_35px_rgba(244,63,94,0.95)]"
              />
            </div>
          </motion.div>

          {/* Numeric Percentage & Status Indicator */}
          <motion.div
            animate={isZooming ? { opacity: 0, y: 15 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-2 font-mono mt-6 z-30"
          >
            <div className="text-3xl sm:text-4xl font-black text-white tracking-widest flex items-center gap-1">
              <span className="text-rose-400">{progress}</span>
              <span className="text-rose-500 text-xl">%</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-300 font-semibold">
                {progress < 100
                  ? "Charging Keyhole Iris..."
                  : "Passing Through Keyhole..."}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
