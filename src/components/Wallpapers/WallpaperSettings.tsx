import React from 'react';
import { RotateCcw, Sliders, Layers, Sparkles } from 'lucide-react';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { useWallpaperHistory } from '../../hooks/useWallpaperHistory';

export const WallpaperSettings: React.FC = () => {
  const {
    backgroundMode,
    setBackgroundMode,
    applicationSettings,
    updateApplicationSettings,
    resetApplicationSettings,
  } = useWallpaperStore();

  const { cacheSizeMb, clearAll } = useWallpaperHistory();

  return (
    <div className="flex flex-col gap-4 max-h-[54vh] overflow-y-auto pr-1 custom-scrollbar text-xs">
      {/* Background Mode Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
          Modo de Fondo Principal
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          {[
            { id: 'wallpaper', label: 'Wallpaper IA' },
            { id: 'atmosphere', label: 'Atmósfera' },
            { id: 'void', label: 'Negro Abisal' },
          ].map((mode) => {
            const isActive = backgroundMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setBackgroundMode(mode.id as any)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,229,255,0.6)] font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Adjustments */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-white/60 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Parámetros Visuales
          </span>
          <button
            type="button"
            onClick={resetApplicationSettings}
            className="text-[10px] text-white/40 hover:text-white transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        </div>

        {/* Opacity */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-white/70">
            <span>Opacidad del fondo</span>
            <span className="font-mono text-cyan-300">
              {Math.round(applicationSettings.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={applicationSettings.opacity}
            onChange={(e) => updateApplicationSettings({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Blur */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-white/70">
            <span>Desenfoque (Blur)</span>
            <span className="font-mono text-cyan-300">{applicationSettings.blur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={applicationSettings.blur}
            onChange={(e) => updateApplicationSettings({ blur: parseInt(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Brightness */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-white/70">
            <span>Brillo</span>
            <span className="font-mono text-cyan-300">
              {Math.round(applicationSettings.brightness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.4}
            max={1.6}
            step={0.05}
            value={applicationSettings.brightness}
            onChange={(e) => updateApplicationSettings({ brightness: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Blend Mode */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-white/70">Modo de Fusión</span>
          <select
            value={applicationSettings.blendMode}
            onChange={(e) => updateApplicationSettings({ blendMode: e.target.value as any })}
            className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/20 text-[11px] text-white outline-none cursor-pointer"
          >
            <option value="normal">Normal</option>
            <option value="screen">Screen (Luminosidad)</option>
            <option value="multiply">Multiply (Sombra)</option>
            <option value="overlay">Overlay (Contraste)</option>
            <option value="soft-light">Soft Light (Suave)</option>
          </select>
        </div>

        {/* Vignette Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
          <span className="text-[11px] text-white/70">Viñeta cinematográfica en bordes</span>
          <input
            type="checkbox"
            checked={applicationSettings.vignette}
            onChange={(e) => updateApplicationSettings({ vignette: e.target.checked })}
            className="w-4 h-4 accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Storage & Performance */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-xs">Almacenamiento Local</h4>
          <p className="text-[10px] text-white/50">{cacheSizeMb} MB utilizados en IndexedDB</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Vaciar la caché de fondos de pantalla?')) clearAll();
          }}
          className="px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-colors"
        >
          Limpiar Caché
        </button>
      </div>
    </div>
  );
};
