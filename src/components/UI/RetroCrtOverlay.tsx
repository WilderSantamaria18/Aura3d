import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';

/**
 * RetroCrtOverlay
 * Filtro analógico de precisión: Scanlines CRT, sutil aberración cromática en bordes
 * y grano de película analógica de 35mm. GPU-acelerado y sin sobrecarga de CPU.
 */
export const RetroCrtOverlay: React.FC = React.memo(() => {
  const isRetroCrtActive = usePlayerStore((s) => s.isRetroCrtActive);

  if (!isRetroCrtActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. CRT Scanlines (Ultra-fine 3px horizontal phosphor pitch) */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.65) 50%)',
          backgroundSize: '100% 3px',
        }}
      />

      {/* 2. Vintage 35mm Film Grain Noise (SVG procedurally synthesized) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] mix-blend-screen">
        <filter id="aura-retro-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#aura-retro-grain)" />
      </svg>

      {/* 3. Curved Tube Vignette & Chromatic Barrel Distortion */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.45) 88%, rgba(0, 0, 0, 0.85) 100%)',
          boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.7)',
        }}
      />

      {/* 4. Subtle Phosphor Corner Bleed (Analog Green/Amber tube fringe) */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none"
        style={{
          boxShadow: 'inset 2px 0 0 rgba(255, 0, 80, 0.3), inset -2px 0 0 rgba(0, 240, 255, 0.3)',
        }}
      />
    </div>
  );
});

export default RetroCrtOverlay;
