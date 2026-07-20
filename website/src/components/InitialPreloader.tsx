'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DbPortalLogo from './DbPortalLogo';

interface InitialPreloaderProps {
  onComplete?: () => void;
}

export default function InitialPreloader({ onComplete }: InitialPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing dbportal engine...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const steps = [
      { p: 25, text: 'Binding loopback 127.0.0.1:4444...' },
      { p: 60, text: 'Inspecting PostgreSQL, Mongo & Docker drivers...' },
      { p: 90, text: 'Enforcing read-only execution safety...' },
      { p: 100, text: 'Engine Ready.' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsLoading(false);
          if (onComplete) onComplete();
        }, 250);
      }
    }, 160);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[100] bg-[#080a11] flex flex-col items-center justify-center pointer-events-auto selection:bg-rose-500/30 text-white font-sans"
        >
          {/* Central Logo with Glowing Keyhole Pulse */}
          <div className="relative mb-8 flex flex-col items-center">
            <motion.div
              animate={{
                scale: [0.97, 1.03, 0.97],
                opacity: [0.85, 1, 0.85],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              <DbPortalLogo className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_45px_rgba(244,63,94,0.7)]" />
            </motion.div>
          </div>

          {/* Minimalist Progress Line */}
          <div className="w-64 sm:w-80 h-[2.5px] bg-white/10 rounded-full overflow-hidden mb-5 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.9)]"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
          </div>

          {/* Monospace System Boot Status Line */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 h-6">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-300 font-semibold">{statusText}</span>
            <span className="text-slate-500 font-bold ml-1">{progress}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
