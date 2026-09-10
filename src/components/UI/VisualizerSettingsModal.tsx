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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md pointer-events-auto select-none font-sans">
      <div
        className="w-full max-w-2xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] relative flex flex-col max-h-[90vh] overflow-hidden bg-[#090d18]"
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/80">
              <Sliders className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-white font-medium text-sm sm:text-base tracking-wide">
                Calibración del Visualizador
              </h2>
              <p className="text-white/40 text-[11px] font-mono tracking-wider mt-0.5">
                {isBlob ? 'Modo Activo: Rainbow Void (Canvas 2D)' : 'Modo Activo: Esfera 3D (WebGL / Three.js)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setVisualizerSettingsOpen(false)}
            className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Segmented Tab Switcher ── */}
        <div className="flex items-center p-0.5 my-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex-shrink-0">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'shapes'
                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Geometrías & Efectos</span>
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'params'
                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'colors'
                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                : 'text-white/50 hover:text-white/80'
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
              <div className="flex items-center p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setShapeModeView('sphere')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    shapeModeView === 'sphere'
                      ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                      : 'text-white/50 hover:text-white/80 border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                  <span>Geometrías Esfera 3D</span>
                  <span className="text-[10px] font-mono text-white/40 ml-1">({SPHERE_3D_GEOMETRIES.length})</span>
                </button>
                <button
                  onClick={() => setShapeModeView('blob')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    shapeModeView === 'blob'
                      ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                      : 'text-white/50 hover:text-white/80 border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                  <span>Efectos Rainbow Void</span>
                  <span className="text-[10px] font-mono text-white/40 ml-1">({RAINBOW_VOID_EFFECTS.length})</span>
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
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white/25 text-white shadow-sm ring-1 ring-white/20'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                            <span className="text-xs font-medium text-white/90">{geom.name}</span>
                          </div>
                          <span className="text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded border border-white/[0.08] text-white/60 bg-white/[0.02]">
                            {geom.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed">{geom.desc}</p>
                        <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-white/40 pt-1.5 border-t border-white/[0.04]">
                          <span>{geom.category}</span>
                          <span className={isSelected ? 'text-[#00e5ff] font-semibold' : ''}>
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
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white/25 text-white shadow-sm ring-1 ring-white/20'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                            <span className="text-xs font-medium text-white/90">{fx.name}</span>
                          </div>
                          <span className="text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded border border-white/[0.08] text-white/60 bg-white/[0.02]">
                            {fx.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed">{fx.desc}</p>
                        <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-white/40 pt-1.5 border-t border-white/[0.04]">
                          <span>{fx.category}</span>
                          <span className={isSelected ? 'text-[#00e5ff] font-semibold' : ''}>
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
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <CircleDot className="w-3.5 h-3.5 text-white/40" />
                      Escala 3D
                    </span>
                    <span className="font-mono tabular-nums text-white/90 text-xs font-medium">
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
                    className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                  />
                </div>

                {/* Escala Blob (Bloqueada a 0.50x) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-cyan-400/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Escala Rainbow Blob
                    </span>
                    <span className="font-mono tabular-nums text-cyan-300 text-xs font-medium flex items-center gap-1">
                      0.50x
                      <span className="text-[8px] bg-cyan-400/10 text-cyan-300 px-1 py-0.2 rounded font-mono uppercase tracking-widest">FIJO</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.5"
                    step="0.05"
                    value={0.5}
                    disabled
                    className="w-full h-1 bg-white/10 rounded cursor-not-allowed accent-cyan-400 opacity-60"
                  />
                  <p className="text-[10px] text-white/40 font-mono">Calibrado en 0.50x de referencia para renderizado puro</p>
                </div>

                {/* Opacidad */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-white/40" />
                      Opacidad de Partículas
                    </span>
                    <span className="font-mono tabular-nums text-white/90 text-xs font-medium">
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
                    className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                  />
                </div>

                {/* Velocidad / Sensibilidad de Audio */}
                <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-white/40" />
                      Sensibilidad de Audio
                    </span>
                    <span className="font-mono tabular-nums text-cyan-300 text-xs font-medium">
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
                    className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/30">
                    <span>0.60x (Suave)</span>
                    <span className="text-cyan-400">0.75x (Nominal)</span>
                    <span>0.85x (Punch)</span>
                  </div>
                </div>
              </div>

              {/* Toggles de Sincronización y Barras */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setLinkScales(!linkScales)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    linkScales
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    {linkScales ? <Link2 className="w-4 h-4 text-white" /> : <Unlink className="w-4 h-4 text-white/40" />}
                    <div>
                      <h4 className="text-xs font-medium text-white/90">Sincronizar Escalas</h4>
                      <p className="text-[10px] text-white/40">3D y 2D en tándem</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">
                    {linkScales ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => setShowFrequencyBars(!showFrequencyBars)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    showFrequencyBars
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <Activity className={`w-4 h-4 ${showFrequencyBars ? 'text-white' : 'text-white/40'}`} />
                    <div>
                      <h4 className="text-xs font-medium text-white/90">Anillo de Barras FFT</h4>
                      <p className="text-[10px] text-white/40">Barras de espectro 3D</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">
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
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-white/90">Modo Lúcido</h4>
                  <p className="text-[11px] text-white/40">Temas cromáticos y acentos reactivos</p>
                </div>
                <button
                  onClick={toggleLucidMode}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    isLucid
                      ? 'bg-white/10 border-white/25 text-white'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/50'
                  }`}
                >
                  {isLucid ? 'ACTIVO' : 'INACTIVO'}
                </button>
              </div>

              {/* Temas Lúcidos Disponibles */}
              {isLucid && (
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-white/40 block">
                    Temas Lúcidos:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LUCID_THEMES.map((theme) => {
                      const isSelected = lucidTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setLucidTheme(theme)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-white/10 border-white/25 text-white'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/70 hover:bg-white/[0.05]'
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
                            <span className="text-xs font-medium truncate">{theme.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paletas Profesionales Estándar con Swatches Cromáticos */}
              {!isLucid && (
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-white/40 block">
                    Paletas de Estudio Estándar:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROFESSIONAL_PALETTES.map((palette, idx) => {
                      const isSelected = currentPaletteIndex === idx;
                      return (
                        <button
                          key={palette.name}
                          onClick={() => setCurrentPaletteIndex(idx)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-white/10 border-white/25 text-white'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/70 hover:bg-white/[0.05]'
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
                            <span className="text-xs font-medium truncate text-white/90">{palette.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
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
