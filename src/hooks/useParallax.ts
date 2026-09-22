import { useEffect, useState, useRef } from 'react';
import { useLandingStore } from '../stores/landingStore';

export const useParallax = (speed: number = 0.25) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const reduceMotion = useLandingStore((s) => s.reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setOffset(0);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const scrolled = window.innerHeight - rect.top;
          const parallaxOffset = scrolled * speed * 0.1;
          setOffset(parallaxOffset);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, reduceMotion]);

  return { ref, offset };
};
