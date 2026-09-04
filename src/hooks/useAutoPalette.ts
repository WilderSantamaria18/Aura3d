import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVisualizer } from './useVisualizer';

export const useAutoPalette = () => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const updateAutoPalette = usePlayerStore((s) => s.updateAutoPalette);
  const { getSmoothedData } = useVisualizer(0.2);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!autoMode) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      return;
    }

    let lastUpdate = 0;
    const updateLoop = () => {
      const now = performance.now();
      // Update every 80-100ms (10-12 FPS to maintain lightweight 60 FPS visualizer)
      if (now - lastUpdate > 90) {
        const data = getSmoothedData();
        if (data.raw && data.raw.length > 0) {
          updateAutoPalette(data.raw);
        }
        lastUpdate = now;
      }
      frameRef.current = requestAnimationFrame(updateLoop);
    };

    frameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    };
  }, [autoMode, getSmoothedData, updateAutoPalette]);
};

export default useAutoPalette;
