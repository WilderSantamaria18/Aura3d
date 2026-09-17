import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { waveformService } from '../../services/waveformService';

export const ProgressBar: React.FC = React.memo(() => {
  const {
    currentTime,
    duration,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    isSpotifyConnected,
    loopA,
    loopB,
    isLoopActive,
    currentTrack,
  } = usePlayerStore();

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!barRef.current || !duration) return;
      setIsDragging(true);
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const newTime = pos * duration;
      setDragTime(newTime);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [duration]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setDragTime(pos * duration);
    },
    [isDragging, duration]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [isDragging, dragTime, isSpotifyConnected, spotifySeek, engineSeek]
  );

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

  // Generate deterministic realistic waveform based on track
  const waveformData = useMemo(() => {
    const trackKey = currentTrack ? `${currentTrack.id || currentTrack.title}_${currentTrack.artist}` : 'auralis_studio_default';
    return waveformService.generateDeterministic(trackKey, duration || 210, 80);
  }, [currentTrack, duration]);

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00e5ff';

  return (
    <div
      className="w-full flex items-center gap-1 sm:gap-1.5 text-[9px] select-none"
      style={{ color: isLucid ? lucidTheme.primary : 'rgba(255, 255, 255, 0.45)' }}
    >
      {/* Current Time Display */}
      <span className="w-7 sm:w-8 text-right font-display font-tabular text-[9px] text-white/60 tracking-wide shrink-0">
        {formatTime(isDragging ? dragTime : currentTime)}
      </span>

      {/* Main Interactive Waveform Scrubber */}
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e);
          handlePointerHover(e);
        }}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        className="relative flex-1 h-3 sm:h-3.5 group flex items-center cursor-pointer py-0.5"
        title="Arrastra para buscar en la onda sonora o salta a los marcadores de Drop"
      >
        {/* Waveform Bars Canvas/DOM */}
        <div className="relative w-full h-full flex items-center gap-[1px] sm:gap-[2px] overflow-hidden px-0.5">
          {waveformData.peaks.map((peak, index) => {
            const barPct = (index / waveformData.peaks.length) * 100;
            const isPlayed = barPct <= progressPct;
            const isHovered = hoverTime !== null && barPct <= hoverPos;
            const barHeight = Math.max(14, Math.round(peak * 100));

            return (
              <div
                key={index}
                className="flex-1 flex items-center justify-center transition-all duration-75"
                style={{ height: '100%' }}
              >
                <div
                  className={`w-full rounded-full transition-all duration-75 ${
                    isPlayed
                      ? 'shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                      : isHovered
                      ? 'opacity-60'
                      : 'opacity-25 group-hover:opacity-35'
                  }`}
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: isPlayed
                      ? activeColor
                      : isHovered
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.65)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* DJ Loop Range Highlight Overlay */}
        {loopA !== null && loopB !== null && duration > 0 && (
          <div
            className={`absolute inset-y-1 rounded-md pointer-events-none transition-all ${
              isLoopActive
                ? 'bg-amber-400/20 border-x-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                : 'bg-white/10 border-x border-white/30'
            }`}
            style={{
              left: `${Math.min(100, Math.max(0, (loopA / duration) * 100))}%`,
              width: `${Math.min(100, Math.max(0, ((loopB - loopA) / duration) * 100))}%`,
            }}
          />
        )}

        {/* Drop Markers (Build-up & Drops) */}
        {waveformData.drops.map((drop, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-start pointer-events-none z-10"
            style={{ left: `${drop.timePct}%` }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse"
              title={`${drop.label} a los ${formatTime(drop.timestampSec)}`}
            />
            <div className="w-px h-full bg-amber-400/30" />
            <span className="hidden group-hover:flex items-center gap-0.5 text-[7px] font-mono font-bold text-amber-300 bg-black/80 px-1 rounded absolute -top-3.5 -translate-x-1/2 whitespace-nowrap border border-amber-400/30">
              <Zap className="w-2 h-2 text-amber-400" />
              {drop.label}
            </span>
          </div>
        ))}

        {/* DJ Loop Flag [A] */}
        {loopA !== null && duration > 0 && (
          <div
            className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 animate-in fade-in"
            style={{ left: `${Math.min(100, Math.max(0, (loopA / duration) * 100))}%` }}
          >
            <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500 text-black shadow-md leading-none">
              A
            </span>
            <div className="w-0.5 h-1.5 bg-amber-400" />
          </div>
        )}

        {/* DJ Loop Flag [B] */}
        {loopB !== null && duration > 0 && (
          <div
            className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 animate-in fade-in"
            style={{ left: `${Math.min(100, Math.max(0, (loopB / duration) * 100))}%` }}
          >
            <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500 text-black shadow-md leading-none">
              B
            </span>
            <div className="w-0.5 h-1.5 bg-amber-400" />
          </div>
        )}

        {/* Hover preview line & tooltip */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md glass-panel text-[10px] font-display font-tabular text-white/90 pointer-events-none shadow-[0_4px_12px_rgba(0,0,0,0.8)] z-30"
            style={{ left: `${hoverPos}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}

        {/* Precision Hairline Scrubber Thumb */}
        <div
          className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 transition-transform pointer-events-none shadow-[0_2px_6px_rgba(0,0,0,0.9)] border border-white/60 z-20 ${
            isDragging ? 'scale-150' : 'scale-100 group-hover:scale-125'
          }`}
          style={{
            left: `${progressPct}%`,
            backgroundColor: activeColor,
            boxShadow: `0 0 6px ${activeColor}`,
          }}
        />
      </div>

      {/* Duration Display */}
      <span className="w-7 sm:w-8 text-left font-display font-tabular text-[9px] text-white/50 tracking-wide shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
