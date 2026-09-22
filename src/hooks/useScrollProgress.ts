import { useEffect, useState } from 'react';
import { useLandingStore } from '../stores/landingStore';

export const useScrollProgress = (totalSections: number = 7) => {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const setStoreProgress = useLandingStore((s) => s.setScrollProgress);
  const setStoreActiveSection = useLandingStore((s) => s.setActiveSection);
  const markVisited = useLandingStore((s) => s.markSectionVisited);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const p = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;

          setProgress(p);
          setStoreProgress(p);

          // Calculate which section is mostly active (0 to totalSections - 1)
          const currentSection = Math.min(
            totalSections - 1,
            Math.max(0, Math.round(p * (totalSections - 1)))
          );
          setActiveSection(currentSection);
          setStoreActiveSection(currentSection);
          markVisited(currentSection);

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalSections, setStoreProgress, setStoreActiveSection, markVisited]);

  return { progress, activeSection };
};
