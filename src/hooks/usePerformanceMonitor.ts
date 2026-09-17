import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export type PerformanceTier = 'high' | 'eco' | 'ultra_eco';

export interface PerformanceInfo {
  performanceMode: PerformanceTier;
  fps: number;
  isIntegratedGpu: boolean;
  isMobile: boolean;
  isEco: boolean;
  isUltraEco: boolean;
  particleBudget: number;
  ringParticleBudget: number;
  enableComplexEffects: boolean;
}

import { detectLowPowerGpu } from '../utils/gpuDetector';
export { detectLowPowerGpu };

export const usePerformanceMonitor = () => {
  const hardwareInfo = useRef(detectLowPowerGpu());
  const [performanceMode, setPerformanceMode] = useState<PerformanceTier>(
    hardwareInfo.current.isIntegrated ? 'eco' : 'high'
  );
  const fpsRef = useRef<number>(60);

  const frameCount = useRef(0);
  const lastFpsCheck = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const lastModeChange = useRef(performance.now());
  const longTasksCount = useRef<number>(0);

  // PerformanceObserver for Long Tasks detection (> 50ms main thread blocking)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              longTasksCount.current += 1;
              if (import.meta.env.DEV && entry.duration > 100) {
                console.warn(
                  `[PerformanceObserver] Long task detectada: ${entry.duration.toFixed(1)}ms`
                );
              }
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
        return () => observer.disconnect();
      } catch {
        // Fallback if longtask entryType not supported
      }
    }
  }, []);

  // Notify user on auto-adjustment
  const triggerPerformanceToast = useCallback((mode: PerformanceTier) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('performanceModeChange', {
          detail: {
            mode,
            message:
              mode === 'eco' || mode === 'ultra_eco'
                ? 'Modo Rendimiento activado automáticamente para mantener 60 FPS estables.'
                : 'Modo Alta Calidad restaurado.',
          },
        })
      );
    }
  }, []);

  // Frame counting in Three.js animation cycle without triggering React re-renders every second
  useFrame(() => {
    frameCount.current += 1;
    const now = performance.now();

    if (now - lastFpsCheck.current >= 1000) {
      const currentFps = frameCount.current;
      frameCount.current = 0;
      lastFpsCheck.current = now;
      fpsRef.current = currentFps;

      fpsHistory.current.push(currentFps);
      if (fpsHistory.current.length > 5) fpsHistory.current.shift();

      const avgFps =
        fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;

      // Only switch after at least 3 seconds in current mode to prevent jitter
      if (now - lastModeChange.current >= 3000) {
        if (avgFps < 25 && performanceMode !== 'ultra_eco') {
          setPerformanceMode('ultra_eco');
          lastModeChange.current = now;
          triggerPerformanceToast('ultra_eco');
        } else if (avgFps < 42 && performanceMode === 'high') {
          setPerformanceMode('eco');
          lastModeChange.current = now;
          triggerPerformanceToast('eco');
        } else if (avgFps >= 55 && performanceMode !== 'high') {
          // Stable high frame rate sustained for 4 checks
          const allHigh = fpsHistory.current.slice(-4).every((f) => f >= 54);
          if (allHigh && !hardwareInfo.current.isIntegrated) {
            setPerformanceMode('high');
            lastModeChange.current = now;
            triggerPerformanceToast('high');
          }
        }
      }
    }
  });

  const isEco = performanceMode === 'eco' || performanceMode === 'ultra_eco';
  const isUltraEco = performanceMode === 'ultra_eco';

  const particleBudget = isUltraEco ? 500 : isEco ? 1200 : 2400;
  const ringParticleBudget = isUltraEco ? 300 : isEco ? 800 : 1200;
  const enableComplexEffects = !isEco;

  return {
    performanceMode,
    fps: fpsRef.current,
    isIntegratedGpu: hardwareInfo.current.isIntegrated,
    isMobile: hardwareInfo.current.isMobile,
    isEco,
    isUltraEco,
    particleBudget,
    ringParticleBudget,
    enableComplexEffects,
  };
};
