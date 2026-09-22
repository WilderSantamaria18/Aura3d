import React from 'react';
import type { WallpaperAspectRatio } from '../../../types/wallpaper';

interface AspectRatioPickerProps {
  selected: WallpaperAspectRatio;
  onSelect: (ratio: WallpaperAspectRatio) => void;
}

const RATIOS: { id: WallpaperAspectRatio; label: string; desc: string }[] = [
  { id: '16:9', label: '16:9', desc: 'Monitor estándar' },
  { id: '21:9', label: '21:9', desc: 'Ultrawide cine' },
  { id: '9:16', label: '9:16', desc: 'Móvil / Stories' },
  { id: '1:1', label: '1:1', desc: 'Cuadrado' },
  { id: '4:3', label: '4:3', desc: 'Retro / iPad' },
];

export const AspectRatioPicker: React.FC<AspectRatioPickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
        Relación de Aspecto
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {RATIOS.map((r) => {
          const isActive = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={`flex-1 min-w-[54px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-all text-center cursor-pointer ${
                isActive
                  ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,229,255,0.6)]'
                  : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]'
              }`}
              title={r.desc}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
