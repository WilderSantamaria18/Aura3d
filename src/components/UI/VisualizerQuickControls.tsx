import React from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Activity, CircleDot, Eye, Bot, Shapes, Link2, Unlink, Zap } from 'lucide-react';
import type { VisualizerShape } from '../../types/audio';

export const VisualizerQuickControls: React.FC = React.memo(() => {
  const {
    visualizerMode,
    visualizerShape,
    setVisualizerShape,
    autoMode,
    toggleAutoMode,
    autoSensitivity,
    setAutoSensitivity,
    autoPalette,
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
    rainbowScale,
    setRainbowScale,
    linkScales,
    setLinkScales,
    sphereOpacity,
    setSphereOpacity,
    musicSensitivity,
    setMusicSensitivity,
  } = usePlayerStore();

  if (visualizerMode === 'party') return null;

  const isBlob = visualizerMode === 'blob';
  const currentScale = isBlob ? rainbowScale : sphereScale;
  const setScale = isBlob ? setRainbowScale : setSphereScale;
  const scaleLabel = isBlob ? 'Escala Blob' : 'Escala 3D';

  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 px-4 py-2 rounded-full text-xs text-white/80 shadow-2xl flex-wrap justify-center transition-all duration-400 ${
        isLucid
          ? 'lucid-panel'
          : 'bg-black/50 backdrop-blur-xl border border-white/10'
      }`}
      style={
        isLucid
          ? {
              backgroundColor: lucidTheme.glassColor,
              borderColor: lucidTheme.borderColor,
              boxShadow: `0 0 30px ${lucidTheme.glow}`,
            }
          : undefined
      }
    >
      {/* 1. Shape Selector Dropdown */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
          isLucid
            ? 'border'
            : 'bg-white/5 border-white/5 text-cyan-400'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: `${lucidTheme.primary}15`,
                borderColor: `${lucidTheme.primary}40`,
                color: lucidTheme.primary,
              }
            : undefined
        }
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

      {/* 2. Auto AI Dynamic Color Mode Button */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleAutoMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all ${
            autoMode
              ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-pink-400/50 shadow-[0_0_15px_rgba(255,8,138,0.35)]'
              : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
          }`}
          title="Modo Inteligente: detecta frecuencias y sincroniza el ecosistema armónicamente"
        >
          {autoMode ? (
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: autoPalette.primary }}
              />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-400 to-emerald-300">
                Auto ON
              </span>
            </div>
          ) : (
            <>
              <Bot className="w-3.5 h-3.5" />
              <span>Auto OFF</span>
            </>
          )}
        </button>

        {/* Auto Color Sensitivity Quick Slider (Visible when Auto Mode is ON) */}
        {autoMode && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10"
            title="Sensibilidad de Color Armónico"
          >
            <span className="text-[10px] text-white/60 font-mono hidden sm:inline">Sens:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={autoSensitivity || 1.0}
              onChange={(e) => setAutoSensitivity(parseFloat(e.target.value))}
              className="w-12 sm:w-16 h-1 cursor-pointer accent-pink-400"
            />
          </div>
        )}
      </div>

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

      {/* 4. Active Visualizer Scale Slider (0.5x - 2.5x, with double-click reset) */}
      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onDoubleClick={() => setScale(1.0)}
        title={`${scaleLabel}: Doble clic para restablecer a 1.0x`}
      >
        <CircleDot className={`w-3.5 h-3.5 ${isLucid ? 'text-emerald-400' : 'text-pink-400'}`} />
        <span className="hidden sm:inline text-[11px] text-white/50">
          {scaleLabel} <span className="font-mono text-cyan-300">{(currentScale || 1.0).toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.05"
          value={currentScale || 1.0}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className={`w-16 sm:w-20 h-1 rounded-lg cursor-pointer transition-all ${
            isLucid ? 'accent-emerald-400 shadow-[0_0_10px_#39FF14]' : 'bg-white/10 accent-pink-500'
          }`}
          title={`${scaleLabel}: ${(currentScale || 1.0).toFixed(2)}x (Doble clic para restablecer a 1.0x)`}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLinkScales(!linkScales);
          }}
          className={`p-1 rounded-md transition-colors ${
            linkScales
              ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-400/40'
              : 'text-white/30 hover:text-white/70 hover:bg-white/5'
          }`}
          title={linkScales ? 'Escalas Vinculadas (Clic para desvincular)' : 'Escalas Independientes (Clic para vincular)'}
        >
          {linkScales ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
        </button>
      </div>

      {/* 5. Music Sensitivity Slider */}
      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onDoubleClick={() => setMusicSensitivity(1.0)}
        title="Sensibilidad Musical: Doble clic para restablecer a 1.0x"
      >
        <Zap className={`w-3.5 h-3.5 ${isLucid ? 'text-emerald-400' : 'text-emerald-400'}`} />
        <span className="hidden sm:inline text-[11px] text-white/50">
          Audio <span className="font-mono text-emerald-300">{(musicSensitivity || 1.0).toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min="0.0"
          max="2.5"
          step="0.05"
          value={musicSensitivity || 1.0}
          onChange={(e) => setMusicSensitivity(parseFloat(e.target.value))}
          className={`w-14 sm:w-18 h-1 rounded-lg cursor-pointer transition-all ${
            isLucid ? 'accent-emerald-400 shadow-[0_0_10px_#39FF14]' : 'bg-white/10 accent-emerald-400'
          }`}
          title={`Sensibilidad Musical: ${(musicSensitivity || 1.0).toFixed(2)}x (Doble clic para restablecer a 1.0x)`}
        />
      </div>

      {/* 6. Opacity Slider */}
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
          className={`w-14 sm:w-18 h-1 rounded-lg cursor-pointer transition-all ${
            isLucid ? 'accent-cyan-300 shadow-[0_0_10px_#00f2fe]' : 'bg-white/10 accent-cyan-400'
          }`}
          title={`Opacidad: ${Math.round(sphereOpacity * 100)}%`}
        />
      </div>

      {/* 6. Lucid Mode Color Customizer */}
      {isLucid && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
          <span className="text-[10px] text-white/80 font-mono hidden sm:inline">Color Lúcido:</span>
          <input
            type="color"
            value={lucidPrimaryColor}
            onChange={(e) => setLucidPrimaryColor(e.target.value)}
            className="w-4 h-4 rounded-full cursor-pointer border-0 p-0 bg-transparent"
            title="Color Primario Lúcido"
          />
          <input
            type="color"
            value={lucidSecondaryColor}
            onChange={(e) => setLucidSecondaryColor(e.target.value)}
            className="w-4 h-4 rounded-full cursor-pointer border-0 p-0 bg-transparent"
            title="Color Secundario Lúcido"
          />
        </div>
      )}
    </div>
  );
});

export default VisualizerQuickControls;
