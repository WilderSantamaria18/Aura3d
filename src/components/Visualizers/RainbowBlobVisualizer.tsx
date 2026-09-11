import React, { useRef, useEffect, useState } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import {
  Sliders,
  RotateCcw,
  X,
  Palette,
  Sparkles,
  Upload,
  Trash2,
  Ghost,
  Radio,
  Disc3,
  Waves,
  Activity,
  Zap,
  Globe2,
  Edit3,
  ChevronDown,
  Save,
  Check,
  Sun,
} from 'lucide-react';
import { LogoCropFilterModal } from '../UI/LogoCropFilterModal';
import { RAINBOW_VOID_EFFECTS, ATMOSPHERE_OPTIONS } from '../../config/visualPresets';
import type { VisualizerShape, BackgroundAtmosphere } from '../../types/audio';
import { DEFAULT_BLOB_SETTINGS } from '../../services/storageService';

// Preset Vector Logo Styles
const LOGO_PRESETS = [
  { id: 'ghost', name: 'Fantasma Minimal', icon: Ghost },
  { id: 'pulsar', name: 'Onda Pulsar', icon: Radio },
  { id: 'vinyl', name: 'Disco Vinilo', icon: Disc3 },
  { id: 'waves', name: 'Frecuencias', icon: Waves },
  { id: 'equalizer', name: 'Ecualizador', icon: Activity },
  { id: 'zap', name: 'Energía', icon: Zap },
  { id: 'orbit', name: 'Órbita', icon: Globe2 },
];



interface SpikeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
}

interface VoidStar {
  x: number; // Normalized -1 to 1
  y: number;
  size: number;
  phase: number;
}

const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

const computeScaleFactor = (): number => {
  if (typeof window === 'undefined') return 1.0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  // Fluid responsive clamp: scales smoothly from 0.42 on 320px mobile up to 1.0 on desktop
  return clamp(minDim / 680, 0.42, 1.0);
};

