import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { audioEngine } from '../../services/audioEngine';

export const MiniSpectrumBars: React.FC = React.memo(() => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary || 'var(--accent-cyan)');

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heightsRef = useRef<number[]>([0.2, 0.2, 0.2, 0.2, 0.2]);

  useEffect(() => {
    let animId: number;

    const updateBars = () => {
      if (isPlaying) {
        const freq = audioEngine.getFrequencyData();
        const raw = freq.raw;
        // Sample 5 frequency bins across the spectrum
        const b1 = (raw[2] || 0) / 255;
        const b2 = (raw[8] || 0) / 255;
        const b3 = (raw[24] || 0) / 255;
        const b4 = (raw[50] || 0) / 255;
        const b5 = (raw[90] || 0) / 255;

        const targets = [
          Math.max(0.15, Math.min(1.0, b1 * 1.3)),
          Math.max(0.15, Math.min(1.0, b2 * 1.2)),
          Math.max(0.15, Math.min(1.0, b3 * 1.3)),
          Math.max(0.15, Math.min(1.0, b4 * 1.4)),
          Math.max(0.15, Math.min(1.0, b5 * 1.5)),
        ];

        for (let i = 0; i < 5; i++) {
          heightsRef.current[i] += (targets[i] - heightsRef.current[i]) * 0.35;
          const bar = barRefs.current[i];
          if (bar) {
            bar.style.transform = `scaleY(${heightsRef.current[i]})`;
          }
        }
      } else {
        // Idle resting state
        for (let i = 0; i < 5; i++) {
          heightsRef.current[i] += (0.2 - heightsRef.current[i]) * 0.1;
          const bar = barRefs.current[i];
          if (bar) {
            bar.style.transform = `scaleY(${heightsRef.current[i]})`;
          }
        }
      }

      animId = requestAnimationFrame(updateBars);
    };

    animId = requestAnimationFrame(updateBars);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const barColor = isLucid ? lucidPrimary : 'var(--text-primary)';

  return (
    <div
      className="flex items-end justify-center gap-0.5 h-3.5 w-4.5 px-0.5 pointer-events-none select-none"
      title={isPlaying ? 'Audio FFT' : 'En pausa'}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className="w-0.5 h-full rounded-pill origin-bottom transition-transform duration-fast"
          style={{
            backgroundColor: barColor,
            opacity: 0.75 + (i % 2) * 0.25,
            transform: `scaleY(${heightsRef.current[i]})`,
            boxShadow: `0 0 4px ${barColor}`,
          }}
        />
      ))}
    </div>
  );
});
