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
  Layers,
  Compass,
  Disc,
} from 'lucide-react';
import { LogoCropFilterModal } from '../UI/LogoCropFilterModal';
import { RAINBOW_VOID_EFFECTS, ATMOSPHERE_OPTIONS, DEFAULT_VOID_EFFECT, isVoidEffectId, resolveVoidFx } from '../../config/visualPresets';
import { VoidFxCustomizer } from '../UI/VoidFxCustomizer';
import { drawVoidEffect, createVoidFxState, type VoidFxState } from './voidEffects';
import type { VisualizerShape, BackgroundAtmosphere } from '../../types/audio';
import { DEFAULT_BLOB_SETTINGS } from '../../services/storageService';
import { useFPSMonitor } from '../../hooks/useFPSMonitor';
import { useProEffectsManager, MAX_ACTIVE_PRO_EFFECTS } from '../../hooks/useProEffectsManager';
import {
  renderKickShockwave,
  renderChromaticRing,
  renderPulseGrid,
  renderMercuryTrails,
  renderConstellationLines,
  renderPlasmaVortex,
  renderGravitationalLensRings,
  renderAuroraRibbons,
  renderCrystalShards,
  spawnCrystalShards,
  renderHolographicScanlines,
} from './effects';
import type { Shockwave, CrystalShard, ApexTrail } from './effects';

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
  if (typeof window === 'undefined') return 0.80;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  // Refined responsive clamp: scales smoothly from 0.38 on small screens to 0.82 on desktop, ensuring negative space and zero viewport crowding
  return clamp(minDim / 920, 0.38, 0.82);
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
  const [openedFromSettings, setOpenedFromSettings] = useState(false);
  const [savedPresetSuccess, setSavedPresetSuccess] = useState(false);
  const [calibTab, setCalibTab] = useState<'shapes' | 'kick' | 'style' | 'atmosphere' | 'pro'>('shapes');
  const [proEffectToast, setProEffectToast] = useState<string | null>(null);

  const blobSettingsRef = useRef(blobSettings);
  blobSettingsRef.current = blobSettings;

  const {
    effects: proEffectsList,
    activeCount: proActiveCount,
    maxCount: maxProEffects,
    toggleEffect,
    setEffectIntensity,
    deactivateHeaviestEffects,
  } = useProEffectsManager(blobSettings, updateBlobSettings, () => {
    setProEffectToast('Máximo 4 efectos activos. Desactiva uno primero.');
    setTimeout(() => setProEffectToast(null), 3200);
  });

  const { recordFrame } = useFPSMonitor({
    thresholdFps: 45,
    lowFpsDurationMs: 2000,
    onPerformanceDrop: () => {
      const dropped = deactivateHeaviestEffects(2);
      if (dropped.length > 0) {
        setProEffectToast(`Efectos desactivados por rendimiento (<45 FPS): ${dropped.join(', ')}`);
        setTimeout(() => setProEffectToast(null), 4000);
      }
    },
  });

  // Buffers persistentes para Efectos Pro (Cero allocations en 60 FPS)
  const shockwavesRef = useRef<Shockwave[]>([]);
  const crystalShardsRef = useRef<CrystalShard[]>([]);
  const apexTrailsRef = useRef<Map<number, ApexTrail>>(new Map());
  const smoothedTrebleRef = useRef(0);
  const hardwareMultiplier = useRef<number>(1.0);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    if (cores < 4 || memory < 4) {
      hardwareMultiplier.current = 0.5;
    }
  }, []);

  useEffect(() => {
    return () => {
      shockwavesRef.current = [];
      crystalShardsRef.current = [];
      apexTrailsRef.current.clear();
    };
  }, []);

  // Unitary scale factor u: responsive clamp
  const [scaleU, setScaleU] = useState<number>(computeScaleFactor);
  const scaleURef = useRef<number>(computeScaleFactor());

  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Estado persistente de los efectos minimalistas (p. ej. anillos de Marea)
  const voidFxState = useRef<VoidFxState>(createVoidFxState());

  // Migra formas guardadas que ya no existen en el catálogo
  useEffect(() => {
    if (!isVoidEffectId(blobShape)) setBlobShape(DEFAULT_VOID_EFFECT);
  }, [blobShape, setBlobShape]);

  // Audio smoothing refs
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);

  // Peak hold array for 64-band spectrum
  const peakHoldCaps = useRef<number[]>(new Array(64).fill(0));

  // Kick Spring Physics & Parametric Morphing
  const kickSpringRef = useRef({
    displacement: 0,
    velocity: 0,
    prevBass: 0,
  });
  const morphNRef = useRef(blobSettings.catEarsCount ?? 2);

  // Envolvente del kick + medidores de calibración en vivo
  const kickEnvRef = useRef(0);
  const meterRefs = useRef<Record<string, HTMLElement | null>>({});

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
      const bs = blobSettingsRef.current;
      const now = performance.now();
      const timeSec = now * 0.001;
      const u = scaleURef.current;

      // Sensibilidad del bombo (control de calibración): 0.32 → 3.0, el valor medido con música real
      const { bass, mids, energy, raw, chroma, kick, kickStrength } = getSmoothedData(1.5 + (bs.kickThreshold ?? 0.32) * 4.7);
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

      const rotSpeed = bs.rotationSpeed ?? 1.0;
      const rotDir = bs.rotationDirection === 'counter_clockwise' ? -1 : 1;
      if (isAudioActive) {
        phase += (0.03 + sBass * 0.1) * rotSpeed;
        angle += (0.25 + sMids * 1.2) * rotSpeed * rotDir;
      } else {
        phase += 0.015 * rotSpeed;
        angle += 0.1 * rotSpeed * rotDir;
      }

      // Morphing for Cat-Ears / Sacred Geometry
      const targetN = bs.catEarsCount ?? 2;
      morphNRef.current += (targetN - morphNRef.current) * 0.12;

      // Smooth Treble energy for Chromatic Ring & Diamond Nodes
      let trebleEnergy = 0;
      if (raw && raw.length > 0) {
        const trebleSlice = raw.slice(Math.floor(raw.length * 0.65));
        trebleEnergy = trebleSlice.length > 0
          ? (trebleSlice.reduce((a, b) => a + b, 0) / (trebleSlice.length * 255)) * audioSens
          : 0;
      }
      smoothedTrebleRef.current += (trebleEnergy - smoothedTrebleRef.current) * 0.28;
      const sTreble = smoothedTrebleRef.current;

      // ── Kick Transient & iOS Spring Damping Integration ──
      const kickThresh = bs.kickThreshold ?? 0.32;
      const kPower = bs.kickPower ?? 1.6;

      // El bombo lo detecta el hook (flujo positivo de graves en amplitud lineal)
      kickSpringRef.current.prevBass = sBass;
      const isKickTriggered = isAudioActive && kick;
      const boomStrength = isKickTriggered ? kickStrength : 0;
      if (isKickTriggered) {
        // Impulso elástico proporcional a la fuerza real del golpe
        kickSpringRef.current.velocity += Math.min(0.38, (0.08 + boomStrength * 0.3) * kPower * 0.8);
        kickEnvRef.current = Math.max(kickEnvRef.current, boomStrength);
      }
      kickEnvRef.current *= 0.9;

      // Medidores de calibración (solo existen con el panel abierto)
      const mt = meterRefs.current;
      if (mt.bass) mt.bass.style.transform = `scaleX(${Math.min(1, sBass)})`;
      if (mt.mids) mt.mids.style.transform = `scaleX(${Math.min(1, sMids)})`;
      if (mt.treble) mt.treble.style.transform = `scaleX(${Math.min(1, sTreble)})`;
      if (mt.kick) mt.kick.style.opacity = String(Math.min(1, kickEnvRef.current * 1.4));

      // Spring physics step (stiffness 140, damping 0.78 for iOS-like elastic return)
      const springDt = 0.016;
      const springK = 140;
      const springDampingFactor = 0.78;
      const springForce = -springK * kickSpringRef.current.displacement;
      kickSpringRef.current.velocity = (kickSpringRef.current.velocity + springForce * springDt) * springDampingFactor;
      kickSpringRef.current.displacement += kickSpringRef.current.velocity * springDt;
      if (kickSpringRef.current.displacement < 0) kickSpringRef.current.displacement = 0;

      const kickSpringRebound = kickSpringRef.current.displacement * 0.25; // Up to +25% spring expansion on Kick

      // Smooth audio-reactive scale calibration
      const isEarLikeShape = isVoidEffectId(blobShape);
      const isTransparentHalo = bs.transparentHalo !== false;
      const kickIntensity = bs.kickIntensity ?? 1.0;
      const nivel = isAudioActive ? sBass : 0;
      const boostVal = bs.bassBoost ?? 2.8;
      const idleBreathing = isAudioActive ? 0 : Math.sin(timeSec * 1.5) * 0.03;
      const sens = (bs.scaleSensitivity ?? 1.40) * audioSens;
      const baseScale = 0.75 + idleBreathing;

      // In Ear-Like Shapes & Sacred Minimalism: Pure spring rebound + smooth bass (no jitter/stutter)
      const bassContribution = isEarLikeShape
        ? (sBass * 0.12 * kickIntensity + kickSpringRebound)
        : (Math.pow(nivel, 1.2) * (0.35 + boostVal * 0.18));

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
        } else if (isTransparentHalo || isEarLikeShape) {
          // Zero-Noise Transparent Halo (Subtle, non-invasive rim)
          haloRef.current.style.opacity = isAudioActive ? `${0.06 + sBass * 0.10}` : '0.03';
          haloRef.current.style.boxShadow = 'none';
          haloRef.current.style.backdropFilter = 'none';
        } else {
          haloRef.current.style.opacity = '1.0';
          haloRef.current.style.backdropFilter = 'blur(18px) saturate(160%)';
        }
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.borderRadius = borderRadius;
        haloGlowRef.current.style.transform = `scale(${escala * 1.15}) rotate(${-angle * 0.5}deg)`;
        if (isTransparentHalo || isEarLikeShape) {
          // Completely eliminates background wash-out
          haloGlowRef.current.style.opacity = '0';
          haloGlowRef.current.style.filter = 'none';
        } else {
          haloGlowRef.current.style.opacity = `${isAudioActive ? 0.4 + nivel * 0.4 : 0.25}`;
          haloGlowRef.current.style.filter = `blur(${isAudioActive ? (20 + nivel * 24) * u : 18 * u}px)`;
        }
      }

      if (auroraRef.current) {
        if (isSunset || (isEarLikeShape && isTransparentHalo)) {
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
          const baseCircleRadius = (bs.circleSize / 2) * u * escala;

          // Monitoreo de FPS por frame
          recordFrame(now);

          // Sacred Palette Global para Efectos Pro y Formas
          const palette = bs.sacredPalette ?? 'neon';
          let primaryColor = '#00F0FF';
          let secondaryColor = '#DDB7FF';
          if (palette === 'gold') {
            primaryColor = '#E2C889';
            secondaryColor = '#FFF2CE';
          } else if (palette === 'crystal') {
            primaryColor = '#FFFFFF';
            secondaryColor = '#B0C4DE';
          } else if (palette === 'lucid') {
            primaryColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary) : (dynamicColor || '#00f0ff');
            secondaryColor = isLucid ? (lucidTheme.secondary || '#a855f7') : '#ddb7ff';
          } else if (palette === 'cyberpunk') {
            primaryColor = '#ff007f';
            secondaryColor = '#00f2fe';
          } else if (palette === 'aurora') {
            primaryColor = '#00ff87';
            secondaryColor = '#60efff';
          } else if (palette === 'custom') {
            primaryColor = bs.haloColor1 || '#00f0ff';
            secondaryColor = bs.haloColor2 || '#ffd166';
          }

          const hwMult = hardwareMultiplier.current;

          // Disparo de eventos en Kick
          if (isKickTriggered) {
            if (bs.shockwaveEnabled) {
              shockwavesRef.current.push({
                radius: baseCircleRadius,
                maxRadius: baseCircleRadius * 2.5,
                alpha: 0.9,
                startTime: timeSec,
              });
              if (shockwavesRef.current.length > 3) {
                shockwavesRef.current.splice(0, shockwavesRef.current.length - 3);
              }
            }
            if (bs.crystalShardsEnabled) {
              spawnCrystalShards(
                crystalShardsRef.current,
                cx,
                cy,
                baseCircleRadius,
                u,
                primaryColor,
                6
              );
            }
          }

          // ── Capa 0: Crystalline Shards (Fragmentos balísticos) ──
          if (bs.crystalShardsEnabled) {
            crystalShardsRef.current = renderCrystalShards(
              ctx,
              crystalShardsRef.current,
              u,
              0.016,
              (bs.crystalShardsIntensity ?? 1.0) * hwMult
            );
          }

          // ── Capa 3B: Pulse Grid (Detrás del void) ──
          if (bs.pulseGridEnabled) {
            renderPulseGrid(
              ctx,
              raw,
              cx,
              cy,
              baseCircleRadius,
              u,
              (bs.pulseGridIntensity ?? 1.0) * hwMult
            );
          }

          // ── Capa 5: Aurora Ribbons (Detrás del void) ──
          if (bs.auroraRibbonsEnabled) {
            renderAuroraRibbons(
              ctx,
              cx,
              cy,
              baseCircleRadius,
              u,
              timeSec,
              sEnergy,
              (bs.auroraRibbonsIntensity ?? 1.0) * hwMult
            );
          }

          let currentFrameTips: { x: number; y: number }[] = [];

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
          // EFECTO ACTIVO — catálogo minimalista (voidEffects.ts)
          // ─────────────────────────────────────────────────────────────────
          {
            const activeEffect = isVoidEffectId(blobShape) ? blobShape : DEFAULT_VOID_EFFECT;
            currentFrameTips = drawVoidEffect(
              activeEffect,
              {
                ctx,
                cx,
                cy,
                r: baseCircleRadius,
                u,
                t: timeSec,
                bass: sBass,
                mids: sMids,
                treble: sTreble,
                energy: sEnergy,
                kickStrength: kickEnvRef.current,
                boom: boomStrength,
                active: isAudioActive,
                chroma,
                raw,
                fx: resolveVoidFx(bs.voidFx, activeEffect),
                primary: primaryColor,
                secondary: secondaryColor,
                accent: '#FFFFFF',
                angleDeg: angle,
                stroke: Math.max(0.75, Math.min(1.5, bs.strokeHairline ?? bs.catEarsStrokeWidth ?? 1.0)),
              },
              voidFxState.current
            );
          }

          // ═════════════════════════════════════════════════════════════════
          // CAPAS PRO VISUAL EFFECTS (Z-ORDER)
          // ═════════════════════════════════════════════════════════════════

          // Síntesis de nodos perimetrales si la forma activa no genera ápices polares
          if (currentFrameTips.length === 0 && (bs.constellationEnabled || bs.mercuryTrailsEnabled)) {
            const synthCount = 6;
            for (let k = 0; k < synthCount; k++) {
              const th = (k / synthCount) * Math.PI * 2 + timeSec * 0.35;
              const r = baseCircleRadius + (16 + sBass * 24 + Math.sin(th * 3 + timeSec * 2.5) * 10) * u;
              currentFrameTips.push({
                x: cx + Math.cos(th) * r,
                y: cy + Math.sin(th) * r,
              });
            }
          }

          // Capa 3: Constellation Lines (Líneas entre micro-nodos de ápices)
          if (bs.constellationEnabled && currentFrameTips.length >= 3) {
            renderConstellationLines(
              ctx,
              currentFrameTips,
              u,
              sEnergy,
              (bs.constellationIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 6: Liquid Mercury Trails (Trazos de mercurio líquido)
          if (bs.mercuryTrailsEnabled && currentFrameTips.length > 0) {
            renderMercuryTrails(
              ctx,
              currentFrameTips,
              apexTrailsRef.current,
              u,
              primaryColor,
              (bs.mercuryTrailsIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 4: Kick Shockwave (Onda expansiva del bombo)
          if (bs.shockwaveEnabled) {
            shockwavesRef.current = renderKickShockwave(
              ctx,
              shockwavesRef.current,
              cx,
              cy,
              baseCircleRadius,
              u,
              timeSec,
              primaryColor,
              (bs.shockwaveIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 7: Plasma Vortex (Vórtice dentro del void)
          if (bs.plasmaVortexEnabled && !isSunset) {
            renderPlasmaVortex(
              ctx,
              cx,
              cy,
              baseCircleRadius,
              u,
              timeSec,
              sBass,
              sEnergy,
              primaryColor,
              (bs.plasmaVortexIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 8: Chromatic Aberration Ring (Aro RGB en el halo)
          if (bs.chromaticRingEnabled) {
            renderChromaticRing(
              ctx,
              cx,
              cy,
              baseCircleRadius,
              u,
              sTreble,
              (bs.chromaticRingIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 9: Holographic Scanlines (Líneas holográficas dentro del void)
          if (bs.holographicScanlinesEnabled && !isSunset) {
            renderHolographicScanlines(
              ctx,
              cx,
              cy,
              baseCircleRadius,
              u,
              timeSec,
              (bs.holographicScanlinesIntensity ?? 1.0) * hwMult
            );
          }

          // Capa 10: Gravitational Lens (Einstein Photon Ring)
          if (bs.gravitationalLensEnabled) {
            renderGravitationalLensRings(
              ctx,
              cx,
              cy,
              baseCircleRadius,
              u,
              timeSec,
              sBass,
              (bs.gravitationalLensIntensity ?? 1.0) * hwMult
            );
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
    lucidPrimaryColor,
    autoMode,
    dynamicColor,
    isSunset,
    blobSettings.catEarsCount,
    blobSettings.catEarsLayers,
    blobSettings.catEarsStrokeWidth,
    blobSettings.catEarsSharpness,
    blobSettings.sacredPalette,
    blobSettings.transparentHalo,
    blobSettings.kickThreshold,
    blobSettings.kickPower,
  ]);

  const haloBackground = isLucid
    ? `conic-gradient(from 0deg, ${lucidTheme.primary}, ${lucidTheme.secondary}, #ff007f, ${lucidTheme.primary})`
    : autoMode
    ? `conic-gradient(from 0deg, ${dynamicColor}, ${dynamicColor}88, ${dynamicColor}ee, ${dynamicColor})`
    : blobSettings.sacredPalette === 'custom' || (!blobSettings.isRainbowMode && (blobSettings.haloColor1 || blobSettings.haloColor2))
    ? `conic-gradient(from 0deg, ${blobSettings.haloColor1 || '#00f0ff'}, ${blobSettings.haloColor2 || '#ffd166'}, ${blobSettings.haloColor1 || '#00f0ff'})`
    : blobSettings.isRainbowMode
    ? 'conic-gradient(from 0deg, #ff088a, #8a2be2, #00f2fe, #00ffb3, #ffe600, #ff5e00, #ff088a)'
    : `conic-gradient(${blobSettings.haloColor1 || '#00f0ff'}, ${blobSettings.haloColor2 || '#ffd166'}, ${blobSettings.haloColor1 || '#00f0ff'})`;

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setTempImageForCrop(result);
        setOpenedFromSettings(false);
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
      kickIntensity: DEFAULT_BLOB_SETTINGS.kickIntensity,
      strokeHairline: 1.0,
      rotationSpeed: 1.0,
      dhonkioBloom: 1.33,
      dhonkioInnerSize: 0.14,
      dhonkioOuterSize: 0.35,
      dhonkioOpacity: 0.42,
      dhonkioPowerBass: 1.035,
      dhonkioPowerMid: 1.08,
      dhonkioPowerKick: 1.045,
      dhonkioKickBoost: 6,
      catEarsCount: 2,
      catEarsLayers: 2,
      catEarsStrokeWidth: 1.0,
      catEarsSharpness: 2.2,
      sacredPalette: 'neon',
      transparentHalo: true,
      isAdvancedMode: false,
    });
    setBlobBassBoomThreshold(0.68);
    setBlobBassBoomIntensity(1.6);
  };

  const haloDimension = (blobSettings.haloSize || 382) * scaleU;
  const circleDimension = (blobSettings.circleSize || 340) * scaleU;

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
              setOpenedFromSettings(false);
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
            className="relative rounded-full overflow-hidden border shadow-2xl animate-[spin_48s_linear_infinite] group-hover:scale-[1.02] transition-transform"
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
        className="rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] border flex items-center justify-center transform hover:scale-105 transition-transform z-10 backdrop-blur-md cursor-pointer"
        onClick={() => {
          setTempImageForCrop(currentTrack?.coverUrl || null);
          setOpenedFromSettings(false);
          setIsCropModalOpen(true);
        }}
        title="Haz clic para personalizar el logo o aplicar filtros (iOS Card)"
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

  const isEarLikeShape = isVoidEffectId(blobShape);
  const containerPosX = isSunset ? 50 : blobSettings.posX;
  const containerPosY = isSunset ? 43.5 : blobSettings.posY;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-transparent select-none">
      {/* Contenedor Principal Circular (Z-Index: 10) */}
      <div
        ref={containerRef}
        className="absolute flex justify-center items-center pointer-events-auto transform-gpu"
        style={{
          left: `${containerPosX}%`,
          top: `${containerPosY}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      >
        {/* Dynamic Canvas for 3D Shapes & Wave Effects in Rainbow Void */}
        <canvas
          id="rainbow-void-canvas"
          data-visualizer="true"
          ref={canvasRef}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 z-20"
          style={{ width: `${Math.round(700 * scaleU)}px`, height: `${Math.round(700 * scaleU)}px` }}
        />

        {/* Halo Glow Diffusion */}
        <div
          ref={haloGlowRef}
          className="absolute rounded-full pointer-events-none mix-blend-screen transform-gpu will-change-transform"
          style={{
            width: `${haloDimension * 1.15}px`,
            height: `${haloDimension * 1.15}px`,
            background: haloBackground,
          }}
        />

        {/* El Halo / Blob de Arcoíris Principal */}
        <div
          ref={haloRef}
          className="absolute rounded-full pointer-events-none transform-gpu will-change-transform"
          style={{
            width: `${haloDimension}px`,
            height: `${haloDimension}px`,
            background: haloBackground,
            boxShadow: isLucid
              ? `0 0 ${Math.round(35 * (blobSettings.bloomIntensity ?? 1.0))}px ${lucidTheme.glow}`
              : `0 0 ${Math.round(45 * (blobSettings.bloomIntensity ?? 1.0))}px rgba(0, 242, 254, 0.25), 0 0 ${Math.round(70 * (blobSettings.bloomIntensity ?? 1.0))}px rgba(255, 8, 138, 0.18)`,
            backdropFilter: 'blur(18px) saturate(160%)',
          }}
        />

        {/* El Círculo Interior (The Void) */}
        <div
          ref={circleRef}
          data-void-disc="true"
          className={`relative z-10 rounded-full flex items-center justify-center transform-gpu will-change-transform overflow-hidden ${
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
              className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen transform-gpu will-change-transform"
              style={{
                background: isLucid
                  ? `radial-gradient(circle at 40% 35%, ${lucidTheme.primary}35 0%, ${lucidTheme.secondary}18 50%, transparent 80%)`
                  : 'radial-gradient(circle at 40% 35%, rgba(0, 242, 254, 0.22) 0%, rgba(138, 43, 226, 0.16) 45%, rgba(255, 8, 138, 0.10) 75%, transparent 95%)',
                filter: 'blur(22px)',
                opacity: 0.32,
              }}
            />
          )}

          {/* Logo Central Vectorial o Imagen Personalizada */}
          {renderCenterLogo()}
        </div>
      </div>

      {/* Botón flotante unificado de estudio: Estilo Halo & Ajustes (Se auto-oculta en reposo) */}
      <div
        className={`fixed top-20 sm:top-24 right-3 sm:right-5 z-40 flex items-center gap-1.5 pointer-events-auto select-none transition-all duration-700 ${
          isUiIdle && !isBlobPanelOpen ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
          className={`group flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full liquid-glass border transition-all duration-200 shadow-[0_8px_25px_rgba(0,0,0,0.5)] active:scale-95 cursor-pointer backdrop-blur-2xl ${
            isBlobPanelOpen
              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-[0_0_20px_rgba(0,229,255,0.3)]'
              : 'bg-[#0a0f1d]/85 text-white/90 border-white/15 border-t-white/30 hover:bg-white/[0.12] hover:text-white'
          }`}
          style={
            isLucid
              ? {
                  borderColor: isBlobPanelOpen ? `${lucidPrimaryColor}80` : `${lucidPrimaryColor}40`,
                  boxShadow: isBlobPanelOpen ? `0 0 25px ${lucidTheme.glow}` : undefined,
                }
              : undefined
          }
          title={isBlobPanelOpen ? 'Cerrar panel de estilo Rainbow Void' : 'Abrir configuración y calibración Rainbow Void'}
          aria-label="Configuración y Estilo de Halo"
        >
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center transition-colors bg-cyan-500/15"
            style={{
              backgroundColor: isLucid ? `${lucidPrimaryColor}25` : undefined,
            }}
          >
            <Sliders
              className="w-2.5 h-2.5 transition-transform group-hover:rotate-45 duration-300"
              style={{ color: isLucid ? lucidPrimaryColor : '#00e5ff' }}
            />
          </div>

          <span className="text-[11px] font-medium tracking-wide text-white/90">
            Rainbow Void
          </span>

          <span className="hidden sm:inline-block text-[8px] font-mono tracking-wider px-1.5 py-0.2 rounded-full border border-white/15 text-white/60 bg-white/[0.04]">
            CALIB
          </span>

          <ChevronDown
            className={`w-3 h-3 text-white/40 transition-transform duration-200 ${
              isBlobPanelOpen ? 'rotate-180 text-white' : 'group-hover:text-white/70'
            }`}
          />
        </button>
      </div>

      {/* Panel de Control Editable (Z-Index: 50, pointer-events: auto) */}
      {isBlobPanelOpen && (
        <div
          className={`fixed top-12 sm:top-14 right-3 sm:right-5 left-3 sm:left-auto sm:w-84 z-50 rounded-[24px] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-3.5 max-h-[calc(100vh-4.5rem)] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200 pointer-events-auto liquid-glass liquid-glass-card bg-[#0a0f1d]/94 backdrop-blur-3xl border border-white/15 border-t-white/30 text-white font-sans ${
            isLucid ? 'lucid-panel' : ''
          }`}
          style={
            isLucid
              ? {
                  backgroundColor: lucidTheme.glassColor,
                  borderColor: lucidTheme.borderColor,
                  boxShadow: `0 0 35px ${lucidTheme.glow}, 0 25px 60px rgba(0,0,0,0.95)`,
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div
                className="w-6.5 h-6.5 rounded-full flex items-center justify-center border border-white/10"
                style={{
                  backgroundColor: isLucid ? `${lucidPrimaryColor}25` : 'rgba(0, 229, 255, 0.12)',
                }}
              >
                <Palette
                  className="w-3.5 h-3.5"
                  style={{ color: isLucid ? lucidPrimaryColor : '#00e5ff' }}
                />
              </div>
              <h4 className="text-white text-xs sm:text-sm font-semibold tracking-tight">
                Calibración Rainbow Void
              </h4>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveFavoritePreset}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                  savedPresetSuccess
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40 font-bold'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border-white/10 border-t-white/20'
                }`}
                title="Guardar combinación favorita en LocalStorage"
              >
                {savedPresetSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleResetFixedCalibration}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10 border-t-white/20 transition-all active:scale-95"
                title="Restablecer valores de calibración fija"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBlobPanelOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10 border-t-white/20 transition-all active:scale-95"
                aria-label="Cerrar panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-white/80">
            {/* 5 Píldoras de Navegación visionOS (Regla: Sin Emojis) */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
              {[
                { id: 'shapes', label: 'Formas', icon: Sliders },
                { id: 'kick', label: 'Bombo', icon: Activity },
                { id: 'style', label: 'Estilo', icon: Palette },
                { id: 'atmosphere', label: 'Fondo', icon: Sparkles },
                { id: 'pro', label: 'Pro', icon: Zap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = calibTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCalibTab(tab.id as any)}
                    className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 border ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 font-semibold shadow-sm'
                        : 'bg-transparent text-white/40 border-transparent hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono leading-none tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Medidores de calibración en vivo */}
            <div className="glass-card !rounded-xl !p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white/60">
                <span>Señal en vivo</span>
                <span
                  ref={(el) => {
                    meterRefs.current.kick = el;
                  }}
                  className="text-cyan-300 font-bold opacity-0"
                >
                  ● KICK
                </span>
              </div>
              {(
                [
                  ['Graves', 'bass'],
                  ['Medios', 'mids'],
                  ['Agudos', 'treble'],
                ] as const
              ).map(([label, key]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-12 text-[10px] font-mono text-white/55">{label}</span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      ref={(el) => {
                        meterRefs.current[key] = el;
                      }}
                      className="absolute inset-0 origin-left bg-gradient-to-r from-cyan-400 to-violet-400"
                      style={{ transform: 'scaleX(0)' }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[10px] leading-snug text-white/45">
                Sube o baja «Sensibilidad del Bombo» hasta que KICK parpadee solo con el bombo.
              </p>
            </div>

            {/* Banner de Notificación Pro Effects (Límites o Circuit Breaker) */}
            {proEffectToast && (
              <div className="p-2.5 bg-amber-500/15 border border-amber-400/35 rounded-xl text-amber-200 text-[10px] font-mono flex items-center gap-2 animate-in fade-in duration-200">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="leading-tight">{proEffectToast}</span>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 1: GEOMETRÍA & FORMAS PERIFÉRICAS                       */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {calibTab === 'shapes' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                {/* 1. Control de Tamaño del Núcleo Void (Regulación Segura Proporcional) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/80 font-medium">Tamaño del Núcleo Void:</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {blobSettings.circleSize || 340} px ({Math.round(((blobSettings.circleSize || 340) / 340) * 100)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="160"
                    max="500"
                    step="1"
                    value={blobSettings.circleSize || 340}
                    onChange={(e) => updateBlobSettings({ circleSize: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {[
                      { size: 240, label: 'Compacto (240px)' },
                      { size: 340, label: 'Estándar (340px)' },
                      { size: 430, label: 'Amplio (430px)' },
                    ].map((preset) => {
                      const isActive = (blobSettings.circleSize || 340) === preset.size;
                      return (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => updateBlobSettings({ circleSize: preset.size })}
                          className={`py-1 rounded-lg text-[8px] font-mono transition-all border ${
                            isActive
                              ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Selector de efecto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/70">Efecto</span>
                    <span className="text-[10px] font-mono text-cyan-300">
                      {RAINBOW_VOID_EFFECTS.find((e) => e.id === blobShape)?.tag}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {RAINBOW_VOID_EFFECTS.map((fx) => {
                      const isSelected = blobShape === fx.id;
                      return (
                        <button
                          key={fx.id}
                          type="button"
                          onClick={() => setBlobShape(fx.id)}
                          className={`glass-item !rounded-xl px-3 py-2.5 text-left flex flex-col gap-0.5 cursor-pointer ${
                            isSelected ? 'is-active text-white' : 'text-white/75'
                          }`}
                          title={fx.desc}
                        >
                          <span className="text-[12px] font-semibold tracking-tight">{fx.name}</span>
                          <span className="text-[10px] leading-snug text-white/55 line-clamp-2">{fx.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Personalización del efecto */}
                <VoidFxCustomizer />

                {/* 4. Grosor de Línea Hairline (0.75px, 1.00px, 1.50px) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Grosor de Trazo Hairline:</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {(blobSettings.strokeHairline || blobSettings.catEarsStrokeWidth || 1.0).toFixed(2)} px
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[0.75, 1.0, 1.5].map((w) => {
                      const active = (blobSettings.strokeHairline ?? blobSettings.catEarsStrokeWidth ?? 1.0) === w;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateBlobSettings({ strokeHairline: w as any, catEarsStrokeWidth: w })}
                          className={`py-1.5 rounded-lg text-[9px] font-mono transition-all border ${
                            active
                              ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white'
                          }`}
                        >
                          {w === 0.75 ? '0.75px (Ultrafino)' : w === 1.0 ? '1.00px (Preciso)' : '1.50px (Nítido)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 2: RESPUESTA AL BOMBO (KICK & SPRING PHYSICS)           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {calibTab === 'kick' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                {/* 1. Intensidad de Rebote Elástico (Física de Resorte iOS) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Intensidad del Kick (Elastic Rebound):</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {(blobSettings.kickIntensity ?? 1.0).toFixed(2)}x (+{Math.round((blobSettings.kickIntensity ?? 1.0) * 12)}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={blobSettings.kickIntensity ?? 1.0}
                    onChange={(e) => updateBlobSettings({ kickIntensity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>0.5x (Sutil)</span>
                    <span>1.0x (Calibrado visionOS)</span>
                    <span>1.5x (Enérgico)</span>
                  </div>
                  <span className="text-[8px] text-white/35 block pt-0.5">
                    Física de segundo orden (stiffness: 180, damping: 12) con rebote elástico.
                  </span>
                </div>

                {/* 2. Sensibilidad Global de Escala */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Sensibilidad de Escala al Audio:</span>
                    <span className="text-white/90 font-bold tabular-nums">{(blobSettings.scaleSensitivity ?? 1.40).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.2"
                    step="0.05"
                    value={blobSettings.scaleSensitivity ?? 1.40}
                    onChange={(e) => updateBlobSettings({ scaleSensitivity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>0.4x (Fijo)</span>
                    <span>1.4x (Estándar)</span>
                    <span>2.2x (Reactivo)</span>
                  </div>
                </div>

                {/* 3. Umbral de Disparo del Sub-Bass */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Sensibilidad del Bombo (menor = más golpes):</span>
                    <span className="text-white/90 font-bold tabular-nums">{Math.round((blobSettings.kickThreshold ?? 0.32) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.70"
                    step="0.02"
                    value={blobSettings.kickThreshold ?? 0.32}
                    onChange={(e) => updateBlobSettings({ kickThreshold: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[8px] text-white/35 block">
                    Cuánto debe sobresalir un golpe de graves para contar como kick. Guíate por el indicador KICK de arriba.
                  </span>
                </div>

                {/* 4. Potencia del Subwoofer */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Potencia Subwoofer (Inercia):</span>
                    <span className="text-white/90 font-bold tabular-nums">{Math.round((blobSettings.kickPower ?? 1.60) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={blobSettings.kickPower ?? 1.60}
                    onChange={(e) => updateBlobSettings({ kickPower: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 3: ESTILO, PALETA & HALO TRANSPARENTE                   */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {calibTab === 'style' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                {/* 1. Paleta de Color Sagrada & Modo Personalizado Pro */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/70 block font-semibold">Paleta del Aro & Crestas:</span>
                    <span className="text-[9px] font-mono text-cyan-300 uppercase font-bold">
                      {blobSettings.sacredPalette || 'neon'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'neon', name: 'Neón Líquido', desc: 'Cian & Violeta', colors: ['#00F0FF', '#8C38FF'] },
                      { id: 'gold', name: 'Oro Champán', desc: 'Lujo & Obsidiana', colors: ['#E2C889', '#FFF2CE'] },
                      { id: 'crystal', name: 'Cristal Esmerilado', desc: 'Blanco visionOS', colors: ['#FFFFFF', '#B0C4DE'] },
                      { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Magenta & Cian', colors: ['#ff007f', '#00f2fe'] },
                      { id: 'aurora', name: 'Aurora Boreal', desc: 'Verde & Aguamarina', colors: ['#00ff87', '#60efff'] },
                      { id: 'lucid', name: 'Sincro Lúcido', desc: 'Color del reproductor', colors: [lucidTheme.primary, lucidTheme.secondary] },
                      { id: 'custom', name: 'Personalizado Pro', desc: 'Colores a medida', colors: [blobSettings.haloColor1 || '#00f0ff', blobSettings.haloColor2 || '#ffd166'] },
                    ].map((pal) => {
                      const isSel = (blobSettings.sacredPalette || 'neon') === pal.id;
                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => updateBlobSettings({ sacredPalette: pal.id as any })}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSel
                              ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-bold leading-tight">{pal.name}</div>
                            <div className="text-[8px] text-white/40">{pal.desc}</div>
                          </div>
                          <div className="flex gap-0.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.colors[0] }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.colors[1] }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selectores de Color Personalizado Pro si está activo */}
                  {blobSettings.sacredPalette === 'custom' && (
                    <div className="pt-2 border-t border-white/[0.08] space-y-2 animate-in fade-in-50 duration-150">
                      <span className="text-[9.5px] font-mono text-cyan-300 block font-semibold">
                        Ajuste Fino de Colores (HEX):
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/70">Halo 1</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={blobSettings.haloColor1 || '#00f0ff'}
                              onChange={(e) => updateBlobSettings({ haloColor1: e.target.value })}
                              className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                            />
                            <span className="text-[8.5px] font-mono uppercase text-white/60">
                              {blobSettings.haloColor1 || '#00F0FF'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-white/70">Halo 2</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={blobSettings.haloColor2 || '#ffd166'}
                              onChange={(e) => updateBlobSettings({ haloColor2: e.target.value })}
                              className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                            />
                            <span className="text-[8.5px] font-mono uppercase text-white/60">
                              {blobSettings.haloColor2 || '#FFD166'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Color de Fondo del Núcleo Abisal */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[9.5px] font-mono text-white/80 block">Fondo del Núcleo Void</span>
                          <span className="text-[7.5px] text-white/40 block">Tono de profundidad interna</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={blobSettings.circleColor || '#070a16'}
                            onChange={(e) => updateBlobSettings({ circleColor: e.target.value })}
                            className="w-5 h-5 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                          />
                          <span className="text-[8.5px] font-mono uppercase text-white/60">
                            {blobSettings.circleColor || '#070A16'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Grosor & Difusión del Aro (haloSize) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Grosor y Difusión del Aro:</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {blobSettings.haloSize || 382} px (+{Math.max(0, (blobSettings.haloSize || 382) - (blobSettings.circleSize || 340))}px difusión)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="220"
                    max="520"
                    step="2"
                    value={blobSettings.haloSize || 382}
                    onChange={(e) => updateBlobSettings({ haloSize: parseInt(e.target.value, 10) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>220px (Línea Fina)</span>
                    <span>382px (Estándar)</span>
                    <span>520px (Aura Gruesa)</span>
                  </div>
                </div>

                {/* 3. Resplandor / Bloom Intensity */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-white/70">Resplandor Neón & Bloom:</span>
                    <span className="text-cyan-300 font-bold tabular-nums">
                      {(blobSettings.bloomIntensity ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.2"
                    step="0.05"
                    value={blobSettings.bloomIntensity ?? 1.0}
                    onChange={(e) => updateBlobSettings({ bloomIntensity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>0.3x (Minimalista)</span>
                    <span>1.0x (Calibrado)</span>
                    <span>2.2x (Supernova)</span>
                  </div>
                </div>

                {/* 4. Velocidad & Dirección de Rotación Orbital */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/70">Giro Orbital del Aro:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateBlobSettings({
                            rotationDirection:
                              blobSettings.rotationDirection === 'counter_clockwise'
                                ? 'clockwise'
                                : 'counter_clockwise',
                          })
                        }
                        className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[8px] font-mono text-cyan-300 cursor-pointer"
                        title="Cambiar dirección de giro"
                      >
                        {blobSettings.rotationDirection === 'counter_clockwise' ? '↺ Antihorario' : '↻ Horario'}
                      </button>
                      <span className="text-cyan-300 font-bold tabular-nums">
                        {(blobSettings.rotationSpeed ?? 1.0).toFixed(2)}x
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={blobSettings.rotationSpeed ?? 1.0}
                    onChange={(e) => updateBlobSettings({ rotationSpeed: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                    <span>0.0x (Estático)</span>
                    <span>1.0x (Suave)</span>
                    <span>2.5x (Rápido)</span>
                  </div>
                </div>

                {/* 5. Halo Transparente (Cero Ruido) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-white/80 block font-semibold">Halo Transparente visionOS</span>
                    <span className="text-[8px] text-white/40 block">Elimina el blur difuso y mantiene el negro abisal #05070E</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateBlobSettings({ transparentHalo: !blobSettings.transparentHalo })}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all border cursor-pointer ${
                      blobSettings.transparentHalo !== false
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/40 shadow-sm'
                        : 'bg-white/[0.05] text-white/40 border-white/[0.08]'
                    }`}
                  >
                    {blobSettings.transparentHalo !== false ? 'TRANSPARENTE' : 'CLÁSICO DIFUSO'}
                  </button>
                </div>

                {/* 3. Logotipo Vectorial del Void */}
                {!isSunset && (
                  <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                    <label className="block text-[10px] font-mono text-white/60">Logotipo Central del Void:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {LOGO_PRESETS.map((preset) => {
                        const Icon = preset.icon;
                        const isSelected = blobSettings.logoStyle === preset.id && !blobSettings.customLogoUrl;
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
                            <span className="text-[8px] font-mono truncate max-w-full">{preset.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1 flex gap-2">
                      <label className="flex-1 py-1.5 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 text-[10px] font-mono text-white/80 hover:text-white">
                        <Upload className="w-3 h-3 text-white/60" />
                        <span>{blobSettings.customLogoUrl ? 'Cambiar Imagen' : 'Subir PNG / SVG'}</span>
                        <input type="file" accept="image/*" onChange={handleCustomLogoUpload} className="hidden" />
                      </label>
                      {blobSettings.customLogoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCustomLogo}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg transition-colors"
                          title="Eliminar logo personalizado"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Botón de acceso directo al Card de Edición & Filtros iOS desde Ajustes */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetImg = blobSettings.customLogoUrl || currentTrack?.coverUrl || null;
                        setTempImageForCrop(targetImg);
                        setOpenedFromSettings(true);
                        setBlobPanelOpen(false);
                        setIsCropModalOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-purple-500/15 hover:from-cyan-500/25 hover:via-indigo-500/25 hover:to-purple-500/25 border border-cyan-400/30 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 text-[10px] font-mono text-cyan-200 font-semibold shadow-sm active:scale-95"
                    >
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Editar Logo & Filtros Neón (iOS Card)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 4: ATMÓSFERA DE FONDO & PANTALLA COMPLETA                */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {calibTab === 'atmosphere' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                {/* 1. Selector de Fondos Ambientales (SIN EMOJIS) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/70 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Ambiente de Pantalla Completa:
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-bold">
                      {ATMOSPHERE_OPTIONS.find((a) => a.id === (blobSettings.backgroundAtmosphere || 'none'))?.tag || 'LIMPIO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'none', label: 'Limpio', desc: 'Negro abisal puro' },
                      { id: 'sunset', label: 'Atardecer', desc: 'Silueta acantilado' },
                      { id: 'rain', label: 'Lluvia Neón', desc: 'Trazos verticales' },
                      { id: 'sand', label: 'Mareas Sub', desc: 'Partículas fluidas' },
                      { id: 'stars', label: 'Estrellas 3D', desc: 'Campo estelar' },
                      { id: 'radial_burst', label: 'Estallido', desc: 'Partículas del núcleo' },
                      { id: 'stardust_drift', label: 'Polvo Cósmico', desc: 'Bruma estelar' },
                      { id: 'light_beams', label: 'Haces Luz', desc: 'Rayos radiantes zen' },
                      { id: 'quantum_waves', label: 'Ondas', desc: 'Anillos concéntricos' },
                    ].map((atm) => {
                      const isActive = (blobSettings.backgroundAtmosphere || 'none') === atm.id;
                      return (
                        <button
                          key={atm.id}
                          type="button"
                          onClick={() => updateBlobSettings({ backgroundAtmosphere: atm.id as BackgroundAtmosphere })}
                          className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                            isActive
                              ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.05]'
                          }`}
                          title={atm.desc}
                        >
                          <span className="text-[9px] font-mono font-bold leading-tight">{atm.label}</span>
                          <span className="text-[7px] text-white/30 truncate max-w-full">{atm.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mezcla Secundaria de Atmósfera (Blend) */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-300 font-semibold flex items-center gap-1.5">
                      Mezcla con Segundo Efecto:
                    </span>
                    <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase font-bold">
                      {blobSettings.atmosphereBlend || 'none'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {[
                      { id: 'none', label: 'Sin Mezcla' },
                      { id: 'radial_burst', label: 'Estallido' },
                      { id: 'stars', label: 'Estrellas' },
                      { id: 'stardust_drift', label: 'Polvo' },
                      { id: 'light_beams', label: 'Haces Luz' },
                      { id: 'quantum_waves', label: 'Ondas' },
                      { id: 'sunset', label: 'Atardecer' },
                      { id: 'rain', label: 'Lluvia' },
                      { id: 'sand', label: 'Arena' },
                    ].map((blend) => {
                      const isSel = (blobSettings.atmosphereBlend || 'none') === blend.id;
                      return (
                        <button
                          key={blend.id}
                          type="button"
                          onClick={() => updateBlobSettings({ atmosphereBlend: blend.id as BackgroundAtmosphere | 'none' })}
                          className={`py-1.5 px-1 rounded-xl text-[9px] font-mono transition-all text-center border cursor-pointer active:scale-95 ${
                            isSel
                              ? 'bg-purple-500/25 text-purple-200 border-purple-400 font-bold shadow-sm'
                              : 'bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
                          }`}
                        >
                          {blend.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Sliders de Velocidad e Intensidad de la Atmósfera */}
                {blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none' && (
                  <div className="p-3 bg-amber-500/[0.04] rounded-xl border border-amber-500/20 space-y-2.5">
                    <span className="text-[10px] font-mono text-amber-300 font-semibold block">Dinámica del Entorno:</span>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-white/60">Velocidad de Movimiento:</span>
                        <span className="text-amber-300 tabular-nums">{(blobSettings.atmosphereSpeed ?? 1.0).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="2.5"
                        step="0.05"
                        value={blobSettings.atmosphereSpeed ?? 1.0}
                        onChange={(e) => updateBlobSettings({ atmosphereSpeed: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-white/60">Brillo & Resplandor (Glow):</span>
                        <span className="text-amber-300 tabular-nums">{(blobSettings.atmosphereGlow ?? 1.0).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.05"
                        value={blobSettings.atmosphereGlow ?? 1.0}
                        onChange={(e) => updateBlobSettings({ atmosphereGlow: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Opacidad & Desenfoque de Fondo y Atmósfera */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2.5">
                  <span className="text-[10px] font-mono text-amber-300 font-semibold block">
                    Opacidad & Difusión de Fondo:
                  </span>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-white/60">Opacidad de Fondo:</span>
                      <span className="text-amber-300 font-bold tabular-nums">
                        {Math.round((blobSettings.backgroundOpacity !== undefined ? blobSettings.backgroundOpacity : 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.05"
                      value={blobSettings.backgroundOpacity !== undefined ? blobSettings.backgroundOpacity : 0.85}
                      onChange={(e) => updateBlobSettings({ backgroundOpacity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-white/60">Desenfoque de Fondo (Blur):</span>
                      <span className="text-amber-300 font-bold tabular-nums">
                        {blobSettings.backgroundBlur ?? 0} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={blobSettings.backgroundBlur ?? 0}
                      onChange={(e) => updateBlobSettings({ backgroundBlur: parseInt(e.target.value, 10) })}
                      className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-white/35">
                      <span>0px (Nítido)</span>
                      <span>15px (Medio)</span>
                      <span>30px (Seda)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 5: EFECTOS PRO (VISIONOS LIQUID GLASS LAYERS)           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {calibTab === 'pro' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">
                {/* Header informativo visionOS y contador de cuota */}
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/90 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      Capas Pro Activas:
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold tabular-nums ${
                        proActiveCount >= maxProEffects
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-sm'
                          : proActiveCount > 0
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                          : 'bg-white/[0.04] text-white/40 border-white/[0.08]'
                      }`}
                    >
                      {proActiveCount} / {maxProEffects} ACTIVOS
                    </span>
                  </div>
                  <p className="text-[8px] text-white/40 font-mono leading-tight">
                    Máximo 4 capas simultáneas. Desactivación automática por rendimiento si el framerate cae de 45 FPS.
                  </p>
                </div>

                {/* Lista de los 10 Efectos Pro */}
                <div className="space-y-2">
                  {proEffectsList.map((eff) => {
                    const isEnabled = Boolean(blobSettings[eff.enabledKey]);
                    const intensity = (blobSettings[eff.intensityKey] as number) ?? 1.0;

                    return (
                      <div
                        key={eff.id}
                        className={`p-3 rounded-xl border transition-all space-y-2 ${
                          isEnabled
                            ? 'bg-white/[0.05] border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,254,0.06)]'
                            : 'bg-white/[0.02] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-mono text-white/90 font-semibold block truncate">
                              {eff.name}
                            </span>
                            <span className="text-[8px] text-white/40 block leading-tight">
                              {eff.desc}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleEffect(eff.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all border shrink-0 cursor-pointer active:scale-95 ${
                              isEnabled
                                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-sm'
                                : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/70 hover:bg-white/[0.08]'
                            }`}
                          >
                            {isEnabled ? 'ACTIVADO' : 'DESACTIVADO'}
                          </button>
                        </div>

                        {isEnabled && (
                          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-white/60">Intensidad:</span>
                              <span className="text-cyan-300 font-bold tabular-nums">
                                {intensity.toFixed(2)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="2.0"
                              step="0.05"
                              value={intensity}
                              onChange={(e) => setEffectIntensity(eff.id, parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Flotante iOS: Editor de Recorte Circular y Filtros de Logo */}
      <LogoCropFilterModal
        isOpen={isCropModalOpen}
        onClose={() => {
          setIsCropModalOpen(false);
          if (openedFromSettings) {
            setBlobPanelOpen(true);
            setOpenedFromSettings(false);
          }
        }}
        imageSrc={tempImageForCrop || blobSettings.customLogoUrl || currentTrack?.coverUrl || null}
      />
    </div>
  );
};

export default RainbowBlobVisualizer;
