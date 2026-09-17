import React, { useState } from 'react';
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
 * Disco de vinilo de 33⅓ RPM con micro-surcos, dispersión cónica cromática,
 * brazo metálico, pitch con tempo maestro variable y selector de deformación espectral.
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
        <div className="relative w-full max-w-[420px] sm:max-w-md aspect-square p-5 sm:p-6 rounded-3xl bg-[#1a1b21]/90 border border-white/[0.08] backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.65)] flex items-center justify-center overflow-hidden">
          {/* Metallic Chassis Corner Highlights */}
          <div className="absolute top-4 left-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff088a] shadow-[0_0_8px_#ff088a] animate-pulse" />
            <span className="font-mono text-[10px] text-[#849495] tracking-wider">
              DIRECT DRIVE 33⅓ RPM
            </span>
          </div>
          <div className="absolute top-4 right-5 font-mono text-[10px] sm:text-[11px] text-[#00dbe9]">
            QUARTZ LOCK: ACTIVE
          </div>

          {/* Turntable Platter (Recessed Obsidian Circle) */}
          <div className="relative w-[86%] h-[86%] rounded-full bg-[#06080e] border border-white/[0.06] shadow-[inset_0_4px_24px_rgba(0,0,0,0.95),0_0_40px_rgba(0,229,255,0.08)] flex items-center justify-center">
            {/* Realistic Vinyl Record with Micro-Grooves */}
            <div
              onClick={() => setIsPlaying((prev) => !prev)}
              className="relative w-[92%] h-[92%] rounded-full bg-[#0a0c14] border border-white/10 shadow-[0_0_18px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-pointer transition-transform"
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
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,229,255,0.08)_45deg,transparent_90deg,rgba(140,56,255,0.08)_180deg,transparent_270deg)] pointer-events-none" />

              {/* Center Label: "Rainbow Void" Artwork */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#ff088a] via-[#8c38ff] to-[#00e5ff] p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#070913] flex flex-col items-center justify-center text-center p-2">
                  <span className="font-mono text-[7px] text-[#00e5ff] tracking-widest uppercase">
                    Aura3D Void
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#e3e1e9] leading-tight">
                    CHROMA
                  </span>
                  <span className="font-mono text-[7px] text-[#849495]">STEM 03</span>
                </div>
                {/* Spindle hole */}
                <div className="absolute w-4 h-4 rounded-full bg-[#1e202a] border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]" />
              </div>
            </div>

            {/* Sleek Metallic Tone-Arm Overlay */}
            <div
              className={`absolute -top-3 right-5 sm:right-6 w-12 h-60 pointer-events-none origin-top-right transition-transform duration-700 ease-out ${
                isPlaying ? 'rotate-[18deg]' : 'rotate-[-8deg]'
              }`}
            >
              {/* Pivot Base */}
              <div className="w-8 h-8 rounded-full bg-[#34343a] border border-white/20 shadow-lg mx-auto" />
              {/* Arm Tube */}
              <div className="w-1.5 h-40 bg-gradient-to-r from-[#849495] via-[#dbfcff] to-[#34343a] mx-auto shadow-md" />
              {/* Headshell / Cartridge */}
              <div className="w-4 h-8 rounded-sm bg-[#00f0ff] mx-auto -mt-1 shadow-[0_0_10px_#00f0ff] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#002022]" />
              </div>
            </div>
          </div>

          {/* Platter Strobe Dots */}
          <div className="absolute bottom-4 left-5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
            <span className="w-1 h-1 rounded-full bg-[#34343a]" />
            <span className="w-1 h-1 rounded-full bg-[#34343a]" />
            <span className="font-mono text-[9px] text-[#849495] ml-1">STROBE SYNC</span>
          </div>
        </div>
      </div>

      {/* ── Turntable Telemetry & Presets (Right) ── */}
      <div className="lg:col-span-5 flex flex-col items-start gap-5">
        <div>
          <span className="font-mono text-[10px] sm:text-[11px] text-[#7df4ff] tracking-wider uppercase">
            [ 03 // NÚCLEO CINÉTICO DE VINILO ]
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e3e1e9] mt-0.5">
            Tornamesa Virtual Rainbow Void
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#b9cacb] mt-2 leading-relaxed">
            Emulación física de masa giratoria, deslizamiento de aguja y difracción de espectro óptico en un disco virtual de alta fricción.
          </p>
        </div>

        {/* Pitch & BPM Display Card */}
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-[#1a1b21]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-[#849495] uppercase block">
                TEMPO MAESTRO
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#00f0ff]">
                {bpm.toFixed(1)}{' '}
                <span className="text-xs text-[#849495] font-normal">BPM</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-2 py-0.5 rounded bg-[#292a2f] border border-white/[0.06] font-mono text-[10px] text-[#00ff9d]">
                KEY LOCK: ON
              </span>
              <span className="font-mono text-[11px] text-[#e3e1e9] mt-1">±8% RANGE</span>
            </div>
          </div>

          {/* Pitch Slider */}
          <div className="flex items-center gap-3 pt-1">
            <span className="font-mono text-[10px] text-[#849495]">118.0</span>
            <input
              type="range"
              min="118"
              max="138"
              step="0.1"
              value={bpm}
              onChange={handlePitchChange}
              className="w-full accent-[#00f0ff] bg-[#34343a] h-1.5 rounded-full cursor-pointer"
            />
            <span className="font-mono text-[10px] text-[#849495]">138.0</span>
          </div>
        </div>

        {/* Shape Preset Tactile Selectors */}
        <div className="w-full flex flex-col gap-2">
          <span className="font-mono text-[10px] text-[#849495] uppercase tracking-wider">
            MODELO DE DEFORMACIÓN ESPECTRAL
          </span>
          <div className="grid grid-cols-2 gap-2 w-full">
            {SHAPE_PRESETS.map((preset) => {
              const isSelected = blobShape === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBlobShape(preset.id)}
                  className={`px-4 py-3 rounded-xl font-mono text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00f0ff] text-[#002022] shadow-[0_0_16px_rgba(0,240,255,0.35)]'
                      : 'bg-[#1e1f25] hover:bg-[#292a2f] text-[#e3e1e9] border border-white/[0.04]'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-[#002022]' : 'bg-[#34343a]'
                    }`}
                  />
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
