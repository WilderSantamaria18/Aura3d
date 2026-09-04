import React, { useRef, useEffect, useMemo } from 'react';
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

export const RainbowBlobVisualizer: React.FC = () => {
  const {
    blobSettings,
    updateBlobSettings,
    resetBlobSettings,
    isBlobPanelOpen,
    setBlobPanelOpen,
    toggleVisualizerSettings,
    visualizerShape,
    waveEffectMode,
    waveEffectIntensity,
    bassBoomThreshold,
    setBassBoomThreshold,
    bassBoomIntensity,
    setBassBoomIntensity,
    rainbowScale,
    musicSensitivity,
    currentTrack,
    isMicActive,
    isPlaying,
    autoMode,
    autoPalette,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.18);

  const [isCropModalOpen, setIsCropModalOpen] = React.useState(false);
  const [tempImageForCrop, setTempImageForCrop] = React.useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const haloGlowRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
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

  // Shockwave rings state for 'concentric' wave effect
  const shockwaves = useRef<{ radius: number; maxRadius: number; opacity: number; hue: number }[]>([]);
  const prevBass = useRef(0);
  const boomImpulse = useRef(0);
  const boomFlash = useRef(0);

  useEffect(() => {
    let animId: number;
    let phase = 0;
    let angle = 0;
    let waveTime = 0;
    let lastBeat = 0;

    const render = () => {
      const { bass, mids, highs, energy, raw } = getSmoothedData();
      const isAudioActive = energy > 0.005 || isPlaying || isMicActive;
      waveTime += 0.02;

      // Bass Boom Transient Detection with Threshold & Intensity
      const bassDelta = bass - prevBass.current;
      const threshold = bassBoomThreshold || 0.45;
      const intensity = bassBoomIntensity || 1.0;

      if (bass > threshold && bassDelta > 0.035) {
        const impulseKick = Math.pow(bass, 1.2) * 1.5 * intensity;
        boomImpulse.current = Math.min(2.5, boomImpulse.current + impulseKick);
        boomFlash.current = Math.min(1.5, 1.0 * intensity);
        
        // Spawn primary explosive shockwave ring on boom drop
        const baseR = (blobSettings.circleSize / 2) * rainbowScale;
        shockwaves.current.push({
          radius: baseR + 6,
          maxRadius: baseR + 460 * (waveEffectIntensity || 1) * intensity,
          opacity: Math.min(1.0, 0.98 * intensity),
          hue: (waveTime * 90 + Math.random() * 50) % 360,
        });

        // Secondary nested shockwave for visceral punch
        if (intensity > 0.9) {
          shockwaves.current.push({
            radius: baseR + 2,
            maxRadius: baseR + 320 * (waveEffectIntensity || 1) * intensity,
            opacity: Math.min(1.0, 0.85 * intensity),
            hue: (waveTime * 90 + 180) % 360,
          });
        }
      }
      prevBass.current = bass;

      boomImpulse.current *= 0.84;
      boomFlash.current *= 0.78;
      const boomPunch = boomImpulse.current * intensity;

      if (isAudioActive) {
        phase += 0.04 + bass * 0.14 + boomPunch * 0.22;
        angle += 0.3 + mids * 1.5 + boomPunch * 1.2;
      } else {
        phase += 0.02;
        angle += 0.15;
      }

      const audioSens = musicSensitivity ?? 1.0;
      const nivel = isAudioActive ? bass * audioSens : 0;
      const boostVal = blobSettings.bassBoost;
      const idleBreathing = isAudioActive ? 0 : Math.sin(waveTime * 1.6) * 0.035;
      // Subwoofer pump: smoothed power curves, bounded boom impact and clamped scale
      const sens = (blobSettings.scaleSensitivity ?? 1.0) * audioSens;
      const baseScale = 0.72 + idleBreathing;
      const bassContribution = Math.pow(nivel, 1.2) * (0.6 + boostVal * 0.25);
      const boomContribution = Math.min(boomPunch * 0.45 * audioSens, 0.8);
      const totalScale = (baseScale + bassContribution + boomContribution) * sens;
      const clampedScale = Math.min(2.2, Math.max(0.4, totalScale));
      const escala = clampedScale * rainbowScale;

      // ── CSS Organic Liquid Halo Morphing (Default / Sphere Shape) ────────
      let borderRadius: string;
      if (visualizerShape === 'sphere') {
        if (isAudioActive) {
          const r1 = Math.floor(58 + Math.sin(phase) * (14 + bass * 35));
          const r2 = Math.floor(42 + Math.cos(phase * 1.3) * (14 + mids * 22));
          const r3 = Math.floor(36 + Math.sin(phase * 0.9) * (16 + bass * 32));
          const r4 = Math.floor(64 + Math.cos(phase * 1.1) * (12 + highs * 20));

          const r5 = Math.floor(60 + Math.cos(phase * 1.4) * (14 + highs * 20));
          const r6 = Math.floor(40 + Math.sin(phase * 1.2) * (15 + bass * 35));
          const r7 = Math.floor(65 + Math.cos(phase * 0.8) * (15 + mids * 22));
          const r8 = Math.floor(35 + Math.sin(phase * 1.5) * (14 + energy * 28));

          borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`;
        } else {
          // Continuous gentle organic idle morphing in silence
          const r1 = Math.floor(54 + Math.sin(phase * 0.7) * 9);
          const r2 = Math.floor(46 + Math.cos(phase * 0.8) * 8);
          const r3 = Math.floor(40 + Math.sin(phase * 0.6) * 10);
          const r4 = Math.floor(60 + Math.cos(phase * 0.75) * 8);

          const r5 = Math.floor(56 + Math.cos(phase * 0.85) * 8);
          const r6 = Math.floor(44 + Math.sin(phase * 0.9) * 9);
          const r7 = Math.floor(58 + Math.cos(phase * 0.65) * 8);
          const r8 = Math.floor(42 + Math.sin(phase * 0.8) * 8);

          borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`;
        }
      } else if (visualizerShape === 'icosahedron' || visualizerShape === 'octahedron') {
        borderRadius = '25% 75% 25% 75% / 75% 25% 75% 25%';
      } else {
        borderRadius = '50% 50% 50% 50% / 50% 50% 50% 50%';
      }

      if (circleRef.current) {
        circleRef.current.style.transform = `scale(${escala})`;
      }

      if (haloRef.current) {
        haloRef.current.style.borderRadius = borderRadius;
        haloRef.current.style.transform = `scale(${escala * 1.05}) rotate(${angle}deg)`;
        haloRef.current.style.opacity = `${isAudioActive ? 0.65 + nivel * 0.35 : 0.45}`;
        haloRef.current.style.filter = `blur(${isAudioActive ? 14 + nivel * 24 : 14}px)`;
        // Hide standard CSS halo if canvas shapes take over
        haloRef.current.style.display = visualizerShape === 'sphere' ? 'block' : 'none';
      }

      if (haloGlowRef.current) {
        haloGlowRef.current.style.borderRadius = borderRadius;
        haloGlowRef.current.style.transform = `scale(${escala * 1.2}) rotate(${-angle * 0.6}deg)`;
        haloGlowRef.current.style.opacity = `${isAudioActive ? 0.45 + nivel * 0.55 : 0.35}`;
        haloGlowRef.current.style.filter = `blur(${isAudioActive ? 25 + nivel * 35 : 22}px)`;
      }

      // ── 2D Canvas Dynamics (Shapes: rings, spikes, cloud, torus, wave + Wave Effects) ──
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          const cx = W / 2;
          const cy = H / 2;
          ctx.clearRect(0, 0, W, H);

          const baseCircleRadius = (blobSettings.circleSize / 2) * escala;

          // ── SHAPE 1: RINGS (5 concentric orbital rings) ───────────────────
          if (visualizerShape === 'rings') {
            for (let rIdx = 0; rIdx < 5; rIdx++) {
              const ringR = baseCircleRadius + (rIdx + 1) * 26 * (1 + bass * 0.35);
              const ringHue = isLucid ? (rIdx * 45) : (rIdx * 55 + waveTime * 40) % 360;
              const ringAlpha = 0.5 + Math.sin(waveTime * 3 + rIdx) * 0.2 + bass * 0.3;

              ctx.beginPath();
              ctx.arc(cx, cy, Math.max(10, ringR), 0, Math.PI * 2);
              ctx.strokeStyle = isLucid
                ? lucidTheme.primary
                : `hsla(${ringHue}, 100%, 65%, ${ringAlpha})`;
              ctx.lineWidth = 2.5 + (rIdx === 2 ? bass * 4 : 1);
              ctx.shadowColor = isLucid ? lucidTheme.glow : `hsla(${ringHue}, 100%, 50%, 0.8)`;
              ctx.shadowBlur = 15;
              ctx.stroke();

              // Orbital satellite dot on each ring
              const satAngle = waveTime * (1 + rIdx * 0.4) + rIdx;
              const sx = cx + Math.cos(satAngle) * ringR;
              const sy = cy + Math.sin(satAngle) * ringR;
              ctx.beginPath();
              ctx.arc(sx, sy, 3.5 + bass * 2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          }

          // ── SHAPE 2: SPIKES (Radial Sunburst Equalizer) ───────────────────
          if (visualizerShape === 'spikes') {
            const barCount = 48;
            for (let i = 0; i < barCount; i++) {
              const barAngle = (i / barCount) * Math.PI * 2 + angle * 0.02;
              const rawVal = raw[i % raw.length] || 0;
              const barLen = 15 + (rawVal / 255) * 85 * (1 + bass * 0.6);
              const barHue = (i * (360 / barCount) + waveTime * 30) % 360;

              const x1 = cx + Math.cos(barAngle) * (baseCircleRadius + 2);
              const y1 = cy + Math.sin(barAngle) * (baseCircleRadius + 2);
              const x2 = cx + Math.cos(barAngle) * (baseCircleRadius + 2 + barLen);
              const y2 = cy + Math.sin(barAngle) * (baseCircleRadius + 2 + barLen);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = isLucid ? lucidTheme.primary : `hsl(${barHue}, 100%, 60%)`;
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              ctx.shadowColor = isLucid ? lucidTheme.glow : `hsl(${barHue}, 100%, 50%)`;
              ctx.shadowBlur = 12;
              ctx.stroke();
            }
          }

          // ── SHAPE 3: CLOUD (Particle Swarm) ───────────────────────────────
          if (visualizerShape === 'cloud') {
            cloudParticles.forEach((p) => {
              p.angle += p.speed * (1 + mids * 2);
              const currentDist = (p.dist * (1 - bass * 0.15)) * rainbowScale;
              const px = cx + Math.cos(p.angle) * currentDist;
              const py = cy + Math.sin(p.angle) * currentDist;

              ctx.beginPath();
              ctx.arc(px, py, p.size * (1 + energy * 1.5), 0, Math.PI * 2);
              ctx.fillStyle = isLucid
                ? lucidTheme.primary
                : `hsla(${p.hue + waveTime * 20}, 90%, 65%, ${0.6 + bass * 0.4})`;
              ctx.shadowColor = isLucid ? lucidTheme.glow : `hsla(${p.hue}, 90%, 50%, 0.8)`;
              ctx.shadowBlur = 10;
              ctx.fill();
            });
          }

          // ── SHAPE 4: TORUS / ROSCA (Dual rotating elliptical bands) ────────
          if (visualizerShape === 'torus') {
            for (let t = 0; t < 2; t++) {
              const rotDir = t === 0 ? 1 : -1;
              const tAngle = waveTime * 1.2 * rotDir;
              const tRadiusX = (baseCircleRadius + 35) * (1 + bass * 0.2);
              const tRadiusY = (baseCircleRadius + 18) * (1 + mids * 0.25);

              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(tAngle);
              ctx.beginPath();
              ctx.ellipse(0, 0, tRadiusX, tRadiusY, 0, 0, Math.PI * 2);
              ctx.strokeStyle = isLucid
                ? (t === 0 ? lucidTheme.primary : lucidTheme.secondary)
                : (t === 0 ? '#00f2fe' : '#ff088a');
              ctx.lineWidth = 4 + bass * 3;
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 20;
              ctx.stroke();
              ctx.restore();
            }
          }

          // ── SHAPE 5: WAVE (3D Sinusoidal Ribbon around Void) ──────────────
          if (visualizerShape === 'wave') {
            const wavePoints = 120;
            ctx.beginPath();
            for (let i = 0; i <= wavePoints; i++) {
              const theta = (i / wavePoints) * Math.PI * 2;
              const ripple = Math.sin(theta * 8 + waveTime * 4) * (16 + bass * 35);
              const r = baseCircleRadius + 22 + ripple;
              const wx = cx + Math.cos(theta) * r;
              const wy = cy + Math.sin(theta) * r;
              if (i === 0) ctx.moveTo(wx, wy);
              else ctx.lineTo(wx, wy);
            }
            ctx.closePath();
            ctx.strokeStyle = isLucid ? lucidTheme.primary : '#00ffb3';
            ctx.lineWidth = 3.5 + mids * 2;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 16;
            ctx.stroke();
          }

          // ── WAVE EFFECTS (concentric, sinusoidal, spiral, void) ────────────
          if (waveEffectMode === 'concentric') {
            // Spawn shockwaves on bass peaks
            if (bass > 0.45 && Date.now() - lastBeat > 280) {
              lastBeat = Date.now();
              shockwaves.current.push({
                radius: baseCircleRadius + 10,
                maxRadius: baseCircleRadius + 220 * waveEffectIntensity,
                opacity: 0.85,
                hue: Math.random() * 360,
              });
            }

            shockwaves.current.forEach((sw) => {
              sw.radius += 3.5 * waveEffectIntensity;
              sw.opacity *= 0.96;

              ctx.beginPath();
              ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
              ctx.strokeStyle = isLucid
                ? `rgba(57, 255, 20, ${sw.opacity})`
                : `hsla(${sw.hue}, 100%, 65%, ${sw.opacity})`;
              ctx.lineWidth = 2.5;
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 12;
              ctx.stroke();
            });

            // Cleanup dead shockwaves
            shockwaves.current = shockwaves.current.filter((sw) => sw.opacity > 0.02);
          } else if (waveEffectMode === 'spiral') {
            // Dual Spiral Arms wrapping around Void
            for (let arm = 0; arm < 2; arm++) {
              const armOffset = arm * Math.PI;
              ctx.beginPath();
              for (let step = 0; step < 60; step++) {
                const sAngle = armOffset + (step / 60) * Math.PI * 3 + waveTime * 2;
                const sDist = baseCircleRadius + step * 3.2 * waveEffectIntensity;
                const sx = cx + Math.cos(sAngle) * sDist;
                const sy = cy + Math.sin(sAngle) * sDist;
                if (step === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              }
              ctx.strokeStyle = isLucid ? lucidTheme.secondary : `hsl(${(arm * 180 + waveTime * 30) % 360}, 100%, 65%)`;
              ctx.lineWidth = 2.5 + bass * 2;
              ctx.shadowColor = ctx.strokeStyle;
              ctx.shadowBlur = 15;
              ctx.stroke();
            }
          }
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
    isPlaying,
    isMicActive,
    visualizerShape,
    waveEffectMode,
    waveEffectIntensity,
    rainbowScale,
    musicSensitivity,
    isLucid,
    lucidTheme,
    cloudParticles,
  ]);

  const haloBackground = isLucid
    ? `conic-gradient(from 0deg, ${lucidTheme.primary}, ${lucidTheme.secondary}, #ff007f, ${lucidTheme.primary})`
    : autoMode
    ? `conic-gradient(from 0deg, ${autoPalette.primary}, ${autoPalette.secondary}, ${autoPalette.tertiary || autoPalette.accent || '#39FF14'}, ${autoPalette.primary})`
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
      return (
        <div className="relative flex items-center justify-center group cursor-pointer">
          {/* Ambient blurred spinning bloom behind the logo */}
          <div
            className="absolute inset-0 rounded-full animate-[spin_24s_linear_infinite] pointer-events-none opacity-65 group-hover:opacity-95 transition-opacity"
            style={{
              backgroundImage: `url(${activeImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px) saturate(2.0) brightness(1.3)',
              transform: 'scale(1.25)',
            }}
          />

          {/* Crisp center circular disc */}
          <div
            onClick={() => {
              setTempImageForCrop(activeImage);
              setIsCropModalOpen(true);
            }}
            className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_25px_rgba(0,242,254,0.6)] animate-[spin_18s_linear_infinite] group-hover:scale-105 transition-transform"
            title="Haz clic para recortar, aplicar filtros neón y efectos al logo/carátula"
          >
            <img
              src={activeImage}
              alt="Carátula / Logo"
              className="w-full h-full object-cover"
            />
            {/* Vinyl inner groove rings overlay */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-black border border-cyan-400 pointer-events-none shadow-[0_0_8px_#00f2fe]" />
          </div>
        </div>
      );
    }

    const activePreset = LOGO_PRESETS.find((p) => p.id === blobSettings.logoStyle) || LOGO_PRESETS[0];
    const IconComponent = activePreset.icon;

    return (
      <div
        className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)] transform hover:scale-110 transition-transform"
        style={isLucid ? { color: lucidTheme.primary, boxShadow: `0 0 20px ${lucidTheme.glow}` } : undefined}
      >
        <IconComponent
          className="w-9 h-9 sm:w-12 sm:h-12 drop-shadow-[0_0_10px_currentColor]"
          style={isLucid ? { color: lucidTheme.primary } : undefined}
        />
      </div>
    );
  };

  const activeArtwork = blobSettings.customLogoUrl || currentTrack?.coverUrl;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none">
      {/* Fondo con Blur en Movimiento */}
      <div
        ref={fondoRef}
        className="fixed -top-12 -left-12 w-[125%] h-[125%] pointer-events-none transition-all duration-500"
        style={{
          background: isLucid
            ? lucidTheme.bgGradient
            : 'radial-gradient(circle at 25% 25%, #0a2a43 0%, #001e33 45%, #040817 75%, #000000 100%)',
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
        {/* Ambient spinning blurred bloom halo from album artwork */}
        {activeArtwork && (
          <div
            className="absolute rounded-full pointer-events-none mix-blend-screen opacity-45 transition-all duration-100 animate-[spin_36s_linear_infinite]"
            style={{
              width: `${blobSettings.haloSize * 1.35}px`,
              height: `${blobSettings.haloSize * 1.35}px`,
              backgroundImage: `url(${activeArtwork})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(${blobSettings.backgroundBlur + 24}px) saturate(2.4) brightness(1.25)`,
            }}
          />
        )}

        {/* Dynamic Canvas for 3D Shapes & Wave Effects in Rainbow Void */}
        <canvas
          ref={canvasRef}
          width={700}
          height={700}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
          style={{ width: '700px', height: '700px' }}
        />

        {/* Halo Glow Diffusion */}
        <div
          ref={haloGlowRef}
          className="absolute rounded-[50%] pointer-events-none mix-blend-screen transition-all duration-75"
          style={{
            width: `${blobSettings.haloSize * 1.15}px`,
            height: `${blobSettings.haloSize * 1.15}px`,
            background: haloBackground,
          }}
        />

        {/* El Halo / Blob de Arcoíris Principal */}
        <div
          ref={haloRef}
          className="absolute rounded-[50%] pointer-events-none shadow-[0_0_50px_rgba(0,242,254,0.3)] transition-all duration-75"
          style={{
            width: `${blobSettings.haloSize}px`,
            height: `${blobSettings.haloSize}px`,
            background: haloBackground,
          }}
        />

        {/* El Círculo Interior (The Void) */}
        <div
          ref={circleRef}
          className={`relative z-10 rounded-full flex flex-col justify-center items-center transition-all duration-75 ease-out p-4 ${
            isLucid
              ? 'border-2'
              : 'border border-white/15 shadow-[0_0_35px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)]'
          }`}
          style={{
            width: `${blobSettings.circleSize}px`,
            height: `${blobSettings.circleSize}px`,
            backgroundColor: isLucid ? (lucidTheme.glassColor || '#050711') : blobSettings.circleColor,
            borderColor: isLucid ? lucidTheme.borderColor : undefined,
            boxShadow: isLucid ? `0 0 35px ${lucidTheme.glow}, inset 0 0 25px ${lucidTheme.glow}` : undefined,
          }}
        >
          {/* Logo Central Vectorial o Imagen Personalizada */}
          {renderCenterLogo()}

          {/* Información de pista sutil en el interior */}
          {blobSettings.circleSize >= 210 && (
            <div className="mt-2 text-center max-w-[85%] pointer-events-none">
              <p className="text-white/80 font-light tracking-[0.2em] text-[10px] sm:text-xs uppercase truncate">
                {isMicActive ? 'Micrófono en vivo' : currentTrack?.title || 'Auralis Void'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante para abrir panel de personalización / Configuración */}
      <div className="fixed top-20 right-6 z-40 flex items-center gap-2">
        <button
          onClick={toggleVisualizerSettings}
          className="px-3.5 py-2 rounded-full backdrop-blur-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:bg-cyan-500/25"
          title="Configurar Formas, Ondas y Parámetros del Visualizador"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-300" />
          <span>Configuración</span>
        </button>

        <button
          onClick={() => setBlobPanelOpen(!isBlobPanelOpen)}
          className={`px-3.5 py-2 rounded-full backdrop-blur-xl border text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg ${
            isBlobPanelOpen
              ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-[0_0_15px_rgba(255,8,138,0.4)]'
              : 'bg-black/60 text-white/80 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="Personalizar colores y logos"
        >
          <Palette className="w-3.5 h-3.5 text-pink-300" />
          <span>Estilo Halo</span>
        </button>
      </div>

      {/* Panel de Control Editable */}
      {isBlobPanelOpen && (
        <div
          className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 animate-in slide-in-from-bottom-2 duration-200 ${
            isLucid ? 'lucid-panel' : 'bg-[#090d1c]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-black/90'
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

            {/* 4.1. Calibración del Impacto Bass Boom */}
            <div className="p-3 bg-pink-500/10 border border-pink-500/25 rounded-2xl space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-pink-200 font-medium">Sensibilidad Disparo Boom:</span>
                <span className="text-pink-300 font-mono">{Math.round((1 - (bassBoomThreshold ?? 0.45)) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.02"
                value={bassBoomThreshold}
                onChange={(e) => setBassBoomThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
              />

              <div className="flex justify-between text-[11px]">
                <span className="text-cyan-200 font-medium">Potencia Golpe Boom:</span>
                <span className="text-cyan-300 font-mono">{Math.round(bassBoomIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={bassBoomIntensity}
                onChange={(e) => setBassBoomIntensity(parseFloat(e.target.value))}
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
