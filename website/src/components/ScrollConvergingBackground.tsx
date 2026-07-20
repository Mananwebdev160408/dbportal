'use client';

import { useEffect, useState } from 'react';

export default function ScrollConvergingBackground() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Continuous scroll progress ratio (0 at top -> 1 as user scrolls down)
  const progress = Math.min(scrollY / 850, 1);

  // 1. Initial 90° (75°) inward tilt from extreme edges at scrollY=0
  // Left assets start tilted ~72° inward from the far left edge.
  // As user scrolls, they swing open (72° -> 8°) and glide inwards toward center.
  const leftRotY = 72 - progress * 64; 
  const leftTranslateX = progress * 260; // Shifts inwards towards center

  // Right assets start tilted ~-72° inward from the far right edge.
  // As user scrolls, they swing open (-72° -> -8°) and glide inwards toward center.
  const rightRotY = -72 + progress * 64;
  const rightTranslateX = -progress * 260; // Shifts inwards towards center

  const floatY = scrollY * 0.3; // Smooth parallax flow down
  const opacityVal = 0.45 + progress * 0.35; // Brightens to clear view as it unfolds into center

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-perspective-container">
      {/* 1. TOP LEFT CRIMSON LOGO - Starts 75° inward tilt from far left edge */}
      <div
        className="absolute left-0 top-16 w-56 sm:w-72 md:w-88 transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'left center',
          transform: `perspective(1000px) translateY(${floatY}px) translateX(${leftTranslateX}px) rotateY(${leftRotY}deg) rotateX(${8 - progress * 6}deg)`,
          opacity: opacityVal,
        }}
      >
        <img
          src="/logo.png"
          alt="dbportal crimson logo"
          className="w-full h-auto object-contain drop-shadow-[0_0_50px_rgba(244,63,94,0.6)] group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* 2. TOP RIGHT ER SCHEMA VISUALIZER - Starts -75° inward tilt from far right edge */}
      <div
        className="absolute right-0 top-24 w-64 sm:w-88 md:w-[430px] transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'right center',
          transform: `perspective(1000px) translateY(${floatY * 0.9}px) translateX(${rightTranslateX}px) rotateY(${rightRotY}deg) rotateX(${8 - progress * 6}deg)`,
          opacity: opacityVal,
        }}
      >
        <img
          src="/assets/schema-visualiser.png"
          alt="dbportal ER schema visualizer screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>

      {/* 3. MID LEFT TABLE INSPECTOR - Starts 75° inward tilt from far left edge */}
      <div
        className="absolute left-0 top-[480px] w-64 sm:w-88 md:w-[410px] transition-transform duration-75 ease-out pointer-events-auto hidden md:block group"
        style={{
          transformOrigin: 'left center',
          transform: `perspective(1000px) translateY(${floatY * 0.75}px) translateX(${leftTranslateX * 1.15}px) rotateY(${leftRotY}deg) rotateX(${6 - progress * 4}deg)`,
          opacity: Math.min(0.4 + progress * 0.4, 0.85),
        }}
      >
        <img
          src="/assets/table_view.png"
          alt="dbportal table view screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>

      {/* 4. MID RIGHT DOCKER CONTAINER INSPECTOR - Starts -75° inward tilt from far right edge */}
      <div
        className="absolute right-0 top-[540px] w-64 sm:w-88 md:w-[410px] transition-transform duration-75 ease-out pointer-events-auto hidden md:block group"
        style={{
          transformOrigin: 'right center',
          transform: `perspective(1000px) translateY(${floatY * 0.75}px) translateX(${rightTranslateX * 1.15}px) rotateY(${rightRotY}deg) rotateX(${6 - progress * 4}deg)`,
          opacity: Math.min(0.4 + progress * 0.4, 0.85),
        }}
      >
        <img
          src="/assets/inspector_view.png"
          alt="dbportal inspector view screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>
    </div>
  );
}



