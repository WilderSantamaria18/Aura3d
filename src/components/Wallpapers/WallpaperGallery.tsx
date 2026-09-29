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
            className="glass-input w-full pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/45 outline-none"
          />
        </div>

        {hasActiveWallpaper && (
          <button
            type="button"
            onClick={clearWallpaper}
            className="glass-btn is-danger flex items-center gap-1.5 px-4 py-2 text-rose-200 text-xs font-mono flex-shrink-0"
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
              className={`glass-btn px-3.5 py-1 min-h-[30px] text-[11px] font-semibold tracking-tight whitespace-nowrap ${
                isActive ? 'is-active text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Presets Grid: 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="glass-btn px-4 py-1 text-white text-[11px]"
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
