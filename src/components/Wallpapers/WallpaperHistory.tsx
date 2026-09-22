import React from 'react';
import { Trash2, Heart, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useWallpaperHistory } from '../../hooks/useWallpaperHistory';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import type { WallpaperGenerationResult } from '../../types/wallpaper';

interface WallpaperHistoryProps {
  onPreview: (wallpaper: WallpaperGenerationResult) => void;
  onApply: (wallpaper: WallpaperGenerationResult) => void;
}

export const WallpaperHistory: React.FC<WallpaperHistoryProps> = ({ onPreview, onApply }) => {
  const { cachedWallpapers, cacheSizeMb, remove, clearAll, toggleFavorite } = useWallpaperHistory();
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);

  return (
    <div className="flex flex-col gap-3">
      {/* Subheader with cache size & clear */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] text-[10px] font-mono text-white/50">
        <span>{cachedWallpapers.length} FONDOS EN CACHÉ ({cacheSizeMb} MB)</span>
        {cachedWallpapers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Deseas vaciar todo el historial de wallpapers generados?')) {
                clearAll();
              }
            }}
            className="text-rose-400/80 hover:text-rose-300 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 max-h-[52vh] overflow-y-auto pr-1 custom-scrollbar">
        {cachedWallpapers.map((item) => {
          const isApplied = currentWallpaper?.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onPreview(item)}
              className="group flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-cyan-400/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.thumbnail || item.url}
                  alt={item.prompt}
                  className="w-14 h-9 object-cover rounded-lg border border-white/10 flex-shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate tracking-tight" title={item.prompt}>
                    {item.prompt}
                  </h4>
                  <p className="text-[10px] text-white/50 truncate">
                    {item.style} • {item.aspectRatio} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  className={`p-1.5 rounded-full transition-colors ${
                    item.isFavorite
                      ? 'text-rose-400'
                      : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                  title="Favorito"
                >
                  <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(item);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    isApplied
                      ? 'bg-cyan-400 text-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isApplied ? 'Activo' : 'Aplicar'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(item.id);
                  }}
                  className="p-1.5 text-white/40 hover:text-rose-400 transition-colors"
                  title="Eliminar de caché"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {cachedWallpapers.length === 0 && (
          <div className="py-12 text-center text-xs text-white/40 flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-white/20" />
            <span>Aún no has generado fondos con IA</span>
            <p className="text-[11px] text-white/30">
              Ve a la pestaña "Generar" para crear tu primer fondo cinematográfico.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
