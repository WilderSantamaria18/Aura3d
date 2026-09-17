import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { LUCID_THEMES } from '../../types/audio';
import { Sparkles, Palette, ChevronDown, ArrowLeftRight, Shuffle, Sliders, Check, X } from 'lucide-react';

export interface LucidToggleProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const LucidToggle: React.FC<LucidToggleProps> = ({
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
}) => {
  const {
    isLucid,
    toggleLucidMode,
    lucidTheme,
    setLucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
  } = usePlayerStore();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isPaletteOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const togglePalette = () => {
    if (onToggle) onToggle();
    else setInternalIsOpen((v) => !v);
  };

  const closePalette = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  const [activeTab, setActiveTab] = useState<'palettes' | 'custom'>('palettes');
  const [hexInput1, setHexInput1] = useState(lucidPrimaryColor);
  const [hexInput2, setHexInput2] = useState(lucidSecondaryColor);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Sync inputs with store colors when they change
  useEffect(() => {
    setHexInput1(lucidPrimaryColor);
  }, [lucidPrimaryColor]);

  useEffect(() => {
    setHexInput2(lucidSecondaryColor);
  }, [lucidSecondaryColor]);

  // Close palette on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        closePalette();
      }
    };
    if (isPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteOpen]);

  // Swap primary and secondary
  const handleSwapColors = () => {
    const temp1 = lucidPrimaryColor;
    const temp2 = lucidSecondaryColor;
    setLucidPrimaryColor(temp2);
    setLucidSecondaryColor(temp1);
  };

  // Shuffle to an aesthetic curated theme
  const handleShuffleTheme = () => {
    const available = LUCID_THEMES.filter((t) => t.id !== lucidTheme.id);
    const randomTheme = available[Math.floor(Math.random() * available.length)] || LUCID_THEMES[0];
    setLucidTheme(randomTheme);
  };

  // Safe HEX input handlers
  const handleHexChange1 = (val: string) => {
    setHexInput1(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setLucidPrimaryColor(val);
    }
  };

  const handleHexChange2 = (val: string) => {
    setHexInput2(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setLucidSecondaryColor(val);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={paletteRef}>
      {/* Main Lucid Mode Capsule Button (iOS Liquid Glass Style) */}
      <div
        className={`inline-flex items-center rounded-full border transition-all duration-200 p-0.5 ${
          isLucid
            ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
            : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 border-t-white/20 text-white/80 hover:text-white shadow-sm'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: `${lucidPrimaryColor}20`,
                borderColor: `${lucidPrimaryColor}60`,
                boxShadow: `0 0 16px ${lucidTheme.glow}`,
                color: '#ffffff',
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={toggleLucidMode}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 h-5.5 sm:h-6 rounded-full transition-transform active:scale-95 text-[10.5px] sm:text-[11px] font-medium cursor-pointer"
          title={isLucid ? 'Desactivar Modo Lúcido' : 'Activar Modo Lúcido (Colores Lúcidos Neón)'}
        >
          {isLucid ? (
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: lucidPrimaryColor }}
            />
          ) : (
            <Sparkles className="w-3 h-3 text-cyan-400" />
          )}
          <span>Lúcido</span>
        </button>

        {/* Color Palette Dropdown Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePalette();
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white/80 hover:text-white mr-0.5 cursor-pointer active:scale-90"
          title="Colores Lúcidos: Paletas y Personalizador HEX"
          aria-label="Abrir panel de colores lúcidos"
        >
          <div
            className="w-3 h-3 rounded-full border border-white/40 shadow-sm flex items-center justify-center transition-transform"
            style={{ backgroundColor: isLucid ? lucidPrimaryColor : '#00f2fe' }}
          >
            <ChevronDown
              className={`w-2 h-2 text-black stroke-[3] transition-transform duration-200 ${
                isPaletteOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Floating Modal / Popover: Colores Lúcidos (iOS Liquid Glass Card) */}
      {isPaletteOpen && (
        <div
          className="absolute top-full mt-2.5 right-0 z-50 w-84 max-w-[calc(100vw-2rem)] rounded-[24px] liquid-glass liquid-glass-card bg-[#0a0f1d]/95 backdrop-blur-3xl border border-white/15 border-t-white/30 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-3.5 animate-in fade-in zoom-in-95 duration-200 select-none text-white font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (Strict Title: "Colores Lúcidos") */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center border border-white/15 shadow-sm"
                style={{
                  backgroundColor: `${lucidPrimaryColor}25`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-white">
                Colores Lúcidos
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-mono font-medium text-white/60 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                {LUCID_THEMES.length} Temas
              </span>
              <button
                type="button"
                onClick={closePalette}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/10 border-t-white/20 transition-all active:scale-95 cursor-pointer"
                aria-label="Cerrar paleta"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Segmented Control (Apple iOS Style Tab Switcher) */}
          <div className="p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('palettes')}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'palettes'
                  ? 'bg-white/20 text-white shadow-sm border border-white/15'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Paletas Duotono</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white/20 text-white shadow-sm border border-white/15'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Personalizar HEX</span>
            </button>
          </div>

          {/* TAB 1: Paletas Duotono Curadas */}
          {activeTab === 'palettes' && (
            <div className="space-y-2 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between px-1 text-[10px] text-white/50 font-mono">
                <span>Combinaciones Armónicas</span>
                <button
                  type="button"
                  onClick={handleShuffleTheme}
                  className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                  title="Cambiar tema aleatorio"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Aleatorio</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {LUCID_THEMES.map((theme) => {
                  const isSelected = isLucid && lucidTheme.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setLucidTheme(theme);
                      }}
                      className={`group flex items-center gap-2 p-2 rounded-xl text-left transition-all duration-150 border cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.14] border-cyan-400/50 text-white shadow-md shadow-black/40'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      {/* Dual Glowing Orbs */}
                      <div
                        className="flex items-center -space-x-1.5 flex-shrink-0"
                        title={`${theme.primary} & ${theme.secondary}`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: theme.primary,
                            boxShadow: `0 0 8px ${theme.primary}60`,
                          }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: theme.secondary,
                            boxShadow: `0 0 8px ${theme.secondary}60`,
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-medium truncate block text-white/90">
                          {theme.name}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-mono text-white/40">
                          <span className="uppercase">{theme.primary}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 shadow-[0_0_6px_#00e5ff]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Personalizador Pro (Dual HEX & Live Pickers) */}
          {activeTab === 'custom' && (
            <div className="space-y-3 animate-in fade-in-50 duration-150">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 border-t-white/20 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
                  <span>Edición de Colores Lúcidos</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSwapColors}
                      className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[9.5px] font-mono text-cyan-300 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      title="Intercambiar Primario y Secundario"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Invertir</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShuffleTheme}
                      className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
                      title="Generar combinación al azar"
                    >
                      <Shuffle className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Primario */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/60">
                        Primario
                      </span>
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{
                          backgroundColor: lucidPrimaryColor,
                          boxShadow: `0 0 10px ${lucidPrimaryColor}60`,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={lucidPrimaryColor}
                        onChange={(e) => setLucidPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                        title="Seleccionar color con cuentagotas"
                      />
                      <input
                        type="text"
                        maxLength={7}
                        value={hexInput1}
                        onChange={(e) => handleHexChange1(e.target.value)}
                        className="w-full text-[10px] font-mono px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white uppercase focus:border-cyan-400 focus:outline-none"
                        placeholder="#00F5D4"
                      />
                    </div>
                  </div>

                  {/* Secundario */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/60">
                        Secundario
                      </span>
                      <div
                        className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        style={{
                          backgroundColor: lucidSecondaryColor,
                          boxShadow: `0 0 10px ${lucidSecondaryColor}60`,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={lucidSecondaryColor}
                        onChange={(e) => setLucidSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                        title="Seleccionar color con cuentagotas"
                      />
                      <input
                        type="text"
                        maxLength={7}
                        value={hexInput2}
                        onChange={(e) => handleHexChange2(e.target.value)}
                        className="w-full text-[10px] font-mono px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white uppercase focus:border-cyan-400 focus:outline-none"
                        placeholder="#FFD166"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Duotone Gradient Visualizer Capsule (Live Preview) */}
          <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-white/60">
              <span>Fusión Duotono Activa</span>
              <span className="uppercase text-white/80">
                {lucidPrimaryColor} → {lucidSecondaryColor}
              </span>
            </div>

            <div
              className="h-3.5 w-full rounded-full border border-white/20 shadow-inner transition-all duration-300"
              style={{
                background: `linear-gradient(90deg, ${lucidPrimaryColor} 0%, ${lucidSecondaryColor} 100%)`,
                boxShadow: `0 0 16px ${lucidPrimaryColor}40`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LucidToggle;
