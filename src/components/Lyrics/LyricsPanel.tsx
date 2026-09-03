import React, { useRef, useEffect, useState } from 'react';
import type { LyricsLine } from '../../utils/parseLRC';
import { AlignLeft, Music2, Sparkles, X } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface LyricsPanelProps {
  lyrics: LyricsLine[];
  currentTime: number;
  isPlaying: boolean;
  title?: string;
  artist?: string;
  onSeek?: (time: number) => void;
  onClose?: () => void;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  title = 'Sin título',
  artist = 'Artista desconocido',
  onSeek,
  onClose,
}) => {
  const { isLucid, lucidTheme } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Find active line based on currentTime
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) return;
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    setActiveIndex(index);
  }, [currentTime, lyrics]);

  // Smooth auto-scroll to center of active lyric
  useEffect(() => {
    if (containerRef.current && activeIndex >= 0) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex]);

  return (
    <div
      className="w-full h-full bg-[#080b18]/90 backdrop-blur-2xl border rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300"
      style={
        isLucid
          ? {
              borderColor: `${lucidTheme.primary}45`,
              boxShadow: `0 0 35px ${lucidTheme.glow}, 0 20px 50px rgba(0,0,0,0.9)`,
            }
          : {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }
      }
    >
      {/* Header with Title, Artist & Close button */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 max-w-[80%]">
          <div
            className="p-1.5 rounded-lg border"
            style={{
              backgroundColor: isLucid ? `${lucidTheme.primary}20` : 'rgba(255,8,138,0.2)',
              color: isLucid ? lucidTheme.primary : '#ff088a',
              borderColor: isLucid ? `${lucidTheme.primary}40` : 'rgba(255,8,138,0.3)',
            }}
          >
            <AlignLeft className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="text-white font-medium text-sm sm:text-base truncate leading-tight">
              {title}
            </h3>
            <p className="text-cyan-200/50 text-[11px] sm:text-xs truncate font-light tracking-wider">
              {artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-cyan-300 font-mono">
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span>KARAOKE</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Synchronized Lyrics Scroll Container */}
      <div
        ref={containerRef}
        className="flex-1 my-3 overflow-y-auto px-2 py-4 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
        }}
      >
        {(!lyrics || lyrics.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/40 space-y-2">
            <Music2 className="w-10 h-10 text-white/20 animate-pulse" />
            <p className="text-xs italic tracking-wider">
              {isPlaying ? 'Letras no disponibles para esta pista' : 'Esperando reproducción...'}
            </p>
            <p className="text-[10px] text-white/30 uppercase font-mono">
              Arrastra un archivo .lrc junto a tu canción
            </p>
          </div>
        ) : (
          lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);
            const opacity = isActive ? 1 : Math.max(0.25, 0.7 - distance * 0.15);

            return (
              <div
                key={index}
                onClick={() => onSeek && onSeek(line.time)}
                className={`py-2 px-3.5 rounded-2xl cursor-pointer transition-all duration-300 transform ${
                  isActive
                    ? isLucid
                      ? 'text-white font-semibold text-base sm:text-lg border-l-4 scale-[1.02]'
                      : 'bg-gradient-to-r from-pink-500/20 via-cyan-500/15 to-transparent text-white font-semibold text-base sm:text-lg border-l-4 border-pink-400 shadow-[0_0_20px_rgba(255,8,138,0.25)] scale-[1.02]'
                    : 'text-white/60 hover:text-white hover:bg-white/5 text-xs sm:text-sm font-normal scale-100 border-l-4 border-transparent'
                }`}
                style={{
                  opacity,
                  borderColor: isActive && isLucid ? lucidTheme.primary : undefined,
                  background: isActive && isLucid ? `linear-gradient(90deg, ${lucidTheme.primary}25, transparent)` : undefined,
                  boxShadow: isActive && isLucid ? `0 0 20px ${lucidTheme.glow}` : undefined,
                  textShadow: isActive
                    ? isLucid
                      ? `0 0 15px ${lucidTheme.primary}`
                      : '0 0 15px rgba(0,242,254,0.6)'
                    : 'none',
                }}
              >
                <span>{line.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom status badge */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono flex-shrink-0">
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-white/30'}`} />
          {isPlaying ? 'SINCRONIZACIÓN EN VIVO' : 'PAUSADO'}
        </span>
        <span>{lyrics.length > 0 ? `${lyrics.length} LÍNEAS` : '0 LÍNEAS'}</span>
      </div>
    </div>
  );
};

export default LyricsPanel;

