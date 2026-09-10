import React, { useRef, useEffect, useState } from 'react';
import type { LyricsLine } from '../../utils/parseLRC';
import { AlignLeft, Music2, X } from 'lucide-react';

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
      className="w-full h-full backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300 bg-[#090d18]/95"
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* Header with Title, Artist & Close button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 max-w-[80%]">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#00e5ff]">
            <AlignLeft className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="text-white font-medium text-sm sm:text-base truncate leading-tight tracking-tight">
              {title}
            </h3>
            <p className="text-white/50 text-[11px] truncate font-mono tracking-wider mt-0.5">
              {artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-white/50 uppercase">
            LETRAS
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Cerrar letras"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Synchronized Lyrics Scroll Container with Depth of Field */}
      <div
        ref={containerRef}
        className="flex-1 my-2 overflow-y-auto px-1 py-4 space-y-2 scrollbar-none scroll-smooth"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      >
        {(!lyrics || lyrics.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/40 space-y-2">
            <Music2 className="w-8 h-8 text-white/20 animate-pulse" />
            <p className="text-xs tracking-wider font-mono">
              {isPlaying ? 'Letras no disponibles para esta pista' : 'Esperando reproducción...'}
            </p>
            <p className="text-[10px] text-white/30 font-mono">
              Arrastra un archivo .lrc junto a tu canción
            </p>
          </div>
        ) : (
          lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);
            const opacity = isActive ? 1 : Math.max(0.18, 0.65 - distance * 0.15);
            const blurAmount = isActive ? 0 : Math.min(2, distance * 0.5);

            return (
              <div
                key={index}
                onClick={() => onSeek && onSeek(line.time)}
                className={`py-2 px-3 rounded-xl cursor-pointer transition-all duration-300 ${
                  isActive
                    ? 'bg-white/[0.06] text-white font-semibold text-base sm:text-lg tracking-tight scale-[1.01]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.03] text-xs sm:text-sm font-normal'
                }`}
                style={{
                  opacity,
                  filter: `blur(${blurAmount}px)`,
                }}
              >
                <span>{line.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom status readout */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-white/40 font-mono flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#00e5ff]' : 'bg-white/30'}`} />
          {isPlaying ? 'SINCRONIZACIÓN EN TIEMPO REAL' : 'PAUSADO'}
        </span>
        <span>{lyrics.length > 0 ? `${lyrics.length} LÍNEAS` : '0 LÍNEAS'}</span>
      </div>
    </div>
  );
};

export default LyricsPanel;

