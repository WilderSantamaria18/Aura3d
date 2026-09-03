import React, { useState } from 'react';
import {
  X,
  Shapes,
  Waves,
  Sliders,
  Palette,
  Eye,
  CircleDot,
  Bot,
  Activity,
  Check,
  Zap,
  Flame,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES, LUCID_THEMES } from '../../types/audio';
import type { VisualizerShape, WaveEffectMode } from '../../types/audio';

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
    desc: '5 anillos orbitales toroides que se expanden, contraen y oscilan al ritmo de los bombos.',
    tag: 'ORBITAL',
  },
  {
    id: 'spikes',
    name: 'Picos Radiales',
    desc: 'Geometría erizo con picos que se alargan y proyectan con los bajos y agudos.',
    tag: 'RADIAL',
  },
  {
    id: 'cloud',
    name: 'Nube de Partículas',
    desc: 'Enjambre 3D browniano que se condensa con los graves y se dispersa en el espacio.',
    tag: 'SWARM',
  },
  {
    id: 'torus',
    name: 'Toroide 3D',
    desc: 'Dona / Rosca toroidal con deformación de grosor y doble eje de rotación.',
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

const WAVES_CATALOG: { id: WaveEffectMode; name: string; desc: string }[] = [
  {
    id: 'concentric',
    name: 'Onda Concéntrica',
    desc: 'Anillos esféricos anidados que se expanden hacia el espacio pulsando con los bajos.',
  },
  {
    id: 'sinusoidal',
    name: 'Onda Sinusoidal',
    desc: 'Cortina ondulante vertical que fluye suavemente alrededor de la figura.',
  },
  {
    id: 'spiral',
    name: 'Onda Espiral',
    desc: 'Brazos de vórtice en espiral que giran y se deforman con los agudos y medios.',
  },
  {
    id: 'void',
    name: 'Onda Void Aura',
    desc: 'Aura de vacío cósmico con respiración y expansión profunda.',
  },
  {
    id: 'off',
    name: 'Sin Ondas',
    desc: 'Desactiva el aura de ondas circundante con desvanecimiento suave.',
  },
];

export const VisualizerSettingsModal: React.FC = () => {
  const {
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    visualizerShape,
    setVisualizerShape,
    waveEffectMode,
    setWaveEffectMode,
    waveEffectIntensity,
    setWaveEffectIntensity,
    bassBoomThreshold,
    setBassBoomThreshold,
    bassBoomIntensity,
    setBassBoomIntensity,
    sphereRadius,
    setSphereRadius,
    sphereOpacity,
    setSphereOpacity,
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
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'shapes' | 'waves' | 'params' | 'colors'>('shapes');

  if (!isVisualizerSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl pointer-events-auto select-none">
      <div className="relative w-full max-w-2xl bg-[#060814]/95 border border-cyan-400/25 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
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
                FORMAS · ONDAS · BASS BOOM · PARÁMETROS · COLOR
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
            { id: 'waves', label: 'Efectos de Onda', icon: Waves },
            { id: 'params', label: 'Bajos & Parámetros', icon: Sliders },
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

          {/* ── 2. TAB: WAVES ─────────────────────────────────────────── */}
          {activeTab === 'waves' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider block">
                  Efectos de Onda Envolvente:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WAVES_CATALOG.map((wave) => {
                    const isSelected = waveEffectMode === wave.id;
                    return (
                      <div
                        key={wave.id}
                        onClick={() => setWaveEffectMode(wave.id)}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all relative flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-pink-500/15 border-pink-400/60 shadow-[0_0_20px_rgba(255,8,138,0.25)] text-pink-200'
                            : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-semibold ${isSelected ? 'text-pink-300' : 'text-white'}`}>
                            {wave.name}
                          </h4>
                          {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          {wave.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wave Intensity Slider */}
              <div className="p-4 bg-white/[0.02] border border-white/8 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-pink-400" />
                    Intensidad de Ondas
                  </span>
                  <span className="text-xs font-mono text-pink-300">
                    {Math.round(waveEffectIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.8"
                  step="0.05"
                  value={waveEffectIntensity}
                  onChange={(e) => setWaveEffectIntensity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
                />
              </div>
            </div>
          )}

          {/* ── 3. TAB: PARAMS & BASS BOOM ────────────────────────────── */}
          {activeTab === 'params' && (
            <div className="space-y-5">
              {/* Sección Especial: Calibración del Bass Boom */}
              <div className="p-4 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-cyan-500/10 border border-pink-500/30 rounded-2xl space-y-4 shadow-[0_0_20px_rgba(255,8,138,0.15)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-pink-400" />
                    Calibración del Impacto Bass Boom
                  </span>
                  <span className="text-[10px] font-mono text-pink-300 tracking-wider uppercase">
                    PUNCH · ONDAS DE CHOQUE
                  </span>
                </div>

                {/* Sensibilidad / Umbral de disparo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">
                      Sensibilidad al Disparo (Umbral de Bajo):
                    </span>
                    <span className="text-xs font-mono text-pink-300">
                      {Math.round((1 - (bassBoomThreshold ?? 0.45)) * 100)}% ({bassBoomThreshold.toFixed(2)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.02"
                    value={bassBoomThreshold}
                    onChange={(e) => setBassBoomThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/40">
                    <span>Fácil / Muy Sensible</span>
                    <span>Solo Graves Fuertes</span>
                  </div>
                </div>

                {/* Potencia / Multiplicador de impacto */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">
                      Potencia del Golpe Explosivo:
                    </span>
                    <span className="text-xs font-mono text-cyan-300">
                      {Math.round(bassBoomIntensity * 100)}% ({bassBoomIntensity.toFixed(1)}x)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={bassBoomIntensity}
                    onChange={(e) => setBassBoomIntensity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/40">
                    <span>0% (Sin Boom)</span>
                    <span>100% (Normal)</span>
                    <span>200% (Explosivo)</span>
                  </div>
                </div>
              </div>

              {/* Radio */}
              <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
                    Radio de la Geometría
                  </span>
                  <span className="text-xs font-mono text-cyan-300">
                    {sphereRadius.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.05"
                  value={sphereRadius}
                  onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                />
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
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={sphereOpacity}
                  onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* FFT Bars Toggle */}
                <div
                  onClick={() => setShowFrequencyBars(!showFrequencyBars)}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    showFrequencyBars
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                      : 'bg-white/[0.03] border-white/8 text-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h5 className="text-xs font-semibold text-white">Barras FFT 3D</h5>
                      <p className="text-[10px] text-white/40">Anillo espectral de 2000 partículas</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${showFrequencyBars ? 'border-cyan-400 bg-cyan-400' : 'border-white/20'}`}>
                    {showFrequencyBars && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                </div>

                {/* Auto Mode Toggle */}
                <div
                  onClick={toggleAutoMode}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    autoMode
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : 'bg-white/[0.03] border-white/8 text-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h5 className="text-xs font-semibold text-white">Modo Auto-AI</h5>
                      <p className="text-[10px] text-white/40">Rotación de color entre canciones</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${autoMode ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                    {autoMode && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. TAB: COLORS & LUCID ────────────────────────────────── */}
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
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 flex items-center justify-between bg-black/40 flex-shrink-0">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
            FORMA: {visualizerShape.toUpperCase()} &nbsp;·&nbsp; BOOM: {Math.round(bassBoomIntensity * 100)}%
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

