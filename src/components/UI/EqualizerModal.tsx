import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Zap,
  Activity,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface EQPreset {
  id: string;
  name: string;
  tag: string;
  gains: number[];
}

const EQ_PRESETS: EQPreset[] = [
  {
    id: 'flat',
    name: 'Plano / Neutral',
    tag: 'STUDIO',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'bass',
    name: 'Bass Boost / 808',
    tag: 'GRAVES',
    gains: [9, 7.5, 5, 2.5, 0, 0, 0, 1, 2, 2.5],
  },
  {
    id: 'club',
    name: 'Club / EDM / Rave',
    tag: 'DANCE',
    gains: [6.5, 5.5, 3, 0, -1.5, 2, 4.5, 6, 7, 7.5],
  },
  {
    id: 'hiphop',
    name: 'Hip Hop & Trap',
    tag: 'URBANO',
    gains: [8, 6.5, 4, 1, -1, 1, 3, 4.5, 5.5, 6],
  },
  {
    id: 'rock',
    name: 'Rock / Metal',
    tag: 'ENERGÍA',
    gains: [5, 3.5, 1, -1, -2, 1, 3.5, 5, 6, 6],
  },
  {
    id: 'pop',
    name: 'Pop / Acústico',
    tag: 'CLARO',
    gains: [-1.5, 1.5, 4, 4.5, 3, 0, 2, 4, 4.5, 4.5],
  },
  {
    id: 'vocal',
    name: 'Voces & Presencia',
    tag: 'VOCAL',
    gains: [-3, -2, 0, 3.5, 6, 6, 4.5, 2, 0.5, -1],
  },
  {
    id: 'treble',
    name: 'Treble Boost / Aire',
    tag: 'BRILLO',
    gains: [-2, -1, 0, 0, 1, 2.5, 5, 7.5, 9, 10],
  },
  {
    id: 'lofi',
    name: 'Lofi / Warm Vinyl',
    tag: 'VINTAGE',
    gains: [3, 4, 2, 0, -1, -2, -3, -4.5, -6, -8],
  },
  {
    id: 'jazz',
    name: 'Jazz & Cálido',
    tag: 'SUAVE',
    gains: [4, 3, 1.5, 2, -1.5, -1.5, 0, 2, 3.5, 4],
  },
  {
    id: 'gaming',
    name: 'Gaming & Pasos',
    tag: 'ESPACIAL',
    gains: [-3, -2, -1, 1, 3.5, 5, 6, 4.5, 3, 2],
  },
  {
    id: 'synthwave',
    name: 'Synthwave / Retro',
    tag: 'CYBER',
    gains: [6, 5, 2.5, 0, -1.5, 2, 4.5, 6, 7, 7.5],
  },
];

const BAND_CATEGORIES = [
  { id: 0, tag: 'SUB' },
  { id: 1, tag: 'SUB' },
  { id: 2, tag: 'BASS' },
  { id: 3, tag: 'BASS' },
  { id: 4, tag: 'MID' },
  { id: 5, tag: 'MID' },
  { id: 6, tag: 'MID' },
  { id: 7, tag: 'PRES' },
  { id: 8, tag: 'PRES' },
  { id: 9, tag: 'AIR' },
];

