import React, { useState, useEffect, useRef } from 'react';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';

export const RgbGlitchOverlay: React.FC = () => {
  const { isBeat, beatPulse, features } = useAIAudioEngine();
  const { isRgbGlitchActive, isPlaying } = usePlayerStore();

  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRgbGlitchActive || !isPlaying) {
      setIsGlitching(false);
      return;
    }

    // Trigger on strong beats (bass energy > 0.60 or transient beat onset)
    if (isBeat && features.bassEnergy > 0.55) {
      setIsGlitching(true);
      setGlitchOffset({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 6,
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setIsGlitching(false);
      }, 95);
    }
  }, [isBeat, features.bassEnergy, isRgbGlitchActive, isPlaying]);

  if (!isRgbGlitchActive || !isGlitching) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 mix-blend-screen"
      style={{
        transform: `translate(${glitchOffset.x}px, ${glitchOffset.y}px) scale(${1.0 + beatPulse * 0.015})`,
      }}
    >
      {/* Cyan Displacement Channel */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08) 0%, transparent 100%)',
          clipPath: 'polygon(0 15%, 100% 18%, 100% 32%, 0 28%)',
          transform: 'translateX(-4px)',
        }}
      />

      {/* Red / Magenta Displacement Channel */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 8, 138, 0.08) 100%)',
          clipPath: 'polygon(0 65%, 100% 62%, 100% 78%, 0 82%)',
          transform: 'translateX(4px)',
        }}
      />

      {/* Micro Scanline Overlay on hit */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)',
        }}
      />
    </div>
  );
};

export default RgbGlitchOverlay;
