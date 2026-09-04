import { useRef, useEffect, useState } from 'react';
import { useVisualizer } from './useVisualizer';
import { usePlayerStore } from '../stores/playerStore';
import * as THREE from 'three';

// 8 Mapped frequency bands to harmonic HSL color anchors
const BAND_COLORS = [
  { band: 'sub-bass', range: [0, 4], hue: 340, saturation: 0.92, lightness: 0.52 }, // Neon Magenta
  { band: 'bass', range: [4, 8], hue: 280, saturation: 0.90, lightness: 0.50 },     // Vivid Violet
  { band: 'low-mid', range: [8, 12], hue: 220, saturation: 0.90, lightness: 0.50 },  // Electric Indigo / Blue
  { band: 'mid', range: [12, 16], hue: 180, saturation: 0.92, lightness: 0.50 },     // Cyan
  { band: 'high-mid', range: [16, 20], hue: 135, saturation: 0.90, lightness: 0.50 }, // Emerald Green
  { band: 'presence', range: [20, 24], hue: 55, saturation: 0.92, lightness: 0.52 },  // Golden Yellow
  { band: 'treble', range: [24, 28], hue: 28, saturation: 0.92, lightness: 0.52 },    // Bright Orange
  { band: 'air', range: [28, 32], hue: 355, saturation: 0.92, lightness: 0.52 },      // Crimson Red
];

export const useAudioColor = () => {
  const { getSmoothedData } = useVisualizer(0.2);
  const autoMode = usePlayerStore((s) => s.autoMode);
  const autoSensitivity = usePlayerStore((s) => s.autoSensitivity ?? 1.0);

  const [dominantColor, setDominantColor] = useState('#00f2fe');
  const [secondaryColor, setSecondaryColor] = useState('#ff088a');
  const [accentColor, setAccentColor] = useState('#39FF14');

  const colorRef = useRef({ primary: '#00f2fe', secondary: '#ff088a', accent: '#39FF14' });
  const smoothPrimary = useRef(new THREE.Color('#00f2fe'));
  const smoothSecondary = useRef(new THREE.Color('#ff088a'));
  const smoothAccent = useRef(new THREE.Color('#39FF14'));

  useEffect(() => {
    if (!autoMode) return;

    let intervalId: ReturnType<typeof setInterval>;

    const updateColors = () => {
      const data = getSmoothedData();
      const { raw, bass, mids, highs, energy } = data;

      if (!raw || raw.length === 0) return;

      // 1. Find dominant frequency band with highest normalized energy
      let maxEnergy = 0;
      let dominantBand = BAND_COLORS[0];

      BAND_COLORS.forEach((band) => {
        const [start, end] = band.range;
        let bandEnergy = 0;
        let count = 0;
        for (let i = start; i < end && i < raw.length; i++) {
          bandEnergy += raw[i];
          count++;
        }
        const avg = count > 0 ? bandEnergy / count : 0;
        if (avg > maxEnergy) {
          maxEnergy = avg;
          dominantBand = band;
        }
      });

      // 2. Compute dynamic harmonic Hue modulated by bass/treble and sensitivity
      const sens = autoSensitivity || 1.0;
      const hueShift = (bass * 25 * sens) - (highs * 15 * sens) + (mids * 10 * sens);
      const rawHue = (dominantBand.hue + hueShift + 360) % 360;
      const sat = Math.max(0.75, Math.min(1.0, 0.85 + energy * 0.15));
      const light = Math.max(0.42, Math.min(0.75, 0.46 + energy * 0.28));

      // 3. Compute complementary & triadic harmonic accents
      const secondaryHue = (rawHue + 180) % 360;
      const accentHue = (rawHue + 60) % 360;

      // 4. Smooth lerp for ultra-fluid color transitions (no abrupt flashes)
      const targetPrimary = new THREE.Color().setHSL(rawHue / 360, sat, light);
      const targetSecondary = new THREE.Color().setHSL(secondaryHue / 360, sat * 0.85, light * 0.85);
      const targetAccent = new THREE.Color().setHSL(accentHue / 360, sat * 0.95, light * 0.9);

      smoothPrimary.current.lerp(targetPrimary, 0.12);
      smoothSecondary.current.lerp(targetSecondary, 0.12);
      smoothAccent.current.lerp(targetAccent, 0.12);

      const newPrimary = '#' + smoothPrimary.current.getHexString();
      const newSecondary = '#' + smoothSecondary.current.getHexString();
      const newAccent = '#' + smoothAccent.current.getHexString();

      if (
        newPrimary !== colorRef.current.primary ||
        newSecondary !== colorRef.current.secondary ||
        newAccent !== colorRef.current.accent
      ) {
        colorRef.current = { primary: newPrimary, secondary: newSecondary, accent: newAccent };
        setDominantColor(newPrimary);
        setSecondaryColor(newSecondary);
        setAccentColor(newAccent);

        // Update in global player store for fast 3D Three.js read
        usePlayerStore.getState().setAutoPalette({
          primary: newPrimary,
          secondary: newSecondary,
          accent: newAccent,
        });
      }
    };

    intervalId = setInterval(updateColors, 60);
    return () => clearInterval(intervalId);
  }, [autoMode, autoSensitivity, getSmoothedData]);

  return { dominantColor, secondaryColor, accentColor, colorRef };
};
