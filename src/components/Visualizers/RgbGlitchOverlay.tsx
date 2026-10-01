import React, { useState, useEffect, useRef } from 'react';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { resolveReducedMotion } from '../../hooks/useMotionScale';

/** Separación mínima entre dos destellos (ms) fuera de Rainbow Void: ≤ 3 por segundo, por debajo del umbral de parpadeo (WCAG 2.3.1) */
export const GLITCH_MIN_INTERVAL_MS = 350;

/**
 * Glitch RGB sobre los golpes fuertes. Es opcional (se activa en ajustes), breve (95 ms) y acotado.
 * Rainbow Void conserva su comportamiento original; en el resto de visualizadores se añade un límite de frecuencia
 * y, con «movimiento reducido», el destello no desplaza ni escala la imagen (solo tiñe un instante).
 *
 * El componente exterior solo monta el interior —que se suscribe al análisis de audio— cuando el glitch está activo:
 * apagado, ya no hay suscripción ni renders a ~25 fps.
 */
export const RgbGlitchOverlay: React.FC = () => {
  const isRgbGlitchActive = usePlayerStore((s) => s.isRgbGlitchActive);
  return isRgbGlitchActive ? <GlitchLayer /> : null;
};

const GlitchLayer: React.FC = () => {
  const { isBeat, beatPulse, features } = useAIAudioEngine();
  const { isPlaying, visualizerMode, reducedSetting } = usePlayerStore(
    useShallow((s) => ({ isPlaying: s.isPlaying, visualizerMode: s.visualizerMode, reducedSetting: s.blobSettings?.vizReducedMotion }))
  );
  const limited = visualizerMode !== 'blob';
  const reduced = limited && resolveReducedMotion(reducedSetting, !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      setIsGlitching(false);
      return;
    }
    if (isBeat && features.bassEnergy > 0.55) {
      const now = performance.now();
      if (limited && now - lastRef.current < GLITCH_MIN_INTERVAL_MS) return;
      lastRef.current = now;
      setIsGlitching(true);
      setGlitchOffset(reduced ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 6 });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setIsGlitching(false), 95);
    }
  }, [isBeat, features.bassEnergy, isPlaying, limited, reduced]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  if (!isGlitching) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-75 mix-blend-screen"
      style={{
        transform: reduced ? undefined : `translate(${glitchOffset.x}px, ${glitchOffset.y}px) scale(${1.0 + beatPulse * 0.015})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08) 0%, transparent 100%)',
          clipPath: 'polygon(0 15%, 100% 18%, 100% 32%, 0 28%)',
          transform: reduced ? undefined : 'translateX(-4px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 8, 138, 0.08) 100%)',
          clipPath: 'polygon(0 65%, 100% 62%, 100% 78%, 0 82%)',
          transform: reduced ? undefined : 'translateX(4px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 4px)',
        }}
      />
    </div>
  );
};

export default RgbGlitchOverlay;
