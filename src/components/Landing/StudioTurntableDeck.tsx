import React, { useState } from 'react';
import { Disc3, Sparkles, Radio, Waves, Activity } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import type { VisualizerShape } from '../../types/audio';

const TURNTABLE_PRESETS: { id: VisualizerShape; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
    <div className="w-full max-w-xl mx-auto rounded-container bg-surface-dock border border-border-subtle shadow-dock p-6 material-regular text-text-primary font-mono select-none">
      {/* ── Turntable Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-white/10 border border-border-subtle flex items-center justify-center text-accent-rose">
            <Disc3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-primary">
              RAINBOW VOID // DIRECT DRIVE
            </div>
            <div className="text-caption text-text-tertiary">33 ⅓ RPM HI-FI ROTATIONAL ENGINE</div>
          </div>
        </div>

        {/* BPM & Speed display */}
        <div className="flex items-center gap-2 bg-surface-base/60 px-3 py-1.5 rounded-control border border-border-subtle text-caption">
          <span className="text-text-muted">SPEED</span>
          <span className="text-accent-cyan font-bold font-tabular">
            {(128 + pitch * 1.5).toFixed(1)} BPM
          </span>
        </div>
      </div>

      {/* ── Center Platter & Vinyl Disc Area ── */}
      <div className="relative my-6 flex items-center justify-center py-4">
        {/* Outer Rainbow Dispersion Halo */}
        <div
          className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full pointer-events-none transition-all duration-base will-change-transform"
          style={{
            background:
              'conic-gradient(from 0deg, var(--color-ios-pink), var(--color-ios-purple), var(--color-ios-cyan), var(--color-ios-green), var(--color-ios-orange), var(--color-ios-pink))',
            filter: 'var(--material-regular)',
            opacity: isPlaying ? 0.35 : 0.15,
            transform: 'scale(1.08) translateZ(0)',
          }}
        />

        {/* Brushed Metal Platter Ring */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-surface-base border-2 border-border-highlight shadow-card flex items-center justify-center overflow-hidden">
          {/* Vinyl Disc Grooves with sheen */}
          <div
            className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-surface-canvas border border-border-subtle shadow-inner relative flex items-center justify-center ${
              isPlaying ? 'animate-spin-slow' : ''
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
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent-cyan via-accent-rose to-accent-amber p-0.5 shadow-card flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-surface-dock flex items-center justify-center relative">
                <div className="w-3 h-3 rounded-full bg-surface-base border border-border-highlight shadow-subtle" />
              </div>
            </div>
          </div>

          {/* Tonearm Stylus arm overlay */}
          <div
            className="absolute top-2 right-4 w-1 h-36 bg-gradient-to-b from-white/70 via-white/40 to-white/10 origin-top transform rotate-18 pointer-events-none shadow-card"
            style={{
              transform: isPlaying ? 'rotate(18deg)' : 'rotate(-15deg)',
              transition: 'transform var(--duration-base) var(--ease-smooth)',
            }}
          >
            {/* Cartridge head with LED indicator */}
            <div className="absolute bottom-0 -left-1.5 w-4 h-5 rounded-badge bg-surface-base border border-border-highlight flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-pulse shadow-subtle" />
            </div>
          </div>
        </div>

        {/* Pitch Slider on the right (min 44px touch target) */}
        <div className="ml-4 flex flex-col items-center gap-1.5">
          <span className="text-caption text-text-muted font-mono">PITCH</span>
          <div className="relative w-11 h-32 flex items-center justify-center">
            <div className="w-0.5 h-full bg-border-medium rounded-pill" />
            <input
              type="range"
              min="-8"
              max="8"
              step="0.5"
              value={pitch}
              aria-label="Ajuste de velocidad de pitch en porcentaje"
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="absolute w-28 h-11 -rotate-90 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute w-4 h-6 rounded-badge bg-white text-black text-caption font-bold flex items-center justify-center shadow-card pointer-events-none"
              style={{
                bottom: `${((pitch + 8) / 16) * 78}%`,
              }}
            >
              0
            </div>
          </div>
          <span className="text-caption text-text-tertiary font-tabular">
            {pitch > 0 ? `+${pitch}` : pitch}%
          </span>
        </div>
      </div>

      {/* ── Mode Selection Tiles ── */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border-subtle">
        {TURNTABLE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = blobShape === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setBlobShape(preset.id)}
              aria-label={`Seleccionar preset de visualización ${preset.label}`}
              className={`min-h-[44px] p-2.5 rounded-control border flex flex-col items-center justify-center gap-1.5 transition-all text-xs btn-spring cursor-pointer active:scale-[0.97] ${
                isSelected
                  ? 'border-accent-cyan bg-accent-cyan/15 text-text-primary shadow-subtle'
                  : 'border-border-subtle bg-white/[0.03] text-text-secondary hover:text-text-primary hover:bg-white/[0.06]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-cyan' : 'text-text-muted'}`} />
              <span className="text-caption font-medium tracking-wide">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StudioTurntableDeck;
