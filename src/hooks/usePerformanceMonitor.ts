import { useEffect, useState, useRef } from 'react';

export const usePerformanceMonitor = (onDegrade?: () => void) => {
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const lowFpsCounterRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    
    const loop = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
      
      const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const currentFps = Math.round(1000 / avgDelta);
      setFps(currentFps);
      
      // Automatic degradation safeguard if FPS < 45 for ~2s
      if (currentFps < 45) {
        lowFpsCounterRef.current++;
        if (lowFpsCounterRef.current > 120) {
          onDegrade?.();
          lowFpsCounterRef.current = 0;
        }
      } else {
        lowFpsCounterRef.current = 0;
      }
      
      rafId = requestAnimationFrame(loop);
    };
    
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onDegrade]);

  const isEco = fps < 45;
  const isUltraEco = fps < 30;

  return { fps, isEco, isUltraEco };
};
