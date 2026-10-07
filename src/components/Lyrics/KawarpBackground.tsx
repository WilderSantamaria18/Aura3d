/**
 * KawarpBackground — Liquid Glass Apple Music Fluid Mesh Aurora
 *
 * Renders a 4-orb multi-chromatic audio-reactive liquid backdrop
 * powered by Lissajous phase drift, FFT audio reactivity (sub-bass, mids, vocal energy),
 * and subtle micro-dither to eliminate OLED/IPS color banding.
 *
 * Implements resilient performance degradation (eco-throttle) rather than permanent freezing.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';

interface KawarpBackgroundProps {
  /** Primary accent color (hex) extracted from cover art */
  primaryColor: string;
  /** Secondary accent color (hex) extracted from cover art */
  secondaryColor: string;
  /** Optional tertiary accent color */
  tertiaryColor?: string;
  /** Opacity multiplier [0..1]. Default 0.45 */
  opacity?: number;
  /** Whether to show the background at all */
  visible?: boolean;
}

export const KawarpBackground: React.FC<KawarpBackgroundProps> = ({
  primaryColor,
  secondaryColor,
  tertiaryColor: tertiaryColorProp,
  opacity = 0.5,
  visible = true,
}) => {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const orb4Ref = useRef<HTMLDivElement>(null);

  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(performance.now());
  const mountTimeRef = useRef(performance.now());
  const lowFpsCountRef = useRef(0);
  const [isEcoMode, setIsEcoMode] = useState(false);

  const kawarpSettings = usePlayerStore((s) => s.kawarpSettings);
  const vocalMode = usePlayerStore((s) => s.vocalMode);
  const { getSmoothedData } = useVisualizer(0.2);

  // Compute harmonic tertiary and quaternary colors for Apple Music 4-orb liquid mesh
  const tertiaryColor = useMemo(() => {
    if (tertiaryColorProp) return tertiaryColorProp;
    return `color-mix(in srgb, ${primaryColor} 45%, ${secondaryColor} 55%)`;
  }, [primaryColor, secondaryColor, tertiaryColorProp]);

  const coreGlowColor = useMemo(() => {
    return `color-mix(in srgb, ${primaryColor} 65%, white 35%)`;
  }, [primaryColor]);

  const lastFrameTimeRef = useRef(0);

  const animate = useCallback(() => {
    const now = performance.now();

    // In Eco Mode, throttle to ~30 FPS to preserve mobile/low-end GPU frame budget
    if (isEcoMode && now - lastFrameTimeRef.current < 32) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTimeRef.current = now;

    const speed = (kawarpSettings?.motionSpeed ?? 0.85) * (isEcoMode ? 0.6 : 1);
    const t = now * 0.00085 * speed;
    frameCountRef.current++;

    // Graceful FPS monitoring: wait 3.5s after mounting to avoid initial DOM warmup dips
    const elapsed = now - lastFpsCheckRef.current;
    if (elapsed >= 2000) {
      const currentFps = (frameCountRef.current / elapsed) * 1000;
      frameCountRef.current = 0;
      lastFpsCheckRef.current = now;

      if (now - mountTimeRef.current > 3500) {
        if (currentFps < 25) {
          lowFpsCountRef.current++;
          if (lowFpsCountRef.current >= 3 && !isEcoMode) {
            setIsEcoMode(true);
          }
        } else if (currentFps > 45 && lowFpsCountRef.current > 0) {
          lowFpsCountRef.current = 0;
          if (isEcoMode) setIsEcoMode(false);
        }
      }
    }

    const { bass, mids, energy } = getSmoothedData();
    const intensity = kawarpSettings?.warpIntensity ?? 0.55;

    // Orb 1: Primary hue (Top-Left Lissajous + Sub-Bass pulse)
    if (orb1Ref.current) {
      const tx = (Math.sin(t * 0.38) * 45 + Math.cos(t * 0.22) * 25) * intensity;
      const ty = (Math.cos(t * 0.32) * 40 + Math.sin(t * 0.44) * 20) * intensity;
      const sc = 1 + bass * 0.22 * intensity;
      const rot = Math.sin(t * 0.15) * 25;
      orb1Ref.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sc}) rotate(${rot}deg)`;
      orb1Ref.current.style.opacity = String(Math.min(0.85, opacity * (0.8 + bass * 0.45)));
    }

    // Orb 2: Secondary hue (Bottom-Right Lissajous + Vocal Mids bloom)
    if (orb2Ref.current) {
      const tx = (Math.cos(t * 0.28) * 55 + Math.sin(t * 0.18) * 30) * intensity;
      const ty = (Math.sin(t * 0.35) * 45 + Math.cos(t * 0.42) * 25) * intensity;
      const sc = 1 + mids * 0.2 * intensity;
      const rot = Math.cos(t * 0.12) * -20;
      orb2Ref.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sc}) rotate(${rot}deg)`;
      orb2Ref.current.style.opacity = String(Math.min(0.8, opacity * (0.75 + mids * 0.4)));
    }

    // Orb 3: Harmonic Tertiary (Top-Right organic orbital float + Highs shimmer)
    if (orb3Ref.current) {
      const tx = (Math.sin(t * 0.45) * 40 + Math.cos(t * 0.3) * 20) * intensity;
      const ty = (Math.cos(t * 0.4) * 35 + Math.sin(t * 0.26) * 25) * intensity;
      const sc = 1 + energy * 0.16 * intensity;
      orb3Ref.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sc})`;
      orb3Ref.current.style.opacity = String(Math.min(0.7, opacity * (0.7 + energy * 0.35)));
    }

    // Orb 4: Core Volumetric Glow (Center-Bottom gentle breathing heart)
    if (orb4Ref.current) {
      const tx = Math.sin(t * 0.2) * 20 * intensity;
      const ty = Math.cos(t * 0.24) * 15 * intensity;
      const sc = 1 + (bass * 0.15 + energy * 0.1) * intensity;
      orb4Ref.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sc})`;
      orb4Ref.current.style.opacity = String(Math.min(0.65, opacity * (0.65 + bass * 0.35)));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [getSmoothedData, opacity, kawarpSettings, isEcoMode]);

  useEffect(() => {
    if (!visible || !kawarpSettings?.enabled) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, kawarpSettings?.enabled, animate]);

  if (!visible) return null;

  const blurAmount = Math.max(50, Math.min(110, (kawarpSettings?.blurPasses ?? 18) * 4));
  const filterStyle = `blur(${blurAmount}px) saturate(${(kawarpSettings?.saturation ?? 1.35) * 100}%) brightness(${(kawarpSettings?.brightness ?? 1.1) * 100}%)`;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-40"
      aria-hidden="true"
    >
      {/* Base deep frosted backdrop: Defocuses and diffuses the underlying 3D visualizer */}
      <div
        className="absolute inset-0 bg-slate-950/65"
        style={{
          backdropFilter: 'blur(54px) saturate(180%) brightness(0.9)',
          WebkitBackdropFilter: 'blur(54px) saturate(180%) brightness(0.9)',
        }}
      />

      {/* Fluid Mesh Orbs Container (rendered when Kawarp is enabled) */}
      {kawarpSettings?.enabled !== false && (
        <div className="absolute inset-[-15%] will-change-transform" style={{ filter: filterStyle }}>
          {/* Orb 1: Primary Accent (Top-Left Lissajous + Sub-Bass pulse) */}
          <div
            ref={orb1Ref}
            className="absolute w-[75vw] h-[75vw] max-w-[1100px] max-h-[1100px] -top-[12%] -left-[12%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${primaryColor}65 0%, ${primaryColor}28 45%, transparent 72%)`,
              willChange: 'transform, opacity',
              mixBlendMode: 'screen',
            }}
          />

          {/* Orb 2: Secondary Accent (Bottom-Right Lissajous + Vocal Mids bloom) */}
          <div
            ref={orb2Ref}
            className="absolute w-[80vw] h-[80vw] max-w-[1200px] max-h-[1200px] -bottom-[15%] -right-[12%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${secondaryColor}55 0%, ${secondaryColor}22 50%, transparent 75%)`,
              willChange: 'transform, opacity',
              mixBlendMode: 'screen',
            }}
          />

          {/* Orb 3: Harmonic Tertiary (Top-Right organic orbital float + Highs shimmer) */}
          <div
            ref={orb3Ref}
            className="absolute w-[60vw] h-[60vw] max-w-[850px] max-h-[850px] -top-[8%] right-[2%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${tertiaryColor}48 0%, ${tertiaryColor}18 50%, transparent 72%)`,
              willChange: 'transform, opacity',
              mixBlendMode: 'screen',
            }}
          />

          {/* Orb 4: Volumetric Warm Core (Center-Bottom gentle breathing heart) */}
          <div
            ref={orb4Ref}
            className="absolute w-[70vw] h-[70vw] max-w-[950px] max-h-[950px] top-[25%] left-[15%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${coreGlowColor}40 0%, ${coreGlowColor}14 45%, transparent 68%)`,
              willChange: 'transform, opacity',
              mixBlendMode: 'screen',
            }}
          />
        </div>
      )}

      {/* Central living atmospheric aura */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${primaryColor}25 0%, ${secondaryColor}12 45%, transparent 70%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* Cinematic Vignette Overlay to enhance contrast and readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(3, 5, 12, 0.78) 100%)',
        }}
      />

      {/* Karaoke Sing Stage Spotlight Glow (Visible when Karaoke mode is active) */}
      {vocalMode === 'karaoke' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 animate-pulse"
          style={{
            background: `radial-gradient(ellipse 90% 65% at 50% 15%, ${primaryColor}30 0%, ${secondaryColor}16 50%, transparent 80%)`,
            animationDuration: '3.5s',
          }}
        />
      )}

      {/* Micro-Dither Film Grain to eliminate 8-bit banding on dark gradients */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="kawarp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#kawarp-grain)" />
      </svg>
    </div>
  );
};

export default KawarpBackground;
