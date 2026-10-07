import React from 'react';
import { Sparkles, Cpu, Wand2 } from 'lucide-react';
import type { WallpaperAspectRatio, WallpaperQuality, WallpaperStyle } from '../../types/wallpaper';

export interface WallpaperGenerationSkeletonProps {
  aspectRatio: WallpaperAspectRatio;
  progress: number;
  quality: WallpaperQuality;
  style: WallpaperStyle;
}

export const WallpaperGenerationSkeleton: React.FC<WallpaperGenerationSkeletonProps> = ({
  aspectRatio,
  progress,
  quality,
  style,
}) => {
  const aspectClass =
    aspectRatio === '21:9'
      ? 'aspect-[21/9] w-full'
      : aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[360px] w-auto mx-auto'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[320px] w-auto mx-auto'
      : aspectRatio === '4:3'
      ? 'aspect-[4/3] max-h-[320px] w-auto mx-auto'
      : 'aspect-video w-full';

  // Dynamic progress narrative
  const statusMessage =
    progress < 25
      ? 'Inicializando tensores y espacio latente...'
      : progress < 55
      ? 'Sintetizando composición y geometría visual...'
      : progress < 80
      ? 'Afinando iluminación volumétrica y textura 4K...'
      : 'Armonizando paleta cromática y remasterizando...';

  return (
    <div className="glass-card !p-4 flex flex-col gap-3.5 select-none animate-in fade-in duration-300">
      {/* Header Status */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-cyan-300 font-bold flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
          </span>
          Generando Obra con IA
        </span>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-400/30">
            {aspectRatio}
          </span>
          <span className="text-[10px] font-mono text-white/50 uppercase">
            {quality.toUpperCase()} • {style}
          </span>
        </div>
      </div>

      {/* Iridescent Skeleton Canvas Window */}
      <div className={`relative rounded-xl overflow-hidden skeleton-glass border border-cyan-400/25 shadow-[0_12px_36px_rgba(0,0,0,0.6)] ${aspectClass} flex flex-col items-center justify-center`}>
        {/* Ambient Neural Core Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-fuchsia-500/10 to-transparent pointer-events-none" />

        {/* Central Holographic Icon & Pulsing Halo */}
        <div className="relative flex flex-col items-center gap-3 z-10 p-4 text-center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-cyan-400/30 via-violet-500/30 to-pink-500/30 blur-md animate-pulse" />
            <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/20 backdrop-blur-xl flex items-center justify-center text-cyan-300 shadow-xl relative">
              <Sparkles className="w-6 h-6 animate-spin-slow text-cyan-300" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-white tracking-wide drop-shadow-sm">
              {statusMessage}
            </span>
            <span className="text-[10px] font-mono text-cyan-300/80">
              {progress}% completado
            </span>
          </div>
        </div>

        {/* Corner Tech Decorators */}
        <div className="absolute top-2.5 left-3 text-[9px] font-mono text-white/30 tracking-widest uppercase">
          AI // SYNTH
        </div>
        <div className="absolute bottom-2.5 right-3 text-[9px] font-mono text-white/30 tracking-widest uppercase">
          {quality === '4k' ? '3840×2160' : quality === 'fhd' ? '1920×1080' : '1280×720'}
        </div>
      </div>

      {/* Volumetric Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 transition-all duration-300 shadow-[0_0_12px_rgba(0,229,255,0.7)]"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default WallpaperGenerationSkeleton;
