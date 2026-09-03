import React, { useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';

export const ProgressBar: React.FC = () => {
  const { currentTime, duration, isLucid, lucidTheme } = usePlayerStore();
  const { seek } = useAudioEngine();
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return;
    setIsDragging(true);
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    setDragTime(newTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setDragTime(pos * duration);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      seek(dragTime);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  };

  const progressPct = getPercentage();

  return (
    <div
      className="w-full flex items-center gap-3 text-xs select-none"
      style={{ color: isLucid ? lucidTheme.primary : 'rgba(165, 243, 252, 0.7)' }}
    >
      <span className="w-10 text-right tabular-nums">{formatTime(isDragging ? dragTime : currentTime)}</span>

      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 h-3 group flex items-center cursor-pointer"
      >
        {/* Track background */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden transition-all group-hover:h-1.5 backdrop-blur-sm">
          {/* Progress fill with glowing gradient */}
          <div
            className="h-full rounded-full relative"
            style={{
              width: `${progressPct}%`,
              background: isLucid
                ? `linear-gradient(90deg, ${lucidTheme.primary}, ${lucidTheme.secondary})`
                : 'linear-gradient(to right, #00f2fe, #6366f1, #ff088a)',
              boxShadow: isLucid
                ? `0 0 12px ${lucidTheme.glow}`
                : '0 0 12px rgba(0,242,254,0.5)',
            }}
          />
        </div>

        {/* Scrub thumb */}
        <div
          className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            left: `${progressPct}%`,
            backgroundColor: isLucid ? lucidTheme.primary : '#00f2fe',
            boxShadow: isLucid ? `0 0 10px ${lucidTheme.glow}` : '0 0 10px #00f2fe',
          }}
        />
      </div>

      <span className="w-10 text-left tabular-nums">{formatTime(duration)}</span>
    </div>
  );
};

