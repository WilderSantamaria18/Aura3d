import React, { useState, useRef } from 'react';
import { Heart, Eye, Check, Sparkles, Download } from 'lucide-react';
import type { WallpaperPreset, WallpaperGenerationResult } from '../../types/wallpaper';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { triggerVisualShockwave } from '../UI/VisualFeedbackRipple';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, sheenX: 50, sheenY: 50, isHovered: false });

  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const isApplied = currentWallpaper?.id === item.id;

  const title = 'name' in item ? item.name : item.prompt;
  const description = 'description' in item ? item.description : item.style;
  const imageUrl = 'thumbnailUrl' in item ? item.thumbnailUrl : item.thumbnail || item.url;

  // 3D Tilt calculation based on mouse coordinates inside card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - y) * 10;
    const rotY = (x - 0.5) * 10;
    setTilt({ x: rotX, y: rotY, sheenX: x * 100, sheenY: y * 100, isHovered: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, sheenX: 50, sheenY: 50, isHovered: false });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      triggerVisualShockwave({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        color: isFavorite ? '#94a3b8' : '#ec4899',
      });
      onToggleFavorite();
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    triggerVisualShockwave({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      color: '#00f2fe',
    });
    onApply();
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = 'fullUrl' in item ? item.fullUrl : item.url;
    if (!fullUrl) return;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `aura3d-wallpaper-${item.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    triggerVisualShockwave({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      color: '#38bdf8',
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group glass-card !p-0 overflow-hidden flex flex-col will-change-transform transition-all ${
        isApplied
          ? '!border-cyan-400/50 shadow-[0_0_0_1.5px_rgba(6,182,212,0.45),0_16px_40px_-8px_rgba(6,182,212,0.3)]'
          : 'hover:border-white/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)]'
      }`}
      style={{
        transform: tilt.isHovered
          ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: tilt.isHovered ? 'transform 120ms ease-out' : 'transform 450ms ease-out, border-color 300ms, box-shadow 300ms',
      }}
    >
      {/* Image Thumbnail Container with 16:9 Aspect Ratio & Iridescent Skeleton */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-black/60 cursor-pointer skeleton-glass"
        onClick={onPreview}
      >
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-108 ${
            isLoaded ? 'opacity-100 filter-none' : 'opacity-0'
          }`}
        />

        {/* Specular Liquid Glint following cursor */}
        {tilt.isHovered && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-75 transition-opacity"
            style={{
              background: `radial-gradient(circle 240px at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255, 255, 255, 0.45), transparent 70%)`,
            }}
          />
        )}

        {/* Top Badges & Actions */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-xl border border-white/20 shadow-sm">
              {item.style}
            </span>
            {item.aspectRatio && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-cyan-300 bg-black/60 backdrop-blur-xl border border-cyan-400/30 shadow-sm">
                {item.aspectRatio}
              </span>
            )}
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-2 rounded-full backdrop-blur-xl transition-all btn-spring shadow-md ${
                isFavorite
                  ? 'bg-rose-500/80 text-white border border-white/30'
                  : 'bg-black/50 border border-white/20 text-white/80 hover:text-white hover:bg-black/70'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Applied Badge Indicator with Luminous Beacon */}
        {isApplied && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-400/95 backdrop-blur-md border border-white/40 text-black font-mono font-bold text-[9px] shadow-[0_0_12px_rgba(6,182,212,0.65)] z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            <span>ACTIVO</span>
          </div>
        )}

        {/* Hover Quick Overlay Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDownloadClick}
              className="glass-btn btn-spring p-1.5 text-white/85 hover:text-white"
              title="Descargar imagen en alta resolución"
              aria-label="Descargar imagen"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="glass-btn btn-spring flex items-center gap-1 px-2.5 py-1.5 text-white text-[11px] font-semibold"
            >
              <Eye className="w-3 h-3" />
              <span>Ver</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleApplyClick}
            className="glass-btn is-active btn-spring flex items-center gap-1 px-3.5 py-1.5 text-white text-[11px] font-bold"
          >
            <Sparkles className="w-3 h-3 fill-current text-cyan-300" />
            <span>Aplicar</span>
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h4 className="text-xs font-bold text-white tracking-tight truncate" title={title}>
            {title}
          </h4>
          <p className="text-[10px] text-white/50 truncate">
            {description}
          </p>
        </div>

        {/* Quick Style Glow Pill */}
        <div className="flex-shrink-0">
          <span className="w-2 h-2 rounded-full block bg-gradient-to-tr from-cyan-400 to-fuchsia-400 opacity-70 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
        </div>
      </div>
    </div>
  );
};

export default WallpaperCard;
