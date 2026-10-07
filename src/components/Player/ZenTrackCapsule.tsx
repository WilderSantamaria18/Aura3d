import React from 'react';
import { motion } from 'framer-motion';
import { Disc, Play, Pause, Maximize2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { MiniSpectrumBars } from '../UI/MiniSpectrumBars';

interface ZenTrackCapsuleProps {
  onExpand?: () => void;
}

/**
 * ZenTrackCapsule — visionOS Chameleon Liquid Glass Floating Pill
 * Morphs seamlessly from the main bottom dock when the application enters Cinema / Zen mode.
 * Ultra-refined, serene styling that eliminates visual saturation and avoids cluttering the view.
 */
export const ZenTrackCapsule: React.FC<ZenTrackCapsuleProps> = ({ onExpand }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setIsUiIdle = usePlayerStore((s) => s.setIsUiIdle);
  const { togglePlayPause } = useAudioPlayerActions();

  const coverUrl = currentTrack?.coverUrl;
  const title = currentTrack?.title || 'Reproducción en curso';
  const artist = currentTrack?.artist || 'Aura3D Studio';

  const handleRestore = () => {
    setIsUiIdle(false);
    onExpand?.();
  };

  return (
    <motion.div
      layoutId="unified-playback-capsule"
      initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(8px)' }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 26,
        mass: 0.9,
      }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none font-sans"
    >
      <div
        onClick={handleRestore}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          e.currentTarget.style.setProperty('--zen-specular-x', `${x.toFixed(1)}%`);
        }}
        className="visionos-ornament relative overflow-hidden px-3.5 py-1.5 h-12 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
        title="Click para restaurar controles completos de reproducción"
      >
        {/* Borde especular activo visionOS */}
        <div
          className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(120px circle at var(--zen-specular-x, 50%) 0%, rgba(255, 255, 255, 0.95) 0%, rgba(0, 229, 255, 0.4) 50%, transparent 100%)`,
          }}
        />
        {/* Cover Artwork Thumbnail with Mini Vinyl Spin */}
        <div
          className={`relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-black/60 shadow-md flex items-center justify-center transition-all ${
            isPlaying ? 'animate-spin' : ''
          }`}
          style={{
            animationDuration: '3s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6), inset 0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          ) : (
            <Disc className="w-3.5 h-3.5 text-white/50" />
          )}
          {/* Center Spindle point */}
          <div className="absolute w-2 h-2 rounded-full bg-slate-950 border border-white/70 shadow-sm" />
        </div>

        {/* Track Typography with Clean Hierarchy */}
        <div className="flex flex-col min-w-0 max-w-[170px] sm:max-w-[240px] leading-none">
          <span className="text-[12px] font-semibold text-white/95 truncate tracking-tight group-hover:text-white transition-colors">
            {title}
          </span>
          <span className="text-[10px] font-medium text-white/45 truncate font-sans mt-1">
            {artist}
          </span>
        </div>

        {/* Real-time spectrum bars tinted subtly */}
        <div className="flex items-center gap-1 pl-0.5 opacity-70">
          <MiniSpectrumBars />
        </div>

        {/* Play/Pause quick action button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-90 transition-all border border-white/10 shadow-sm shrink-0"
          title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Restore Icon */}
        <div className="text-white/40 group-hover:text-white/80 transition-colors pr-1">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
};

export default ZenTrackCapsule;
