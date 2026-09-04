import { useMemo } from 'react';
import type { IDeviceCapabilities } from '../types';

/**
 * useDeviceCapabilities
 *
 * Detects device hardware profile, screen density, CPU concurrency,
 * and low-power modes to dynamically throttle particle counts, FFT bins,
 * canvas resolution scale (DPR), and heavy blur filters.
 */
export const useDeviceCapabilities = (): IDeviceCapabilities => {
  return useMemo<IDeviceCapabilities>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isLowEnd: false,
        maxDpr: 2,
        particleCount: 2200,
        waveParticleCount: 1800,
        fftBarCount: 32,
        enableShadows: true,
        enableHeavyBlur: true,
        hardwareConcurrency: 4,
      };
    }

    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const cores = navigator.hardwareConcurrency || 4;

    // Detect low-end indicators (few cores, small mobile screen, low device memory if supported)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const isLowEnd = isMobile && (cores <= 4 || deviceMemory <= 3);

    // Particle tuning according to hardware capacity
    const particleCount = isLowEnd ? 750 : isMobile ? 1100 : isTablet ? 1600 : 2400;
    const waveParticleCount = isLowEnd ? 600 : isMobile ? 900 : isTablet ? 1300 : 1800;
    const fftBarCount = isLowEnd ? 16 : isMobile ? 24 : 32;
    const maxDpr = isLowEnd ? 1.0 : isMobile ? 1.5 : 2.0;

    return {
      isMobile,
      isTablet,
      isLowEnd,
      maxDpr,
      particleCount,
      waveParticleCount,
      fftBarCount,
      enableShadows: !isLowEnd,
      enableHeavyBlur: !isLowEnd,
      hardwareConcurrency: cores,
    };
  }, []);
};
