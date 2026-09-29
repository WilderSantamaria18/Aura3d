import React from 'react';
import { MonitorPlay } from 'lucide-react';
import type { WallpaperAspectRatio, WallpaperQuality } from '../../../types/wallpaper';
import { WallpaperGeneratorService } from '../../../services/wallpaperGeneratorService';

interface QualityPickerProps {
  selected: WallpaperQuality;
  aspectRatio: WallpaperAspectRatio;
  onSelect: (q: WallpaperQuality) => void;
  disabled?: boolean;
}

const OPTIONS: { id: WallpaperQuality; label: string; hint: string }[] = [
  { id: 'hd', label: 'HD', hint: 'Rápido' },
  { id: 'fhd', label: 'Full HD', hint: 'Equilibrado' },
  { id: '4k', label: '4K', hint: 'Máxima nitidez' },
];

export const QualityPicker: React.FC<QualityPickerProps> = ({ selected, aspectRatio, onSelect, disabled }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-mono tracking-wider text-white/50 uppercase flex items-center gap-1.5">
      <MonitorPlay className="w-3.5 h-3.5 text-cyan-300" />
      Resolución de salida
    </label>
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = selected === o.id;
        const d = WallpaperGeneratorService.getDimensions(aspectRatio, o.id);
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(o.id)}
            className={`glass-item flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2.5 text-center cursor-pointer ${
              active ? 'is-active' : ''
            }`}
          >
            <span className="text-[13px] font-bold text-white">{o.label}</span>
            <span className="text-[10px] font-mono text-white/55">
              {d.width}×{d.height}
            </span>
            <span className="text-[10px] text-white/40">{o.hint}</span>
          </button>
        );
      })}
    </div>
    {selected === '4k' && (
      <p className="text-[10px] leading-relaxed text-white/40">
        La IA genera a ~2K y se reescala a 4K con enfoque; el resultado es nítido pero no añade detalle nuevo.
      </p>
    )}
  </div>
);
