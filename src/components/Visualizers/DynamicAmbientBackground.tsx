import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useVisualizer } from '../../hooks/useVisualizer';

/**
 * DynamicAmbientBackground
 * Fondo cinético difuminado de alta fidelidad con orbes de luz líquida y reactividad musical sutil.
 * Proporciona el efecto de "colores difuminados / ambient blur" para todos los visualizadores.
 */
export const DynamicAmbientBackground: React.FC = () => {
  const { isLucid, lucidTheme, autoMode, dynamicColor, hasStarted } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.18);

  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const orb4Ref = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) * 0.001;
      const { bass, mids, energy } = getSmoothedData();

      // Audio-reactive scale & intensity
      const pulse1 = 1 + bass * 0.14 + Math.sin(elapsed * 0.8) * 0.05;
      const pulse2 = 1 + mids * 0.12 + Math.cos(elapsed * 0.7) * 0.05;
      const pulse3 = 1 + energy * 0.15 + Math.sin(elapsed * 0.6 + 1.5) * 0.04;
      const pulse4 = 1 + bass * 0.10 + Math.cos(elapsed * 0.5 + 2.0) * 0.04;

      const opac1 = Math.min(0.55, 0.22 + bass * 0.28);
      const opac2 = Math.min(0.50, 0.18 + mids * 0.24);
      const opac3 = Math.min(0.45, 0.16 + energy * 0.22);
      const opac4 = Math.min(0.40, 0.14 + bass * 0.20);

      // Orbital motion displacements
      const x1 = Math.sin(elapsed * 0.4) * 80;
      const y1 = Math.cos(elapsed * 0.35) * 60;
      const x2 = Math.cos(elapsed * 0.3) * -70;
      const y2 = Math.sin(elapsed * 0.45) * -50;
      const x3 = Math.sin(elapsed * 0.25 + 1.0) * 60;
      const y3 = Math.cos(elapsed * 0.3 + 1.2) * 70;
      const x4 = Math.cos(elapsed * 0.2 + 2.0) * 50;
      const y4 = Math.sin(elapsed * 0.28 + 2.5) * -60;

      if (orb1Ref.current) {
        orb1Ref.current.style.transform = `translate3d(${x1}px, ${y1}px, 0) scale(${pulse1})`;
        orb1Ref.current.style.opacity = `${opac1}`;
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate3d(${x2}px, ${y2}px, 0) scale(${pulse2})`;
        orb2Ref.current.style.opacity = `${opac2}`;
      }
      if (orb3Ref.current) {
        orb3Ref.current.style.transform = `translate3d(${x3}px, ${y3}px, 0) scale(${pulse3})`;
        orb3Ref.current.style.opacity = `${opac3}`;
      }
      if (orb4Ref.current) {
        orb4Ref.current.style.transform = `translate3d(${x4}px, ${y4}px, 0) scale(${pulse4})`;
        orb4Ref.current.style.opacity = `${opac4}`;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [getSmoothedData]);

  // Color selection
  const color1 = isLucid
    ? lucidTheme.primary
    : autoMode && dynamicColor
    ? dynamicColor
    : '#00f2fe'; // Cyan / Azure

  const color2 = isLucid
    ? lucidTheme.secondary
    : autoMode && dynamicColor
    ? `${dynamicColor}cc`
    : '#7928ca'; // Deep Electric Violet

  const color3 = isLucid
    ? `${lucidTheme.primary}aa`
    : '#ff0080'; // Sonic Magenta

  const color4 = isLucid
    ? `${lucidTheme.secondary}88`
    : '#00dfd8'; // Radiant Emerald / Turquoise

  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 transition-opacity duration-1000 ${
        hasStarted ? 'opacity-100' : 'opacity-40'
      }`}
      style={{
        backgroundColor: '#03050c',
      }}
    >
      {/* ── Layer 1: Ambient Mesh Gradient Blobs with Heavy Blur ── */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          filter: 'blur(90px) saturate(180%)',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {/* Orb 1: Top-Left Cyan / Primary */}
        <div
          ref={orb1Ref}
          className="absolute -top-[10%] -left-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${color1} 0%, ${color1}44 45%, transparent 70%)`,
            willChange: 'transform, opacity',
          }}
        />

        {/* Orb 2: Bottom-Right Deep Violet / Secondary */}
        <div
          ref={orb2Ref}
          className="absolute -bottom-[15%] -right-[15%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${color2} 0%, ${color2}44 50%, transparent 75%)`,
            willChange: 'transform, opacity',
          }}
        />

        {/* Orb 3: Top-Right Sonic Magenta / Accent */}
        <div
          ref={orb3Ref}
          className="absolute -top-[15%] right-[5%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${color3} 0%, ${color3}33 50%, transparent 75%)`,
            willChange: 'transform, opacity',
          }}
        />

        {/* Orb 4: Bottom-Left Turquoise / Depth */}
        <div
          ref={orb4Ref}
          className="absolute bottom-[5%] -left-[10%] w-[50vw] h-[50vw] max-w-[620px] max-h-[620px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${color4} 0%, ${color4}33 45%, transparent 70%)`,
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* ── Layer 2: Vignette Depth Shield (Centers contrast on the 3D / 2D elements) ── */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(3, 5, 12, 0.40) 0%, rgba(3, 5, 12, 0.75) 60%, #03050c 100%)',
        }}
      />

      {/* ── Layer 3: Ultra-subtle Micro-grain Film Texture (Prevents color banding) ── */}
      <div
        className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

export default DynamicAmbientBackground;
