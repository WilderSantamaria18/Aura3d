import { useEffect } from 'react';

export const useLiquidGlassScrollbar = (ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    let scrollTimeout: ReturnType<typeof setTimeout>;
    
    const handleScroll = () => {
      el.classList.add('is-scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        el.classList.remove('is-scrolling');
      }, 800);
    };
    
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [ref]);
};
