import React, { useRef, useEffect, useState } from 'react';

interface StudioOscilloscopeProps {
  color?: string;
}

type WaveformMode = 'harmonic' | 'sine' | 'pulse';

/**
 * StudioOscilloscope
 * Osciloscopio de fósforo CRT de alta precisión con trazado de ondas armónicas en tiempo real
 * y selector interactivo de forma de onda.
 */
export const StudioOscilloscope: React.FC<StudioOscilloscopeProps> = ({
  color = '#00e5ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveMode, setWaveMode] = useState<WaveformMode>('harmonic');

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

      // Waveform calculation based on active mode
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        let yOffset = 0;

        if (waveMode === 'sine') {
          yOffset = Math.sin(nx * Math.PI * 6 + elapsed * 5) * 20;
        } else if (waveMode === 'pulse') {
          const raw = Math.sin(nx * Math.PI * 8 + elapsed * 4);
          yOffset = (raw > 0.1 ? 16 : -16) * Math.sin(nx * Math.PI);
        } else {
          // Harmonic mode
          const wave1 = Math.sin(nx * Math.PI * 6 + elapsed * 4.5) * 18;
          const wave2 = Math.sin(nx * Math.PI * 14 - elapsed * 6) * 8;
          const wave3 = Math.cos(nx * Math.PI * 2 + elapsed * 2) * 5;
          const beatPulse = Math.sin(elapsed * 2.2) > 0.4 ? 1.25 : 0.85;
          yOffset = (wave1 + wave2 + wave3) * beatPulse;
        }

        const y = cy + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Phosphor trace glow layer
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
      const sweepNx = sweepX / w;
      let sweepYOffset = 0;
      if (waveMode === 'sine') {
        sweepYOffset = Math.sin(sweepNx * Math.PI * 6 + elapsed * 5) * 20;
      } else if (waveMode === 'pulse') {
        const raw = Math.sin(sweepNx * Math.PI * 8 + elapsed * 4);
        sweepYOffset = (raw > 0.1 ? 16 : -16) * Math.sin(sweepNx * Math.PI);
      } else {
        sweepYOffset =
          (Math.sin(sweepNx * Math.PI * 6 + elapsed * 4.5) * 18 +
            Math.sin(sweepNx * Math.PI * 14 - elapsed * 6) * 8) *
          (Math.sin(elapsed * 2.2) > 0.4 ? 1.25 : 0.85);
      }

      const sweepY = cy + sweepYOffset;

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
  }, [color, waveMode]);

  return (
    <div className="relative w-full h-24 rounded-xl overflow-hidden bg-[#05070d] border border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] group">
      {/* Corner rack screw markers */}
      <span className="absolute top-1 left-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
      <span className="absolute top-1 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
      <span className="absolute bottom-1 left-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
      <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>

      <canvas
        ref={canvasRef}
        width={320}
        height={96}
        className="w-full h-full object-cover"
      />

      <div className="absolute top-2 left-4 flex items-center gap-2 font-mono text-[9px] text-[#8b95a5]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
        <span className="tracking-wider">OSC-1 // REALTIME FFT</span>
      </div>

      {/* Waveform Selector Badge */}
      <button
        type="button"
        onClick={() =>
          setWaveMode((prev) => (prev === 'harmonic' ? 'sine' : prev === 'sine' ? 'pulse' : 'harmonic'))
        }
        className="absolute top-2 right-4 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 font-mono text-[9px] uppercase tracking-wider text-[#00e5ff] transition-colors cursor-pointer"
        title="Clic para alternar forma de onda del osciloscopio"
      >
        MODE: {waveMode}
      </button>

      {/* Telemetry bottom bar */}
      <div className="absolute bottom-1.5 left-4 right-4 flex items-center justify-between font-mono text-[8px] text-[#556075]">
        <span>48.0 kHz SAMPLING</span>
        <span className="tabular-nums">RMS: -14.2 dB</span>
      </div>
    </div>
  );
};

export default StudioOscilloscope;
