import React from 'react';
import { Heart, Eye, Check, Sparkles } from 'lucide-react';
import type { WallpaperPreset, WallpaperGenerationResult } from '../../types/wallpaper';
import { useWallpaperStore } from '../../stores/wallpaperStore';

interface WallpaperCardProps {
  item: WallpaperPreset | WallpaperGenerationResult;
  onPreview: () => void;
  onApply: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const WallpaperCard: React.FC<WallpaperCardProps> = ({
  item,
  onPreview,
  onApply,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const isApplied = currentWallpaper?.id === item.id;

  const title = 'name' in item ? item.name : item.prompt;
  const description = 'description' in item ? item.description : item.style;
  const imageUrl = 'thumbnailUrl' in item ? item.thumbnailUrl : item.thumbnail || item.url;

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 flex flex-col shadow-lg">
      {/* Image Thumbnail Container with 16:9 Aspect Ratio */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 cursor-pointer" onClick={onPreview}>
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Top Badges & Actions */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-black/60 text-white/90 backdrop-blur-md border border-white/10">
            {item.style}
          </span>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                isFavorite
                  ? 'bg-rose-500/80 text-white'
                  : 'bg-black/50 text-white/60 hover:text-white hover:bg-black/70'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Applied Badge Indicator */}
        {isApplied && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400 text-black font-mono font-bold text-[9px] shadow-[0_0_10px_rgba(0,229,255,0.8)]">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>ACTIVO</span>
          </div>
        )}

        {/* Hover Quick Overlay Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold backdrop-blur-md transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>Previsualizar</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black text-[11px] font-bold shadow-md transition-colors"
          >
            <Sparkles className="w-3 h-3 fill-current" />
            <span>Aplicar</span>
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-2.5 flex flex-col gap-0.5">
        <h4 className="text-xs font-bold text-white tracking-tight truncate" title={title}>
          {title}
        </h4>
        <p className="text-[10px] text-white/50 truncate">
          {description}
        </p>
      </div>
    </div>
  );
};
