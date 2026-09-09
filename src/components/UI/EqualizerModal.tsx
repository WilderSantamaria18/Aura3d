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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { StorageService } from '../../services/storageService';

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
  { id: 7, tag: 'HIGH' },
  { id: 8, tag: 'HIGH' },
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
    lucidPrimaryColor,
  } = usePlayerStore();

  const [activePresetId, setActivePresetId] = useState<string>(() => StorageService.getActiveEqPresetId());
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const previousGainsRef = useRef<number[]>(eqBands.map((b) => b.gain));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#ffffff';

  const handleApplyPreset = (preset: EQPreset) => {
    if (isBypassed) setIsBypassed(false);
    setActivePresetId(preset.id);
    StorageService.saveActiveEqPresetId(preset.id);
    eqBands.forEach((band, idx) => {
      setEqBandGain(band.id, preset.gains[idx] ?? 0);
    });
  };

  const handleReset = () => {
    if (isBypassed) setIsBypassed(false);
    setActivePresetId('flat');
    StorageService.saveActiveEqPresetId('flat');
    eqBands.forEach((band) => {
      setEqBandGain(band.id, 0);
    });
  };

  const handleInvert = () => {
    if (isBypassed) return;
    setActivePresetId('custom');
    eqBands.forEach((band) => {
      setEqBandGain(band.id, -band.gain);
    });
  };

  const handleToggleBypass = () => {
    if (!isBypassed) {
      previousGainsRef.current = eqBands.map((b) => b.gain);
      eqBands.forEach((b) => setEqBandGain(b.id, 0));
      setIsBypassed(true);
    } else {
      eqBands.forEach((b, idx) => {
        setEqBandGain(b.id, previousGainsRef.current[idx] ?? 0);
      });
      setIsBypassed(false);
    }
  };

  // Dibujo de la curva de respuesta de frecuencia en tiempo real
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.parentElement?.clientWidth || 600;
    const H = 90;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Línea de referencia 0dB
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(36, H / 2);
    ctx.lineTo(W - 16, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Puntos de spline para las 10 bandas
    const points: { x: number; y: number }[] = [];
    const marginL = 36;
    const availW = W - marginL - 16;

    eqBands.forEach((band, idx) => {
      const x = marginL + (idx / (eqBands.length - 1)) * availW;
      const gain = isBypassed ? 0 : band.gain;
      const y = H / 2 - (gain / 12) * (H * 0.4);
      points.push({ x, y });
    });

    if (points.length < 2) return;

    // Relleno de área bajo la curva
    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
    fillGrad.addColorStop(0, isLucid ? `${activeColor}25` : 'rgba(255, 255, 255, 0.1)');
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
    ctx.lineTo(points[points.length - 1].x, H / 2);
    ctx.lineTo(points[0].x, H / 2);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Trazo de la curva
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
    ctx.strokeStyle = isLucid ? activeColor : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Nodos de control en cada banda
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isLucid ? activeColor : '#ffffff';
      ctx.fill();
    });
  }, [eqBands, isLucid, activeColor, isBypassed]);

  if (!isEqualizerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md pointer-events-auto select-none font-sans">
      <div
        className="w-full max-w-3xl border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[92vh] overflow-hidden bg-[#0A0A0F]"
        style={{ fontFeatureSettings: "'ss01'" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium text-sm sm:text-base tracking-wide">
                  Master Equalizer Studio
                </h3>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.2 rounded border border-white/[0.1] bg-white/[0.03] text-white/50 uppercase">
                  10-Band Biquad DSP
                </span>
              </div>
              <p className="text-white/40 text-[11px] font-mono tracking-wider mt-0.5">
                Respuesta de frecuencia en tiempo real · 20Hz - 20kHz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bypass Button */}
            <button
              onClick={handleToggleBypass}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium tracking-wide uppercase border transition-colors flex items-center gap-1.5 ${
                isBypassed
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Alternar entre Ecualizador Activo y Bypass 0dB (A/B Test)"
            >
              {isBypassed ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isBypassed ? 'Bypass ON' : 'EQ Activo'}</span>
            </button>

            <button
              onClick={() => setEqualizerOpen(false)}
              className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
              aria-label="Cerrar ecualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3.5 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {/* 1. Curva de Respuesta de Frecuencia */}
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between pb-1 px-1 text-[10px] font-mono text-white/50 uppercase">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-white/60" />
                Respuesta Analítica en Decibelios
              </span>
              <span>{isBypassed ? 'Modo Bypass (0dB)' : 'Procesamiento Activo'}</span>
            </div>
            <div className="w-full relative pt-1">
              <canvas ref={canvasRef} className="w-full block rounded-lg" />
            </div>
          </div>

          {/* 2. Matriz de Presets de Estudio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-white/50 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-white/40" /> Presets de Estudio:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInvert}
                  className="flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white transition-colors"
                  title="Invertir curva"
                >
                  <FlipHorizontal className="w-3 h-3" /> Invertir
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white transition-colors"
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
                    className={`px-2.5 py-2 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'bg-white/10 border-white/25 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] text-white/70'
                    }`}
                  >
                    <span className="text-[11px] font-medium leading-tight truncate">
                      {preset.name}
                    </span>
                    <span className="text-[8px] font-mono text-white/40 tracking-wider uppercase mt-1">
                      {preset.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Faders Verticales de Precisión (10 Bandas) */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
              {eqBands.map((band, idx) => {
                const cat = BAND_CATEGORIES[idx] || { tag: 'MID' };

                return (
                  <div
                    key={band.id}
                    className="flex flex-col items-center py-2 px-1 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-colors"
                  >
                    <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase">
                      {cat.tag}
                    </span>

                    <span className="text-[11px] font-mono font-medium tabular-nums mt-1 text-white/90">
                      {band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)}
                    </span>

                    {/* Fader Vertical */}
                    <div className="h-32 sm:h-36 flex items-center justify-center my-1 relative w-full">
                      {/* Notch Central 0dB */}
                      <div className="absolute w-4 h-[1px] bg-white/25 pointer-events-none z-0" />
                      
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
                          StorageService.saveActiveEqPresetId('custom');
                        }}
                        onDoubleClick={() => {
                          setEqBandGain(band.id, 0);
                          setActivePresetId('custom');
                          StorageService.saveActiveEqPresetId('custom');
                        }}
                        className="w-28 sm:w-32 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-white -rotate-90 origin-center z-10 disabled:opacity-30"
                      />
                    </div>

                    <div className="flex items-center gap-0.5 w-full justify-center mb-1">
                      <button
                        onClick={() => {
                          setEqBandGain(band.id, Math.max(-12, band.gain - 0.5));
                          setActivePresetId('custom');
                          StorageService.saveActiveEqPresetId('custom');
                        }}
                        disabled={isBypassed || band.gain <= -12}
                        className="w-4 h-4 flex items-center justify-center rounded bg-white/[0.04] text-white/50 hover:text-white text-[9px] disabled:opacity-20"
                        title="Bajar 0.5dB"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          setEqBandGain(band.id, Math.min(12, band.gain + 0.5));
                          setActivePresetId('custom');
                        }}
                        disabled={isBypassed || band.gain >= 12}
                        className="w-4 h-4 flex items-center justify-center rounded bg-white/[0.04] text-white/50 hover:text-white text-[9px] disabled:opacity-20"
                        title="Subir 0.5dB"
                      >
                        +
                      </button>
                    </div>

                    {/* Frecuencia de la Banda */}
                    <span className="text-[10px] font-mono font-medium text-white/60 tracking-tight">
                      {band.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EqualizerModal;
