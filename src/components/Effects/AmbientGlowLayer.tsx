import React from 'react';
import { useAmbientGlow } from '../../hooks/useAmbientGlow';

export const AmbientGlowLayer: React.FC = () => {
  const glow = useAmbientGlow();
  return (
    <div
      className="liquid-ambient-glow"
      style={{
        background: `radial-gradient(
          circle 800px at ${glow.x * 100}% ${glow.y * 100}%,
          rgba(0, 229, 255, 0.06),
          transparent 70%
        )`,
      }}
    />
  );
};
