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

// ── Constantes Inmutables del Sistema ──────────────────────────────────────────
const BLOB_SCALE = 0.5; // Multiplicador visual constante e inmutable (0.5x)
const KICK_THRESHOLD = 0.18;
const KICK_ATTACK_DELTA = 0.06;
const KICK_COOLDOWN_MS = 160;
const WAVE_LIFETIME_MS = 850;
const MAX_ACTIVE_SHOCKWAVES = 3;
const RADIAL_BARS_COUNT = 72;

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
  return clamp(minDim / 700, 0.45, 1.0);
};

export const RainbowBlobVisualizer: React.FC = () => {
  const fileInputId = useId();
  const {
    blobSettings,
    updateBlobSettings,
    resetBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
    audioSpeed,
    setAudioSpeed,
    musicSensitivity,
    currentTrack,
    isMicActive,
    isPlaying,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.2);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [scaleU, setScaleU] = useState<number>(computeScaleFactor);

  // Referencias a elementos DOM de cada capa
  const containerRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const haloPrincipalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const innerCircleRef = useRef<HTMLDivElement>(null);

  // Estados reactivos de física para render 60FPS
  const prevBass = useRef(0);
  const lastKickTimeRef = useRef(0);
  const kickImpulseRef = useRef(0);
  const pulseRef = useRef(1.0);
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);
  const haloRotationRef = useRef(0);
  const shockwavesRef = useRef<ActiveShockwave[]>([]);
  const fftBarsRef = useRef<Float32Array>(new Float32Array(RADIAL_BARS_COUNT));

  // Dimensiones base del sistema (700px responsive)
  const containerSize = Math.round(700 * scaleU);
  const haloSize = Math.round(containerSize * 0.72);
  const innerCircleSize = Math.round((blobSettings.circleSize || 320) * scaleU * BLOB_SCALE);

  // Listener responsivo para reescalado adaptativo
  useEffect(() => {
    const handleResize = () => {
      const u = computeScaleFactor();
      setScaleU(u);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cSize = Math.round(700 * u);
        canvas.width = Math.round(cSize * dpr);
        canvas.height = Math.round(cSize * dpr);
        canvas.style.width = `${cSize}px`;
        canvas.style.height = `${cSize}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loop principal de animación y reactividad a 60FPS
  useEffect(() => {
    let animId: number;
    let phase = 0;

    const render = () => {
      const { bass, mids, energy, raw } = getSmoothedData();
      const isAudioActive = isPlaying || isMicActive;
      const speedMultiplier = clamp(audioSpeed || musicSensitivity || 0.75, 0.5, 1.0);
      const now = performance.now();

      // Detección de accesibilidad
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Filtro EMA (Exponential Moving Average)
      smoothedBassRef.current += (bass - smoothedBassRef.current) * 0.22;
      smoothedMidsRef.current += (mids - smoothedMidsRef.current) * 0.22;
      smoothedEnergyRef.current += (energy - smoothedEnergyRef.current) * 0.22;

      const sBass = isAudioActive ? smoothedBassRef.current * speedMultiplier : 0;
      const sMids = isAudioActive ? smoothedMidsRef.current * speedMultiplier : 0;
      const sEnergy = isAudioActive ? smoothedEnergyRef.current * speedMultiplier : 0;

      phase += (0.015 + sBass * 0.02) * speedMultiplier;

      // ── Detección de Kick & Shockwaves Concéntricas ──
      const attackEnv = Math.max(0, sBass - prevBass.current);
      if (
        sBass > KICK_THRESHOLD &&
        attackEnv > KICK_ATTACK_DELTA &&
        now - lastKickTimeRef.current > KICK_COOLDOWN_MS
      ) {
        lastKickTimeRef.current = now;
        kickImpulseRef.current = 1.0; // Ataque rápido para el pulso del núcleo

        if (shockwavesRef.current.length < MAX_ACTIVE_SHOCKWAVES) {
          shockwavesRef.current.push({
            startTime: now,
            maxRadius: (containerSize / 2) * 0.88,
            strength: 0.5 + sBass * 0.5,
          });
        }
      }
      prevBass.current = sBass;

      // ── Pulso Sutil del Núcleo (0.98 a 1.02) ──
      const targetPulse = prefersReducedMotion
        ? 1.0
        : 1.0 + kickImpulseRef.current * 0.02 - (sBass > 0.35 ? 0.01 : 0);
      pulseRef.current += (targetPulse - pulseRef.current) * 0.22;
      kickImpulseRef.current *= 0.85;

      if (innerCircleRef.current) {
        innerCircleRef.current.style.transform = `translate(-50%, -50%) scale(${pulseRef.current})`;
      }

      // ── Halo Exterior (Escala Fija 0.5, Rotación Máx ±5°, Opacidad 0.3–0.5) ──
      if (haloPrincipalRef.current) {
        if (!prefersReducedMotion) {
          haloRotationRef.current += (sBass * 5.0 - haloRotationRef.current) * 0.08;
          haloPrincipalRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE}) rotate(${haloRotationRef.current}deg)`;
        } else {
          haloPrincipalRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE})`;
        }
        haloPrincipalRef.current.style.opacity = `${0.3 + sEnergy * 0.2}`;
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE})`;
        haloGlowRef.current.style.opacity = `${0.25 + sEnergy * 0.25}`;
      }

      // ── Capa Canvas 2D (Detrás del Círculo Interior, Encima del Halo) ──
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;
          const dpr = w / containerSize;

          ctx.clearRect(0, 0, w, h);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // Radio exacto del borde exterior del círculo interior en coordenadas canvas
          const baseR = (innerCircleSize / 2) * dpr;

          // Resolución de colores temáticos
          const primaryColor = isLucid
            ? (lucidPrimaryColor || lucidTheme.primary || '#00f2fe')
            : '#ffffff';
          const secondaryColor = isLucid
            ? (lucidSecondaryColor || lucidTheme.secondary || '#ff088a')
            : 'rgba(255, 255, 255, 0.4)';

          // 1. Shockwaves Concéntricas
          for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
            const sw = shockwavesRef.current[i];
            const age = now - sw.startTime;
            if (age > WAVE_LIFETIME_MS) {
              shockwavesRef.current.splice(i, 1);
              continue;
            }
            const progress = age / WAVE_LIFETIME_MS;
            const currentR = baseR + progress * (sw.maxRadius * dpr - baseR);
            const alpha = (1.0 - progress) * sw.strength * (isLucid ? 0.4 : 0.22);

            ctx.beginPath();
            ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(1, (1.0 - progress) * 2.4 * dpr);
            ctx.stroke();
          }

          // 2. 72 Barras Radiales de Frecuencia con Lerp Suavizado
          const angleStep = (Math.PI * 2) / RADIAL_BARS_COUNT;
          const fft = fftBarsRef.current;

          for (let i = 0; i < RADIAL_BARS_COUNT; i++) {
            const rawVal = isAudioActive && raw[i % raw.length] ? raw[i % raw.length] / 255 : 0;
            fft[i] += (rawVal - fft[i]) * 0.22;
            const barLen = (2 + fft[i] * (16 + sMids * 10) * speedMultiplier) * dpr;
            const a = i * angleStep;

            const r1 = baseR + 2 * dpr;
            const r2 = r1 + barLen;

            const x1 = cx + Math.cos(a) * r1;
            const y1 = cy + Math.sin(a) * r1;
            const x2 = cx + Math.cos(a) * r2;
            const y2 = cy + Math.sin(a) * r2;

            const alpha = 0.12 + fft[i] * (isLucid ? 0.7 : 0.5);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.3 * dpr;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // 3. Partículas Internas Sutiles (Dentro del núcleo)
          const innerCount = 14;
          for (let k = 0; k < innerCount; k++) {
            const a = (k / innerCount) * Math.PI * 2 + phase * 0.5;
            const r = baseR * 0.76 + Math.sin(phase * 1.6 + k) * (2.5 + sBass * 3.5) * dpr;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;

            ctx.beginPath();
            ctx.arc(px, py, 1.2 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = secondaryColor;
            ctx.globalAlpha = 0.18 + sBass * 0.3;
            ctx.fill();
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    getSmoothedData,
    isPlaying,
    isMicActive,
    audioSpeed,
    musicSensitivity,
    containerSize,
    innerCircleSize,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
  ]);

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

  // ── Estilos Dinámicos según Modo Lúcido ─────────────────────────────────────
  const haloPrincipalBg = useMemo(() => {
    if (isLucid) {
      const p = lucidPrimaryColor || lucidTheme.primary || '#00f2fe';
      const s = lucidSecondaryColor || lucidTheme.secondary || '#ff088a';
      return `conic-gradient(from 0deg, ${p}55 0%, ${s}33 50%, ${p}55 100%)`;
    }
    return 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 60%, transparent 75%)';
  }, [isLucid, lucidTheme, lucidPrimaryColor, lucidSecondaryColor]);

  const haloGlowShadow = useMemo(() => {
    if (isLucid) {
      const glowCol = lucidTheme.glow || lucidPrimaryColor || lucidTheme.primary || 'rgba(0, 242, 254, 0.3)';
      return `0 0 30px ${glowCol}4d`;
    }
    return '0 0 30px rgba(255, 255, 255, 0.04)';
  }, [isLucid, lucidTheme, lucidPrimaryColor]);

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
      {/* ── Capa 1: Fondo Base con Desenfoque Sutil ── */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isLucid && lucidTheme.bgGradient
            ? lucidTheme.bgGradient
            : 'radial-gradient(circle at 50% 50%, #121218 0%, #0A0A0F 70%, #060609 100%)',
          filter: 'blur(8px)',
          zIndex: 0,
        }}
      />

      {/* ── Contenedor Relativo Base Centrado (posX / posY) ── */}
      <div
        ref={containerRef}
        className="relative pointer-events-auto"
        style={{
          position: 'absolute',
          left: `${blobSettings.posX}%`,
          top: `${blobSettings.posY}%`,
          transform: 'translate(-50%, -50%)',
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        }}
      >
        {/* ── Capa 2: Halo Glow (Difuminado, Escala Fija 0.5x) ── */}
        <div
          ref={haloGlowRef}
          className="rounded-full pointer-events-none transition-opacity duration-150"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${BLOB_SCALE})`,
            width: `${haloSize}px`,
            height: `${haloSize}px`,
            boxShadow: haloGlowShadow,
            mixBlendMode: isLucid ? 'screen' : 'normal',
            zIndex: 1,
          }}
        />

        {/* ── Capa 3: Halo Principal (con Blur, Transparencia, Escala Fija 0.5x) ── */}
        <div
          ref={haloPrincipalRef}
          className="rounded-full pointer-events-none transition-opacity duration-150"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${BLOB_SCALE})`,
            width: `${haloSize}px`,
            height: `${haloSize}px`,
            background: haloPrincipalBg,
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            mixBlendMode: isLucid ? 'screen' : 'normal',
            zIndex: 2,
          }}
        />

        {/* ── Capa 4: Canvas de Efectos (Ondas, 72 Barras, Shockwaves) ── */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            zIndex: 3,
          }}
        />

        {/* ── Capa 5: Círculo Interior (Núcleo con Backdrop-Filter y Micro-Pulso) ── */}
        <div
          ref={innerCircleRef}
          className="rounded-full flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(1.0)',
            width: `${innerCircleSize}px`,
            height: `${innerCircleSize}px`,
            backgroundColor: innerCircleBg,
            borderColor: innerCircleBorder,
            borderWidth: '1px',
            borderStyle: 'solid',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            boxShadow: isLucid
              ? '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
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
          {/* ── Capa 6: Logo Central (Perfectamente Circular, 70% del Núcleo) ── */}
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
                    color: isLucid ? (lucidPrimaryColor || lucidTheme.primary) : 'rgba(255, 255, 255, 0.45)',
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
      </div>

      {/* ── Botón Disparador del Panel Flotante ── */}
      <button
        onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
        className="absolute top-4 right-4 z-40 p-2.5 rounded-xl bg-[#0A0A0F]/80 backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 transition-all duration-180 ease-out shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        title="Personalizar Círculo Visualizador"
        aria-label="Personalizar Círculo"
      >
        <Sliders className="w-4 h-4" />
      </button>

      {/* ── Panel de Control Minimalista (Studio Dark #0A0A0F) ── */}
      <AnimatePresence>
        {isBlobPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1.0 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-16 right-4 z-50 w-80 bg-[#0A0A0F] border border-white/[0.08] rounded-2xl shadow-2xl p-4 font-sans select-none"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontFeatureSettings: "'ss01'",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/70" />
                <span className="text-xs uppercase tracking-[0.08em] font-medium text-white/70">
                  Blob Controls
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={resetBlobSettings}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-white"
                  title="Restablecer valores"
                  aria-label="Restablecer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setBlobPanelOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-white"
                  aria-label="Cerrar panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sliders y Controles */}
            <div className="space-y-4 pt-3">
              {/* 1. Audio Speed Slider (0.5x – 1.0x) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="uppercase tracking-[0.08em] text-[11px] font-medium text-white/50">
                    Audio Speed
                  </span>
                  <span
                    className="font-mono text-[11px] font-medium"
                    style={isLucid ? { color: lucidPrimaryColor || lucidTheme.primary } : { color: '#ffffff' }}
                  >
                    {(audioSpeed || musicSensitivity || 0.75).toFixed(2)}x
                  </span>
                </div>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={[clamp(audioSpeed || musicSensitivity || 0.75, 0.5, 1.0)]}
                  onValueChange={(val) => setAudioSpeed(val[0])}
                >
                  <Slider.Track className="bg-white/15 relative grow rounded-full h-[2px]">
                    <Slider.Range
                      className="absolute rounded-full h-full"
                      style={{ backgroundColor: isLucid ? (lucidPrimaryColor || lucidTheme.primary) : '#ffffff' }}
                    />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white rounded-full shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Audio Speed"
                  />
                </Slider.Root>
              </div>

              {/* 2. Diámetro del Círculo Interior */}
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="uppercase tracking-[0.08em] text-[11px] font-medium text-white/50">
                    Circle Diameter
                  </span>
                  <span className="font-mono text-white text-[11px] font-medium">
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
                      style={{ backgroundColor: isLucid ? (lucidPrimaryColor || lucidTheme.primary) : '#ffffff' }}
                    />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white rounded-full shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Circle Diameter"
                  />
                </Slider.Root>
              </div>

              {/* 3. Posición X e Y */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="uppercase tracking-[0.08em] text-[10px] font-medium text-white/50">
                      Pos X
                    </span>
                    <span className="font-mono text-white/80 text-[10px]">{blobSettings.posX}%</span>
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
                      className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none"
                      aria-label="Pos X"
                    />
                  </Slider.Root>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="uppercase tracking-[0.08em] text-[10px] font-medium text-white/50">
                      Pos Y
                    </span>
                    <span className="font-mono text-white/80 text-[10px]">{blobSettings.posY}%</span>
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
                      className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none"
                      aria-label="Pos Y"
                    />
                  </Slider.Root>
                </div>
              </div>

              {/* 4. Gestión del Logo */}
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="block uppercase tracking-[0.08em] text-[11px] font-medium text-white/50 mb-2">
                  Custom Logo
                </span>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] cursor-pointer transition-colors duration-180"
                  >
                    <Upload className="w-3.5 h-3.5 text-white/60" />
                    <span>Upload Logo</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomLogoUpload}
                  />

                  {blobSettings.customLogoUrl && (
                    <button
                      onClick={handleRemoveCustomLogo}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-colors duration-180"
                      title="Eliminar logo personalizado"
                      aria-label="Eliminar logo"
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

      {/* ── Modal de Recorte y Filtros ── */}
      {isCropModalOpen && (
        <LogoCropFilterModal
          isOpen={isCropModalOpen}
          imageSrc={tempImageForCrop}
          onClose={() => {
            setIsCropModalOpen(false);
            setTempImageForCrop(null);
          }}
        />
      )}
    </div>
  );
};

export default RainbowBlobVisualizer;
