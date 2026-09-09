import React, { useState } from 'react';
import { Disc3, Sparkles, Radio, Waves, Activity } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import type { VisualizerShape } from '../../types/audio';

const TURNTABLE_PRESETS: { id: VisualizerShape; label: string; icon: any }[] = [
  { id: 'vortex', label: 'Vórtex', icon: Radio },
  { id: 'kaleidoscope', label: 'Caleidoscopio', icon: Sparkles },
  { id: 'fractal', label: 'Fractal', icon: Waves },
  { id: 'bars', label: 'Spectrum', icon: Activity },
];

/**
 * StudioTurntableDeck
 * Tornamesa virtual de vinilo de alta gama con halo arcoíris y selector de modos reactivos.
 */
export const StudioTurntableDeck: React.FC = () => {
  const { setBlobShape, blobShape } = usePlayerStore();
  const [pitch, setPitch] = useState(0);
  const [isPlaying] = useState(true);

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-[#070b16]/95 border border-white/[0.10] shadow-[0_30px_70px_rgba(0,0,0,0.85)] p-6 backdrop-blur-2xl text-white font-mono select-none">
      {/* ── Turntable Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Disc3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              RAINBOW VOID // DIRECT DRIVE
            </div>
            <div className="text-[10px] text-white/40">33 ⅓ RPM HI-FI ROTATIONAL ENGINE</div>
          </div>
        </div>

        {/* BPM & Speed display */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/[0.06] text-xs">
          <span className="text-white/40 text-[10px]">SPEED</span>
          <span className="text-cyan-400 font-bold tabular-nums">
            {(128 + pitch * 1.5).toFixed(1)} BPM
          </span>
        </div>
      </div>

      {/* ── Center Platter & Vinyl Disc Area ── */}
      <div className="relative my-6 flex items-center justify-center py-4">
        {/* Outer Rainbow Dispersion Halo */}
        <div
          className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full pointer-events-none transition-all duration-300 will-change-transform"
          style={{
            background:
              'conic-gradient(from 0deg, #ff088a, #8a2be2, #00f2fe, #00ffb3, #ffe600, #ff5e00, #ff088a)',
            filter: 'blur(22px)',
            opacity: isPlaying ? 0.35 : 0.15,
            transform: 'scale(1.08) translateZ(0)',
          }}
        />

        {/* Brushed Metal Platter Ring */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-[#0d1222] border-2 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Vinyl Disc Grooves with sheen */}
          <div
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#060810] border border-white/20 shadow-inner relative flex items-center justify-center ${
              isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
            }`}
          >
            {/* Concentric micro-groove sheen rings */}
            <div className="absolute inset-[10%] rounded-full border border-white/[0.04] pointer-events-none" />
            <div className="absolute inset-[20%] rounded-full border border-white/[0.03] pointer-events-none" />
            <div className="absolute inset-[30%] rounded-full border border-white/[0.04] pointer-events-none" />
            <div className="absolute inset-[40%] rounded-full border border-white/[0.03] pointer-events-none" />
            {/* Optical sheen reflection gradient */}
            <div
              className="absolute inset-0 rounded-full opacity-35 pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.12) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.12) 225deg, transparent 270deg)',
              }}
            />

            {/* Central Label / Void Spindle */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-pink-500 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#070b16] flex items-center justify-center relative">
                <div className="w-3 h-3 rounded-full bg-black border border-white/60 shadow" />
              </div>
            </div>
          </div>

          {/* Tonearm Stylus arm overlay */}
          <div
            className="absolute top-2 right-4 w-1 h-36 bg-gradient-to-b from-white/70 via-white/40 to-white/10 origin-top transform rotate-18 pointer-events-none shadow-lg"
            style={{
              transform: isPlaying ? 'rotate(18deg)' : 'rotate(-15deg)',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Cartridge head with LED indicator */}
            <div className="absolute bottom-0 -left-1.5 w-4 h-5 rounded bg-black border border-white/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shadow-[0_0_6px_#ff088a]" />
            </div>
          </div>
        </div>

        {/* Pitch Slider on the right */}
        <div className="ml-4 flex flex-col items-center gap-1.5">
          <span className="text-[9px] text-white/40 font-mono">PITCH</span>
          <div className="relative w-4 h-32 flex items-center justify-center">
            <div className="w-0.5 h-full bg-white/20 rounded-full" />
            <input
              type="range"
              min="-8"
              max="8"
              step="0.5"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="absolute w-28 h-4 -rotate-90 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute w-4 h-6 rounded bg-white text-black text-[7px] font-bold flex items-center justify-center shadow pointer-events-none"
              style={{
                bottom: `${((pitch + 8) / 16) * 78}%`,
              }}
            >
              0
            </div>
          </div>
          <span className="text-[8px] text-white/40 tabular-nums">
            {pitch > 0 ? `+${pitch}` : pitch}%
          </span>
        </div>
      </div>

      {/* ── Mode Selection Tiles ── */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.08]">
        {TURNTABLE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = blobShape === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => setBlobShape(preset.id)}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs active:scale-95 ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-white/40'}`} />
              <span className="text-[10px] font-medium tracking-wide">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StudioTurntableDeck;
