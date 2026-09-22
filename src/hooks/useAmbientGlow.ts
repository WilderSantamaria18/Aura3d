import { useState, useEffect, useRef } from 'react';

export const useAmbientGlow = (throttleMs = 16) => {
  const [glow, setGlow] = useState({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastUpdateRef.current < throttleMs) return;
      lastUpdateRef.current = now;
      
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setGlow({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        });
      });
    };
    
    window.addEventListener('mousemove', handler, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [throttleMs]);

  return glow;
};