export const RainbowBlobVisualizer: React.FC = () => {
  const {
    blobSettings,
    updateBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
    blobShape,
    setBlobShape,
    blobWaveMode,
    blobWaveIntensity,
    blobBassBoomThreshold,
    setBlobBassBoomThreshold,
    blobBassBoomIntensity,
    setBlobBassBoomIntensity,
    blobScale,
    musicSensitivity,
    currentTrack,
    isMicActive,
    isPlaying,
    autoMode,
    dynamicColor,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    isUiIdle,
  } = usePlayerStore();

  // Smoothing 0.2 synchronized with audio engine
  const { getSmoothedData } = useVisualizer(0.2);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [savedPresetSuccess, setSavedPresetSuccess] = useState(false);

  // Unitary scale factor u: responsive clamp
  const [scaleU, setScaleU] = useState<number>(computeScaleFactor);
  const scaleURef = useRef<number>(computeScaleFactor());

  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Swarm particles for 'cloud' shape
  const [cloudParticles] = useState(() =>
    Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 130 + Math.random() * 120,
      speed: (Math.random() - 0.5) * 0.03,
      size: 2 + Math.random() * 3.5,
      hue: Math.random() * 360,
    }))
  );

  // Internal twinkling stars for DHONKIO mode
  const voidStars = useRef<VoidStar[]>(
    Array.from({ length: 28 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.85;
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        size: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      };
    })
  );

  // Crystalline percussive micro-particles for Spikes mode
  const spikeParticles = useRef<SpikeParticle[]>([]);

  // Audio smoothing refs
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);

  // Peak hold array for 64-band spectrum
  const peakHoldCaps = useRef<number[]>(new Array(64).fill(0));

  // Window resize handler: update scale factor ref and canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      const u = computeScaleFactor();
      scaleURef.current = u;
      setScaleU(u);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displaySize = Math.round(700 * u);
        canvas.width = Math.round(displaySize * dpr);
        canvas.height = Math.round(displaySize * dpr);
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSunset = blobSettings.backgroundAtmosphere === 'sunset';

  // Main 60 FPS animation render loop using performance.now() clock
  useEffect(() => {
    let animId: number;
    let phase = 0;
    let angle = 0;

    const render = () => {
      const now = performance.now();
      const timeSec = now * 0.001;
      const u = scaleURef.current;

      const { bass, mids, energy, raw } = getSmoothedData();
      const audioSens = musicSensitivity ?? 1.0;
      const isAudioActive = energy > 0.005 || isPlaying || isMicActive;

      // Exponential moving average filter
      const effectiveBass = bass * audioSens;
      const effectiveMids = mids * audioSens;
      const effectiveEnergy = energy * audioSens;

      smoothedBassRef.current += (effectiveBass - smoothedBassRef.current) * 0.28;
      smoothedMidsRef.current += (effectiveMids - smoothedMidsRef.current) * 0.28;
      smoothedEnergyRef.current += (effectiveEnergy - smoothedEnergyRef.current) * 0.28;

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sEnergy = smoothedEnergyRef.current;

      if (isAudioActive) {
        phase += 0.03 + sBass * 0.1;
        angle += 0.25 + sMids * 1.2;
      } else {
        phase += 0.015;
        angle += 0.1;
      }

      // Smooth audio-reactive scale calibration (smooth bass response, no sudden boom stutter)
      const nivel = isAudioActive ? sBass : 0;
      const boostVal = blobSettings.bassBoost ?? 2.8;
      const idleBreathing = isAudioActive ? 0 : Math.sin(timeSec * 1.5) * 0.03;
      const sens = (blobSettings.scaleSensitivity ?? 1.40) * audioSens;
      const baseScale = 0.75 + idleBreathing;
      const bassContribution = Math.pow(nivel, 1.2) * (0.35 + boostVal * 0.18);
      const totalScale = (baseScale + bassContribution) * sens;
      const clampedScale = Math.min(1.85, Math.max(0.40, totalScale));
      const escala = clampedScale * 0.5;

      const borderRadius = '50%';

      if (circleRef.current) {
        circleRef.current.style.transform = `scale(${escala})`;
      }

      if (haloRef.current) {
        haloRef.current.style.borderRadius = borderRadius;
        haloRef.current.style.transform = `scale(${escala}) rotate(${angle}deg)`;
        haloRef.current.style.display = 'block';
        if (isSunset) {
          haloRef.current.style.opacity = `${blobSettings.dhonkioOpacity ?? 0.42}`;
        } else {
          haloRef.current.style.opacity = '1.0';
        }
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.borderRadius = borderRadius;
        haloGlowRef.current.style.transform = `scale(${escala * 1.15}) rotate(${-angle * 0.5}deg)`;
        haloGlowRef.current.style.opacity = `${isAudioActive ? 0.4 + nivel * 0.4 : 0.25}`;
        haloGlowRef.current.style.filter = `blur(${isAudioActive ? (20 + nivel * 24) * u : 18 * u}px)`;
      }

      if (auroraRef.current) {
        if (isSunset) {
          auroraRef.current.style.opacity = '0';
        } else {
          auroraRef.current.style.transform = `rotate(${timeSec * 8}deg) scale(${1 + sBass * 0.1})`;
          auroraRef.current.style.opacity = `${isAudioActive ? 0.3 + sBass * 0.35 : 0.2}`;
        }
      }

      // ── 2D Canvas Dynamics (Scaled by unit factor u) ────────────────────
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const displaySize = 700 * u;
          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, displaySize, displaySize);

          const cx = displaySize / 2;
          const cy = displaySize / 2;
          const baseCircleRadius = (blobSettings.circleSize / 2) * u * escala;

          // ─────────────────────────────────────────────────────────────────
          // DHONKIO MODE: "Silueta & Atardecer" (Canvas Core Overlay)
          // ─────────────────────────────────────────────────────────────────
          if (isSunset) {
            ctx.save();
            // Clip to inner circular void
            ctx.beginPath();
            ctx.arc(cx, cy, baseCircleRadius, 0, Math.PI * 2);
            ctx.clip();

            // Fondo negro sólido (simulando cielo nocturno puro)
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - baseCircleRadius, cy - baseCircleRadius, baseCircleRadius * 2, baseCircleRadius * 2);

            // Partículas internas: puntos blancos flotando como estrellas
            voidStars.current.forEach((st) => {
              const starAlpha = 0.45 + Math.sin(timeSec * 2.8 + st.phase) * 0.45;
              ctx.beginPath();
              ctx.arc(cx + st.x * baseCircleRadius * 0.88, cy + st.y * baseCircleRadius * 0.88, st.size * u, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 4 * u;
              ctx.fill();
            });

            // Dynamic color tinting: Lucid Theme or AI Dynamic Color
            const dhonkioColor = isLucid
              ? (lucidPrimaryColor || lucidTheme.primary)
              : autoMode
              ? (dynamicColor || '#00f2fe')
              : '#ffffff';

            const baseBloom = blobSettings.dhonkioBloom ?? 1.33;
            // Bloom breathing modulation with audio energy / RMS
            const bloomInt = baseBloom * (0.90 + sEnergy * 0.25);
            const pMid = blobSettings.dhonkioPowerMid ?? 1.08;
            const pKick = blobSettings.dhonkioPowerKick ?? 1.045;
            const kickBoost = blobSettings.dhonkioKickBoost ?? 6.0;

            // 1. Texto "DHONKIO" teñido dinámicamente, cursiva inclinada hacia arriba, Bloom modulado
            ctx.save();
            ctx.translate(cx, cy - 14 * u);
            ctx.rotate(-0.10); // Inclinada hacia arriba (~ -5.8 grados)
            ctx.font = `italic 800 ${Math.round(24 * u)}px "Brush Script MT", "Caveat", "Pacifico", "Dancing Script", cursive, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = dhonkioColor;
            ctx.shadowColor = dhonkioColor;
            ctx.shadowBlur = 18 * bloomInt * u;
            ctx.fillText('DHONKIO', 0, 0);
            ctx.restore();

            // 2. Silueta del horizonte de la ciudad justo debajo del texto
            const cityY = cy + 6 * u;
            const cityWidth = baseCircleRadius * 1.82;
            const startX = cx - cityWidth / 2;
            const buildings = 20;
            const bWidth = cityWidth / buildings;

            for (let b = 0; b < buildings; b++) {
              const bX = startX + b * bWidth;
              const heightsPattern = [22, 36, 28, 44, 18, 32, 48, 26, 38, 46, 24, 34, 52, 30, 20, 36, 24, 18, 30, 22];
              const bHeight = (heightsPattern[b % heightsPattern.length] || 25) * u;
              const roofY = cityY + (46 * u - bHeight);

              // 3. Barras de audio verticales teñidas emergiendo de la ciudad (Power Mid más alto)
              const freqIdx = Math.floor((b / buildings) * raw.length * 0.65);
              const freqVal = (raw[freqIdx] || 0) / 255;
              const isMid = b >= 4 && b <= 15;
              const midFactor = isMid ? pMid : 1.01;
              const barHeight = Math.max(3 * u, freqVal * 42 * u * midFactor * (1 + (sBass > 0.28 ? (pKick - 1) * kickBoost : 0)));

              // Barra de ecualizador vertical teñida con Bloom respirante
              ctx.save();
              ctx.fillStyle = dhonkioColor;
              ctx.shadowColor = dhonkioColor;
              ctx.shadowBlur = 14 * bloomInt * u;
              ctx.fillRect(bX + bWidth * 0.22, roofY - barHeight, bWidth * 0.56, barHeight);
              ctx.restore();

              // Cuerpo del edificio en silueta blanca
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(bX + 1, roofY, bWidth - 2, baseCircleRadius * 2);

              // Antena en edificios clave
              if (b === 6 || b === 12 || b === 16) {
                ctx.beginPath();
                ctx.moveTo(bX + bWidth * 0.5, roofY);
                ctx.lineTo(bX + bWidth * 0.5, roofY - 14 * u);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.2 * u;
                ctx.stroke();
              }
              ctx.restore();
            }

            ctx.restore();
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 1: SPHERE (Núcleo Minimal Difuminado & Aura Cuántica Radiante)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'sphere') {
            // Core breathing plasma halos
            for (let sIdx = 0; sIdx < 5; sIdx++) {
              const sRad = baseCircleRadius + (sIdx + 1) * 24 * u * (1 + sBass * 0.35);
              const sGrad = ctx.createRadialGradient(cx, cy, baseCircleRadius * 0.82, cx, cy, sRad);
              const sHue = isLucid ? sIdx * 45 : (timeSec * 30 + sIdx * 50) % 360;
              const sAlpha = (0.55 - sIdx * 0.10) * (1 + sBass * 0.45);
              sGrad.addColorStop(0, `hsla(${sHue}, 95%, 65%, ${Math.min(0.9, sAlpha)})`);
              sGrad.addColorStop(0.7, `hsla(${(sHue + 40) % 360}, 90%, 55%, ${Math.min(0.5, sAlpha * 0.6)})`);
              sGrad.addColorStop(1, 'transparent');
              ctx.beginPath();
              ctx.arc(cx, cy, sRad, 0, Math.PI * 2);
              ctx.fillStyle = sGrad;
              ctx.fill();
            }

            // Concentric laser-engraved hardware micro-grooves
            for (let g = 0; g < 3; g++) {
              const gR = baseCircleRadius + (g + 1) * 16 * u * (1 + sBass * 0.15);
              ctx.beginPath();
              ctx.arc(cx, cy, gR, 0, Math.PI * 2);
              ctx.strokeStyle = isLucid ? `${lucidTheme.primary}70` : `hsla(${(timeSec * 25 + g * 80) % 360}, 90%, 65%, ${0.45 + sBass * 0.4})`;
              ctx.lineWidth = Math.max(1.2, 1.8 * u);
              ctx.stroke();
            }

            // High-voltage electric orbital sparks around perimeter
            const sparkCount = 8;
            for (let sp = 0; sp < sparkCount; sp++) {
              const sAng = timeSec * 1.8 + (sp / sparkCount) * Math.PI * 2;
              const sDist = baseCircleRadius + (32 + Math.sin(timeSec * 3 + sp) * 12 + sBass * 35) * u;
              const sx = cx + Math.cos(sAng) * sDist;
              const sy = cy + Math.sin(sAng) * sDist;
              ctx.beginPath();
              ctx.arc(sx, sy, Math.max(2, (2.8 + sBass * 2.2) * u), 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 3: SPIKES (Corona de Picos FFT Reactiva: 48 agujas cristalinas)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'spikes') {
            const barCount = 48;
            for (let i = 0; i < barCount; i++) {
              const barAngle = (i / barCount) * Math.PI * 2 + angle * 0.02;
              const rawVal = raw[i % raw.length] || 0;
              const barLen = (18 + (rawVal / 255) * 95 * (1 + sBass * 0.65)) * u;
              const barHue = (i * (360 / barCount) + timeSec * 35) % 360;

              const x1 = cx + Math.cos(barAngle) * (baseCircleRadius + 2 * u);
              const y1 = cy + Math.sin(barAngle) * (baseCircleRadius + 2 * u);
              const x2 = cx + Math.cos(barAngle) * (baseCircleRadius + 2 * u + barLen);
              const y2 = cy + Math.sin(barAngle) * (baseCircleRadius + 2 * u + barLen);

              // Tapered needle gradient
              const spikeGrad = ctx.createLinearGradient(x1, y1, x2, y2);
              spikeGrad.addColorStop(0, isLucid ? lucidTheme.secondary : `hsla(${barHue}, 90%, 60%, 0.65)`);
              spikeGrad.addColorStop(1, isLucid ? lucidTheme.primary : `hsla(${(barHue + 50) % 360}, 100%, 75%, 1.0)`);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = spikeGrad;
              ctx.lineWidth = Math.max(1.8, 3.0 * u);
              ctx.lineCap = 'round';
              ctx.stroke();

              // Intense white-hot diamond tip
              ctx.beginPath();
              ctx.arc(x2, y2, Math.max(1.8, 2.6 * u), 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }

            // Micro-partículas percusivas
            spikeParticles.current = spikeParticles.current.filter((p) => {
              p.x += p.vx;
              p.y += p.vy;
              p.alpha *= 0.93;
              if (p.alpha < 0.02) return false;

              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * u, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, ${p.alpha})`;
              ctx.fill();
              return true;
            });
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 5: FRACTAL (Mándala Sagrada Multicapa: 4 capas con pétalos)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'fractal') {
            const rings = 4;
            for (let r = 0; r < rings; r++) {
              const petals = 6 + r * 2;
              const fRadius = baseCircleRadius + (r + 1) * 22 * u * (1 + sBass * 0.25);
              const petalAmp = (10 + sMids * 20) * u;
              ctx.beginPath();
              for (let p = 0; p <= 120; p++) {
                const theta = (p / 120) * Math.PI * 2;
                const rMod = fRadius + Math.cos(theta * petals + timeSec * (1.5 - r * 0.3)) * petalAmp;
                const fx = cx + Math.cos(theta) * rMod;
                const fy = cy + Math.sin(theta) * rMod;
                if (p === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
              }
              ctx.closePath();
              const fHue = (r * 60 + timeSec * 25) % 360;
              ctx.strokeStyle = isLucid
                ? r % 2 === 0
                  ? lucidTheme.primary
                  : lucidTheme.secondary
                : `hsla(${fHue}, 85%, 65%, ${0.75 - r * 0.1})`;
              ctx.lineWidth = Math.max(1.2, 1.8 * u);
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 8 * u;
              ctx.stroke();
            }
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 6: WAVE (Ondas de Frecuencia Líquida: Cinta armónica doble)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'wave') {
            const wavePoints = 140;
            // Primary radiant wave
            ctx.beginPath();
            for (let i = 0; i <= wavePoints; i++) {
              const theta = (i / wavePoints) * Math.PI * 2;
              const freqVal = (raw[Math.floor((i / wavePoints) * raw.length * 0.6)] || 0) / 255;
              const ripple = Math.sin(theta * 8 + timeSec * 4) * (18 + sBass * 38 + freqVal * 32) * u;
              const r = baseCircleRadius + 24 * u + ripple;
              const wx = cx + Math.cos(theta) * r;
              const wy = cy + Math.sin(theta) * r;
              if (i === 0) ctx.moveTo(wx, wy);
              else ctx.lineTo(wx, wy);
            }
            ctx.closePath();
            ctx.strokeStyle = isLucid ? lucidTheme.primary : autoMode ? dynamicColor : 'rgba(0, 255, 195, 0.92)';
            ctx.lineWidth = Math.max(2.4, (3.4 + sMids * 2.2) * u);
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 16 * u;
            ctx.stroke();

            // Secondary outer harmonic wave
            ctx.beginPath();
            for (let i = 0; i <= wavePoints; i++) {
              const theta = (i / wavePoints) * Math.PI * 2;
              const freqVal = (raw[Math.floor((i / wavePoints) * raw.length * 0.4)] || 0) / 255;
              const ripple2 = Math.cos(theta * 10 - timeSec * 3.5) * (12 + sEnergy * 25 + freqVal * 20) * u;
              const r2 = baseCircleRadius + 42 * u + ripple2;
              const wx = cx + Math.cos(theta) * r2;
              const wy = cy + Math.sin(theta) * r2;
              if (i === 0) ctx.moveTo(wx, wy);
              else ctx.lineTo(wx, wy);
            }
            ctx.closePath();
            ctx.strokeStyle = isLucid ? lucidTheme.secondary : 'rgba(255, 8, 138, 0.65)';
            ctx.lineWidth = Math.max(1.6, 2.2 * u);
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12 * u;
            ctx.stroke();
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 7: TORUS (Anillo Neón Orbital: Giroscopio 3D Neón)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'torus') {
            for (let t = 0; t < 3; t++) {
              const rotDir = t === 0 ? 1 : t === 1 ? -1 : 0.6;
              const tAngle = timeSec * (1.1 + t * 0.3) * rotDir + t * (Math.PI / 3);
              const tRadiusX = (baseCircleRadius + (30 + t * 14) * u) * (1 + sBass * 0.22);
              const tRadiusY = (baseCircleRadius + (15 + t * 8) * u) * (1 + sMids * 0.25);

              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(tAngle);
              ctx.beginPath();
              ctx.ellipse(0, 0, tRadiusX, tRadiusY, 0, 0, Math.PI * 2);
              const torHue = (t * 80 + timeSec * 30) % 360;
              ctx.strokeStyle = isLucid
                ? t === 0 ? lucidTheme.primary : lucidTheme.secondary
                : `hsla(${torHue}, 95%, 65%, 0.88)`;
              ctx.lineWidth = Math.max(2, (3.4 + sBass * 2.5) * u);
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 14 * u;
              ctx.stroke();

              // Cardinal energy nodes
              for (let n = 0; n < 4; n++) {
                const nAng = (n / 4) * Math.PI * 2;
                const nx = Math.cos(nAng) * tRadiusX;
                const ny = Math.sin(nAng) * tRadiusY;
                ctx.beginPath();
                ctx.arc(nx, ny, Math.max(2, (3.2 + sBass * 1.5) * u), 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 8 * u;
                ctx.fill();
              }
              ctx.restore();
            }
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 8: CLOUD (Nébula Cuántica: Enjambre de Estrellas Orbital)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'cloud') {
            cloudParticles.forEach((p) => {
              p.angle += p.speed * (1 + sMids * 2.5 + sBass * 1.5);
              const currentDist = p.dist * u * (1 - sBass * 0.15) * blobScale;
              const px = cx + Math.cos(p.angle) * currentDist;
              const py = cy + Math.sin(p.angle) * currentDist;

              ctx.beginPath();
              ctx.arc(px, py, Math.max(1.8, p.size * u * (1 + sEnergy * 1.4)), 0, Math.PI * 2);
              ctx.fillStyle = isLucid
                ? lucidTheme.primary
                : autoMode
                ? dynamicColor
                : `hsla(${p.hue + timeSec * 20}, 90%, 70%, ${0.6 + sBass * 0.4})`;
              ctx.shadowColor = isLucid ? lucidTheme.glow : `hsla(${p.hue}, 90%, 60%, 0.8)`;
              ctx.shadowBlur = 10 * u;
              ctx.fill();
            });
          }

          // ─────────────────────────────────────────────────────────────────
          // SHAPE 11: NEBULA (Nebulosa / Aurora Líquida: Cintas Turbulentes)
          // ─────────────────────────────────────────────────────────────────
          if (blobShape === 'nebula') {
            const ribbons = 6;
            for (let rb = 0; rb < ribbons; rb++) {
              ctx.beginPath();
              const rbAngle = (rb / ribbons) * Math.PI * 2;
              const points = 50;
              for (let p = 0; p <= points; p++) {
                const theta = (p / points) * Math.PI * 2;
                const waveOffset = Math.sin(theta * 5 + timeSec * 2.5 + rb) * (20 + sBass * 32) * u;
                const r = baseCircleRadius + (22 + rb * 12) * u + waveOffset;
                const nx = cx + Math.cos(theta + rbAngle) * r;
                const ny = cy + Math.sin(theta + rbAngle) * r;
                if (p === 0) ctx.moveTo(nx, ny);
                else ctx.lineTo(nx, ny);
              }
              ctx.closePath();
              const nbHue = (rb * 55 + timeSec * 25) % 360;
              ctx.strokeStyle = isLucid
                ? rb % 2 === 0 ? lucidTheme.primary : lucidTheme.secondary
                : `hsla(${nbHue}, 90%, 65%, ${0.55 - rb * 0.06})`;
              ctx.lineWidth = Math.max(1.8, (2.6 + sMids * 1.6) * u);
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 12 * u;
              ctx.stroke();
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
    blobSettings.bassBoost,
    blobSettings.circleSize,
    blobSettings.scaleSensitivity,
    blobSettings.backgroundAtmosphere,
    blobSettings.dhonkioBloom,
    blobSettings.dhonkioPowerMid,
    blobSettings.dhonkioPowerKick,
    blobSettings.dhonkioKickBoost,
    blobSettings.dhonkioOpacity,
    isPlaying,
    isMicActive,
    blobShape,
    blobWaveMode,
    blobWaveIntensity,
    blobBassBoomThreshold,
    blobBassBoomIntensity,
    blobScale,
    musicSensitivity,
    isLucid,
    lucidTheme,
    autoMode,
    dynamicColor,
    cloudParticles,
    isSunset,
  ]);

  const haloBackground = isLucid
    ? `conic-gradient(from 0deg, ${lucidTheme.primary}, ${lucidTheme.secondary}, #ff007f, ${lucidTheme.primary})`
    : autoMode
    ? `conic-gradient(from 0deg, ${dynamicColor}, ${dynamicColor}88, ${dynamicColor}ee, ${dynamicColor})`
    : blobSettings.isRainbowMode
    ? 'conic-gradient(from 0deg, #ff088a, #8a2be2, #00f2fe, #00ffb3, #ffe600, #ff5e00, #ff088a)'
    : `conic-gradient(${blobSettings.haloColor1}, ${blobSettings.haloColor2}, ${blobSettings.haloColor1})`;

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setTempImageForCrop(result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveCustomLogo = () => {
    updateBlobSettings({ customLogoUrl: null });
  };

  const handleSaveFavoritePreset = () => {
    try {
      const presetData = {
        blobSettings,
        blobShape,
        timestamp: Date.now(),
      };
      localStorage.setItem('aura3d_saved_blob_preset', JSON.stringify(presetData));
      setSavedPresetSuccess(true);
      setTimeout(() => setSavedPresetSuccess(false), 2200);
    } catch (e) {
      console.warn('Failed to save preset to localStorage', e);
    }
  };

  const handleResetFixedCalibration = () => {
    updateBlobSettings({
      circleSize: DEFAULT_BLOB_SETTINGS.circleSize,
      haloSize: DEFAULT_BLOB_SETTINGS.haloSize,
      bassBoost: DEFAULT_BLOB_SETTINGS.bassBoost,
      scaleSensitivity: DEFAULT_BLOB_SETTINGS.scaleSensitivity,
      kickThreshold: DEFAULT_BLOB_SETTINGS.kickThreshold,
      kickPower: DEFAULT_BLOB_SETTINGS.kickPower,
      dhonkioBloom: 1.33,
      dhonkioInnerSize: 0.14,
      dhonkioOuterSize: 0.35,
      dhonkioOpacity: 0.42,
      dhonkioPowerBass: 1.035,
      dhonkioPowerMid: 1.08,
      dhonkioPowerKick: 1.045,
      dhonkioKickBoost: 6,
    });
    setBlobBassBoomThreshold(0.68);
    setBlobBassBoomIntensity(1.6);
  };

  const haloDimension = (blobSettings.haloSize || 202) * scaleU;
  const circleDimension = (blobSettings.circleSize || 179) * scaleU;

  // Render active center logo (custom image, Spotify/local track cover, or SVG vector logo)
  const renderCenterLogo = () => {
    if (isSunset) return null; // In DHONKIO mode, the void renders city + text + equalizer

    const activeImage = blobSettings.customLogoUrl || currentTrack?.coverUrl;
    const discSize = Math.round(circleDimension * 0.86);

    if (activeImage) {
      return (
        <div
          className="relative flex items-center justify-center group cursor-pointer z-10 select-none"
          style={{ width: `${discSize}px`, height: `${discSize}px` }}
        >
          {/* Subtle ambient bloom behind logo */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-45 group-hover:opacity-80 transition-opacity"
            style={{
              backgroundImage: `url(${activeImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(14px)',
              transform: 'scale(1.08)',
            }}
          />

          {/* Crisp center circular disc with vinyl grooves */}
          <div
            onClick={() => {
              setTempImageForCrop(activeImage);
              setIsCropModalOpen(true);
            }}
            style={{
              width: `${discSize}px`,
              height: `${discSize}px`,
              borderColor: isLucid ? `${lucidTheme.primary}60` : 'rgba(255, 255, 255, 0.25)',
              boxShadow: isLucid
                ? `0 0 24px rgba(0,0,0,0.85), 0 0 16px ${lucidTheme.glow}`
                : '0 0 25px rgba(0,0,0,0.9), 0 0 12px rgba(0, 242, 254, 0.18)',
            }}
            className="relative rounded-full overflow-hidden border shadow-2xl animate-[spin_24s_linear_infinite] group-hover:scale-[1.02] transition-transform"
            title="Haz clic para recortar, aplicar filtros y efectos al logo/carátula"
          >
            <img
              src={activeImage}
              alt="Carátula / Logo"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Proportional Vinyl inner groove rings overlay */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute inset-[15%] rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-[30%] rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-[45%] rounded-full border border-white/10 pointer-events-none" />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black border border-white/60 pointer-events-none shadow-sm"
              style={{
                width: `${Math.max(6, Math.round(discSize * 0.09))}px`,
                height: `${Math.max(6, Math.round(discSize * 0.09))}px`,
              }}
            />
          </div>
        </div>
      );
    }

    const activePreset = LOGO_PRESETS.find((p) => p.id === blobSettings.logoStyle) || LOGO_PRESETS[0];
    const IconComponent = activePreset.icon;
    const iconBoxSize = Math.round(circleDimension * 0.84);
    const iconSize = Math.max(26, Math.round(iconBoxSize * 0.46));

    return (
      <div
        style={{
          width: `${iconBoxSize}px`,
          height: `${iconBoxSize}px`,
          borderColor: isLucid ? `${lucidTheme.primary}50` : 'rgba(255, 255, 255, 0.15)',
          boxShadow: isLucid
            ? `0 0 22px rgba(0,0,0,0.8), inset 0 0 16px ${lucidTheme.glow}`
            : '0 0 22px rgba(0,0,0,0.85), inset 0 0 16px rgba(255, 255, 255, 0.04)',
        }}
        className="rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] border flex items-center justify-center transform hover:scale-105 transition-transform z-10 backdrop-blur-md"
      >
        <IconComponent
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            color: isLucid ? lucidTheme.primary : '#ffffff',
            filter: isLucid ? `drop-shadow(0 0 10px ${lucidTheme.glow})` : 'drop-shadow(0 0 6px rgba(255,255,255,0.4))',
          }}
          className="transition-all"
        />
      </div>
    );
  };

  const containerPosX = isSunset ? 50 : blobSettings.posX;
  const containerPosY = isSunset ? 43.5 : blobSettings.posY;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-transparent select-none">
      {/* Contenedor Principal Circular (Z-Index: 10) */}
      <div
        ref={containerRef}
        className="absolute flex justify-center items-center pointer-events-auto transition-all duration-75 ease-out"
        style={{
          left: `${containerPosX}%`,
          top: `${containerPosY}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      >
        {/* Dynamic Canvas for 3D Shapes & Wave Effects in Rainbow Void */}
        <canvas
          ref={canvasRef}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
          style={{ width: `${Math.round(700 * scaleU)}px`, height: `${Math.round(700 * scaleU)}px` }}
        />

        {/* Halo Glow Diffusion */}
        <div
          ref={haloGlowRef}
          className="absolute rounded-full pointer-events-none mix-blend-screen transition-all duration-75"
          style={{
            width: `${haloDimension * 1.15}px`,
            height: `${haloDimension * 1.15}px`,
            background: haloBackground,
          }}
        />

        {/* El Halo / Blob de Arcoíris Principal */}
        <div
          ref={haloRef}
          className="absolute rounded-full pointer-events-none transition-all duration-75"
          style={{
            width: `${haloDimension}px`,
            height: `${haloDimension}px`,
            background: haloBackground,
            boxShadow: isLucid
              ? `0 0 35px ${lucidTheme.glow}`
              : '0 0 45px rgba(0, 242, 254, 0.20), 0 0 70px rgba(255, 8, 138, 0.12)',
            backdropFilter: 'blur(18px) saturate(160%)',
          }}
        />

        {/* El Círculo Interior (The Void) */}
        <div
          ref={circleRef}
          className={`relative z-10 rounded-full flex items-center justify-center transition-all duration-75 ease-out overflow-hidden ${
            isLucid
              ? 'border'
              : 'border border-white/[0.12] shadow-[0_0_50px_rgba(0,0,0,0.95),inset_0_0_35px_rgba(0,0,0,0.95)]'
          }`}
          style={{
            width: `${circleDimension}px`,
            height: `${circleDimension}px`,
            backgroundColor: isSunset ? '#000000' : isLucid ? (lucidTheme.glassColor || '#070a16') : blobSettings.circleColor,
            borderColor: isLucid ? lucidTheme.borderColor : 'rgba(255, 255, 255, 0.14)',
            backdropFilter: isSunset ? 'none' : 'blur(20px) saturate(150%)',
          }}
        >
          {/* Hardware Ring / Bezel que rodea el logo */}
          {!isSunset && (
            <>
              {/* Outer illuminated precision rim */}
              <div
                className="absolute inset-[2.5%] rounded-full border pointer-events-none transition-colors duration-300"
                style={{
                  borderColor: isLucid ? `${lucidTheme.primary}40` : 'rgba(255, 255, 255, 0.12)',
                  boxShadow: isLucid ? `inset 0 0 12px ${lucidTheme.glow}` : 'inset 0 0 10px rgba(0, 242, 254, 0.08)',
                }}
              />
              {/* Subtle intermediate grooved ring */}
              <div
                className="absolute inset-[5%] rounded-full border pointer-events-none"
                style={{
                  borderColor: isLucid ? `${lucidTheme.secondary}25` : 'rgba(255, 255, 255, 0.06)',
                }}
              />
            </>
          )}

          {/* Aurora Boreal animada sutil dentro del círculo */}
          {!isSunset && (
            <div
              ref={auroraRef}
              className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen transition-opacity duration-300"
              style={{
                background: isLucid
                  ? `radial-gradient(circle at 35% 35%, ${lucidTheme.primary}40 0%, ${lucidTheme.secondary}20 45%, transparent 80%)`
                  : 'radial-gradient(circle at 35% 35%, rgba(0, 242, 254, 0.28) 0%, rgba(138, 43, 226, 0.20) 45%, rgba(255, 8, 138, 0.16) 75%, transparent 95%)',
                filter: 'blur(20px)',
                opacity: 0.35,
              }}
            />
          )}

          {/* Logo Central Vectorial o Imagen Personalizada */}
          {renderCenterLogo()}
        </div>
      </div>

      {/* Botón flotante unificado de estudio: Estilo Halo & Ajustes (Se auto-oculta en reposo) */}
      <div
        className={`fixed top-16 sm:top-18 right-3 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none transition-all duration-700 ${
          isUiIdle && !isBlobPanelOpen ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
          className={`group flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-xl border transition-all duration-200 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)] active:scale-95 ${
            isBlobPanelOpen
              ? 'bg-white/15 text-white border-white/30 shadow-[0_0_20px_rgba(0,229,255,0.25)]'
              : 'bg-[#090d18]/90 text-white/80 border-white/[0.08] hover:text-white hover:bg-white/[0.06] hover:border-white/20'
          }`}
          style={
            isLucid
              ? {
                  borderColor: isBlobPanelOpen ? `${lucidPrimaryColor}80` : `${lucidPrimaryColor}30`,
                  boxShadow: isBlobPanelOpen ? `0 0 25px ${lucidTheme.glow}` : undefined,
                }
              : undefined
          }
          title={isBlobPanelOpen ? 'Cerrar panel de estilo Rainbow Void' : 'Abrir configuración y calibración Rainbow Void'}
          aria-label="Configuración y Estilo de Halo"
        >
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isLucid ? `${lucidPrimaryColor}25` : 'rgba(0, 229, 255, 0.12)',
            }}
          >
            <Sliders
              className="w-3 h-3 transition-transform group-hover:rotate-45 duration-300"
              style={{ color: isLucid ? lucidPrimaryColor : '#00e5ff' }}
            />
          </div>

          <span className="text-xs font-medium tracking-wide text-white/90">
            Rainbow Void
          </span>

          <span className="hidden sm:inline-block text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-white/[0.08] text-white/50 bg-white/[0.03]">
            CALIBRACIÓN
          </span>

          <ChevronDown
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/40 transition-transform duration-200 ${
              isBlobPanelOpen ? 'rotate-180 text-white' : 'group-hover:text-white/70'
            }`}
          />
        </button>
      </div>

      {/* Panel de Control Editable (Z-Index: 50, pointer-events: auto) */}
      {isBlobPanelOpen && (
        <div
          className={`fixed top-28 sm:top-30 right-3 sm:right-6 left-3 sm:left-auto sm:w-96 z-50 rounded-2xl p-4 sm:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.9)] space-y-4 max-h-[calc(100vh-8.5rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 animate-in slide-in-from-top-2 duration-200 pointer-events-auto ${
            isLucid ? 'lucid-panel' : 'bg-[#070a14]/98 backdrop-blur-2xl border border-white/[0.08]'
          }`}
          style={
            isLucid
              ? {
                  backgroundColor: lucidTheme.glassColor,
                  borderColor: lucidTheme.borderColor,
                  boxShadow: `0 0 35px ${lucidTheme.glow}, 0 20px 50px rgba(0,0,0,0.9)`,
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: isLucid ? `${lucidPrimaryColor}25` : 'rgba(0, 229, 255, 0.12)',
                }}
              >
                <Palette
                  className="w-3.5 h-3.5"
                  style={{ color: isLucid ? lucidPrimaryColor : '#00e5ff' }}
                />
              </div>
              <h4 className="text-white text-sm font-medium tracking-wide">
                Calibración Rainbow Void
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveFavoritePreset}
                className={`p-1.5 rounded-md transition-colors ${
                  savedPresetSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Guardar combinación favorita en LocalStorage"
              >
                {savedPresetSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleResetFixedCalibration}
                className="p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
                title="Restablecer valores de calibración fija"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBlobPanelOpen(false)}
                className="p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
                aria-label="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-white/80">
            {/* 0. Selector de Atmósfera y Fondos de Pantalla Completa (CRÍTICO) */}
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/70 font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Atmósfera de Fondo:
                </span>
                <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                  {ATMOSPHERE_OPTIONS.find((a) => a.id === (blobSettings.backgroundAtmosphere || 'none'))?.tag || 'FONDO'}
                </span>
              </div>
              <select
                value={blobSettings.backgroundAtmosphere || 'none'}
                onChange={(e) =>
                  updateBlobSettings({ backgroundAtmosphere: e.target.value as BackgroundAtmosphere })
                }
                className="w-full bg-[#0b0e1b] text-white/90 text-xs font-mono p-2 rounded-lg border border-white/[0.12] focus:outline-none focus:border-amber-400 cursor-pointer"
                title="Selecciona la atmósfera de pantalla completa independiente del núcleo"
              >
                {ATMOSPHERE_OPTIONS.map((atm) => (
                  <option key={atm.id} value={atm.id} className="bg-[#0b0e1b] text-white">
                    {atm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 1. Selector de los 7 Modos Reactivos 2D del Núcleo */}
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/70 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-pink-400" />
                  Forma 2D del Núcleo:
                </span>
                <span className="text-[9px] font-mono text-pink-300 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 uppercase">
                  {RAINBOW_VOID_EFFECTS.find((e) => e.id === blobShape)?.tag || 'CORE 2D'}
                </span>
              </div>
              <select
                value={blobShape}
                onChange={(e) => setBlobShape(e.target.value as VisualizerShape)}
                className="w-full bg-[#0b0e1b] text-white/90 text-xs font-mono p-2 rounded-lg border border-white/[0.12] focus:outline-none focus:border-pink-400 cursor-pointer"
                title="Selecciona la forma geométrica 2D reactiva del núcleo"
              >
                {RAINBOW_VOID_EFFECTS.map((fx) => (
                  <option key={fx.id} value={fx.id} className="bg-[#0b0e1b] text-white">
                    {fx.name} ({fx.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* SECCIÓN DHONKIO EXCLUSIVA: Si está en modo Silueta & Atardecer */}
            {isSunset && (
              <div className="p-3 bg-amber-500/[0.05] rounded-xl border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-amber-300 font-semibold flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5" /> Composición DHONKIO:
                  </span>
                  <span className="text-[9px] font-mono text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                    BLOOM 1.33x
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/60">Bloom Texto & Barras:</span>
                    <span className="text-amber-300 tabular-nums">{(blobSettings.dhonkioBloom ?? 1.33).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.0"
                    step="0.05"
                    value={blobSettings.dhonkioBloom ?? 1.33}
                    onChange={(e) => updateBlobSettings({ dhonkioBloom: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/60">Power Mid (Barras Ciudad):</span>
                    <span className="text-amber-300 tabular-nums">{(blobSettings.dhonkioPowerMid ?? 1.08).toFixed(3)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.005"
                    max="1.15"
                    step="0.005"
                    value={blobSettings.dhonkioPowerMid ?? 1.08}
                    onChange={(e) => updateBlobSettings({ dhonkioPowerMid: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/60">Kick Boost:</span>
                    <span className="text-amber-300 tabular-nums">{blobSettings.dhonkioKickBoost ?? 6}x</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={blobSettings.dhonkioKickBoost ?? 6}
                    onChange={(e) => updateBlobSettings({ dhonkioKickBoost: parseInt(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            )}

            {/* 2. Calibración Geométrica Circular Fija */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2.5">
              <span className="text-[11px] font-mono text-white/60 block font-semibold">
                Geometría Circular:
              </span>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Diámetro Halo Exterior:</span>
                  <span className="text-white/80 tabular-nums">{blobSettings.haloSize || 202}px</span>
                </div>
                <input
                  type="range"
                  min="160"
                  max="450"
                  value={blobSettings.haloSize || 202}
                  onChange={(e) => updateBlobSettings({ haloSize: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Diámetro Núcleo (Void):</span>
                  <span className="text-white/80 tabular-nums">{blobSettings.circleSize || 179}px</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="350"
                  value={blobSettings.circleSize || 179}
                  onChange={(e) => updateBlobSettings({ circleSize: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Procesamiento de Audio (Web Audio API) */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2.5">
              <span className="text-[11px] font-mono text-white/60 block font-semibold">
                Procesamiento de Audio:
              </span>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Reacción al Bajo (Bass):</span>
                  <span className="text-white/80 tabular-nums">{(blobSettings.bassBoost ?? 2.8).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={blobSettings.bassBoost ?? 2.8}
                  onChange={(e) => updateBlobSettings({ bassBoost: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Sensibilidad de Escala:</span>
                  <span className="text-white/80 tabular-nums">{(blobSettings.scaleSensitivity ?? 1.40).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={blobSettings.scaleSensitivity ?? 1.40}
                  onChange={(e) => updateBlobSettings({ scaleSensitivity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Umbral Disparo Kick:</span>
                  <span className="text-white/80 tabular-nums">{Math.round((blobSettings.kickThreshold ?? 0.32) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.02"
                  value={blobSettings.kickThreshold ?? 0.32}
                  onChange={(e) => updateBlobSettings({ kickThreshold: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/50">Potencia Subwoofer Kick:</span>
                  <span className="text-white/80 tabular-nums">{Math.round((blobSettings.kickPower ?? 1.60) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={blobSettings.kickPower ?? 1.60}
                  onChange={(e) => updateBlobSettings({ kickPower: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Sistema de Color: Arcoíris vs Manual */}
            <div className="flex items-center justify-between py-1">
              <span className="text-white/70 flex items-center gap-1.5 font-mono text-xs">
                <Sparkles className="w-3.5 h-3.5 text-white/50" /> Paleta de Arcoíris:
              </span>
              <button
                onClick={() =>
                  updateBlobSettings({ isRainbowMode: !blobSettings.isRainbowMode })
                }
                className={`px-3 py-1 rounded-md text-xs font-mono tracking-wider transition-all ${
                  blobSettings.isRainbowMode
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                }`}
              >
                {blobSettings.isRainbowMode ? 'ARCOÍRIS' : 'MANUAL'}
              </button>
            </div>

            {!blobSettings.isRainbowMode && (
              <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div>
                  <label className="block text-[10px] font-mono text-white/50 mb-1">Color Halo 1:</label>
                  <input
                    type="color"
                    value={blobSettings.haloColor1}
                    onChange={(e) => updateBlobSettings({ haloColor1: e.target.value })}
                    className="w-full h-7 bg-transparent rounded cursor-pointer border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-white/50 mb-1">Color Halo 2:</label>
                  <input
                    type="color"
                    value={blobSettings.haloColor2}
                    onChange={(e) => updateBlobSettings({ haloColor2: e.target.value })}
                    className="w-full h-7 bg-transparent rounded cursor-pointer border border-white/10"
                  />
                </div>
              </div>
            )}

            {/* 5. Personalización del Disco Central y Logotipo */}
            {!isSunset && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <label className="block text-[11px] font-mono text-white/60">
                  Logotipo Vectorial Integrado:
                </label>

                <div className="grid grid-cols-4 gap-1.5">
                  {LOGO_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected =
                      blobSettings.logoStyle === preset.id && !blobSettings.customLogoUrl;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => updateBlobSettings({ logoStyle: preset.id, customLogoUrl: null })}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
                          isSelected
                            ? 'bg-white/[0.1] border-white text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.05]'
                        }`}
                        title={preset.name}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-mono truncate max-w-full">{preset.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subida de Logo Propio con Recorte Circular y Filtros */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <label className="flex-1 py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 text-xs font-mono text-white/80 hover:text-white">
                      <Upload className="w-3.5 h-3.5 text-white/60" />
                      <span>{blobSettings.customLogoUrl ? 'Cambiar Imagen' : 'Subir PNG / SVG'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {blobSettings.customLogoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTempImageForCrop(blobSettings.customLogoUrl);
                            setIsCropModalOpen(true);
                          }}
                          className="py-2 px-3 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white rounded-lg text-xs font-mono transition-all flex items-center gap-1.5"
                          title="Abrir editor de recorte y filtros"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveCustomLogo}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg transition-colors"
                          title="Eliminar logo personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editor de Recorte Circular y Filtros de Logo */}
      <LogoCropFilterModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={tempImageForCrop}
      />
    </div>
  );
};

export default RainbowBlobVisualizer;
