import React from 'react';
import { Sparkles, Gauge, SunMedium, RotateCcw, Check } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import type { BackgroundAtmosphere } from '../../types/audio';

const ATMOSPHERE_MODES: { id: BackgroundAtmosphere; label: string; desc: string }[] = [
  { id: 'none', label: 'Sin Efecto', desc: 'Fondo limpio y minimalista' },
  { id: 'sunset', label: 'Atardecer Épico', desc: 'Sol gigante, velo dorado y partículas' },
  { id: 'rain', label: 'Lluvia Neón', desc: 'Gotas veloces con destellos cian y magenta' },
  { id: 'sand', label: 'Tormenta de Arena', desc: 'Partículas doradas en deriva continua' },
  { id: 'stars', label: 'Estrellas 3D', desc: 'Túnel hiperespacial reactivo al compás' },
  { id: 'radial_burst', label: 'Estallido Radial', desc: 'Ondas expansivas desde el centro' },
  { id: 'stardust_drift', label: 'Polvo Cósmico', desc: 'Bruma orbital de micropartículas' },
  { id: 'light_beams', label: 'Haces de Luz', desc: 'Rayos volumétricos cinematográficos' },
  { id: 'quantum_waves', label: 'Ondas Cuánticas', desc: 'Líneas sinusoidales armónicas' },
];

export const WallpaperAtmospheres: React.FC = () => {
  const { blobSettings, updateBlobSettings } = usePlayerStore();

  const currentAtmosphere = blobSettings?.backgroundAtmosphere || 'none';
  const currentBlend = blobSettings?.atmosphereBlend || 'none';
  const speed = blobSettings?.atmosphereSpeed || 1.0;
  const glow = blobSettings?.atmosphereGlow || 1.0;

  const handleResetAtmosphere = () => {
    updateBlobSettings({
      backgroundAtmosphere: 'none',
      atmosphereBlend: 'none',
      atmosphereSpeed: 1.0,
      atmosphereGlow: 1.0,
      atmosphereSmoothing: 0.20,
    });
  };

  return (
    <div className="flex flex-col gap-4 max-h-[56vh] overflow-y-auto pr-1 custom-scrollbar text-white">
      {/* Primary Atmosphere Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-white/60">
          <span className="uppercase tracking-wider">Efecto Atmosférico Principal</span>
          <span className="text-cyan-300 font-bold capitalize">
            {ATMOSPHERE_MODES.find((m) => m.id === currentAtmosphere)?.label || currentAtmosphere}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ATMOSPHERE_MODES.map((mode) => {
            const isActive = currentAtmosphere === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => updateBlobSettings({ backgroundAtmosphere: mode.id })}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-500/20 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-white/[0.03] text-white/70 border-white/[0.08] hover:text-white hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold font-mono">{mode.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-cyan-300 stroke-[3]" />}
                </div>
                <p className="text-[10px] text-white/50 leading-tight">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Atmospheric Speed & Glow Controls */}
      {currentAtmosphere !== 'none' && (
        <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white/80">Dinámica del Efecto</span>
            <button
              type="button"
              onClick={handleResetAtmosphere}
              className="flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Restablecer</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono text-white/60">
              <div className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>Velocidad de Movimiento</span>
              </div>
              <span className="text-cyan-300 font-mono font-bold">{speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.10"
              value={speed}
              onChange={(e) => updateBlobSettings({ atmosphereSpeed: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono text-white/60">
              <div className="flex items-center gap-1">
                <SunMedium className="w-3 h-3 text-amber-400" />
                <span>Intensidad de Iluminación</span>
              </div>
              <span className="text-amber-300 font-mono font-bold">{glow.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="2.5"
              step="0.10"
              value={glow}
              onChange={(e) => updateBlobSettings({ atmosphereGlow: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-amber-400"
            />
          </div>

          {/* Secondary Blend Selector */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
              <span>Combinar con Segundo Efecto</span>
              <span className="text-purple-300 font-bold capitalize">
                {ATMOSPHERE_MODES.find((m) => m.id === currentBlend)?.label || 'Sin Mezcla'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'none', label: 'Ninguno' },
                { id: 'stars', label: 'Estrellas' },
                { id: 'rain', label: 'Lluvia' },
                { id: 'stardust_drift', label: 'Polvo' },
                { id: 'light_beams', label: 'Haces' },
                { id: 'radial_burst', label: 'Estallido' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateBlobSettings({ atmosphereBlend: b.id as any })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                    currentBlend === b.id
                      ? 'bg-purple-500/25 text-purple-200 border border-purple-400/50 font-bold'
                      : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WallpaperAtmospheres;