export const EqualizerModal: React.FC = () => {
  const {
    isEqualizerOpen,
    setEqualizerOpen,
    eqBands,
    setEqBandGain,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const [activePresetId, setActivePresetId] = useState<string>('flat');
  const [isBypassed, setIsBypassed] = useState(false);
  const [savedGainsBeforeBypass, setSavedGainsBeforeBypass] = useState<number[] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Apply a preset
  const handleApplyPreset = (preset: EQPreset) => {
    setActivePresetId(preset.id);
    setIsBypassed(false);
    preset.gains.forEach((gain, index) => {
      setEqBandGain(index, gain);
    });
  };

  // Reset to Flat
  const handleReset = () => {
    setActivePresetId('flat');
    setIsBypassed(false);
    eqBands.forEach((b) => setEqBandGain(b.id, 0));
  };

  // Invert current curve
  const handleInvert = () => {
    setActivePresetId('custom');
    eqBands.forEach((b) => setEqBandGain(b.id, -b.gain));
  };

  // Toggle Bypass / A-B comparison
  const handleToggleBypass = () => {
    if (!isBypassed) {
      setSavedGainsBeforeBypass(eqBands.map((b) => b.gain));
      eqBands.forEach((b) => setEqBandGain(b.id, 0));
      setIsBypassed(true);
    } else {
      if (savedGainsBeforeBypass) {
        savedGainsBeforeBypass.forEach((g, idx) => setEqBandGain(idx, g));
      }
      setIsBypassed(false);
    }
  };

  // Step gain change (+0.5dB or -0.5dB)
  const handleStepGain = (bandId: number, delta: number) => {
    const current = eqBands.find((b) => b.id === bandId)?.gain ?? 0;
    const clamped = Math.max(-12, Math.min(12, current + delta));
    setEqBandGain(bandId, clamped);
    setActivePresetId('custom');
  };

  // Draw Real-time Frequency Response Curve on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const H = (canvas.height = 130);

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Grid Lines (+12, +6, 0, -6, -12 dB)
    const dbLevels = [12, 6, 0, -6, -12];
    ctx.font = '9px "JetBrains Mono", monospace';

    dbLevels.forEach((db) => {
      const y = H / 2 - (db / 12) * (H * 0.42);
      ctx.strokeStyle = db === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = db === 0 ? 1.5 : 1;
      ctx.setLineDash(db === 0 ? [] : [3, 4]);

      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(W - 10, y);
      ctx.stroke();

      ctx.fillStyle = db === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
      ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, 2, y + 3);
    });
    ctx.setLineDash([]);

    // 2. Compute smooth Bezier points for the 10 bands
    const points: { x: number; y: number }[] = [];
    const marginL = 36;
    const availW = W - marginL - 16;

    eqBands.forEach((band, idx) => {
      const x = marginL + (idx / (eqBands.length - 1)) * availW;
      const gain = isBypassed ? 0 : band.gain;
      const y = H / 2 - (gain / 12) * (H * 0.42);
      points.push({ x, y });
    });

    if (points.length < 2) return;

    // 3. Draw Spline Curve with Gradient Fill
    const primaryColor = isLucid ? lucidTheme.primary : '#00f2fe';
    const secondaryColor = isLucid ? lucidTheme.secondary : '#ff088a';

    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
    fillGrad.addColorStop(0, `${primaryColor}40`);
    fillGrad.addColorStop(0.5, `${secondaryColor}15`);
    fillGrad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    // Close path for fill under curve to center line
    ctx.lineTo(points[points.length - 1].x, H / 2);
    ctx.lineTo(points[0].x, H / 2);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke the top line with glowing gradient
    const strokeGrad = ctx.createLinearGradient(marginL, 0, W - 16, 0);
    strokeGrad.addColorStop(0, primaryColor);
    strokeGrad.addColorStop(1, secondaryColor);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw control point nodes on curve
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [eqBands, isLucid, lucidTheme, isBypassed]);

  if (!isEqualizerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-2xl pointer-events-auto select-none animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl border rounded-3xl p-4 sm:p-6 shadow-[0_0_70px_rgba(0,0,0,0.9)] relative flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 ${
          isLucid ? 'lucid-panel' : 'bg-[#060814]/98'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: lucidTheme.glassColor,
                borderColor: lucidTheme.borderColor,
                boxShadow: `0 0 50px ${lucidTheme.glow}, 0 20px 60px rgba(0,0,0,0.95)`,
              }
            : {
                borderColor: 'rgba(0, 242, 254, 0.3)',
                boxShadow: '0 0 50px rgba(0, 242, 254, 0.2), 0 20px 60px rgba(0,0,0,0.95)',
              }
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-base sm:text-lg tracking-wide">
                  Master Equalizer Studio
                </h3>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 uppercase">
                  10-BAND BIQUAD DSP
                </span>
              </div>
              <p className="text-cyan-200/50 text-[11px] font-mono tracking-wider">
                RESPUESTA DE FRECUENCIA EN TIEMPO REAL · PRO AUDIO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bypass A/B Button */}
            <button
              onClick={handleToggleBypass}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase border transition-all flex items-center gap-1.5 ${
                isBypassed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(255,191,0,0.3)]'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
              }`}
              title="Alternar entre Ecualizador Activo y Bypass 0dB (A/B Test)"
            >
              {isBypassed ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isBypassed ? 'BYPASS: ON' : 'EQ ACTIVO'}</span>
            </button>

            <button
              onClick={() => setEqualizerOpen(false)}
              className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3.5 scrollbar-thin scrollbar-thumb-white/10 pr-1">

          {/* 1. Real-time Frequency Response Curve Canvas */}
          <div className="p-3 bg-black/60 rounded-2xl border border-white/8 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-1.5 px-1 text-[10px] font-mono text-cyan-300/80 uppercase">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Curva de Respuesta en Frecuencia (20Hz - 20kHz)
              </span>
              <span className="text-white/40">
                {isBypassed ? 'MODO BYPASS (PLANO)' : 'PROCESAMIENTO ACTIVO'}
              </span>
            </div>
            <div className="w-full relative">
              <canvas ref={canvasRef} className="w-full block rounded-xl" />
            </div>
          </div>

          {/* 2. Presets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-cyan-400/80 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-pink-400" /> Presets de Estudio:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInvert}
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-300/70 hover:text-cyan-200"
                  title="Invertir curva"
                >
                  <FlipHorizontal className="w-3 h-3" /> Invertir
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] font-mono text-pink-400 hover:text-pink-300"
                  title="Restablecer todo a 0dB"
                >
                  <RotateCcw className="w-3 h-3" /> Reset 0dB
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {EQ_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id && !isBypassed;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-2 py-1.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                      isSelected
                        ? isLucid
                          ? 'border-white/50 text-white shadow-md'
                          : 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                        : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] text-white/70'
                    }`}
                    style={
                      isSelected && isLucid
                        ? {
                            backgroundColor: `${lucidTheme.primary}25`,
                            borderColor: `${lucidTheme.primary}80`,
                            color: '#ffffff',
                            boxShadow: `0 0 12px ${lucidTheme.glow}`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-[11px] font-medium leading-tight truncate">
                      {preset.name}
                    </span>
                    <span className="text-[8px] font-mono text-white/40 tracking-wider uppercase mt-0.5">
                      {preset.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 10 Vertical Studio Faders */}
          <div className="bg-black/50 border border-white/8 rounded-2xl p-3 sm:p-4 shadow-inner space-y-2">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
              {eqBands.map((band, idx) => {
                const cat = BAND_CATEGORIES[idx] || { tag: 'MID' };
                const isPositive = band.gain > 0;
                const isNegative = band.gain < 0;

                return (
                  <div
                    key={band.id}
                    className="flex flex-col items-center bg-white/[0.02] border border-white/5 rounded-xl p-2 sm:p-2.5 transition-all hover:bg-white/[0.05]"
                  >
                    {/* Category Tag */}
                    <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">
                      {cat.tag}
                    </span>

                    {/* dB Value Readout */}
                    <span
                      className={`text-[11px] font-mono font-bold mt-1 ${
                        isPositive
                          ? 'text-cyan-300'
                          : isNegative
                          ? 'text-pink-400'
                          : 'text-white/50'
                      }`}
                    >
                      {band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)}
                    </span>

                    {/* Vertical Slider Track Container */}
                    <div className="h-36 sm:h-40 flex items-center justify-center my-2 relative w-full">
                      {/* 0dB Reference Center Notch */}
                      <div className="absolute w-5 h-[1.5px] bg-white/30 pointer-events-none z-0" />
                      
                      {/* +6dB & -6dB Marks */}
                      <div className="absolute top-[28%] w-2 h-[1px] bg-white/10 pointer-events-none" />
                      <div className="absolute bottom-[28%] w-2 h-[1px] bg-white/10 pointer-events-none" />

                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={band.gain}
                        disabled={isBypassed}
                        onChange={(e) => {
                          setEqBandGain(band.id, parseFloat(e.target.value));
                          setActivePresetId('custom');
                        }}
                        onDoubleClick={() => {
                          setEqBandGain(band.id, 0);
                          setActivePresetId('custom');
                        }}
                        className="w-32 sm:w-36 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-pink-400 transition-all -rotate-90 origin-center z-10 disabled:opacity-40"
                      />
                    </div>

                    {/* Step - / + Buttons */}
                    <div className="flex items-center gap-1 w-full justify-center mb-1.5">
                      <button
                        onClick={() => handleStepGain(band.id, -0.5)}
                        disabled={isBypassed || band.gain <= -12}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/15 text-[10px] text-white/70 flex items-center justify-center disabled:opacity-30"
                        title="Bajar 0.5dB"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleStepGain(band.id, 0.5)}
                        disabled={isBypassed || band.gain >= 12}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/15 text-[10px] text-white/70 flex items-center justify-center disabled:opacity-30"
                        title="Subir 0.5dB"
                      >
                        +
                      </button>
                    </div>

                    {/* Frequency Band Label */}
                    <span className="text-[10px] font-mono font-semibold text-white/80 tracking-tight">
                      {band.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            DOBLE CLIC EN CUALQUIER FADER PARA RESTABLECER A 0.0dB
          </span>
          <button
            onClick={() => setEqualizerOpen(false)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-black font-semibold rounded-xl text-[11px] tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(0,242,254,0.35)]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EqualizerModal;
