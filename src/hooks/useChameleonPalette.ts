import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import {
  extractChameleonPalette,
  interpolatePalette,
  type ChameleonPalette,
} from '../services/chameleonPaletteService';

const DEFAULT_PALETTE: ChameleonPalette = {
  primary: '#00e5ff',
  secondary: '#a855f7',
  accent: '#38bdf8',
  glow: 'rgba(0, 229, 255, 0.28)',
  border: 'rgba(0, 229, 255, 0.35)',
  meshGradient:
    'radial-gradient(circle at 15% 15%, rgba(0, 229, 255, 0.18) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.14) 0%, transparent 55%)',
  isTransitioning: false,
  transitionProgress: 1,
};

const TRANSITION_DURATION_MS = 1200;

function syncDocumentCssVariables(pal: ChameleonPalette, progress: number) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--chameleon-primary', pal.primary);
  root.style.setProperty('--chameleon-secondary', pal.secondary);
  root.style.setProperty('--chameleon-accent', pal.accent);
  root.style.setProperty('--chameleon-glow', pal.glow);
  root.style.setProperty('--chameleon-border', pal.border);
  root.style.setProperty('--chameleon-mesh', pal.meshGradient);
  root.style.setProperty('--chameleon-morph-progress', progress.toFixed(3));
}

/**
 * useChameleonPalette — Real-Time Liquid Color Metamorphosis Hook
 *
 * Smoothly morphs color schemes across album artwork changes with fluid cubic interpolation,
 * projecting dynamic theme tokens into CSS custom properties and React consumers.
 */
export const useChameleonPalette = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);

  const fallbackPrimary = isLucid ? lucidPrimaryColor || lucidTheme?.primary || '#00e5ff' : '#00e5ff';
  const fallbackSecondary = isLucid ? lucidTheme?.secondary || '#a855f7' : '#a855f7';

  const [palette, setPalette] = useState<ChameleonPalette>(DEFAULT_PALETTE);

  const currentPaletteRef = useRef<ChameleonPalette>(DEFAULT_PALETTE);
  const rafRef = useRef<number | null>(null);
  const initialMountRef = useRef<boolean>(true);

  // Sync ref with current state
  currentPaletteRef.current = palette;

  useEffect(() => {
    let isCancelled = false;

    extractChameleonPalette(currentTrack?.coverUrl, fallbackPrimary, fallbackSecondary).then(
      (targetPalette) => {
        if (isCancelled) return;

        // On first mount or identical colors, apply immediately without animation
        if (
          initialMountRef.current ||
          (targetPalette.primary === currentPaletteRef.current.primary &&
            targetPalette.secondary === currentPaletteRef.current.secondary)
        ) {
          initialMountRef.current = false;
          const immediate = { ...targetPalette, isTransitioning: false, transitionProgress: 1 };
          setPalette(immediate);
          syncDocumentCssVariables(immediate, 1);
          return;
        }

        // Metamorfosis Líquida de Color: Smooth Cubic Interpolation RAF loop
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        const sourcePalette = { ...currentPaletteRef.current };
        const startTime = performance.now();

        const step = (now: number) => {
          if (isCancelled) return;

          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / TRANSITION_DURATION_MS);

          if (progress < 1) {
            const interpolated = interpolatePalette(sourcePalette, targetPalette, progress);
            const activeMorph: ChameleonPalette = {
              ...interpolated,
              isTransitioning: true,
              transitionProgress: progress,
            };
            setPalette(activeMorph);
            syncDocumentCssVariables(activeMorph, progress);
            rafRef.current = requestAnimationFrame(step);
          } else {
            const finished: ChameleonPalette = {
              ...targetPalette,
              isTransitioning: false,
              transitionProgress: 1,
            };
            setPalette(finished);
            syncDocumentCssVariables(finished, 1);
            rafRef.current = null;
          }
        };

        rafRef.current = requestAnimationFrame(step);
      }
    );

    return () => {
      isCancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentTrack?.coverUrl, currentTrack?.id, fallbackPrimary, fallbackSecondary]);

  return palette;
};

export default useChameleonPalette;
