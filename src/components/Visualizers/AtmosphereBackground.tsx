import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { useVisualizer } from '../../hooks/useVisualizer';
import { hexToRgba } from '../../types/audio';

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  hue: number;
  alpha: number;
}

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isGold: boolean;
  phase: number;
  alpha: number;
}

interface MagicDust {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  twinklePhase: number;
}

interface Star3D {
  x: number;
  y: number;
  z: number;
  prevZ: number;
  size: number;
  color: string;
}

interface RadialBurstParticle {
  angle: number;
  distance: number;
  prevDistance: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
  maxDistance: number;
}

interface StardustParticle {
  baseRadius: number;
  angle: number;
  angularSpeed: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
}

interface QuantumRing {
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  speed: number;
  color: string;
}

/**
 * AtmosphereBackground
 * Capa de fondo atmosférico a pantalla completa acelerada por GPU en Canvas.
 * Efectos seleccionados y conservados: Atardecer, Lluvia, Arena, Estrellas 3D.
 * Nuevos efectos minimalistas:
 *  - radial_burst: Partículas estelares que emanan directamente del centro del círculo en 360°
 *  - stardust_drift: Polvo cósmico y bruma estelar zen flotando en espirales concéntricas
 *  - light_beams: Haces de luz volumétrica suave radiante desde el núcleo
 *  - quantum_waves: Anillos concéntricos cuánticos en cada golpe de bajo
 */
