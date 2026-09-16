import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { LyricsLine } from '../../utils/parseLRC';
import {
  AlignLeft,
  X,
  Maximize2,
  Minimize2,
  Type,
  ChevronDown,
  GripHorizontal,
  LayoutTemplate,
  PanelLeft,
  PanelRight,
  Move,
  Maximize,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import type { LyricsPosition, LyricsSize } from './LyricsOverlay';

export type LyricsFontType = 'modern' | 'serif' | 'mono' | 'cursive' | 'display';

interface LyricsPanelProps {
  lyrics: LyricsLine[];
  currentTime: number;
  isPlaying: boolean;
  title?: string;
  artist?: string;
  position?: LyricsPosition;
  size?: LyricsSize;
  isFullscreen?: boolean;
  onPositionChange?: (pos: LyricsPosition) => void;
  onSizeChange?: (size: LyricsSize) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onToggleFullscreen?: () => void;
  onSeek?: (time: number) => void;
  onClose?: () => void;
}

const FONT_OPTIONS: { id: LyricsFontType; label: string; fontFamily: string }[] = [
  { id: 'modern', label: 'Moderna (Sans)', fontFamily: "'Inter', sans-serif" },
  { id: 'serif', label: 'Elegante (Serif)', fontFamily: "'Playfair Display', Georgia, serif" },
  { id: 'mono', label: 'Cyber (Mono)', fontFamily: "'JetBrains Mono', monospace" },
  { id: 'cursive', label: 'Manuscrita', fontFamily: "'Caveat', cursive" },
  { id: 'display', label: 'Futurista (Display)', fontFamily: "'Orbitron', sans-serif" },
];

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  title = 'Sin título',
  artist = 'Artista desconocido',
  position = 'dock-right',
  size = 'standard',
  isFullscreen = false,
  onPositionChange,
  onSizeChange,
  onDragStart,
  onToggleFullscreen,
  onSeek,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Theme from store
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);

  // Popover menus state
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Font customization state with local persistence
  const [selectedFont, setSelectedFont] = useState<LyricsFontType>(() => {
    try {
      return (localStorage.getItem('aura3d_lyrics_font') as LyricsFontType) || 'modern';
    } catch {
      return 'modern';
    }
  });
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('aura3d_lyrics_fontsize') || '0', 10);
    } catch {
      return 0;
    }
  });

  const handleFontChange = (font: LyricsFontType) => {
    setSelectedFont(font);
    try {
      localStorage.setItem('aura3d_lyrics_font', font);
    } catch {}
    setIsFontMenuOpen(false);
  };

  const handleFontSizeChange = (delta: number) => {
    setFontSizeOffset((prev) => {
      const next = Math.max(-2, Math.min(3, prev + delta));
      try {
        localStorage.setItem('aura3d_lyrics_fontsize', next.toString());
      } catch {}
      return next;
    });
  };

  const currentFontFamily = useMemo(() => {
    return FONT_OPTIONS.find((f) => f.id === selectedFont)?.fontFamily || "'Inter', sans-serif";
  }, [selectedFont]);

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

  // Fluid Auto-scroll to center of active lyric line
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setIsFontMenuOpen(false);
      setIsLayoutMenuOpen(false);
    };
    window.addEventListener('blur', handleGlobalClick);
    return () => window.removeEventListener('blur', handleGlobalClick);
  }, []);

  const activeColor = isLucid ? (lucidTheme?.primary || 'var(--ios-teal)') : 'var(--ios-teal)';

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'max-w-4xl max-h-[92vh] rounded-modal p-6 sm:p-10 bg-[var(--surface-overlay)]/95 border border-white/20 material-thick shadow-[0_0_100px_rgba(0,0,0,0.95)]'
          : 'material-regular border border-white/[0.12] rounded-modal p-4 sm:p-5 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] bg-[var(--surface-overlay)]/95'
      }`}
      style={{ fontFamily: currentFontFamily }}
    >
      {/* Dynamic Background Ambient Glow */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-pill pointer-events-none opacity-25 blur-3xl transition-all duration-1000"
        style={{ backgroundColor: activeColor }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-pill pointer-events-none opacity-25 blur-3xl transition-all duration-1000"
        style={{ backgroundColor: isLucid ? lucidTheme.secondary : 'var(--ios-purple)' }}
      />

      {/* Header Bar with Mouse Drag Handle & Multi-Position / Size Controls */}
      <div
        className={`flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0 relative z-20 ${
          !isFullscreen ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={onDragStart}
        title={!isFullscreen ? 'Arrastra para mover en la pantalla' : undefined}
      >
        <div className="flex items-center gap-2 sm:gap-3 max-w-[55%] sm:max-w-[65%] min-w-0">
          {!isFullscreen && (
            <div className="p-1 rounded-control text-white/30 hover:text-white/70 transition-colors flex-shrink-0">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}

          <div
            className="w-10 h-10 rounded-control flex items-center justify-center border transition-all flex-shrink-0"
            style={{
              backgroundColor: 'rgba(43, 220, 210, 0.15)',
              borderColor: 'rgba(43, 220, 210, 0.40)',
              color: activeColor,
            }}
          >
            <AlignLeft className="w-4 h-4" />
          </div>

          <div className="truncate">
            <h3
              className={`text-white font-bold leading-tight tracking-tight truncate ${
                isFullscreen ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
              }`}
            >
              {title}
            </h3>
            <p className="text-white/50 text-caption truncate tracking-wider mt-0.5">
              {artist}
            </p>
          </div>
        </div>

        {/* Action Controls Cluster (Position, Size, Typography, Fullscreen, Close) */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
        >
          {/* Layout & Position Picker Dropdown (Hidden in Fullscreen) */}
          {!isFullscreen && onPositionChange && onSizeChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsLayoutMenuOpen(!isLayoutMenuOpen);
                  setIsFontMenuOpen(false);
                }}
                className={`min-h-11 px-2 sm:px-3 py-1.5 rounded-control border transition-all text-caption font-mono flex items-center gap-1 cursor-pointer ${
                  isLayoutMenuOpen || position !== 'dock-right' || size !== 'standard'
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Ajustar posición en pantalla y tamaño predefinido"
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline text-caption">Posición</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-modal bg-[var(--surface-overlay)]/95 border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 material-thick">
                  {/* Position Presets */}
                  <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1.5">
                    Posición en Pantalla
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-2.5">
                    <button
                      onClick={() => {
                        onPositionChange('dock-right');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'dock-right'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                      <span>Al Costado Der.</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('dock-left');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'dock-left'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <PanelLeft className="w-3.5 h-3.5" />
                      <span>Al Costado Izq.</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('center');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'center'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Centrado</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('bottom-right');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'bottom-right'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Abajo Der.</span>
                    </button>
                  </div>

                  {/* Size Presets */}
                  <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1.5">
                    Tamaño Predefinido
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        onSizeChange('compact');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        size === 'compact'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>Compacto (Mínimo)</span>
                      <span className="text-caption font-tabular text-white/40">320×400</span>
                    </button>

                    <button
                      onClick={() => {
                        onSizeChange('standard');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        size === 'standard'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>Estándar</span>
                      <span className="text-caption font-tabular text-white/40">390×520</span>
                    </button>

                    <button
                      onClick={() => {
                        onSizeChange('lateral');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-11 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        size === 'lateral'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>Lateral Ampliado</span>
                      <span className="text-caption font-tabular text-white/40">440×85vh</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Font Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFontMenuOpen(!isFontMenuOpen);
                setIsLayoutMenuOpen(false);
              }}
              className="min-h-11 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-control border border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/80 hover:text-white transition-all text-caption font-mono cursor-pointer"
              title="Personalizar tipografía de letras"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline capitalize">
                {FONT_OPTIONS.find((f) => f.id === selectedFont)?.label.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            {isFontMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-modal bg-[var(--surface-overlay)]/95 border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 material-thick">
                <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1">
                  Fuente de Letras
                </div>
                <div className="space-y-1">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFontChange(f.id)}
                      className={`min-h-11 w-full text-left px-2.5 py-1.5 rounded-control text-caption transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFont === f.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                      style={{ fontFamily: f.fontFamily }}
                    >
                      <span>{f.label}</span>
                      {selectedFont === f.id && <span className="w-1.5 h-1.5 rounded-pill bg-cyan-400" />}
                    </button>
                  ))}
                </div>

                <div className="px-2 pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-caption font-mono text-white/40 uppercase">Tamaño</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFontSizeChange(-1)}
                      className="min-h-11 min-w-11 px-2.5 py-1 rounded-control bg-white/5 hover:bg-white/15 text-caption text-white/80 font-mono cursor-pointer flex items-center justify-center"
                      title="Reducir tamaño de letra"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => handleFontSizeChange(1)}
                      className="min-h-11 min-w-11 px-2.5 py-1 rounded-control bg-white/5 hover:bg-white/15 text-caption text-white/80 font-mono cursor-pointer flex items-center justify-center"
                      title="Aumentar tamaño de letra"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="min-h-11 min-w-11 p-2.5 rounded-control text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver letras en pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white/70" />
              )}
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="min-h-11 min-w-11 p-2.5 rounded-control text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title="Cerrar letras"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Synchronized Scrolling Lyrics Body */}
      <div
        ref={containerRef}
        role="list"
        aria-label="Letras sincronizadas de la canción"
        className="flex-1 overflow-y-auto py-8 sm:py-12 space-y-4 sm:space-y-6 scroll-smooth pr-1 my-1"
        style={{
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)',
        }}
      >
        {lyrics.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60">
            <AlignLeft className="w-10 h-10 mb-3 opacity-40 animate-pulse text-cyan-400" />
            <p className="text-sm font-medium text-white/90 mb-1">Sin letras sincronizadas disponibles</p>
            <p className="text-xs text-white/60 max-w-xs">
              Reproduce una canción con soporte de letras o sube un archivo LRC personalizado.
            </p>
          </div>
        ) : (
          lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);

            // Progressive blur and opacity falloff (Apple Music style)
            const opacity = isActive ? 1.0 : Math.max(0.25, 0.70 - distance * 0.16);
            const blurAmount = isActive ? 0 : Math.min(4.5, 1.2 + distance * 1.1);

            // Adaptive base font size with user offset
            const baseSizeClass = isFullscreen
              ? fontSizeOffset === -2
                ? 'text-lg sm:text-xl py-2 px-3'
                : fontSizeOffset === -1
                ? 'text-xl sm:text-2xl py-2.5 px-4'
                : fontSizeOffset === 1
                ? 'text-3xl sm:text-4xl py-3.5 px-6'
                : fontSizeOffset >= 2
                ? 'text-4xl sm:text-5xl py-4 px-8'
                : 'text-2xl sm:text-3xl py-3 px-5'
              : fontSizeOffset === -2
              ? 'text-caption py-1.5 px-2.5'
              : fontSizeOffset === -1
              ? 'text-caption sm:text-sm py-1.5 px-3'
              : fontSizeOffset === 1
              ? 'text-base sm:text-lg py-2.5 px-3.5'
              : fontSizeOffset >= 2
              ? 'text-lg sm:text-xl py-3 px-4'
              : 'text-sm sm:text-base py-2 px-3';

            return (
              <div
                key={index}
                role="listitem"
                tabIndex={0}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Línea ${index + 1}: ${line.text}`}
                onClick={() => onSeek && onSeek(line.time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSeek) onSeek(line.time);
                  }
                }}
                className={`rounded-modal cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] text-center ${baseSizeClass} ${
                  isActive
                    ? 'font-black scale-[1.06] shadow-[0_12px_40px_rgba(0,0,0,0.7)] border material-thin'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05] font-medium'
                }`}
                style={{
                  opacity,
                  filter: `blur(${blurAmount}px)`,
                  backgroundColor: isActive
                    ? 'rgba(43, 220, 210, 0.12)'
                    : undefined,
                  borderColor: isActive
                    ? 'rgba(43, 220, 210, 0.45)'
                    : 'transparent',
                  boxShadow: isActive
                    ? '0 8px 32px -4px rgba(43, 220, 210, 0.33), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : 'none',
                }}
              >
                <span
                  className={`inline-block transition-all duration-300 ${
                    isActive
                      ? 'text-white font-extrabold tracking-tight'
                      : ''
                  }`}
                  style={
                    isActive
                      ? {
                          textShadow: '0 0 20px var(--ios-teal), 0 0 40px rgba(43, 220, 210, 0.5), 0 2px 10px rgba(0,0,0,0.9)',
                        }
                      : undefined
                  }
                >
                  {line.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom status readout */}
      <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-caption text-white/65 font-mono flex-shrink-0 relative z-20">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-pill transition-colors ${
              isPlaying ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{ backgroundColor: isPlaying ? activeColor : 'var(--label-primary)' }}
          />
          {isPlaying ? 'SINCRONIZACIÓN FLUIDA EN TIEMPO REAL' : 'AUDIO PAUSADO'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-white/60 capitalize">
            {FONT_OPTIONS.find((f) => f.id === selectedFont)?.label.split(' ')[0]}
          </span>
          <span className="font-tabular">{lyrics.length > 0 ? `${lyrics.length} LÍNEAS` : '0 LÍNEAS'}</span>
        </div>
      </div>
    </div>
  );
};

export default LyricsPanel;
