import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * useSmoothScroll — Minimalist Apple-like smooth scroll engine
 * Uses Lenis with duration 1.6 and easeOutQuart curve.
 * Falls back to native scroll on mobile (pointer: coarse) and prefers-reduced-motion.
 */
export const useSmoothScroll = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile or reduced motion: use native browser scroll
    if (isMobile || prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.6,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      syncTouch: false,
    });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [enabled]);
};
