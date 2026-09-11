import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useVisualizer } from '../../hooks/useVisualizer';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
  lineWidth: number;
}

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

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

/**
 * AtmosphereBackground
 * Fullscreen atmospheric animated background layer with hardware-accelerated canvas.
 * Guaranteed visibility on all screens, responsive dynamic DPR, proportional custom image layer,
 * and 9 rich audiovisual reactive environments.
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
    visualizerMode,
  } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.2);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atmosphere = blobSettings.backgroundAtmosphere || 'none';
  const atmosphereBlend = blobSettings.atmosphereBlend || 'none';

  // Custom background image settings
  const customBg = blobSettings.customBackgroundImage;
  const bgOpacity = blobSettings.backgroundOpacity !== undefined ? blobSettings.backgroundOpacity : 0.85;
  const bgBlur = blobSettings.backgroundBlur !== undefined ? blobSettings.backgroundBlur : 0;
  const effectiveBgBlur = bgBlur;
  const bgFit = blobSettings.backgroundFit || 'cover';
  const bgScale = blobSettings.backgroundScale || 1.0;

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
  const lastKickTimeRef = useRef(0);

  // Transition smoothing between atmospheric states
  const currentAtmosphereRef = useRef<string>(atmosphere);
  const transitionAlphaRef = useRef(1.0);

  // Effect Entities
  const ripplesRef = useRef<Ripple[]>([]);
  const rainRef = useRef<RainDrop[]>([]);
  const sandRef = useRef<SandParticle[]>([]);
  const dustRef = useRef<MagicDust[]>([]);
  const starsRef = useRef<Star3D[]>([]);
  const matrixRef = useRef<MatrixColumn[]>([]);

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

    // 3. Dust / Snow / Embers for Sunset & Cosmic (~140 motes)
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

    // 5. Matrix Digital Columns (~50 columns)
    const matrixChars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ'.split('');
    const cols = Math.max(30, Math.floor(w / 26));
    const matrixCols: MatrixColumn[] = [];
    for (let i = 0; i < cols; i++) {
      const colLen = Math.floor(Math.random() * 18 + 8);
      const chars: string[] = [];
      for (let c = 0; c < colLen; c++) {
        chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
      }
      matrixCols.push({
        x: i * 26 + 13,
        y: Math.random() * -h,
        speed: 3.5 + Math.random() * 6.5,
        length: colLen,
        chars,
      });
    }
    matrixRef.current = matrixCols;
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

      prevBassRef.current = rawBass;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Helper function to render an atmospheric mode
      const renderMode = (mode: string, modeAlpha: number) => {
        ctx.save();
        ctx.globalAlpha = modeAlpha;

        // ── Mode: none (Ambient subtle space aura) ─────────────────────────
        if (mode === 'none') {
          if (!customBg) {
            const ambGrad = ctx.createRadialGradient(
              width * 0.5,
              height * 0.5,
              10,
              width * 0.5,
              height * 0.5,
              Math.max(width, height) * 0.75
            );
            ambGrad.addColorStop(
              0,
              isLucid ? `${primaryColor}22` : `rgba(0, 242, 254, ${0.08 + sBass * 0.08})`
            );
            ambGrad.addColorStop(
              0.55,
              isLucid ? `${secondaryColor}12` : `rgba(255, 8, 138, ${0.05 + sEnergy * 0.06})`
            );
            ambGrad.addColorStop(1, 'rgba(4, 6, 13, 0.95)');
            ctx.fillStyle = ambGrad;
            ctx.fillRect(0, 0, width, height);

            // Floating subtle starlight motes
            dustRef.current.slice(0, 70).forEach((d) => {
              d.y += d.vy * (0.6 + sEnergy * 0.4) * atmoSpeed;
              d.x += (d.vx + Math.sin(timeSec * 0.8 + d.twinklePhase) * 0.2) * atmoSpeed;
              if (d.y > height) {
                d.y = -6;
                d.x = Math.random() * width;
              }
              const a = d.alpha * (0.35 + Math.sin(timeSec * 2 + d.twinklePhase) * 0.25) * atmoGlow;
              ctx.beginPath();
              ctx.arc(d.x, d.y, d.size * 0.85, 0, Math.PI * 2);
              ctx.fillStyle = isLucid
                ? (d.twinklePhase > Math.PI ? primaryColor : secondaryColor)
                : `rgba(255, 255, 255, ${a})`;
              ctx.fill();
            });
          }
        }

        // ── Mode: sunset (Atardecer Épico DHONKIO & Silueta en Acantilado) ──
        else if (mode === 'sunset') {
          // 0. Full Dusk Sky Gradient
          if (!customBg) {
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

          // 4. Wanderer Silhouette Standing on Cliff Peak with Fluttering Ribbon
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

        // ── Mode: cyber_city (Silueta Cyberpunk & Rooftop Skyline) ─────────
        else if (mode === 'cyber_city') {
          const horizonY = height * 0.64;

          if (!customBg) {
            const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
            sky.addColorStop(0, '#03020a');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}25` : '#130424');
            sky.addColorStop(1, isLucid ? `${primaryColor}20` : '#32093e');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          // Neon horizon fog
          const cityFog = ctx.createLinearGradient(0, horizonY - 160, 0, height);
          cityFog.addColorStop(0, 'rgba(0,0,0,0)');
          cityFog.addColorStop(0.35, isLucid ? `${secondaryColor}40` : `rgba(255, 0, 128, ${0.32 * atmoGlow})`);
          cityFog.addColorStop(0.75, isLucid ? `${primaryColor}35` : `rgba(0, 242, 254, ${0.24 * atmoGlow})`);
          cityFog.addColorStop(1, '#02040b');
          ctx.fillStyle = cityFog;
          ctx.fillRect(0, horizonY - 160, width, height - (horizonY - 160));

          // Skyscrapers with neon edges & glowing windows
          const numTowers = 18;
          const towerW = width / numTowers;
          for (let i = 0; i < numTowers; i++) {
            const towerH = (45 + ((i * 41) % 120) + sBass * 28) * (height * 0.002);
            const tx = i * towerW;
            const ty = horizonY - towerH;

            ctx.fillStyle = '#04060f';
            ctx.fillRect(tx + 2, ty, towerW - 4, height - ty);

            const isNeon = i % 3 === 0;
            ctx.strokeStyle = isLucid
              ? (isNeon ? secondaryColor : primaryColor)
              : isNeon
              ? '#ff007f'
              : '#00f2fe';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(tx + 2, ty);
            ctx.lineTo(tx + towerW - 2, ty);
            ctx.stroke();

            const winRows = Math.floor(towerH / 14);
            const winCols = 2;
            for (let r = 0; r < winRows; r++) {
              for (let c = 0; c < winCols; c++) {
                if (((i + r + c) % 3) === 0) {
                  const wx = tx + 4 + c * (towerW * 0.4);
                  const wy = ty + 10 + r * 14;
                  ctx.fillStyle = isLucid
                    ? ((r + i) % 2 === 0 ? primaryColor : secondaryColor)
                    : (r + i) % 2 === 0
                    ? `rgba(0, 242, 254, ${0.45 + sEnergy * 0.45})`
                    : `rgba(255, 230, 0, ${0.45 + sBass * 0.45})`;
                  ctx.fillRect(wx, wy, 2.5, 3.5);
                }
              }
            }

            // Antennas with blinking beacons
            if (i % 4 === 1) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(tx + towerW * 0.5, ty);
              ctx.lineTo(tx + towerW * 0.5, ty - 24);
              ctx.stroke();

              const beaconAlpha = Math.sin(timeSec * 6 + i) > 0 ? 0.95 : 0.2;
              ctx.fillStyle = isLucid ? secondaryColor : `rgba(255, 30, 60, ${beaconAlpha})`;
              ctx.beginPath();
              ctx.arc(tx + towerW * 0.5, ty - 24, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Sweeping searchlight beams
          const beamAngle = Math.sin(timeSec * 0.8) * 0.45;
          const beamGrad = ctx.createLinearGradient(
            width * 0.22,
            horizonY,
            width * 0.22 + Math.tan(beamAngle) * height,
            0
          );
          beamGrad.addColorStop(0, isLucid ? `${primaryColor}40` : `rgba(0, 242, 254, ${0.28 * atmoGlow})`);
          beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(width * 0.22 - 20, horizonY);
          ctx.lineTo(width * 0.22 + 20, horizonY);
          ctx.lineTo(width * 0.22 + Math.tan(beamAngle) * height + 100, 0);
          ctx.lineTo(width * 0.22 + Math.tan(beamAngle) * height - 100, 0);
          ctx.closePath();
          ctx.fill();

          // Foreground rooftop silhouette
          ctx.fillStyle = '#010205';
          ctx.beginPath();
          ctx.moveTo(0, height * 0.84);
          ctx.lineTo(width * 0.42, height * 0.84);
          ctx.lineTo(width * 0.42, height * 0.91);
          ctx.lineTo(width, height * 0.91);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();
        }

        // ── Mode: cosmic_voyager (Viajero Cósmico & Luna Gigante) ───────────
        else if (mode === 'cosmic_voyager') {
          if (!customBg) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#02030a');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}18` : '#060c22');
            sky.addColorStop(1, isLucid ? `${primaryColor}20` : '#0c1836');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const moonX = width * 0.70;
          const moonY = height * 0.36;
          const moonR = Math.min(width, height) * (0.24 + sBass * 0.03);

          // Lunar corona
          const corona = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 2.3);
          corona.addColorStop(0, isLucid ? `${primaryColor}66` : `rgba(190, 225, 255, ${0.50 * atmoGlow})`);
          corona.addColorStop(0.5, isLucid ? `${secondaryColor}40` : `rgba(150, 95, 255, ${0.22 * atmoGlow})`);
          corona.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = corona;
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR * 2.3, 0, Math.PI * 2);
          ctx.fill();

          // Moon body
          const moonBody = ctx.createLinearGradient(moonX - moonR, moonY - moonR, moonX + moonR, moonY + moonR);
          moonBody.addColorStop(0, '#f8f9fa');
          moonBody.addColorStop(0.6, isLucid ? `${primaryColor}40` : '#cfd8dc');
          moonBody.addColorStop(1, '#455a64');
          ctx.fillStyle = moonBody;
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
          ctx.fill();

          // Craters
          ctx.fillStyle = 'rgba(70, 90, 110, 0.25)';
          ctx.beginPath();
          ctx.arc(moonX - moonR * 0.3, moonY - moonR * 0.2, moonR * 0.22, 0, Math.PI * 2);
          ctx.arc(moonX + moonR * 0.2, moonY + moonR * 0.3, moonR * 0.28, 0, Math.PI * 2);
          ctx.arc(moonX - moonR * 0.1, moonY + moonR * 0.4, moonR * 0.15, 0, Math.PI * 2);
          ctx.fill();

          // Aurora ribbons across the sky
          for (let w = 0; w < 2; w++) {
            const t = timeSec * (0.6 + w * 0.2);
            const grad = ctx.createLinearGradient(0, height * 0.3, width, height * 0.7);
            grad.addColorStop(0, isLucid ? `${primaryColor}45` : `rgba(0, 255, 180, ${0.22 * atmoGlow})`);
            grad.addColorStop(0.5, isLucid ? `${secondaryColor}40` : `rgba(180, 0, 255, ${0.25 * atmoGlow})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.moveTo(0, height * 0.5);
            for (let x = 0; x <= width; x += 30) {
              const yOff = Math.sin(x * 0.003 + t + w) * 50 + Math.cos(x * 0.006 - t) * 35;
              ctx.lineTo(x, height * 0.5 + yOff);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
          }

          // Mountain ridge silhouette
          ctx.fillStyle = '#03050c';
          ctx.beginPath();
          ctx.moveTo(0, height * 0.82);
          ctx.bezierCurveTo(width * 0.25, height * 0.78, width * 0.45, height * 0.85, width * 0.65, height * 0.80);
          ctx.bezierCurveTo(width * 0.80, height * 0.76, width * 0.92, height * 0.79, width, height * 0.84);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          // Stargazer pointing to the moon
          const px = width * 0.48;
          const py = height * 0.805;
          const pScale = Math.min(width, height) * 0.0016;

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(px, py - 35 * pScale, 4.5 * pScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(px - 3 * pScale, py - 30 * pScale);
          ctx.lineTo(px + 4 * pScale, py - 30 * pScale);
          ctx.lineTo(px + 7 * pScale, py);
          ctx.lineTo(px - 7 * pScale, py);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = isLucid ? primaryColor : '#000000';
          ctx.lineWidth = 2.4 * pScale;
          ctx.beginPath();
          ctx.moveTo(px + 2 * pScale, py - 27 * pScale);
          ctx.lineTo(px + 16 * pScale, py - 40 * pScale);
          ctx.stroke();

          // Cosmic dust
          dustRef.current.forEach((d) => {
            d.y += d.vy * (1 + sEnergy * 0.6) * atmoSpeed;
            d.x += (d.vx + Math.sin(timeSec * 2 + d.twinklePhase) * 0.3) * atmoSpeed;
            if (d.y > height) {
              d.y = -10;
              d.x = Math.random() * width;
            }
            const alpha = d.alpha * (0.6 + Math.sin(timeSec * 3 + d.twinklePhase) * 0.4) * atmoGlow;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = isLucid
              ? (d.twinklePhase > Math.PI ? primaryColor : secondaryColor)
              : `rgba(210, 240, 255, ${alpha})`;
            ctx.fill();
          });
        }

        // ── Mode: aurora (Ondas Boreales Neón) ──────────────────────────────
        else if (mode === 'aurora') {
          if (!customBg) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#02050f');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}15` : '#05111c');
            sky.addColorStop(1, isLucid ? `${primaryColor}20` : '#081e2b');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const layers = 5;
          for (let l = 0; l < layers; l++) {
            const t = timeSec * (0.4 + l * 0.15);
            const baseH = height * (0.28 + l * 0.11);
            const grad = ctx.createLinearGradient(0, baseH - 120, 0, baseH + 180);

            if (isLucid) {
              const startColor = l % 2 === 0 ? primaryColor : secondaryColor;
              const endColor = l % 2 === 0 ? secondaryColor : primaryColor;
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(0.4, `${startColor}50`);
              grad.addColorStop(0.8, `${endColor}35`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
            } else {
              const hue = (130 + l * 45 + sBass * 40) % 360;
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(0.4, `hsla(${hue}, 100%, 65%, ${0.28 * atmoGlow})`);
              grad.addColorStop(0.8, `hsla(${(hue + 60) % 360}, 90%, 60%, ${0.18 * atmoGlow})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
            }

            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {
              const yOffset =
                Math.sin(x * 0.003 + t + l) * 60 +
                Math.cos(x * 0.006 - t * 0.7) * 40 +
                Math.sin(x * 0.01 + t * 1.5) * (20 + sBass * 45);
              ctx.lineTo(x, baseH + yOffset);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }

        // ── Mode: stars (Warp Speed Starfield 3D) ───────────────────────────
        else if (mode === 'stars') {
          const cx = width / 2;
          const cy = height / 2;

          if (!customBg) {
            const sky = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.85);
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

        // ── Mode: matrix (Lluvia Digital Cyberpunk) ─────────────────────────
        else if (mode === 'matrix') {
          if (!customBg) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#000803');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}10` : '#001407');
            sky.addColorStop(1, isLucid ? `${primaryColor}12` : '#000804');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const matrixCols = matrixRef.current;
          ctx.font = '13px monospace';

          matrixCols.forEach((col) => {
            col.y += col.speed * (1 + sBass * 1.6) * atmoSpeed;
            if (col.y > height + col.length * 16) {
              col.y = Math.random() * -120;
              col.speed = 3.5 + Math.random() * 6.5;
            }

            for (let i = 0; i < col.length; i++) {
              const charY = col.y - i * 16;
              if (charY < -20 || charY > height) continue;

              const isLeader = i === 0;
              const alpha = isLeader ? 1.0 : Math.max(0.1, (1 - i / col.length) * 0.8 * atmoGlow);

              ctx.fillStyle = isLeader
                ? '#ffffff'
                : isLucid
                ? (i % 3 === 0 ? secondaryColor : primaryColor)
                : `rgba(0, 255, 128, ${alpha})`;

              const char = col.chars[i % col.chars.length];
              ctx.fillText(char, col.x, charY);
            }
          });
        }

        // ── Mode: ripples (Gotas de Agua en Bombo) ──────────────────────────
        else if (mode === 'ripples') {
          if (!customBg) {
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#020914');
            sky.addColorStop(0.5, isLucid ? `${secondaryColor}12` : '#041526');
            sky.addColorStop(1, isLucid ? `${primaryColor}14` : '#030c18');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);
          }

          const ripples = ripplesRef.current;
          for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.radius += ((r.maxRadius - r.radius) * 0.07 + 2.5) * atmoSpeed;
            r.alpha *= 0.96;
            r.lineWidth *= 0.985;

            if (r.alpha < 0.015 || r.radius >= r.maxRadius) {
              ripples.splice(i, 1);
              continue;
            }

            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = isLucid
              ? (i % 2 === 0 ? primaryColor : secondaryColor)
              : `hsla(${r.hue}, 100%, 65%, ${r.alpha * atmoGlow})`;
            ctx.lineWidth = Math.max(1, r.lineWidth);
            ctx.shadowColor = isLucid ? glowColor : ctx.strokeStyle;
            ctx.shadowBlur = 14 * r.alpha * atmoGlow;
            ctx.stroke();
          }
        }

        // ── Mode: rain (Lluvia Neón Estelar) ────────────────────────────────
        else if (mode === 'rain') {
          if (!customBg) {
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

        // ── Mode: sand (Mareas de Arena Marina & Sub-bajo) ─────────────────
        else if (mode === 'sand') {
          if (!customBg) {
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
    blobSettings.kickThreshold,
    blobSettings.kickPower,
    customBg,
  ]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden" aria-hidden="true">
      {/* Proportional Custom Background Image Layer */}
      {customBg && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 overflow-hidden flex items-center justify-center"
          style={{
            opacity: bgOpacity,
            filter: effectiveBgBlur > 0 ? `blur(${effectiveBgBlur}px)` : undefined,
          }}
        >
          <img
            src={customBg}
            alt="Fondo Personalizado"
            className="w-full h-full transition-transform duration-300"
            style={{
              objectFit: bgFit,
              transform: `scale(${bgScale})`,
              transformOrigin: 'center center',
            }}
          />
          {isLucid && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at center, ${primaryColor}22 0%, transparent 65%), linear-gradient(to bottom, transparent, ${secondaryColor}25)`,
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
