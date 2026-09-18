import React from 'react';
import { Heart, ListPlus, Trash2, Music } from 'lucide-react';
import type { Track } from '../../types/audio';

interface TrackItemProps {
  track: Track;
  isActive: boolean;
  isPlaying?: boolean;
  isFavorite?: boolean;
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
      className={`track-item-glass p-2.5 sm:p-3 flex items-center gap-3 group relative cursor-pointer active:scale-[0.99] select-none ${
        isActive ? 'is-active' : ''
      }`}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      aria-label={`Reproducir ${track.title} de ${track.artist}`}
    >
      {/* Cover / Mini Visualizer */}
      <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.05] border border-white/10 flex items-center justify-center shadow-md">
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
        {isActive && (
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
            className={`text-xs sm:text-sm font-semibold truncate tracking-tight transition-colors ${
              isActive ? 'text-cyan-300' : 'text-white'
            }`}
          >
            {track.title}
          </span>

          {/* Audio Format Chip */}
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50 flex-shrink-0">
            {detectedFormat}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 text-white/50 text-[11px] truncate font-medium">
          <span className="truncate max-w-[120px] sm:max-w-[160px]">{track.artist}</span>
          <span className="text-white/20">•</span>
          <span className="font-mono text-[10px] text-white/40 tabular-nums">
            {formatDuration(track.duration)}
          </span>

          {track.bpm && (
            <>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[10px] text-cyan-400/80 font-semibold">
                {track.bpm} BPM
              </span>
            </>
          )}

          {track.camelotKey && (
            <>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[10px] text-purple-400/80 font-semibold">
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
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer active:scale-90"
            title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all ${
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
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-cyan-400 transition-colors cursor-pointer active:scale-90"
            title="Reproducir a continuación"
            aria-label="Reproducir a continuación"
          >
            <ListPlus className="w-3.5 h-3.5" />
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
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-colors cursor-pointer active:scale-90"
            title="Eliminar pista"
            aria-label="Eliminar pista"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackItem;
