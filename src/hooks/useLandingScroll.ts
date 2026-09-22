/**
 * useLandingScroll — Reactive hook for vertical scroll-snap landing experience
 *
 * Tracks scroll progress from 0.0 to 1.0 and current active channel index (0 to 3).
 * Operates without layout thrashing and supports smooth programmatic channel jumps.
 */

import { useState, useEffect, useCallback, type RefObject } from 'react';

export interface UseLandingScrollReturn {
  scrollProgress: number;
  activeChannel: number;
  scrollToChannel: (index: number) => void;
}

export const useLandingScroll = (
  containerRef?: RefObject<HTMLElement | null>
): UseLandingScrollReturn => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeChannel, setActiveChannel] = useState<number>(0);

  useEffect(() => {
    const container = containerRef?.current || document.querySelector('.landing-scroll-container');
    if (!container) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;

        setScrollProgress(progress);
        const currentChannel = Math.min(3, Math.max(0, Math.round(progress * 3)));
        setActiveChannel(currentChannel);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef]);

  const scrollToChannel = useCallback(
    (index: number) => {
      const target = document.getElementById(`canal-${index}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },
    []
  );

  return { scrollProgress, activeChannel, scrollToChannel };
};

export default useLandingScroll;
