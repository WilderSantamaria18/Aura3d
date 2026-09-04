import { useState, useRef, useCallback } from 'react';
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

/**
 * Detects if the device has an integrated / low-power GPU or mobile chipset
 */
export const detectLowPowerGpu = (): { isIntegrated: boolean; isMobile: boolean; gpuName: string } => {
  if (typeof window === 'undefined') {
    return { isIntegrated: false, isMobile: false, gpuName: 'Unknown' };
  }

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  let isIntegrated = isMobile;
  let gpuName = 'Generic GPU';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gpuName = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        const lower = gpuName.toLowerCase();
        if (
          lower.includes('intel') ||
          lower.includes('uhd') ||
          lower.includes('hd graphics') ||
          lower.includes('iris') ||
          lower.includes('mali') ||
          lower.includes('adreno') ||
          lower.includes('powervr') ||
          lower.includes('software') ||
          lower.includes('llvmpipe')
        ) {
          isIntegrated = true;
        }
      }
    }
  } catch {
    // Ignore context creation errors
  }

  return { isIntegrated: !!isIntegrated, isMobile: !!isMobile, gpuName };
};

export const usePerformanceMonitor = () => {
  const hardwareInfo = useRef(detectLowPowerGpu());
  const [performanceMode, setPerformanceMode] = useState<PerformanceTier>(
    hardwareInfo.current.isIntegrated ? 'eco' : 'high'
  );
  const [fps, setFps] = useState<number>(60);

  const frameCount = useRef(0);
  const lastFpsCheck = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const lastModeChange = useRef(performance.now());

  // Notify user on auto-adjustment
  const triggerPerformanceToast = useCallback((mode: PerformanceTier) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('performanceModeChange', {
          detail: {
            mode,
            message:
              mode === 'eco' || mode === 'ultra_eco'
                ? '⚡ Modo Rendimiento activado automáticamente para mantener 60 FPS estables.'
                : '🚀 Modo Alta Calidad restaurado.',
          },
        })
      );
    }
  }, []);

  // Frame counting in Three.js animation cycle
  useFrame(() => {
    frameCount.current += 1;
    const now = performance.now();

    if (now - lastFpsCheck.current >= 1000) {
      const currentFps = frameCount.current;
      frameCount.current = 0;
      lastFpsCheck.current = now;
      setFps(currentFps);

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
  const ringParticleBudget = isUltraEco ? 300 : isEco ? 800 : 2000;
  const enableComplexEffects = !isEco;

  return {
    performanceMode,
    fps,
    isIntegratedGpu: hardwareInfo.current.isIntegrated,
    isMobile: hardwareInfo.current.isMobile,
    isEco,
    isUltraEco,
    particleBudget,
    ringParticleBudget,
    enableComplexEffects,
  };
};
