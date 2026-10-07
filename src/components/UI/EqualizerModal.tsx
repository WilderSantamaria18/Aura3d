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
  Waves,
  Gauge,
  Compass,
  Headphones,
  Disc3,
  ExternalLink,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { StorageService } from '../../services/storageService';
import { AudioEngine } from '../../services/audioEngine';
import { useShallow } from 'zustand/react/shallow';
import { StereoVuMeter } from '../Player/StereoVuMeter';
import { LissajousGoniometer } from '../Player/LissajousGoniometer';
import { WaterfallSpectrogram } from '../Visualizers/WaterfallSpectrogram';
import { triggerVisualShockwave } from './VisualFeedbackRipple';
import type { ReverbPreset, MasteringLimiterPreset } from '../../types/audio';

interface EQPreset {
  id: string;
  name: string;
  tag: string;
  gains: number[];
}

const MASTERING_PRESETS: { id: MasteringLimiterPreset; label: string; desc: string }[] = [
  { id: 'off', label: 'Bypass', desc: 'Sin compresión' },
  { id: 'smart_loudness', label: 'Nivelador AGC', desc: 'RMS balanceado sin saltos' },
  { id: 'punchy_club', label: 'Club Punch', desc: 'Pegada dinámica y graves definidos' },
  { id: 'warm_tape', label: 'Warm Tape', desc: 'Calor analógico y saturación sutil' },
  { id: 'vocal_clarity', label: 'Vocal Clarity', desc: 'Presencia acústica y voces claras' },
];

const REVERB_SPACES: { id: ReverbPreset; label: string; desc: string }[] = [
  { id: 'off', label: 'Directo', desc: 'Bypass / Sin espacio' },
  { id: 'studio', label: 'Studio Booth', desc: 'Acústica seca y controlada' },
  { id: 'club', label: 'Jazz Club', desc: 'Calidez y rebotes de madera' },
  { id: 'concert', label: 'Concert Hall', desc: 'Amplitud sinfónica' },
  { id: 'cathedral', label: 'Cathedral / Void', desc: 'Caída etérea monumental' },
];

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
  { id: 0, tag: 'SUB', color: '#a855f7' },
  { id: 1, tag: 'SUB', color: '#8b5cf6' },
  { id: 2, tag: 'BASS', color: '#06b6d4' },
  { id: 3, tag: 'BASS', color: '#0ea5e9' },
  { id: 4, tag: 'MID', color: '#10b981' },
  { id: 5, tag: 'MID', color: '#22c55e' },
  { id: 6, tag: 'MID', color: '#eab308' },
  { id: 7, tag: 'HIGH', color: '#f97316' },
  { id: 8, tag: 'HIGH', color: '#f43f5e' },
  { id: 9, tag: 'AIR', color: '#38bdf8' },
];

