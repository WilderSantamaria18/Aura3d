import React from 'react';
import { Heart, ListPlus, Trash2, Music, Loader2 } from 'lucide-react';
import type { Track } from '../../types/audio';

interface TrackItemProps {
  track: Track;
  isActive: boolean;
  isPlaying?: boolean;
  isFavorite?: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onToggleFavorite?: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onRemove?: () => void;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isActive,
  isPlaying = false,
  isFavorite = false,
  isLoading = false,
  onPlay,
  onToggleFavorite,
  onPlayNext,
  onRemove,
}) => {
  // Infer format from file/name/source if not explicitly set
  const detectedFormat =
    track.format ||
    (track.file?.name
      ? track.file.name.split('.').pop()?.toUpperCase()
      : track.url?.startsWith('blob:')
      ? 'LOCAL'
      : track.sourceType === 'radio'
      ? 'LIVE'
      : 'FLAC');

  return (
    <div
      className={`track-item-glass p-3 flex items-center gap-3.5 min-h-[68px] group relative cursor-pointer active:scale-[0.99] select-none ${
        isActive ? 'is-active' : ''
      }`}
      onClick={() => {
        if (!isLoading) onPlay();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isLoading) onPlay();
        }
      }}
      aria-label={`Reproducir ${track.title} de ${track.artist}`}
      aria-busy={isLoading}
    >
      {/* Cover / Mini Visualizer */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.06] border border-white/15 flex items-center justify-center shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Music className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-white/40'}`} />
        )}

        {/* Mini 3-bar animated cyan VU meter if active and playing */}
        {isLoading ? (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-rose-300" aria-hidden="true" />
          </div>
        ) : isActive && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-3.5" aria-label="Reproduciendo">
              <div className={`w-0.5 bg-cyan-400 rounded-full ${isPlaying ? 'animate-[bounce_0.6s_ease-in-out_infinite]' : 'h-3'}`} />
              <div className={`w-0.5 bg-cyan-400 rounded-full ${isPlaying ? 'animate-[bounce_0.8s_ease-in-out_infinite_0.1s]' : 'h-2'}`} />
              <div className={`w-0.5 bg-cyan-400 rounded-full ${isPlaying ? 'animate-[bounce_0.7s_ease-in-out_infinite_0.2s]' : 'h-2.5'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Main Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[14px] font-semibold truncate tracking-tight transition-colors ${
              isActive ? 'text-cyan-300' : 'text-white'
            }`}
          >
            {track.title}
          </span>

          {/* Audio Format Chip */}
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-white/70 flex-shrink-0">
            {detectedFormat}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-white/60 text-[12px] truncate font-medium">
          <span className="truncate max-w-[140px] sm:max-w-[170px]">{track.artist}</span>
          <span className="text-white/20">•</span>
          <span className="font-mono text-[11px] text-white/50 tabular-nums">
            {formatDuration(track.duration)}
          </span>

          {track.bpm && (
            <>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[11px] text-cyan-300/90 font-semibold">
                {track.bpm} BPM
              </span>
            </>
          )}

          {track.camelotKey && (
            <>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[11px] text-purple-300/90 font-semibold">
                {track.camelotKey}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Action Buttons (Revealed on hover / touch) */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Instant Heart Toggle */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(track);
            }}
            className="p-2 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer active:scale-90"
            title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Heart
              className={`w-4 h-4 transition-all ${
                isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white/40 hover:text-rose-400'
              }`}
            />
          </button>
        )}

        {/* Play Next in Queue */}
        {onPlayNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayNext(track);
            }}
            className="p-2 rounded-full hover:bg-white/15 text-white/60 hover:text-cyan-300 transition-colors cursor-pointer active:scale-90"
            title="Reproducir a continuación"
            aria-label="Reproducir a continuación"
          >
            <ListPlus className="w-4 h-4" />
          </button>
        )}

        {/* Remove from Queue / Playlist */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 rounded-full hover:bg-rose-500/20 text-white/60 hover:text-rose-400 transition-colors cursor-pointer active:scale-90"
            title="Eliminar pista"
            aria-label="Eliminar pista"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackItem;
