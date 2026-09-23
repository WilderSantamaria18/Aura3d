import React, { useRef, useEffect } from 'react';
import { Reveal } from '../shared/Reveal';

export const Experience: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.015;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      const r = Math.min(cx, cy) * 0.6;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const theta = (i / 60) * Math.PI * 2;
        const offset = Math.sin(theta * 6 + t) * 6;
        const x = cx + Math.cos(theta) * (r + offset);
        const y = cy + Math.sin(theta) * (r + offset);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="landing-experience-grid">
          {/* Card 1 — Visualizador */}
          <Reveal>
            <div className="liquid-glass--card p-8">
              <div className="aspect-square w-full flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  id="landing-card-visualizer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-white">Visualizador</p>
                <p className="landing-text-small mt-1">8 formas · 10 efectos</p>
              </div>
            </div>
          </Reveal>

          {/* Card 2 — Reproductor */}
          <Reveal delay={200}>
            <div className="liquid-glass--card p-8">
              <div className="aspect-square w-full flex items-center justify-center">
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/60 border border-white/10" />
                  <div
                    className="absolute inset-2 rounded-full border border-cyan-400/20 animate-spin"
                    style={{ animationDuration: '8s' }}
                  />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-white">Reproductor</p>
                <p className="landing-text-small mt-1">YouTube · Spotify · Local</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
