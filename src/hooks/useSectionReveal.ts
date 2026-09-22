import { useEffect, useRef, useState } from 'react';
import { useLandingStore } from '../stores/landingStore';

export const useSectionReveal = (threshold: number = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const reduceMotion = useLandingStore((s) => s.reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setIsRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect(); // One-shot reveal
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, reduceMotion]);

  return { ref, isRevealed };
};
