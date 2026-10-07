import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';

export const usePerformanceMonitor = (onDegrade?: () => void) => {
  const effectiveTier = usePlayerStore((s) => s.effectiveTier);
  const autoQuality = usePlayerStore((s) => s.autoQuality);
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const lastStateUpdateRef = useRef(performance.now());
  const prevTierRef = useRef(effectiveTier);

  useEffect(() => {
    if (prevTierRef.current !== effectiveTier && effectiveTier === 'eco') {
      onDegrade?.();
    }
    prevTierRef.current = effectiveTier;
  }, [effectiveTier, onDegrade]);

  useEffect(() => {
    let rafId: number;

    const loop = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0 && delta < 1000) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
      }

      // Throttle React state updates to 1-second intervals to eliminate re-render churn
      if (now - lastStateUpdateRef.current >= 1000) {
        lastStateUpdateRef.current = now;
        if (frameTimesRef.current.length >= 10) {
          const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          const currentFps = Math.min(120, Math.max(1, Math.round(1000 / avgDelta)));
          setFps(currentFps);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const isEco = effectiveTier === 'eco' || fps < 40;
  const isUltraEco = effectiveTier === 'eco' && fps < 28;

  return {
    fps,
    tier: effectiveTier,
    autoQuality,
    isEco,
    isUltraEco,
  };
};

export default usePerformanceMonitor;
