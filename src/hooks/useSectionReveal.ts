import { useEffect, useRef, useState } from 'react';

export const useSectionReveal = <T extends HTMLElement = HTMLDivElement>(
  optionsOrThreshold: IntersectionObserverInit | number = {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px',
  }
) => {
  const options: IntersectionObserverInit =
    typeof optionsOrThreshold === 'number'
      ? { threshold: optionsOrThreshold, rootMargin: '0px 0px -100px 0px' }
      : optionsOrThreshold;

  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isRevealed) {
        setIsRevealed(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [isRevealed, options.threshold, options.rootMargin]);

  return { ref, isRevealed };
};
