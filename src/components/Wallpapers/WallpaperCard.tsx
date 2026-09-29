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
    <div className="group glass-card !p-0 overflow-hidden flex flex-col">
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
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-white/15 text-white backdrop-blur-xl border border-white/25">
            {item.style}
          </span>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-2 rounded-full backdrop-blur-xl transition-colors ${
                isFavorite
                  ? 'bg-rose-500/80 text-white border border-white/30'
                  : 'bg-white/15 border border-white/25 text-white/80 hover:text-white hover:bg-white/25'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Applied Badge Indicator */}
        {isApplied && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400/90 backdrop-blur-md border border-white/40 text-black font-mono font-bold text-[9px]">
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
            className="glass-btn flex items-center gap-1 px-3 py-1.5 text-white text-[11px] font-semibold"
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
            className="glass-btn is-active flex items-center gap-1 px-4 py-1.5 text-white text-[11px] font-bold"
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
