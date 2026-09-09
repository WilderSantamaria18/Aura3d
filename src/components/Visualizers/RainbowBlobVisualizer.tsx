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
const BLOB_SCALE = 0.5; // Escala constante del halo exterior (multiplicador visual 0.5x)
const KICK_THRESHOLD = 0.18;
const KICK_ATTACK_DELTA = 0.06;
const KICK_COOLDOWN_MS = 160;
const WAVE_LIFETIME_MS = 850;
const MAX_ACTIVE_SHOCKWAVES = 3;
const INNER_PARTICLES_COUNT = 30;

interface ActiveShockwave {
  startTime: number;
  maxDistance: number;
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
    blobWaveIntensity,
    blobBassBoomIntensity,
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

  // Referencias a los elementos DOM de las capas concéntricas
  const containerRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const haloPrincipalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const innerCircleRef = useRef<HTMLDivElement>(null);

  // Estados de física e interpolación para el render loop a 60FPS
  const prevBass = useRef(0);
  const lastKickTimeRef = useRef(0);
  const kickImpulseRef = useRef(0);
  const pulseRef = useRef(1.0);
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);
  const haloRotationRef = useRef(0);
  const shockwavesRef = useRef<ActiveShockwave[]>([]);
  const fftBarsRef = useRef<Float32Array>(new Float32Array(72));

  // Dimensiones base del sistema (700px responsive)
  const containerSize = Math.round(700 * scaleU);
  const haloSize = Math.round(containerSize * 0.76);
  const innerCircleSize = Math.round((blobSettings.circleSize || 320) * scaleU * BLOB_SCALE);

  // Listener para redimensionamiento del canvas y escala de pantalla
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

  // Loop de Renderizado en Canvas 2D a 60FPS
  useEffect(() => {
    let animId: number;

    const render = () => {
      const { bass, mids, energy, raw } = getSmoothedData();
      const isAudioActive = isPlaying || isMicActive;
      const speedMultiplier = clamp(audioSpeed || musicSensitivity || 0.75, 0.5, 1.0);
      const now = performance.now();
      const timeSeconds = now * 0.001;

      // Respetar preferencia de reducción de movimiento
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Suavizado EMA de bandas
      smoothedBassRef.current += (bass - smoothedBassRef.current) * 0.22;
      smoothedMidsRef.current += (mids - smoothedMidsRef.current) * 0.22;
      smoothedEnergyRef.current += (energy - smoothedEnergyRef.current) * 0.22;

      const sBass = isAudioActive ? smoothedBassRef.current * speedMultiplier : 0;
      const sMids = isAudioActive ? smoothedMidsRef.current * speedMultiplier : 0;
      const sEnergy = isAudioActive ? smoothedEnergyRef.current * speedMultiplier : 0;

      // ── 1. Detección de Kick (Envelope Follower) ──
      const attackEnv = Math.max(0, sBass - prevBass.current);
      if (
        sBass > KICK_THRESHOLD &&
        attackEnv > KICK_ATTACK_DELTA &&
        now - lastKickTimeRef.current > KICK_COOLDOWN_MS
      ) {
        lastKickTimeRef.current = now;
        kickImpulseRef.current = 1.0; // Disparo rápido para el pulso del núcleo

        if (!prefersReducedMotion && shockwavesRef.current.length < MAX_ACTIVE_SHOCKWAVES) {
          const intensity = blobWaveIntensity ?? 1.0;
          const boomIntensity = blobBassBoomIntensity ?? 1.0;
          const calculatedDistance = 380 * intensity * boomIntensity * scaleU;

          shockwavesRef.current.push({
            startTime: now,
            maxDistance: calculatedDistance,
            strength: 0.6 + sBass * 0.4,
          });
        }
      }
      prevBass.current = sBass;

      // ── 2. Pulso del Núcleo (0.98 a 1.02 con ataque rápido 0.1s y decaimiento 0.5s) ──
      const targetScale = prefersReducedMotion
        ? 1.0
        : 1.0 + kickImpulseRef.current * 0.02 - (sBass > 0.35 ? 0.01 : 0);
      
      const pulseLerpFactor = kickImpulseRef.current > 0.3 ? 0.25 : 0.08;
      pulseRef.current += (targetScale - pulseRef.current) * pulseLerpFactor;
      kickImpulseRef.current *= 0.92;

      if (innerCircleRef.current) {
        innerCircleRef.current.style.transform = `translate(-50%, -50%) scale(${pulseRef.current})`;
      }

      // ── 3. Halo Exterior (Escala Fija 0.5, Rotación ±5°, Opacidad 0.3–0.5) ──
      if (haloPrincipalRef.current) {
        if (!prefersReducedMotion) {
          haloRotationRef.current += (sBass * 5.0 - haloRotationRef.current) * 0.08;
          haloPrincipalRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE}) rotate(${haloRotationRef.current}deg)`;
        } else {
          haloPrincipalRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE})`;
        }
        haloPrincipalRef.current.style.opacity = `${0.3 + sEnergy * 0.2}`;
      }

      // ── 4. Halo Glow Exterior (Blur 24px, Opacidad 0.4–0.6) ──
      if (haloGlowRef.current) {
        haloGlowRef.current.style.transform = `translate(-50%, -50%) scale(${BLOB_SCALE})`;
        haloGlowRef.current.style.opacity = `${0.4 + sEnergy * 0.2}`;
      }

      // ── 5. Capa Canvas 2D (Ondas, Barras Radiales y Partículas Internas) ──
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

          // Radio base: perímetro exacto del círculo interior
          const baseR = (innerCircleSize / 2) * dpr;

          // Colores resueltos según modo lúcido o normal
          const primaryColor = isLucid
            ? (lucidPrimaryColor || lucidTheme.primary || '#00f2fe')
            : '#ffffff';
          const secondaryColor = isLucid
            ? (lucidSecondaryColor || lucidTheme.secondary || '#ff088a')
            : 'rgba(255, 255, 255, 0.5)';

          // ── A. Shockwaves Concéntricas al Disparar Kick ──
          for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
            const sw = shockwavesRef.current[i];
            const age = now - sw.startTime;
            if (age > WAVE_LIFETIME_MS) {
              shockwavesRef.current.splice(i, 1);
              continue;
            }
            const progress = age / WAVE_LIFETIME_MS;
            const currentR = baseR + progress * (sw.maxDistance * dpr);
            const alpha = 0.85 * Math.pow(1 - progress, 1.4) * sw.strength;

            ctx.beginPath();
            ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(1, (1.0 - progress) * 2.5 * dpr);
            ctx.stroke();
          }

          // ── B. Barras Radiales (72 líneas, 48 en pantallas móviles < 768px) ──
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const barCount = isMobile ? 48 : 72;
          const angleStep = (Math.PI * 2) / barCount;
          const fft = fftBarsRef.current;
          const barLerpFactor = clamp(0.15 + speedMultiplier * 0.2, 0.15, 0.4);

          for (let i = 0; i < barCount; i++) {
            const rawIndex = Math.floor((i / barCount) * (raw.length || 1));
            const rawVal = isAudioActive && raw[rawIndex] ? raw[rawIndex] / 255 : 0;
            fft[i] += (rawVal - fft[i]) * barLerpFactor;

            const maxBarLen = (24 + sMids * 16) * dpr;
            const barLen = (3 * dpr) + fft[i] * maxBarLen;
            const a = i * angleStep;

            const r1 = baseR + (2 * dpr);
            const r2 = r1 + barLen;

            const x1 = cx + Math.cos(a) * r1;
            const y1 = cy + Math.sin(a) * r1;
            const x2 = cx + Math.cos(a) * r2;
            const y2 = cy + Math.sin(a) * r2;

            const alpha = 0.25 + fft[i] * 0.65;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = primaryColor;
            ctx.globalAlpha = isLucid ? alpha : alpha * 0.85;
            ctx.lineWidth = 2 * dpr;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // ── C. 30 Partículas Internas dentro del Núcleo ──
          if (!prefersReducedMotion) {
            const baseDist = baseR * 0.55;
            for (let k = 0; k < INNER_PARTICLES_COUNT; k++) {
              const angle = (k / INNER_PARTICLES_COUNT) * Math.PI * 2;
              const dist = baseDist + (sBass * 20 * dpr) * Math.sin(timeSeconds * 2.5 + angle);
              const px = cx + Math.cos(angle) * dist;
              const py = cy + Math.sin(angle) * dist;
              const pSize = (2 + (k % 3)) * dpr;
              const pAlpha = 0.3 + sBass * 0.3;

              ctx.beginPath();
              ctx.arc(px, py, pSize, 0, Math.PI * 2);
              ctx.fillStyle = secondaryColor;
              ctx.globalAlpha = pAlpha;
              ctx.fill();
            }
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
    blobWaveIntensity,
    blobBassBoomIntensity,
    containerSize,
    innerCircleSize,
    scaleU,
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

  // ── Gradientes del Halo Principal y Halo Glow (Arcoíris / Lúcido) ───────────
  const haloPrincipalBg = useMemo(() => {
    if (isLucid) {
      const p = lucidPrimaryColor || lucidTheme.primary || '#00f2fe';
      const s = lucidSecondaryColor || lucidTheme.secondary || '#ff088a';
      return `conic-gradient(from 0deg, ${p}, ${s}, ${p})`;
    }
    // Halo arcoíris clásico con colores vivos
    return 'conic-gradient(from 0deg, #ff088a, #8a2be2, #00f2fe, #00ffb3, #ffe600, #ff5e00, #ff088a)';
  }, [isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme]);

  const haloGlowBg = useMemo(() => {
    if (isLucid) {
      const p = lucidPrimaryColor || lucidTheme.primary || '#00f2fe';
      const s = lucidSecondaryColor || lucidTheme.secondary || '#ff088a';
      return `radial-gradient(circle, ${p}66 0%, ${s}33 50%, transparent 75%)`;
    }
    // Glow suave difuminado con la gama cromática del arcoíris
    return 'radial-gradient(circle, #ff088a66 0%, #00f2fe44 40%, #ffe60033 65%, transparent 80%)';
  }, [isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme]);

  const innerCircleBg = useMemo(() => {
    if (isLucid) {
      return lucidTheme.glassColor || 'rgba(10, 15, 28, 0.7)';
    }
    return 'rgba(255, 255, 255, 0.04)';
  }, [isLucid, lucidTheme]);

  const innerCircleBorder = useMemo(() => {
    if (isLucid) {
      return lucidTheme.borderColor || 'rgba(255, 255, 255, 0.15)';
    }
    return 'rgba(255, 255, 255, 0.08)';
  }, [isLucid, lucidTheme]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#0A0A0F]">
      {/* ── Capa 1: Fondo Base Sólido / Gradiente Sutil ── */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isLucid && lucidTheme.bgGradient
            ? lucidTheme.bgGradient
            : 'radial-gradient(circle at 50% 50%, #121218 0%, #0A0A0F 70%, #060609 100%)',
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
        {/* ── Capa 2: Halo Glow Exterior Radial Difuminado (Blur 24px, Opacidad 0.4–0.6) ── */}
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
            background: haloGlowBg,
            filter: 'blur(24px)',
            opacity: 0.4,
            mixBlendMode: isLucid ? 'screen' : 'normal',
            zIndex: 1,
          }}
        />

        {/* ── Capa 3: Halo Principal (con Conic-Gradient, Blur 18px Saturate 140%, Escala Fija 0.5x) ── */}
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
            opacity: 0.3,
            mixBlendMode: isLucid ? 'screen' : 'normal',
            zIndex: 2,
          }}
        />

        {/* ── Capa 4: Canvas 2D de Efectos (Ondas, 72 Barras, Shockwaves, Partículas) ── */}
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

        {/* ── Capa 5: Círculo Interior (Núcleo Oscuro Translúcido con Backdrop-Filter y Pulso) ── */}
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
            <div
              className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-black/20"
              style={{ clipPath: 'circle(50% at center)' }}
            >
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
                    color: isLucid ? (lucidPrimaryColor || lucidTheme.primary) : 'rgba(255, 255, 255, 0.55)',
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
        className="absolute top-4 right-4 z-40 p-2.5 rounded-xl bg-[#0A0A0F]/80 backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 transition-all duration-180 ease-out shadow-lg focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
                  title="Restablecer valores"
                  aria-label="Restablecer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setBlobPanelOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                    className="block w-4 h-4 bg-white rounded-full shadow-md focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                    className="block w-4 h-4 bg-white rounded-full shadow-md focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                      className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                      className="block w-3.5 h-3.5 bg-white rounded-full shadow-md focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] cursor-pointer transition-colors duration-180 focus-within:outline focus-within:outline-1 focus-within:outline-white/50 focus-within:outline-offset-2"
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
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-colors duration-180 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50 focus-visible:outline-offset-2"
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
