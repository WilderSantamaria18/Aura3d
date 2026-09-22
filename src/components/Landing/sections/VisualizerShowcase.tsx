import React, { useRef, useEffect } from 'react';
import { Sparkles, Layers, Sliders, Palette, Zap, ArrowRight } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface VisualizerShowcaseProps {
  onStartExperience: () => void;
}

export const VisualizerShowcase: React.FC<VisualizerShowcaseProps> = ({
  onStartExperience,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live Canvas Simulation of Rainbow Void (Lightweight, pure 60fps canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.025;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.28;

      // Draw concentric glowing liquid rings
      for (let ring = 0; ring < 4; ring++) {
        ctx.beginPath();
        const numPoints = 64;
        const ringOffset = ring * 12;

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const wobble =
            Math.sin(angle * 6 + t * 2 + ring) * 8 +
            Math.cos(angle * 3 - t) * 6;
          const r = baseRadius - ringOffset + wobble;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const hue = (t * 20 + ring * 45) % 360;
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.7 - ring * 0.15})`;
        ctx.lineWidth = 2.5 - ring * 0.4;
        ctx.shadowColor = `hsla(${hue}, 90%, 55%, 0.8)`;
        ctx.shadowBlur = 14;
        ctx.stroke();
      }

      // Center Core
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(3, 5, 12, 0.9)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Columna Izquierda: Canvas Visualizer Demo */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="landing-v2-preview-card w-full max-w-[540px] aspect-square flex flex-col p-6 items-center justify-between group">
          {/* Header del Card */}
          <div className="w-full flex items-center justify-between z-10">
            <GlassBadge label="LIVE DSP KERNEL" ledColor="cyan" />
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300/80">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>FFT 2048</span>
            </div>
          </div>

          {/* Canvas reactivo */}
          <div className="relative w-full flex-1 flex items-center justify-center my-4">
            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              className="w-full max-w-[340px] max-h-[340px] aspect-square pointer-events-none drop-shadow-[0_0_40px_rgba(0,229,255,0.3)] transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/[0.04] pointer-events-none rounded-2xl" />
          </div>

          {/* Card Footer telemetry */}
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-white/50 border-t border-white/[0.08] pt-3 z-10">
            <span>RESORTE ARMÓNICO iOS</span>
            <span className="text-cyan-400">60 FPS SINCRÓNICOS</span>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Explicación de características */}
      <div className="lg:col-span-5 flex flex-col items-start gap-4">
        <GlassBadge label="02 • MOTOR DE VISUALIZACIÓN" ledColor="green" />

        <h2 className="landing-v2-section-title">
          Rainbow Void
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
            Física cuántica en tiempo real.
          </span>
        </h2>

        <p className="landing-v2-section-description">
          Un motor procedural de deformación de malla líquida impulsado por la
          frecuencia del audio nativo. Reacciona a transitorios, bombos sub-graves
          y armónicos vocales con precisión milimétrica.
        </p>

        {/* Feature List */}
        <div className="flex flex-col gap-2.5 w-full mt-2">
          <div className="landing-v2-feature">
            <Layers className="landing-v2-feature-icon" />
            <span>8 geometrías sagradas (Círculo, Polígono, Flor, Cápsula...)</span>
          </div>
          <div className="landing-v2-feature">
            <Sliders className="landing-v2-feature-icon" />
            <span>10 efectos Pro (Shockwaves, Destellos, Scanlines holográficos)</span>
          </div>
          <div className="landing-v2-feature">
            <Palette className="landing-v2-feature-icon" />
            <span>Paletas cinemáticas con auto-extracción de carátula</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartExperience}
          className="mt-4 landing-v2-cta-secondary group"
        >
          <span>Experimentar visualizadores</span>
          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
