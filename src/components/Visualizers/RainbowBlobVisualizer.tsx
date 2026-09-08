import React, { useRef, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { LogoCropFilterModal } from '../UI/LogoCropFilterModal';

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

// Kick Shockwave Detector & Timing Constants (Synchronized with 3D Sphere)
const KICK_THRESHOLD = 0.18;
const KICK_ATTACK_DELTA = 0.06;
const KICK_COOLDOWN_MS = 160; // 160ms (~375 BPM max)
const WAVE_LIFETIME_MS = 850; // 850ms duration
const MAX_ACTIVE_SHOCKWAVES = 3;

interface ActiveShockwave {
  startTime: number;
  maxDistance: number;
  opacity: number;
  hue: number;
}

const clamp = (val: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, val));

const computeScaleFactor = (): number => {
  if (typeof window === 'undefined') return 1.0;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return clamp(minDim / 700, 0.45, 1.0);
};

export const RainbowBlobVisualizer: React.FC = () => {
  const {
    blobSettings,
    updateBlobSettings,
    resetBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
    toggleVisualizerSettings,
    blobShape,
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
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
  } = usePlayerStore();

  // Smoothing 0.2 synchronized with 3D Sphere Visualizer
  const { getSmoothedData } = useVisualizer(0.2);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);

  // Unitary scale factor u: clamp(min(innerWidth, innerHeight) / 700, 0.45, 1.0)
  const [scaleU, setScaleU] = useState<number>(computeScaleFactor);
  const scaleURef = useRef<number>(computeScaleFactor());

  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const fondoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Swarm particles for 'cloud' shape
  const cloudParticles = useMemo(() => {
    return Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 130 + Math.random() * 120,
      speed: (Math.random() - 0.5) * 0.03,
      size: 2 + Math.random() * 3.5,
      hue: Math.random() * 360,
    }));
  }, []);

  // Shockwave rings & kick synchronization refs
  const shockwaves = useRef<ActiveShockwave[]>([]);
  const prevBass = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);
  const lastKickTimeRef = useRef(0);
  const boomImpulse = useRef(0);
  const boomFlash = useRef(0);

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

  // Main animation render loop using performance.now() clock
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

      // Exponential moving average filter matching SphereVisualizer
      const effectiveBass = bass * audioSens;
      const effectiveMids = mids * audioSens;
      const effectiveEnergy = energy * audioSens;

      smoothedBassRef.current += (effectiveBass - smoothedBassRef.current) * 0.28;
      smoothedMidsRef.current += (effectiveMids - smoothedMidsRef.current) * 0.28;
      smoothedEnergyRef.current += (effectiveEnergy - smoothedEnergyRef.current) * 0.28;

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sEnergy = smoothedEnergyRef.current;

      // Single synchronized kick detector matching 3D Sphere using isolated blob thresholds
      const attackEnv = Math.max(0, sBass - prevBass.current);
      const intensity = blobBassBoomIntensity ?? 1.0;
      const kickThresh = KICK_THRESHOLD * (blobBassBoomThreshold ? blobBassBoomThreshold / 0.45 : 1.0);

      if (
        sBass > kickThresh &&
        attackEnv > KICK_ATTACK_DELTA &&
        now - lastKickTimeRef.current > KICK_COOLDOWN_MS
      ) {
        lastKickTimeRef.current = now;

        // Kick impulse for smooth subwoofer scale pump & flash
        const impulseKick = Math.pow(sBass, 1.2) * 1.5 * intensity;
        boomImpulse.current = Math.min(2.0, boomImpulse.current + impulseKick);
        boomFlash.current = Math.min(1.0, 0.8 * intensity);

        // Spawn synchronized shockwave ring (capped at MAX_ACTIVE_SHOCKWAVES)
        if (shockwaves.current.length >= MAX_ACTIVE_SHOCKWAVES) {
          shockwaves.current.shift();
        }

        shockwaves.current.push({
          startTime: now,
          maxDistance: 380 * (blobWaveIntensity || 1) * intensity,
          opacity: Math.min(0.85, 0.75 * intensity),
          hue: (timeSec * 50 + Math.random() * 40) % 360,
        });
      }
      prevBass.current = sBass;

      boomImpulse.current *= 0.84;
      boomFlash.current *= 0.78;
      const boomPunch = boomImpulse.current * intensity;

      if (isAudioActive) {
        phase += 0.03 + sBass * 0.1 + boomPunch * 0.15;
        angle += 0.25 + sMids * 1.2 + boomPunch * 0.8;
      } else {
        phase += 0.015;
        angle += 0.1;
      }

      const nivel = isAudioActive ? sBass : 0;
      const boostVal = blobSettings.bassBoost;
      const idleBreathing = isAudioActive ? 0 : Math.sin(timeSec * 1.5) * 0.03;
      const sens = (blobSettings.scaleSensitivity ?? 1.0) * audioSens;
      const baseScale = 0.75 + idleBreathing;
      const bassContribution = Math.pow(nivel, 1.2) * (0.5 + boostVal * 0.2);
      const boomContribution = Math.min(boomPunch * 0.4 * audioSens, 0.7);
      const totalScale = (baseScale + bassContribution + boomContribution) * sens;
      const clampedScale = Math.min(2.0, Math.max(0.45, totalScale));
      const escala = clampedScale * blobScale;

      // Minimalist organic contour (clean, zero unnecessary wobbles)
      let borderRadius: string;
      if (blobShape === 'sphere') {
        borderRadius = '50%';
      } else if (blobShape === 'icosahedron' || blobShape === 'octahedron') {
        borderRadius = '25% 75% 25% 75% / 75% 25% 75% 25%';
      } else {
        borderRadius = '50%';
      }

      if (circleRef.current) {
        circleRef.current.style.transform = `scale(${escala})`;
      }

      if (haloRef.current) {
        haloRef.current.style.borderRadius = borderRadius;
        haloRef.current.style.transform = `scale(${escala}) rotate(${angle}deg)`;
        haloRef.current.style.display = blobShape === 'sphere' ? 'block' : 'none';
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.borderRadius = borderRadius;
        haloGlowRef.current.style.transform = `scale(${escala * 1.15}) rotate(${-angle * 0.5}deg)`;
        haloGlowRef.current.style.opacity = `${isAudioActive ? 0.4 + nivel * 0.4 : 0.25}`;
        haloGlowRef.current.style.filter = `blur(${isAudioActive ? (20 + nivel * 24) * u : 18 * u}px)`;
      }

      if (auroraRef.current) {
        auroraRef.current.style.transform = `rotate(${timeSec * 8}deg) scale(${1 + sBass * 0.1})`;
        auroraRef.current.style.opacity = `${isAudioActive ? 0.3 + sBass * 0.35 : 0.2}`;
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

          // ── SHAPE 1: RINGS (5 concentric orbital rings) ───────────────────
          if (blobShape === 'rings') {
            for (let rIdx = 0; rIdx < 5; rIdx++) {
              const ringR = baseCircleRadius + (rIdx + 1) * 26 * u * (1 + sBass * 0.35);
              const ringHue = isLucid ? rIdx * 45 : (rIdx * 55 + timeSec * 35) % 360;
              const ringAlpha = 0.45 + Math.sin(timeSec * 3 + rIdx) * 0.18 + sBass * 0.25;

              ctx.beginPath();
              ctx.arc(cx, cy, Math.max(10 * u, ringR), 0, Math.PI * 2);
              ctx.strokeStyle = isLucid
                ? lucidTheme.primary
                : autoMode
                ? dynamicColor
                : `hsla(${ringHue}, 85%, 62%, ${ringAlpha})`;
              ctx.lineWidth = Math.max(1.5, (2.2 + (rIdx === 2 ? sBass * 3.0 : 0.8)) * u);
              ctx.shadowColor = isLucid
                ? lucidTheme.glow
                : autoMode
                ? dynamicColor
                : `hsla(${ringHue}, 85%, 50%, 0.6)`;
              ctx.shadowBlur = 12 * u;
              ctx.stroke();

              // Orbital satellite dot
              const satAngle = timeSec * (0.8 + rIdx * 0.3) + rIdx;
              const sx = cx + Math.cos(satAngle) * ringR;
              const sy = cy + Math.sin(satAngle) * ringR;
              ctx.beginPath();
              ctx.arc(sx, sy, Math.max(2, (3.0 + sBass * 1.8) * u), 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          }

          // ── SHAPE 2: SPIKES (Radial Sunburst Equalizer) ───────────────────
          if (blobShape === 'spikes') {
            const barCount = 48;
            for (let i = 0; i < barCount; i++) {
              const barAngle = (i / barCount) * Math.PI * 2 + angle * 0.02;
              const rawVal = raw[i % raw.length] || 0;
              const barLen = (12 + (rawVal / 255) * 75 * (1 + sBass * 0.5)) * u;
              const barHue = (i * (360 / barCount) + timeSec * 25) % 360;

              const x1 = cx + Math.cos(barAngle) * (baseCircleRadius + 2 * u);
              const y1 = cy + Math.sin(barAngle) * (baseCircleRadius + 2 * u);
              const x2 = cx + Math.cos(barAngle) * (baseCircleRadius + 2 * u + barLen);
              const y2 = cy + Math.sin(barAngle) * (baseCircleRadius + 2 * u + barLen);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = isLucid
                ? lucidTheme.primary
                : autoMode
                ? dynamicColor
                : `hsla(${barHue}, 85%, 60%, 0.85)`;
              ctx.lineWidth = Math.max(1.5, 2.6 * u);
              ctx.lineCap = 'round';
              ctx.shadowColor = isLucid
                ? lucidTheme.glow
                : autoMode
                ? dynamicColor
                : `hsla(${barHue}, 85%, 50%, 0.6)`;
              ctx.shadowBlur = 8 * u;
              ctx.stroke();
            }
          }

          // ── SHAPE 3: CLOUD (Particle Swarm) ───────────────────────────────
          if (blobShape === 'cloud') {
            cloudParticles.forEach((p) => {
              p.angle += p.speed * (1 + sMids * 2);
              const currentDist = p.dist * u * (1 - sBass * 0.12) * blobScale;
              const px = cx + Math.cos(p.angle) * currentDist;
              const py = cy + Math.sin(p.angle) * currentDist;

              ctx.beginPath();
              ctx.arc(px, py, Math.max(1.5, p.size * u * (1 + sEnergy * 1.2)), 0, Math.PI * 2);
              ctx.fillStyle = isLucid
                ? lucidTheme.primary
                : autoMode
                ? dynamicColor
                : `hsla(${p.hue + timeSec * 15}, 80%, 65%, ${0.5 + sBass * 0.35})`;
              ctx.shadowColor = isLucid
                ? lucidTheme.glow
                : autoMode
                ? dynamicColor
                : `hsla(${p.hue}, 80%, 50%, 0.6)`;
              ctx.shadowBlur = 6 * u;
              ctx.fill();
            });
          }

          // ── SHAPE 4: TORUS (Dual rotating elliptical bands) ───────────────
          if (blobShape === 'torus') {
            for (let t = 0; t < 2; t++) {
              const rotDir = t === 0 ? 1 : -1;
              const tAngle = timeSec * 1.1 * rotDir;
              const tRadiusX = (baseCircleRadius + 32 * u) * (1 + sBass * 0.18);
              const tRadiusY = (baseCircleRadius + 16 * u) * (1 + sMids * 0.22);

              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(tAngle);
              ctx.beginPath();
              ctx.ellipse(0, 0, tRadiusX, tRadiusY, 0, 0, Math.PI * 2);
              ctx.strokeStyle = isLucid
                ? t === 0
                  ? lucidTheme.primary
                  : lucidTheme.secondary
                : autoMode
                ? dynamicColor
                : t === 0
                ? 'rgba(0, 242, 254, 0.85)'
                : 'rgba(255, 8, 138, 0.85)';
              ctx.lineWidth = Math.max(2, (3.2 + sBass * 2.2) * u);
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 12 * u;
              ctx.stroke();
              ctx.restore();
            }
          }

          // ── SHAPE 5: WAVE (Sinusoidal Ribbon around Void) ─────────────────
          if (blobShape === 'wave') {
            const wavePoints = 120;
            ctx.beginPath();
            for (let i = 0; i <= wavePoints; i++) {
              const theta = (i / wavePoints) * Math.PI * 2;
              const ripple = Math.sin(theta * 8 + timeSec * 4) * (14 + sBass * 30) * u;
              const r = baseCircleRadius + 20 * u + ripple;
              const wx = cx + Math.cos(theta) * r;
              const wy = cy + Math.sin(theta) * r;
              if (i === 0) ctx.moveTo(wx, wy);
              else ctx.lineTo(wx, wy);
            }
            ctx.closePath();
            ctx.strokeStyle = isLucid ? lucidTheme.primary : autoMode ? dynamicColor : 'rgba(0, 255, 179, 0.85)';
            ctx.lineWidth = Math.max(2, (2.8 + sMids * 1.8) * u);
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12 * u;
            ctx.stroke();
          }

          // ── WAVE EFFECTS: Concentric Shockwaves & Spiral ──────────────────
          if (blobWaveMode === 'concentric' || shockwaves.current.length > 0) {
            shockwaves.current = shockwaves.current.filter((sw) => {
              const age = now - sw.startTime;
              if (age < 0 || age > WAVE_LIFETIME_MS) return false;

              const progress = Math.min(1.0, Math.max(0.0, age / WAVE_LIFETIME_MS));
              const currentRadius = baseCircleRadius + progress * sw.maxDistance * u;
              const decay = Math.pow(1.0 - progress, 1.4);
              const alpha = decay * sw.opacity;

              if (alpha > 0.01) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(1, currentRadius), 0, Math.PI * 2);
                ctx.strokeStyle = isLucid
                  ? `rgba(57, 255, 20, ${alpha})`
                  : autoMode
                  ? dynamicColor
                  : `hsla(${sw.hue}, 95%, 65%, ${alpha})`;
                ctx.lineWidth = Math.max(1, 1.8 * u);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = 10 * u;
                ctx.stroke();
                ctx.restore();
              }
              return true;
            });
          }

          if (blobWaveMode === 'spiral') {
            for (let arm = 0; arm < 2; arm++) {
              const armOffset = arm * Math.PI;
              ctx.beginPath();
              for (let step = 0; step < 60; step++) {
                const sAngle = armOffset + (step / 60) * Math.PI * 3 + timeSec * 1.8;
                const sDist = baseCircleRadius + step * 3.0 * u * blobWaveIntensity;
                const sx = cx + Math.cos(sAngle) * sDist;
                const sy = cy + Math.sin(sAngle) * sDist;
                if (step === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              }
              ctx.strokeStyle = isLucid
                ? lucidTheme.secondary
                : autoMode
                ? dynamicColor
                : `hsla(${(arm * 180 + timeSec * 30) % 360}, 85%, 65%, 0.8)`;
              ctx.lineWidth = Math.max(1.5, (2.2 + sBass * 1.8) * u);
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 10 * u;
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

  // Render active center logo (custom image, Spotify/local track cover, or SVG vector logo)
  const renderCenterLogo = () => {
    const activeImage = blobSettings.customLogoUrl || currentTrack?.coverUrl;

    if (activeImage) {
      const discSize = Math.max(64, Math.min(112, 100 * scaleU));
      return (
        <div className="relative flex items-center justify-center group cursor-pointer z-10">
          {/* Subtle ambient bloom behind logo */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity"
            style={{
              backgroundImage: `url(${activeImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(12px)',
              transform: 'scale(1.1)',
            }}
          />

          {/* Crisp center circular disc */}
          <div
            onClick={() => {
              setTempImageForCrop(activeImage);
              setIsCropModalOpen(true);
            }}
            style={{
              width: `${discSize}px`,
              height: `${discSize}px`,
            }}
            className="relative rounded-full overflow-hidden border border-white/30 shadow-[0_0_20px_rgba(0,242,254,0.4)] animate-[spin_24s_linear_infinite] group-hover:scale-105 transition-transform"
            title="Haz clic para recortar, aplicar filtros neón y efectos al logo/carátula"
          >
            <img
              src={activeImage}
              alt="Carátula / Logo"
              className="w-full h-full object-cover"
            />
            {/* Vinyl inner groove rings overlay */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute inset-2.5 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black border border-cyan-400 pointer-events-none shadow-[0_0_6px_#00f2fe]" />
          </div>
        </div>
      );
    }

    const activePreset = LOGO_PRESETS.find((p) => p.id === blobSettings.logoStyle) || LOGO_PRESETS[0];
    const IconComponent = activePreset.icon;
    const iconBoxSize = Math.max(54, Math.min(96, 84 * scaleU));

    return (
      <div
        style={{
          width: `${iconBoxSize}px`,
          height: `${iconBoxSize}px`,
          ...(isLucid ? { color: lucidTheme.primary, boxShadow: `0 0 20px ${lucidTheme.glow}` } : {}),
        }}
        className="rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)] transform hover:scale-105 transition-transform z-10"
      >
        <IconComponent
          className="w-7 h-7 sm:w-10 sm:h-10 drop-shadow-[0_0_10px_currentColor]"
          style={isLucid ? { color: lucidTheme.primary } : undefined}
        />
      </div>
    );
  };

  const haloDimension = blobSettings.haloSize * scaleU;
  const circleDimension = blobSettings.circleSize * scaleU;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#060813] select-none">
      {/* Fondo con Blur en Movimiento */}
      <div
        ref={fondoRef}
        className="fixed -top-12 -left-12 w-[125%] h-[125%] pointer-events-none transition-all duration-500"
        style={{
          background: isLucid
            ? lucidTheme.bgGradient
            : 'radial-gradient(circle at 30% 25%, #0c1228 0%, #080d1e 40%, #050814 75%, #020308 100%)',
          filter: `blur(${blobSettings.backgroundBlur}px)`,
          animation: 'moverFondo 16s infinite alternate ease-in-out',
          zIndex: 0,
        }}
      />

      {/* Contenedor Principal (editable en posición X / Y) */}
      <div
        ref={containerRef}
        className="absolute flex justify-center items-center pointer-events-auto transition-all duration-75 ease-out"
        style={{
          left: `${blobSettings.posX}%`,
          top: `${blobSettings.posY}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
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
              ? `0 0 45px ${lucidTheme.glow}`
              : '0 0 50px rgba(0, 242, 254, 0.22), 0 0 80px rgba(255, 8, 138, 0.15)',
            backdropFilter: 'blur(18px) saturate(160%)',
          }}
        />

        {/* El Círculo Interior (The Void) con Efecto Aurora */}
        <div
          ref={circleRef}
          className={`relative z-10 rounded-full flex flex-col justify-center items-center transition-all duration-75 ease-out p-4 overflow-hidden ${
            isLucid
              ? 'border'
              : 'border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.85),inset_0_0_25px_rgba(0,0,0,0.9)]'
          }`}
          style={{
            width: `${circleDimension}px`,
            height: `${circleDimension}px`,
            backgroundColor: isLucid ? (lucidTheme.glassColor || '#070a16') : blobSettings.circleColor,
            borderColor: isLucid ? lucidTheme.borderColor : 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          {/* Aurora Boreal animada sutil dentro del círculo */}
          <div
            ref={auroraRef}
            className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen transition-opacity duration-300"
            style={{
              background: isLucid
                ? `radial-gradient(circle at 35% 35%, ${lucidTheme.primary}45 0%, ${lucidTheme.secondary}25 45%, transparent 80%)`
                : 'radial-gradient(circle at 35% 35%, rgba(0, 242, 254, 0.35) 0%, rgba(138, 43, 226, 0.25) 45%, rgba(255, 8, 138, 0.20) 75%, transparent 95%)',
              filter: 'blur(18px)',
              opacity: 0.35,
            }}
          />

          {/* Logo Central Vectorial o Imagen Personalizada */}
          {renderCenterLogo()}

          {/* Información de pista sutil en el interior */}
          {circleDimension >= 140 && (
            <div className="mt-2 text-center max-w-[85%] pointer-events-none z-10">
              <p className="text-white/80 font-light tracking-[0.2em] text-[10px] sm:text-xs uppercase truncate">
                {isMicActive ? 'Micrófono en vivo' : currentTrack?.title || 'Auralis Void'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante para abrir panel de personalización / Configuración */}
      <div className="fixed top-28 sm:top-32 right-3 sm:right-6 z-40 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        <button
          onClick={toggleVisualizerSettings}
          className="px-3.5 py-1.5 rounded-full backdrop-blur-2xl border border-white/10 bg-[#0a0f1e]/80 text-white/80 hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          title="Configurar Formas, Ondas y Parámetros del Visualizador"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Configuración</span>
        </button>

        <button
          onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
          className={`px-3.5 py-1.5 rounded-full backdrop-blur-2xl border text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
            isBlobPanelOpen
              ? 'bg-pink-500/15 text-pink-300 border-pink-500/40 shadow-[0_0_15px_rgba(255,8,138,0.25)]'
              : 'bg-[#0a0f1e]/80 text-white/80 border-white/10 hover:text-pink-300 hover:border-pink-500/30 hover:bg-white/5'
          }`}
          title="Personalizar colores y logos"
        >
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>Estilo Halo</span>
        </button>
      </div>

      {/* Panel de Control Editable */}
      {isBlobPanelOpen && (
        <div
          className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 animate-in slide-in-from-bottom-2 duration-200 ${
            isLucid ? 'lucid-panel' : 'bg-[#0a0f1e]/90 backdrop-blur-2xl border border-white/10'
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
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <h4 className="text-white text-sm font-semibold tracking-wide">
                Estilo de Halo y Void
              </h4>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetBlobSettings}
                className="p-1.5 text-white/50 hover:text-pink-400 rounded-full hover:bg-white/5 transition-colors"
                title="Restablecer valores"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setBlobPanelOpen(false)}
                className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-white/80">
            {/* Modo Lúcido Neón Selector */}
            {isLucid && (
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <span className="text-[11px] font-mono text-cyan-300 font-medium block">
                  Colores del Modo Lúcido (Neón Activo):
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
                    <input
                      type="color"
                      value={lucidPrimaryColor}
                      onChange={(e) => setLucidPrimaryColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                      title="Color Neón Primario"
                    />
                    <span className="text-[10px] font-mono text-white/80 uppercase">{lucidPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
                    <input
                      type="color"
                      value={lucidSecondaryColor}
                      onChange={(e) => setLucidSecondaryColor(e.target.value)}
                      className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                      title="Color Neón Secundario"
                    />
                    <span className="text-[10px] font-mono text-white/80 uppercase">{lucidSecondaryColor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Modo Arcoíris vs Colores Personalizados */}
            <div className="flex items-center justify-between py-1">
              <span className="text-cyan-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Arcoíris Completo:
              </span>
              <button
                onClick={() =>
                  updateBlobSettings({ isRainbowMode: !blobSettings.isRainbowMode })
                }
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  blobSettings.isRainbowMode
                    ? 'bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-semibold shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {blobSettings.isRainbowMode ? 'Activado' : 'Personalizado'}
              </button>
            </div>

            {!blobSettings.isRainbowMode && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Color 1:</label>
                  <input
                    type="color"
                    value={blobSettings.haloColor1}
                    onChange={(e) => updateBlobSettings({ haloColor1: e.target.value })}
                    className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Color 2:</label>
                  <input
                    type="color"
                    value={blobSettings.haloColor2}
                    onChange={(e) => updateBlobSettings({ haloColor2: e.target.value })}
                    className="w-full h-8 bg-transparent rounded-lg cursor-pointer border border-white/10"
                  />
                </div>
              </div>
            )}

            {/* 2. Tamaño del Halo */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">Tamaño del Halo Exterior:</span>
                <span className="text-cyan-400 font-mono">{blobSettings.haloSize}px</span>
              </div>
              <input
                type="range"
                min="180"
                max="600"
                value={blobSettings.haloSize}
                onChange={(e) => updateBlobSettings({ haloSize: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 3. Tamaño del Círculo Central */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">Tamaño del Núcleo (Void):</span>
                <span className="text-pink-400 font-mono">{blobSettings.circleSize}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="400"
                value={blobSettings.circleSize}
                onChange={(e) => updateBlobSettings({ circleSize: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
              />
            </div>

            {/* 4. Potencia de Reacción al Bajo */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">Sensibilidad al Bajo:</span>
                <span className="text-emerald-400 font-mono">{blobSettings.bassBoost}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={blobSettings.bassBoost}
                onChange={(e) => updateBlobSettings({ bassBoost: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-emerald-400"
              />
            </div>

            {/* 4.1. Sensibilidad de Tamaño Dinámico */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">Sensibilidad de Tamaño:</span>
                <span className="text-cyan-400 font-mono">{(blobSettings.scaleSensitivity ?? 1.0).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={blobSettings.scaleSensitivity ?? 1.0}
                onChange={(e) => updateBlobSettings({ scaleSensitivity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 4.2. Calibración del Impacto Bass Boom */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/70 font-medium">Sensibilidad Disparo Boom:</span>
                <span className="text-pink-300 font-mono">{Math.round((1 - (blobBassBoomThreshold ?? 0.45)) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.02"
                value={blobBassBoomThreshold}
                onChange={(e) => setBlobBassBoomThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
              />

              <div className="flex justify-between text-[11px]">
                <span className="text-white/70 font-medium">Potencia Golpe Boom:</span>
                <span className="text-cyan-300 font-mono">{Math.round(blobBassBoomIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={blobBassBoomIntensity}
                onChange={(e) => setBlobBassBoomIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 5. Selección de Logo Central */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="block text-[11px] text-cyan-200 font-medium">
                Logo Central del Núcleo:
              </label>

              <div className="grid grid-cols-4 gap-2">
                {LOGO_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected =
                    blobSettings.logoStyle === preset.id && !blobSettings.customLogoUrl;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => updateBlobSettings({ logoStyle: preset.id, customLogoUrl: null })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                      title={preset.name}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>

              {/* Botón de Subida de Logo Propio y Edición */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <label className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 text-[11px] text-white/80">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{blobSettings.customLogoUrl ? 'Cambiar Imagen' : 'Subir Imagen PNG/SVG'}</span>
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
                        className="py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,242,254,0.2)]"
                        title="Abrir editor de recorte y filtros"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar / Filtros</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveCustomLogo}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl transition-colors"
                        title="Eliminar logo personalizado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
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
