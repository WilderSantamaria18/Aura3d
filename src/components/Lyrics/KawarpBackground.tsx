/**
 * KawarpBackground — Audio-reactive dynamic gradient background
 *
 * Renders two radial gradients from extracted cover art colors,
 * animated via GPU transform modulated by audio FFT bass/mids/energy,
 * with customizable settings from playerStore (warpIntensity, motionSpeed, blur, etc.).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';

interface KawarpBackgroundProps {
  /** Primary accent color (hex) extracted from cover art */
  primaryColor: string;
  /** Secondary accent color (hex) extracted from cover art */
  secondaryColor: string;
  /** Opacity multiplier [0..1]. Default 0.45 */
  opacity?: number;
  /** Whether to show the background at all */
  visible?: boolean;
}

export const KawarpBackground: React.FC<KawarpBackgroundProps> = ({
  primaryColor,
  secondaryColor,
  opacity = 0.45,
  visible = true,
}) => {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(performance.now());
  const [isStatic, setIsStatic] = useState(() => {
    return typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) < 4;
  });

  const kawarpSettings = usePlayerStore((s) => s.kawarpSettings);
  const { getSmoothedData } = useVisualizer(0.25);

  const animate = useCallback(() => {
    const now = performance.now();
    const speed = kawarpSettings?.motionSpeed ?? 0.8;
    const timeSec = now * 0.001 * speed;
    frameCountRef.current++;

    // Automatic FPS degradation check every 2 seconds
    const elapsed = now - lastFpsCheckRef.current;
    if (elapsed >= 2000) {
      const fps = (frameCountRef.current / elapsed) * 1000;
      frameCountRef.current = 0;
      lastFpsCheckRef.current = now;
      if (fps < 50) {
        setIsStatic(true);
        return; // Degrade to static mode to protect frame budget
      }
    }

    const { bass, mids, energy } = getSmoothedData();
    const intensity = kawarpSettings?.warpIntensity ?? 0.5;

    if (layer1Ref.current) {
      const tx = Math.sin(timeSec * 0.3) * bass * 24 * intensity;
      const ty = Math.cos(timeSec * 0.25) * mids * 18 * intensity;
      const sc = 1 + energy * 0.08 * intensity;
      layer1Ref.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      layer1Ref.current.style.opacity = String(Math.min(0.75, opacity * (0.85 + bass * 0.45)));
    }

    if (layer2Ref.current) {
      const tx = Math.cos(timeSec * 0.22) * mids * 20 * intensity;
      const ty = Math.sin(timeSec * 0.18) * bass * 14 * intensity;
      const sc = 1 + energy * 0.06 * intensity;
      layer2Ref.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      layer2Ref.current.style.opacity = String(Math.min(0.6, opacity * 0.75 * (0.85 + mids * 0.45)));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [getSmoothedData, opacity, kawarpSettings]);

  useEffect(() => {
    if (!visible || isStatic || !kawarpSettings?.enabled) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, isStatic, kawarpSettings?.enabled, animate]);

  if (!visible || !kawarpSettings?.enabled) return null;

  const blurAmount = Math.max(30, Math.min(80, (kawarpSettings?.blurPasses ?? 16) * 3));
  const filterStyle = `blur(${blurAmount}px) saturate(${(kawarpSettings?.saturation ?? 1.2) * 100}%) brightness(${(kawarpSettings?.brightness ?? 1.0) * 100}%)`;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Background base */}
      <div className="absolute inset-0 bg-[#03050c]" />

      {/* Layer 1 — primary color gradient (30% 40%) */}
      <div
        ref={layer1Ref}
        className="absolute inset-[-20%]"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${primaryColor}33, transparent 60%)`,
          filter: filterStyle,
          willChange: 'transform, opacity',
          mixBlendMode: 'screen',
          transition: isStatic ? 'background 800ms ease-out' : 'none',
        }}
      />

      {/* Layer 2 — secondary color gradient (70% 60%) */}
      <div
        ref={layer2Ref}
        className="absolute inset-[-20%]"
        style={{
          background: `radial-gradient(circle at 70% 60%, ${secondaryColor}22, transparent 60%)`,
          filter: filterStyle,
          willChange: 'transform, opacity',
          mixBlendMode: 'screen',
          transition: isStatic ? 'background 800ms ease-out' : 'none',
        }}
      />
    </div>
  );
};

export default KawarpBackground;
