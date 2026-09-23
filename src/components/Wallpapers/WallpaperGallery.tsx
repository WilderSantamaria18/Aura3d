import React from 'react';
import { Search, Ban, Sparkles, Check } from 'lucide-react';
import { useWallpaperPresets } from '../../hooks/useWallpaperPresets';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { WallpaperCard } from './WallpaperCard';
import type { WallpaperPreset, WallpaperStyle } from '../../types/wallpaper';

interface WallpaperGalleryProps {
  onPreview: (preset: WallpaperPreset) => void;
  onApply: (preset: WallpaperPreset) => void;
}

const CATEGORY_CHIPS: { id: WallpaperStyle | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'cinematic', label: 'Cinemático' },
  { id: 'ethereal', label: 'Etéreo' },
  { id: 'ghibli', label: 'Studio Ghibli' },
  { id: 'minimal', label: 'Minimalista' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'synthwave', label: 'Synthwave' },
  { id: 'nature', label: 'Naturaleza' },
  { id: 'abstract', label: 'Abstracto' },
  { id: 'cosmic', label: 'Cósmico' },
];

export const WallpaperGallery: React.FC<WallpaperGalleryProps> = ({ onPreview, onApply }) => {
  const { presets, selectedStyle, setSelectedStyle, searchQuery, setSearchQuery } =
    useWallpaperPresets();

  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const clearWallpaper = useWallpaperStore((s) => s.clearWallpaper);
  const hasActiveWallpaper = Boolean(currentWallpaper?.url);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Search Input & Reset Action */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3.5 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar presets (Porsche, lago, Ghibli, cyberpunk, espacio...)"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-cyan-400/50 text-xs text-white placeholder-white/40 outline-none transition-colors"
          />
        </div>

        {hasActiveWallpaper && (
          <button
            type="button"
            onClick={clearWallpaper}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-mono transition-all flex-shrink-0 cursor-pointer active:scale-95"
            title="Quitar el fondo actual y volver al modo limpio"
          >
            <Ban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quitar Fondo</span>
          </button>
        )}
      </div>

      {/* Filter Chips Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORY_CHIPS.map((cat) => {
          const isActive = selectedStyle === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedStyle(cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Presets Grid: 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
        {presets.map((preset) => (
          <WallpaperCard
            key={preset.id}
            item={preset}
            onPreview={() => onPreview(preset)}
            onApply={() => onApply(preset)}
          />
        ))}

        {presets.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <span>No se encontraron presets para esta búsqueda</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStyle('all');
              }}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WallpaperGallery;
