import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { CircleDot, Sun, Bot, Shapes, Link2, Unlink, Zap, Lock } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';
import { SPHERE_3D_GEOMETRIES, RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';
import { useAIDirectorPhase } from '../../services/aiSceneDirectorService';

interface VisualizerQuickControlsProps {
  className?: string;
  embedded?: boolean;
}

export const VisualizerQuickControls: React.FC<VisualizerQuickControlsProps> = React.memo(({ className = '', embedded = false }) => {
  const {
    visualizerMode,
    sphereShape,
    setSphereShape,
    blobShape,
    setBlobShape,
    autoMode,
    dynamicColor,
    toggleAutoMode,
    autoSensitivity,
    setAutoSensitivity,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
    sphereScale,
    setSphereScale,
    blobScale,
    setBlobScale,
    linkScales,
    setLinkScales,
    sphereOpacity,
    setSphereOpacity,
    audioSpeed,
    setAudioSpeed,
    musicSensitivity,
    setMusicSensitivity,
  } = usePlayerStore();

  const isBlob = visualizerMode === 'blob';
  const isWarp = visualizerMode === 'warp';
  const isSynthwave = visualizerMode === 'synthwave';
  const isTerrain = visualizerMode === 'terrain';
  const currentScale = isBlob ? blobScale : sphereScale;
  const setScale = isBlob ? setBlobScale : setSphereScale;
  const scaleLabel = isBlob ? 'Blob' : isWarp ? 'Warp' : isSynthwave ? 'Highway' : isTerrain ? 'Terrain' : '3D';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || 'var(--accent-cyan)') : 'var(--text-primary)';
  const aiPhase = useAIDirectorPhase();

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 text-caption select-none flex-wrap justify-center transition-all duration-base ${
        embedded
          ? 'px-1 py-0.5 bg-transparent'
          : 'px-3 py-1.5 rounded-dock shadow-dock bg-surface-dock material-regular border border-border-subtle'
      } ${className}`}
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* ── 1. Selector de Geometría / Efecto ── */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface-base/60 hover:bg-surface-base transition-colors border border-border-subtle min-h-11">
        <Shapes className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-caption font-mono tracking-wider px-1.5 py-0.5 rounded-badge bg-white/[0.04] text-text-secondary font-medium uppercase">
          {isBlob ? '2D VOID' : isWarp ? '3D WARP' : isSynthwave ? '3D ROAD' : isTerrain ? '3D TERRAIN' : '3D SPHERE'}
        </span>
        {isBlob ? (
          <select
            value={blobShape}
            aria-label="Efecto activo del Rainbow Void 2D"
            onChange={(e) => setBlobShape(e.target.value as VisualizerShape)}
            className="bg-transparent text-text-primary font-medium text-caption cursor-pointer focus:outline-none"
            title="Efecto activo del Rainbow Void 2D"
          >
            {RAINBOW_VOID_EFFECTS.map((fx) => (
              <option key={fx.id} value={fx.id} className="bg-surface-canvas text-text-primary">
                {fx.name} // {fx.tag}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={sphereShape}
            aria-label="Geometría activa de la Esfera 3D WebGL"
            onChange={(e) => setSphereShape(e.target.value as VisualizerShape)}
            className="bg-transparent text-text-primary font-medium text-caption cursor-pointer focus:outline-none"
            title="Geometría activa de la Esfera 3D WebGL"
          >
            {SPHERE_3D_GEOMETRIES.map((geom) => (
              <option key={geom.id} value={geom.id} className="bg-surface-canvas text-text-primary">
                {geom.name} // {geom.tag}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="h-4 w-px bg-border-subtle hidden sm:block" />

      {/* ── 2. Modo Auto Inteligente ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAutoMode}
          aria-label="Alternar modo inteligente DSP"
          className={`min-h-11 flex items-center gap-2 px-3 py-1.5 rounded-control text-caption font-medium transition-colors border btn-spring cursor-pointer ${
            autoMode
              ? 'bg-white/10 text-text-primary border-border-medium shadow-subtle'
              : 'bg-white/[0.02] text-text-tertiary hover:text-text-primary border-transparent hover:bg-white/[0.05]'
          }`}
          title="Modo Inteligente DSP: Clasificación musical por flujo espectral y coreografía de escena"
        >
          <Bot className="w-3.5 h-3.5" style={autoMode ? { color: dynamicColor || activeColor } : undefined} />
          {autoMode ? (
            <span className="flex items-center gap-1.5 font-mono">
              <span className="text-caption">AUTO</span>
              <span className="text-caption px-1.5 py-0.5 rounded-badge bg-accent-cyan/20 text-accent-cyan font-semibold tracking-wider uppercase border border-accent-cyan/30">
                {aiPhase}
              </span>
            </span>
          ) : (
            <span>Auto OFF</span>
          )}
        </button>

        {autoMode && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-control bg-surface-base/60 border border-border-subtle min-h-11" title="Sensibilidad del color dinámico">
            <span className="text-caption text-text-muted font-mono hidden sm:inline uppercase">Sens</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={autoSensitivity || 1.0}
              aria-label="Sensibilidad del color dinámico"
              onChange={(e) => setAutoSensitivity(parseFloat(e.target.value))}
              className="w-16 h-1 cursor-pointer"
              style={{ accentColor: dynamicColor || activeColor }}
            />
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-border-subtle hidden sm:block" />

      {/* ── Control de Escala del Visualizador ── */}
      {isBlob ? (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-surface-base/60 border border-accent-cyan/30 text-text-primary min-h-11"
          title="Escala Rainbow Void: Calibrada y bloqueada en 0.50x para máxima nitidez de shaders"
        >
          <Lock className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-caption font-mono text-accent-cyan font-tabular">
            0.50x <span className="text-caption text-text-muted uppercase tracking-widest ml-1 font-mono">CALIBRADO</span>
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-base/60 border border-border-subtle hover:bg-surface-base transition-colors min-h-11"
          onDoubleClick={() => setScale(1.0)}
          title={`${scaleLabel}: Doble clic para restablecer a 1.0x`}
        >
          <CircleDot className="w-3.5 h-3.5 text-text-muted" />
          <span className="hidden sm:inline text-caption text-text-tertiary">
            {scaleLabel} <span className="font-mono font-tabular text-text-primary font-medium">{(currentScale || 1.0).toFixed(1)}x</span>
          </span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={currentScale || 1.0}
            aria-label={`Escala de visualizador ${scaleLabel}`}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-16 h-1 rounded-pill cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLinkScales(!linkScales);
            }}
            className={`min-h-11 min-w-11 p-2 rounded-control transition-colors flex items-center justify-center cursor-pointer btn-spring ${
              linkScales
                ? 'text-text-primary bg-white/10'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
            }`}
            title={linkScales ? 'Escalas Vinculadas (Clic para desvincular)' : 'Escalas Independientes (Clic para vincular)'}
            aria-label="Vincular escalas"
          >
            {linkScales ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* ── 5. Sensibilidad / Velocidad de Audio (Solo visible en modo Blob) ── */}
      {isBlob && (
        <>
          <div className="h-4 w-px bg-border-subtle hidden sm:block" />
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-base/60 border border-border-subtle hover:bg-surface-base transition-colors min-h-11"
            title="Sensibilidad de Audio fija (Rango óptimo 0.60x - 0.85x, valor nominal 0.75x)"
          >
            <Zap className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="hidden sm:inline text-caption text-text-tertiary">
              Audio <span className="font-mono font-tabular text-accent-cyan font-medium">{currentSpeed.toFixed(2)}x</span>
            </span>
            <input
              type="range"
              min="0.60"
              max="0.85"
              step="0.05"
              value={Math.min(0.85, Math.max(0.60, currentSpeed))}
              aria-label="Sensibilidad de audio"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setAudioSpeed(val);
                setMusicSensitivity(val);
              }}
              className="w-16 h-1 rounded-pill cursor-pointer"
            />
          </div>
        </>
      )}

      <div className="h-4 w-px bg-border-subtle hidden sm:block" />

      {/* ── 6. Control de Opacidad ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-surface-base/60 border border-border-subtle hover:bg-surface-base transition-colors min-h-11">
        <Sun className="w-3.5 h-3.5 text-text-muted" />
        <span className="hidden sm:inline text-caption text-text-tertiary">
          <span className="font-mono font-tabular text-text-primary font-medium">{Math.round(sphereOpacity * 100)}%</span>
        </span>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          value={sphereOpacity}
          aria-label="Opacidad de visualizador"
          onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
          className="w-16 h-1 rounded-pill cursor-pointer"
          title={`Opacidad: ${Math.round(sphereOpacity * 100)}%`}
        />
      </div>

      {/* ── 7. Selector de Colores Lúcidos (Visible solo en Modo Lúcido) ── */}
      {isLucid && (
        <>
          <div className="h-4 w-px bg-border-subtle hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface-base/60 border border-border-subtle min-h-11">
            <input
              type="color"
              value={lucidPrimaryColor}
              aria-label="Color Primario Lúcido"
              onChange={(e) => setLucidPrimaryColor(e.target.value)}
              className="w-4 h-4 rounded-pill cursor-pointer border-0 p-0 bg-transparent"
              title="Color Primario Lúcido"
            />
            <input
              type="color"
              value={lucidSecondaryColor}
              aria-label="Color Secundario Lúcido"
              onChange={(e) => setLucidSecondaryColor(e.target.value)}
              className="w-4 h-4 rounded-pill cursor-pointer border-0 p-0 bg-transparent"
              title="Color Secundario Lúcido"
            />
          </div>
        </>
      )}
    </div>
  );
});

export default VisualizerQuickControls;
