import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { multiplyHexColor } from '../../utils/colorUtils';

export const AutoThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');

  useEffect(() => {
    if (!autoMode) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', dynamicColor);
    root.style.setProperty('--color-secondary', dynamicColor);
    root.style.setProperty('--color-accent', dynamicColor);

    // Deep dark background subtly tinted with dynamic color
    const bgHex = multiplyHexColor(dynamicColor, 0.06);
    const glowHex = dynamicColor + '40'; // ~25% alpha glow
    const borderHex = dynamicColor + '55'; // ~33% alpha border

    root.style.setProperty('--color-bg', bgHex);
    root.style.setProperty('--color-border', borderHex);
    root.style.setProperty('--color-shadow', glowHex);
    root.style.setProperty('--color-glow', glowHex);
  }, [autoMode, dynamicColor]);

  return <>{children}</>;
};

export default AutoThemeProvider;