const NOTE_HINTS = [
  'Sub C1',
  'Punch C2',
  'Warmth B2',
  'Body B3',
  'Mid B4',
  'Vocal B5',
  'Attack B6',
  'Def B7',
  'Bright B8',
  'Air B9',
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
    reverbPreset,
    setReverbPreset,
    isCrossfadeActive,
    toggleCrossfade,
    masteringPreset,
    setMasteringPreset,
    isLoudnessNormalizationActive,
    toggleLoudnessNormalization,
    is8DAudioActive,
    toggle8DAudio,
    eightDSpeed,
    set8DSpeed,
  } = usePlayerStore(
    useShallow((s) => ({
      isEqualizerOpen: s.isEqualizerOpen,
      setEqualizerOpen: s.setEqualizerOpen,
      eqBands: s.eqBands,
      setEqBandGain: s.setEqBandGain,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      lucidPrimaryColor: s.lucidPrimaryColor,
      reverbPreset: s.reverbPreset,
      setReverbPreset: s.setReverbPreset,
      isCrossfadeActive: s.isCrossfadeActive,
      toggleCrossfade: s.toggleCrossfade,
      masteringPreset: s.masteringPreset,
      setMasteringPreset: s.setMasteringPreset,
      isLoudnessNormalizationActive: s.isLoudnessNormalizationActive,
      toggleLoudnessNormalization: s.toggleLoudnessNormalization,
      is8DAudioActive: s.is8DAudioActive,
      toggle8DAudio: s.toggle8DAudio,
      eightDSpeed: s.eightDSpeed,
      set8DSpeed: s.set8DSpeed,
    }))
  );

  const [activePresetId, setActivePresetId] = useState<string>(() => StorageService.getActiveEqPresetId());
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const [visViewMode, setVisViewMode] = useState<'split' | 'spline' | 'goniometer'>('split');
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
      const H = 145;

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
        const y = H / 2 - (db / 12) * (H * 0.40);
        ctx.strokeStyle = db === 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = db === 0 ? 1.2 : 0.8;
        ctx.setLineDash(db === 0 ? [] : [2, 4]);

        ctx.beginPath();
        ctx.moveTo(marginL, y);
        ctx.lineTo(W - 12, y);
        ctx.stroke();

        ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.35)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}`, marginL - 6, y);
      });
      ctx.setLineDash([]);

      // 2. Frequency Gridlines and Reference Labels at bottom
      eqBands.forEach((band, idx) => {
        const x = marginL + (idx / (eqBands.length - 1)) * availW;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x, H - 18);
        ctx.stroke();

        ctx.fillStyle = hoveredBandIdx === idx || draggingBandIdx === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.38)';
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(band.label, x, H - 3);
      });
      ctx.setLineDash([]);

      // 3. Real-time RTA FFT Spectrum (Analyzer Background)
      const freqData = AudioEngine.getInstance().getFrequencyData();
      if (freqData && freqData.raw && freqData.raw.length > 0) {
        const raw = freqData.raw;
        const binCount = Math.min(64, raw.length);
        const specWidth = availW / binCount;

        const specGrad = ctx.createLinearGradient(0, H - 16, 0, 0);
        if (isLucid) {
          specGrad.addColorStop(0, `${activeColor}04`);
          specGrad.addColorStop(0.7, `${activeColor}18`);
          specGrad.addColorStop(1, `${activeColor}30`);
        } else {
          specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
          specGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.10)');
          specGrad.addColorStop(1, 'rgba(0, 240, 255, 0.22)');
        }

        ctx.fillStyle = specGrad;
        ctx.beginPath();
        ctx.moveTo(marginL, H - 16);

        for (let i = 0; i < binCount; i++) {
          const val = raw[Math.floor((i / binCount) * (raw.length * 0.7))] / 255;
          const barX = marginL + i * specWidth;
          const barY = H - 16 - val * (H * 0.70);
          ctx.lineTo(barX, barY);
        }
        ctx.lineTo(marginL + availW, H - 16);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Spline points for the 10 bands
      const points: { x: number; y: number; gain: number; bandIdx: number }[] = [];
      eqBands.forEach((band, idx) => {
        const x = marginL + (idx / (eqBands.length - 1)) * availW;
        const gain = isBypassed ? 0 : band.gain;
        const y = H / 2 - (gain / 12) * (H * 0.40);
        points.push({ x, y, gain, bandIdx: idx });
      });

      if (points.length >= 2) {
        // Volumetric gradient area under Bézier curve
        const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (isLucid) {
          fillGrad.addColorStop(0, `${activeColor}30`);
          fillGrad.addColorStop(0.5, `${activeColor}10`);
          fillGrad.addColorStop(1, 'transparent');
        } else {
          fillGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
          fillGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.07)');
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

        // ── Pass 1: Luminous Neon Bloom Halo ──
        ctx.save();
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
        ctx.shadowColor = isLucid ? activeColor : '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = isLucid ? activeColor : '#00e5ff';
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.restore();

        // ── Pass 2: Laser Core Line ──
        ctx.save();
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
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();

        // 5. Interactive Chromatic Nodes for each band
        points.forEach((p, idx) => {
          const isTargeted = hoveredBandIdx === idx || draggingBandIdx === idx;
          const cat = BAND_CATEGORIES[idx] || { color: '#00f0ff' };
          const isAtZero = Math.abs(p.gain) < 0.25;

          // Outer halo / magnetic snap ring
          if (isTargeted || isAtZero) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, isTargeted ? 9 : 6, 0, Math.PI * 2);
            ctx.fillStyle = isAtZero ? 'rgba(52, 199, 89, 0.25)' : `${cat.color}35`;
            ctx.fill();
            if (isTargeted) {
              ctx.strokeStyle = isAtZero ? '#34c759' : cat.color;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }

          // Node pip
          ctx.beginPath();
          ctx.arc(p.x, p.y, isTargeted ? 5.2 : 3.8, 0, Math.PI * 2);
          ctx.fillStyle = isTargeted ? '#ffffff' : cat.color;
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [eqBands, isLucid, activeColor, isBypassed, hoveredBandIdx, draggingBandIdx, visViewMode]);

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
      // Soporte para trazo libre / pintura de curvas cruzando bandas
      const targetBandIdx = Math.max(
        0,
        Math.min(eqBands.length - 1, Math.round(((x - marginL) / availW) * (eqBands.length - 1)))
      );
      const H = rect.height;
      const normY = (H / 2 - y) / (H * 0.40);
      let newGain = Math.min(12, Math.max(-12, Math.round(normY * 12 * 2) / 2));
      // Snap magnético al cruzar el umbral de 0dB
      if (Math.abs(normY * 12) < 0.38) {
        newGain = 0;
      }
      const band = eqBands[targetBandIdx];
      if (band) {
        setEqBandGain(band.id, newGain);
        setActivePresetId('custom');
        StorageService.saveActiveEqPresetId('custom');
        const noteHint = NOTE_HINTS[targetBandIdx] || '';
        setTooltipInfo({
          x: marginL + (targetBandIdx / (eqBands.length - 1)) * availW,
          y: Math.max(10, y - 28),
          text: `${band.label} (${noteHint}): ${newGain > 0 ? '+' : ''}${newGain.toFixed(1)} dB`,
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
      const noteHint = NOTE_HINTS[closestIdx] || '';
      setTooltipInfo({
        x,
        y: Math.max(10, y - 28),
        text: `${band.label} (${noteHint}): ${band.gain > 0 ? '+' : ''}${band.gain.toFixed(1)} dB`,
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
              className="glass-item !rounded-2xl w-9 h-9 flex items-center justify-center"
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
              className={`glass-btn btn-spring px-4 py-1.5 min-h-[36px] text-[11px] font-display font-tabular font-bold tracking-wider uppercase flex items-center gap-2 ${
                isBypassed
                  ? 'is-active text-amber-100 [--glass-accent:245,158,11]'
                  : 'text-white/90 hover:text-white'
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
              className="glass-btn btn-spring w-9 h-9 text-white/75 hover:text-white flex items-center justify-center"
              aria-label="Cerrar ecualizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Continuous Studio Surface ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {/* 1. Curva de Respuesta de Frecuencia & Vector-Scope de Fase */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-mono text-white/60 uppercase">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 font-bold tracking-wider">
                  <Activity
                    className="w-3 h-3"
                    style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                  />
                  Monitoreo de Estudio
                </span>

                {/* Segmented View Mode Toggle: Dual / Spline / Vector-Scope */}
                <div className="inline-flex rounded-lg p-0.5 bg-white/[0.06] border border-white/10 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => setVisViewMode('split')}
                    className={`px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer ${
                      visViewMode === 'split' ? 'bg-white/20 text-white font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Dual
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisViewMode('spline')}
                    className={`px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer ${
                      visViewMode === 'spline' ? 'bg-white/20 text-white font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Curva RTA
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisViewMode('goniometer')}
                    className={`px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer ${
                      visViewMode === 'goniometer' ? 'bg-white/20 text-white font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Vector-Scope
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StereoVuMeter orientation="horizontal" segments={12} showLabels={true} showCorrelation={true} className="w-40 hidden sm:flex" />
                <span className="font-bold text-white/80">{isBypassed ? 'Modo Bypass Flat' : 'Filtros Activos'}</span>
              </div>
            </div>

            <div className="glass-card w-full relative !p-2.5 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* 1. Spline RTA Canvas (visible en 'spline' o 'split') */}
                {(visViewMode === 'spline' || visViewMode === 'split') && (
                  <div className={`relative ${visViewMode === 'split' ? 'w-full sm:flex-1' : 'w-full'} overflow-hidden rounded-[10px]`}>
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
                      Arrastra los nodos para dibujar la curva • Doble clic para 0dB
                    </div>
                  </div>
                )}

                {/* 2. Lissajous Vector-Scope (visible en 'goniometer' o 'split') */}
                {(visViewMode === 'goniometer' || visViewMode === 'split') && (
                  <div className={`${visViewMode === 'split' ? 'w-full sm:w-44 flex-shrink-0' : 'w-full py-2 flex justify-center'} flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-3`}>
                    <LissajousGoniometer
                      size={visViewMode === 'split' ? 125 : 160}
                      showCorrelationBar={true}
                      showLabels={true}
                    />
                  </div>
                )}
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
                    className={`glass-item !rounded-2xl min-h-[48px] px-3.5 py-2 text-left flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? isLucid
                          ? 'is-active text-white'
                          : 'is-active text-white'
                        : 'text-white/80 hover:text-white'
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

          {/* 3. Acústica de Sala Espacial (Reverb de Convolución 3D) & Crossfade */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-white/60 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Waves
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />{' '}
                Acústica Espacial (Convolución 3D):
              </span>
              <button
                type="button"
                onClick={toggleCrossfade}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                  isCrossfadeActive
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80'
                }`}
                title="Transición suave sin cortes entre canciones"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCrossfadeActive ? 'bg-cyan-400 animate-pulse' : 'bg-white/30'}`} />
                Crossfade Hi-Fi {isCrossfadeActive ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {REVERB_SPACES.map((space) => {
                const isSelected = reverbPreset === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setReverbPreset(space.id)}
                    aria-pressed={isSelected}
                    className={`glass-item !rounded-2xl min-h-[44px] px-3 py-1.5 text-left flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isLucid
                          ? 'is-active text-white'
                          : 'is-active text-white'
                        : 'text-white/70 hover:text-white'
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
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-semibold tracking-tight truncate">
                        {space.label}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-white/45 truncate mt-0.5">
                      {space.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Nivelador Inteligente de Volumen (AGC) & Limitador Master */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-white/60 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Gauge
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />{' '}
                Nivelador Inteligente (Compresor RMS & Limitador):
              </span>
              <button
                type="button"
                onClick={toggleLoudnessNormalization}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                  isLoudnessNormalizationActive
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80'
                }`}
                title="Normaliza el volumen automáticamente para evitar saltos entre canciones"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isLoudnessNormalizationActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                Normalizador AGC {isLoudnessNormalizationActive ? 'ACTIVO' : 'OFF'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {MASTERING_PRESETS.map((m) => {
                const isSelected = masteringPreset === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMasteringPreset(m.id)}
                    aria-pressed={isSelected}
                    className={`glass-item !rounded-2xl min-h-[44px] px-3 py-1.5 text-left flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isLucid
                          ? 'is-active text-white'
                          : 'is-active text-white'
                        : 'text-white/70 hover:text-white'
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
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-semibold tracking-tight truncate">
                        {m.label}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-white/45 truncate mt-0.5">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Audio Espacial 8D / Modo Órbita Binaural */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-mono text-white/60 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Headphones
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />{' '}
                Audio Espacial 8D (Órbita 360° para Auriculares):
              </span>
              <button
                type="button"
                onClick={toggle8DAudio}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                  is8DAudioActive
                    ? 'bg-purple-500/15 border-purple-400/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80'
                }`}
                title="Efecto de rotación binaural continua alrededor de tu cabeza"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${is8DAudioActive ? 'bg-purple-400 animate-pulse' : 'bg-white/30'}`} />
                Modo 8D {is8DAudioActive ? 'ACTIVO' : 'OFF'}
              </button>
            </div>

            {is8DAudioActive && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <Compass className="w-4 h-4 text-purple-400 animate-spin-slow flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-mono text-white/80">
                    <span>Velocidad de rotación orbital</span>
                    <span className="text-purple-300 font-bold">{(eightDSpeed * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.60"
                    step="0.01"
                    value={eightDSpeed}
                    onChange={(e) => set8DSpeed(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>0.05x (Lento y envolvente)</span>
                    <span>0.60x (Rápido y vertiginoso)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Faders Verticales de Precisión con Espectrograma en Cascada */}
          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/60 uppercase px-1">
              <span className="flex items-center gap-1.5">
                <Sliders
                  className="w-3 h-3"
                  style={{ color: isLucid ? activeColor : 'rgba(255, 255, 255, 0.85)' }}
                />{' '}
                Faders DSP & Cascada FFT
              </span>
              <span className="text-[9px] text-white/40 font-mono hidden sm:inline">
                Cascada Termo-Espectral Neón en Vivo
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden glass-card !p-0">
              {/* Espectrograma FFT Neón en Cascada detrás de los deslizadores */}
              <WaterfallSpectrogram className="z-0" opacity={0.38} height={215} />

              <div className="relative z-10 grid grid-cols-5 sm:grid-cols-10 divide-x divide-white/[0.06] overflow-hidden bg-black/20 backdrop-blur-[3px]">
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

                    {/* Fader Vertical de Audio con Barra Bipolar Iluminada */}
                    <div className="h-32 sm:h-36 flex items-center justify-center my-1 relative w-full">
                      {/* Bipolar LED fill meter */}
                      <div className="absolute w-1.5 h-28 sm:h-32 rounded-full bg-white/[0.08] overflow-hidden pointer-events-none">
                        <div
                          className="absolute w-full rounded-full transition-all duration-150"
                          style={{
                            top: band.gain >= 0 ? `${50 - (band.gain / 12) * 50}%` : '50%',
                            bottom: band.gain < 0 ? `${50 - (Math.abs(band.gain) / 12) * 50}%` : '50%',
                            height: `${(Math.abs(band.gain) / 12) * 50}%`,
                            background: band.gain > 0
                              ? `linear-gradient(to top, ${cat.color || activeColor}, #ffffff)`
                              : `linear-gradient(to bottom, ${cat.color || activeColor}99, rgba(59, 130, 246, 0.8))`,
                            boxShadow: Math.abs(band.gain) > 1 ? `0 0 10px ${cat.color || activeColor}99` : 'none',
                          }}
                        />
                      </div>

                      {/* Notch Central 0dB */}
                      <div className="absolute w-4 h-[1px] bg-white/40 pointer-events-none z-0" />
                      
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
                        className="w-28 sm:w-32 h-1.5 bg-transparent rounded-full appearance-none cursor-pointer -rotate-90 origin-center z-10 disabled:opacity-30 focus:outline-none transition-all"
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
                        className="glass-btn w-6 h-6 flex items-center justify-center text-white/85 hover:text-white text-[11px] font-bold disabled:opacity-20"
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
                        className="glass-btn w-6 h-6 flex items-center justify-center text-white/85 hover:text-white text-[11px] font-bold disabled:opacity-20"
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
    </div>
  );
};

export default EqualizerModal;
