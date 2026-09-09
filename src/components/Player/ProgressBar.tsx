import React, { useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';

export const ProgressBar: React.FC = React.memo(() => {
  const { currentTime, duration, isLucid, lucidTheme, isSpotifyConnected } = usePlayerStore();
  const { seek: engineSeek } = useAudioEngine();
  const { seek: spotifySeek } = useSpotifyPlayer();
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPercentage = useCallback(() => {
    const time = isDragging ? dragTime : currentTime;
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (time / duration) * 100));
  }, [currentTime, dragTime, duration, isDragging]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return;
    setIsDragging(true);
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    setDragTime(newTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [duration]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setDragTime(pos * duration);
  }, [isDragging, duration]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      if (isSpotifyConnected) {
        spotifySeek(Math.round(dragTime * 1000));
      } else {
        engineSeek(dragTime);
      }
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  }, [isDragging, dragTime, isSpotifyConnected, spotifySeek, engineSeek]);

  const progressPct = getPercentage();

  // Hover timestamp preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  const handlePointerHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * duration);
  };

  const handlePointerLeave = () => {
    setHoverTime(null);
  };

  return (
    <div
      className="w-full flex items-center gap-3 text-xs select-none"
      style={{ color: isLucid ? lucidTheme.primary : 'rgba(255, 255, 255, 0.45)' }}
    >
      <span className="w-10 text-right font-mono text-[11px] tabular-nums text-white/50">
        {formatTime(isDragging ? dragTime : currentTime)}
      </span>

      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e);
          handlePointerHover(e);
        }}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        className="relative flex-1 h-5 group flex items-center cursor-pointer"
      >
        {/* Track background */}
        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden transition-all duration-150 group-hover:h-1.5">
          {/* Progress fill */}
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${progressPct}%`,
              background: isLucid
                ? `linear-gradient(90deg, ${lucidTheme.primary}, ${lucidTheme.secondary})`
                : '#ffffff',
            }}
          />
        </div>

        {/* Hover preview line & tooltip */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/15 text-[10px] font-mono text-white/90 tabular-nums pointer-events-none shadow-md"
            style={{ left: `${hoverPos}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}

        {/* Scrub thumb */}
        <div
          className={`absolute w-3 h-3 rounded-full -translate-x-1/2 transition-opacity pointer-events-none shadow-[0_1px_4px_rgba(0,0,0,0.6)] ${
            isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{
            left: `${progressPct}%`,
            backgroundColor: isLucid ? lucidTheme.primary : '#ffffff',
          }}
        />
      </div>

      <span className="w-10 text-left font-mono text-[11px] tabular-nums text-white/40">
        {formatTime(duration)}
      </span>
    </div>
  );
});


