import React, { useRef, useEffect } from 'react';

interface StudioOscilloscopeProps {
  color?: string;
}

/**
 * StudioOscilloscope
 * Osciloscopio de fósforo CRT de alta precisión con trazado de ondas armónicas en tiempo real.
 */
export const StudioOscilloscope: React.FC<StudioOscilloscopeProps> = ({
  color = '#00e5ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let start = performance.now();

    const render = (now: number) => {
      const elapsed = (now - start) * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Grid background (Studio CRT lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let y = 15; y < h; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // Vertical grid lines
      for (let x = 20; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Center crosshair
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      // Dual harmonic waveform
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        const wave1 = Math.sin(nx * Math.PI * 6 + elapsed * 4.5) * 18;
        const wave2 = Math.sin(nx * Math.PI * 14 - elapsed * 6) * 8;
        const wave3 = Math.cos(nx * Math.PI * 2 + elapsed * 2) * 5;
        const beatPulse = Math.sin(elapsed * 2.2) > 0.4 ? 1.25 : 0.85;
        const y = cy + (wave1 + wave2 + wave3) * beatPulse;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Phosphor trace glow layer (hardware-accelerated wide stroke, 0 CPU blur overhead)
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Phosphor trace crisp core layer
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.75;
      ctx.stroke();

      // Bright leading sweep point
      const sweepX = (elapsed * 90) % w;
      const sweepY =
        cy +
        (Math.sin((sweepX / w) * Math.PI * 6 + elapsed * 4.5) * 18 +
          Math.sin((sweepX / w) * Math.PI * 14 - elapsed * 6) * 8) *
          (Math.sin(elapsed * 2.2) > 0.4 ? 1.25 : 0.85);

      // Glow halo around point
      ctx.beginPath();
      ctx.arc(sweepX, sweepY, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fill();

      // Sharp center point
      ctx.beginPath();
      ctx.arc(sweepX, sweepY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return (
    <div className="relative w-full h-24 rounded-lg overflow-hidden bg-[#030712] border border-white/[0.08] shadow-inner">
      <canvas
        ref={canvasRef}
        width={320}
        height={96}
        className="w-full h-full object-cover"
      />
      <div className="absolute top-1.5 left-2 flex items-center gap-1.5 font-mono text-[9px] text-white/40 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>OSC-1 // REALTIME FFT</span>
      </div>
      <div className="absolute top-1.5 right-2 font-mono text-[9px] text-white/40 pointer-events-none">
        48 kHz
      </div>
    </div>
  );
};

export default StudioOscilloscope;
