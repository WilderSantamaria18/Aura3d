import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  Sparkles,
  Palette,
  Box,
  Upload,
  Play,
  RotateCcw,
  Music,
  Plus,
  Minus,
  Check,
  Radio,
  FileText,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { LUCID_THEMES, type LucidTheme } from '../../types/audio';
import type { LyricsPosition, LyricsSize } from './LyricsOverlay';

export type LyricsFontType = 'modern' | 'serif' | 'mono' | 'cursive' | 'display';

interface LyricsPanelProps {
  lyrics: LyricsLine[];
  currentTime: number;
  isPlaying: boolean;
  title?: string;
  artist?: string;
  coverUrl?: string;
  source?: string;
  isSynced?: boolean;
  isLoading?: boolean;
  position?: LyricsPosition;
  size?: LyricsSize;
  isFullscreen?: boolean;
  onPositionChange?: (pos: LyricsPosition) => void;
  onSizeChange?: (size: LyricsSize) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onToggleFullscreen?: () => void;
  onSeek?: (time: number) => void;
  onClose?: () => void;
  onUploadLrc?: (file: File) => void;
}

const FONT_OPTIONS: { id: LyricsFontType; label: string; fontFamily: string }[] = [
  { id: 'modern', label: 'Moderna (Sans)', fontFamily: "'Inter', sans-serif" },
  { id: 'serif', label: 'Elegante (Serif)', fontFamily: "'Playfair Display', Georgia, serif" },
  { id: 'mono', label: 'Cyber (Mono)', fontFamily: "'JetBrains Mono', monospace" },
  { id: 'cursive', label: 'Manuscrita', fontFamily: "'Caveat', cursive" },
  { id: 'display', label: 'Futurista (Display)', fontFamily: "'Orbitron', sans-serif" },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  title = 'Sin título',
  artist = 'Artista desconocido',
  coverUrl,
  source = 'none',
  isSynced = true,
  isLoading = false,
  position = 'dock-right',
  size = 'standard',
  isFullscreen = false,
  onPositionChange,
  onSizeChange,
  onDragStart,
  onToggleFullscreen,
  onSeek,
  onClose,
  onUploadLrc,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Store Lucid states & actions
  const isLucid = usePlayerStore((s) => s.isLucid);
  const toggleLucidMode = usePlayerStore((s) => s.toggleLucidMode);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidSecondaryColor = usePlayerStore((s) => s.lucidSecondaryColor);
  const setLucidTheme = usePlayerStore((s) => s.setLucidTheme);
  const isLyrics3DActive = usePlayerStore((s) => s.isLyrics3DActive);
  const toggleLyrics3D = usePlayerStore((s) => s.toggleLyrics3D);

  // Popover menus state
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // Manual Timing Sync Offset (+/- seconds)
  const [syncOffset, setSyncOffset] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('aura3d_lyrics_offset') || '0');
    } catch {
      return 0;
    }
  });

  // User manual scroll lock (pauses auto-scroll when user inspects other lines)
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const userScrollTimeoutRef = useRef<number | null>(null);

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

  const handleOffsetChange = (delta: number) => {
    setSyncOffset((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      try {
        localStorage.setItem('aura3d_lyrics_offset', next.toString());
      } catch {}
      return next;
    });
  };

  const handleResetOffset = () => {
    setSyncOffset(0);
    try {
      localStorage.removeItem('aura3d_lyrics_offset');
    } catch {}
  };

  const currentFontFamily = useMemo(() => {
    return FONT_OPTIONS.find((f) => f.id === selectedFont)?.fontFamily || "'Inter', sans-serif";
  }, [selectedFont]);

  // Active adjusted time with sync offset
  const effectiveTime = Math.max(0, currentTime + syncOffset);

  // Find active line based on effectiveTime
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) return;
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (effectiveTime >= lyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    setActiveIndex(index);
  }, [effectiveTime, lyrics]);

  // Fluid Auto-scroll to center of active lyric line (if not manually locked by user)
  useEffect(() => {
    if (!isUserScrolled && containerRef.current && activeIndex >= 0) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeIndex, isUserScrolled]);

  const handleContainerScroll = useCallback(() => {
    setIsUserScrolled(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = window.setTimeout(() => {
      setIsUserScrolled(false);
    }, 4000);
  }, []);

  const handleResumeAutoScroll = () => {
    setIsUserScrolled(false);
    if (containerRef.current && activeIndex >= 0) {
      const activeElement = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setIsFontMenuOpen(false);
      setIsLayoutMenuOpen(false);
      setIsThemeMenuOpen(false);
    };
    window.addEventListener('blur', handleGlobalClick);
    return () => window.removeEventListener('blur', handleGlobalClick);
  }, []);

  const primaryColor = isLucid ? (lucidPrimaryColor || lucidTheme?.primary || '#2bdcd2') : '#2bdcd2';
  const secondaryColor = isLucid ? (lucidSecondaryColor || lucidTheme?.secondary || '#a855f7') : '#a855f7';
  const glowColor = isLucid ? (lucidTheme?.glow || 'rgba(43, 220, 210, 0.4)') : 'rgba(43, 220, 210, 0.25)';
  const borderColor = isLucid ? (lucidTheme?.borderColor || 'rgba(43, 220, 210, 0.35)') : 'rgba(255, 255, 255, 0.12)';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadLrc) {
      onUploadLrc(file);
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none relative overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'max-w-5xl max-h-[94vh] rounded-modal p-6 sm:p-10 material-thick'
          : 'material-regular rounded-modal p-4 sm:p-5'
      }`}
      style={{
        fontFamily: currentFontFamily,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        boxShadow: isFullscreen
          ? `0 0 120px rgba(0,0,0,0.95), 0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.22)`
          : `0 24px 64px -8px rgba(0,0,0,0.88), 0 0 24px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.18)`,
        background: isLucid
          ? 'linear-gradient(135deg, rgba(8, 14, 28, 0.95) 0%, rgba(4, 7, 16, 0.97) 100%)'
          : 'rgba(7, 10, 20, 0.93)',
      }}
    >
      {/* Hidden File Input for Custom LRC Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dynamic Background Lucid Glow Blobs */}
      <div
        className="absolute -top-28 -left-28 w-80 h-80 rounded-pill pointer-events-none opacity-20 blur-3xl transition-all duration-1000"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="absolute -bottom-28 -right-28 w-80 h-80 rounded-pill pointer-events-none opacity-20 blur-3xl transition-all duration-1000"
        style={{ backgroundColor: secondaryColor }}
      />

      {/* ── Header Bar ──────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0 relative z-20 ${
          !isFullscreen ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={onDragStart}
        title={!isFullscreen ? 'Arrastra para mover en la pantalla' : undefined}
      >
        {/* Track Title & Artist with Album Thumbnail */}
        <div className="flex items-center gap-2.5 sm:gap-3 max-w-[50%] sm:max-w-[60%] min-w-0">
          {!isFullscreen && (
            <div className="p-1 rounded-control text-white/30 hover:text-white/70 transition-colors flex-shrink-0">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}

          <div
            className="w-10 h-10 rounded-control flex items-center justify-center border transition-all flex-shrink-0 overflow-hidden relative shadow-inner"
            style={{
              backgroundColor: `${primaryColor}20`,
              borderColor: `${primaryColor}50`,
            }}
          >
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-4 h-4" style={{ color: primaryColor }} />
            )}
            {isPlaying && (
              <div
                className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5"
                title="Reproduciendo"
              >
                <div className="w-0.5 h-3.5 bg-cyan-300 animate-pulse rounded-pill" />
                <div className="w-0.5 h-4.5 bg-cyan-300 animate-pulse delay-75 rounded-pill" />
                <div className="w-0.5 h-2.5 bg-cyan-300 animate-pulse delay-150 rounded-pill" />
              </div>
            )}
          </div>

          <div className="truncate">
            <h3
              className={`text-white font-bold leading-tight tracking-tight truncate ${
                isFullscreen ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
              }`}
            >
              {title}
            </h3>
            <div className="flex items-center gap-1.5 text-caption truncate tracking-wider mt-0.5">
              <span className="text-white/60 truncate">{artist}</span>
              {source && source !== 'none' && (
                <span
                  className="px-1.5 py-0.2 rounded-badge text-[10px] font-mono uppercase font-semibold border flex-shrink-0"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    borderColor: `${primaryColor}35`,
                    color: primaryColor,
                  }}
                >
                  {source === 'lrc' ? 'LRC Local' : source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Cluster (Lucid Palette, 3D Karaoke, Font, Layout, Fullscreen, Close) */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
          onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking buttons
        >
          {/* 3D Floating Karaoke Lyrics Toggle Button */}
          <button
            onClick={toggleLyrics3D}
            className={`min-h-9 px-2 sm:px-2.5 py-1 rounded-control border transition-all text-caption font-mono flex items-center gap-1 cursor-pointer ${
              isLyrics3DActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={isLyrics3DActive ? 'Desactivar Letras 3D Flotantes' : 'Activar Letras 3D Flotantes en el Escenario'}
            aria-label="Alternar Letras 3D"
          >
            <Box className={`w-3.5 h-3.5 ${isLyrics3DActive ? 'text-cyan-300 animate-pulse' : 'text-white/60'}`} />
            <span className="hidden lg:inline text-caption">3D</span>
          </button>

          {/* Lucid Theme Palette Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsThemeMenuOpen(!isThemeMenuOpen);
                setIsFontMenuOpen(false);
                setIsLayoutMenuOpen(false);
              }}
              className={`min-h-9 px-2 sm:px-2.5 py-1 rounded-control border transition-all text-caption font-mono flex items-center gap-1.5 cursor-pointer ${
                isLucid
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Paleta de Estilo Lucid"
              aria-label="Paleta Lucid"
            >
              <div
                className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="hidden md:inline text-caption capitalize">
                {isLucid ? lucidTheme.name : 'Lucid'}
              </span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-modal bg-[var(--surface-overlay)]/95 border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 material-thick">
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 mb-2">
                  <span className="text-caption font-mono text-white/40 tracking-wider uppercase">
                    Tema Lucid
                  </span>
                  <button
                    onClick={toggleLucidMode}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-badge border cursor-pointer ${
                      isLucid
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-white/50 border-white/10'
                    }`}
                  >
                    {isLucid ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {LUCID_THEMES.map((t) => {
                    const isSelected = isLucid && lucidTheme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (!isLucid) toggleLucidMode();
                          setLucidTheme(t);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                            }}
                          />
                          <span>{t.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Typography Customizer Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFontMenuOpen(!isFontMenuOpen);
                setIsLayoutMenuOpen(false);
                setIsThemeMenuOpen(false);
              }}
              className="min-h-9 flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-control border border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/80 hover:text-white transition-all text-caption font-mono cursor-pointer"
              title="Personalizar tipografía de letras"
              aria-label="Tipografía"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline capitalize">
                {FONT_OPTIONS.find((f) => f.id === selectedFont)?.label.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            {isFontMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-modal bg-[var(--surface-overlay)]/95 border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 material-thick">
                <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1.5">
                  Fuente de Letras
                </div>
                <div className="space-y-1 mb-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFontChange(f.id)}
                      className={`min-h-9 w-full text-left px-2.5 py-1.5 rounded-control text-caption transition-colors flex items-center justify-between cursor-pointer ${
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

                <div className="px-2 pt-2 border-t border-white/5 flex items-center justify-between mb-2">
                  <span className="text-caption font-mono text-white/40 uppercase">Tamaño</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFontSizeChange(-1)}
                      className="min-h-8 min-w-8 px-2 py-1 rounded-control bg-white/5 hover:bg-white/15 text-caption text-white/80 font-mono cursor-pointer flex items-center justify-center"
                      title="Reducir tamaño"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-caption font-mono text-cyan-300 px-1 font-tabular">
                      {fontSizeOffset >= 0 ? `+${fontSizeOffset}` : fontSizeOffset}
                    </span>
                    <button
                      onClick={() => handleFontSizeChange(1)}
                      className="min-h-8 min-w-8 px-2 py-1 rounded-control bg-white/5 hover:bg-white/15 text-caption text-white/80 font-mono cursor-pointer flex items-center justify-center"
                      title="Aumentar tamaño"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Timing Offset Sync Adjustment */}
                <div className="px-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-caption font-mono text-white/40 uppercase">Sincro</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOffsetChange(-0.5)}
                      className="min-h-8 px-1.5 py-1 rounded-control bg-white/5 hover:bg-white/15 text-[11px] text-white/80 font-mono cursor-pointer"
                      title="Adelantar letras (-0.5s)"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={handleResetOffset}
                      className={`min-h-8 px-1.5 py-1 rounded-control font-mono text-[11px] cursor-pointer ${
                        syncOffset !== 0 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-white/40'
                      }`}
                      title="Restablecer desfase"
                    >
                      {syncOffset === 0 ? '0s' : `${syncOffset > 0 ? '+' : ''}${syncOffset}s`}
                    </button>
                    <button
                      onClick={() => handleOffsetChange(0.5)}
                      className="min-h-8 px-1.5 py-1 rounded-control bg-white/5 hover:bg-white/15 text-[11px] text-white/80 font-mono cursor-pointer"
                      title="Atrasar letras (+0.5s)"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Layout & Position Picker Dropdown (Hidden in Fullscreen) */}
          {!isFullscreen && onPositionChange && onSizeChange && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsLayoutMenuOpen(!isLayoutMenuOpen);
                  setIsFontMenuOpen(false);
                  setIsThemeMenuOpen(false);
                }}
                className={`min-h-9 px-2 sm:px-2.5 py-1 rounded-control border transition-all text-caption font-mono flex items-center gap-1 cursor-pointer ${
                  isLayoutMenuOpen || position !== 'dock-right' || size !== 'standard'
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Ajustar posición en pantalla y tamaño"
                aria-label="Posición"
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline text-caption">Layout</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-modal bg-[var(--surface-overlay)]/95 border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 material-thick">
                  <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1.5">
                    Posición en Pantalla
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-2.5">
                    <button
                      onClick={() => {
                        onPositionChange('dock-right');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'dock-right'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                      <span>Derecha</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('dock-left');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'dock-left'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <PanelLeft className="w-3.5 h-3.5" />
                      <span>Izquierda</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('center');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'center'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Centro</span>
                    </button>

                    <button
                      onClick={() => {
                        onPositionChange('bottom-right');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center gap-1.5 p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        position === 'bottom-right'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Flotante</span>
                    </button>
                  </div>

                  <div className="px-2 py-1 text-caption font-mono text-white/40 tracking-wider uppercase border-b border-white/5 mb-1.5">
                    Tamaño Predefinido
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        onSizeChange('compact');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                        size === 'compact'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>Compacto</span>
                      <span className="text-caption font-tabular text-white/40">320×400</span>
                    </button>

                    <button
                      onClick={() => {
                        onSizeChange('standard');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`min-h-9 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
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
                      className={`min-h-9 flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
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

          {/* Upload Custom LRC File Button */}
          {onUploadLrc && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-9 min-w-9 p-2 rounded-control text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title="Cargar archivo de letras .LRC"
              aria-label="Cargar LRC"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen / Theater Toggle Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="min-h-9 min-w-9 p-2 rounded-control text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Modo Cine / Pantalla Completa'}
              aria-label="Pantalla completa"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-white/70" />
              )}
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="min-h-9 min-w-9 p-2 rounded-control text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title="Cerrar letras"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Synchronized Scrolling Lyrics Body ─────────────────────────── */}
      <div
        ref={containerRef}
        role="list"
        aria-label="Letras sincronizadas de la canción"
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto py-8 sm:py-12 space-y-4 sm:space-y-6 scroll-smooth pr-1 my-1 relative"
        style={{
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
        }}
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60 gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${primaryColor}40`, borderTopColor: primaryColor }}
            />
            <p className="text-sm font-medium text-white/90">Buscando letras sincronizadas...</p>
            <p className="text-xs text-white/50">Conectando con base de datos de karaoke en vivo</p>
          </div>
        ) : lyrics.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/60">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border mb-3 shadow-lg"
              style={{
                backgroundColor: `${primaryColor}15`,
                borderColor: `${primaryColor}35`,
              }}
            >
              <FileText className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <p className="text-sm font-semibold text-white/90 mb-1">Sin letras sincronizadas</p>
            <p className="text-xs text-white/60 max-w-xs mb-4">
              Esta canción no tiene letras sincronizadas registradas en línea.
            </p>
            {onUploadLrc && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-control text-caption font-mono font-medium border flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                style={{
                  backgroundColor: `${primaryColor}20`,
                  borderColor: `${primaryColor}50`,
                  color: primaryColor,
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                Subir archivo .LRC
              </button>
            )}
          </div>
        ) : (
          lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);

            // Progressive blur and opacity falloff (Apple Music style)
            const opacity = isActive ? 1.0 : Math.max(0.20, 0.68 - distance * 0.14);
            const blurAmount = isActive ? 0 : Math.min(4.0, 0.8 + distance * 1.0);

            // Adaptive base font size with user offset
            const baseSizeClass = isFullscreen
              ? fontSizeOffset === -2
                ? 'text-lg sm:text-xl py-2 px-4'
                : fontSizeOffset === -1
                ? 'text-xl sm:text-2xl py-2.5 px-5'
                : fontSizeOffset === 1
                ? 'text-3xl sm:text-4xl py-3.5 px-7'
                : fontSizeOffset >= 2
                ? 'text-4xl sm:text-5xl py-4 px-8'
                : 'text-2xl sm:text-3xl py-3 px-6'
              : fontSizeOffset === -2
              ? 'text-caption py-1.5 px-2.5'
              : fontSizeOffset === -1
              ? 'text-caption sm:text-sm py-1.5 px-3'
              : fontSizeOffset === 1
              ? 'text-base sm:text-lg py-2.5 px-3.5'
              : fontSizeOffset >= 2
              ? 'text-lg sm:text-xl py-3 px-4'
              : 'text-sm sm:text-base py-2 px-3.5';

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
                className={`group relative rounded-modal cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] text-center ${baseSizeClass} ${
                  isActive
                    ? 'font-black scale-[1.04] shadow-[0_12px_40px_rgba(0,0,0,0.7)] border material-thin'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}
                style={{
                  opacity,
                  filter: `blur(${blurAmount}px)`,
                  backgroundColor: isActive
                    ? `${primaryColor}18`
                    : undefined,
                  borderColor: isActive
                    ? `${primaryColor}55`
                    : 'transparent',
                  boxShadow: isActive
                    ? `0 8px 32px -4px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`
                    : 'none',
                }}
              >
                {/* Time Seek Pill on Hover */}
                {isSynced && (
                  <span
                    className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold px-2 py-0.5 rounded-badge border bg-black/70 text-cyan-300 border-cyan-400/40 hidden sm:inline-flex items-center gap-1 shadow-md"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    {formatTime(line.time)}
                  </span>
                )}

                <span
                  className={`inline-block transition-all duration-300 ${
                    isActive
                      ? 'text-white font-black tracking-tight'
                      : ''
                  }`}
                  style={
                    isActive
                      ? {
                          textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${secondaryColor}66, 0 2px 10px rgba(0,0,0,0.9)`,
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

      {/* Floating "Volver a la línea actual" Pill when User Scrolls Manually */}
      {isUserScrolled && lyrics.length > 0 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={handleResumeAutoScroll}
            className="px-3.5 py-1.5 rounded-pill text-caption font-mono font-bold text-white bg-cyan-600/90 hover:bg-cyan-500 border border-cyan-300/40 shadow-xl flex items-center gap-1.5 transition-all cursor-pointer material-thick"
          >
            <Radio className="w-3 h-3 animate-pulse" />
            Volver a la letra en vivo
          </button>
        </div>
      )}

      {/* ── Bottom Telemetry & Status Readout ──────────────────────────────── */}
      <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-caption text-white/65 font-mono flex-shrink-0 relative z-20">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-pill transition-colors ${
              isPlaying ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{ backgroundColor: isPlaying ? primaryColor : 'var(--label-primary)' }}
          />
          <span className="truncate max-w-[140px] sm:max-w-none">
            {isPlaying
              ? isSynced
                ? 'KARAOKE SINCRONIZADO'
                : 'LETRA ESTÁTICA'
              : 'AUDIO PAUSADO'}
          </span>
          {syncOffset !== 0 && (
            <span className="px-1.5 py-0.2 rounded-badge text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`}
            </span>
          )}
        </span>

        <div className="flex items-center gap-3">
          <span className="text-white/60 capitalize hidden sm:inline">
            {FONT_OPTIONS.find((f) => f.id === selectedFont)?.label.split(' ')[0]}
          </span>
          <span className="font-tabular">
            {lyrics.length > 0 ? `${activeIndex + 1}/${lyrics.length}` : '0 LÍNEAS'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LyricsPanel;
