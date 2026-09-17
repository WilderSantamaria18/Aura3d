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

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LyricsLine } from '../../utils/parseLRC';
import {
  AlignLeft,
  X,
  Maximize2,
  Minimize2,
  Type,
  ChevronDown,
  LayoutTemplate,
  PanelLeft,
  PanelRight,
  Move,
  Upload,
  Mic,
  Music,
  Disc3,
  Sliders,
  Check,
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
  onToggleZenMode?: () => void;
  onSeek?: (time: number) => void;
  onClose?: () => void;
  onUploadLRC?: (file: File) => void;
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
  onToggleZenMode,
  onSeek,
  onClose,
  onUploadLRC,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Theme colors from store
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const activeColor = isLucid ? (lucidTheme?.primary || '#00f0ff') : '#00f0ff';
  const secondaryColor = isLucid ? (lucidTheme?.secondary || '#a855f7') : '#ddb7ff';

  // Consolidated Settings Drawer (unclutters the main lyrics view)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // Fluid Auto-scroll to center active line
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

  // Calculate live syllable / line completion progress (0% - 100%)
  const lineProgress = useMemo(() => {
    if (!lyrics || lyrics.length === 0 || activeIndex < 0) return 0;
    const currentLineTime = lyrics[activeIndex]?.time || 0;
    const nextLineTime = lyrics[activeIndex + 1]?.time || currentLineTime + 4.5;
    const duration = Math.max(0.5, nextLineTime - currentLineTime);
    const elapsed = currentTime - currentLineTime;
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  }, [lyrics, activeIndex, currentTime]);

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
    const activeLineItem = lyrics[activeIndex];
    const prevLineItem = activeIndex > 0 ? lyrics[activeIndex - 1] : null;
    const nextLineItem = lyrics[activeIndex + 1];
    const nextLine2Item = lyrics[activeIndex + 2];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 bg-[#05070e]/95 backdrop-blur-[64px] saturate-[180%] flex flex-col justify-between p-5 sm:p-8 md:p-12 overflow-hidden select-none"
        style={{ fontFamily: currentFontFamily }}
      >
        {/* Background Atmospheric Fluid Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
          <div
            className="absolute -top-40 left-1/4 w-[800px] h-[800px] rounded-full blur-[200px] opacity-30 animate-pulse transition-all duration-1000"
            style={{ backgroundColor: activeColor }}
          />
          <div
            className="absolute -bottom-40 right-1/4 w-[850px] h-[750px] rounded-full blur-[220px] opacity-25 transition-all duration-1000"
            style={{ backgroundColor: secondaryColor }}
          />
          <div className="absolute inset-0 bg-radial-vignette opacity-70" />
        </div>

        {/* Top iOS Header Navigation Bar */}
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between z-30 pt-1 pb-3 px-2">
          {/* Left: Track Information Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/20 transition-all"
              style={{
                backgroundColor: `${activeColor}22`,
                borderColor: `${activeColor}40`,
                boxShadow: `0 8px 24px ${activeColor}33`,
                color: activeColor,
              }}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {title}
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border flex items-center gap-1 flex-shrink-0"
                  style={{
                    backgroundColor: `${activeColor}15`,
                    borderColor: `${activeColor}35`,
                    color: activeColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeColor }} />
                  En vivo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/50 truncate font-medium">
                {artist}
              </p>
            </div>
          </div>

          {/* Right: iOS Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Font switcher pills */}
            <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-inner">
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
            <div className="hidden sm:flex items-center rounded-full bg-white/[0.06] backdrop-blur-xl p-0.5 border border-white/10">
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

            {/* Exit Fullscreen Button (iOS Frosted Circle) */}
            <button
              onClick={onToggleFullscreen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/80 hover:text-white flex items-center justify-center border border-white/15 border-t-white/30 backdrop-blur-xl transition-all shadow-lg active:scale-95"
              title="Salir de pantalla completa"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Center Verses Stage */}
        <div className="max-w-4xl w-full mx-auto text-center flex flex-col items-center justify-center gap-6 sm:gap-8 my-auto z-20 px-4 py-6">
          {/* Timestamp live chip */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.07] backdrop-blur-xl border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-mono text-xs sm:text-sm tracking-wider uppercase font-semibold text-white/90">
              {formatTimestamp(currentTime)}
            </span>
          </div>

          {activeLineItem ? (
            <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-3xl">
              {/* Previous line preview (blurred & soft) */}
              {prevLineItem && (
                <p
                  onClick={() => onSeek && onSeek(prevLineItem.time)}
                  className="text-lg sm:text-2xl text-white/30 hover:text-white/60 font-medium tracking-tight px-4 transition-all duration-300 cursor-pointer blur-[1.2px] hover:blur-none line-clamp-1"
                >
                  {prevLineItem.text}
                </p>
              )}

              {/* Main Active Verse */}
              <h1
                className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight px-4 transition-all duration-300 select-text"
                style={{
                  textShadow: `0 0 40px ${activeColor}, 0 0 80px ${secondaryColor}60, 0 4px 14px rgba(0,0,0,0.9)`,
                }}
              >
                {activeLineItem.text}
              </h1>

              {/* Syllable Fill Progress Bar */}
              <div className="w-64 sm:w-80 md:w-96 h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden shadow-inner my-1">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${lineProgress}%`,
                    background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                    boxShadow: `0 0 16px ${activeColor}`,
                  }}
                />
              </div>

              {/* Next line preview */}
              {nextLineItem && (
                <p
                  onClick={() => onSeek && onSeek(nextLineItem.time)}
                  className="text-xl sm:text-3xl text-white/55 hover:text-white/80 font-medium tracking-tight px-4 transition-all duration-300 cursor-pointer blur-[0.8px] hover:blur-none line-clamp-1"
                >
                  {nextLineItem.text}
                </p>
              )}

              {/* Second next line */}
              {nextLine2Item && (
                <p
                  onClick={() => onSeek && onSeek(nextLine2Item.time)}
                  className="hidden sm:block text-sm sm:text-lg text-white/25 hover:text-white/50 font-medium tracking-tight px-4 transition-all duration-300 cursor-pointer blur-[1.5px] hover:blur-none line-clamp-1"
                >
                  {nextLine2Item.text}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/50">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/10"
                style={{ color: activeColor }}
              >
                <Music className="w-8 h-8 opacity-40 animate-pulse" />
              </div>
              <p className="text-lg sm:text-xl font-medium text-white/80">
                Sin letras sincronizadas disponibles
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all flex items-center gap-2 border border-white/15 shadow-lg active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Cargar archivo .LRC</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom iOS Specs / Control Bar */}
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between text-white/60 font-mono text-xs border-t border-white/10 pt-4 z-20 px-2">
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white transition-colors border border-white/10 text-[11px]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar .LRC</span>
            </button>
          </div>
        </div>
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
        className="w-full h-full rounded-[28px] sm:rounded-[32px] bg-[#080c18]/90 backdrop-blur-3xl saturate-[190%] border border-white/15 border-t-white/30 flex flex-col relative transition-all duration-300 overflow-hidden pointer-events-auto shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1.5px_2px_rgba(255,255,255,0.22)]"
        style={{
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), inset 0 1.5px 2px rgba(255,255,255,0.22)',
          fontFamily: currentFontFamily,
        }}
      >
        {/* Specular Liquid Edge Ambient Highlights */}
        <div className="absolute inset-0 pointer-events-none rounded-[2rem] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.22)]" />
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

        {/* ── Window Chrome & Drag Handle ── */}
        <header className="relative z-20 px-5 pt-2.5 pb-2.5 flex flex-col gap-2 bg-black/35 backdrop-blur-md border-b border-white/[0.06]">
          {/* Centered Drag Pill Handle */}
          <div
            className="w-full flex items-center justify-center py-0.5 cursor-grab active:cursor-grabbing group"
            onMouseDown={onDragStart}
            title="Arrastrar panel por la pantalla"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 group-hover:bg-cyan-400/80 transition-all" />
          </div>

          {/* Main Top Header Bar (Clean, Uncluttered, Spaced) */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Track Information */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 border shadow-sm"
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
                  <span className="text-sm font-bold text-white tracking-tight truncate">
                    {title}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                    style={{ backgroundColor: activeColor }}
                    title="Sincronización activa"
                  />
                </div>
                <span className="text-[11px] text-white/50 font-medium truncate">
                  {artist}
                </span>
              </div>
            </div>

            {/* Right: Consolidated Action Toolbar */}
            <div
              className="flex items-center gap-1.5 flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Settings / Typography Drawer Button */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSettingsOpen
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white border-white/10'
                }`}
                title="Ajustes de tipografía, tamaño y posición"
              >
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[11px]">Ajustes</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isSettingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Fullscreen IMAX Karaoke Trigger */}
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="w-7 h-7 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 flex items-center justify-center border border-cyan-500/25 transition-all shadow-sm active:scale-95"
                  title="Modo Karaoke IMAX Pantalla Completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Minimize to Zen Mode */}
              {onToggleZenMode && (
                <button
                  onClick={onToggleZenMode}
                  className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center border border-white/10 transition-all active:scale-95"
                  title="Colapsar a Micro-Píldora Zen"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center border border-white/10 transition-all active:scale-95"
                  title="Cerrar letras"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Collapsible Settings & Typography Drawer ── */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden pt-2 border-t border-white/[0.06] space-y-3"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Section 1: Font Family Selector */}
                <div className="flex flex-col gap-1.5">
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
                              ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
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
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.04]">
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

                {/* Section 3: File Upload Option */}
                <div className="pt-1 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40">Archivo de Letras</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-mono border border-white/10 transition-colors"
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
          className="flex-1 overflow-y-auto py-8 px-6 space-y-5 scroll-smooth select-none custom-scrollbar relative z-10"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
          }}
        >
          {lyrics.length === 0 ? (
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
                className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors flex items-center gap-1.5 border border-white/10 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Cargar archivo .LRC
              </button>
            </div>
          ) : (
            lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const distance = Math.abs(index - activeIndex);

              // Apple Music style progressive blur & opacity falloff
              const opacity = isActive ? 1.0 : Math.max(0.24, 0.72 - distance * 0.15);
              const blurAmount = isActive ? 0 : Math.min(4.5, 1.0 + distance * 0.9);

              // Responsive font size classes
              const baseSizeClass =
                fontSizeOffset === -2
                  ? 'text-xs py-2 px-3'
                  : fontSizeOffset === -1
                  ? 'text-xs sm:text-sm py-2.5 px-3.5'
                  : fontSizeOffset === 1
                  ? 'text-base sm:text-lg py-3.5 px-4'
                  : fontSizeOffset >= 2
                  ? 'text-lg sm:text-xl py-4 px-5'
                  : 'text-sm sm:text-base py-3 px-4';

              return (
                <div
                  key={index}
                  role="listitem"
                  tabIndex={0}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSeek && onSeek(line.time)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onSeek) onSeek(line.time);
                    }
                  }}
                  className={`group relative rounded-2xl cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${baseSizeClass} ${
                    isActive
                      ? 'scale-[1.04] border backdrop-blur-md bg-white/[0.07] shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
                      : 'hover:bg-white/[0.04] hover:scale-[1.01]'
                  }`}
                  style={{
                    opacity,
                    filter: `blur(${blurAmount}px)`,
                    borderColor: isActive ? `${activeColor}40` : 'transparent',
                    boxShadow: isActive
                      ? `0 10px 30px -4px ${activeColor}30, inset 0 1px 0 rgba(255,255,255,0.18)`
                      : 'none',
                  }}
                >
                  {/* Left Neon Accent Beacon for Active Verse */}
                  {isActive && (
                    <div
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full shadow-[0_0_12px_#00f0ff]"
                      style={{ backgroundColor: activeColor }}
                    />
                  )}

                  <div className="flex flex-col gap-1">
                    {/* Verse Text & Timestamp Row */}
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className={`transition-all duration-300 leading-snug flex-1 ${
                          isActive
                            ? 'text-white font-extrabold tracking-tight'
                            : 'text-white/70 group-hover:text-white font-medium'
                        }`}
                        style={
                          isActive
                            ? {
                                textShadow: `0 0 20px ${activeColor}, 0 0 45px ${secondaryColor}70, 0 2px 10px rgba(0,0,0,0.9)`,
                              }
                            : undefined
                        }
                      >
                        {line.text}
                      </p>

                      {/* Clean Timestamp */}
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

                    {/* Syllable Wave Progress Under Active Verse */}
                    {isActive && (
                      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-1 shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-150"
                          style={{
                            width: `${lineProgress}%`,
                            background: `linear-gradient(to right, ${activeColor}, ${secondaryColor})`,
                            boxShadow: `0 0 10px ${activeColor}`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Glass Bottom Status Footer (Single, Clean, Spacious Line) ── */}
        <footer className="relative z-20 px-5 py-2.5 bg-black/40 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/50">
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
            <span className="text-cyan-300 font-semibold uppercase tracking-wider">
              {isPlaying ? 'Sincronizado' : 'En pausa'}
            </span>
            <span>•</span>
            <span>{lyrics.length} versos</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-white/40">Liquid Glass</span>
            <span className="text-cyan-400 font-semibold">±1.2ms Sync</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LyricsPanel;
