import React, { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { CircleDot, Sun, Bot, Shapes, Link2, Unlink, Zap, Lock, Sliders } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';
import { RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';
import { useAIDirectorPhase } from '../../services/aiSceneDirectorService';
import { useShallow } from 'zustand/react/shallow';

interface VisualizerQuickControlsProps {
  className?: string;
  embedded?: boolean;
}

export const VisualizerQuickControls: React.FC<VisualizerQuickControlsProps> = React.memo(({ className = '', embedded = false }) => {
  const {
    visualizerMode,
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
    blobSettings,
    updateBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
  } = usePlayerStore(
    useShallow((s) => ({
      visualizerMode: s.visualizerMode,
      blobShape: s.blobShape,
      setBlobShape: s.setBlobShape,
      autoMode: s.autoMode,
      dynamicColor: s.dynamicColor,
      toggleAutoMode: s.toggleAutoMode,
      autoSensitivity: s.autoSensitivity,
      setAutoSensitivity: s.setAutoSensitivity,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      lucidPrimaryColor: s.lucidPrimaryColor,
      lucidSecondaryColor: s.lucidSecondaryColor,
      setLucidPrimaryColor: s.setLucidPrimaryColor,
      setLucidSecondaryColor: s.setLucidSecondaryColor,
      sphereScale: s.sphereScale,
      setSphereScale: s.setSphereScale,
      blobScale: s.blobScale,
      setBlobScale: s.setBlobScale,
      linkScales: s.linkScales,
      setLinkScales: s.setLinkScales,
      sphereOpacity: s.sphereOpacity,
      setSphereOpacity: s.setSphereOpacity,
      audioSpeed: s.audioSpeed,
      setAudioSpeed: s.setAudioSpeed,
      musicSensitivity: s.musicSensitivity,
      setMusicSensitivity: s.setMusicSensitivity,
      blobSettings: s.blobSettings,
      updateBlobSettings: s.updateBlobSettings,
      isBlobPanelOpen: s.isBlobPanelOpen,
      setBlobPanelOpen: s.setBlobPanelOpen,
    }))
  );

  const isBlob = visualizerMode === 'blob';
  const isSynthwave = visualizerMode === 'synthwave';
  const isTerrain = visualizerMode === 'terrain';
  const currentScale = isBlob ? blobScale : sphereScale;
  const setScale = isBlob ? setBlobScale : setSphereScale;
  const scaleLabel = isBlob ? 'Blob' : isSynthwave ? 'Highway' : isTerrain ? 'Terrain' : 'Visualizador';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#ffffff';

  const aiPhase = useAIDirectorPhase();

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 text-xs select-none flex-wrap justify-center transition-all duration-200 ${
        embedded
          ? 'px-1 py-0.5 bg-transparent'
          : 'px-2.5 sm:px-3 py-1 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] bg-[#070913]/60 backdrop-blur-2xl border border-white/[0.05] border-t-white/[0.10]'
      } ${className}`}
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* ── 1. Selector de Geometría / Efecto / Estilo según Visualizador Activo ── */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/[0.04]">
        <Shapes className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[9px] font-mono tracking-[0.16em] px-1 py-0.2 rounded bg-white/[0.04] text-white/60 font-medium uppercase">
          {isBlob ? '2D VOID' : isSynthwave ? '3D ROAD' : '3D TERRAIN'}
        </span>
        {isBlob && (
          <div className="flex items-center gap-1">
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
            <button
              type="button"
              onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
              className={`p-1 rounded-md transition-all border cursor-pointer ${
                isBlobPanelOpen
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Configuración y Calibración de Rainbow Void"
              aria-label="Abrir estudio Rainbow Void"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        )}
        {isSynthwave && (
          <select
            value={blobSettings?.synthwaveTheme ?? 'outrun'}
            onChange={(e) => updateBlobSettings({ synthwaveTheme: e.target.value as any })}
            className="bg-transparent text-white/90 font-medium text-[11px] focus:outline-none cursor-pointer"
            title="Tema y Paleta de la Carretera Retrowave"
          >
            <option value="outrun" className="bg-[#090d18] text-white">Outrun Neon</option>
            <option value="cyber" className="bg-[#090d18] text-white">Cyber Matrix</option>
            <option value="vaporwave" className="bg-[#090d18] text-white">Vaporwave Sunset</option>
            <option value="sunset_overdrive" className="bg-[#090d18] text-white">Sunset Overdrive</option>
          </select>
        )}
        {isTerrain && (
          <select
            value={blobSettings?.terrainStyle ?? 'wireframe'}
            onChange={(e) => updateBlobSettings({ terrainStyle: e.target.value as any })}
            className="bg-transparent text-white/90 font-medium text-[11px] focus:outline-none cursor-pointer"
            title="Estilo de Malla del Terreno Cyberpunk"
          >
            <option value="wireframe" className="bg-[#090d18] text-white">Malla Wireframe</option>
            <option value="dual_mesh" className="bg-[#090d18] text-white">Dual Tron Shaded</option>
            <option value="surface" className="bg-[#090d18] text-white">Superficie Metálica</option>
            <option value="points" className="bg-[#090d18] text-white">Matriz de Puntos</option>
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

      {/* ── 5. Sensibilidad / Velocidad de Audio ── */}
      <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
        title="Sensibilidad reactiva de Audio (0.40x - 1.80x, nominal 1.00x)"
      >
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline text-[11px] text-white/50">
          Audio <span className="font-mono tabular-nums text-cyan-300 font-medium">{currentSpeed.toFixed(2)}x</span>
        </span>
        <input
          type="range"
          min="0.40"
          max="1.80"
          step="0.05"
          value={Math.min(1.80, Math.max(0.40, currentSpeed))}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setAudioSpeed(val);
            setMusicSensitivity(val);
          }}
          className="w-14 h-1 rounded cursor-pointer accent-cyan-400"
        />
      </div>

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
