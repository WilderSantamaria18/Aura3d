import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { hexToRgba } from '../../types/audio';
import { useChameleonPalette } from '../../hooks/useChameleonPalette';
import { EdgeReactiveSparks } from './EdgeReactiveSparks';

/**
 * Ambilight360Layer — Sistema de Iluminación Perimetral Reactiva de 360 Grados Pro
 *
 * Proyecta la luz ambiental y la energía musical en los 4 bordes de la pantalla (Top, Bottom, Left, Right),
 * combinado con la Metamorfosis Líquida de Color camaleónica de álbum y Chispas Reactivas Perimetrales.
 */
export const Ambilight360Layer: React.FC = () => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const palette = useChameleonPalette();

  const topGlowRef = useRef<HTMLDivElement>(null);
  const bottomGlowRef = useRef<HTMLDivElement>(null);
  const leftGlowRef = useRef<HTMLDivElement>(null);
  const rightGlowRef = useRef<HTMLDivElement>(null);
  const causticsRef = useRef<HTMLDivElement>(null);

  const primaryColor = palette.primary;
  const secondaryColor = palette.secondary;
  const accentColor = palette.accent;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId: number;
    let smoothBass = 0;
    let smoothEnergy = 0;

    const loop = () => {
      if (!isPlaying) {
        smoothBass += (0 - smoothBass) * 0.08;
        smoothEnergy += (0 - smoothEnergy) * 0.08;
      } else {
        const freq = AudioEngine.getInstance().getFrequencyData();
        const rawBass = freq.bass || 0;
        const rawEnergy = freq.energy || 0;

        smoothBass += (rawBass - smoothBass) * (rawBass > smoothBass ? 0.38 : 0.1);
        smoothEnergy += (rawEnergy - smoothEnergy) * (rawEnergy > smoothEnergy ? 0.32 : 0.08);
      }

      const bassLevel = prefersReduced ? smoothBass * 0.25 : smoothBass;
      const energyLevel = prefersReduced ? smoothEnergy * 0.3 : smoothEnergy;

      // Extra surge during track transition color metamorphosis
      const transitionBoost = palette.isTransitioning ? 0.12 : 0;

      // Opacidades perimetrales moduladas por audio y transición camaleónica
      const topOpacity = (0.16 + energyLevel * 0.48 + transitionBoost).toFixed(3);
      const bottomOpacity = (0.22 + bassLevel * 0.58 + transitionBoost * 1.2).toFixed(3);
      const sideOpacity = (0.13 + (bassLevel * 0.5 + energyLevel * 0.5) * 0.42 + transitionBoost).toFixed(3);
      const causticsOpacity = (0.08 + energyLevel * 0.22 + transitionBoost * 0.5).toFixed(3);

      if (topGlowRef.current) topGlowRef.current.style.opacity = topOpacity;
      if (bottomGlowRef.current) bottomGlowRef.current.style.opacity = bottomOpacity;
      if (leftGlowRef.current) leftGlowRef.current.style.opacity = sideOpacity;
      if (rightGlowRef.current) rightGlowRef.current.style.opacity = sideOpacity;
      if (causticsRef.current) causticsRef.current.style.opacity = causticsOpacity;

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, palette.isTransitioning]);

  if (!hasStarted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-[1] overflow-hidden">
      {/* ── Borde Superior (Ambilight Top) ── */}
      <div
        ref={topGlowRef}
        className="absolute top-0 left-0 right-0 h-48 pointer-events-none transition-all duration-300 mix-blend-screen"
        style={{
          opacity: 0.16,
          background: `radial-gradient(ellipse 85% 100% at 50% 0%, ${hexToRgba(primaryColor, 0.6)} 0%, ${hexToRgba(accentColor, 0.25)} 45%, transparent 80%)`,
        }}
      />

      {/* ── Borde Inferior (Ambilight Bottom - kick reactivo profundo) ── */}
      <div
        ref={bottomGlowRef}
        className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none transition-all duration-150 mix-blend-screen"
        style={{
          opacity: 0.22,
          background: `radial-gradient(ellipse 90% 100% at 50% 100%, ${hexToRgba(secondaryColor, 0.65)} 0%, ${hexToRgba(primaryColor, 0.3)} 50%, transparent 80%)`,
        }}
      />

      {/* ── Lateral Izquierdo (Ambilight Left) ── */}
      <div
        ref={leftGlowRef}
        className="absolute top-0 bottom-0 left-0 w-40 pointer-events-none transition-all duration-200 mix-blend-screen"
        style={{
          opacity: 0.13,
          background: `radial-gradient(ellipse 100% 70% at 0% 50%, ${hexToRgba(primaryColor, 0.5)} 0%, transparent 75%)`,
        }}
      />

      {/* ── Lateral Derecho (Ambilight Right) ── */}
      <div
        ref={rightGlowRef}
        className="absolute top-0 bottom-0 right-0 w-40 pointer-events-none transition-all duration-200 mix-blend-screen"
        style={{
          opacity: 0.13,
          background: `radial-gradient(ellipse 100% 70% at 100% 50%, ${hexToRgba(secondaryColor, 0.5)} 0%, transparent 75%)`,
        }}
      />

      {/* ── Esquinas Especulares (Vignette Caustics de 4 Puntas) ── */}
      <div
        ref={causticsRef}
        className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-300"
        style={{
          opacity: 0.1,
          background: `radial-gradient(circle at 0% 0%, ${hexToRgba(accentColor, 0.35)} 0%, transparent 35%),
                       radial-gradient(circle at 100% 0%, ${hexToRgba(primaryColor, 0.35)} 0%, transparent 35%),
                       radial-gradient(circle at 0% 100%, ${hexToRgba(primaryColor, 0.35)} 0%, transparent 35%),
                       radial-gradient(circle at 100% 100%, ${hexToRgba(secondaryColor, 0.35)} 0%, transparent 35%)`,
        }}
      />

      {/* ── Partículas Reactivas Perimetrales (Chispas de Luz Sincronizadas al Kick) ── */}
      <EdgeReactiveSparks />
    </div>
  );
};

export default Ambilight360Layer;
