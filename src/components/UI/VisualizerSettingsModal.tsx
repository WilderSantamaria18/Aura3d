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
  Sun,
  Mountain,
  Orbit,
  Sparkles,
  Camera,
  Palmtree,
} from 'lucide-react';
import { usePlayerStore, type CameraPreset } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES, LUCID_THEMES, type VisualizerMode } from '../../types/audio';
import { RAINBOW_VOID_EFFECTS } from '../../config/visualPresets';
import { VoidFxCustomizer } from './VoidFxCustomizer';
import { useShallow } from 'zustand/react/shallow';

const VISUALIZER_MODES = [
  { id: 'blob' as VisualizerMode, label: 'Rainbow Void', icon: Sparkles, tag: 'Canvas 2D' },
  { id: 'synthwave' as VisualizerMode, label: 'Synthwave Grid', icon: Sun, tag: 'Outrun 3D' },
  { id: 'terrain' as VisualizerMode, label: 'Cyber Terrain', icon: Mountain, tag: 'Topografía 3D' },
];

export const VisualizerSettingsModal: React.FC = () => {
  const {
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    visualizerMode,
    setVisualizerMode,
    blobShape,
    setBlobShape,
    blobSettings,
    updateBlobSettings,
    cameraPreset,
    setCameraPreset,
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
  } = usePlayerStore(
    useShallow((s) => ({
      isVisualizerSettingsOpen: s.isVisualizerSettingsOpen,
      setVisualizerSettingsOpen: s.setVisualizerSettingsOpen,
      visualizerMode: s.visualizerMode,
      setVisualizerMode: s.setVisualizerMode,
      blobShape: s.blobShape,
      setBlobShape: s.setBlobShape,
      blobSettings: s.blobSettings,
      updateBlobSettings: s.updateBlobSettings,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      sphereScale: s.sphereScale,
      setSphereScale: s.setSphereScale,
      linkScales: s.linkScales,
      setLinkScales: s.setLinkScales,
      sphereOpacity: s.sphereOpacity,
      setSphereOpacity: s.setSphereOpacity,
      audioSpeed: s.audioSpeed,
      setAudioSpeed: s.setAudioSpeed,
      musicSensitivity: s.musicSensitivity,
      setMusicSensitivity: s.setMusicSensitivity,
      showFrequencyBars: s.showFrequencyBars,
      setShowFrequencyBars: s.setShowFrequencyBars,
      currentPaletteIndex: s.currentPaletteIndex,
      setCurrentPaletteIndex: s.setCurrentPaletteIndex,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      setLucidTheme: s.setLucidTheme,
      toggleLucidMode: s.toggleLucidMode,
    }))
  );

  const [activeTab, setActiveTab] = useState<'shapes' | 'params' | 'colors'>('shapes');

  if (!isVisualizerSettingsOpen) return null;

  const isBlob = visualizerMode === 'blob';
  const isSynthwave = visualizerMode === 'synthwave';
  const isTerrain = visualizerMode === 'terrain';
  const currentSpeed = audioSpeed || musicSensitivity || 0.75;

  const currentModeInfo = VISUALIZER_MODES.find((m) => m.id === visualizerMode) || VISUALIZER_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md pointer-events-auto select-none font-sans animate-aura-backdrop">
      <div
        className="w-full max-w-2xl liquid-glass liquid-glass--modal relative flex flex-col max-h-[92vh] overflow-hidden animate-aura-modal"
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="glass-item is-active !rounded-2xl w-9 h-9 flex items-center justify-center text-cyan-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm sm:text-base tracking-tight">
                Calibración del Visualizador
              </h2>
              <p className="text-cyan-300/80 text-[11px] font-mono tracking-wider mt-0.5 flex items-center gap-1.5">
                <span>Modo Activo:</span>
                <span className="font-semibold text-white">{currentModeInfo.label}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentModeInfo.tag}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setVisualizerSettingsOpen(false)}
            className="glass-btn min-h-[36px] min-w-[36px] flex items-center justify-center text-white/70 hover:text-white"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Selector de Visualizador Activo (Pills Superiores) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 pb-1 flex-shrink-0">
          {VISUALIZER_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = visualizerMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setVisualizerMode(mode.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/40 text-white shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-300' : 'text-white/40'}`} />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-tight truncate leading-tight">{mode.label}</div>
                  <div className="text-[9px] font-mono text-white/40 truncate">{mode.tag}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Segmented Tab Switcher ── */}
        <div className="glass-input !rounded-2xl flex items-center p-1 my-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 min-h-[32px] rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'shapes'
                ? 'bg-gradient-to-b from-white/30 to-white/10 text-white border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)]'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>Diseño & Estilo</span>
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 min-h-[32px] rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'params'
                ? 'bg-gradient-to-b from-white/30 to-white/10 text-white border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)]'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Dinámica & Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 min-h-[32px] rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'colors'
                ? 'bg-gradient-to-b from-white/30 to-white/10 text-white border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)]'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paletas & Lúcido</span>
          </button>
        </div>

        {/* ── Scrollable Tab Content ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-1 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {/* TAB 1: DISEÑO Y GEOMETRÍA (Específico de cada visualizador) */}
          {activeTab === 'shapes' && (
            <div className="space-y-4">
              {/* ── OPCIONES RAINBOW VOID 2D ── */}
              {isBlob && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {RAINBOW_VOID_EFFECTS.map((fx) => {
                      const isSelected = blobShape === fx.id;
                      return (
                        <button
                          key={fx.id}
                          onClick={() => setBlobShape(fx.id)}
                          className={`glass-item !rounded-2xl px-3.5 py-3 min-h-[92px] text-left flex flex-col justify-between gap-2 cursor-pointer ${
                            isSelected ? 'is-active text-white' : 'text-white/75'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                              <span className="text-[13px] font-semibold tracking-tight text-white">{fx.name}</span>
                            </div>
                            <p className="text-[11px] text-white/55 leading-snug mt-1 line-clamp-2">{fx.desc}</p>
                          </div>
                          <span className="text-[9px] font-mono tracking-[0.14em] uppercase text-white/45">{fx.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                  <VoidFxCustomizer showShockwave />
                </div>
              )}

              {/* ── OPCIONES SYNTHWAVE GRID 3D ── */}
              {isSynthwave && (
                <div className="space-y-4">
                  {/* Temas Retrowave */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Temas de Color Retrowave
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'outrun', name: 'Outrun Neon', colors: ['#ff007f', '#00f0ff', '#ffe600'], desc: 'Rosa neón y cian cyberpunk clásico' },
                        { id: 'cyber', name: 'Cyber Matrix', colors: ['#00ff66', '#00e5ff', '#003311'], desc: 'Líneas esmeralda y atmósfera oscura' },
                        { id: 'vaporwave', name: 'Vaporwave Sunset', colors: ['#ff71ce', '#01cdfe', '#b967ff'], desc: 'Púrpura y rosas pastel etéreos' },
                        { id: 'sunset_overdrive', name: 'Sunset Overdrive', colors: ['#ff3b00', '#ff0078', '#ffaa00'], desc: 'Atardecer ardiente magenta y naranja' },
                      ].map((t) => {
                        const isSelected = (blobSettings?.synthwaveTheme ?? 'outrun') === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => updateBlobSettings({ synthwaveTheme: t.id as any })}
                            className={`glass-item !rounded-2xl p-3 text-left flex flex-col justify-between gap-1.5 cursor-pointer ${
                              isSelected ? 'is-active text-white' : 'text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center -space-x-1">
                                  {t.colors.map((c, i) => (
                                    <span key={i} className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: c }} />
                                  ))}
                                </div>
                                <span className="text-xs font-semibold text-white">{t.name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-white/50 leading-tight">{t.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estilo del Sol 80s */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Estilo del Sol Audio-Reactivo
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'venetian', name: 'Sol Veneciano', desc: 'Ranuras horizontales con escaneo hacia abajo' },
                        { id: 'corona', name: 'Corona Solar', desc: 'Llamaradas y explosiones solares con graves y agudos' },
                        { id: 'wireframe', name: 'Esfera Wireframe', desc: 'Orbe 3D vectorial en rotación con líneas de latitud' },
                        { id: 'eclipse', name: 'Eclipse Total', desc: 'Sol de obsidiana negra con fulgor exterior de neón' },
                      ].map((s) => {
                        const isSelected = (blobSettings?.synthwaveSunStyle ?? 'venetian') === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => updateBlobSettings({ synthwaveSunStyle: s.id as any })}
                            className={`glass-item !rounded-2xl p-3 text-left flex flex-col justify-between gap-1.5 cursor-pointer ${
                              isSelected ? 'is-active text-white' : 'text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">{s.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-white/50 leading-tight">{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Físicas y Elementos del Entorno */}
                  <div className="glass-card !p-3.5 space-y-3">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Física de Carretera y Elementos 3D
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Velocidad */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Velocidad de Carretera</span>
                          <span className="font-mono text-cyan-300 text-xs">
                            {(blobSettings?.synthwaveSpeed ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.1"
                          value={blobSettings?.synthwaveSpeed ?? 1.0}
                          onChange={(e) => updateBlobSettings({ synthwaveSpeed: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                        />
                      </div>

                      {/* Curvatura S */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Curvatura Dinámica S</span>
                          <span className="font-mono text-cyan-300 text-xs">
                            {(blobSettings?.synthwaveCurveIntensity ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="2.5"
                          step="0.1"
                          value={blobSettings?.synthwaveCurveIntensity ?? 1.0}
                          onChange={(e) => updateBlobSettings({ synthwaveCurveIntensity: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateBlobSettings({ synthwaveMountains: !(blobSettings?.synthwaveMountains ?? true) })}
                        className={`glass-item !rounded-xl p-2.5 flex items-center justify-between cursor-pointer ${
                          (blobSettings?.synthwaveMountains ?? true) ? 'is-active text-white' : 'text-white/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Mountain className="w-3.5 h-3.5 text-cyan-300" />
                          <span className="text-xs font-medium">Montañas Wireframe</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/50">
                          {(blobSettings?.synthwaveMountains ?? true) ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        onClick={() => updateBlobSettings({ synthwavePalms: !(blobSettings?.synthwavePalms ?? true) })}
                        className={`glass-item !rounded-xl p-2.5 flex items-center justify-between cursor-pointer ${
                          (blobSettings?.synthwavePalms ?? true) ? 'is-active text-white' : 'text-white/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Palmtree className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-xs font-medium">Palmeras Retro</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase text-white/50">
                          {(blobSettings?.synthwavePalms ?? true) ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* ── OPCIONES CYBER TERRAIN 3D ── */}
              {isTerrain && (
                <div className="space-y-4">
                  {/* Estilo de Malla */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Estilo de Renderizado Topográfico
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'wireframe', name: 'Malla Wireframe', desc: 'Líneas vectoriales de alta precisión estilo CAD Tron' },
                        { id: 'dual_mesh', name: 'Dual Tron Shaded', desc: 'Superficie translúcida + rejilla wireframe brillante' },
                        { id: 'surface', name: 'Superficie Metálica', desc: 'Polígonos sólidos con reflejo de luz direccional' },
                        { id: 'points', name: 'Matriz de Puntos', desc: 'Nube de partículas topográficas holográficas' },
                      ].map((m) => {
                        const isSelected = (blobSettings?.terrainStyle ?? 'wireframe') === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => updateBlobSettings({ terrainStyle: m.id as any })}
                            className={`glass-item !rounded-2xl p-3 text-left flex flex-col justify-between gap-1.5 cursor-pointer ${
                              isSelected ? 'is-active text-white' : 'text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">{m.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-white/50 leading-tight">{m.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sol del Horizonte */}
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Sol del Horizonte
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'classic', name: 'Disco Neón', desc: 'Sol con halo estático' },
                        { id: 'corona', name: 'Corona Pulsante', desc: 'Llamaradas y anillos concéntricos' },
                        { id: 'grid_orb', name: 'Cyber Orb 3D', desc: 'Orbe vectorial en rotación' },
                        { id: 'none', name: 'Sin Sol', desc: 'Noche cyber oscura' },
                      ].map((s) => {
                        const isSelected = (blobSettings?.terrainSunStyle ?? 'classic') === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => updateBlobSettings({ terrainSunStyle: s.id as any })}
                            className={`glass-item !rounded-xl p-2.5 text-left flex flex-col justify-between gap-1 cursor-pointer ${
                              isSelected ? 'is-active text-white' : 'text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">{s.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-[#00e5ff] flex-shrink-0" />}
                            </div>
                            <p className="text-[9px] text-white/40 leading-tight">{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Controles de Elevación y Vuelo */}
                  <div className="glass-card !p-3.5 space-y-3">
                    <span className="text-[11px] uppercase tracking-wider font-mono text-cyan-300/80 block">
                      Parámetros Topográficos y Vuelo
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Elevación */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Altitud Montañas</span>
                          <span className="font-mono text-cyan-300 text-xs">
                            {(blobSettings?.terrainElevation ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.1"
                          value={blobSettings?.terrainElevation ?? 1.0}
                          onChange={(e) => updateBlobSettings({ terrainElevation: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                        />
                      </div>

                      {/* Rugosidad */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Rugosidad / Detalle</span>
                          <span className="font-mono text-cyan-300 text-xs">
                            {(blobSettings?.terrainRoughness ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.1"
                          value={blobSettings?.terrainRoughness ?? 1.0}
                          onChange={(e) => updateBlobSettings({ terrainRoughness: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                        />
                      </div>

                      {/* Velocidad */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/60">Velocidad Vuelo</span>
                          <span className="font-mono text-cyan-300 text-xs">
                            {(blobSettings?.terrainSpeed ?? 1.0).toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.1"
                          value={blobSettings?.terrainSpeed ?? 1.0}
                          onChange={(e) => updateBlobSettings({ terrainSpeed: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                        />
                      </div>
                    </div>

                    {/* Selector de Ángulos de Cámara de Vuelo */}
                    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Camera className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Perspectiva de Vuelo de Cámara:</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { id: 'front' as CameraPreset, label: 'Frontal' },
                          { id: 'driver' as CameraPreset, label: 'Cockpit' },
                          { id: 'drone' as CameraPreset, label: 'Dron Flyby' },
                          { id: 'orbit' as CameraPreset, label: 'Órbita 360°' },
                          { id: 'top' as CameraPreset, label: 'Satelital' },
                        ].map((c) => {
                          const isSelected = cameraPreset === c.id;
                          return (
                            <button
                              key={c.id}
                              onClick={() => setCameraPreset(c.id)}
                              className={`py-1.5 px-2 rounded-lg text-center text-xs font-medium transition-colors border ${
                                isSelected
                                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                                  : 'bg-white/[0.02] border-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.05]'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PARÁMETROS GLOBALES DE DINÁMICA & AUDIO */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              {/* Grid 2 Columnas de Sliders de Precisión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Escala 3D */}
                <div className="glass-card !p-3.5 space-y-1.5">
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
                <div className="glass-card !p-3.5 space-y-1.5">
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
                <div className="glass-card !p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-white/40" />
                      Opacidad de Partículas / Mallas
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
                <div className="glass-card !p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-white/40" />
                      Sensibilidad de Audio DSP
                    </span>
                    <span className="font-mono tabular-nums text-cyan-300 text-xs font-medium">
                      {Math.min(1.80, Math.max(0.40, currentSpeed)).toFixed(2)}x
                    </span>
                  </div>
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
                    className="w-full h-1 bg-white/10 rounded cursor-pointer accent-[#00e5ff]"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/30">
                    <span>0.50x (Suave)</span>
                    <span className="text-cyan-400">1.00x (Nominal)</span>
                    <span>1.50x (Enérgico)</span>
                  </div>
                </div>
              </div>

              {/* Toggles de Sincronización y Barras */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setLinkScales(!linkScales)}
                  className={`glass-item !rounded-2xl p-3 flex items-center justify-between cursor-pointer ${linkScales ? 'is-active text-white' : 'text-white/70'}`}
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
                  className={`glass-item !rounded-2xl p-3 flex items-center justify-between cursor-pointer ${showFrequencyBars ? 'is-active text-white' : 'text-white/70'}`}
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
              <div className="glass-card !p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-white/90">Modo Lúcido</h4>
                  <p className="text-[11px] text-white/40">Temas cromáticos y acentos reactivos</p>
                </div>
                <button
                  onClick={toggleLucidMode}
                  className={`glass-btn px-4 py-1 min-h-[32px] text-xs font-mono font-medium ${isLucid ? 'is-active text-white' : 'text-white/60'}`}
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
                          className={`glass-item !rounded-2xl p-2.5 text-left flex items-center justify-between cursor-pointer ${isSelected ? 'is-active text-white' : 'text-white/70'}`}
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
                          className={`glass-item !rounded-2xl p-2.5 text-left flex items-center justify-between cursor-pointer ${isSelected ? 'is-active text-white' : 'text-white/70'}`}
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
