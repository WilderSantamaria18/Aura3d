import React, { useState } from 'react';
import {
  X,
  Shapes,
  Sliders,
  Palette,
  Eye,
  CircleDot,
  Bot,
  Activity,
  Check,
  Link2,
  Unlink,
  Zap,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES, LUCID_THEMES } from '../../types/audio';
import type { VisualizerShape } from '../../types/audio';

const SHAPES_CATALOG: { id: VisualizerShape; name: string; desc: string; tag: string }[] = [
  {
    id: 'sphere',
    name: 'Esfera Pulsante',
    desc: 'Esfera cristalina de Fibonacci con pulsación armónica y rotación continua.',
    tag: 'FIBONACCI',
  },
  {
    id: 'rings',
    name: 'Anillos Concéntricos',
    desc: '5 anillos orbitales toroides que oscilan suavemente al ritmo de la música.',
    tag: 'ORBITAL',
  },
  {
    id: 'spikes',
    name: 'Picos Radiales',
    desc: 'Geometría erizo con picos que se expanden con los bajos y agudos de forma orgánica.',
    tag: 'RADIAL',
  },
  {
    id: 'cloud',
    name: 'Nube de Partículas',
    desc: 'Enjambre 3D browniano que se condensa y dispersa suavemente en el espacio.',
    tag: 'SWARM',
  },
  {
    id: 'torus',
    name: 'Toroide 3D',
    desc: 'Dona / Rosca toroidal con deformación de grosor y rotación espacial.',
    tag: 'TORUS',
  },
  {
    id: 'wave',
    name: 'Onda Sinusoidal 3D',
    desc: 'Terreno dinámico de ondas tridimensionales que viajan con crestas de frecuencia.',
    tag: 'TERRAIN',
  },
  {
    id: 'icosahedron',
    name: 'Icosaedro Sagrado',
    desc: 'Geometría sagrada con 20 facetas cristalinas nítidas.',
    tag: 'CRYSTAL',
  },
  {
    id: 'octahedron',
    name: 'Octaedro Cuántico',
    desc: 'Diamante cuántico con simetría de 8 caras y aristas brillantes.',
    tag: 'QUANTUM',
  },
];

