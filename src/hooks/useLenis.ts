import Lenis from 'lenis';
import { useEffect, useRef } from 'react';

export interface UseLenisOptions {
  enabled?: boolean;
  onScroll?: (progress: number) => void;
}

/**
 * useLenis — Apple Liquid Glass Smooth Scroll Integration
 *
 * Rules:
 * - Mobile (pointer: coarse): Native scroll preserved.
 * - Accessibility (prefers-reduced-motion): Native scroll preserved.
 * - Desktop: Lerp 1.4s with Apple exponential decay easing.
 * - Immediate destroy & cancelAnimationFrame on unmount / engine launch.
 */
export const useLenis = (optionsOrEnabled: UseLenisOptions | boolean = {}) => {
  const options: UseLenisOptions =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled }
      : optionsOrEnabled;

  const { enabled = true, onScroll } = options;
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    // Detect touch/mobile device and reduced motion preferences
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobile || prefersReduced) {
      if (onScroll) {
        const handler = () => {
          const doc = document.documentElement;
          const total = doc.scrollHeight - window.innerHeight;
          const progress = total > 0 ? window.scrollY / total : 0;
          onScroll(Math.min(1, Math.max(0, progress)));
        };
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.8,
      infinite: false,
      autoResize: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    if (onScroll) {
      lenis.on('scroll', (e: { progress: number }) => onScroll(e.progress));
    }

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, onScroll]);

  return lenisRef;
};
