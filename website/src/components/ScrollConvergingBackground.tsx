'use client';

import { useEffect, useState } from 'react';

export default function ScrollConvergingBackground() {
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(2400);

  useEffect(() => {
    let ticking = false;

    const updateDimensions = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setMaxScroll(totalScroll);
      }
    };

    updateDimensions();

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
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Continuous scroll progress ratio (0.0 at top -> 1.0 at very bottom)
  const progress = Math.min(scrollY / Math.max(maxScroll, 1000), 1);

  // Pure 3D Singularity Convergence Math:
  // 1. Horizontal inward movement to exact center (38vw shift from 9vw to ~47vw center)
  const inwardLeftVw = progress * 38; 
  const inwardRightVw = -progress * 38; 

  // 2. Shrink size continuously down to absolute singularity (1.0 -> 0.0)
  const scaleSingularity = Math.max(1 - progress * 1.0, 0);

  // 3. Recede deep inside screen Z-depth into singularity (-1200px)
  const depthZ = -progress * 1200;

  // 4. Fade to zero right at the very end of page scroll
  const opacitySingularity = Math.max(0.75 - progress * 0.75, 0);

  // 5. Un-tilt 3D Y-rotation towards 0° as it enters center depth
  const rotYLeft = 68 * (1 - progress);
  const rotYRight = -68 * (1 - progress);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-perspective-container">
      {/* 1. TOP LEFT CRIMSON LOGO (Upper Left) */}
      <div
        className="absolute left-[3vw] sm:left-[6vw] top-[12vh] w-48 sm:w-60 md:w-[280px] transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'left center',
          transform: `perspective(1000px) translateX(${inwardLeftVw}vw) translateZ(${depthZ}px) scale(${scaleSingularity}) rotateY(${rotYLeft}deg) rotateX(${8 * (1 - progress)}deg)`,
          opacity: opacitySingularity,
        }}
      >
        <img
          src="/logo.png"
          alt="dbportal crimson logo"
          className="w-full h-auto object-contain drop-shadow-[0_0_45px_rgba(244,63,94,0.6)] group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* 2. TOP RIGHT ER SCHEMA VISUALIZER (Upper Right) */}
      <div
        className="absolute right-[3vw] sm:right-[6vw] top-[12vh] w-52 sm:w-72 md:w-[360px] transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'right center',
          transform: `perspective(1000px) translateX(${inwardRightVw}vw) translateZ(${depthZ}px) scale(${scaleSingularity}) rotateY(${rotYRight}deg) rotateX(${8 * (1 - progress)}deg)`,
          opacity: opacitySingularity,
        }}
      >
        <img
          src="/assets/schema-visualiser.png"
          alt="dbportal ER schema visualizer screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>

      {/* 3. LOWER LEFT TABLE INSPECTOR (Lower Left - Spaced 44vh below upper left) */}
      <div
        className="absolute left-[3vw] sm:left-[6vw] top-[56vh] w-52 sm:w-72 md:w-[350px] transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'left center',
          transform: `perspective(1000px) translateX(${inwardLeftVw * 1.05}vw) translateZ(${depthZ}px) scale(${scaleSingularity}) rotateY(${rotYLeft}deg)`,
          opacity: opacitySingularity,
        }}
      >
        <img
          src="/assets/table_view.png"
          alt="dbportal table view screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>

      {/* 4. LOWER RIGHT DOCKER CONTAINER INSPECTOR (Lower Right - Spaced 44vh below upper right) */}
      <div
        className="absolute right-[3vw] sm:right-[6vw] top-[56vh] w-52 sm:w-72 md:w-[350px] transition-transform duration-75 ease-out pointer-events-auto group"
        style={{
          transformOrigin: 'right center',
          transform: `perspective(1000px) translateX(${inwardRightVw * 1.05}vw) translateZ(${depthZ}px) scale(${scaleSingularity}) rotateY(${rotYRight}deg)`,
          opacity: opacitySingularity,
        }}
      >
        <img
          src="/assets/inspector_view.png"
          alt="dbportal inspector view screenshot"
          className="w-full h-auto object-cover rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] group-hover:scale-102 transition-transform duration-300"
        />
      </div>


    </div>
  );
}

