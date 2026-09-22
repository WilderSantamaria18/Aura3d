import React from 'react';
import {
  Film,
  Sparkles,
  CloudSun,
  LayoutTemplate,
  Zap,
  Radio,
  Mountain,
  Waves,
  Globe2,
  Palette,
} from 'lucide-react';
import type { WallpaperStyle } from '../../../types/wallpaper';

interface StyleSelectorProps {
  selected: WallpaperStyle;
  onSelect: (style: WallpaperStyle) => void;
}

const STYLES: { id: WallpaperStyle; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'cinematic', label: 'Cinemático', icon: Film },
  { id: 'ethereal', label: 'Etéreo', icon: Sparkles },
  { id: 'ghibli', label: 'Ghibli', icon: CloudSun },
  { id: 'minimal', label: 'Minimal', icon: LayoutTemplate },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap },
  { id: 'synthwave', label: 'Synthwave', icon: Radio },
  { id: 'nature', label: 'Naturaleza', icon: Mountain },
  { id: 'abstract', label: 'Abstracto', icon: Waves },
  { id: 'cosmic', label: 'Cósmico', icon: Globe2 },
  { id: 'custom', label: 'Libre', icon: Palette },
];

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
        Estilo Artístico
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {STYLES.map((st) => {
          const Icon = st.icon;
          const isActive = selected === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelect(st.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-[0_2px_10px_rgba(255,255,255,0.4)]'
                  : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{st.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
