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
import { AudioEngine } from '../../services/audioEngine';

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

  // ── FabFilter Pro-Q Style Interactive Graph with Live FFT Spectrum & Draggable Nodes ──
  const [hoveredBandIdx, setHoveredBandIdx] = useState<number | null>(null);
  const [draggingBandIdx, setDraggingBandIdx] = useState<number | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; text: string } | null>(null);

  // Continuous animation loop for real-time FFT spectrum background
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.parentElement?.clientWidth || 600;
      const H = 130;

      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      const marginL = 38;
      const availW = W - marginL - 16;

      // 1. Grid & dB Reference Lines (+12, +6, 0, -6, -12)
      const dbSteps = [12, 6, 0, -6, -12];
      dbSteps.forEach((db) => {
        const y = H / 2 - (db / 12) * (H * 0.42);
        ctx.strokeStyle = db === 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = db === 0 ? 1 : 0.8;
        ctx.setLineDash(db === 0 ? [] : [2, 4]);

        ctx.beginPath();
        ctx.moveTo(marginL, y);
        ctx.lineTo(W - 12, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}`, marginL - 6, y);
      });
      ctx.setLineDash([]);

      // 2. Real-time RTA FFT Spectrum (FabFilter Analyzer Background)
      const freqData = AudioEngine.getInstance().getFrequencyData();
      if (freqData && freqData.raw && freqData.raw.length > 0) {
        const raw = freqData.raw;
        const binCount = Math.min(64, raw.length);
        const specWidth = availW / binCount;

        const specGrad = ctx.createLinearGradient(0, H, 0, 0);
        if (isLucid) {
          specGrad.addColorStop(0, `${activeColor}05`);
          specGrad.addColorStop(0.7, `${activeColor}22`);
          specGrad.addColorStop(1, `${activeColor}38`);
        } else {
          specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
          specGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.12)');
          specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
        }

        ctx.fillStyle = specGrad;
        ctx.beginPath();
        ctx.moveTo(marginL, H - 4);

        for (let i = 0; i < binCount; i++) {
          const val = raw[Math.floor((i / binCount) * (raw.length * 0.7))] / 255;
          const barX = marginL + i * specWidth;
          const barY = H - 4 - val * (H * 0.75);
          ctx.lineTo(barX, barY);
        }
        ctx.lineTo(marginL + availW, H - 4);
        ctx.closePath();
        ctx.fill();
      }

      // 3. Spline points for the 10 bands
      const points: { x: number; y: number; gain: number; bandIdx: number }[] = [];
      eqBands.forEach((band, idx) => {
        const x = marginL + (idx / (eqBands.length - 1)) * availW;
        const gain = isBypassed ? 0 : band.gain;
        const y = H / 2 - (gain / 12) * (H * 0.42);
        points.push({ x, y, gain, bandIdx: idx });
      });

      if (points.length >= 2) {
        // Shaded curve area
        const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (isLucid) {
          fillGrad.addColorStop(0, `${activeColor}25`);
          fillGrad.addColorStop(1, 'transparent');
        } else {
          fillGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
          fillGrad.addColorStop(1, 'transparent');
        }

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

        // High-definition Curve stroke
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
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 4. Interactive Nodes for each band
        points.forEach((p, idx) => {
          const isTargeted = hoveredBandIdx === idx || draggingBandIdx === idx;

          if (isTargeted) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = isLucid ? `${activeColor}40` : 'rgba(255, 255, 255, 0.35)';
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, isTargeted ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isTargeted ? '#ffffff' : isLucid ? activeColor : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [eqBands, isLucid, activeColor, isBypassed, hoveredBandIdx, draggingBandIdx]);

  // Pointer Drag Handlers on Canvas
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isBypassed) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marginL = 38;
    const availW = rect.width - marginL - 16;

    let closestIdx = -1;
    let minDist = 22;

    eqBands.forEach((band, idx) => {
      const bx = marginL + (idx / (eqBands.length - 1)) * availW;
      const by = rect.height / 2 - (band.gain / 12) * (rect.height * 0.42);
      const dist = Math.hypot(x - bx, y - by);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== -1) {
      setDraggingBandIdx(closestIdx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const marginL = 38;
    const availW = rect.width - marginL - 16;

    if (draggingBandIdx !== null) {
      const H = rect.height;
      const normY = (H / 2 - y) / (H * 0.42);
      const newGain = Math.min(12, Math.max(-12, Math.round(normY * 12 * 2) / 2));
      const band = eqBands[draggingBandIdx];
      if (band) {
        setEqBandGain(band.id, newGain);
        setTooltipInfo({
          x,
          y: Math.max(10, y - 24),
          text: `${band.label}: ${newGain > 0 ? '+' : ''}${newGain} dB`,
        });
      }
      return;
    }

    // Hover detection
    let closestIdx: number | null = null;
    let minDist = 20;

    eqBands.forEach((band, idx) => {
      const bx = marginL + (idx / (eqBands.length - 1)) * availW;
      const by = rect.height / 2 - (band.gain / 12) * (rect.height * 0.42);
      const dist = Math.hypot(x - bx, y - by);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    setHoveredBandIdx(closestIdx);
    if (closestIdx !== null) {
      const band = eqBands[closestIdx];
      setTooltipInfo({
        x,
        y: Math.max(10, y - 24),
        text: `${band.label}: ${band.gain > 0 ? '+' : ''}${band.gain} dB`,
      });
    } else {
      setTooltipInfo(null);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingBandIdx !== null) {
      setDraggingBandIdx(null);
      setTooltipInfo(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  };

  const handleCanvasDoubleClick = (_e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredBandIdx !== null) {
      const band = eqBands[hoveredBandIdx];
      if (band) {
        setEqBandGain(band.id, 0);
      }
    }
  };

  if (!isEqualizerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-[36px] saturate-[140%] pointer-events-auto select-none font-display animate-aura-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setEqualizerOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="eq-dialog-title"
    >
      <div
        className={`w-full max-w-3xl liquid-glass liquid-glass--modal relative flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 animate-aura-modal`}
        style={{
          fontFeatureSettings: "'ss01', 'cv01'",
          ...(isLucid
            ? {
                backgroundColor: lucidTheme.glassColor || 'rgba(15, 15, 22, 0.65)',
                borderColor: `${activeColor}40`,
                borderTopColor: `${activeColor}80`,
                boxShadow: `0 32px 80px -10px rgba(0,0,0,0.85), 0 0 35px ${activeColor}20, inset 0 1px 1.5px rgba(255,255,255,0.30)`,
              }
            : {
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.09) 0%, rgba(18, 18, 22, 0.58) 45%, rgba(8, 8, 12, 0.80) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.14)',
                borderTopColor: 'rgba(255, 255, 255, 0.35)',
                boxShadow: '0 32px 80px -10px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.30)',
              }),
        }}
      >
        {/* Specular Liquid Edge Accent Highlight */}
        <div
          className="absolute top-0 inset-x-8 h-px pointer-events-none transition-all duration-300"
          style={{
            background: isLucid
              ? `linear-gradient(to right, transparent, ${activeColor}99, transparent)`
              : 'linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)',
          }}
        />

        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-[10px] bg-white/[0.08] border border-white/[0.12] flex items-center justify-center transition-colors shadow-sm"
              style={{ color: isLucid ? activeColor : '#ffffff' }}
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="eq-dialog-title" className="text-white font-bold text-sm sm:text-base tracking-tight">
                  Ecualizador de Estudio
                </h2>
                <span
                  className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full uppercase font-bold transition-colors"
                  style={{
                    backgroundColor: isLucid ? `${activeColor}18` : 'rgba(255, 255, 255, 0.08)',
                    borderColor: isLucid ? `${activeColor}40` : 'rgba(255, 255, 255, 0.16)',
                    color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.9)',
                    borderWidth: 1,
                  }}
                >
                  DSP 10 BANDAS
                </span>
              </div>
              <p className="text-white/60 text-[11px] font-sans tracking-normal mt-0.5">
                Calibración de frecuencia en tiempo real · 20Hz - 20kHz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bypass Button */}
            <button
              onClick={handleToggleBypass}
              aria-pressed={isBypassed}
              aria-label={isBypassed ? 'Desactivar modo Bypass' : 'Activar modo Bypass a 0dB'}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-display font-tabular font-bold tracking-wider uppercase border btn-spring flex items-center gap-2 cursor-pointer transition-all ${
                isBypassed
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                  : 'bg-white/[0.06] text-white/90 border-white/[0.12] hover:bg-white/[0.12] hover:text-white shadow-sm'
              }`}
              title="Alternar entre Ecualizador Activo y Bypass 0dB (A/B Test)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isBypassed ? 'bg-amber-400 animate-pulse' : ''}`}
                style={{
                  backgroundColor: isBypassed ? undefined : isLucid ? activeColor : '#34c759',
                }}
              />
              {isBypassed ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isBypassed ? 'Bypass' : 'Activo'}</span>
            </button>

            {/* iOS Circle Close Button */}
            <button
              onClick={() => setEqualizerOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Cerrar ecualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Continuous Studio Surface ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {/* 1. Curva de Respuesta de Frecuencia */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[10px] font-mono text-white/60 uppercase">
              <span className="flex items-center gap-1.5">
                <Activity
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />
                Respuesta Espectral (dB vs Hz)
              </span>
              <span>{isBypassed ? 'Modo Bypass Flat' : 'Filtros Activos'}</span>
            </div>
            <div className="w-full relative pt-0.5 bg-black/35 rounded-[16px] border border-white/[0.08] p-1.5 overflow-hidden backdrop-blur-md">
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                onDoubleClick={handleCanvasDoubleClick}
                className="w-full block rounded-[10px] cursor-crosshair touch-none select-none"
                aria-label="Gráfica interactiva de ecualización"
              />
              {tooltipInfo && (
                <div
                  className="absolute pointer-events-none px-2.5 py-1 rounded-[8px] bg-black/85 backdrop-blur-md border border-white/20 text-[10px] font-mono shadow-2xl -translate-x-1/2 z-20 whitespace-nowrap"
                  style={{
                    left: `${tooltipInfo.x}px`,
                    top: `${tooltipInfo.y}px`,
                    color: isLucid ? activeColor : '#ffffff',
                  }}
                >
                  {tooltipInfo.text}
                </div>
              )}
              <div className="absolute bottom-2 right-3 pointer-events-none text-[8px] font-mono text-white/45 hidden sm:block">
                Arrastra los nodos • Doble clic para 0dB
              </div>
            </div>
          </div>

          {/* 2. Matriz de Presets de Estudio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-white/60 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Zap
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />{' '}
                Presets de Estudio:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInvert}
                  className="flex items-center gap-1 text-[10px] font-mono text-white/70 hover:text-white btn-spring transition-colors cursor-pointer"
                  title="Invertir curva"
                  aria-label="Invertir curva de ecualización"
                >
                  <FlipHorizontal className="w-3 h-3" /> Invertir
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] font-mono text-white/70 hover:text-white btn-spring transition-colors cursor-pointer"
                  title="Restablecer todo a 0dB"
                  aria-label="Restablecer todas las bandas a 0dB"
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
                    aria-pressed={isSelected}
                    aria-label={`Aplicar preset ${preset.name}`}
                    className={`min-h-[46px] px-3 py-2 rounded-[12px] border text-left flex flex-col justify-between btn-spring transition-all cursor-pointer backdrop-blur-sm ${
                      isSelected
                        ? isLucid
                          ? 'text-white shadow-md'
                          : 'bg-white/[0.18] border-white/40 text-white shadow-md ring-1 ring-white/20'
                        : 'bg-white/[0.04] border-white/[0.07] hover:border-white/[0.18] hover:bg-white/[0.08] text-white/80 hover:text-white'
                    }`}
                    style={
                      isSelected && isLucid
                        ? {
                            backgroundColor: `${activeColor}25`,
                            borderColor: `${activeColor}65`,
                            boxShadow: `0 4px 14px ${activeColor}30`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-[11px] font-medium leading-tight truncate">
                      {preset.name}
                    </span>
                    <span
                      className="text-[8px] font-mono tracking-wider uppercase mt-1 transition-colors"
                      style={{
                        color: isSelected && isLucid ? activeColor : 'rgba(255, 255, 255, 0.55)',
                      }}
                    >
                      {preset.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Faders Verticales de Precisión */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="grid grid-cols-5 sm:grid-cols-10 divide-x divide-white/[0.04] bg-white/[0.02] backdrop-blur-md rounded-[16px] border border-white/[0.08] shadow-inner">
              {eqBands.map((band, idx) => {
                const cat = BAND_CATEGORIES[idx] || { tag: 'MID' };

                return (
                  <div
                    key={band.id}
                    className="flex flex-col items-center py-2.5 px-1 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[8px] font-mono text-white/60 tracking-wider uppercase">
                      {cat.tag}
                    </span>

                    <span className="text-[11px] font-mono font-medium tabular-nums mt-0.5 text-white">
                      {band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)}
                    </span>

                    {/* Fader Vertical de Audio */}
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
                        aria-label={`Banda ${band.label}`}
                        aria-valuemin={-12}
                        aria-valuemax={12}
                        aria-valuenow={band.gain}
                        aria-valuetext={`${band.gain > 0 ? '+' : ''}${band.gain.toFixed(1)} dB`}
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
                        className="w-28 sm:w-32 h-1.5 bg-white/[0.12] rounded-full appearance-none cursor-pointer -rotate-90 origin-center z-10 disabled:opacity-30 focus:outline-none transition-all"
                        style={{
                          accentColor: isLucid ? activeColor : '#ffffff',
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1 w-full justify-center mb-1">
                      <button
                        onClick={() => {
                          setEqBandGain(band.id, Math.max(-12, band.gain - 0.5));
                          setActivePresetId('custom');
                          StorageService.saveActiveEqPresetId('custom');
                        }}
                        disabled={isBypassed || band.gain <= -12}
                        aria-label={`Disminuir ${band.label} 0.5 dB`}
                        className="w-5 h-5 flex items-center justify-center rounded-md bg-white/[0.06] hover:bg-white/[0.14] text-white/80 hover:text-white text-[11px] font-bold disabled:opacity-20 transition-all cursor-pointer shadow-sm active:scale-90"
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
                        aria-label={`Aumentar ${band.label} 0.5 dB`}
                        className="w-5 h-5 flex items-center justify-center rounded-md bg-white/[0.06] hover:bg-white/[0.14] text-white/80 hover:text-white text-[11px] font-bold disabled:opacity-20 transition-all cursor-pointer shadow-sm active:scale-90"
                        title="Subir 0.5dB"
                      >
                        +
                      </button>
                    </div>

                    {/* Frecuencia de la Banda */}
                    <span className="text-[10px] font-mono font-medium text-white/75 tracking-tight">
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
