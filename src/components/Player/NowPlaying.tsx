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
    <div className="w-full h-full bg-[#080b18]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between select-none">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono tracking-widest text-cyan-300 uppercase">
            {label}
          </span>
        </div>

        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
          {isCapturing ? 'Activo' : 'En Espera'}
        </span>
      </div>

      {/* Main Vinyl / Artwork Preview */}
      <div className="my-auto py-6 flex flex-col items-center text-center space-y-4">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-cyan-500/20 via-pink-500/10 to-indigo-500/20 border border-white/15 p-1 flex items-center justify-center shadow-2xl shadow-cyan-950/60">
          {/* Outer grooved vinyl rings */}
          <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center bg-[#050711]">
            <div className="w-[75%] h-[75%] rounded-full border border-white/5 flex items-center justify-center">
              <div className="w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center p-[2px] shadow-lg">
                <div className="w-full h-full bg-[#090d1c] rounded-full flex items-center justify-center">
                  {isCapturing ? (
                    <Disc3
                      className={`w-8 h-8 text-cyan-300 ${
                        isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
                      }`}
                    />
                  ) : (
                    <Music className="w-8 h-8 text-white/30" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center spindle */}
          <div className="absolute w-3 h-3 rounded-full bg-black border border-white/40" />
        </div>

        {/* Track Title and Artist */}
        <div className="space-y-1 max-w-full px-4">
          <h3 className="text-white font-medium text-lg sm:text-xl truncate tracking-wide drop-shadow">
            {title}
          </h3>
          <p className="text-cyan-200/50 text-xs sm:text-sm truncate font-light tracking-widest uppercase">
            {artist}
          </p>
        </div>
      </div>

      {/* Playback Progress & Bottom Controls */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        {duration > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full shadow-[0_0_10px_rgba(0,242,254,0.5)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Playback Buttons */}
        <div className="flex items-center justify-center gap-3">
          {onStop && isCapturing && (
            <button
              onClick={onStop}
              className="p-3 rounded-2xl bg-white/5 hover:bg-pink-500/20 text-white/60 hover:text-pink-400 border border-white/10 transition-all"
              title="Detener audio"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {onTogglePlay && isCapturing && (
            <button
              onClick={onTogglePlay}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.4)] hover:scale-105 active:scale-95 transition-all"
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

