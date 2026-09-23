import React, { useRef, useEffect } from 'react';
import { Reveal } from '../shared/Reveal';

export const Idea: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.008;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Rotating pure minimal sacred conic ring
      const radius = Math.min(cx, cy) * 0.65;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const grad = ctx.createConicGradient(0, 0, 0);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
      grad.addColorStop(0.5, 'rgba(0, 229, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle inner ring
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section className="landing-section" id="especificaciones">
      <div className="landing-container">
        <div className="landing-idea-layout">
          {/* Texto */}
          <div>
            <Reveal>
              <h2 className="landing-title-large">
                Audio que se siente.
              </h2>
            </Reveal>
            <Reveal delay={300}>
              <p className="landing-text-body mt-8 sm:mt-12 ml-4 sm:ml-12">
                Visualizadores que reaccionan a cada nota. Control gestual. Sin cables. Sin fricción.
              </p>
            </Reveal>
          </div>
          {/* Elemento vivo */}
          <Reveal delay={400}>
            <div className="liquid-glass--card p-8 aspect-square max-w-md mx-auto lg:mx-0 lg:ml-auto flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                id="landing-mini-void"
                className="w-full h-full object-contain"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
