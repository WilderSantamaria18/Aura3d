import React, { useRef, useEffect, useState, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Slider from '@radix-ui/react-slider';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import {
  Sliders,
  RotateCcw,
  X,
  Upload,
  Trash2,
  Disc3,
} from 'lucide-react';
import { LogoCropFilterModal } from '../UI/LogoCropFilterModal';

// Constante inmutable: Escala fija del blob (0.5x permanente)
const BLOB_SCALE = 0.5;

// Kick Shockwave Detector & Timing Constants
const KICK_THRESHOLD = 0.18;
const KICK_ATTACK_DELTA = 0.06;
const KICK_COOLDOWN_MS = 160;
const WAVE_LIFETIME_MS = 850;
const MAX_ACTIVE_SHOCKWAVES = 4;

interface ActiveShockwave {
  startTime: number;
  maxRadius: number;
  strength: number;
}

const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

const computeScaleFactor = (): number => {
  if (typeof window === 'undefined') return 1.0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return clamp(minDim / 700, 0.6, 1.0);
};

export const RainbowBlobVisualizer: React.FC = () => {
  const fileInputId = useId();
  const {
    blobSettings,
    updateBlobSettings,
    resetBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
    musicSensitivity,
    setMusicSensitivity,
    currentTrack,
    isMicActive,
    isPlaying,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.2);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);

  const [scaleU, setScaleU] = useState<number>(computeScaleFactor);
  const scaleURef = useRef<number>(computeScaleFactor());

  // Component DOM references
  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const innerCircleRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio smoothing and kick tracking refs
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);
  const prevBass = useRef(0);
  const lastKickTimeRef = useRef(0);
  const kickImpulseRef = useRef(0);
  const pulseRef = useRef(1.0);
  const haloRotationRef = useRef(0);
  const shockwavesRef = useRef<ActiveShockwave[]>([]);
  const fftBarsRef = useRef<Float32Array>(new Float32Array(64));

  // Responsive dimension calculations
  const circleDimension = Math.round(blobSettings.circleSize * scaleU);
  const haloDimension = Math.round(circleDimension * 1.5);
  const canvasDisplaySize = haloDimension;
  const innerCircleDimension = Math.round(circleDimension * BLOB_SCALE);

  // Resize listener for responsive canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      const u = computeScaleFactor();
      scaleURef.current = u;
      setScaleU(u);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displaySize = Math.round(blobSettings.circleSize * u * 1.5);
        canvas.width = Math.round(displaySize * dpr);
        canvas.height = Math.round(displaySize * dpr);
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [blobSettings.circleSize]);

  // Main 60FPS animation & audio reactivity render loop
  useEffect(() => {
    let animId: number;
    let phase = 0;

    const render = () => {
      const { bass, mids, energy, raw } = getSmoothedData();
      const isAudioActive = isPlaying || isMicActive;
      const audioSpeed = clamp(musicSensitivity || 0.75, 0.5, 1.0);
      const now = performance.now();

      // Check prefers-reduced-motion
      const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Exponential moving average filter
      smoothedBassRef.current += (bass - smoothedBassRef.current) * 0.22;
      smoothedMidsRef.current += (mids - smoothedMidsRef.current) * 0.22;
      smoothedEnergyRef.current += (energy - smoothedEnergyRef.current) * 0.22;

      const sBass = isAudioActive ? smoothedBassRef.current * audioSpeed : 0;
      const sMids = isAudioActive ? smoothedMidsRef.current * audioSpeed : 0;
      const sEnergy = isAudioActive ? smoothedEnergyRef.current * audioSpeed : 0;

      phase += 0.015 + sBass * 0.025;

      // ── Kick Detection & Shockwaves Trigger ──
      const attackEnv = Math.max(0, sBass - prevBass.current);
      if (
        sBass > KICK_THRESHOLD &&
        attackEnv > KICK_ATTACK_DELTA &&
        now - lastKickTimeRef.current > KICK_COOLDOWN_MS
      ) {
        lastKickTimeRef.current = now;
        kickImpulseRef.current = 1.0; // Fast attack for subtle inner pulse
        if (shockwavesRef.current.length < MAX_ACTIVE_SHOCKWAVES) {
          shockwavesRef.current.push({
            startTime: now,
            maxRadius: (canvasDisplaySize / 2) * 0.85,
            strength: 0.5 + sBass * 0.5,
          });
        }
      }
      prevBass.current = sBass;

      // ── Inner Circle Subtle Organic Pulse (0.98 - 1.02) ──
      // Fast attack on beat, slow smooth decay via lerp
      const targetPulse = prefersReducedMotion ? 1.0 : 1.0 + kickImpulseRef.current * 0.02 - (sBass > 0.3 ? 0.008 : 0);
      pulseRef.current += (targetPulse - pulseRef.current) * 0.22;
      kickImpulseRef.current *= 0.85;

      if (innerCircleRef.current) {
        innerCircleRef.current.style.transform = `scale(${pulseRef.current})`;
      }

      // ── Outer Halo Subtle Organic Rotation & Opacity ──
      if (haloRef.current) {
        if (!prefersReducedMotion) {
          haloRotationRef.current += (sBass * 8 - haloRotationRef.current) * 0.08;
          haloRef.current.style.transform = `scale(${BLOB_SCALE}) rotate(${haloRotationRef.current}deg)`;
        } else {
          haloRef.current.style.transform = `scale(${BLOB_SCALE})`;
        }
        haloRef.current.style.opacity = `${0.3 + sEnergy * 0.2}`;
      }

      // ── Canvas Layer (Behind Inner Circle, Above Outer Halo) ──
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;

          ctx.clearRect(0, 0, w, h);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter'; // Soft additive light

          // Radius matching the outer boundary of the inner circle in canvas coordinates
          const baseR = (innerCircleDimension / 2) * (w / canvasDisplaySize);

          // Theme color resolution
          const primaryColor = isLucid ? (lucidTheme.primary || '#00f2fe') : '#ffffff';
          const secondaryColor = isLucid ? (lucidTheme.secondary || '#ff088a') : 'rgba(255, 255, 255, 0.4)';

          // 1. Concentric Expanding Kick Shockwaves
          for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
            const sw = shockwavesRef.current[i];
            const age = now - sw.startTime;
            if (age > WAVE_LIFETIME_MS) {
              shockwavesRef.current.splice(i, 1);
              continue;
            }
            const progress = age / WAVE_LIFETIME_MS;
            const currentR = baseR + progress * (sw.maxRadius * (w / canvasDisplaySize) - baseR);
            const alpha = (1.0 - progress) * sw.strength * (isLucid ? 0.45 : 0.25);

            ctx.beginPath();
            ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(1, (1.0 - progress) * 2.2);
            ctx.stroke();
          }

          // 2. Radial Frequency Bars / Ticks (Smooth lerp)
          const barCount = 64;
          const angleStep = (Math.PI * 2) / barCount;
          const fft = fftBarsRef.current;

          for (let i = 0; i < barCount; i++) {
            const rawVal = isAudioActive && raw[i % raw.length] ? raw[i % raw.length] / 255 : 0;
            fft[i] += (rawVal - fft[i]) * 0.22;
            const len = (2 + fft[i] * (18 + sMids * 8) * audioSpeed) * (w / canvasDisplaySize);
            const a = i * angleStep;

            const r1 = baseR + 2;
            const r2 = baseR + 2 + len;

            const x1 = cx + Math.cos(a) * r1;
            const y1 = cy + Math.sin(a) * r1;
            const x2 = cx + Math.cos(a) * r2;
            const y2 = cy + Math.sin(a) * r2;

            const alpha = 0.15 + fft[i] * (isLucid ? 0.75 : 0.55);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // 3. Subtle Internal Particles ("Inners" within the void perimeter)
          const innerCount = 16;
          for (let k = 0; k < innerCount; k++) {
            const a = (k / innerCount) * Math.PI * 2 + phase * 0.6;
            const r = baseR * 0.78 + Math.sin(phase * 1.5 + k) * (3 + sBass * 4);
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;

            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = secondaryColor;
            ctx.globalAlpha = 0.2 + sBass * 0.35;
            ctx.fill();
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [getSmoothedData, isPlaying, isMicActive, musicSensitivity, circleDimension, haloDimension, canvasDisplaySize, innerCircleDimension, isLucid, lucidTheme]);

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        setTempImageForCrop(result);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustomLogo = () => {
    updateBlobSettings({ customLogoUrl: null });
  };

  const activeImage = blobSettings.customLogoUrl || currentTrack?.coverUrl;

  // Dynamic styles depending on Lucid Mode
  const haloBackground = useMemo(() => {
    if (isLucid) {
      return `radial-gradient(circle, ${lucidTheme.primary}40 0%, ${lucidTheme.secondary}20 50%, transparent 75%)`;
    }
    return 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 60%, transparent 75%)';
  }, [isLucid, lucidTheme]);

  const haloBoxShadow = useMemo(() => {
    if (isLucid) {
      return `0 0 30px ${lucidTheme.glow || lucidTheme.primary + '30'}`;
    }
    return '0 4px 24px rgba(0, 0, 0, 0.5)';
  }, [isLucid, lucidTheme]);

  const innerCircleBg = useMemo(() => {
    if (isLucid) {
      return lucidTheme.glassColor || 'rgba(10, 15, 28, 0.7)';
    }
    return 'rgba(255, 255, 255, 0.03)';
  }, [isLucid, lucidTheme]);

  const innerCircleBorder = useMemo(() => {
    if (isLucid) {
      return lucidTheme.borderColor || 'rgba(255, 255, 255, 0.15)';
    }
    return 'rgba(255, 255, 255, 0.08)';
  }, [isLucid, lucidTheme]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#0A0A0F]">
      {/* ── Layer 0: Fondo base con blur muy sutil para profundidad ── */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isLucid && lucidTheme.bgGradient
            ? lucidTheme.bgGradient
            : 'radial-gradient(circle at 50% 50%, #121218 0%, #0A0A0F 70%, #060609 100%)',
          filter: 'blur(8px)',
        }}
      />

      {/* ── Main Root Transform Container (Position X / Y) ── */}
      <div
        ref={containerRef}
        className="absolute pointer-events-auto"
        style={{
          left: `${blobSettings.posX}%`,
          top: `${blobSettings.posY}%`,
          transform: 'translate(-50%, -50%)',
          width: `${haloDimension}px`,
          height: `${haloDimension}px`,
        }}
      >
        {/* ── Layer 1: Halo exterior (semi-transparente, escala fija 0.5) ── */}
        <div
          ref={haloRef}
          className="absolute inset-0 m-auto rounded-full pointer-events-none transition-opacity duration-150"
          style={{
            width: `${haloDimension}px`,
            height: `${haloDimension}px`,
            background: haloBackground,
            boxShadow: haloBoxShadow,
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            mixBlendMode: isLucid ? 'screen' : 'normal',
            transformOrigin: 'center center',
            transform: `scale(${BLOB_SCALE})`,
            zIndex: 1,
          }}
        />

        {/* ── Layer 2: Canvas de ondas, anillos y shockwaves (centrado exacto) ── */}
        <canvas
          ref={canvasRef}
          className="absolute pointer-events-none"
          style={{
            width: `${canvasDisplaySize}px`,
            height: `${canvasDisplaySize}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        />

        {/* ── Layer 3: Círculo interior (núcleo/void translúcido con sutil micro-pulso) ── */}
        <div
          ref={innerCircleRef}
          className="absolute inset-0 m-auto rounded-full flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{
            width: `${innerCircleDimension}px`,
            height: `${innerCircleDimension}px`,
            backgroundColor: innerCircleBg,
            borderColor: innerCircleBorder,
            borderWidth: '1px',
            borderStyle: 'solid',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            boxShadow: isLucid
              ? '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
            transformOrigin: 'center center',
            zIndex: 10,
          }}
          onClick={() => {
            if (activeImage) {
              setTempImageForCrop(activeImage);
              setIsCropModalOpen(true);
            }
          }}
          title="Haz clic para recortar o ajustar el logo"
        >
          {/* ── Layer 4: Logo central (perfectamente circular, 70% del núcleo) ── */}
          <div
            className="relative flex items-center justify-center group"
            style={{
              width: '70%',
              height: '70%',
              zIndex: 20,
            }}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-black/20">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt="Carátula / Logo"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{
                    clipPath: 'circle(50% at center)',
                  }}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full flex flex-col items-center justify-center transition-colors"
                  style={{
                    color: isLucid ? lucidTheme.primary : 'rgba(255, 255, 255, 0.45)',
                  }}
                >
                  <Disc3 className="w-[60%] h-[60%] stroke-[1.2] group-hover:scale-105 transition-transform" />
                  <span className="text-[9px] uppercase tracking-widest mt-1 font-mono text-white/40">
                    Audio
                  </span>
                </div>
              )}
            </div>

            {/* Sutil micro-borde del logo */}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
          </div>
        </div>

        {/* Información sutil de pista debajo del círculo */}
        {circleDimension >= 140 && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center w-64 pointer-events-none z-20">
            <p className="text-white/60 font-light tracking-[0.25em] text-[10px] uppercase truncate font-mono">
              {isMicActive ? 'Live Input' : currentTrack?.title || 'Studio Audio'}
            </p>
          </div>
        )}
      </div>

      {/* ── Layer 5: Controles flotantes (z-50) ── */}
      <div className="fixed top-28 right-6 z-40">
        <button
          onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121218]/90 border border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-[#1a1a22] transition-all text-xs shadow-lg backdrop-blur-md font-mono"
          style={isLucid ? { borderColor: `${lucidTheme.primary}40`, color: lucidTheme.primary } : undefined}
          title="Ajustes del Visualizador"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Control</span>
        </button>
      </div>

      {/* Panel de Configuración Minimalista con Framer Motion & Radix UI Slider */}
      <AnimatePresence>
        {isBlobPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1.0 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed top-38 right-6 z-50 w-80 bg-[#121218]/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-white font-sans"
            style={isLucid ? { borderColor: `${lucidTheme.primary}30` } : undefined}
          >
            {/* Header */}
            <header className="flex justify-between items-center pb-3 border-b border-white/8">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[13px] font-medium tracking-tight text-white/90">Visualizer</h3>
                <span className="text-[10px] font-mono text-white/40">Fixed 0.5x</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={resetBlobSettings}
                  className="p-1 text-white/40 hover:text-white/80 transition-colors rounded-md"
                  title="Restablecer valores"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setBlobPanelOpen(false)}
                  className="p-1 text-white/40 hover:text-white/80 transition-colors rounded-md"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Controls List */}
            <div className="space-y-4 pt-3">
              {/* 1. Audio Slider (0.5x - 1.0x) con Radix UI */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-mono">
                  <span className="text-white/60 text-[11px]">Audio Speed</span>
                  <span
                    className="font-medium text-[11px]"
                    style={isLucid ? { color: lucidTheme.primary } : { color: '#ffffff' }}
                  >
                    {(musicSensitivity || 0.75).toFixed(2)}x
                  </span>
                </div>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={[clamp(musicSensitivity || 0.75, 0.5, 1.0)]}
                  onValueChange={(val) => setMusicSensitivity(val[0])}
                >
                  <Slider.Track className="bg-white/15 relative grow rounded-full h-[2px]">
                    <Slider.Range
                      className="absolute rounded-full h-full"
                      style={{ backgroundColor: isLucid ? lucidTheme.primary : '#ffffff' }}
                    />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                    aria-label="Audio Speed"
                  />
                </Slider.Root>
              </div>

              {/* 2. Circle Dimension con Radix UI */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-mono">
                  <span className="text-white/60 text-[11px]">Circle Diameter</span>
                  <span className="text-white font-medium text-[11px]">
                    {blobSettings.circleSize}px
                  </span>
                </div>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                  min={200}
                  max={450}
                  step={10}
                  value={[blobSettings.circleSize]}
                  onValueChange={(val) => updateBlobSettings({ circleSize: val[0] })}
                >
                  <Slider.Track className="bg-white/15 relative grow rounded-full h-[2px]">
                    <Slider.Range
                      className="absolute rounded-full h-full"
                      style={{ backgroundColor: isLucid ? lucidTheme.primary : '#ffffff' }}
                    />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                    aria-label="Circle Diameter"
                  />
                </Slider.Root>
              </div>

              {/* 3. Position X & Y */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-white/60 text-[10px]">Pos X</span>
                    <span className="text-white/80 text-[10px]">{blobSettings.posX}%</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-4 cursor-pointer"
                    min={10}
                    max={90}
                    step={1}
                    value={[blobSettings.posX]}
                    onValueChange={(val) => updateBlobSettings({ posX: val[0] })}
                  >
                    <Slider.Track className="bg-white/15 relative grow rounded-full h-[2px]">
                      <Slider.Range className="absolute bg-white rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-3 h-3 bg-white rounded-full shadow-md focus:outline-none"
                      aria-label="Position X"
                    />
                  </Slider.Root>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-white/60 text-[10px]">Pos Y</span>
                    <span className="text-white/80 text-[10px]">{blobSettings.posY}%</span>
                  </div>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-4 cursor-pointer"
                    min={10}
                    max={90}
                    step={1}
                    value={[blobSettings.posY]}
                    onValueChange={(val) => updateBlobSettings({ posY: val[0] })}
                  >
                    <Slider.Track className="bg-white/15 relative grow rounded-full h-[2px]">
                      <Slider.Range className="absolute bg-white rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-3 h-3 bg-white rounded-full shadow-md focus:outline-none"
                      aria-label="Position Y"
                    />
                  </Slider.Root>
                </div>
              </div>

              {/* 4. Logo Management */}
              <div className="pt-2 border-t border-white/8">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-white/80 transition-all cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Logo</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomLogoUpload}
                    className="hidden"
                  />

                  {blobSettings.customLogoUrl && (
                    <button
                      onClick={handleRemoveCustomLogo}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-all"
                      title="Eliminar logo personalizado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop & Filter Modal */}
      {isCropModalOpen && tempImageForCrop && (
        <LogoCropFilterModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={tempImageForCrop}
        />
      )}
    </div>
  );
};

export default RainbowBlobVisualizer;
