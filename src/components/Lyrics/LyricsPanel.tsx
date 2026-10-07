/**
 * LyricsPanel — Apple Liquid Glass & visionOS Synchronized Karaoke Engine
 *
 * Designed with Apple Human Interface Guidelines & Liquid Glass Spec:
 *  - Spacious, uncluttered hierarchy with elegant component disposition
 *  - Consolidated glass settings drawer for typography, sizing, and dock presets
 *  - Apple Music Focus & Blur Falloff (Progressive Gaussian depth of field)
 *  - High-fidelity Active Hero Line with luminous neon glow & syllable wave progress
 *  - Fullscreen IMAX Spatial Karaoke Mode with atmospheric glowing aura orbs
 *  - Compact, single-row glass status footer
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LyricsLine } from '../../utils/parseLRC';
import {
  AlignLeft,
  X,
  Maximize2,
  Minimize2,
  Type,
  PanelLeft,
  PanelRight,
  Upload,
  Mic,
  MicOff,
  Music,
  Disc3,
  Play,
  Settings,
  Timer,
  Volume2,
  Sparkles,
  Video,
  Activity,
} from 'lucide-react';
import Lenis from 'lenis';
import { usePlayerStore } from '../../stores/playerStore';
import type { LyricsPosition, LyricsSize } from './LyricsOverlay';
import type { LyricLine, EnhancedLyricLine } from '../../types/lyrics';
import { useLyricSync } from '../../hooks/useLyricSync';
import { FullscreenControls } from './FullscreenControls';
import { LyricsSettingsModal } from './LyricsSettingsModal';
import { PlaceholderLines } from './PlaceholderLines';
import { romanizeLine, type RomanizeResult } from '../../services/romanizationService';
import { HolographicAlbumSleeve } from '../Player/HolographicAlbumSleeve';
import { useChameleonPalette } from '../../hooks/useChameleonPalette';
import { camelotWheelService } from '../../services/camelotWheelService';

export type LyricsFontType = 'modern' | 'serif' | 'mono' | 'cursive' | 'display';

interface LyricsPanelProps {
  lyrics: (LyricsLine | LyricLine | EnhancedLyricLine)[];
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
  onToggleZenMode?: () => void;
  onSeek?: (time: number) => void;
  onClose?: () => void;
  onUploadLRC?: (file: File) => void;
  /** Optional: album cover URL for dynamic Kawarp accent color extraction */
  coverUrl?: string;
  /** Optional: override accent color (hex) instead of extracting from cover */
  accentColor?: string;
  /** Optional: override secondary accent color (hex) */
  secondaryAccentColor?: string;
  /** Optional: play/pause control for fullscreen pill */
  onPlayPause?: () => void;
  /** Optional: skip back for fullscreen pill */
  onSkipBack?: () => void;
  /** Optional: skip forward for fullscreen pill */
  onSkipForward?: () => void;
  /** Whether lyrics are currently loading from API */
  isLoading?: boolean;
}

const FONT_OPTIONS: { id: LyricsFontType; label: string; shortLabel: string; fontFamily: string }[] = [
  { id: 'modern', label: 'Inter Modern', shortLabel: 'Inter', fontFamily: "'Inter', sans-serif" },
  { id: 'serif', label: 'Playfair Serif', shortLabel: 'Serif', fontFamily: "'Playfair Display', Georgia, serif" },
  { id: 'mono', label: 'JetBrains Mono', shortLabel: 'Mono', fontFamily: "'JetBrains Mono', monospace" },
  { id: 'cursive', label: 'Caveat Cursive', shortLabel: 'Cursiva', fontFamily: "'Caveat', cursive" },
  { id: 'display', label: 'Orbitron Display', shortLabel: 'Orbitron', fontFamily: "'Orbitron', sans-serif" },
];

const formatTimestamp = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/** Desplazamiento suave con caída exponencial; cancela el anterior si llega otra línea. */
const scrollTweens = new WeakMap<HTMLElement, number>();
function smoothScrollTo(el: HTMLElement, top: number, ms = 700): void {
  const prev = scrollTweens.get(el);
  if (prev) cancelAnimationFrame(prev);
  const from = el.scrollTop;
  const dist = top - from;
  if (Math.abs(dist) < 1) return;
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.scrollTop = from + dist * eased;
    if (p < 1) scrollTweens.set(el, requestAnimationFrame(step));
    else scrollTweens.delete(el);
  };
  scrollTweens.set(el, requestAnimationFrame(step));
}

