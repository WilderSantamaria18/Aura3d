import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioColor } from '../../hooks/useAudioColor';
import * as THREE from 'three';

export const AutoThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const { dominantColor, secondaryColor, accentColor } = useAudioColor();

  useEffect(() => {
    if (!autoMode) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', dominantColor);
    root.style.setProperty('--color-secondary', secondaryColor);
    root.style.setProperty('--color-accent', accentColor);

    // Dark background tinted with harmonic base
    const darkBgColor = new THREE.Color(dominantColor).multiplyScalar(0.08);
    const bgHex = '#' + darkBgColor.getHexString();
    const glowHex = dominantColor + '35'; // ~20% alpha glow
    const borderHex = dominantColor + '55'; // ~33% alpha border

    root.style.setProperty('--color-bg', bgHex);
    root.style.setProperty('--color-border', borderHex);
    root.style.setProperty('--color-shadow', glowHex);
    root.style.setProperty('--color-glow', glowHex);
  }, [autoMode, dominantColor, secondaryColor, accentColor]);

  return <>{children}</>;
};

export default AutoThemeProvider;

