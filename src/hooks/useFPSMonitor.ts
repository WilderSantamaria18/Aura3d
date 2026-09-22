import { useRef, useCallback } from 'react';

interface UseFPSMonitorOptions {
  thresholdFps?: number;
  lowFpsDurationMs?: number;
  onPerformanceDrop?: (currentFps: number) => void;
  sampleSize?: number;
}

export function useFPSMonitor({
  thresholdFps = 45,
  lowFpsDurationMs = 2000,
  onPerformanceDrop,
  sampleSize = 30,
}: UseFPSMonitorOptions = {}) {
  const frameTimesRef = useRef<number[]>([]);
  const lowFpsStartRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(60);

  const recordFrame = useCallback((timestamp: number) => {
    const times = frameTimesRef.current;
    times.push(timestamp);

    // Keep only the last `sampleSize` frame timestamps
    if (times.length > sampleSize) {
      times.shift();
    }

    if (times.length >= sampleSize) {
      const delta = (times[times.length - 1] - times[0]) / (times.length - 1);
      const fps = delta > 0 ? 1000 / delta : 60;
      currentFpsRef.current = Math.round(fps);

      if (fps < thresholdFps) {
        if (!lowFpsStartRef.current) {
          lowFpsStartRef.current = timestamp;
        } else if (timestamp - lowFpsStartRef.current >= lowFpsDurationMs) {
          // Avoid spamming drop callbacks (cooldown of 8 seconds)
          if (timestamp - lastAlertTimeRef.current > 8000) {
            lastAlertTimeRef.current = timestamp;
            lowFpsStartRef.current = null;
            if (onPerformanceDrop) {
              onPerformanceDrop(fps);
            }
          }
        }
      } else {
        lowFpsStartRef.current = null;
      }
    }
  }, [thresholdFps, lowFpsDurationMs, onPerformanceDrop, sampleSize]);

  return {
    recordFrame,
    getCurrentFps: () => currentFpsRef.current,
  };
}
