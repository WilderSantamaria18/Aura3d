import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import type { BackgroundAtmosphere } from '../../types/audio';
import {
  Image,
  Upload,
  Trash2,
  Sparkles,
  X,
  SlidersHorizontal,
  SunMedium,
  Gauge,
  Eye,
  EyeOff,
  RotateCcw,
  MousePointer,
} from 'lucide-react';

export const BackgroundAtmospherePopover: React.FC = () => {
  const {
    blobSettings,
    updateBlobSettings,
    isLucid,
    lucidTheme,
    mouseEffectsEnabled,
    toggleMouseEffects,
  } = usePlayerStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'atmosphere' | 'dynamics'>('image');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsPreviewing(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const hasActiveBg =
    Boolean(blobSettings.customBackgroundImage) ||
    (Boolean(blobSettings.backgroundAtmosphere) && blobSettings.backgroundAtmosphere !== 'none');

  const handleResetDefaults = () => {
    updateBlobSettings({
      backgroundOpacity: 0.85,
      backgroundFit: 'cover',
      backgroundScale: 1.0,
      backgroundBlur: 0,
      atmosphereSpeed: 1.0,
      atmosphereGlow: 1.0,
      atmosphereSmoothing: 0.20,
      atmosphereBlend: 'none',
    });
  };

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-11 flex items-center gap-1.5 px-3 py-1.5 rounded-control text-caption font-sans transition-all duration-200 border active:scale-[0.97] ${
          isOpen || hasActiveBg
            ? 'bg-ios-teal/20 text-ios-teal border-ios-teal/30'
            : 'bg-surface-subtle text-text-secondary hover:text-text-primary border-border-subtle hover:bg-surface-active'
        }`}
        title="Personalizar Fondo, Imagen, Opacidad, Difuminado y Efectos Atmosféricos"
        aria-label="Fondo y Atmósfera"
      >
        <Image className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden min-[480px]:inline text-caption font-medium">Fondo</span>
        {hasActiveBg && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-ios-teal animate-pulse"
          />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          {/* Mobile backdrop for safe click-away */}
          <div
            className="fixed inset-0 z-40 bg-surface-scrim material-regular sm:hidden"
            onClick={() => {
              setIsOpen(false);
              setIsPreviewing(false);
            }}
            aria-hidden="true"
          />

          <div
            className={`fixed inset-x-3 top-14 max-w-[400px] mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-w-[calc(100vw-24px)] max-h-[min(520px,calc(100vh-4.5rem))] overflow-y-auto p-3.5 sm:p-4 rounded-card bg-surface-overlay material-thick border border-border-subtle shadow-[var(--shadow-modal)] z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 custom-scrollbar transition-opacity duration-200 ${
              isPreviewing ? 'opacity-25 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Header with Title & Quick Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ios-teal" />
                <span className="text-caption font-mono font-bold text-text-primary uppercase tracking-wider">
                  Fondo & Atmósfera
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Peek / Preview Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewing(!isPreviewing)}
                  className={`min-h-11 min-w-11 rounded-control flex items-center justify-center text-caption transition-colors ${
                    isPreviewing
                      ? 'bg-ios-teal/20 text-ios-teal'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  title={isPreviewing ? 'Restaurar opacidad del panel' : 'Ver fondo completo (panel translúcido)'}
                  aria-label="Ver fondo completo"
                >
                  {isPreviewing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsPreviewing(false);
                  }}
                  className="min-h-11 min-w-11 text-text-tertiary hover:text-text-primary rounded-control hover:bg-surface-subtle transition-colors flex items-center justify-center"
                  aria-label="Cerrar panel de fondo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-control bg-surface-subtle border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-mono transition-all ${
                  activeTab === 'image'
                    ? 'bg-ios-teal/20 text-ios-teal font-semibold shadow-sm border border-ios-teal/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle border border-transparent'
                }`}
              >
                <Image className="w-3 h-3" />
                <span>Imagen</span>
                {blobSettings.customBackgroundImage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ios-teal" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('atmosphere')}
                className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-mono transition-all ${
                  activeTab === 'atmosphere'
                    ? 'bg-ios-teal/20 text-ios-teal font-semibold shadow-sm border border-ios-teal/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle border border-transparent'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Efectos</span>
                {blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ios-purple" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dynamics')}
                className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-mono transition-all ${
                  activeTab === 'dynamics'
                    ? 'bg-ios-teal/20 text-ios-teal font-semibold shadow-sm border border-ios-teal/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle border border-transparent'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Dinámica</span>
              </button>
            </div>

            {/* Hidden Image Input */}
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) {
                      updateBlobSettings({ customBackgroundImage: ev.target.result as string });
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            {/* TAB 1: Imagen de Fondo */}
            {activeTab === 'image' && (
              <div className="flex flex-col gap-3">
                {/* Image Upload & Clear Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    className="flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-control bg-surface-subtle hover:bg-surface-active border border-border-subtle text-caption font-mono text-text-primary transition-all hover:border-ios-teal/40 active:scale-[0.98]"
                  >
                    <Upload className="w-3.5 h-3.5 text-ios-teal" />
                    <span className="truncate">
                      {blobSettings.customBackgroundImage ? 'Cambiar Imagen' : 'Subir Imagen de Fondo'}
                    </span>
                  </button>

                  {blobSettings.customBackgroundImage && (
                    <button
                      type="button"
                      onClick={() => updateBlobSettings({ customBackgroundImage: null })}
                      className="min-h-11 min-w-11 p-2 rounded-control bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/20 transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
                      title="Quitar imagen de fondo"
                      aria-label="Quitar imagen de fondo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Custom Image Adjustments (Fit & Zoom) */}
                {blobSettings.customBackgroundImage && (
                  <div className="flex flex-col gap-2.5 p-2.5 rounded-card bg-surface-subtle border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-mono text-text-secondary">Ajuste de Imagen</span>
                      <div className="flex rounded-control bg-surface-subtle p-0.5 border border-border-subtle">
                        <button
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundFit: 'cover' })}
                          className={`min-h-11 px-3 py-0.5 rounded-control text-caption font-mono transition-all flex items-center ${
                            (blobSettings.backgroundFit || 'cover') === 'cover'
                              ? 'bg-ios-teal/20 text-ios-teal font-semibold'
                              : 'text-text-tertiary hover:text-text-primary'
                          }`}
                          title="Cubrir fondo completo proporcionalmente"
                        >
                          Cubrir
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundFit: 'contain' })}
                          className={`min-h-11 px-3 py-0.5 rounded-control text-caption font-mono transition-all flex items-center ${
                            blobSettings.backgroundFit === 'contain'
                              ? 'bg-ios-teal/20 text-ios-teal font-semibold'
                              : 'text-text-tertiary hover:text-text-primary'
                          }`}
                          title="Ajustar imagen completa sin recortar bordes"
                        >
                          Contener
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-caption font-mono text-text-secondary">
                        <span>Escala / Zoom</span>
                        <span className="text-text-primary font-mono font-tabular">
                          {((blobSettings.backgroundScale || 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.75"
                        step="0.05"
                        value={blobSettings.backgroundScale || 1.0}
                        onChange={(e) => updateBlobSettings({ backgroundScale: parseFloat(e.target.value) })}
                        className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                        aria-label="Escala de imagen"
                      />
                    </div>
                  </div>
                )}

                {/* Transparency (Opacity) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-caption font-mono text-text-secondary">
                    <span>Opacidad del Fondo</span>
                    <span className="text-text-primary font-mono font-tabular">
                      {Math.round((blobSettings.backgroundOpacity ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={blobSettings.backgroundOpacity ?? 0.85}
                    onChange={(e) => updateBlobSettings({ backgroundOpacity: parseFloat(e.target.value) })}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Opacidad del fondo"
                  />
                </div>

                {/* Blur (Difuminar) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-caption font-mono text-text-secondary">
                    <span>Difuminado (Desenfoque)</span>
                    <span className="text-text-primary font-mono font-tabular">{blobSettings.backgroundBlur ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={blobSettings.backgroundBlur ?? 0}
                    onChange={(e) => updateBlobSettings({ backgroundBlur: parseInt(e.target.value, 10) })}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Desenfoque de fondo"
                  />
                </div>

                {/* ── Control de Contraste, Legibilidad de Letras y Fusión Cromática ── */}
                <div className="flex flex-col gap-2 p-2.5 rounded-card bg-surface-subtle border border-ios-teal/20">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-mono font-semibold text-ios-teal">
                      Contraste & Fusión de Color
                    </span>
                    <span className="text-caption px-1.5 py-0.5 rounded-badge bg-ios-teal/20 text-ios-teal font-mono uppercase font-bold">
                      {blobSettings.backgroundContrastMode === 'lucid_tint'
                        ? 'Fusión Lúcida'
                        : blobSettings.backgroundContrastMode === 'deep_cinema'
                        ? 'Cine Oscuro'
                        : blobSettings.backgroundContrastMode === 'none'
                        ? 'Puro'
                        : 'Legibilidad'}
                    </span>
                  </div>

                  {/* Mode Selector Buttons */}
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: 'text_clarity', label: 'Protección Texto', desc: 'Contraste nítido para letras' },
                      { id: 'lucid_tint', label: 'Fusión Lúcida', desc: 'Combina con el color del tema' },
                      { id: 'deep_cinema', label: 'Cine Oscuro', desc: 'Oscurecimiento cinematográfico' },
                      { id: 'none', label: 'Sin Filtro', desc: 'Imagen 100% directa' },
                    ].map((m) => {
                      const isActive = (blobSettings.backgroundContrastMode || 'text_clarity') === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundContrastMode: m.id as any })}
                          className={`min-h-11 p-2 rounded-control text-left transition-all border ${
                            isActive
                              ? 'bg-ios-teal/20 text-text-primary border-ios-teal/50 shadow-sm'
                              : 'bg-surface-subtle text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-active'
                          }`}
                        >
                          <div className="text-caption font-mono font-semibold">{m.label}</div>
                          <div className="text-caption text-text-tertiary leading-tight truncate">{m.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrim & Protection Slider */}
                  {(blobSettings.backgroundContrastMode || 'text_clarity') !== 'none' && (
                    <>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex justify-between text-caption font-mono text-text-secondary">
                          <span>Oscurecimiento / Contraste Letras</span>
                          <span className="text-ios-teal font-mono font-tabular">
                            {Math.round((blobSettings.backgroundTextScrim ?? 0.65) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={blobSettings.backgroundTextScrim ?? 0.65}
                          onChange={(e) => updateBlobSettings({ backgroundTextScrim: parseFloat(e.target.value) })}
                          className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                          aria-label="Oscurecimiento de fondo"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-caption font-mono text-text-secondary">
                          <span>Intensidad de Tinte del Tema</span>
                          <span className="text-ios-teal font-mono font-tabular">
                            {Math.round((blobSettings.backgroundThemeTint ?? 0.35) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={blobSettings.backgroundThemeTint ?? 0.35}
                          onChange={(e) => updateBlobSettings({ backgroundThemeTint: parseFloat(e.target.value) })}
                          className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                          aria-label="Tinte de tema"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Atmósferas y Efectos */}
            {activeTab === 'atmosphere' && (
              <div className="flex flex-col gap-3">
                {/* Primary Atmosphere Effect Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-mono text-text-tertiary uppercase tracking-wider">
                      Efecto Principal
                    </span>
                    <span className="text-caption font-mono text-ios-teal font-semibold">
                      {blobSettings.backgroundAtmosphere || 'none'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['none', 'Limpio'],
                        ['sunset', 'Atardecer'],
                        ['cyber_city', 'Cyber City'],
                        ['cosmic_voyager', 'Viajero'],
                        ['ripples', 'Gotas'],
                        ['rain', 'Lluvia'],
                        ['sand', 'Arena'],
                        ['stars', 'Estrellas'],
                        ['matrix', 'Matrix'],
                        ['aurora', 'Aurora'],
                      ] as const
                    ).map(([id, label]) => {
                      const isActive = (blobSettings.backgroundAtmosphere || 'none') === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundAtmosphere: id as BackgroundAtmosphere })}
                          className={`min-h-11 py-1.5 px-1 rounded-control text-caption font-mono transition-all text-center border active:scale-95 flex items-center justify-center ${
                            isActive
                              ? 'bg-ios-teal/20 text-ios-teal border-ios-teal/40 font-bold shadow-sm'
                              : 'bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-surface-active border-transparent'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Effect Blending / Variation Selector */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-mono text-text-tertiary uppercase tracking-wider">
                      Mezcla con Segundo Efecto
                    </span>
                    <span className="text-caption font-mono text-ios-purple font-semibold">
                      {blobSettings.atmosphereBlend || 'none'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['none', 'Sin Mezcla'],
                        ['sunset', 'Atardecer'],
                        ['cyber_city', 'Cyber City'],
                        ['cosmic_voyager', 'Viajero'],
                        ['aurora', 'Aurora'],
                        ['stars', 'Estrellas'],
                      ] as const
                    ).map(([id, label]) => {
                      const isActive = (blobSettings.atmosphereBlend || 'none') === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateBlobSettings({ atmosphereBlend: id as BackgroundAtmosphere | 'none' })}
                          className={`min-h-11 py-1.5 px-1 rounded-control text-caption font-mono transition-all text-center border active:scale-95 flex items-center justify-center ${
                            isActive
                              ? 'bg-ios-purple/25 text-ios-purple border-ios-purple/40 font-bold'
                              : 'bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-surface-active border-transparent'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Dinámica y Movimiento */}
            {activeTab === 'dynamics' && (
              <div className="flex flex-col gap-3">
                {/* Speed Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-caption font-mono text-text-secondary">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-ios-teal" />
                      <span>Velocidad de Movimiento</span>
                    </div>
                    <span className="text-ios-teal font-mono font-tabular">
                      {(blobSettings.atmosphereSpeed || 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="2.5"
                    step="0.10"
                    value={blobSettings.atmosphereSpeed || 1.0}
                    onChange={(e) => updateBlobSettings({ atmosphereSpeed: parseFloat(e.target.value) })}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Velocidad de movimiento"
                  />
                </div>

                {/* Illumination / Glow Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-caption font-mono text-text-secondary">
                    <div className="flex items-center gap-1">
                      <SunMedium className="w-3 h-3 text-status-warning" />
                      <span>Iluminación & Resplandor</span>
                    </div>
                    <span className="text-status-warning font-mono font-tabular">
                      {(blobSettings.atmosphereGlow || 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="2.5"
                    step="0.10"
                    value={blobSettings.atmosphereGlow || 1.0}
                    onChange={(e) => updateBlobSettings({ atmosphereGlow: parseFloat(e.target.value) })}
                    className="w-full h-11 bg-transparent cursor-pointer accent-status-warning"
                    aria-label="Iluminación y resplandor"
                  />
                </div>

                {/* Transition Smoothing Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-caption font-mono text-text-secondary">
                    <span>Tiempo de Transición / Inercia</span>
                    <span className="text-ios-purple font-mono font-tabular">
                      {Math.round((1 - (blobSettings.atmosphereSmoothing || 0.20)) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.40"
                    step="0.02"
                    value={blobSettings.atmosphereSmoothing || 0.20}
                    onChange={(e) => updateBlobSettings({ atmosphereSmoothing: parseFloat(e.target.value) })}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-purple"
                    aria-label="Tiempo de transición"
                  />
                </div>

                {/* Mouse & Cursor Particle Trail Toggle */}
                <div className="flex items-center justify-between p-2 rounded-card bg-surface-subtle border border-border-subtle">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-caption font-medium text-text-primary">
                      <MousePointer className={`w-3.5 h-3.5 ${mouseEffectsEnabled ? 'text-ios-teal' : 'text-text-tertiary'}`} />
                      <span>Efectos de Cursor 3D</span>
                    </div>
                    <span className="text-caption text-text-tertiary">Desactivado por defecto (ahorro de FPS)</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleMouseEffects}
                    className={`min-h-11 px-3 py-0.5 rounded-control text-caption font-bold uppercase transition-all flex items-center ${
                      mouseEffectsEnabled
                        ? 'bg-ios-teal/20 text-ios-teal border border-ios-teal/40 shadow-sm'
                        : 'bg-surface-subtle text-text-tertiary border border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {mouseEffectsEnabled ? 'Activo' : 'Eco (Off)'}
                  </button>
                </div>

                {/* Quick Reset to Defaults */}
                <div className="pt-2 border-t border-border-subtle flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="min-h-11 flex items-center gap-1.5 px-3 py-1.5 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-surface-active border border-border-subtle transition-all active:scale-95"
                    title="Restablecer controles a valores originales"
                  >
                    <RotateCcw className="w-3 h-3 text-ios-teal" />
                    <span>Restablecer Valores</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BackgroundAtmospherePopover;