export const VisualizerSettingsModal: React.FC = () => {
  const {
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    visualizerShape,
    setVisualizerShape,
    sphereScale,
    setSphereScale,
    rainbowScale,
    setRainbowScale,
    linkScales,
    setLinkScales,
    sphereOpacity,
    setSphereOpacity,
    musicSensitivity,
    setMusicSensitivity,
    showFrequencyBars,
    setShowFrequencyBars,
    autoMode,
    toggleAutoMode,
    currentPaletteIndex,
    setCurrentPaletteIndex,
    isLucid,
    lucidTheme,
    setLucidTheme,
    toggleLucidMode,
    lucidPrimaryColor,
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'shapes' | 'params' | 'colors'>('shapes');

  if (!isVisualizerSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl pointer-events-auto select-none">
      <div
        className={`relative w-full max-w-2xl border rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 transition-all ${
          isLucid ? 'lucid-panel' : 'bg-[#060814]/95 border-cyan-400/25'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: lucidTheme.glassColor,
                borderColor: lucidTheme.borderColor,
                boxShadow: `0 0 50px ${lucidTheme.glow}, 0 20px 60px rgba(0,0,0,0.95)`,
              }
            : undefined
        }
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Sliders className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm tracking-wide">
                Configuración del Visualizador 3D
              </h3>
              <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                FORMAS · PARÁMETROS & ESCALA · PALETAS & COLOR
              </p>
            </div>
          </div>

          <button
            onClick={() => setVisualizerSettingsOpen(false)}
            className="p-1.5 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-white/8 px-6 bg-black/40 flex-shrink-0">
          {[
            { id: 'shapes', label: 'Formas 3D', icon: Shapes },
            { id: 'params', label: 'Parámetros & Escala', icon: Sliders },
            { id: 'colors', label: 'Paletas & Color', icon: Palette },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
                activeTab === id
                  ? 'border-cyan-400 text-cyan-300 -mb-px bg-cyan-500/10'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">

          {/* ── 1. TAB: SHAPES ────────────────────────────────────────── */}
          {activeTab === 'shapes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider">
                  Selecciona la Geometría Tridimensional:
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {SHAPES_CATALOG.length} FORMAS DISPONIBLES
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SHAPES_CATALOG.map((shape) => {
                  const isSelected = visualizerShape === shape.id;
                  return (
                    <div
                      key={shape.id}
                      onClick={() => setVisualizerShape(shape.id)}
                      className={`p-4 rounded-2xl cursor-pointer border transition-all relative overflow-hidden flex flex-col justify-between gap-2 group ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-pink-500/10 border-cyan-400/60 shadow-[0_0_20px_rgba(0,242,254,0.25)]'
                          : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 shadow-[0_0_8px_#00f2fe]' : 'bg-white/20'}`} />
                          <h4 className={`text-xs font-semibold ${isSelected ? 'text-cyan-200' : 'text-white'}`}>
                            {shape.name}
                          </h4>
                        </div>
                        <span className="text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded border border-white/10 text-white/40 uppercase bg-black/40">
                          {shape.tag}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/50 leading-relaxed">
                        {shape.desc}
                      </p>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-300 tracking-widest uppercase mt-1">
                          <Check className="w-3 h-3 text-cyan-400" />
                          <span>ACTIVO</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 2. TAB: PARAMS & SCALE ─────────────────────────────────── */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              {/* Escala Esfera 3D */}
              <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
                    Escala Esfera 3D (Three.js)
                  </span>
                  <span className="text-xs font-mono text-cyan-300">
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
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Escala Rainbow Blob */}
              <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-pink-400" />
                    Escala Rainbow Blob (Canvas 2D)
                  </span>
                  <span className="text-xs font-mono text-pink-300">
                    {(rainbowScale || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={rainbowScale || 1.0}
                  onChange={(e) => setRainbowScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
                />
              </div>

              {/* Vincular escalas Toggle */}
              <div
                onClick={() => setLinkScales(!linkScales)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  linkScales
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                    : 'bg-white/[0.03] border-white/8 text-white/60 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-xl ${linkScales ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                    {linkScales ? <Link2 className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Sincronizar Escalas</h4>
                    <p className="text-[10px] text-white/40">Modificar una escala actualiza automáticamente la otra</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${linkScales ? 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10 font-bold' : 'border-white/10 text-white/40'}`}>
                  {linkScales ? 'VINCULADAS' : 'INDEPENDIENTES'}
                </span>
              </div>

              {/* Opacity */}
              <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Opacidad de Partículas
                  </span>
                  <span className="text-xs font-mono text-indigo-300">
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
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Sensibilidad Musical */}
              <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Sensibilidad Musical (Reactividad al Audio)
                  </span>
                  <span className="text-xs font-mono text-emerald-300">
                    {(musicSensitivity || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.05"
                  value={musicSensitivity || 1.0}
                  onChange={(e) => setMusicSensitivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-emerald-400"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* FFT Bars Toggle */}
                <div
                  onClick={() => setShowFrequencyBars(!showFrequencyBars)}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    showFrequencyBars
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 shadow-[0_0_20px_rgba(0,242,254,0.15)]'
                      : 'bg-white/[0.03] border-white/8 text-white/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${showFrequencyBars ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Anillos de Arena FFT</h4>
                      <p className="text-[10px] text-white/40">Ondas orbitales 3D</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono ${showFrequencyBars ? 'text-cyan-300 font-bold' : 'text-white/30'}`}>
                    {showFrequencyBars ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Auto AI Mode Toggle */}
                <div
                  onClick={toggleAutoMode}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    autoMode
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200 shadow-[0_0_20px_rgba(0,255,179,0.15)]'
                      : 'bg-white/[0.03] border-white/8 text-white/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${autoMode ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Modo Auto AI</h4>
                      <p className="text-[10px] text-white/40">Color reactivo al tono</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono ${autoMode ? 'text-emerald-300 font-bold' : 'text-white/30'}`}>
                    {autoMode ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── 3. TAB: COLORS & LUCID ────────────────────────────────── */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Professional Palettes */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider block">
                  Paletas Profesionales (Modo Normal):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROFESSIONAL_PALETTES.map((pal, idx) => {
                    const isSelected = currentPaletteIndex === idx && !isLucid;
                    return (
                      <div
                        key={pal.name}
                        onClick={() => {
                          setCurrentPaletteIndex(idx);
                          if (isLucid) toggleLucidMode();
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-white/10 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                            : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span className="text-xs font-medium text-white">{pal.name}</span>
                        <div className="flex items-center gap-1">
                          {pal.colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-black/30"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lucid Themes */}
              <div className="space-y-3 border-t border-white/8 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                    Temas Neón (Modo Lúcido):
                  </span>
                  <button
                    onClick={toggleLucidMode}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase border transition-all ${
                      isLucid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(57,255,20,0.4)]'
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}
                  >
                    {isLucid ? 'LUCID: ACTIVADO' : 'LUCID: DESACTIVADO'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LUCID_THEMES.map((theme) => {
                    const isSelected = isLucid && lucidTheme.id === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => {
                          setLucidTheme(theme);
                          if (!isLucid) toggleLucidMode();
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_12px_rgba(57,255,20,0.3)]'
                            : 'bg-white/[0.02] border-white/8 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <span className="text-[11px] font-medium text-white truncate">
                          {theme.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Color Pickers */}
                <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 mt-3">
                  <span className="text-[11px] font-mono text-cyan-300 font-medium block">
                    Personalizar Colores Neón Personalizados:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 p-2 bg-black/40 border border-white/10 rounded-xl">
                      <input
                        type="color"
                        value={lucidPrimaryColor}
                        onChange={(e) => {
                          setLucidPrimaryColor(e.target.value);
                          if (!isLucid) toggleLucidMode();
                        }}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/50">Color Primario</span>
                        <span className="text-xs font-mono text-white uppercase">{lucidPrimaryColor}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-black/40 border border-white/10 rounded-xl">
                      <input
                        type="color"
                        value={lucidSecondaryColor}
                        onChange={(e) => {
                          setLucidSecondaryColor(e.target.value);
                          if (!isLucid) toggleLucidMode();
                        }}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/50">Color Secundario</span>
                        <span className="text-xs font-mono text-white uppercase">{lucidSecondaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 flex items-center justify-between bg-black/40 flex-shrink-0">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
            FORMA: {visualizerShape.toUpperCase()} &nbsp;·&nbsp; ESCALA 3D: {(sphereScale || 1.0).toFixed(1)}x &nbsp;·&nbsp; OPACIDAD: {Math.round(sphereOpacity * 100)}%
          </span>

          <button
            onClick={() => setVisualizerSettingsOpen(false)}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black font-semibold rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualizerSettingsModal;

