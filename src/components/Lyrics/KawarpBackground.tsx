/**
 * KawarpBackground — Audio-reactive dynamic gradient background
 *
 * Renders two radial gradients from extracted cover art colors,
 * animated via transform (GPU-accelerated) modulated by bass/mids.
 *
 * Performance rules:
 * - Animation uses transform ONLY (no background-position changes)
 * - will-change: transform, opacity on both gradient layers
 * - If FPS < 50 for 2s → static mode (no RAF animation)
 * - Single RAF loop — no parallel animation loops
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';

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
  const [isStatic, setIsStatic] = useState(false);

  const { getSmoothedData } = useVisualizer(0.25);

  const animate = useCallback(() => {
    const now = performance.now();
    const timeSec = now * 0.001;
    frameCountRef.current++;

    // FPS check every 2 seconds
    const elapsed = now - lastFpsCheckRef.current;
    if (elapsed >= 2000) {
      const fps = (frameCountRef.current / elapsed) * 1000;
      frameCountRef.current = 0;
      lastFpsCheckRef.current = now;
      if (fps < 50) {
        setIsStatic(true);
        return; // Stop animation
      }
    }

    const { bass, mids, energy } = getSmoothedData();

    if (layer1Ref.current) {
      const tx = Math.sin(timeSec * 0.3) * bass * 20;
      const ty = Math.cos(timeSec * 0.25) * mids * 15;
      const sc = 1 + energy * 0.06;
      layer1Ref.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      layer1Ref.current.style.opacity = String(Math.min(0.7, opacity * (0.85 + bass * 0.45)));
    }

    if (layer2Ref.current) {
      const tx = Math.cos(timeSec * 0.22) * mids * 18;
      const ty = Math.sin(timeSec * 0.18) * bass * 12;
      const sc = 1 + energy * 0.04;
      layer2Ref.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      layer2Ref.current.style.opacity = String(Math.min(0.55, opacity * 0.7 * (0.85 + mids * 0.45)));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [getSmoothedData, opacity]);

  useEffect(() => {
    if (!visible || isStatic) return;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, isStatic, animate]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Background base */}
      <div className="absolute inset-0 bg-black" />

      {/* Layer 1 — primary color gradient (30% 40%) */}
      <div
        ref={layer1Ref}
        className="absolute inset-[-20%]"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${primaryColor}33, transparent 60%)`,
          filter: 'blur(60px)',
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
          filter: 'blur(60px)',
          willChange: 'transform, opacity',
          mixBlendMode: 'screen',
          transition: isStatic ? 'background 800ms ease-out' : 'none',
        }}
      />
    </div>
  );
};
