import React, { useState } from 'react';
import {
  X,
  Shapes,
  Sliders,
  Palette,
  Eye,
  CircleDot,
  Activity,
  Check,
  Link2,
  Unlink,
  Zap,
  Lock,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES, LUCID_THEMES } from '../../types/audio';
import { SPHERE_3D_GEOMETRIES, RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';

export const VisualizerSettingsModal: React.FC = () => {
  const {
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    visualizerMode,
    sphereShape,
    setSphereShape,
    blobShape,
    setBlobShape,
    sphereScale,
    setSphereScale,
    linkScales,
    setLinkScales,
    sphereOpacity,
    setSphereOpacity,
    audioSpeed,
    setAudioSpeed,
    musicSensitivity,
    setMusicSensitivity,
    showFrequencyBars,
    setShowFrequencyBars,
    currentPaletteIndex,
    setCurrentPaletteIndex,
    isLucid,
    lucidTheme,
    setLucidTheme,
    toggleLucidMode,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'shapes' | 'params' | 'colors'>('shapes');
  const [shapeModeView, setShapeModeView] = useState<'sphere' | 'blob'>(
    visualizerMode === 'blob' ? 'blob' : 'sphere'
  );

  if (!isVisualizerSettingsOpen) return null;

  const isBlob = visualizerMode === 'blob';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-surface-scrim material-regular pointer-events-auto select-none font-sans animate-aura-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Calibración del Visualizador"
    >
      <div
        className="w-full max-w-2xl border border-border-subtle rounded-modal p-4 sm:p-5 shadow-[var(--shadow-modal)] relative flex flex-col max-h-[90vh] overflow-hidden bg-surface-overlay material-thick animate-aura-modal"
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-ios-teal shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-text-primary font-bold text-sm sm:text-base tracking-tight">
                Calibración del Visualizador
              </h2>
              <p className="text-text-tertiary text-caption font-mono tracking-wider mt-0.5">
                {isBlob ? 'Modo Activo: Rainbow Void (Canvas 2D)' : 'Modo Activo: Esfera 3D (WebGL / Three.js)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setVisualizerSettingsOpen(false)}
            className="min-h-11 min-w-11 text-text-tertiary hover:text-text-primary rounded-control hover:bg-surface-subtle transition-colors flex items-center justify-center"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Segmented Tab Switcher ── */}
        <div className="flex items-center p-1 my-3 rounded-control bg-surface-subtle border border-border-subtle flex-shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
              activeTab === 'shapes'
                ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Geometrías & Efectos</span>
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
              activeTab === 'params'
                ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 py-1.5 rounded-control text-caption font-medium transition-colors ${
              activeTab === 'colors'
                ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paletas & Lucid</span>
          </button>
        </div>

        {/* ── Scrollable Tab Content ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-1 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {/* TAB 1: GEOMETRÍAS Y EFECTOS SEPARADOS */}
          {activeTab === 'shapes' && (
            <div className="space-y-3">
              {/* Sub-selector para alternar entre Esfera 3D y Rainbow Void */}
              <div className="flex items-center p-1 rounded-control bg-surface-subtle border border-border-subtle gap-1">
                <button
                  onClick={() => setShapeModeView('sphere')}
                  className={`flex-1 min-h-11 py-1.5 px-3 rounded-control text-caption font-medium flex items-center justify-center gap-2 transition-colors ${
                    shapeModeView === 'sphere'
                      ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                      : 'text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-ios-teal" />
                  <span>Geometrías Esfera 3D</span>
                  <span className="text-caption font-mono text-text-tertiary ml-1">({SPHERE_3D_GEOMETRIES.length})</span>
                </button>
                <button
                  onClick={() => setShapeModeView('blob')}
                  className={`flex-1 min-h-11 py-1.5 px-3 rounded-control text-caption font-medium flex items-center justify-center gap-2 transition-colors ${
                    shapeModeView === 'blob'
                      ? 'bg-surface-active text-text-primary border border-border-strong shadow-sm'
                      : 'text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-ios-teal" />
                  <span>Efectos Rainbow Void</span>
                  <span className="text-caption font-mono text-text-tertiary ml-1">({RAINBOW_VOID_EFFECTS.length})</span>
                </button>
              </div>

              {/* Vista 1: Geometrías Esfera 3D (Three.js / WebGL) */}
              {shapeModeView === 'sphere' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPHERE_3D_GEOMETRIES.map((geom) => {
                    const isSelected = sphereShape === geom.id;
                    return (
                      <button
                        key={geom.id}
                        onClick={() => setSphereShape(geom.id)}
                        className={`min-h-11 p-3 rounded-card border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-surface-active border-ios-teal text-text-primary shadow-sm ring-1 ring-ios-teal/30'
                            : 'bg-surface-subtle border-border-subtle hover:bg-surface-active text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-ios-teal flex-shrink-0" />}
                            <span className="text-caption font-medium text-text-primary">{geom.name}</span>
                          </div>
                          <span className="text-caption font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-badge border border-border-subtle text-text-tertiary bg-surface-subtle">
                            {geom.tag}
                          </span>
                        </div>
                        <p className="text-caption text-text-tertiary leading-relaxed">{geom.desc}</p>
                        <div className="mt-2 flex items-center justify-between text-caption font-mono text-text-tertiary pt-1.5 border-t border-border-subtle">
                          <span>{geom.category}</span>
                          <span className={isSelected ? 'text-ios-teal font-semibold' : ''}>
                            {isSelected ? 'ACTIVO 3D' : 'SELECCIONAR'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Vista 2: Efectos Rainbow Void 2D (Canvas 2D) */}
              {shapeModeView === 'blob' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RAINBOW_VOID_EFFECTS.map((fx) => {
                    const isSelected = blobShape === fx.id;
                    return (
                      <button
                        key={fx.id}
                        onClick={() => setBlobShape(fx.id)}
                        className={`min-h-11 p-3 rounded-card border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-surface-active border-ios-teal text-text-primary shadow-sm ring-1 ring-ios-teal/30'
                            : 'bg-surface-subtle border-border-subtle hover:bg-surface-active text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-ios-teal flex-shrink-0" />}
                            <span className="text-caption font-medium text-text-primary">{fx.name}</span>
                          </div>
                          <span className="text-caption font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-badge border border-border-subtle text-text-tertiary bg-surface-subtle">
                            {fx.tag}
                          </span>
                        </div>
                        <p className="text-caption text-text-tertiary leading-relaxed">{fx.desc}</p>
                        <div className="mt-2 flex items-center justify-between text-caption font-mono text-text-tertiary pt-1.5 border-t border-border-subtle">
                          <span>{fx.category}</span>
                          <span className={isSelected ? 'text-ios-teal font-semibold' : ''}>
                            {isSelected ? 'ACTIVO VOID' : 'SELECCIONAR'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARÁMETROS */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              {/* Grid 2 Columnas de Sliders de Precisión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Escala 3D */}
                <div className="space-y-1.5 p-3 rounded-card bg-surface-subtle border border-border-subtle">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <CircleDot className="w-3.5 h-3.5 text-text-tertiary" />
                      Escala 3D
                    </span>
                    <span className="font-mono font-tabular text-text-primary text-caption font-medium">
                      {(sphereScale || 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={sphereScale || 1.0}
                    onChange={(e) => setSphereScale(parseFloat(e.target.value))}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Escala 3D"
                  />
                </div>

                {/* Escala Blob (Bloqueada a 0.50x) */}
                <div className="space-y-1.5 p-3 rounded-card bg-surface-subtle border border-ios-teal/20">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-ios-teal" />
                      Escala Rainbow Blob
                    </span>
                    <span className="font-mono font-tabular text-ios-teal text-caption font-medium flex items-center gap-1">
                      0.50x
                      <span className="text-caption bg-ios-teal/15 text-ios-teal px-1 py-0.2 rounded-badge font-mono uppercase tracking-widest">FIJO</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.5"
                    step="0.05"
                    value={0.5}
                    disabled
                    className="w-full h-11 bg-transparent cursor-not-allowed accent-ios-teal opacity-60"
                    aria-label="Escala Rainbow Blob"
                  />
                  <p className="text-caption text-text-tertiary font-mono">Calibrado en 0.50x de referencia para renderizado puro</p>
                </div>

                {/* Opacidad */}
                <div className="space-y-1.5 p-3 rounded-card bg-surface-subtle border border-border-subtle">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-text-tertiary" />
                      Opacidad de Partículas
                    </span>
                    <span className="font-mono font-tabular text-text-primary text-caption font-medium">
                      {Math.round(sphereOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={sphereOpacity}
                    onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Opacidad de partículas"
                  />
                </div>

                {/* Velocidad / Sensibilidad de Audio */}
                <div className="space-y-1.5 p-3 rounded-card bg-surface-subtle border border-border-subtle">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-text-tertiary" />
                      Sensibilidad de Audio
                    </span>
                    <span className="font-mono font-tabular text-ios-teal text-caption font-medium">
                      {Math.min(0.85, Math.max(0.60, currentSpeed)).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.60"
                    max="0.85"
                    step="0.05"
                    value={Math.min(0.85, Math.max(0.60, currentSpeed))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAudioSpeed(val);
                      setMusicSensitivity(val);
                    }}
                    className="w-full h-11 bg-transparent cursor-pointer accent-ios-teal"
                    aria-label="Sensibilidad de audio"
                  />
                  <div className="flex justify-between text-caption font-mono text-text-tertiary">
                    <span>0.60x (Suave)</span>
                    <span className="text-ios-teal">0.75x (Nominal)</span>
                    <span>0.85x (Punch)</span>
                  </div>
                </div>
              </div>

              {/* Toggles de Sincronización y Barras */}
              <div className="pt-2 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setLinkScales(!linkScales)}
                  className={`min-h-11 p-3 rounded-card border flex items-center justify-between transition-colors ${
                    linkScales
                      ? 'bg-surface-active border-border-strong text-text-primary'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-active'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    {linkScales ? <Link2 className="w-4 h-4 text-text-primary" /> : <Unlink className="w-4 h-4 text-text-tertiary" />}
                    <div>
                      <h4 className="text-caption font-medium text-text-primary">Sincronizar Escalas</h4>
                      <p className="text-caption text-text-tertiary">3D y 2D en tándem</p>
                    </div>
                  </div>
                  <span className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                    {linkScales ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => setShowFrequencyBars(!showFrequencyBars)}
                  className={`min-h-11 p-3 rounded-card border flex items-center justify-between transition-colors ${
                    showFrequencyBars
                      ? 'bg-surface-active border-border-strong text-text-primary'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-active'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <Activity className={`w-4 h-4 ${showFrequencyBars ? 'text-text-primary' : 'text-text-tertiary'}`} />
                    <div>
                      <h4 className="text-caption font-medium text-text-primary">Anillo de Barras FFT</h4>
                      <p className="text-caption text-text-tertiary">Espectro reactivo</p>
                    </div>
                  </div>
                  <span className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                    {showFrequencyBars ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PALETAS & MODO LÚCIDO */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              {/* Modo Lúcido Toggle */}
              <div className="p-3 rounded-card bg-surface-subtle border border-border-subtle flex items-center justify-between">
                <div>
                  <h4 className="text-caption font-medium text-text-primary">Modo Lúcido</h4>
                  <p className="text-caption text-text-tertiary">Temas cromáticos y acentos reactivos</p>
                </div>
                <button
                  onClick={toggleLucidMode}
                  className={`min-h-11 px-3 py-1 rounded-control text-caption font-mono font-medium border transition-colors ${
                    isLucid
                      ? 'bg-ios-teal/20 border-ios-teal/40 text-ios-teal'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary'
                  }`}
                >
                  {isLucid ? 'ACTIVO' : 'INACTIVO'}
                </button>
              </div>

              {/* Temas Lúcidos Disponibles */}
              {isLucid && (
                <div className="space-y-2">
                  <span className="text-caption uppercase tracking-wider font-mono text-text-tertiary block">
                    Temas Lúcidos:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LUCID_THEMES.map((theme) => {
                      const isSelected = lucidTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setLucidTheme(theme)}
                          className={`min-h-11 p-2.5 rounded-card border text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-surface-active border-ios-teal text-text-primary shadow-sm'
                              : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-active'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="flex items-center -space-x-1.5 flex-shrink-0"
                              title={`${theme.name} (${theme.primary} & ${theme.secondary})`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/60 shadow-sm"
                                style={{ backgroundColor: theme.primary }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/60 shadow-sm"
                                style={{ backgroundColor: theme.secondary }}
                              />
                            </div>
                            <span className="text-caption font-medium truncate">{theme.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-text-primary flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paletas Profesionales Estándar con Swatches Cromáticos */}
              {!isLucid && (
                <div className="space-y-2">
                  <span className="text-caption uppercase tracking-wider font-mono text-text-tertiary block">
                    Paletas de Estudio Estándar:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROFESSIONAL_PALETTES.map((palette, idx) => {
                      const isSelected = currentPaletteIndex === idx;
                      return (
                        <button
                          key={palette.name}
                          onClick={() => setCurrentPaletteIndex(idx)}
                          className={`min-h-11 p-2.5 rounded-card border text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-surface-active border-ios-teal text-text-primary shadow-sm'
                              : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-active'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Swatch de 4 colores */}
                            <div className="flex items-center -space-x-1 flex-shrink-0">
                              {palette.colors.map((c, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-3 h-3 rounded-full border border-black/40"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <span className="text-caption font-medium truncate text-text-primary">{palette.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-ios-teal flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizerSettingsModal;
