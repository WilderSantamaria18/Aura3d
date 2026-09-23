import { useState, useCallback } from 'react';
import { useLenis } from './useLenis';

export const useLandingProgress = (totalSections: number) => {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  const handleScroll = useCallback(
    (p: number) => {
      setProgress(p);
      setActiveSection(
        Math.min(totalSections - 1, Math.max(0, Math.round(p * (totalSections - 1))))
      );
    },
    [totalSections]
  );

  const lenisRef = useLenis({ onScroll: handleScroll });

  return { progress, activeSection, lenisRef };
};