export const AtmosphereBackground: React.FC = () => {
  const {
    blobSettings,
    isLucid,
    lucidTheme,
    autoMode,
    dynamicColor,
    isPlaying,
    isMicActive,
    musicSensitivity,
  } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.2);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atmosphere = blobSettings.backgroundAtmosphere || 'none';
  const atmosphereBlend = blobSettings.atmosphereBlend || 'none';

  // Custom background image & wallpaper synchronization
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const wallpaperBgMode = useWallpaperStore((s) => s.backgroundMode);
  const hasActiveWallpaper = wallpaperBgMode === 'wallpaper' && Boolean(currentWallpaper?.url);
  const customBg = blobSettings.customBackgroundImage;
  const effectiveCustomBg = !hasActiveWallpaper ? customBg : null;
  const hasAnyBackground = Boolean(customBg || hasActiveWallpaper);

  const bgOpacity = blobSettings.backgroundOpacity !== undefined ? blobSettings.backgroundOpacity : 0.85;
  const bgBlur = blobSettings.backgroundBlur !== undefined ? blobSettings.backgroundBlur : 0;
  const effectiveBgBlur = bgBlur;
  const bgFit = blobSettings.backgroundFit || 'cover';
  const bgScale = blobSettings.backgroundScale || 1.0;
  const bgContrastMode = blobSettings.backgroundContrastMode || 'text_clarity';
  const textScrim = blobSettings.backgroundTextScrim !== undefined ? blobSettings.backgroundTextScrim : 0.65;
  const themeTint = blobSettings.backgroundThemeTint !== undefined ? blobSettings.backgroundThemeTint : 0.35;

  // Atmosphere dynamic modifiers
  const atmoSpeed = blobSettings.atmosphereSpeed || 1.0;
  const atmoGlow = blobSettings.atmosphereGlow || 1.0;
  const atmoSmoothing = blobSettings.atmosphereSmoothing || 0.20;

  // Lucid Theme Dynamic Colors & AI Dynamic Palette
  const primaryColor = isLucid
    ? (lucidTheme?.primary || '#00e5ff')
    : autoMode
    ? (dynamicColor || '#00e5ff')
    : '#00e5ff';
  const secondaryColor = isLucid
    ? (lucidTheme?.secondary || '#ff007f')
    : '#ff007f';
  const glowColor = isLucid
    ? (lucidTheme?.glow || 'rgba(0, 229, 255, 0.4)')
    : `rgba(0, 242, 254, 0.4)`;

  // Audio smoothing & kick tracker
  const prevBassRef = useRef(0);
  const smoothedBassRef = useRef(0);
  const smoothedEnergyRef = useRef(0);

  // Transition smoothing between atmospheric states
  const currentAtmosphereRef = useRef<string>(atmosphere);
  const transitionAlphaRef = useRef(1.0);

  // Effect Particle Pools
  const rainRef = useRef<RainDrop[]>([]);
  const sandRef = useRef<SandParticle[]>([]);
  const dustRef = useRef<MagicDust[]>([]);
  const starsRef = useRef<Star3D[]>([]);
  const radialBurstRef = useRef<RadialBurstParticle[]>([]);
  const stardustRef = useRef<StardustParticle[]>([]);
  const quantumRingsRef = useRef<QuantumRing[]>([]);

  // Track atmosphere transitions smoothly
  useEffect(() => {
    if (currentAtmosphereRef.current !== atmosphere) {
      currentAtmosphereRef.current = atmosphere;
      transitionAlphaRef.current = 0.2; // Snappy fade into new atmosphere
    }
  }, [atmosphere]);

  // Initialize atmospheric particle pools
  useEffect(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const maxDim = Math.hypot(w, h) / 2;

    // 1. Rain Pool (~180 drops)
    const rain: RainDrop[] = [];
    for (let i = 0; i < 180; i++) {
      rain.push({
        x: Math.random() * w,
        y: Math.random() * h,
        length: 14 + Math.random() * 26,
        speed: 5 + Math.random() * 9,
        hue: 180 + Math.random() * 140,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }
    rainRef.current = rain;

    // 2. Sand Pool (~220 particles)
    const sand: SandParticle[] = [];
    for (let i = 0; i < 220; i++) {
      sand.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0.4 + Math.random() * 0.8,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1.4 + Math.random() * 2.6,
        isGold: Math.random() > 0.45,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.65,
      });
    }
    sandRef.current = sand;

    // 3. Dust & Embers for Sunset (~140 motes)
    const dust: MagicDust[] = [];
    for (let i = 0; i < 140; i++) {
      dust.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1.2 + Math.random() * 2.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.25 + Math.random() * 0.65,
        alpha: 0.35 + Math.random() * 0.65,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    dustRef.current = dust;

    // 4. Warp Stars 3D (~320 stars)
    const stars: Star3D[] = [];
    const colors = ['#00f2fe', '#ff088a', '#ffffff', '#39ff14', '#ffe600', '#9d4edd'];
    for (let i = 0; i < 320; i++) {
      const z = Math.random() * 1000 + 1;
      stars.push({
        x: (Math.random() - 0.5) * 2200,
        y: (Math.random() - 0.5) * 2200,
        z,
        prevZ: z,
        size: Math.random() * 2.0 + 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    starsRef.current = stars;

    // 5. Radial Burst Particles (Partículas saliendo desde el centro del círculo) (~260 particles)
    const radial: RadialBurstParticle[] = [];
    for (let i = 0; i < 260; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * (maxDim * 0.9);
      radial.push({
        angle,
        distance,
        prevDistance: distance,
        speed: 1.6 + Math.random() * 4.4,
        size: 1.0 + Math.random() * 2.2,
        alpha: 0.4 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        maxDistance: maxDim * (0.65 + Math.random() * 0.45),
      });
    }
    radialBurstRef.current = radial;

    // 6. Stardust Drift (Bruma y Polvo Cósmico Orbital) (~220 motes)
    const stardust: StardustParticle[] = [];
    for (let i = 0; i < 220; i++) {
      stardust.push({
        baseRadius: 60 + Math.random() * (maxDim * 0.85),
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.8),
        size: 1.0 + Math.random() * 2.4,
        alpha: 0.25 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    stardustRef.current = stardust;

    // 7. Quantum Rings (anillos concéntricos dinámicos iniciales)
    quantumRingsRef.current = [];
  }, []);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Render Loop
  useEffect(() => {
    // If Zen Clean mode and no custom background, keep canvas clear and do not run rAF loop
    if (atmosphere === 'none' && !customBg) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let animId: number;

    const render = (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(window.innerWidth * dpr);
      const targetH = Math.round(window.innerHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
      }

      const width = targetW / dpr;
      const height = targetH / dpr;
      const timeSec = timeMs * 0.001 * atmoSpeed;

      // Snappy transition smoothing
      if (transitionAlphaRef.current < 1.0) {
        transitionAlphaRef.current = Math.min(1.0, transitionAlphaRef.current + 0.05);
      }
      const transitionAlpha = transitionAlphaRef.current;

      // Audio FFT tracking
      const audioData = getSmoothedData();
      const sensitivity = musicSensitivity || 0.75;
      const rawBass = (audioData.bass || 0) * sensitivity;
      const rawEnergy = (audioData.energy || 0) * sensitivity;

      const smoothFactor = Math.max(0.08, Math.min(0.40, atmoSmoothing));
      smoothedBassRef.current += (rawBass - smoothedBassRef.current) * smoothFactor;
      smoothedEnergyRef.current += (rawEnergy - smoothedEnergyRef.current) * smoothFactor;
      const sBass = smoothedBassRef.current;
      const sEnergy = smoothedEnergyRef.current;

      const bassDelta = sBass - prevBassRef.current;
      prevBassRef.current = sBass;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Center coords
      const cx = width / 2;
      const cy = height / 2;
      const maxDim = Math.hypot(width, height) / 2;

      // Helper function to render an atmospheric mode
      const renderMode = (mode: string, modeAlpha: number) => {
        ctx.save();
        ctx.globalAlpha = modeAlpha;

        // ── Mode: none (Fondo Limpio Zen: Negro abisal puro sin velos) ─────
        if (mode === 'none') {
          ctx.restore();
          return;
        }

        // ── Mode: sunset (Atardecer Épico DHONKIO & Silueta en Acantilado) ──
        else if (mode === 'sunset') {
          if (!hasAnyBackground) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            if (isLucid) {
              sky.addColorStop(0, '#06020c');
              sky.addColorStop(0.35, `${secondaryColor}30`);
              sky.addColorStop(0.65, `${primaryColor}40`);
              sky.addColorStop(0.85, `${secondaryColor}65`);
              sky.addColorStop(1, primaryColor);
            } else {
              sky.addColorStop(0, '#0c0318');
              sky.addColorStop(0.35, '#2c0726');
              sky.addColorStop(0.65, '#851224');
              sky.addColorStop(0.85, '#e04215');
              sky.addColorStop(1, '#ff8000');
            }
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const sunRadius = Math.min(width, height) * (0.28 + sBass * 0.05);
          const sunX = width * 0.5;
          const sunY = height * 0.46;

          // 1. Radial Solar Flare
          const glow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.2, sunX, sunY, sunRadius * 2.1);
          if (isLucid) {
            glow.addColorStop(0, primaryColor);
            glow.addColorStop(0.45, `${secondaryColor}80`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
          } else {
            glow.addColorStop(0, `rgba(255, 75, 45, ${0.92 * atmoGlow})`);
            glow.addColorStop(0.5, `rgba(255, 130, 30, ${0.45 * atmoGlow})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
          }
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius * 2.1, 0, Math.PI * 2);
          ctx.fill();

          // 2. Giant Sun Disc
          const sunDisc = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
          if (isLucid) {
            sunDisc.addColorStop(0, '#ffffff');
            sunDisc.addColorStop(0.4, primaryColor);
            sunDisc.addColorStop(1, secondaryColor);
          } else {
            sunDisc.addColorStop(0, '#fff4b8');
            sunDisc.addColorStop(0.4, '#ff7700');
            sunDisc.addColorStop(1, '#d00028');
          }
          ctx.fillStyle = sunDisc;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
          ctx.fill();

          // 3. Cinematic Mountain Cliff Silhouette
          ctx.fillStyle = '#05070e';
          ctx.beginPath();
          ctx.moveTo(0, height * 0.67);
          ctx.bezierCurveTo(width * 0.12, height * 0.66, width * 0.24, height * 0.71, width * 0.35, height * 0.75);
          ctx.lineTo(width * 0.39, height * 0.81);
          ctx.bezierCurveTo(width * 0.33, height * 0.90, width * 0.20, height * 0.95, width * 0.15, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          // 4. Wanderer Silhouette Standing on Cliff Peak with Fluttering Scarf
          const charX = width * 0.31;
          const charY = height * 0.735;
          const charScale = Math.min(width, height) * 0.0017;

          ctx.fillStyle = '#020306';
          // Head
          ctx.beginPath();
          ctx.arc(charX, charY - 34 * charScale, 4.5 * charScale, 0, Math.PI * 2);
          ctx.fill();
          // Torso & Cape
          ctx.beginPath();
          ctx.moveTo(charX - 3 * charScale, charY - 29 * charScale);
          ctx.lineTo(charX + 3 * charScale, charY - 29 * charScale);
          ctx.lineTo(charX + 7 * charScale, charY);
          ctx.lineTo(charX - 7 * charScale, charY);
          ctx.closePath();
          ctx.fill();

          // Fluttering scarf in the wind
          const scarfWave = Math.sin(timeSec * 4.5) * 5 * charScale;
          const scarfWave2 = Math.cos(timeSec * 5.5) * 7 * charScale;
          ctx.strokeStyle = isLucid ? primaryColor : '#e01e37';
          ctx.lineWidth = 2.4 * charScale;
          ctx.beginPath();
          ctx.moveTo(charX - 2 * charScale, charY - 27 * charScale);
          ctx.bezierCurveTo(
            charX - 16 * charScale,
            charY - 28 * charScale + scarfWave,
            charX - 30 * charScale,
            charY - 24 * charScale + scarfWave2,
            charX - 44 * charScale,
            charY - 26 * charScale + scarfWave
          );
          ctx.stroke();

          // 5. Floating Sunset Magic Dust & Embers
          dustRef.current.forEach((d) => {
            d.y += d.vy * (1 + sEnergy * 0.9) * atmoSpeed;
            d.x += (d.vx + Math.sin(timeSec * 2 + d.twinklePhase) * 0.4) * atmoSpeed;
            if (d.y > height) {
              d.y = -10;
              d.x = Math.random() * width;
            }
            const alpha = d.alpha * (0.6 + Math.sin(timeSec * 3 + d.twinklePhase) * 0.4) * atmoGlow;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fillStyle = isLucid
              ? (d.twinklePhase > Math.PI ? primaryColor : secondaryColor)
              : `rgba(255, 235, 180, ${alpha})`;
            ctx.fill();
          });
        }

        // ── Mode: rain (Lluvia Neón Estelar) ────────────────────────────────
        else if (mode === 'rain') {
          if (!hasAnyBackground) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#030712');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}10` : '#081122');
            sky.addColorStop(1, isLucid ? `${primaryColor}14` : '#050a16');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const rain = rainRef.current;
          const speedMult = (1 + sEnergy * 2.2 + (isPlaying || isMicActive ? 0.8 : 0)) * atmoSpeed;

          rain.forEach((drop) => {
            drop.y += drop.speed * speedMult;
            if (drop.y > height) {
              drop.y = -drop.length;
              drop.x = Math.random() * width;
            }

            const currentAlpha = Math.min(1, drop.alpha * (0.6 + sBass * 0.8) * atmoGlow);
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length * (1 + sBass * 0.5));
            ctx.strokeStyle = isLucid
              ? (drop.hue % 2 === 0 ? primaryColor : secondaryColor)
              : `hsla(${drop.hue}, 90%, 65%, ${currentAlpha})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          });
        }

        // ── Mode: sand (Mareas de Arena Sub & Partículas Fluidas) ───────────
        else if (mode === 'sand') {
          if (!hasAnyBackground) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#080812');
            sky.addColorStop(0.6, isLucid ? `${secondaryColor}12` : '#18120c');
            sky.addColorStop(1, isLucid ? `${primaryColor}15` : '#2c1e0e');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const sand = sandRef.current;
          const wavePhase = timeSec * 1.5;

          sand.forEach((p) => {
            p.x += p.vx * (1 + sEnergy * 1.8) * atmoSpeed;
            p.y += (p.vy + Math.sin(wavePhase + p.phase) * (0.8 + sBass * 2.5)) * atmoSpeed;

            if (p.x > width) p.x = 0;
            if (p.x < 0) p.x = width;
            if (p.y > height) p.y = 0;
            if (p.y < 0) p.y = height;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + sBass * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = p.isGold
              ? `rgba(255, 200, 70, ${p.alpha * (0.6 + sBass * 0.5) * atmoGlow})`
              : isLucid
              ? (p.phase % 2 === 0 ? primaryColor : secondaryColor)
              : `rgba(0, 240, 255, ${p.alpha * (0.5 + sEnergy * 0.5) * atmoGlow})`;
            ctx.fill();
          });
        }

        // ── Mode: stars (Warp Speed Starfield 3D) ───────────────────────────
        else if (mode === 'stars') {
          if (!customBg) {
            const sky = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxDim * 0.95);
            sky.addColorStop(0, isLucid ? `${primaryColor}14` : '#0a0d24');
            sky.addColorStop(0.6, isLucid ? `${secondaryColor}0c` : '#040612');
            sky.addColorStop(1, '#010206');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const stars = starsRef.current;
          const warpSpeed = (5 + sEnergy * 26 + sBass * 35) * atmoSpeed;

          stars.forEach((star, sIndex) => {
            star.prevZ = star.z;
            star.z -= warpSpeed;

            if (star.z <= 0) {
              star.z = 1000;
              star.prevZ = 1000;
              star.x = (Math.random() - 0.5) * 2200;
              star.y = (Math.random() - 0.5) * 2200;
            }

            const k = 420 / star.z;
            const px = cx + star.x * k;
            const py = cy + star.y * k;

            const prevK = 420 / star.prevZ;
            const prevPx = cx + star.x * prevK;
            const prevPy = cy + star.y * prevK;

            if (px >= 0 && px <= width && py >= 0 && py <= height) {
              const alpha = Math.min(1, (1 - star.z / 1000) * (0.8 + sBass * 0.6) * atmoGlow);
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(prevPx, prevPy);
              ctx.lineTo(px, py);
              ctx.strokeStyle = isLucid
                ? (sIndex % 2 === 0 ? primaryColor : secondaryColor)
                : star.color;
              ctx.lineWidth = Math.max(1.2, star.size * k * 0.85);
              ctx.globalAlpha = alpha;
              ctx.stroke();
              ctx.restore();
            }
          });
        }

        // ── Mode: radial_burst (NUEVO: Partículas que salen del centro del círculo en 360°) ──
        else if (mode === 'radial_burst') {
          if (!hasAnyBackground) {
            const deepSpace = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxDim * 0.95);
            deepSpace.addColorStop(0, isLucid ? `${primaryColor}18` : '#070c20');
            deepSpace.addColorStop(0.5, isLucid ? `${secondaryColor}0c` : '#030510');
            deepSpace.addColorStop(1, '#010206');
            ctx.fillStyle = deepSpace;
            ctx.fillRect(0, 0, width, height);
          }

          // Resplandor del núcleo central
          const coreAura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 190 * (1 + sBass * 0.35));
          coreAura.addColorStop(0, isLucid ? `${primaryColor}28` : 'rgba(0, 240, 255, 0.22)');
          coreAura.addColorStop(0.5, isLucid ? `${secondaryColor}12` : 'rgba(140, 56, 255, 0.10)');
          coreAura.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = coreAura;
          ctx.beginPath();
          ctx.arc(cx, cy, 190 * (1 + sBass * 0.35), 0, Math.PI * 2);
          ctx.fill();

          const particles = radialBurstRef.current;
          const speedMult = (1 + sBass * 4.8 + sEnergy * 2.4) * atmoSpeed;

          particles.forEach((p, idx) => {
            p.prevDistance = p.distance;
            p.distance += p.speed * speedMult;

            // Si sobrepasa los límites o la distancia máxima, renace en el centro
            if (p.distance >= p.maxDistance) {
              p.distance = 25 + Math.random() * 55;
              p.prevDistance = p.distance;
              p.angle = Math.random() * Math.PI * 2;
              p.speed = 1.6 + Math.random() * 4.4;
              p.maxDistance = maxDim * (0.65 + Math.random() * 0.45);
              p.size = 1.0 + Math.random() * 2.2;
              p.alpha = 0.4 + Math.random() * 0.6;
            }

            const px = cx + Math.cos(p.angle) * p.distance;
            const py = cy + Math.sin(p.angle) * p.distance;

            const prevPx = cx + Math.cos(p.angle) * p.prevDistance;
            const prevPy = cy + Math.sin(p.angle) * p.prevDistance;

            if (px >= -30 && px <= width + 30 && py >= -30 && py <= height + 30) {
              const progress = Math.min(1, p.distance / p.maxDistance);
              const fadeAlpha = (1 - progress * 0.85) * p.alpha * (0.65 + sBass * 0.6) * atmoGlow;

              // Estela de haz radiante hacia afuera
              ctx.beginPath();
              ctx.moveTo(prevPx, prevPy);
              ctx.lineTo(px, py);
              ctx.strokeStyle = isLucid
                ? (idx % 2 === 0 ? primaryColor : secondaryColor)
                : p.color;
              ctx.lineWidth = Math.max(0.8, p.size * (1 - progress * 0.35) * (1 + sBass * 0.5));
              ctx.globalAlpha = Math.min(1, fadeAlpha);
              ctx.stroke();

              // Cabeza de micro-destello diamantado
              ctx.beginPath();
              ctx.arc(px, py, p.size * (0.8 + sBass * 0.35), 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = Math.min(1, fadeAlpha * 1.15);
              ctx.fill();
            }
          });
        }

        // ── Mode: stardust_drift (NUEVO: Polvo Cósmico & Bruma Estelar Zen) ───
        else if (mode === 'stardust_drift') {
          if (!hasAnyBackground) {
            const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, maxDim * 0.95);
            grad.addColorStop(0, isLucid ? `${secondaryColor}14` : '#08081a');
            grad.addColorStop(0.6, isLucid ? `${primaryColor}0a` : '#03040c');
            grad.addColorStop(1, '#000104');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
          }

          const stardust = stardustRef.current;
          const rotDelta = (0.003 + sEnergy * 0.008) * atmoSpeed;

          stardust.forEach((s, idx) => {
            s.angle += s.angularSpeed * rotDelta;
            const r = s.baseRadius + Math.sin(timeSec * 1.2 + s.phase) * (15 + sBass * 35);

            const px = cx + Math.cos(s.angle) * r;
            const py = cy + Math.sin(s.angle) * r;

            const twinkle = 0.5 + 0.5 * Math.sin(timeSec * 3.0 + s.phase);
            const alpha = s.alpha * twinkle * (0.6 + sEnergy * 0.6) * atmoGlow;

            ctx.beginPath();
            ctx.arc(px, py, s.size * (1 + sBass * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = isLucid
              ? (idx % 2 === 0 ? primaryColor : secondaryColor)
              : s.color;
            ctx.globalAlpha = Math.min(1, alpha);
            ctx.fill();
          });
        }

        // ── Mode: light_beams (NUEVO: Haces de Luz Radiante Etereos desde el Centro) ─
        else if (mode === 'light_beams') {
          if (!hasAnyBackground) {
            const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxDim);
            grad.addColorStop(0, isLucid ? `${primaryColor}18` : '#050a18');
            grad.addColorStop(0.7, '#02040a');
            grad.addColorStop(1, '#000002');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
          }

          const numBeams = 12;
          const baseRotation = timeSec * 0.12 * atmoSpeed;

          for (let b = 0; b < numBeams; b++) {
            const beamAngle = baseRotation + (b / numBeams) * Math.PI * 2;
            const beamSpread = 0.08 + Math.sin(timeSec * 1.5 + b) * 0.02 + sEnergy * 0.04;
            const beamLength = maxDim * (1.1 + sBass * 0.2);

            const x1 = cx + Math.cos(beamAngle - beamSpread) * beamLength;
            const y1 = cy + Math.sin(beamAngle - beamSpread) * beamLength;
            const x2 = cx + Math.cos(beamAngle + beamSpread) * beamLength;
            const y2 = cy + Math.sin(beamAngle + beamSpread) * beamLength;

            const beamGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, beamLength);
            const beamAlpha = (0.12 + Math.sin(timeSec * 2.0 + b) * 0.06 + sBass * 0.16) * atmoGlow;
            const col = isLucid
              ? (b % 2 === 0 ? primaryColor : secondaryColor)
              : b % 2 === 0
              ? '#00f0ff'
              : '#9d4edd';

            beamGrad.addColorStop(0, hexToRgba(col, Math.min(0.45, beamAlpha * 1.5)));
            beamGrad.addColorStop(0.5, hexToRgba(col, Math.min(0.25, beamAlpha * 0.7)));
            beamGrad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fillStyle = beamGrad;
            ctx.fill();
          }
        }

        // ── Mode: quantum_waves (NUEVO: Ondas Cuánticas Concéntricas desde el Centro) ─
        else if (mode === 'quantum_waves') {
          if (!hasAnyBackground) {
            const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxDim);
            grad.addColorStop(0, isLucid ? `${primaryColor}14` : '#040b18');
            grad.addColorStop(0.6, isLucid ? `${secondaryColor}0a` : '#02050c');
            grad.addColorStop(1, '#000205');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
          }

          // Disparar nuevos anillos concéntricos en picos de bombo
          const rings = quantumRingsRef.current;
          const kickSurge = sBass > 0.30 && bassDelta > 0.03;
          if (kickSurge && rings.length < 18) {
            rings.push({
              radius: 50 + Math.random() * 20,
              maxRadius: maxDim * (0.85 + Math.random() * 0.35),
              alpha: 0.85,
              lineWidth: 1.5,
              speed: 4.5 + sBass * 5.5,
              color: isLucid
                ? (rings.length % 2 === 0 ? primaryColor : secondaryColor)
                : rings.length % 2 === 0
                ? '#00f2fe'
                : '#ffd166',
            });
          }

          for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            ring.radius += ring.speed * (1 + sBass * 1.5) * atmoSpeed;
            ring.alpha *= 0.985;
            ring.lineWidth *= 0.995;

            if (ring.alpha < 0.01 || ring.radius >= ring.maxRadius) {
              rings.splice(i, 1);
              continue;
            }

            ctx.beginPath();
            ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = Math.max(0.75, ring.lineWidth);
            ctx.globalAlpha = ring.alpha * atmoGlow;
            ctx.stroke();
          }
        }

        ctx.restore();
      };

      // 1. Render primary atmosphere
      renderMode(atmosphere, transitionAlpha);

      // 2. Render optional blend atmosphere
      if (atmosphereBlend && atmosphereBlend !== 'none' && atmosphereBlend !== atmosphere) {
        renderMode(atmosphereBlend, 0.45 * atmoGlow);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    atmosphere,
    atmosphereBlend,
    atmoSpeed,
    atmoGlow,
    atmoSmoothing,
    getSmoothedData,
    musicSensitivity,
    isPlaying,
    isMicActive,
    isLucid,
    lucidTheme,
    autoMode,
    dynamicColor,
    primaryColor,
    secondaryColor,
    glowColor,
    blobSettings.kickThreshold,
    blobSettings.kickPower,
    customBg,
  ]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-[2] overflow-hidden" aria-hidden="true">
      {/* Proportional Custom Background Image Layer */}
      {effectiveCustomBg && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 overflow-hidden flex items-center justify-center"
          style={{
            opacity: bgOpacity,
            filter: effectiveBgBlur > 0 ? `blur(${effectiveBgBlur}px)` : undefined,
          }}
        >
          <img
            src={effectiveCustomBg}
            alt="Fondo Personalizado"
            className="w-full h-full transition-transform duration-300"
            style={{
              objectFit: bgFit,
              transform: `scale(${bgScale})`,
              transformOrigin: 'center center',
            }}
          />

          {/* Adaptive Text Contrast & Lucid Color Fusion Scrim Layer */}
          {bgContrastMode !== 'none' && (
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-300"
              style={{
                background:
                  bgContrastMode === 'deep_cinema'
                    ? `radial-gradient(ellipse at 50% 50%, rgba(3, 5, 12, ${textScrim * 0.75}) 0%, rgba(1, 2, 6, ${Math.min(1, textScrim * 1.15)}) 100%)`
                    : bgContrastMode === 'lucid_tint'
                    ? `radial-gradient(ellipse at 50% 40%, ${hexToRgba(primaryColor, themeTint * 0.35)} 0%, rgba(4, 6, 14, ${textScrim}) 85%), linear-gradient(180deg, rgba(3, 5, 12, ${textScrim * 0.8}) 0%, ${hexToRgba(secondaryColor, themeTint * 0.25)} 50%, rgba(1, 2, 6, ${textScrim * 1.05}) 100%)`
                    : /* text_clarity (default) */
                      `radial-gradient(ellipse at 50% 50%, rgba(3, 6, 14, ${textScrim * 0.65}) 0%, rgba(1, 3, 8, ${Math.min(0.98, textScrim * 1.1)}) 100%), linear-gradient(180deg, rgba(2, 4, 10, ${textScrim * 0.7}) 0%, transparent 40%, transparent 60%, rgba(2, 4, 10, ${textScrim * 0.85}) 100%)`,
              }}
            />
          )}
        </div>
      )}

      {/* Atmospheric Canvas Animation Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none transition-opacity duration-700"
      />
    </div>
  );
};

export default AtmosphereBackground;
