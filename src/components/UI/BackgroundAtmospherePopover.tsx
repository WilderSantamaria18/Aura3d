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
} from 'lucide-react';

export const BackgroundAtmospherePopover: React.FC = () => {
  const {
    blobSettings,
    updateBlobSettings,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
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

  const accentColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00f2fe';

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
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 border active:scale-95 ${
          isOpen || hasActiveBg
            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
            : 'bg-white/[0.03] text-white/70 hover:text-white border-white/[0.08] hover:bg-white/[0.06]'
        }`}
        style={
          isLucid && (isOpen || hasActiveBg)
            ? {
                backgroundColor: `${accentColor}18`,
                borderColor: `${accentColor}50`,
                color: accentColor,
                boxShadow: `0 0 16px ${lucidTheme.glow}`,
              }
            : undefined
        }
        title="Personalizar Fondo, Imagen, Opacidad, Difuminado y Efectos Atmosféricos"
        aria-label="Fondo y Atmósfera"
      >
        <Image className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden min-[480px]:inline text-[11px] font-medium">Fondo</span>
        {hasActiveBg && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          {/* Mobile backdrop for safe click-away */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden"
            onClick={() => {
              setIsOpen(false);
              setIsPreviewing(false);
            }}
            aria-hidden="true"
          />

          <div
            className={`fixed inset-x-3 top-14 max-w-[400px] mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] sm:max-w-[calc(100vw-24px)] max-h-[min(520px,calc(100vh-4.5rem))] overflow-y-auto p-3.5 sm:p-4 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 custom-scrollbar transition-opacity duration-200 ${
              isPreviewing ? 'opacity-25 hover:opacity-100' : 'opacity-100'
            }`}
            style={
              isLucid
                ? {
                    borderColor: `${accentColor}40`,
                    boxShadow: `0 24px 60px rgba(0,0,0,0.95), 0 0 30px ${lucidTheme.glow}`,
                  }
                : undefined
            }
          >
            {/* Header with Title & Quick Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Fondo & Atmósfera
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Peek / Preview Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewing(!isPreviewing)}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    isPreviewing
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
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
                  className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Cerrar panel de fondo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeTab === 'image'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Image className="w-3 h-3" />
                <span>Imagen</span>
                {blobSettings.customBackgroundImage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('atmosphere')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeTab === 'atmosphere'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Efectos</span>
                {blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dynamics')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeTab === 'dynamics'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent'
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
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-white/90 transition-all hover:border-cyan-400/40 active:scale-[0.98]"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">
                      {blobSettings.customBackgroundImage ? 'Cambiar Imagen' : 'Subir Imagen de Fondo'}
                    </span>
                  </button>

                  {blobSettings.customBackgroundImage && (
                    <button
                      type="button"
                      onClick={() => updateBlobSettings({ customBackgroundImage: null })}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all active:scale-95 flex-shrink-0"
                      title="Quitar imagen de fondo"
                      aria-label="Quitar imagen de fondo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Custom Image Adjustments (Fit & Zoom) */}
                {blobSettings.customBackgroundImage && (
                  <div className="flex flex-col gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/70">Ajuste de Imagen</span>
                      <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundFit: 'cover' })}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                            (blobSettings.backgroundFit || 'cover') === 'cover'
                              ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                              : 'text-white/40 hover:text-white'
                          }`}
                          title="Cubrir fondo completo proporcionalmente"
                        >
                          Cubrir
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundFit: 'contain' })}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                            blobSettings.backgroundFit === 'contain'
                              ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                              : 'text-white/40 hover:text-white'
                          }`}
                          title="Ajustar imagen completa sin recortar bordes"
                        >
                          Contener
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-white/60">
                        <span>Escala / Zoom</span>
                        <span className="text-white font-mono">
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
                        className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Transparency (Opacity) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-mono text-white/70">
                    <span>Opacidad del Fondo</span>
                    <span className="text-white font-mono">
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
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Blur (Difuminar) Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-mono text-white/70">
                    <span>Difuminado (Desenfoque)</span>
                    <span className="text-white font-mono">{blobSettings.backgroundBlur ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={blobSettings.backgroundBlur ?? 0}
                    onChange={(e) => updateBlobSettings({ backgroundBlur: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Atmósferas y Efectos */}
            {activeTab === 'atmosphere' && (
              <div className="flex flex-col gap-3">
                {/* Primary Atmosphere Effect Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      Efecto Principal
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                      {blobSettings.backgroundAtmosphere || 'none'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['none', 'Limpio'],
                        ['sunset', '🌅 Atardecer'],
                        ['cyber_city', '🏙️ Cyber City'],
                        ['cosmic_voyager', '🌙 Viajero'],
                        ['ripples', '💧 Gotas'],
                        ['rain', '🌧️ Lluvia'],
                        ['sand', '⏳ Arena'],
                        ['stars', '✨ Estrellas'],
                        ['matrix', '💻 Matrix'],
                        ['aurora', '🌌 Aurora'],
                      ] as const
                    ).map(([id, label]) => {
                      const isActive = (blobSettings.backgroundAtmosphere || 'none') === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundAtmosphere: id as BackgroundAtmosphere })}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-mono transition-all text-center border active:scale-95 ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm'
                              : 'bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.06] border-transparent'
                          }`}
                          style={
                            isLucid && isActive
                              ? {
                                  backgroundColor: `${accentColor}25`,
                                  borderColor: `${accentColor}60`,
                                  color: '#ffffff',
                                }
                              : undefined
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Effect Blending / Variation Selector */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      Mezcla con Segundo Efecto
                    </span>
                    <span className="text-[9px] font-mono text-purple-400 font-semibold">
                      {blobSettings.atmosphereBlend || 'none'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['none', 'Sin Mezcla'],
                        ['sunset', '🌅 Atardecer'],
                        ['cyber_city', '🏙️ Cyber City'],
                        ['cosmic_voyager', '🌙 Viajero'],
                        ['aurora', '🌌 Aurora'],
                        ['stars', '✨ Estrellas'],
                      ] as const
                    ).map(([id, label]) => {
                      const isActive = (blobSettings.atmosphereBlend || 'none') === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateBlobSettings({ atmosphereBlend: id as BackgroundAtmosphere | 'none' })}
                          className={`py-1.5 px-1 rounded-xl text-[9px] font-mono transition-all text-center border active:scale-95 ${
                            isActive
                              ? 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold'
                              : 'bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.06] border-transparent'
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
                  <div className="flex justify-between text-[10px] font-mono text-white/70">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span>Velocidad de Movimiento</span>
                    </div>
                    <span className="text-cyan-300 font-mono">
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
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Illumination / Glow Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-white/70">
                    <div className="flex items-center gap-1">
                      <SunMedium className="w-3 h-3 text-amber-400" />
                      <span>Iluminación & Resplandor</span>
                    </div>
                    <span className="text-amber-300 font-mono">
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
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Transition Smoothing Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-white/70">
                    <span>Tiempo de Transición / Inercia</span>
                    <span className="text-purple-300 font-mono">
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
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-purple-400"
                  />
                </div>

                {/* Quick Reset to Defaults */}
                <div className="pt-2 border-t border-white/[0.08] flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95"
                    title="Restablecer controles a valores originales"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
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
