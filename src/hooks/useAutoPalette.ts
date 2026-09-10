import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVisualizer } from './useVisualizer';
import { hslToHex } from '../utils/colorUtils';
import { aiSceneDirector } from '../services/aiSceneDirectorService';

export const useAutoPalette = () => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const baseColorHue = usePlayerStore((s) => s.baseColorHue);
  const autoSensitivity = usePlayerStore((s) => s.autoSensitivity ?? 1.0);
  const setDynamicColor = usePlayerStore((s) => s.setDynamicColor);
  const { getSmoothedData } = useVisualizer(0.2);

  const currentHue = useRef(baseColorHue / 360);
  const targetHue = useRef(baseColorHue / 360);
  const frameRef = useRef<number | undefined>(undefined);
  const lastHexRef = useRef<string>('#00f2fe');

  // Sync when base hue changes (e.g. end of track)
  useEffect(() => {
    targetHue.current = baseColorHue / 360;
  }, [baseColorHue]);

  useEffect(() => {
    if (autoMode) {
      aiSceneDirector.start();
    } else {
      aiSceneDirector.stop();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      return;
    }

    let lastTime = performance.now();

    const updateLoop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { bass, mids, highs, energy } = getSmoothedData();

      // 1. Music dynamic influence (weighted towards bass & energy)
      const musicInfluence = bass * 0.35 + mids * 0.25 + highs * 0.15 + energy * 0.25;

      // 2. Modulate target hue with subtle organic deviation (±0.06 range) scaled by sensitivity
      const baseHue = (usePlayerStore.getState().baseColorHue || 0) / 360;
      const deviation = (musicInfluence - 0.35) * 0.08 * (autoSensitivity || 1.0);
      targetHue.current = baseHue + deviation;

      // 3. Ultra-smooth lerp transition (no flashes or jitter)
      const lerpSpeed = Math.min(1.0, 1.8 * dt); // smooth ~0.025 per frame
      currentHue.current += (targetHue.current - currentHue.current) * lerpSpeed;

      // 4. Compute vibrant HSL color
      const saturation = Math.min(1.0, Math.max(0.78, 0.86 + energy * 0.14));
      const lightness = Math.min(0.68, Math.max(0.42, 0.46 + energy * 0.24));
      const wrappedHue = ((currentHue.current % 1) + 1) % 1;

      const hex = hslToHex(wrappedHue, saturation, lightness);

      if (hex !== lastHexRef.current) {
        lastHexRef.current = hex;
        setDynamicColor(hex);
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
  }, [autoMode, autoSensitivity, getSmoothedData, setDynamicColor]);
};

export default useAutoPalette;


