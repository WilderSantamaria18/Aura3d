/**
 * LyricsSettingsModal — Apple Liquid Glass Comprehensive Settings Modal
 *
 * Provides control over:
 *  - Appearance (Typography, Font Size, Accent Colors)
 *  - Smooth Scrolling (Lenis, duration, smooth wheel, auto-scroll)
 *  - Kawarp Dynamic Audio-Reactive Background (Intensity, Motion Speed, Saturation)
 *  - Fullscreen Cinema Mode (UI auto-hide delay)
 *  - Romanization & Furigana mode
 *  - Reset to Defaults
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Type,
  MousePointer2,
  Waves,
  Languages,
  RotateCcw,
  Sliders,
  Check,
  Maximize2,
} from 'lucide-react';
import { usePlayerStore, DEFAULT_KAWARP_SETTINGS, DEFAULT_LENIS_SETTINGS } from '../../stores/playerStore';
import type { LyricsFontType } from './LyricsPanel';
import type { RomanizationMode } from '../../types/lyrics';

interface LyricsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFont: LyricsFontType;
  onFontChange: (font: LyricsFontType) => void;
  fontSizeOffset: number;
  onFontSizeChange: (delta: number) => void;
  accentColor: string;
}

const FONT_OPTIONS: { id: LyricsFontType; label: string; fontFamily: string }[] = [
  { id: 'modern', label: 'Inter Modern', fontFamily: "'Inter', sans-serif" },
  { id: 'serif', label: 'Playfair Serif', fontFamily: "'Playfair Display', Georgia, serif" },
  { id: 'mono', label: 'JetBrains Mono', fontFamily: "'JetBrains Mono', monospace" },
  { id: 'cursive', label: 'Caveat Cursive', fontFamily: "'Caveat', cursive" },
  { id: 'display', label: 'Orbitron Display', fontFamily: "'Orbitron', sans-serif" },
];

export const LyricsSettingsModal: React.FC<LyricsSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedFont,
  onFontChange,
  fontSizeOffset,
  onFontSizeChange,
  accentColor,
}) => {
  const {
    kawarpSettings,
    updateKawarpSettings,
    lenisSettings,
    updateLenisSettings,
    romanizationMode,
    setRomanizationMode,
    lyricsHideDelay,
    setLyricsHideDelay,
    lyricsAutoScroll,
    setLyricsAutoScroll,
  } = usePlayerStore();

  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    updateKawarpSettings(DEFAULT_KAWARP_SETTINGS);
    updateLenisSettings(DEFAULT_LENIS_SETTINGS);
    setRomanizationMode('off');
    setLyricsHideDelay(3000);
    setLyricsAutoScroll(true);
    onFontChange('modern');
  };

  const matchesSearch = (terms: string[]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return terms.some((t) => t.toLowerCase().includes(q));
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg max-h-[85vh] rounded-[28px] liquid-glass--modal flex flex-col overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9),inset_0_1px_1.5px_rgba(255,255,255,0.25)] border border-white/15"
          style={{
            background: 'rgba(9, 11, 20, 0.88)',
            backdropFilter: 'blur(52px) saturate(190%)',
            WebkitBackdropFilter: 'blur(52px) saturate(190%)',
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Ajustes de Letras"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}35`,
                  color: accentColor,
                }}
              >
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Ajustes de Letras
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white transition-colors border border-white/10"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 pt-3 pb-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ajustes..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 liquid-glass-scrollbar text-xs">
            {/* Section 1: Apariencia */}
            {matchesSearch(['apariencia', 'tipografia', 'fuente', 'tamaño', 'font']) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] font-mono tracking-wider font-semibold">
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Apariencia y Tipografía</span>
                </div>

                {/* Font Family Selector */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FONT_OPTIONS.map((f) => {
                    const isSel = selectedFont === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onFontChange(f.id)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSel
                            ? 'bg-white/20 border-white/30 text-white font-bold shadow-sm'
                            : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                        style={{ fontFamily: f.fontFamily }}
                      >
                        <span className="truncate">{f.label}</span>
                        {isSel && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />}
                      </button>
                    );
                  })}
                </div>

                {/* Font Size Stepper */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-white/80 font-medium">Tamaño de letra</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onFontSizeChange(-1)}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-colors"
                      title="Reducir"
                    >
                      A-
                    </button>
                    <span className="w-12 text-center font-mono font-bold" style={{ color: accentColor }}>
                      {fontSizeOffset === 0 ? '100%' : `${100 + fontSizeOffset * 15}%`}
                    </span>
                    <button
                      onClick={() => onFontSizeChange(1)}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white transition-colors"
                      title="Aumentar"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Section 2: Scrolling & Lenis */}
            {matchesSearch(['scrolling', 'lenis', 'desplazamiento', 'rueda', 'autoscroll']) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] font-mono tracking-wider font-semibold">
                  <MousePointer2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Desplazamiento Suave (Lenis)</span>
                </div>

                {/* Auto Scroll Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <div>
                    <p className="text-white/90 font-medium">Auto-scroll centrado</p>
                    <p className="text-white/40 text-[11px]">Centra la línea activa automáticamente</p>
                  </div>
                  <button
                    onClick={() => setLyricsAutoScroll(!lyricsAutoScroll)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      lyricsAutoScroll ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        lyricsAutoScroll ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Lenis Enabled Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <div>
                    <p className="text-white/90 font-medium">Motor de inercia Lenis</p>
                    <p className="text-white/40 text-[11px]">Interpolación física de rueda y desplazamiento</p>
                  </div>
                  <button
                    onClick={() => updateLenisSettings({ enabled: !lenisSettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      lenisSettings.enabled ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        lenisSettings.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Lenis Duration Slider */}
                {lenisSettings.enabled && (
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-white/80">
                      <span>Duración de inercia</span>
                      <span className="font-mono text-cyan-400">{lenisSettings.duration.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={lenisSettings.duration}
                      onChange={(e) => updateLenisSettings({ duration: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                )}
              </section>
            )}

            {/* Section 3: Fondo Dinámico Kawarp */}
            {matchesSearch(['kawarp', 'fondo', 'gradiente', 'warp', 'deformacion']) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] font-mono tracking-wider font-semibold">
                  <Waves className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fondo Dinámico Kawarp</span>
                </div>

                {/* Kawarp Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <div>
                    <p className="text-white/90 font-medium">Efecto Kawarp audio-reactivo</p>
                    <p className="text-white/40 text-[11px]">Deforma los gradientes con bajos y energía</p>
                  </div>
                  <button
                    onClick={() => updateKawarpSettings({ enabled: !kawarpSettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      kawarpSettings.enabled ? 'bg-purple-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        kawarpSettings.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {kawarpSettings.enabled && (
                  <div className="space-y-2.5">
                    {/* Warp Intensity Slider */}
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-white/80">
                        <span>Intensidad de deformación</span>
                        <span className="font-mono text-purple-400">
                          {Math.round(kawarpSettings.warpIntensity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={kawarpSettings.warpIntensity}
                        onChange={(e) => updateKawarpSettings({ warpIntensity: parseFloat(e.target.value) })}
                        className="w-full accent-purple-400"
                      />
                    </div>

                    {/* Motion Speed Slider */}
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-white/80">
                        <span>Velocidad de movimiento</span>
                        <span className="font-mono text-purple-400">
                          {kawarpSettings.motionSpeed.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={kawarpSettings.motionSpeed}
                        onChange={(e) => updateKawarpSettings({ motionSpeed: parseFloat(e.target.value) })}
                        className="w-full accent-purple-400"
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Section 4: Fullscreen Cinema Mode */}
            {matchesSearch(['fullscreen', 'cinema', 'ocultar', 'delay', 'pantalla']) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] font-mono tracking-wider font-semibold">
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modo Cinema / Fullscreen</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-white/80">
                    <div>
                      <p className="font-medium">Tiempo para auto-ocultar UI</p>
                      <p className="text-white/40 text-[11px]">Oculta controles tras inactividad del cursor</p>
                    </div>
                    <span className="font-mono text-cyan-400">{(lyricsHideDelay / 1000).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="8000"
                    step="500"
                    value={lyricsHideDelay}
                    onChange={(e) => setLyricsHideDelay(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </section>
            )}

            {/* Section 5: Romanización */}
            {matchesSearch(['romanizacion', 'japones', 'furigana', 'romaji', 'idioma']) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] font-mono tracking-wider font-semibold">
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Romanización y Furigana (Japonés)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['off', 'romaji', 'furigana'] as RomanizationMode[]).map((mode) => {
                    const isSel = romanizationMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setRomanizationMode(mode)}
                        className={`py-2 px-3 rounded-xl border capitalize text-center font-medium transition-all ${
                          isSel
                            ? 'bg-white/20 border-white/30 text-white font-bold shadow-sm'
                            : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {mode === 'off' ? 'Desactivado' : mode}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Footer with Reset */}
          <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-black/20">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer valores</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-transform active:scale-95 text-xs shadow-lg"
            >
              Listo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LyricsSettingsModal;
