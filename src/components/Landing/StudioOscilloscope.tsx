import React, { useRef, useEffect, useState } from 'react';
import { Activity, Zap, Radio } from 'lucide-react';

interface StudioOscilloscopeProps {
  color?: string;
}

type WaveformMode = 'harmonic' | 'sine' | 'pulse';

/**
 * StudioOscilloscope
 * Osciloscopio analógico CRT de fósforo de alta precisión (Canal 01).
 * Rediseñado con la auténtica fórmula Apple visionOS Liquid Glass:
 * - Bisel especular superior de luz incidente
 * - Resina translúcida ahumada con difracción de 52px
 * - Retícula analógica con haz dual verde fósforo / cian cuántico a 60 FPS
 */
export const StudioOscilloscope: React.FC<StudioOscilloscopeProps> = ({
  color = '#00ff9d',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveMode, setWaveMode] = useState<WaveformMode>('harmonic');
  const [isCalibrated, setIsCalibrated] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const start = performance.now();

    const render = (now: number) => {
      const elapsed = (now - start) * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // 1. Sub-harmonic Cyan Waveform
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        let yOffset = 0;
        if (waveMode === 'sine') {
          yOffset = Math.sin(nx * Math.PI * 4 + elapsed * 3) * 22;
        } else if (waveMode === 'pulse') {
          const raw = Math.sin(nx * Math.PI * 6 + elapsed * 2.5);
          yOffset = (raw > 0 ? 14 : -14) * Math.sin(nx * Math.PI);
        } else {
          const w1 = Math.sin(nx * Math.PI * 4 + elapsed * 3.5) * 16;
          const w2 = Math.cos(nx * Math.PI * 8 - elapsed * 2) * 6;
          yOffset = w1 + w2;
        }
        const y = cy + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.55;
      ctx.stroke();

      // 2. Primary Phosphor Green Waveform with Glow
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const nx = x / w;
        let yOffset = 0;
        if (waveMode === 'sine') {
          yOffset = Math.sin(nx * Math.PI * 6 + elapsed * 4.5) * 32;
        } else if (waveMode === 'pulse') {
          const raw = Math.sin(nx * Math.PI * 8 + elapsed * 3.5);
          yOffset = (raw > 0.05 ? 24 : -24) * Math.sin(nx * Math.PI);
        } else {
          const w1 = Math.sin(nx * Math.PI * 6 + elapsed * 4.2) * 26;
          const w2 = Math.sin(nx * Math.PI * 14 - elapsed * 5) * 9;
          const beatPulse = Math.sin(elapsed * 2.2) > 0.35 ? 1.2 : 0.9;
          yOffset = (w1 + w2) * beatPulse;
        }
        const y = cy + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Phosphor outer glow
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5;
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // Phosphor crisp core trace
      ctx.strokeStyle = '#c8ffe6';
      ctx.lineWidth = 1.75;
      ctx.globalAlpha = 0.95;
      ctx.stroke();

      // 3. Dynamic sweep points
      const sweepX1 = (elapsed * 110) % w;
      const sweepNx1 = sweepX1 / w;
      const sweepY1 = cy + Math.sin(sweepNx1 * Math.PI * 6 + elapsed * 4.2) * 26;

      ctx.beginPath();
      ctx.arc(sweepX1, sweepY1, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff9d';
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = '#00ff9d';
      ctx.shadowBlur = 10;
      ctx.fill();

      const sweepX2 = (elapsed * 75 + 120) % w;
      const sweepNx2 = sweepX2 / w;
      const sweepY2 = cy + Math.sin(sweepNx2 * Math.PI * 4 + elapsed * 3) * 22;

      ctx.beginPath();
      ctx.arc(sweepX2, sweepY2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.globalAlpha = 0.8;
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [color, waveMode]);

  const toggleWaveMode = () => {
    setWaveMode((prev) =>
      prev === 'harmonic' ? 'sine' : prev === 'sine' ? 'pulse' : 'harmonic'
    );
  };

  return (
    <div className="w-full max-w-md p-5 liquid-glass-card border border-white/10 border-t-white/30 shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] select-none transition-all duration-300">
      {/* Bezel Header */}
      <div className="flex items-center justify-between pb-3 px-1 text-[11px] font-mono text-white/70">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          CRT // CH1 SIG-IN
        </span>
        <span className="text-white/50 text-[10px]">128 BPM / 440.0 Hz</span>
        <span className="text-cyan-300 font-medium text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20">
          OSC-TRIG: AUTO
        </span>
      </div>

      {/* CRT Screen Container */}
      <div className="relative w-full h-48 sm:h-52 rounded-2xl bg-black/80 overflow-hidden shadow-[inset_0_2px_16px_rgba(0,0,0,0.95)] flex items-center justify-center border border-white/10">
        {/* Analog Sub-Grid (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 text-[#00ff9d] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="crt-grid-pattern"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#crt-grid-pattern)" />
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <line
            x1="50%"
            y1="0"
            x2="50%"
            y2="100%"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>

        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff9d]/5 to-transparent h-16 w-full pointer-events-none animate-[pulse_3s_ease-in-out_infinite]" />

        {/* Real-time HTML5 2D Vector Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="relative z-10 w-full h-full object-cover"
        />

        {/* CRT Vignette & Specular Lens Curve */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/60 via-transparent to-black/60" />
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_35px_rgba(0,255,157,0.12)]" />
      </div>

      {/* Oscilloscope Micro Controls Row */}
      <div className="grid grid-cols-4 gap-2 pt-3 text-center">
        <button
          type="button"
          onClick={toggleWaveMode}
          className="p-2 rounded-xl liquid-glass-pill border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer text-left sm:text-center"
          title="Alternar forma de onda"
        >
          <span className="block font-mono text-[9px] text-white/50">VOLT/DIV</span>
          <span className="font-mono text-[11px] text-cyan-200 font-semibold">50 mV</span>
        </button>

        <button
          type="button"
          onClick={toggleWaveMode}
          className="p-2 rounded-xl liquid-glass-pill border border-white/10 hover:border-cyan-400/40 hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer text-left sm:text-center"
          title="Alternar base de tiempo"
        >
          <span className="block font-mono text-[9px] text-white/50">TIME/DIV</span>
          <span className="font-mono text-[11px] text-cyan-200 font-semibold">1.2 ms</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCalibrated((prev) => !prev)}
          className="p-2 rounded-xl liquid-glass-pill border border-white/10 hover:border-emerald-400/40 hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer text-left sm:text-center"
          title="Alternar calibración de fase"
        >
          <span className="block font-mono text-[9px] text-white/50">CALIBR</span>
          <span
            className={`font-mono text-[11px] font-semibold ${
              isCalibrated ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {isCalibrated ? 'PHASE-OK' : 'OFFSET'}
          </span>
        </button>

        <button
          type="button"
          onClick={toggleWaveMode}
          className="p-2 rounded-xl liquid-glass-pill border border-white/10 hover:border-purple-400/40 hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer text-left sm:text-center"
          title="Alternar modo espectral"
        >
          <span className="block font-mono text-[9px] text-white/50">SPECTR</span>
          <span className="font-mono text-[11px] text-purple-300 font-semibold uppercase">
            {waveMode === 'harmonic' ? 'STEREO' : waveMode}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StudioOscilloscope;