/** scrollTop necesario para centrar `target` dentro de `container` */
function centeredScrollTop(container: HTMLElement, target: HTMLElement): number {
  const cr = container.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  return tr.top - cr.top + container.scrollTop - container.clientHeight / 2 + tr.height / 2;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  title = 'Sin título',
  artist = 'Artista desconocido',
  position = 'dock-right',
  isFullscreen = false,
  onPositionChange,
  onDragStart,
  onToggleFullscreen,
  onToggleZenMode,
  onSeek,
  onClose,
  onUploadLRC,
  coverUrl,
  accentColor: accentColorProp,
  secondaryAccentColor: secondaryAccentColorProp,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme colors and settings from playerStore
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const autoMode = usePlayerStore((s) => s.autoMode);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor);
  const dominantColors = usePlayerStore((s) => s.dominantColors);

  const lenisSettings = usePlayerStore((s) => s.lenisSettings);
  const lyricsHideDelay = usePlayerStore((s) => s.lyricsHideDelay);
  const lyricsAutoScroll = usePlayerStore((s) => s.lyricsAutoScroll);
  const romanizationMode = usePlayerStore((s) => s.romanizationMode);
  const lyricsOffset = usePlayerStore((s) => s.lyricsOffset);
  const adjustLyricsOffset = usePlayerStore((s) => s.adjustLyricsOffset);
  const setLyricsOffset = usePlayerStore((s) => s.setLyricsOffset);
  const vocalMode = usePlayerStore((s) => s.vocalMode);
  const toggleVocalMode = usePlayerStore((s) => s.toggleVocalMode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setVideoTheaterOpen = usePlayerStore((s) => s.setVideoTheaterOpen);
  const palette = useChameleonPalette();
  const harmonics = useMemo(() => camelotWheelService.getTrackHarmonics(currentTrack), [currentTrack]);
  const isVideoTrack = Boolean(
    currentTrack &&
      (currentTrack.sourceType === 'youtube' ||
        Boolean(currentTrack.youtubeId) ||
        currentTrack.id?.startsWith('yt_'))
  );
  const duration = usePlayerStore((s) => s.duration);
  const playerCurrentTime = usePlayerStore((s) => s.currentTime);

  const activeColor =
    accentColorProp ||
    (isLucid
      ? lucidTheme?.primary || '#00f0ff'
      : autoMode
      ? dominantColors?.primary || dynamicColor || '#00f0ff'
      : '#00f0ff');
  const secondaryColor =
    secondaryAccentColorProp ||
    (isLucid
      ? lucidTheme?.secondary || '#8c38ff'
      : autoMode
      ? dominantColors?.secondary || '#8c38ff'
      : '#8c38ff');

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const isSeekingRef = useRef(false);
  const lenisRef = useRef<Lenis | null>(null);

  // ── Fullscreen UI auto-hide (configurable delay + cursor hide) ───────────
  const [isUiVisible, setIsUiVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isFullscreen) {
      setIsUiVisible(true);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
      return;
    }
    const showUi = () => {
      setIsUiVisible(true);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setIsUiVisible(false);
        if (typeof document !== 'undefined') document.body.style.cursor = 'none';
      }, lyricsHideDelay || 3000);
    };
    window.addEventListener('mousemove', showUi);
    showUi();
    return () => {
      window.removeEventListener('mousemove', showUi);
      clearTimeout(hideTimeoutRef.current);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
    };
  }, [isFullscreen, lyricsHideDelay]);

  // ── Word-by-word sync ──────────────────────────────────────────────────────
  const enhancedLines = lyrics as unknown as EnhancedLyricLine[];
  // Sincronía a 60 fps sin re-renderizar por fotograma: solo cambian los índices de línea y
  // palabra; el progreso continuo va por variables CSS (--line-progress / --word-progress).
  const { activeLineIndex, activeWordIndex } = useLyricSync(enhancedLines, [fullscreenContainerRef, contentRef]);

  const activeIndex = activeLineIndex >= 0 ? activeLineIndex : 0;

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

  // ── Lenis Smooth Scrolling Engine ─────────────────────────────────────────
  useEffect(() => {
    if (isFullscreen || !lenisSettings?.enabled || !containerRef.current) return;
    const scrollContent = contentRef.current || containerRef.current;
    const lenis = new Lenis({
      wrapper: containerRef.current,
      content: scrollContent,
      duration: lenisSettings.duration || 1.0,
      smoothWheel: lenisSettings.smoothWheel ?? true,
      wheelMultiplier: lenisSettings.wheelMultiplier || 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Initial resize to ensure limit is computed accurately
    lenis.resize();
    const resizeTimer = setTimeout(() => {
      lenis.resize();
    }, 80);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && scrollContent) {
      ro = new ResizeObserver(() => {
        lenis.resize();
      });
      ro.observe(scrollContent);
    }

    return () => {
      clearTimeout(resizeTimer);
      if (ro) ro.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [lenisSettings?.enabled, lenisSettings?.duration, lenisSettings?.smoothWheel, lenisSettings?.wheelMultiplier, lyrics.length, isFullscreen]);

  // Fluid Auto-scroll to center active line (Lenis or smooth native fallback)
  useEffect(() => {
    if (!lyricsAutoScroll || isSeekingRef.current) return;
    if (containerRef.current && lyrics.length > 0) {
      const targetIdx = activeIndex >= 0 ? activeIndex : 0;
      const targetEl =
        (contentRef.current?.querySelector(`[data-line-index="${targetIdx}"]`) as HTMLElement) ||
        (containerRef.current.querySelector(`[data-line-index="${targetIdx}"]`) as HTMLElement) ||
        (contentRef.current?.children[activeLineIndex < 0 ? 0 : targetIdx] as HTMLElement) ||
        (containerRef.current.children[targetIdx] as HTMLElement);

      if (targetEl) {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetEl, {
            offset: -containerRef.current.clientHeight / 2 + targetEl.clientHeight / 2,
            duration: lenisSettings?.duration || 0.8,
            immediate: false,
          });
        } else {
          smoothScrollTo(containerRef.current, centeredScrollTop(containerRef.current, targetEl), 700);
        }
      }
    }
  }, [activeIndex, activeLineIndex, lyricsAutoScroll, lyrics.length, lenisSettings?.duration]);

  // Fluid Auto-scroll for Fullscreen Cinema Mode
  useEffect(() => {
    if (!lyricsAutoScroll || isSeekingRef.current) return;
    if (isFullscreen && fullscreenContainerRef.current && activeIndex >= 0) {
      const activeEl = fullscreenContainerRef.current.querySelector<HTMLElement>(`[data-fullscreen-line="${activeIndex}"]`);
      if (activeEl) {
        smoothScrollTo(fullscreenContainerRef.current, centeredScrollTop(fullscreenContainerRef.current, activeEl), 800);
      }
    }
  }, [activeIndex, lyricsAutoScroll, isFullscreen]);

  const handleLineSeek = (time: number) => {
    isSeekingRef.current = true;
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 500);
    if (onSeek) onSeek(time);
  };

  // ── Romanization & Furigana Cache ────────────────────────────────────────
  const [romanizedMap, setRomanizedMap] = useState<Record<number, RomanizeResult>>({});

  useEffect(() => {
    if (romanizationMode === 'off' || !lyrics.length) return;
    let cancelled = false;

    const start = Math.max(0, activeIndex - 4);
    const end = Math.min(lyrics.length, activeIndex + 8);

    for (let i = start; i < end; i++) {
      const line = lyrics[i];
      if (!line?.text || romanizedMap[i]) continue;

      romanizeLine(line.text, romanizationMode, 'ja').then((res) => {
        if (!cancelled && res) {
          setRomanizedMap((prev) => ({ ...prev, [i]: res }));
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [activeIndex, romanizationMode, lyrics]);




  // ── Exact Blur Falloff style calculation per specification ──────────────
  const getLineStyle = useCallback(
    (distance: number, isActive: boolean, isIntro: boolean) => {
      // Si la canción está en intro instrumental antes de empezar las letras
      if (isIntro) {
        return {
          opacity: 0.75,
          blur: 0,
          scale: 1.0,
          translateY: 0,
          fontWeight: 600,
          color: '#FFFFFF',
          textShadow: 'none',
        };
      }
      // Línea activa
      if (isActive || distance === 0) {
        return {
          opacity: 1.0,
          blur: 0,
          scale: 1.03,
          translateY: -2,
          fontWeight: 600,
          color: '#FFFFFF',
          textShadow: `0 0 24px ${activeColor}, 0 0 48px ${activeColor}40`,
        };
      }
      // Líneas adyacentes (1-2)
      if (distance <= 2) {
        const factor = 1 - distance * 0.15;
        return {
          opacity: Math.max(0.55, 0.7 * factor),
          blur: 0.8 * distance,
          scale: 1.0 - distance * 0.01,
          translateY: 0,
          fontWeight: 600,
          color: '#FFFFFF',
          textShadow: 'none',
        };
      }
      // Líneas lejanas (> 2)
      return {
        opacity: 0.45,
        blur: 1.2,
        scale: 0.99,
        translateY: 0,
        fontWeight: 600,
        color: '#FFFFFF',
        textShadow: 'none',
      };
    },
    [activeColor]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadLRC) {
      onUploadLRC(file);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. APPLE MUSIC FULLSCREEN LIVE LYRICS (iOS / visionOS)
  // ──────────────────────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-hidden select-none"
        style={{
          fontFamily: currentFontFamily,
        }}
      >
        {/* Top Floating visionOS Navigation Bar — auto-hides after delay */}
        <div
          className="w-full max-w-7xl mx-auto flex items-center justify-between z-30 pt-1 pb-3 px-2 sm:px-4 transition-all duration-300"
          style={{ opacity: isUiVisible ? 1 : 0, pointerEvents: isUiVisible ? 'auto' : 'none' }}
        >
          {/* Left: Track Information Glass Capsule */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border transition-all overflow-hidden"
              style={{
                backgroundColor: `${activeColor}20`,
                borderColor: `${activeColor}40`,
                boxShadow: `0 8px 24px ${activeColor}30`,
              }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <Mic className="w-5 h-5" style={{ color: activeColor }} />
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeColor }} />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate max-w-[180px] sm:max-w-xs md:max-w-md drop-shadow">
                  {title}
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border flex items-center gap-1 flex-shrink-0 backdrop-blur-md"
                  style={{
                    backgroundColor: `${activeColor}15`,
                    borderColor: `${activeColor}35`,
                    color: activeColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeColor }} />
                  {isPlaying ? 'En vivo' : 'Pausado'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/60 truncate font-medium">
                  {artist}
                </p>
                <span className="text-white/20 text-xs hidden sm:inline">•</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300/80">
                  <Sparkles className="w-2.5 h-2.5" />
                  {harmonics.camelotKey} • {Math.round(harmonics.bpm)} BPM
                </span>
              </div>
            </div>
          </div>

          {/* Right: visionOS Frosted Control Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Font switcher pills */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-inner">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFontChange(f.id)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    selectedFont === f.id
                      ? 'bg-white/20 text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/20'
                      : 'text-white/50 hover:text-white'
                  }`}
                  style={{ fontFamily: f.fontFamily }}
                >
                  {f.shortLabel}
                </button>
              ))}
            </div>

            {/* Font Size Stepper */}
            <div className="hidden sm:flex items-center rounded-full bg-white/[0.06] backdrop-blur-2xl p-0.5 border border-white/10">
              <button
                onClick={() => handleFontSizeChange(-1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors"
                title="Disminuir texto"
              >
                A-
              </button>
              <span className="px-2 font-mono text-[11px] text-cyan-300 font-bold">
                {fontSizeOffset === 0 ? 'Base' : `${fontSizeOffset > 0 ? '+' : ''}${fontSizeOffset}`}
              </span>
              <button
                onClick={() => handleFontSizeChange(1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors"
                title="Aumentar texto"
              >
                A+
              </button>
            </div>

            {/* Apple Music Sing Karaoke Mode Quick Pill (Fullscreen) */}
            <button
              type="button"
              onClick={toggleVocalMode}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-xs font-mono select-none active:scale-95 border backdrop-blur-2xl ${
                vocalMode === 'karaoke'
                  ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,229,255,0.5)]'
                  : vocalMode === 'acappella'
                  ? 'bg-purple-500/30 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  : 'bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white border-white/15'
              }`}
              title="Modo Karaoke / Pista Instrumental (Atenuar voz)"
            >
              {vocalMode === 'karaoke' ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-cyan-300 animate-bounce" style={{ animationDuration: '1s' }} />
                  <span className="font-sans font-medium text-white hidden sm:inline">Sing: Karaoke</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </>
              ) : vocalMode === 'acappella' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                  <span className="font-sans font-medium text-white hidden sm:inline">Solo Voz</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-white/60" />
                  <span className="font-sans font-medium hidden sm:inline">Karaoke</span>
                </>
              )}
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/80 hover:text-white flex items-center justify-center border border-white/15 border-t-white/30 backdrop-blur-2xl transition-all shadow-lg active:scale-95"
              title="Ajustes de Letras"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Exit Fullscreen Button */}
            <button
              onClick={onToggleFullscreen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/80 hover:text-white flex items-center justify-center border border-white/15 border-t-white/30 backdrop-blur-2xl transition-all shadow-lg active:scale-95"
              title="Salir de pantalla completa"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Fullscreen Stage: Split View on md+, centered fluid stack on mobile */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-14 min-h-0 overflow-hidden z-20 my-auto">
          {/* Left Column: Holographic 3D Album Sleeve & Audio Stage Card (md+) */}
          <div className="hidden md:flex flex-col items-center justify-center w-[300px] lg:w-[380px] xl:w-[440px] flex-shrink-0 select-none">
            <HolographicAlbumSleeve
              coverUrl={coverUrl || currentTrack?.coverUrl}
              title={title}
              artist={artist}
              isPlaying={isPlaying}
              accentColor={activeColor}
              palette={palette}
              isVideoTrack={isVideoTrack}
              onShowVideo={() => setVideoTheaterOpen(true)}
              size="large"
            />

            {/* Ambient floor glow / reflection */}
            <div
              className="w-52 h-4 rounded-full blur-2xl opacity-40 mx-auto -mt-2 mb-2 pointer-events-none"
              style={{ background: activeColor }}
            />

            {/* Track Info & Pro Harmonics Stage Pill */}
            <div className="w-full mt-3 text-left px-2">
              <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight truncate drop-shadow-md">
                {title}
              </h3>
              <p className="text-sm lg:text-base text-white/60 font-medium truncate mt-0.5">
                {artist}
              </p>
              {currentTrack?.album && (
                <p className="text-xs text-white/40 truncate mt-0.5 font-mono">
                  {currentTrack.album}
                </p>
              )}

              {/* Dynamic Badges: Camelot Key + Live Equalizer Spectrum Bars + Hi-Res */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border backdrop-blur-xl shadow-sm"
                  style={{
                    backgroundColor: `${activeColor}18`,
                    borderColor: `${activeColor}40`,
                    color: activeColor,
                    boxShadow: `0 0 16px ${activeColor}25`,
                  }}
                  title="Clave Armónica Camelot & BPM"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>{harmonics.camelotKey} • {Math.round(harmonics.bpm)} BPM</span>
                </div>

                {/* Live Audio Equalizer Spectrum Bars */}
                <div
                  className="flex items-end gap-1 h-5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md"
                  title="Espectro en Tiempo Real"
                >
                  {[0.55, 0.95, 0.4, 1.0, 0.65].map((h, bi) => (
                    <div
                      key={bi}
                      className={`w-1 rounded-full transition-all duration-150 ${isPlaying ? 'animate-pulse' : ''}`}
                      style={{
                        height: isPlaying ? `${Math.max(25, h * 100)}%` : '25%',
                        backgroundColor: activeColor,
                        boxShadow: `0 0 6px ${activeColor}`,
                        animationDelay: `${bi * 0.12}s`,
                      }}
                    />
                  ))}
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-white/40 border border-white/10 backdrop-blur-md">
                  Spatial Hi-Res
                </span>
              </div>

              {/* Video Theater Trigger if track has video */}
              {isVideoTrack && (
                <button
                  onClick={() => setVideoTheaterOpen(true)}
                  className="mt-3 w-full py-2 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] text-white text-xs font-medium border border-white/15 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md backdrop-blur-xl"
                >
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span>Ver Video Musical</span>
                </button>
              )}
            </div>
          </div>

          {/* Compact Top Header for Mobile/Small Screens (< md) */}
          <div className="md:hidden w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-10 h-10 rounded-xl object-cover shadow-md border border-white/15"
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{title}</span>
                <span className="text-[10px] text-white/50 truncate">{artist}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border"
                style={{
                  backgroundColor: `${activeColor}15`,
                  borderColor: `${activeColor}30`,
                  color: activeColor,
                }}
              >
                {harmonics.camelotKey} • {Math.round(harmonics.bpm)} BPM
              </span>
            </div>
          </div>

          {/* Right Column: Immersive Apple Music Lyrics Scroller */}
          <div
            ref={fullscreenContainerRef}
            role="list"
            aria-label="Letras en pantalla completa"
            className="flex-1 w-full h-full overflow-y-auto py-24 sm:py-28 px-3 sm:px-8 space-y-7 select-none custom-scrollbar text-center md:text-left"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%)',
            }}
          >
            {lyrics.length === 0 ? (
              isLoading ? (
                <div className="w-full max-w-lg mx-auto py-12">
                  <PlaceholderLines count={6} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-white/50 py-20">
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center border shadow-xl"
                    style={{
                      backgroundColor: `${activeColor}15`,
                      borderColor: `${activeColor}35`,
                      boxShadow: `0 12px 35px ${activeColor}25`,
                    }}
                  >
                    <Disc3 className="w-8 h-8 animate-spin text-cyan-400" style={{ animationDuration: '8s' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">
                      Sin letras sincronizadas disponibles
                    </p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                      Puedes cargar un archivo .LRC sincronizado o buscarlo automáticamente.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all flex items-center gap-2 border border-white/20 shadow-lg active:scale-95 backdrop-blur-xl"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Cargar archivo .LRC</span>
                  </button>
                </div>
              )
            ) : (
              <>
                {/* Intro instrumental badge before first verse */}
                {activeLineIndex < 0 && (
                  <div className="flex items-center justify-center md:justify-start gap-2.5 py-6 font-mono text-sm">
                    <div
                      className="px-4 py-2 rounded-2xl flex items-center gap-2 border backdrop-blur-xl animate-pulse"
                      style={{
                        backgroundColor: `${activeColor}15`,
                        borderColor: `${activeColor}35`,
                        color: activeColor,
                      }}
                    >
                      <Activity className="w-4 h-4" />
                      <span>♪ Introducción Instrumental ♪</span>
                    </div>
                  </div>
                )}

                {lyrics.map((line, index) => {
                  const isActive = index === activeIndex && activeLineIndex >= 0;
                  const isHovered = hoveredLineIndex === index;
                  const distance = activeLineIndex >= 0 ? Math.abs(index - activeIndex) : Math.abs(index);
                  const eLine = enhancedLines[index];
                  const hasWords = eLine?.words && eLine.words.length > 0;

                  return (
                    <div
                      key={index}
                      data-fullscreen-line={index}
                      role="listitem"
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => handleLineSeek(line.time)}
                      onMouseEnter={() => setHoveredLineIndex(index)}
                      onMouseLeave={() => setHoveredLineIndex(null)}
                      className={`group relative cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] py-4 px-5 sm:px-6 rounded-3xl ${
                        isActive
                          ? 'scale-[1.03] -translate-y-1 bg-white/[0.08] backdrop-blur-2xl border border-white/15'
                          : isHovered
                          ? 'scale-[1.015] bg-white/[0.04]'
                          : ''
                      }`}
                      style={{
                        opacity: isActive ? 1 : isHovered ? 0.95 : Math.max(0.18, 0.72 - distance * 0.15),
                        filter: isActive || isHovered ? 'none' : `blur(${Math.min(4.5, distance * 1.15)}px)`,
                        transformOrigin: 'left center',
                        boxShadow: isActive ? `0 20px 50px rgba(0,0,0,0.5), 0 0 40px ${activeColor}30` : undefined,
                      }}
                    >
                      {/* Timestamp seek badge on hover */}
                      {isHovered && !isActive && (
                        <div className="absolute -top-2 right-4 md:right-auto md:-left-2 md:-top-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-xl text-[11px] font-mono text-cyan-300 border border-white/20 shadow-xl animate-fadeIn z-10 pointer-events-none">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatTimestamp(line.time)}</span>
                        </div>
                      )}

                      {isActive && hasWords ? (
                        // Word-by-word karaoke in Cinema Mode with Liquid Sing-Along Wipe
                        <div className="flex flex-wrap items-baseline justify-center md:justify-start gap-x-3 gap-y-2">
                          {eLine.words!.map((word, wi) => {
                            const isPast = wi < activeWordIndex;
                            const isCurrent = wi === activeWordIndex;
                            const isNext = wi === activeWordIndex + 1;
                            return (
                              <span
                                key={wi}
                                className={`relative inline-block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold transition-all duration-150 transform ${
                                  isCurrent ? 'scale-[1.05] -translate-y-1' : ''
                                }`}
                                style={{
                                  color: isPast || isCurrent ? '#ffffff' : isNext ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.32)',
                                  textShadow: isCurrent
                                    ? `0 0 35px ${activeColor}, 0 0 70px ${secondaryColor}90`
                                    : isPast
                                    ? '0 0 18px rgba(255,255,255,0.35)'
                                    : 'none',
                                }}
                              >
                                {word.text}
                                {isCurrent && (
                                  <>
                                    {/* Luminous dynamic glow beam under active singing word */}
                                    <span
                                      className="absolute -bottom-1 left-0 h-[4px] rounded-full transition-all duration-75"
                                      style={{
                                        width: 'calc(var(--word-progress, 0) * 100%)',
                                        background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                                        boxShadow: `0 0 14px ${activeColor}, 0 0 28px ${secondaryColor}`,
                                      }}
                                    />
                                    {/* Sub-word micro glow particle */}
                                    <span
                                      className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#fff] -translate-y-1/2 pointer-events-none transition-all duration-75"
                                      style={{
                                        left: 'calc(var(--word-progress, 0) * 100%)',
                                        opacity: 'var(--word-progress, 0)',
                                      }}
                                    />
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        // Line-level verse in Cinema Mode
                        <h2
                          className={`text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight transition-all duration-300 ${
                            isActive ? '' : 'text-white/60 group-hover:text-white'
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundImage: `linear-gradient(105deg, #ffffff 0%, #ffffff 30%, color-mix(in srgb, ${activeColor} 65%, white) 65%, color-mix(in srgb, ${secondaryColor} 55%, white) 100%)`,
                                  WebkitBackgroundClip: 'text',
                                  backgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  color: 'transparent',
                                  filter: `drop-shadow(0 0 26px ${activeColor}99) drop-shadow(0 0 50px ${secondaryColor}55)`,
                                }
                              : undefined
                          }
                        >
                          {romanizationMode === 'furigana' && romanizedMap[index]?.furigana ? (
                            <ruby>
                              {romanizedMap[index].furigana!.map((seg, si) => (
                                <React.Fragment key={si}>
                                  {seg.kanji}
                                  <rt className="text-xs sm:text-sm text-cyan-300/80 font-normal select-none mx-0.5">{seg.reading}</rt>
                                </React.Fragment>
                              ))}
                            </ruby>
                          ) : (
                            line.text
                          )}
                        </h2>
                      )}

                      {/* Romaji Subtitle if active */}
                      {isActive && romanizationMode === 'romaji' && romanizedMap[index]?.romanized && (
                        <p className="text-center md:text-left text-sm sm:text-lg text-cyan-300/85 font-mono tracking-normal mt-2">
                          {romanizedMap[index].romanized}
                        </p>
                      )}

                      {/* Active line progress bar in Cinema mode */}
                      {isActive && (
                        <div className="w-48 sm:w-72 mx-auto md:mx-0 h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner mt-4">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: 'calc(var(--line-progress, 0) * 100%)',
                              background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                              boxShadow: `0 0 14px ${activeColor}`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Bottom visionOS Specs & Status Bar */}
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between text-white/60 font-mono text-xs border-t border-white/10 pt-4 z-20 px-2 sm:px-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
              style={{ backgroundColor: activeColor }}
            />
            <span className="text-white/80 font-medium">
              {isPlaying ? 'Sincronizado' : 'En pausa'}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/50">{lyrics.length} versos</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white transition-colors border border-white/10 text-[11px] backdrop-blur-md"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar .LRC</span>
            </button>
          </div>
        </div>

        {/* Floating Fullscreen Control Pill — auto-hides with UI */}
        <FullscreenControls
          isPlaying={isPlaying}
          isUiVisible={isUiVisible}
          activeColor={activeColor}
          secondaryColor={secondaryColor}
          onPlayPause={onPlayPause}
          onSkipBack={onSkipBack}
          onSkipForward={onSkipForward}
          onToggleFullscreen={onToggleFullscreen}
          currentTime={currentTime || playerCurrentTime}
          duration={duration}
          onSeek={onSeek}
          vocalMode={vocalMode}
          onToggleVocalMode={toggleVocalMode}
          lyricsOffset={lyricsOffset}
          onAdjustOffset={adjustLyricsOffset}
          title={title}
          artist={artist}
        />

        {/* Settings Modal */}
        <LyricsSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          selectedFont={selectedFont}
          onFontChange={handleFontChange}
          fontSizeOffset={fontSizeOffset}
          onFontSizeChange={handleFontSizeChange}
          accentColor={activeColor}
        />
      </motion.div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. VISIONOS LIQUID GLASS FLOATING LYRICS PANEL (Standard Mode)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className="w-full h-full rounded-[30px] sm:rounded-[36px] bg-black/30 backdrop-blur-[64px] saturate-[200%] border border-white/15 border-t-white/30 flex flex-col relative transition-all duration-300 overflow-hidden pointer-events-auto shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)]"
        style={{
          boxShadow: '0 28px 80px rgba(0,0,0,0.85), inset 0 1.5px 2px rgba(255,255,255,0.22)',
          fontFamily: currentFontFamily,
        }}
      >
        {/* Specular Liquid Edge Ambient Highlights */}
        <div className="absolute inset-0 pointer-events-none rounded-[30px] sm:rounded-[36px] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.22)]" />
        <div
          className="absolute top-0 inset-x-12 h-px pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${activeColor}80, transparent)`,
          }}
        />

        {/* Ambient Back Glow Behind Panel */}
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-1000"
          style={{ backgroundColor: activeColor }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-1000"
          style={{ backgroundColor: secondaryColor }}
        />

        {/* ── Window Chrome & Apple Drag Grabber ── */}
        <header className="relative z-20 px-4 sm:px-5 pt-2 pb-2.5 flex flex-col gap-1.5 bg-black/25 backdrop-blur-md border-b border-white/[0.07]">
          {/* Centered iOS Grabber Pill */}
          <div
            className="w-full flex items-center justify-center py-1 cursor-grab active:cursor-grabbing group"
            onMouseDown={onDragStart}
            title="Arrastrar panel por la pantalla"
          >
            <div className="w-10 h-1 rounded-full bg-white/30 group-hover:bg-white/60 transition-colors" />
          </div>

          {/* Main Top Header Bar (Apple Music Navigation Bar) */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Track Information */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 border shadow-sm"
                style={{
                  backgroundColor: `${activeColor}20`,
                  borderColor: `${activeColor}40`,
                  color: activeColor,
                }}
              >
                <Disc3 className="w-4 h-4 animate-spin-slow" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-[13px] font-semibold text-white tracking-tight truncate">
                    {title}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                    style={{ backgroundColor: activeColor }}
                    title="Sincronización activa"
                  />
                </div>
                <span className="text-[10.5px] sm:text-[11px] text-white/50 font-medium truncate">
                  {artist}
                </span>
              </div>
            </div>

            {/* Right: Consolidated iOS Action Buttons */}
            <div
              className="flex items-center gap-1.5 flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Apple Music Sing Karaoke Trigger (Docked) */}
              <button
                type="button"
                onClick={toggleVocalMode}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                  vocalMode === 'karaoke'
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                    : vocalMode === 'acappella'
                    ? 'bg-purple-500/30 text-purple-200 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white border-white/15 border-t-white/25'
                }`}
                title={
                  vocalMode === 'karaoke'
                    ? 'Modo Karaoke Activo (Voz suprimida) — Clic para cambiar'
                    : vocalMode === 'acappella'
                    ? 'Modo Solo Voz (Acappella) — Clic para desactivar'
                    : 'Activar Modo Karaoke (Atenuar voz para cantar)'
                }
              >
                {vocalMode === 'karaoke' ? (
                  <Mic className="w-3.5 h-3.5 text-cyan-300" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>

              {/* Settings / Typography Drawer Button */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                  isSettingsOpen
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white border-white/15 border-t-white/25'
                }`}
                title="Ajustes de tipografía, tamaño y posición"
              >
                <Type className="w-3.5 h-3.5" />
              </button>

              {/* Settings Modal Button */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/15 border-t-white/25 transition-all active:scale-95 shadow-sm"
                title="Ajustes de Letras (Kawarp, Lenis, Romanización)"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Apple Music Karaoke Trigger */}
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/15 border-t-white/25 transition-all active:scale-95 shadow-sm"
                  title="Pantalla Completa estilo Apple Music"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Minimize to Zen Mode */}
              {onToggleZenMode && (
                <button
                  onClick={onToggleZenMode}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/15 border-t-white/25 transition-all active:scale-95 shadow-sm"
                  title="Colapsar a Micro-Píldora Zen"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close Button (Apple iOS Frosted Circle) */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.12] hover:bg-white/[0.22] text-white/90 hover:text-white flex items-center justify-center border border-white/20 border-t-white/35 transition-all active:scale-95 shadow-sm"
                  title="Cerrar letras"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Karaoke Vocal Mode Indicator Bar */}
          {vocalMode === 'karaoke' && (
            <div className="w-full px-3 py-1 bg-cyan-500/10 border-t border-cyan-500/20 rounded-lg flex items-center justify-between text-[10.5px] font-mono text-cyan-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Mic className="w-3 h-3 text-cyan-400" />
                <span>Modo Karaoke Activo • Voz Atenuada</span>
              </span>
              <button
                type="button"
                onClick={toggleVocalMode}
                className="text-[10px] text-cyan-400/80 hover:text-white underline cursor-pointer"
              >
                Normal
              </button>
            </div>
          )}
          {vocalMode === 'acappella' && (
            <div className="w-full px-3 py-1 bg-purple-500/10 border-t border-purple-500/20 rounded-lg flex items-center justify-between text-[10.5px] font-mono text-purple-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Volume2 className="w-3 h-3 text-purple-400" />
                <span>Modo Acapella • Solo Voz Aislada</span>
              </span>
              <button
                type="button"
                onClick={toggleVocalMode}
                className="text-[10px] text-purple-400/80 hover:text-white underline cursor-pointer"
              >
                Normal
              </button>
            </div>
          )}

          {/* ── Collapsible Settings & Typography Drawer (iOS Inset Style) ── */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden pt-1.5 pb-0.5 border-t border-white/[0.08] space-y-2.5"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Section 1: Font Family Selector */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                    Tipografía
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {FONT_OPTIONS.map((f) => {
                      const isActive = selectedFont === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => handleFontChange(f.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium tracking-tight flex-shrink-0 transition-all ${
                            isActive
                              ? 'bg-white/20 text-white font-bold border border-white/25 shadow-sm'
                              : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10 border border-white/[0.06]'
                          }`}
                          style={{ fontFamily: f.fontFamily }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Font Sizing & Window Position Presets */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
                  {/* Font Size Stepper */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      Tamaño
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center rounded-full bg-white/[0.06] p-0.5 border border-white/10">
                        <button
                          onClick={() => handleFontSizeChange(-1)}
                          className="w-7 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors"
                          title="Disminuir tamaño"
                        >
                          A-
                        </button>
                        <span className="px-2 font-mono text-[11px] text-cyan-300 font-bold">
                          {fontSizeOffset === 0 ? 'Base' : `${fontSizeOffset > 0 ? '+' : ''}${fontSizeOffset}`}
                        </span>
                        <button
                          onClick={() => handleFontSizeChange(1)}
                          className="w-7 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white font-mono text-xs font-bold hover:bg-white/10 transition-colors"
                          title="Aumentar tamaño"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Position Presets */}
                  {onPositionChange && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                        Posición
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPositionChange('dock-right')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
                            position === 'dock-right'
                              ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]'
                          }`}
                          title="Dock Derecha"
                        >
                          <PanelRight className="w-3 h-3" />
                          <span>Der</span>
                        </button>
                        <button
                          onClick={() => onPositionChange('dock-left')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
                            position === 'dock-left'
                              ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]'
                          }`}
                          title="Dock Izquierda"
                        >
                          <PanelLeft className="w-3 h-3" />
                          <span>Izq</span>
                        </button>
                        <button
                          onClick={() => onPositionChange('center')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 ${
                            position === 'center'
                              ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]'
                          }`}
                          title="Centro"
                        >
                          <AlignLeft className="w-3 h-3" />
                          <span>Centro</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Sincronía & Micro-Offset temporal */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider flex items-center gap-1">
                      <Timer className="w-3 h-3 text-cyan-400" />
                      Sincronía (Offset)
                    </span>
                    <button
                      onClick={() => setLyricsOffset(0)}
                      className="font-mono text-[10px] hover:underline transition-colors"
                      style={{ color: lyricsOffset !== 0 ? activeColor : 'rgba(255,255,255,0.4)' }}
                      title="Clic para reiniciar a 0.0s"
                    >
                      {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : lyricsOffset < 0 ? `${lyricsOffset.toFixed(1)}s` : '0.0s'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustLyricsOffset(-0.5)}
                      className="flex-1 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                      title="Retrasar 0.5s"
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => adjustLyricsOffset(-0.1)}
                      className="flex-1 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                      title="Retrasar 0.1s"
                    >
                      -0.1s
                    </button>
                    <button
                      onClick={() => setLyricsOffset(0)}
                      className="px-2 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-cyan-300 font-mono text-[10px] font-bold transition-colors"
                      title="Reset 0.0s"
                    >
                      0.0
                    </button>
                    <button
                      onClick={() => adjustLyricsOffset(0.1)}
                      className="flex-1 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                      title="Adelantar 0.1s"
                    >
                      +0.1s
                    </button>
                    <button
                      onClick={() => adjustLyricsOffset(0.5)}
                      className="flex-1 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white font-mono text-[10px] transition-colors"
                      title="Adelantar 0.5s"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                {/* Section 3: File Upload Option */}
                <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40">Archivo de Letras</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white/80 hover:text-white text-[11px] font-medium border border-white/15 transition-colors shadow-sm"
                  >
                    <Upload className="w-3 h-3 text-cyan-400" />
                    <span>Cargar .LRC</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ── Apple Music Focus & Blur Falloff Scrolling Body ── */}
        <div
          ref={containerRef}
          role="list"
          aria-label="Letras sincronizadas"
          className="flex-1 overflow-y-auto px-5 select-none custom-scrollbar lyrics-mask relative z-10"
        >
          <div ref={contentRef} className="pt-20 pb-32 space-y-4 min-h-full">
            {lyrics.length === 0 ? (
              isLoading ? (
                <div className="py-8">
                  <PlaceholderLines count={8} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/50">
                  <AlignLeft className="w-10 h-10 mb-3 opacity-30 animate-pulse text-cyan-400" />
                  <p className="text-sm font-semibold text-white/80 mb-1">
                    Sin letras sincronizadas disponibles
                  </p>
                  <p className="text-xs text-white/40 max-w-xs mb-4">
                    Reproduce una pista con soporte de sincronización o importa un archivo .LRC.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/15 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    Cargar archivo .LRC
                  </button>
                </div>
              )
            ) : (
              <>
                {/* Intro instrumental banner when before first verse */}
                {activeLineIndex < 0 && (
                  <div className="flex items-center justify-center gap-2 py-4 text-cyan-300/80 font-mono text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>♪ Introducción Instrumental ♪</span>
                  </div>
                )}
                {lyrics.map((line, index) => {
                  const isActive = index === activeIndex && activeLineIndex >= 0;
                  const isIntro = activeLineIndex < 0;
                  const isHovered = hoveredLineIndex === index;
                  const distance = activeLineIndex >= 0 ? Math.abs(index - activeIndex) : Math.min(3, index);
                  const eLine = enhancedLines[index];
                  const hasWords = eLine?.words && eLine.words.length > 0;
                  const lineStyle = getLineStyle(distance, isActive, isIntro);

                  // Responsive font size classes
                  const baseSizeClass =
                    fontSizeOffset === -2
                      ? 'text-xs py-1.5 px-3'
                      : fontSizeOffset === -1
                      ? 'text-xs sm:text-sm py-2 px-3'
                      : fontSizeOffset === 1
                      ? 'text-base sm:text-lg py-3 px-3.5'
                      : fontSizeOffset >= 2
                      ? 'text-lg sm:text-xl py-3.5 px-4'
                      : 'text-sm sm:text-base py-2.5 px-3';

                  return (
                    <div
                      key={index}
                      data-line-index={index}
                      role="listitem"
                      tabIndex={0}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => handleLineSeek(line.time)}
                      onMouseEnter={() => setHoveredLineIndex(index)}
                      onMouseLeave={() => setHoveredLineIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLineSeek(line.time);
                        }
                      }}
                      className={`group relative rounded-2xl cursor-pointer transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${baseSizeClass} ${
                        isHovered && !isActive ? 'bg-white/[0.04]' : ''
                      }`}
                      style={{
                        opacity: isActive ? 1 : isHovered ? 0.95 : lineStyle.opacity,
                        filter: isActive || isHovered ? 'none' : lineStyle.blur > 0 ? `blur(${lineStyle.blur}px)` : 'none',
                        transform: isHovered && !isActive
                          ? `scale(${Math.max(1, lineStyle.scale)}) translateX(4px)`
                          : `scale(${lineStyle.scale}) translateY(${lineStyle.translateY}px)`,
                        transformOrigin: 'left center',
                        willChange: distance <= 2 || isHovered ? 'filter, opacity, transform' : 'auto',
                      }}
                    >
                  {/* Active line: glass background + specular border */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/[0.06] pointer-events-none" />
                  )}

                  {/* Left Neon Accent Beacon */}
                  {isActive && (
                    <div
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                      style={{
                        backgroundColor: activeColor,
                        boxShadow: `0 0 10px ${activeColor}, 0 0 20px ${activeColor}50`,
                      }}
                    />
                  )}

                  {/* Timestamp seek badge on hover (Docked mode) */}
                  {isHovered && !isActive && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-cyan-300 border border-white/15 opacity-90 shadow-sm pointer-events-none animate-fadeIn">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{formatTimestamp(line.time)}</span>
                    </span>
                  )}

                  <div className={`flex flex-col gap-1 ${isActive ? 'pl-2' : ''}`}>
                    {/* Word-by-word or full line text */}
                    <div className="flex items-baseline justify-between gap-3">
                      {isActive && hasWords ? (
                        // ── Word-by-word karaoke render (Docked) with Liquid Glow & Anticipation ──
                        <p
                          className="leading-snug flex-1 text-white tracking-tight"
                          style={{ fontWeight: lineStyle.fontWeight }}
                        >
                          {eLine!.words!.map((word, wi) => {
                            const isPast = wi < activeWordIndex;
                            const isCurrent = wi === activeWordIndex;
                            const isNext = wi === activeWordIndex + 1;
                            return (
                              <span
                                key={wi}
                                className={`relative inline-block mr-[0.25em] transition-all duration-150 transform ${
                                  isCurrent ? 'scale-[1.03] -translate-y-0.5' : ''
                                }`}
                                style={{
                                  color: isPast || isCurrent ? '#ffffff' : isNext ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)',
                                  textShadow: isCurrent
                                    ? `0 0 24px ${activeColor}, 0 0 48px ${secondaryColor}80`
                                    : isPast
                                    ? '0 0 12px rgba(255,255,255,0.3)'
                                    : 'none',
                                }}
                              >
                                {word.text}
                                {/* Fill underline for current word */}
                                {isCurrent && (
                                  <span
                                    className="absolute bottom-0 left-0 h-[2.5px] rounded-full transition-all duration-75"
                                    style={{
                                      width: 'calc(var(--word-progress, 0) * 100%)',
                                      background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                                      boxShadow: `0 0 8px ${activeColor}`,
                                    }}
                                  />
                                )}
                              </span>
                            );
                          })}
                        </p>
                      ) : (
                        // ── Line-level render ──
                        <div className="flex-1">
                          {romanizationMode === 'furigana' && romanizedMap[index]?.furigana ? (
                            <p
                              className={`transition-[color,text-shadow] duration-300 leading-snug ${
                                isActive
                                  ? 'text-white tracking-tight lyrics-active-glow'
                                  : 'text-white group-hover:text-white'
                              }`}
                              style={{
                                fontWeight: lineStyle.fontWeight,
                                textShadow: isActive ? lineStyle.textShadow : 'none',
                                ['--accent-color' as string]: activeColor,
                                ['--accent-color-dim' as string]: `${activeColor}66`,
                              }}
                            >
                              <ruby>
                                {romanizedMap[index].furigana!.map((seg, si) => (
                                  <React.Fragment key={si}>
                                    {seg.kanji}
                                    <rt className="text-[10px] text-cyan-300/80 font-normal select-none mx-0.5">{seg.reading}</rt>
                                  </React.Fragment>
                                ))}
                              </ruby>
                            </p>
                          ) : (
                            <p
                              className={`transition-[color,text-shadow] duration-300 leading-snug ${
                                isActive
                                  ? 'text-white tracking-tight lyrics-active-glow'
                                  : 'text-white group-hover:text-white'
                              }`}
                              style={{
                                fontWeight: lineStyle.fontWeight,
                                textShadow: isActive ? lineStyle.textShadow : 'none',
                                ['--accent-color' as string]: activeColor,
                                ['--accent-color-dim' as string]: `${activeColor}66`,
                              }}
                            >
                              {line.text}
                            </p>
                          )}
                          {romanizationMode === 'romaji' && romanizedMap[index]?.romanized && (
                            <span className="text-[11px] font-mono text-cyan-300/70 tracking-normal block mt-0.5">
                              {romanizedMap[index].romanized}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <span
                        className={`text-[10px] font-mono flex-shrink-0 transition-opacity ${
                          isActive
                            ? 'text-cyan-300 font-semibold'
                            : 'text-white/40 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {formatTimestamp(line.time)}
                      </span>
                    </div>

                    {/* Active line: full-width progress bar (YouTube Music style) */}
                    {isActive && (
                      <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: 'calc(var(--line-progress, 0) * 100%)',
                            background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                            boxShadow: `0 0 8px ${activeColor}`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
          </div>
        </div>

        {/* ── Apple iOS Glass Bottom Status Footer ── */}
        <footer className="relative z-20 px-4 sm:px-5 py-2.5 bg-black/30 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/60 font-medium">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isPlaying ? 'animate-pulse' : 'opacity-40'
              }`}
              style={{
                backgroundColor: isPlaying ? activeColor : '#ffffff',
                boxShadow: isPlaying ? `0 0 6px ${activeColor}` : 'none',
              }}
            />
            <span className="text-white/80 font-medium">
              {isPlaying ? 'Sincronizado' : 'En pausa'}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/50">{lyrics.length} versos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white/70 hover:text-white text-[10.5px] border border-white/10 transition-colors"
            >
              <Upload className="w-3 h-3" />
              <span>.LRC</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <LyricsSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        selectedFont={selectedFont}
        onFontChange={handleFontChange}
        fontSizeOffset={fontSizeOffset}
        onFontSizeChange={handleFontSizeChange}
        accentColor={activeColor}
      />
    </>
  );
};

export default LyricsPanel;
