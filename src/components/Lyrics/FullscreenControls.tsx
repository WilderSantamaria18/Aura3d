/**
 * FullscreenControls — Floating Master Liquid Glass Controller for Fullscreen Lyrics Mode
 *
 * Implements Apple Music Sing & visionOS Liquid Glass design:
 *  - Interactive track progress scrubber
 *  - Dedicated Apple Music Sing Karaoke Vocal Control (Off / Karaoke / Acappella)
 *  - High-precision playback transport with luminous spring buttons
 *  - Micro-sync offset nudging (-0.1s / +0.1s)
 *  - Auto-hide on cursor inactivity with smooth spring exit
 */

import React, { useRef } from 'react';
import { 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Minimize2, 
  Timer,
  Volume2
} from 'lucide-react';
import type { VocalMode } from '../../types/audio';

export interface FullscreenControlsProps {
  isPlaying: boolean;
  isUiVisible: boolean;
  activeColor?: string;
  secondaryColor?: string;
  onPlayPause?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onToggleFullscreen?: () => void;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  vocalMode?: VocalMode;
  onToggleVocalMode?: () => void;
  lyricsOffset?: number;
  onAdjustOffset?: (delta: number) => void;
  title?: string;
  artist?: string;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const FullscreenControls: React.FC<FullscreenControlsProps> = ({
  isPlaying,
  isUiVisible,
  activeColor = '#00f0ff',
  secondaryColor = '#8c38ff',
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onToggleFullscreen,
  currentTime = 0,
  duration = 0,
  onSeek,
  vocalMode = 'off',
  onToggleVocalMode,
  lyricsOffset = 0,
  onAdjustOffset,
  title,
  artist,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !onSeek || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const isKaraokeActive = vocalMode === 'karaoke';
  const isAcappellaActive = vocalMode === 'acappella';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isUiVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      role="toolbar"
      aria-label="Controles de reproducción en pantalla completa"
    >
      <div
        className="flex flex-col gap-2.5 px-4 sm:px-6 py-3 rounded-3xl max-w-[95vw] sm:max-w-2xl select-none"
        style={{
          background: 'rgba(8, 12, 22, 0.72)',
          backdropFilter: 'blur(36px) saturate(190%)',
          WebkitBackdropFilter: 'blur(36px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1px solid rgba(255, 255, 255, 0.32)',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px ${isKaraokeActive ? 'rgba(0, 229, 255, 0.25)' : 'transparent'}`,
        }}
      >
        {/* Interactive Progress Bar Scrubber */}
        {duration > 0 && onSeek && (
          <div className="w-full flex items-center gap-2.5 pt-0.5">
            <span className="font-mono text-[10px] text-white/50 w-8 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <div
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              className="flex-1 h-1.5 hover:h-2.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden transition-all duration-150 group/bar"
              title="Saltar en la pista"
            >
              <div
                className="h-full rounded-full transition-all duration-75 relative"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                  boxShadow: `0 0 10px ${activeColor}80`,
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 shadow-[0_0_6px_#fff] transition-opacity" />
              </div>
            </div>
            <span className="font-mono text-[10px] text-white/50 w-8 text-left tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Master Control Island Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Left Segment: Track Meta or Micro-Sync Nudge */}
          <div className="flex items-center gap-2 min-w-0">
            {onAdjustOffset && (
              <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-1.5 py-1">
                <Timer className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => onAdjustOffset(-0.1)}
                  className="px-1.5 py-0.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                  title="Atrasar letras 0.1s"
                >
                  -0.1s
                </button>
                <span className="font-mono text-[10px] text-cyan-300 font-bold px-0.5">
                  {lyricsOffset !== 0 ? `${lyricsOffset > 0 ? '+' : ''}${lyricsOffset.toFixed(1)}s` : '0.0s'}
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustOffset(0.1)}
                  className="px-1.5 py-0.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                  title="Adelantar letras 0.1s"
                >
                  +0.1s
                </button>
              </div>
            )}
            {title && (
              <div className="hidden md:flex flex-col min-w-0 max-w-[130px]">
                <span className="text-xs text-white font-medium truncate">{title}</span>
                <span className="text-[10px] text-white/50 truncate">{artist}</span>
              </div>
            )}
          </div>

          {/* Center Segment: Playback Transport Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onSkipBack && (
              <button
                type="button"
                onClick={onSkipBack}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                title="Pista anterior"
                aria-label="Pista anterior"
              >
                <SkipBack size={16} />
              </button>
            )}

            {onPlayPause && (
              <button
                type="button"
                onClick={onPlayPause}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-black font-bold transition-all active:scale-90 shadow-lg hover:scale-105"
                style={{ 
                  backgroundColor: activeColor,
                  boxShadow: `0 0 20px ${activeColor}80`,
                }}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
            )}

            {onSkipForward && (
              <button
                type="button"
                onClick={onSkipForward}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                title="Siguiente pista"
                aria-label="Siguiente pista"
              >
                <SkipForward size={16} />
              </button>
            )}
          </div>

          {/* Right Segment: Apple Music Sing (Karaoke Mic) & Exit Button */}
          <div className="flex items-center gap-2">
            {/* Apple Music Sing Karaoke Trigger Pill */}
            {onToggleVocalMode && (
              <button
                type="button"
                onClick={onToggleVocalMode}
                className={`relative px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-xs font-mono select-none active:scale-95 border ${
                  isKaraokeActive
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_18px_rgba(0,229,255,0.45)]'
                    : isAcappellaActive
                    ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.45)]'
                    : 'bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white border-white/10'
                }`}
                title="Alternar Modo Karaoke / Aislamiento de voz"
              >
                {isKaraokeActive ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-300 animate-bounce" style={{ animationDuration: '1s' }} />
                    <span className="hidden sm:inline font-sans text-[11px] font-semibold text-white">Sing: Karaoke</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </>
                ) : isAcappellaActive ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                    <span className="hidden sm:inline font-sans text-[11px] font-semibold text-white">Solo Voz</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-white/50" />
                    <span className="hidden sm:inline font-sans text-[11px]">Karaoke</span>
                  </>
                )}
              </button>
            )}

            {/* Exit Fullscreen Button */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90 border border-white/10"
                title="Salir de pantalla completa (Esc)"
              >
                <Minimize2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenControls;
