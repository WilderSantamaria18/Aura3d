import React from 'react';
import type { WallpaperPalette } from '../../../types/wallpaper';

interface PaletteSelectorProps {
  selected?: WallpaperPalette;
  onSelect: (palette: WallpaperPalette) => void;
}

const PALETTES: { id: WallpaperPalette; label: string; preview: string }[] = [
  { id: 'warm-sunset', label: 'Cálido Sunset', preview: 'from-amber-500 via-rose-500 to-purple-600' },
  { id: 'cool-night', label: 'Noche Azul', preview: 'from-cyan-500 via-blue-600 to-indigo-950' },
  { id: 'pastel-dream', label: 'Pastel Dream', preview: 'from-pink-300 via-purple-300 to-sky-300' },
  { id: 'monochrome', label: 'Monocromo', preview: 'from-zinc-100 via-zinc-500 to-zinc-900' },
  { id: 'vibrant', label: 'Vibrante', preview: 'from-emerald-400 via-yellow-400 to-fuchsia-500' },
  { id: 'muted', label: 'Desaturado', preview: 'from-stone-400 via-slate-600 to-zinc-800' },
];

export const PaletteSelector: React.FC<PaletteSelectorProps> = ({ selected = 'warm-sunset', onSelect }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
        Paleta Cromática
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {PALETTES.map((pal) => {
          const isActive = selected === pal.id;
          return (
            <button
              key={pal.id}
              type="button"
              onClick={() => onSelect(pal.id)}
              className={`flex items-center gap-2 p-1.5 rounded-xl border text-[11px] transition-all cursor-pointer ${
                isActive
                  ? 'border-white/60 bg-white/15 text-white shadow-sm'
                  : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${pal.preview} flex-shrink-0 shadow-sm`} />
              <span className="truncate">{pal.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
