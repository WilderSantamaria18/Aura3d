import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Activity, CircleDot, Eye, Bot, Shapes, Link2, Unlink, Zap } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';
import { SPHERE_3D_GEOMETRIES, RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';

export const VisualizerQuickControls: React.FC = React.memo(() => {
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
    showFrequencyBars,
    setShowFrequencyBars,
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

  if (visualizerMode === 'party') return null;

  const isBlob = visualizerMode === 'blob';
  const currentScale = isBlob ? blobScale : sphereScale;
  const setScale = isBlob ? setBlobScale : setSphereScale;
  const scaleLabel = isBlob ? 'Blob' : '3D';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#ffffff';

  return (
    <div
      className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-xl text-xs select-none shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex-wrap justify-center transition-all duration-180 bg-[#0A0A0F]/90 backdrop-blur-md border border-white/[0.08]"
      style={{ fontFeatureSettings: "'ss01'" }}
    >
      {/* ── 1. Selector Separado de Geometría / Efecto (Esfera 3D vs Rainbow Void) ── */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
        <Shapes className="w-3.5 h-3.5 text-white/50" />
        <span className="text-[9px] font-mono tracking-wider px-1 py-0.5 rounded bg-white/[0.06] text-white/60 font-semibold uppercase">
          {isBlob ? '2D VOID' : '3D SPHERE'}
        </span>
        {isBlob ? (
          <select
            value={blobShape}
            onChange={(e) => setBlobShape(e.target.value as VisualizerShape)}
            className="bg-transparent text-white/90 font-medium text-[11px] focus:outline-none cursor-pointer"
            title="Efecto activo del Rainbow Void 2D"
          >
            {RAINBOW_VOID_EFFECTS.map((fx) => (
              <option key={fx.id} value={fx.id} className="bg-[#0b0e1b] text-white">
                {fx.name} // {fx.tag}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={sphereShape}
            onChange={(e) => setSphereShape(e.target.value as VisualizerShape)}
            className="bg-transparent text-white/90 font-medium text-[11px] focus:outline-none cursor-pointer"
            title="Geometría activa de la Esfera 3D WebGL"
          >
            {SPHERE_3D_GEOMETRIES.map((geom) => (
              <option key={geom.id} value={geom.id} className="bg-[#0b0e1b] text-white">
                {geom.name} // {geom.tag}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

      {/* ── 2. Modo Auto Inteligente ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAutoMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
            autoMode
              ? 'bg-white/10 text-white border-white/20 shadow-sm'
              : 'bg-white/[0.03] text-white/50 hover:text-white/80 border-transparent'
          }`}
          title="Modo Inteligente: color dinámico fluido orgánico"
        >
          <Bot className="w-3.5 h-3.5" style={autoMode ? { color: dynamicColor || activeColor } : undefined} />
          <span>Auto {autoMode ? 'ON' : 'OFF'}</span>
        </button>

        {autoMode && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]" title="Sensibilidad del color dinámico">
            <span className="text-[10px] text-white/40 font-mono hidden sm:inline">Sens:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={autoSensitivity || 1.0}
              onChange={(e) => setAutoSensitivity(parseFloat(e.target.value))}
              className="w-12 h-1 cursor-pointer"
              style={{ accentColor: dynamicColor || activeColor }}
            />
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

      {/* ── 3. Toggle Barras FFT 3D ── */}
      <button
        onClick={() => setShowFrequencyBars(!showFrequencyBars)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
          showFrequencyBars
            ? 'bg-white/10 text-white border-white/20'
            : 'bg-white/[0.03] text-white/50 hover:text-white/80 border-transparent'
        }`}
        title="Activar / Desactivar Anillo de Barras FFT 3D"
      >
        <Activity className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Barras 3D</span>
      </button>

      <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

      {/* ── 4. Control de Escala del Visualizador ── */}
      <div
        className="flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition-colors"
        onDoubleClick={() => setScale(1.0)}
        title={`${scaleLabel}: Doble clic para restablecer a 1.0x`}
      >
        <CircleDot className="w-3.5 h-3.5 text-white/50" />
        <span className="hidden sm:inline text-[11px] text-white/50">
          {scaleLabel} <span className="font-mono tabular-nums text-white/90 font-medium">{(currentScale || 1.0).toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.05"
          value={currentScale || 1.0}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="w-14 sm:w-16 h-1 rounded cursor-pointer accent-white"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLinkScales(!linkScales);
          }}
          className={`p-1 rounded transition-colors ${
            linkScales
              ? 'text-white bg-white/10'
              : 'text-white/30 hover:text-white/70 hover:bg-white/5'
          }`}
          title={linkScales ? 'Escalas Vinculadas (Clic para desvincular)' : 'Escalas Independientes (Clic para vincular)'}
          aria-label="Vincular escalas"
        >
          {linkScales ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
        </button>
      </div>

      {/* ── 5. Sensibilidad / Velocidad de Audio (Solo visible en modo Blob) ── */}
      {isBlob && (
        <>
          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
          <div
            className="flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            onDoubleClick={() => {
              setAudioSpeed(0.75);
              setMusicSensitivity(0.75);
            }}
            title="Velocidad de Audio: Doble clic para restablecer a 0.75x"
          >
            <Zap className="w-3.5 h-3.5 text-white/50" />
            <span className="hidden sm:inline text-[11px] text-white/50">
              Audio <span className="font-mono tabular-nums text-white/90 font-medium">{currentSpeed.toFixed(2)}x</span>
            </span>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={currentSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setAudioSpeed(val);
                setMusicSensitivity(val);
              }}
              className="w-14 h-1 rounded cursor-pointer accent-white"
            />
          </div>
        </>
      )}

      <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

      {/* ── 6. Control de Opacidad ── */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/[0.04] transition-colors">
        <Eye className="w-3.5 h-3.5 text-white/50" />
        <span className="hidden sm:inline text-[11px] text-white/50">
          <span className="font-mono tabular-nums text-white/90 font-medium">{Math.round(sphereOpacity * 100)}%</span>
        </span>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          value={sphereOpacity}
          onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
          className="w-12 sm:w-14 h-1 rounded cursor-pointer accent-white"
          title={`Opacidad: ${Math.round(sphereOpacity * 100)}%`}
        />
      </div>

      {/* ── 7. Selector de Colores Lúcidos (Visible solo en Modo Lúcido) ── */}
      {isLucid && (
        <>
          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <input
              type="color"
              value={lucidPrimaryColor}
              onChange={(e) => setLucidPrimaryColor(e.target.value)}
              className="w-3.5 h-3.5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
              title="Color Primario Lúcido"
            />
            <input
              type="color"
              value={lucidSecondaryColor}
              onChange={(e) => setLucidSecondaryColor(e.target.value)}
              className="w-3.5 h-3.5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
              title="Color Secundario Lúcido"
            />
          </div>
        </>
      )}
    </div>
  );
});

export default VisualizerQuickControls;
