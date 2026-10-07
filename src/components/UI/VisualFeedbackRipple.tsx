import React, { useState, useEffect } from 'react';

interface ShockwaveInstance {
  id: number;
  x: number;
  y: number;
  color: string;
}

const SHOCKWAVE_EVENT = 'aura-visual-shockwave';

/**
 * Dispara una onda de choque luminosa radial (ripple glow) desde unas coordenadas específicas o el centro de la pantalla.
 */
export function triggerVisualShockwave(options?: { x?: number; y?: number; color?: string }) {
  if (typeof window === 'undefined') return;
  const x = options?.x ?? window.innerWidth / 2;
  const y = options?.y ?? window.innerHeight / 2;
  const color = options?.color ?? '#00f2fe';

  window.dispatchEvent(
    new CustomEvent(SHOCKWAVE_EVENT, {
      detail: { x, y, color },
    })
  );
}

/**
 * VisualFeedbackRippleRoot — Capa global de ondas de choque luminosas para feedback visual de éxito
 */
export const VisualFeedbackRippleRoot: React.FC = () => {
  const [waves, setWaves] = useState<ShockwaveInstance[]>([]);

  useEffect(() => {
    const handleShockwave = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; color: string }>;
      const { x, y, color } = customEvent.detail;
      const id = Date.now() + Math.random();

      setWaves((prev) => [...prev, { id, x, y, color }]);

      setTimeout(() => {
        setWaves((prev) => prev.filter((w) => w.id !== id));
      }, 850);
    };

    window.addEventListener(SHOCKWAVE_EVENT, handleShockwave);
    return () => window.removeEventListener(SHOCKWAVE_EVENT, handleShockwave);
  }, []);

  if (waves.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {waves.map((wave) => (
        <div
          key={wave.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen"
          style={{
            left: wave.x,
            top: wave.y,
            width: 220,
            height: 220,
            background: `radial-gradient(circle, ${wave.color} 0%, rgba(255, 0, 128, 0.45) 45%, transparent 75%)`,
            animation: 'auraRippleExpand 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        />
      ))}
    </div>
  );
};

export default VisualFeedbackRippleRoot;
