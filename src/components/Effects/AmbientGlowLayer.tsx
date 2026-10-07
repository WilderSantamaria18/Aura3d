import React from 'react';
import { useAmbientGlow } from '../../hooks/useAmbientGlow';

/**
 * AmbientGlowLayer — Liquid Ambient Glow & Dual-Orb Specular Caustics
 *
 * Renders a fluid organic ambient light layer responding to cursor movement,
 * dynamic chameleon album palette metamorphosis, and audio energy.
 */
export const AmbientGlowLayer: React.FC = () => {
  const glow = useAmbientGlow();

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-[1] overflow-hidden">
      {/* Primary Floating Orb (tracks mouse with fluid inertia) */}
      <div
        className="liquid-ambient-glow absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(
            circle 900px at ${glow.x * 100}% ${glow.y * 100}%,
            var(--chameleon-glow, var(--wallpaper-glow, rgba(0, 229, 255, 0.12))),
            transparent 72%
          )`,
        }}
      />

      {/* Secondary Counter-Balanced Ambient Aura */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 mix-blend-screen opacity-60"
        style={{
          background: `radial-gradient(
            circle 750px at ${(1 - glow.x) * 100}% ${(1 - glow.y) * 100}%,
            var(--chameleon-border, rgba(168, 85, 247, 0.08)),
            transparent 68%
          )`,
        }}
      />
    </div>
  );
};

export default AmbientGlowLayer;
