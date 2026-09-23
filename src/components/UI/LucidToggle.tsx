import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { LUCID_THEMES } from '../../types/audio';
import {
  Sparkles,
  Palette,
  ChevronDown,
  ArrowLeftRight,
  Shuffle,
  Sliders,
  Check,
  X,
  Wand2,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

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
    customLucidThemes,
    saveCustomLucidTheme,
    deleteCustomLucidTheme,
    combineWithWallpaper,
  } = usePlayerStore();

  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);

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

  const [activeTab, setActiveTab] = useState<'palettes' | 'custom' | 'saved'>('palettes');
  const [hexInput1, setHexInput1] = useState(lucidPrimaryColor);
  const [hexInput2, setHexInput2] = useState(lucidSecondaryColor);
  const [newThemeName, setNewThemeName] = useState('');
  const [isCombining, setIsCombining] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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

  // Show transient toast
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((current) => (current === msg ? null : current));
    }, 2800);
  };

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

  // Save current colors as custom theme
  const handleSaveTheme = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const saved = saveCustomLucidTheme(newThemeName.trim() || undefined);
    setNewThemeName('');
    showToast(`Tema "${saved.name}" guardado`);
    setActiveTab('saved');
  };

  // Combine colors with active wallpaper
  const handleCombineWithWallpaper = async () => {
    setIsCombining(true);
    try {
      const ok = await combineWithWallpaper();
      if (ok) {
        showToast('¡Colores combinados con el fondo!');
      } else {
        showToast('No se encontró fondo activo. Abre Wallpaper Studio (W)');
      }
    } catch {
      showToast('No se pudo extraer colores del fondo');
    } finally {
      setIsCombining(false);
    }
  };

  const hasWallpaper = Boolean(currentWallpaper?.url || usePlayerStore.getState().blobSettings?.customBackgroundImage);

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
          title="Colores Lúcidos: Paletas, Guardados y Combinar con Fondo"
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
          className="absolute top-full mt-2.5 right-0 z-50 w-92 max-w-[calc(100vw-1.5rem)] liquid-glass liquid-glass--card space-y-3.5 animate-in fade-in zoom-in-95 duration-200 select-none text-white font-sans shadow-2xl border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
              <div>
                <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-white leading-none">
                  Colores Lúcidos
                </h4>
                <p className="text-[9px] text-white/45 mt-0.5">
                  Estilo cromático y óptico de Aura3D
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-medium text-white/60 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                {LUCID_THEMES.length + customLucidThemes.length} Temas
              </span>
              <button
                type="button"
                onClick={closePalette}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer"
                aria-label="Cerrar paleta"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Acción Rápida: Combinar con Fondo de Pantalla */}
          <button
            type="button"
            onClick={handleCombineWithWallpaper}
            disabled={isCombining}
            className={`w-full group p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer relative overflow-hidden text-left ${
              hasWallpaper
                ? 'bg-gradient-to-r from-cyan-500/15 via-white/[0.05] to-fuchsia-500/15 border-cyan-400/35 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(0,229,255,0.12)]'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-white/60'
            }`}
            title="Extrae la paleta cromática dominante del fondo activo y sincroniza todo el sistema"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-black/40 border border-white/15 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                {currentWallpaper?.thumbnail || currentWallpaper?.url ? (
                  <img
                    src={currentWallpaper.thumbnail || currentWallpaper.url}
                    alt="Fondo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
                )}
                {isCombining && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-cyan-400" />
                    Combinar con fondo
                  </span>
                  {hasWallpaper && (
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      ACTIVO
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-white/50 truncate">
                  {hasWallpaper
                    ? `Armonizar colores con: ${currentWallpaper?.title || 'Fondo actual'}`
                    : 'Sin fondo activo. Haz clic para detectar o abre [W]'}
                </p>
              </div>
            </div>

            <div className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20 group-hover:bg-cyan-400 group-hover:text-black transition-all shrink-0">
              {isCombining ? 'Sincronizando...' : 'Sincronizar'}
            </div>
          </button>

          {/* Feedback Toast Banner */}
          {feedbackToast && (
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* Segmented Control (3 Pestañas) */}
          <div className="p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('palettes')}
              className={`py-1.5 px-2 rounded-xl text-[10.5px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'palettes'
                  ? 'bg-white/20 text-white shadow-sm border border-white/15'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>Paletas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`py-1.5 px-2 rounded-xl text-[10.5px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white/20 text-white shadow-sm border border-white/15'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Personalizar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`py-1.5 px-2 rounded-xl text-[10.5px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white/20 text-white shadow-sm border border-white/15'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>
                Guardados {customLucidThemes.length > 0 && `(${customLucidThemes.length})`}
              </span>
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

              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {LUCID_THEMES.map((theme) => {
                  const isSelected = isLucid && lucidTheme.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setLucidTheme(theme)}
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

          {/* TAB 2: Personalizador Pro (Dual HEX, Invertir y Guardar Tema) */}
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
                        title="Seleccionar color primario con cuentagotas"
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
                        title="Seleccionar color secundario con cuentagotas"
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

                {/* Formulario: Guardar como Tema Personalizado */}
                <form onSubmit={handleSaveTheme} className="pt-2 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Nombre del tema (ej. Neón Aurora)"
                      className="flex-1 text-[10px] px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-[10.5px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.4)] shrink-0"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: Temas Guardados por el Usuario */}
          {activeTab === 'saved' && (
            <div className="space-y-2 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between px-1 text-[10px] text-white/50 font-mono">
                <span>Mis Temas Guardados</span>
                <span>{customLucidThemes.length} guardado(s)</span>
              </div>

              {customLucidThemes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-2">
                  <Bookmark className="w-6 h-6 text-white/30 mx-auto" />
                  <p className="text-xs font-semibold text-white/80">No tienes temas guardados</p>
                  <p className="text-[10px] text-white/45 max-w-xs mx-auto">
                    Ajusta los colores primario y secundario en la pestaña &quot;Personalizar&quot; y pulsa
                    Guardar para coleccionarlos aquí.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className="mt-2 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 text-[10.5px] font-medium transition-colors cursor-pointer"
                  >
                    Crear mi primer tema
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {customLucidThemes.map((savedTheme) => {
                    const isSelected = isLucid && lucidTheme.id === savedTheme.id;
                    return (
                      <div
                        key={savedTheme.id}
                        className={`group flex items-center justify-between p-2 rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-md'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06] text-white/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setLucidTheme(savedTheme)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="flex items-center -space-x-1.5 flex-shrink-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                              style={{
                                backgroundColor: savedTheme.primary,
                                boxShadow: `0 0 8px ${savedTheme.primary}70`,
                              }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                              style={{
                                backgroundColor: savedTheme.secondary,
                                boxShadow: `0 0 8px ${savedTheme.secondary}70`,
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold truncate text-white">
                                {savedTheme.name}
                              </span>
                              {isSelected && (
                                <span className="text-[8px] font-mono font-bold text-cyan-300 bg-cyan-400/20 px-1.5 py-0.2 rounded-full border border-cyan-400/30">
                                  ACTIVO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[8.5px] font-mono text-white/40">
                              <span>{savedTheme.primary}</span>
                              <span>•</span>
                              <span>{savedTheme.secondary}</span>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            deleteCustomLucidTheme(savedTheme.id);
                            showToast(`Tema eliminado`);
                          }}
                          className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2 cursor-pointer"
                          title="Eliminar tema guardado"
                          aria-label={`Eliminar tema ${savedTheme.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Duotone Gradient Visualizer Capsule (Live Preview) */}
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-white/60">
              <span>Fusión Duotono Activa</span>
              <span className="uppercase text-white/80">
                {lucidPrimaryColor} → {lucidSecondaryColor}
              </span>
            </div>

            <div
              className="h-3 w-full rounded-full border border-white/20 shadow-inner transition-all duration-300"
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
