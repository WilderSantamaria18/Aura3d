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
import { LogoDisc } from '../UI/LogoDisc';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { useTrackLogoStore } from '../../stores/trackLogoStore';
import { clampDelta, decayForDt, frameScale, rateForDt } from '../../utils/frameTiming';
import { AuraRenderer } from './aura/auraRenderer';
import { buildAuraPalette, DEFAULT_AURA_PARAMS, type AuraSignals } from './aura/auraLayout';
import {
  KICK_MAX_PEAK,
  applyKickImpulse,
  createKickSpring,
  kickPeakForStrength,
  stepKickSpring,
} from '../../utils/kickSpring';
import { DEFAULT_VOID_EFFECT, isVoidEffectId, migrateVoidEffectId, resolveVoidFx } from '../../config/visualPresets';
import { RainbowCalibrationBody } from './calibration/RainbowCalibrationBody';
import { VoidFxCustomizer } from '../UI/VoidFxCustomizer';
import { drawVoidEffect, createVoidFxState, type VoidFxState } from './voidEffects';
import { QUALITY_PROFILES, canvasDprFor } from '../../utils/qualityProfile';
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
import { useShallow } from 'zustand/react/shallow';

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

const followAudioBand = (
  current: number,
  target: number,
  attack: number,
  release: number,
  dt: number
): number => current + (target - current) * rateForDt(target > current ? attack : release, dt);

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
  } = usePlayerStore(
    useShallow((s) => ({
      blobSettings: s.blobSettings,
      updateBlobSettings: s.updateBlobSettings,
      isBlobPanelOpen: s.isBlobPanelOpen,
      setBlobPanelOpen: s.setBlobPanelOpen,
      blobShape: s.blobShape,
      setBlobShape: s.setBlobShape,
      blobWaveMode: s.blobWaveMode,
      blobWaveIntensity: s.blobWaveIntensity,
      blobBassBoomThreshold: s.blobBassBoomThreshold,
      setBlobBassBoomThreshold: s.setBlobBassBoomThreshold,
      blobBassBoomIntensity: s.blobBassBoomIntensity,
      setBlobBassBoomIntensity: s.setBlobBassBoomIntensity,
      blobScale: s.blobScale,
      musicSensitivity: s.musicSensitivity,
      currentTrack: s.currentTrack,
      isMicActive: s.isMicActive,
      isPlaying: s.isPlaying,
      autoMode: s.autoMode,
      dynamicColor: s.dynamicColor,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      lucidPrimaryColor: s.lucidPrimaryColor,
      isUiIdle: s.isUiIdle,
    }))
  );

  // Smoothing 0.2 synchronized with audio engine
  // timeBased: suavizado, auto-gain y detector de bombo en función del tiempo real (no del nº de frames)
  const { getSmoothedData } = useVisualizer(0.2, { timeBased: true });

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [openedFromSettings, setOpenedFromSettings] = useState(false);
  // Logo de la canción actual: carátula propia de la canción + estilo guardado (no una sola imagen global)
  const activeLogo = useActiveLogo();
  const clearTrackLogo = useTrackLogoStore((s) => s.clearOverride);
  const [savedPresetSuccess, setSavedPresetSuccess] = useState(false);
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

  // Calidad efectiva (elección del usuario limitada por la calidad automática por FPS)
  const effectiveTier = usePlayerStore((s) => s.effectiveTier);
  const qualityRef = useRef(QUALITY_PROFILES[effectiveTier]);
  qualityRef.current = QUALITY_PROFILES[effectiveTier];

  const { recordFrame } = useFPSMonitor({
    thresholdFps: 45,
    lowFpsDurationMs: 2000,
    onPerformanceDrop: () => {
      // Primero lo barato de perder: menos resolución del aura (conserva la respuesta al kick)
      auraStateRef.current.res = Math.max(96, Math.round(auraStateRef.current.res * 0.75));
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
      auraStateRef.current.res = 160;
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
    if (!isVoidEffectId(blobShape)) setBlobShape(migrateVoidEffectId(blobShape));
  }, [blobShape, setBlobShape]);

  // Audio smoothing refs
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);

  // Peak hold array for 64-band spectrum
  const peakHoldCaps = useRef<number[]>(new Array(64).fill(0));

  // Kick Spring Physics & Parametric Morphing
  const kickSpringRef = useRef(createKickSpring());

  // Aura cromática: canvas de baja resolución detrás del disco + estado compartido de sus capas
  const auraCanvasRef = useRef<HTMLCanvasElement>(null);
  const auraRendererRef = useRef<AuraRenderer | null>(null);
  // body/bloom siguen al kick con distinto desfase; res es la resolución actual del buffer (baja si hay poco rendimiento)
  const auraStateRef = useRef({ body: 0, bloom: 0, res: 256, paletteKey: '', palette: [] as string[] });
  const auraBodySignals = useRef<AuraSignals>({ time: 0, kick: 0, kickEnv: 0, bass: 0, mids: 0, treble: 0, energy: 0, chroma: [] });
  const auraBloomSignals = useRef<AuraSignals>({ time: 0, kick: 0, kickEnv: 0, bass: 0, mids: 0, treble: 0, energy: 0, chroma: [] });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    auraRendererRef.current = new AuraRenderer();
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    reducedMotionRef.current = !!mq?.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq?.addEventListener?.('change', onChange);
    return () => {
      mq?.removeEventListener?.('change', onChange);
      auraRendererRef.current?.dispose();
      auraRendererRef.current = null;
    };
  }, []);
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
        const dpr = canvasDprFor(qualityRef.current, window.devicePixelRatio);
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
    // effectiveTier: al cambiar la calidad automática el canvas se redimensiona con el nuevo DPR
  }, [effectiveTier]);

  const isSunset = blobSettings.backgroundAtmosphere === 'sunset';

  // Main 60 FPS animation render loop using performance.now() clock
  useEffect(() => {
    let animId: number;
    let phase = 0;
    let angle = 0;
    let lastFrame = performance.now();

    const render = () => {
      const bs = blobSettingsRef.current;
      const now = performance.now();
      const timeSec = now * 0.001;
      // Intervalo real acotado: una pestaña reanudada o un tirón no teletransporta la animación
      const dt = clampDelta((now - lastFrame) / 1000);
      lastFrame = now;
      const frames = frameScale(dt);
      const u = scaleURef.current;

      // Calibración adaptativa del bombo: respuesta inmediata y musical
      const kickCalibSens = 1.0 + (bs.kickThreshold ?? 0.32) * 2.8;
      const { bass, mids, highs, energy, raw, chroma, kick, kickStrength } = getSmoothedData(kickCalibSens);
      const audioSens = musicSensitivity ?? 1.0;
      const isAudioActive = energy > 0.005 || isPlaying || isMicActive;

      // Exponential moving average filter con ganancia de sensibilidad
      const effectiveBass = bass * audioSens;
      const effectiveMids = mids * audioSens;
      const effectiveHighs = highs * audioSens;
      const effectiveEnergy = energy * audioSens;

      // Seguimiento ágil y orgánico: respuesta rápida a transitorios sin retardo
      smoothedBassRef.current = followAudioBand(smoothedBassRef.current, effectiveBass, 0.90, 0.22, dt);
      smoothedMidsRef.current = followAudioBand(smoothedMidsRef.current, effectiveMids, 0.82, 0.20, dt);
      smoothedTrebleRef.current = followAudioBand(smoothedTrebleRef.current, effectiveHighs, 0.92, 0.28, dt);
      smoothedEnergyRef.current = followAudioBand(smoothedEnergyRef.current, effectiveEnergy, 0.85, 0.18, dt);

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sTreble = smoothedTrebleRef.current;
      const sEnergy = smoothedEnergyRef.current;

      const rotSpeed = bs.rotationSpeed ?? 1.0;
      const rotDir = bs.rotationDirection === 'counter_clockwise' ? -1 : 1;
      // Incrementos calibrados por frame a 60 FPS; multiplicar por `frames` los hace por segundo
      if (isAudioActive) {
        // Cada banda mueve una dimensión distinta: los graves deforman el contorno,
        // los medios gobiernan el giro y los agudos añaden microvariación rápida.
        phase += (0.016 + sBass * 0.035 + sTreble * 0.045) * rotSpeed * frames;
        angle += (0.16 + sMids * 0.72 + sTreble * 0.2) * rotSpeed * rotDir * frames;
      } else {
        phase += 0.015 * rotSpeed * frames;
        angle += 0.1 * rotSpeed * rotDir * frames;
      }

      // Morphing for Cat-Ears / Sacred Geometry
      const targetN = bs.catEarsCount ?? 2;
      morphNRef.current += (targetN - morphNRef.current) * rateForDt(0.12, dt);

      // ── Kick Transient & iOS Spring Damping Integration ──
      const kPower = bs.kickPower ?? 1.6;

      // El bombo lo detecta el hook (flujo positivo de graves en amplitud lineal)
      const isKickTriggered = isAudioActive && kick;
      const boomStrength = isKickTriggered ? kickStrength : 0;
      if (isKickTriggered) {
        // El pico de expansión sale de la fuerza real del golpe (curva 1.4: suave ≠ fuerte),
        // escalado por «Intensidad» y «Potencia». 1.6 es la potencia neutra histórica.
        applyKickImpulse(
          kickSpringRef.current,
          kickPeakForStrength(boomStrength, bs.kickIntensity ?? 1.0, kPower / 1.6)
        );
        kickEnvRef.current = Math.max(kickEnvRef.current, boomStrength);
      }
      kickEnvRef.current *= decayForDt(0.9, dt);

      // Medidores de calibración (solo existen con el panel abierto)
      const mt = meterRefs.current;
      if (mt.bass) mt.bass.style.transform = `scaleX(${Math.min(1, sBass)})`;
      if (mt.mids) mt.mids.style.transform = `scaleX(${Math.min(1, sMids)})`;
      if (mt.treble) mt.treble.style.transform = `scaleX(${Math.min(1, sTreble)})`;
      if (mt.kick) mt.kick.style.opacity = String(Math.min(1, kickEnvRef.current * 1.4));

      // Resorte elástico con solución analítica: la misma curva a 30, 60 o 144 FPS
      stepKickSpring(kickSpringRef.current, dt);

      // Fracción de escala extra del núcleo (0.09 = +9 % con el golpe más fuerte a intensidad 1)
      const kickSpringRebound = kickSpringRef.current.displacement;

      // Smooth audio-reactive scale calibration
      const isEarLikeShape = isVoidEffectId(blobShape);
      const isTransparentHalo = bs.transparentHalo !== false;
      const kickIntensity = bs.kickIntensity ?? 1.0;
      const nivel = isAudioActive ? sBass : 0;
      const boostVal = bs.bassBoost ?? 2.8;
      const idleBreathing = isAudioActive ? 0 : Math.sin(timeSec * 1.5) * 0.03;
      const sens = (bs.scaleSensitivity ?? 1.40) * audioSens;
      const baseScale = 0.75 + idleBreathing;

      // El pulso continuo y el resorte del kick entregan una respuesta dinámica completa
      const bassContribution = isEarLikeShape
        ? (sBass * 0.085 * kickIntensity + sMids * 0.025 + sTreble * 0.015 + kickSpringRebound)
        : (sBass * (0.09 + boostVal * 0.025) + kickSpringRebound);

      const totalScale = (baseScale + bassContribution) * sens;
      const clampedScale = Math.min(1.95, Math.max(0.40, totalScale));
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
          // Halo reactivo con presencia luminosa nítida que acompaña el bajo y el kick
          haloRef.current.style.opacity = isAudioActive ? `${0.12 + sBass * 0.28}` : '0.04';
          haloRef.current.style.boxShadow = isAudioActive
            ? `0 0 ${Math.round(24 + sBass * 32)}px rgba(0, 242, 254, ${0.15 + sBass * 0.25}), 0 0 ${Math.round(40 + sBass * 45)}px rgba(255, 8, 138, ${0.12 + sBass * 0.20})`
            : 'none';
          haloRef.current.style.backdropFilter = isAudioActive ? 'blur(12px) saturate(140%)' : 'none';
        } else {
          haloRef.current.style.opacity = '1.0';
          haloRef.current.style.backdropFilter = 'blur(18px) saturate(160%)';
        }
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.borderRadius = borderRadius;
        haloGlowRef.current.style.transform = `scale(${escala * 1.15}) rotate(${-angle * 0.5}deg)`;
        if (isTransparentHalo || isEarLikeShape) {
          // Resplandor vivo y expansivo sin opacar el contenido central
          haloGlowRef.current.style.opacity = `${isAudioActive ? 0.20 + sBass * 0.38 : 0.08}`;
          haloGlowRef.current.style.filter = `blur(${isAudioActive ? (16 + sBass * 22) * u : 14 * u}px)`;
        } else {
          haloGlowRef.current.style.opacity = `${isAudioActive ? 0.4 + nivel * 0.4 : 0.25}`;
          haloGlowRef.current.style.filter = `blur(${isAudioActive ? (20 + nivel * 24) * u : 18 * u}px)`;
        }
      }

      if (auroraRef.current) {
        if (isSunset) {
          auroraRef.current.style.opacity = '0';
        } else if (isEarLikeShape && isTransparentHalo) {
          auroraRef.current.style.transform = `rotate(${timeSec * 8}deg) scale(${1 + sBass * 0.12})`;
          auroraRef.current.style.opacity = isAudioActive ? `${0.15 + sEnergy * 0.35}` : '0.05';
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
          const dpr = canvasDprFor(qualityRef.current, window.devicePixelRatio);
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

          // ── Aura cromática (detrás del disco) ──────────────────────────────
          {
            const auraCanvas = auraCanvasRef.current;
            const auraRenderer = auraRendererRef.current;
            const auraOn = !!auraCanvas && !!auraRenderer && bs.auraEnabled !== false && !isSunset;
            if (auraCanvas) auraCanvas.style.display = auraOn ? 'block' : 'none';
            if (auraOn && auraCanvas && auraRenderer) {
              const st = auraStateRef.current;
              if (auraCanvas.width !== st.res) {
                auraCanvas.width = st.res;
                auraCanvas.height = st.res;
              }
              const actx = auraCanvas.getContext('2d');
              if (actx) {
                // Señal compartida del kick: el mismo resorte que mueve el núcleo (1 ≈ golpe más fuerte)
                const kickNorm = kickSpringRef.current.displacement / KICK_MAX_PEAK;
                // Cada capa sigue al núcleo con su desfase: cuerpo ~40 ms, bloom ~90 ms
                st.body += (kickNorm - st.body) * rateForDt(0.33, dt);
                st.bloom += (kickNorm - st.bloom) * rateForDt(0.17, dt);

                const reduced = reducedMotionRef.current;
                const params = {
                  intensity: bs.auraIntensity ?? DEFAULT_AURA_PARAMS.intensity,
                  reach: bs.auraReach ?? DEFAULT_AURA_PARAMS.reach,
                  softness: bs.auraSoftness ?? DEFAULT_AURA_PARAMS.softness,
                  kickResponse: (bs.auraKickResponse ?? DEFAULT_AURA_PARAMS.kickResponse) * (reduced ? 0.4 : 1),
                  motion: (bs.auraMotion ?? DEFAULT_AURA_PARAMS.motion) * (reduced ? 0.25 : 1),
                };

                const rainbow = (bs.sacredPalette ?? 'neon') === 'neon' && bs.isRainbowMode !== false;
                const key = `${rainbow}|${primaryColor}|${secondaryColor}`;
                if (st.paletteKey !== key) {
                  st.paletteKey = key;
                  st.palette = buildAuraPalette(rainbow, primaryColor, secondaryColor);
                }

                const body = auraBodySignals.current;
                const bloom = auraBloomSignals.current;
                body.time = bloom.time = timeSec;
                body.kick = st.body;
                bloom.kick = st.bloom;
                body.kickEnv = bloom.kickEnv = kickEnvRef.current;
                body.bass = bloom.bass = sBass;
                body.mids = bloom.mids = sMids;
                body.treble = bloom.treble = sTreble;
                body.energy = bloom.energy = sEnergy;
                body.chroma = bloom.chroma = chroma;

                const discRadiusBuf = (baseCircleRadius / (displaySize / 2)) * (st.res / 2);
                auraRenderer.draw(actx, st.res, discRadiusBuf, st.palette, body, bloom, params);
              }
            }
          }

          // Efecto activo y sus parámetros (se resuelven una sola vez por frame y los usan el disparo y el dibujo)
          const activeEffect = isVoidEffectId(blobShape) ? blobShape : DEFAULT_VOID_EFFECT;
          const resolvedVoidFx = resolveVoidFx(bs.voidFx, activeEffect);
          // Los halos (shadowBlur) son lo más caro del canvas 2D: el nivel de calidad los escala o los apaga
          const glowK = qualityRef.current.glow;
          const voidFxParams =
            glowK === 1 ? resolvedVoidFx : { ...resolvedVoidFx, glow: resolvedVoidFx.glow * glowK };

          // Disparo de eventos en Kick
          if (isKickTriggered) {
            // Un solo dueño de la onda evita dibujar dos colas para el mismo golpe.
            const boomOwnsWave = voidFxParams.boom;
            if (bs.shockwaveEnabled && !boomOwnsWave) {
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
              dt,
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
              (bs.pulseGridIntensity ?? 1.0) * hwMult,
              secondaryColor
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
              (bs.auroraRibbonsIntensity ?? 1.0) * hwMult,
              primaryColor,
              secondaryColor
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
            currentFrameTips = drawVoidEffect(
              activeEffect,
              {
                ctx,
                cx,
                cy,
                r: baseCircleRadius,
                u,
                t: timeSec,
                // El hook ya aplica ataque/caída. Usar aquí la señal previa al segundo EMA evita
                // retrasar INNER y las formas; el resto del visual conserva el suavizado adicional.
                bass: Math.min(1, Math.max(0, effectiveBass)),
                mids: Math.min(1, Math.max(0, effectiveMids)),
                treble: Math.min(1, Math.max(0, effectiveHighs)),
                energy: Math.min(1, Math.max(0, effectiveEnergy)),
                kickStrength: kickEnvRef.current,
                boom: boomStrength,
                active: isAudioActive,
                chroma,
                raw,
                fx: voidFxParams,
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
              (bs.constellationIntensity ?? 1.0) * hwMult,
              secondaryColor
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
              (bs.mercuryTrailsIntensity ?? 1.0) * hwMult,
              timeSec
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
              (bs.holographicScanlinesIntensity ?? 1.0) * hwMult,
              primaryColor
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
    updateBlobSettings({ customLogoUrl: null, logoAppearance: null });
    if (activeLogo.key) clearTrackLogo(activeLogo.key);
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

    const activeImage = activeLogo.src;
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
              setTempImageForCrop(null);
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
            <LogoDisc src={activeImage} size={discSize} appearance={activeLogo.appearance} />
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
          setTempImageForCrop(null);
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
        {/* Aura cromática: buffer de baja resolución ampliado por el navegador (bilineal = difusión suave) */}
        <canvas
          ref={auraCanvasRef}
          aria-hidden="true"
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 z-0"
          style={{ width: `${Math.round(700 * scaleU)}px`, height: `${Math.round(700 * scaleU)}px` }}
        />

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
        className={`fixed top-[11.25rem] sm:top-24 right-3 sm:right-5 z-40 flex items-center gap-1.5 pointer-events-auto select-none transition-all duration-700 ${
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

          <RainbowCalibrationBody
            registerMeter={(key, el) => {
              meterRefs.current[key] = el;
            }}
            isSunset={isSunset}
            logoPresets={LOGO_PRESETS}
            activeLogo={activeLogo}
            onUploadLogo={handleCustomLogoUpload}
            onRemoveLogo={handleRemoveCustomLogo}
            onEditLogo={() => {
              setTempImageForCrop(null);
              setOpenedFromSettings(true);
              setBlobPanelOpen(false);
              setIsCropModalOpen(true);
            }}
            proToast={proEffectToast}
            proEffects={proEffectsList}
            proActiveCount={proActiveCount}
            proMax={maxProEffects}
            onToggleEffect={toggleEffect}
            onEffectIntensity={setEffectIntensity}
          />
        </div>
      )}

      {/* Card Flotante iOS: Editor de Recorte Circular y Filtros de Logo */}
      <LogoCropFilterModal
        isOpen={isCropModalOpen}
        onClose={() => {
          setIsCropModalOpen(false);
          setTempImageForCrop(null);
          if (openedFromSettings) {
            setBlobPanelOpen(true);
            setOpenedFromSettings(false);
          }
        }}
        pendingImage={tempImageForCrop}
      />
    </div>
  );
};

export default RainbowBlobVisualizer;
