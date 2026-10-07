import React, { useMemo } from 'react';
import { Heart, ListPlus, Trash2, Music, Loader2 } from 'lucide-react';
import type { Track } from '../../types/audio';
import { triggerVisualShockwave } from './VisualFeedbackRipple';
import { camelotWheelService } from '../../services/camelotWheelService';

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

  const harmonics = useMemo(() => camelotWheelService.getTrackHarmonics(track), [track]);
  const displayBpm = track.bpm || harmonics.bpm;
  const displayCamelot = track.camelotKey || harmonics.camelotKey;

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
      <div
        className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.06] border transition-all duration-300 flex items-center justify-center ${
          isActive
            ? 'border-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.35),0_6px_14px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)]'
            : 'border-white/15 group-hover:border-white/30 shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]'
        }`}
      >
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

        {/* Mini 3-bar jumping cyan VU meter if active */}
        {isLoading ? (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-rose-300" aria-hidden="true" />
          </div>
        ) : isActive && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex items-end gap-[3px] h-4 w-4 justify-center" aria-label={isPlaying ? 'Reproduciendo' : 'En pausa'}>
              <div
                className={`w-[3px] rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_6px_rgba(34,211,238,0.7)] ${
                  isPlaying ? 'eq-bar-1' : 'h-[30%]'
                }`}
              />
              <div
                className={`w-[3px] rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_6px_rgba(34,211,238,0.7)] ${
                  isPlaying ? 'eq-bar-2' : 'h-[65%]'
                }`}
              />
              <div
                className={`w-[3px] rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-white shadow-[0_0_6px_rgba(34,211,238,0.7)] ${
                  isPlaying ? 'eq-bar-3' : 'h-[25%]'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[14px] font-semibold truncate tracking-tight transition-colors ${
              isActive ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'text-white group-hover:text-white/95'
            }`}
          >
            {track.title}
          </span>

          {/* Audio Format Chip */}
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
              isActive
                ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                : 'bg-white/[0.08] border-white/15 text-white/70'
            }`}
          >
            {detectedFormat}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-white/60 text-[12px] truncate font-medium">
          <span className="truncate max-w-[130px] sm:max-w-[160px]">{track.artist}</span>
          <span className="text-white/20">•</span>
          <span className="font-mono text-[11px] text-white/50 tabular-nums">
            {formatDuration(track.duration)}
          </span>

          <span className="text-white/20">•</span>
          <span className="font-mono text-[11px] text-cyan-300/90 font-semibold" title="Tempo">
            {displayBpm} BPM
          </span>

          <span className="text-white/20">•</span>
          <span
            className="font-mono text-[10px] text-purple-200 font-bold px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-400/25 tracking-wide"
            title="Clave Armónica Camelot"
          >
            {displayCamelot}
          </span>
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
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              triggerVisualShockwave({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                color: isFavorite ? '#94a3b8' : '#f43f5e',
              });
              onToggleFavorite(track);
            }}
            className="p-2 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer btn-spring"
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
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              triggerVisualShockwave({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                color: '#00f2fe',
              });
              onPlayNext(track);
            }}
            className="p-2 rounded-full hover:bg-white/15 text-white/60 hover:text-cyan-300 transition-all cursor-pointer btn-spring"
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
