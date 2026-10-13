import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { ambientDustEnabled } from '../../config/vizAtmosphere';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

/**
 * AmbientGlow — viñeta cinematográfica y polvo espacial ambiental.
 *
 * Se retiraron los efectos de sombreado ligados al ratón (foco especular que
 * seguía al cursor, estela de partículas y paralaje del polvo): cada `mousemove`
 * actualizaba estado de React y añadía hasta 4 partículas nuevas con su propio
 * `save()/restore()`, además de reescribir un gradiente a pantalla completa. El
 * canvas se queda con el polvo ambiental, que ya es reactivo al audio.
 */
export const AmbientGlow: React.FC = React.memo(() => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary || '#00f2fe');
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const { beatPulse, primaryColor: aiColor } = useAIAudioEngine();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeColor = isLucid ? lucidPrimary : aiColor || '#00e5ff';

  const beatPulseRef = useRef(beatPulse);
  beatPulseRef.current = beatPulse;
  const activeColorRef = useRef(activeColor);
  activeColorRef.current = activeColor;
  const visualizerModeRef = useRef(visualizerMode);
  visualizerModeRef.current = visualizerMode;

  // Ambient Space Dust Loop (single persistent 60fps loop without GC churn)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const particleCount = 35;
    const initialColor = activeColorRef.current;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      size: 1.0 + Math.random() * 2.2,
      alpha: 0.15 + Math.random() * 0.45,
      color: Math.random() > 0.5 ? initialColor : '#ffffff',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mode = visualizerModeRef.current;
      // ── Draw Ambient Floating Space Dust (Only in 3D scenes, disabled in 2D Rainbow Void) ──
      if (mode !== 'blob' && ambientDustEnabled(mode)) {
        const pulse = beatPulseRef.current;
        const color = activeColorRef.current;
        const pulseMult = 0.6 + pulse * 0.4;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          // Wrap around
          if (p.y < -10) p.y = height + 10;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color === '#ffffff' ? '#ffffff' : color;
          ctx.globalAlpha = p.alpha * pulseMult;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none">
      {/* ── 1. Cinematic Vignette & Depth of Field ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 52%, rgba(2, 4, 10, 0.45) 82%, rgba(1, 2, 6, 0.88) 100%)',
        }}
      />

      {/* ── 2. Ambient Space Dust Canvas ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
});
