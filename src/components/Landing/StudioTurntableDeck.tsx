import React, { useState } from 'react';
import { Disc, Play, Pause, Flame } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import type { VisualizerShape } from '../../types/audio';

interface ShapePreset {
  id: VisualizerShape;
  label: string;
}

const SHAPE_PRESETS: ShapePreset[] = [
  { id: 'vortex', label: 'Vórtex' },
  { id: 'kaleidoscope', label: 'Caleidoscopio' },
  { id: 'fractal', label: 'Fractal' },
  { id: 'cat_ears', label: 'Cat-Ears Spectrum' },
];

/**
 * StudioTurntableDeck
 * Tornamesa Virtual Rainbow Void de alta fricción con tracción directa (Canal 03).
 * Rediseñada con la auténtica fórmula Apple visionOS Liquid Glass:
 * - Chasis de cristal líquido ahumado con bisel de luz incidente
 * - Disco de vinilo a 33⅓ RPM con micro-surcos y dispersión cónica cromática
 * - Controles de pitch DJ y deformador espectral en cápsulas de vidrio
 */
export const StudioTurntableDeck: React.FC = () => {
  const { blobShape, setBlobShape } = usePlayerStore();
  const [bpm, setBpm] = useState<number>(128.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Calculate rotation speed in seconds: faster BPM = lower spin duration
  const spinDuration = (128 / bpm) * 4;

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(parseFloat(e.target.value));
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center select-none font-sans">
      {/* ── Turntable Hardware Body (Left/Center) ── */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="relative w-full max-w-[420px] sm:max-w-md aspect-square p-5 sm:p-6 liquid-glass-card border border-white/10 border-t-white/30 shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] flex items-center justify-center overflow-hidden">
          {/* Metallic Chassis Corner Highlights */}
          <div className="absolute top-4 left-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
            <span className="font-mono text-[10px] text-white/60 tracking-wider">
              DIRECT DRIVE 33⅓ RPM
            </span>
          </div>
          <div className="absolute top-4 right-5 font-mono text-[10px] sm:text-[11px] text-cyan-300">
            QUARTZ LOCK: ACTIVE
          </div>

          {/* Turntable Platter (Recessed Obsidian Liquid Glass Circle) */}
          <div className="relative w-[86%] h-[86%] rounded-full bg-black/80 border border-white/10 shadow-[inset_0_4px_24px_rgba(0,0,0,0.95),0_0_40px_rgba(0,229,255,0.12)] flex items-center justify-center">
            {/* Realistic Vinyl Record with Micro-Grooves */}
            <div
              onClick={() => setIsPlaying((prev) => !prev)}
              className="relative w-[92%] h-[92%] rounded-full bg-[#080a10] border border-white/10 shadow-[0_0_24px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-pointer transition-transform group"
              style={{
                animation: isPlaying
                  ? `spin ${spinDuration}s linear infinite`
                  : 'none',
              }}
              title="Clic para pausar o girar el vinilo"
            >
              {/* Micro-groove Refraction Rings */}
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-7 sm:inset-8 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-11 sm:inset-12 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-14 sm:inset-16 rounded-full border border-white/[0.02]" />
              <div className="absolute inset-18 sm:inset-20 rounded-full border border-white/[0.05]" />
              <div className="absolute inset-22 sm:inset-24 rounded-full border border-white/[0.03]" />

              {/* Subtle Conic Chromatic Dispersion Reflection */}
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,229,255,0.12)_45deg,transparent_90deg,rgba(168,85,247,0.12)_180deg,transparent_270deg)] pointer-events-none" />

              {/* Center Label: "Rainbow Void" Artwork */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-cyan-400 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-black/90 flex flex-col items-center justify-center text-center p-2">
                  <span className="font-mono text-[7px] text-cyan-300 tracking-widest uppercase">
                    Aura3D Void
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold text-white leading-tight">
                    CHROMA
                  </span>
                  <span className="font-mono text-[7px] text-white/50">STEM 03</span>
                </div>
                {/* Spindle hole */}
                <div className="absolute w-4 h-4 rounded-full bg-white/20 border border-white/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]" />
              </div>
            </div>

            {/* Sleek Metallic Tone-Arm Overlay */}
            <div
              className={`absolute -top-3 right-5 sm:right-6 w-12 h-60 pointer-events-none origin-top-right transition-transform duration-700 ease-out ${
                isPlaying ? 'rotate-[18deg]' : 'rotate-[-8deg]'
              }`}
            >
              {/* Pivot Base */}
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 shadow-lg mx-auto backdrop-blur-md" />
              {/* Arm Tube */}
              <div className="w-1.5 h-40 bg-gradient-to-r from-white/40 via-cyan-200/80 to-white/20 mx-auto shadow-md" />
              {/* Headshell / Cartridge */}
              <div className="w-4 h-8 rounded-sm bg-cyan-400 mx-auto -mt-1 shadow-[0_0_12px_rgba(0,229,255,0.7)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </div>
          </div>

          {/* Platter Strobe Dots */}
          <div className="absolute bottom-4 left-5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="font-mono text-[9px] text-white/50 ml-1">STROBE SYNC</span>
          </div>
        </div>
      </div>

      {/* ── Turntable Telemetry & Presets (Right) ── */}
      <div className="lg:col-span-5 flex flex-col items-start gap-5">
        <div>
          <span className="font-mono text-[10px] sm:text-[11px] text-cyan-400 tracking-wider uppercase">
            [ 03 // NÚCLEO CINÉTICO DE VINILO ]
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
            Tornamesa Virtual Rainbow Void
          </h2>
          <p className="font-sans text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">
            Emulación física de masa giratoria, deslizamiento de aguja y difracción de espectro óptico en un disco virtual de alta fricción.
          </p>
        </div>

        {/* Pitch & BPM Display Card (Liquid Glass) */}
        <div className="w-full p-5 rounded-2xl liquid-glass-card border border-white/10 border-t-white/30 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-white/50 uppercase block">
                TEMPO MAESTRO
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-bold text-cyan-300">
                {bpm.toFixed(1)}{' '}
                <span className="text-xs font-normal text-white/50">BPM</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-4 py-2 liquid-glass-pill bg-white/10 hover:bg-white/15 text-white border border-white/20 flex items-center gap-2 font-mono text-xs active:scale-[0.97] transition-all cursor-pointer shadow-sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PAUSAR</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>GIRAR</span>
                </>
              )}
            </button>
          </div>

          {/* Pitch Slider Track */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between font-mono text-[10px] text-white/50">
              <span>-16% (96 BPM)</span>
              <span className="text-cyan-400 font-semibold">
                {(((bpm - 128) / 128) * 100).toFixed(1)}% PITCH
              </span>
              <span>+16% (160 BPM)</span>
            </div>
            <input
              type="range"
              min="96"
              max="160"
              step="0.5"
              value={bpm}
              onChange={handlePitchChange}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Spectral Deformation Shape Selector */}
        <div className="w-full flex flex-col gap-2">
          <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider">
            DEFORMACIÓN ESPECTRAL RAINBOW
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SHAPE_PRESETS.map((preset) => {
              const isSelected = blobShape === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBlobShape(preset.id)}
                  className={`p-2.5 rounded-xl text-left font-mono text-xs transition-all cursor-pointer flex items-center justify-between border active:scale-[0.97] ${
                    isSelected
                      ? 'liquid-glass bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-[0_0_16px_rgba(0,229,255,0.25)]'
                      : 'liquid-glass text-white/70 hover:text-white border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="truncate">{preset.label}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioTurntableDeck;
