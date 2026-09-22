import Lenis from 'lenis';
import { useEffect, useRef } from 'react';
import { useLandingStore } from '../stores/landingStore';

export const useLenis = (enabled: boolean = true) => {
  const lenisRef = useRef<Lenis | null>(null);
  const reduceMotion = useLandingStore((s) => s.reduceMotion);

  useEffect(() => {
    // Check for touch device or reduced motion
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!enabled || reduceMotion || isTouch) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, reduceMotion]);

  return lenisRef;
};
