import React, { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { CircleDot, Sun, Bot, Shapes, Link2, Unlink, Zap, Lock } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';
import { SPHERE_3D_GEOMETRIES, RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';
import { useAIDirectorPhase } from '../../services/aiSceneDirectorService';

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
  const currentScale = isBlob ? blobScale : sphereScale;
  const setScale = isBlob ? setBlobScale : setSphereScale;
  const scaleLabel = isBlob ? 'Blob' : '3D';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#ffffff';

  const aiPhase = useAIDirectorPhase();

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs select-none shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] flex-wrap justify-center transition-all duration-180 bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08]"
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* ── 1. Selector de Geometría / Efecto (Esfera 3D vs Rainbow Void) ── */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.06]">
        <Shapes className="w-3.5 h-3.5 text-white/50" />
        <span className="text-[9px] font-mono tracking-wider px-1 py-0.5 rounded bg-white/[0.06] text-white/70 font-semibold uppercase">
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
              <option key={fx.id} value={fx.id} className="bg-[#090d18] text-white">
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
              <option key={geom.id} value={geom.id} className="bg-[#090d18] text-white">
                {geom.name} // {geom.tag}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />

      {/* ── 2. Modo Auto Inteligente ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAutoMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
            autoMode
              ? 'bg-white/10 text-white border-white/20 shadow-sm'
              : 'bg-white/[0.02] text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.05]'
          }`}
          title="Modo Inteligente DSP: Clasificación musical por flujo espectral y coreografía de escena"
        >
          <Bot className="w-3.5 h-3.5" style={autoMode ? { color: dynamicColor || activeColor } : undefined} />
          {autoMode ? (
            <span className="flex items-center gap-1 font-mono">
              <span className="text-[10px]">AUTO</span>
              <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold tracking-wider uppercase border border-cyan-500/30">
                {aiPhase}
              </span>
            </span>
          ) : (
            <span>Auto OFF</span>
          )}
        </button>

        {autoMode && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]" title="Sensibilidad del color dinámico">
            <span className="text-[10px] text-white/40 font-mono hidden sm:inline uppercase">Sens</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={autoSensitivity || 1.0}
              onChange={(e) => setAutoSensitivity(parseFloat(e.target.value))}
              className="w-12 h-1 cursor-pointer accent-[#00e5ff]"
              style={{ accentColor: dynamicColor || activeColor }}
            />
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />

      {/* ── Control de Escala del Visualizador ── */}
      {isBlob ? (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-cyan-400/20 text-white/90"
          title="Escala Rainbow Void: Calibrada y bloqueada en 0.50x para máxima nitidez de shaders"
        >
          <Lock className="w-3 h-3 text-cyan-400" />
          <span className="text-[11px] font-mono text-cyan-300">
            0.50x <span className="text-[9px] text-white/40 uppercase tracking-widest ml-0.5">CALIBRADO</span>
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
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
      )}

      {/* ── 5. Sensibilidad / Velocidad de Audio (Solo visible en modo Blob) ── */}
      {isBlob && (
        <>
          <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
            title="Sensibilidad de Audio fija (Rango óptimo 0.60x - 0.85x, valor nominal 0.75x)"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px] text-white/50">
              Audio <span className="font-mono tabular-nums text-cyan-300 font-medium">{currentSpeed.toFixed(2)}x</span>
            </span>
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
              className="w-14 h-1 rounded cursor-pointer accent-cyan-400"
            />
          </div>
        </>
      )}

      <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />

      {/* ── 6. Control de Opacidad ── */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors">
        <Sun className="w-3.5 h-3.5 text-white/50" />
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
          <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
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
