import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Activity } from 'lucide-react';

const FREQUENCIES = [
  { label: '32Hz', type: 'SUB' },
  { label: '64Hz', type: 'BASS' },
  { label: '125Hz', type: 'BASS' },
  { label: '500Hz', type: 'MID' },
  { label: '1kHz', type: 'MID' },
  { label: '4kHz', type: 'HIGH' },
  { label: '8kHz', type: 'HIGH' },
  { label: '16kHz', type: 'AIR' },
];

/**
 * StudioMixerDeck
 * Consola de masterización optimizada para 60 FPS sin re-renders de React en el bucle de animación.
 * Los medidores VU y las barras LED se actualizan directamente mediante Canvas 2D y DOM refs.
 */
export const StudioMixerDeck: React.FC = () => {
  const [faderValues, setFaderValues] = useState<number[]>([75, 65, 80, 50, 60, 85, 70, 78]);
  const faderValuesRef = useRef(faderValues);
  faderValuesRef.current = faderValues;

  const vuLeftRef = useRef<HTMLDivElement>(null);
  const vuRightRef = useRef<HTMLDivElement>(null);
  const ledCanvasRef = useRef<HTMLCanvasElement>(null);

  // Direct 60 FPS loop without triggering React component re-renders
  useEffect(() => {
    let animId: number;
    let start = performance.now();
    let vuL = 0.65;
    let vuR = 0.72;

    const canvas = ledCanvasRef.current;
    const ctx = canvas?.getContext('2d');

    const loop = (now: number) => {
      const elapsed = (now - start) * 0.001;

      // Simulated rhythm beats at 128 BPM
      const beat = Math.sin(elapsed * 4.2);
      const sub = Math.max(0, Math.sin(elapsed * 2.1));

      // 1. Update VU needles directly in DOM
      const targetL = Math.max(0.2, Math.min(0.95, 0.5 + beat * 0.35 + (sub > 0.7 ? 0.15 : 0)));
      const targetR = Math.max(0.18, Math.min(0.92, 0.48 + beat * 0.32 + Math.cos(elapsed * 3) * 0.1));
      vuL += (targetL - vuL) * 0.2;
      vuR += (targetR - vuR) * 0.2;

      if (vuLeftRef.current) {
        vuLeftRef.current.style.transform = `rotate(${(vuL - 0.5) * 70}deg)`;
      }
      if (vuRightRef.current) {
        vuRightRef.current.style.transform = `rotate(${(vuR - 0.5) * 70}deg)`;
      }

      // 2. Draw all 8 LED ladders in a single lightweight canvas (0 React overhead)
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const colWidth = canvas.width / 8;

        faderValuesRef.current.forEach((val, idx) => {
          const offset = Math.sin(elapsed * 5 + idx * 0.8) * 0.3;
          const reactive = (val / 100) * 8 * (0.6 + (beat > 0.3 ? 0.35 : 0) + offset * 0.2);
          const activeSegments = Math.max(1, Math.min(8, Math.round(reactive)));

          const startX = idx * colWidth + (colWidth - 8) / 2;

          for (let seg = 1; seg <= 8; seg++) {
            const isLit = seg <= activeSegments;
            const y = canvas.height - seg * 5 - 2;

            if (isLit) {
              if (seg === 8) {
                ctx.fillStyle = '#ef4444'; // Red peak
              } else if (seg >= 6) {
                ctx.fillStyle = '#f59e0b'; // Amber
              } else {
                ctx.fillStyle = '#10b981'; // Green
              }
            } else {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            }

            ctx.fillRect(startX, y, 8, 3.5);
          }
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleFaderChange = (idx: number, newVal: number) => {
    setFaderValues((prev) => {
      const next = [...prev];
      next[idx] = newVal;
      return next;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl bg-[#070b16]/95 border border-white/[0.10] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-5 backdrop-blur-xl text-white font-mono select-none">
      {/* ── Top Mixer Header: VU Meters & Master Telemetry ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.10] flex items-center justify-center text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>DSP-800 MASTER CONSOLE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-white/40">10-BAND STEREO GRAPHIC EQUALIZER</div>
          </div>
        </div>

        {/* Dual Analog VU Meters */}
        <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/[0.06]">
          {/* VU Left */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center justify-between w-20 text-[8px] text-white/40">
              <span>-20dB</span>
              <span>0dB</span>
              <span className="text-red-400">+3</span>
            </div>
            <div className="relative w-20 h-6 bg-[#04060d] rounded border border-white/10 overflow-hidden flex items-end justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-yellow-950/20 to-red-950/30" />
              {/* Pivot Needle via DOM ref */}
              <div
                ref={vuLeftRef}
                className="absolute bottom-0 w-0.5 h-6 bg-red-400 origin-bottom will-change-transform"
                style={{ transform: 'rotate(10deg)' }}
              />
              <span className="relative z-10 text-[8px] font-bold text-white/50 mb-0.5">L</span>
            </div>
          </div>

          {/* VU Right */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center justify-between w-20 text-[8px] text-white/40">
              <span>-20dB</span>
              <span>0dB</span>
              <span className="text-red-400">+3</span>
            </div>
            <div className="relative w-20 h-6 bg-[#04060d] rounded border border-white/10 overflow-hidden flex items-end justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-yellow-950/20 to-red-950/30" />
              <div
                ref={vuRightRef}
                className="absolute bottom-0 w-0.5 h-6 bg-red-400 origin-bottom will-change-transform"
                style={{ transform: 'rotate(15deg)' }}
              />
              <span className="relative z-10 text-[8px] font-bold text-white/50 mb-0.5">R</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 8 LED Ladders in Single Canvas for 0 Re-renders ── */}
      <div className="w-full pt-4 pb-1">
        <canvas
          ref={ledCanvasRef}
          width={480}
          height={48}
          className="w-full h-12 block"
        />
      </div>

      {/* ── 8 Channel Strips (Faders and Labels) ── */}
      <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5">
        {FREQUENCIES.map((freq, idx) => {
          const val = faderValues[idx];

          return (
            <div
              key={freq.label}
              className="flex flex-col items-center gap-2 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors group"
            >
              {/* Frequency Label */}
              <span className="text-[10px] font-semibold text-white/80 group-hover:text-cyan-300 transition-colors">
                {freq.label}
              </span>

              {/* Vertical Fader Track & Thumb */}
              <div className="relative w-6 h-28 flex items-center justify-center">
                <div className="w-1 h-full bg-[#03060f] rounded-full border border-white/10" />
                <div className="absolute inset-y-2 left-0 w-1 flex flex-col justify-between pointer-events-none opacity-25">
                  <div className="w-1 h-px bg-white" />
                  <div className="w-1 h-px bg-white" />
                  <div className="w-1.5 h-px bg-cyan-400" />
                  <div className="w-1 h-px bg-white" />
                  <div className="w-1 h-px bg-white" />
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={val}
                  onChange={(e) => handleFaderChange(idx, parseInt(e.target.value))}
                  className="absolute w-24 h-6 -rotate-90 cursor-pointer opacity-0 z-10"
                />

                <div
                  className="absolute w-5 h-6 rounded bg-gradient-to-b from-white via-[#cdd4e0] to-[#8d98aa] border border-black/40 shadow-[0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none transition-all flex items-center justify-center"
                  style={{
                    bottom: `${(val / 100) * 75}%`,
                  }}
                >
                  <div className="w-3 h-0.5 bg-black/60 rounded-full" />
                </div>
              </div>

              {/* Value display */}
              <span className="text-[9px] text-white/40 tabular-nums font-mono">
                {val > 50 ? `+${((val - 50) * 0.24).toFixed(0)}` : `${((val - 50) * 0.24).toFixed(0)}`}dB
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Controls Bar ── */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-white/50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Activity className="w-3 h-3" /> THD: &lt;0.001%
          </span>
          <span className="hidden sm:inline">SNR: 118dB</span>
        </div>
        <div className="text-white/40 font-mono">60 FPS DIRECT HARDWARE DSP</div>
      </div>
    </div>
  );
};

export default StudioMixerDeck;
