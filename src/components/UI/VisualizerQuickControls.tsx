import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Activity, CircleDot, Eye, Bot, Shapes } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';

export const VisualizerQuickControls: React.FC = React.memo(() => {
  const {
    visualizerMode,
    visualizerShape,
    setVisualizerShape,
    autoMode,
    toggleAutoMode,
    isLucid,
    showFrequencyBars,
    setShowFrequencyBars,
    sphereRadius,
    setSphereRadius,
    sphereOpacity,
    setSphereOpacity,
  } = usePlayerStore();

  if (visualizerMode === 'party') return null;

  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 px-4 py-2 rounded-full text-xs text-white/80 shadow-2xl flex-wrap justify-center transition-all duration-400 ${
        isLucid
          ? 'bg-[#090e1c]/80 backdrop-blur-2xl border border-emerald-400/40 shadow-[0_0_30px_rgba(57,255,20,0.25)]'
          : 'bg-black/50 backdrop-blur-xl border border-white/10'
      }`}
    >
      {/* 1. Shape Selector Dropdown */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
          isLucid
            ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
            : 'bg-white/5 border-white/5 text-cyan-400'
        }`}
      >
        <Shapes className="w-3.5 h-3.5" />
        <select
          value={visualizerShape}
          onChange={(e) => setVisualizerShape(e.target.value as VisualizerShape)}
          className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
          title="Forma geométrica del visualizador 3D"
        >
          <option value="sphere" className="bg-[#0b0e1b] text-white">Esfera Pulsante</option>
          <option value="rings" className="bg-[#0b0e1b] text-white">Anillos Concéntricos</option>
          <option value="spikes" className="bg-[#0b0e1b] text-white">Picos Radiales</option>
          <option value="cloud" className="bg-[#0b0e1b] text-white">Nube de Partículas</option>
          <option value="torus" className="bg-[#0b0e1b] text-white">Toroide 3D</option>
          <option value="wave" className="bg-[#0b0e1b] text-white">Onda Sinusoidal 3D</option>
          <option value="icosahedron" className="bg-[#0b0e1b] text-white">Icosaedro Sagrado</option>
          <option value="octahedron" className="bg-[#0b0e1b] text-white">Octaedro Cuántico</option>
        </select>
      </div>

      {/* 2. Auto AI Mode Button */}
      <button
        onClick={toggleAutoMode}
        className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all ${
          autoMode
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(0,255,179,0.3)]'
            : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
        }`}
        title="Modo Inteligente: detecta frecuencias y cambia de color automáticamente"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>{autoMode ? 'Auto ON' : 'Auto OFF'}</span>
      </button>

      {/* 3. Toggle Frequency Bars */}
      <button
        onClick={() => setShowFrequencyBars(!showFrequencyBars)}
        className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all ${
          showFrequencyBars
            ? isLucid
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(57,255,20,0.3)]'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
            : 'bg-white/5 text-white/40 hover:text-white/80'
        }`}
        title="Activar / Desactivar Anillo de Barras FFT 3D"
      >
        <Activity className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Barras 3D</span>
      </button>

      {/* 4. Sphere Scale Override Slider (0.5x - 2.0x, with double-click reset) */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onDoubleClick={() => setSphereRadius(1.0)}
        title="Escala 3D: Doble clic para restablecer a 1.0x"
      >
        <CircleDot className={`w-3.5 h-3.5 ${isLucid ? 'text-emerald-400' : 'text-pink-400'}`} />
        <span className="hidden sm:inline text-[11px] text-white/50">
          Escala <span className="font-mono text-cyan-300">{sphereRadius.toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={sphereRadius}
          onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
          className={`w-16 sm:w-20 h-1 rounded-lg cursor-pointer transition-all ${
            isLucid ? 'accent-emerald-400 shadow-[0_0_10px_#39FF14]' : 'bg-white/10 accent-pink-500'
          }`}
          title={`Escala 3D: ${sphereRadius.toFixed(2)}x (Doble clic para restablecer a 1.0x)`}
        />
      </div>

      {/* 5. Opacity Slider */}
      <div className="flex items-center gap-2">
        <Eye className={`w-3.5 h-3.5 ${isLucid ? 'text-cyan-300' : 'text-cyan-400'}`} />
        <span className="hidden sm:inline text-[11px] text-white/50">Opacidad</span>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          value={sphereOpacity}
          onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
          className={`w-16 sm:w-20 h-1 rounded-lg cursor-pointer transition-all ${
            isLucid ? 'accent-cyan-300 shadow-[0_0_10px_#00f2fe]' : 'bg-white/10 accent-cyan-400'
          }`}
          title={`Opacidad: ${Math.round(sphereOpacity * 100)}%`}
        />
      </div>
    </div>
  );
});

export default VisualizerQuickControls;
