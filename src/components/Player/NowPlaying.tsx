import React from 'react';
import { Disc3, Play, Pause, Square, Music } from 'lucide-react';

interface NowPlayingProps {
  title: string;
  artist: string;
  label?: string;
  duration: number;
  currentTime: number;
  isCapturing: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onStop?: () => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  title,
  artist,
  label = 'AURALIS 3D',
  duration,
  currentTime,
  isCapturing,
  isPlaying = false,
  onTogglePlay,
  onStop,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="w-full h-full bg-[#070a14]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl flex flex-col justify-between select-none">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-mono tracking-wider text-white/70 uppercase">
            {label}
          </span>
        </div>

        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/50">
          {isCapturing ? 'Activo' : 'En Espera'}
        </span>
      </div>

      {/* Main Vinyl / Artwork Preview */}
      <div className="my-auto py-5 flex flex-col items-center text-center space-y-4">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-[#0a0e1a] border border-white/[0.1] p-1 flex items-center justify-center shadow-xl">
          {/* Outer grooved vinyl rings */}
          <div className="w-full h-full rounded-full border border-white/[0.06] flex items-center justify-center bg-[#05070d]">
            <div className="w-[78%] h-[78%] rounded-full border border-white/[0.04] flex items-center justify-center">
              <div className="w-[52%] h-[52%] rounded-full bg-[#121626] border border-white/[0.08] flex items-center justify-center p-[2px]">
                <div className="w-full h-full bg-[#0a0d17] rounded-full flex items-center justify-center">
                  {isCapturing ? (
                    <Disc3
                      className={`w-7 h-7 text-white/70 ${
                        isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
                      }`}
                    />
                  ) : (
                    <Music className="w-6 h-6 text-white/30" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center spindle */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
        </div>

        {/* Track Title and Artist */}
        <div className="space-y-1 max-w-full px-4">
          <h3 className="text-white font-medium text-base sm:text-lg truncate tracking-tight">
            {title}
          </h3>
          <p className="text-white/40 text-xs truncate font-mono">
            {artist}
          </p>
        </div>
      </div>

      {/* Playback Progress & Bottom Controls */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        {duration > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono tabular-nums text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Playback Buttons */}
        <div className="flex items-center justify-center gap-2.5">
          {onStop && isCapturing && (
            <button
              onClick={onStop}
              className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.08] transition-colors"
              title="Detener audio"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {onTogglePlay && isCapturing && (
            <button
              onClick={onTogglePlay}
              className="px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all shadow-md"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pausa
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Reanudar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;


