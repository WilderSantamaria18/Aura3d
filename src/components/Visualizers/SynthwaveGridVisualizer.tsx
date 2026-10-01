import React, { useRef, useEffect } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { QUALITY_PROFILES, canvasDprFor } from '../../utils/qualityProfile';
import { clampDelta, frameScale, rateForDt, smoothToward } from '../../utils/frameTiming';
import { useMotionScaleRef } from '../../hooks/useMotionScale';

interface PalmTree {
  side: 'left' | 'right';
  z: number;
  height: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

interface RoadParticle {
  x: number;
  z: number;
  size: number;
  color: string;
}

const MAX_STARS = 180;
const MAX_PARTICLES = 60;
const PALM_COUNT = 16;
const GRID_LINES_Z = 32;
const GRID_LINES_X = 26;
/** Los carriles de la carretera son las líneas j=11 y j=15 de la rejilla longitudinal (borde izquierdo y derecho) */
const ROAD_LEFT_J = 11;
const ROAD_RIGHT_J = 15;
const BASE_SPEED = 0.06;
const MOUNTAIN_POINTS = 36;
const CITY_BUILDINGS = 14;

/**
 * SynthwaveGridVisualizer — conducción nocturna Outrun.
 *
 * Composición en planos: cielo → sol → ciudad y montañas → suelo → carretera (asfalto oscuro con bordes y
 * discontinua central) → partículas. El dibujo vive en un único efecto que NO se reinicia al tocar ajustes:
 * los ajustes llegan por una ref, de modo que mover un slider no recoloca palmeras ni estrellas.
 */
export const SynthwaveGridVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getSmoothedData } = useVisualizer(0.12);
  const effectiveTier = usePlayerStore((s) => s.effectiveTier);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const musicSensitivity = usePlayerStore((s) => s.musicSensitivity);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidSecondaryColor = usePlayerStore((s) => s.lucidSecondaryColor);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const mouseEffectsEnabled = usePlayerStore((s) => s.mouseEffectsEnabled);
  const motionRef = useMotionScaleRef();
  const hasAtmosphere = Boolean(blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none');

  // Todo lo que cambia en caliente se lee desde aquí dentro del bucle de dibujo
  const cfg = {
    tier: effectiveTier,
    isPlaying,
    sensitivity: musicSensitivity || 0.75,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
    settings: blobSettings,
    mouse: mouseEffectsEnabled,
  };
  const cfgRef = useRef(cfg);
  useEffect(() => {
    cfgRef.current = cfg;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let W = 1;
    let H = 1;
    let dpr = 1;
    let lastMs = 0;

    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX / Math.max(1, window.innerWidth);
      targetMouseY = e.clientY / Math.max(1, window.innerHeight);
    };
    if (!coarse) window.addEventListener('mousemove', onMouseMove);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = canvasDprFor(QUALITY_PROFILES[cfgRef.current.tier], window.devicePixelRatio);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Elementos de la escena. Las posiciones están normalizadas (0..1) para sobrevivir a un cambio de tamaño.
    const stars = Array.from({ length: MAX_STARS }, () => ({
      x: Math.random(),
      y: Math.random() * 0.52,
      size: Math.random() * 1.6 + 0.6,
      base: Math.random() * 0.6 + 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.6 + 0.4,
    }));
    const meteors: ShootingStar[] = Array.from({ length: 4 }, () => ({
      x: 0,
      y: 0,
      length: Math.random() * 80 + 40,
      speed: Math.random() * 8 + 12,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
      alpha: 0,
      active: false,
    }));
    const palms: PalmTree[] = Array.from({ length: PALM_COUNT }, (_, i) => ({
      side: i % 2 === 0 ? 'left' : 'right',
      z: (i / PALM_COUNT) * 30,
      height: 65 + Math.random() * 25,
    }));
    const particles: RoadParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      x: (Math.random() - 0.5) * 0.25,
      z: Math.random() * 30,
      size: Math.random() * 2.2 + 0.8,
      color: Math.random() > 0.5 ? '#00f5ff' : '#ff007f',
    }));
    // Alturas ya suavizadas (el FFT crudo salta de un frame a otro)
    const mountainSm = new Float32Array(MOUNTAIN_POINTS + 1);
    const citySm = new Float32Array(CITY_BUILDINGS);

    let gridOffset = 0;
    let sunBlindsOffset = 0;

    const render = (timeMs: number) => {
      animId = requestAnimationFrame(render);
      const c = cfgRef.current;
      const s = c.settings;
      const dt = clampDelta(lastMs ? (timeMs - lastMs) / 1000 : 1 / 60);
      lastMs = timeMs;
      const f = frameScale(dt);
      const motion = motionRef.current;

      // El tamaño de píxel sigue a la calidad efectiva (no oscila: solo cambia si el nivel cambia)
      const wantDpr = canvasDprFor(QUALITY_PROFILES[c.tier], window.devicePixelRatio);
      if (wantDpr !== dpr) resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const quality = QUALITY_PROFILES[c.tier];

      const timeSec = timeMs * 0.001;
      const audioData = getSmoothedData();
      const bass = (audioData.bass || 0) * c.sensitivity;
      const mid = (audioData.mids || 0) * c.sensitivity;
      const treble = (audioData.highs || 0) * c.sensitivity;
      const energy = (audioData.energy || 0) * c.sensitivity;
      const rawFft = audioData.raw;

      const synthTheme = s.synthwaveTheme || 'outrun';
      const sunStyle = s.synthwaveSunStyle || 'venetian';
      const showMountains = s.synthwaveMountains !== false;
      const showCity = s.synthwaveCity !== false;
      const showPalms = s.synthwavePalms !== false;
      const curveIntensity = s.synthwaveCurveIntensity ?? 1;
      const speedMult = s.synthwaveSpeed ?? 1;
      const cursor = c.mouse && !coarse ? (s.synthwaveCursor ?? 1) : 0;
      const starDensity = s.synthwaveStars ?? 1;
      const particleDensity = s.synthwaveParticles ?? 1;

      // Parallax y horizonte (con cursor 0 o en táctil la composición queda fija)
      mouseX = smoothToward(mouseX, targetMouseX, 0.05, dt);
      mouseY = smoothToward(mouseY, targetMouseY, 0.05, dt);
      const horizonY = H * 0.5 + (mouseY - 0.5) * H * 0.08 * cursor;
      const vanishingX = W / 2 + (mouseX - 0.5) * W * 0.12 * cursor;

      let primaryColor = '#ff007f';
      let secondaryColor = '#00f5ff';
      let tertiaryColor = '#ffe600';
      let skyTop = '#020008';
      let skyMid = '#09011a';
      let skyBottom = '#3b0244';
      if (c.isLucid) {
        primaryColor = c.lucidPrimaryColor || c.lucidTheme.primary || '#ff007f';
        secondaryColor = c.lucidSecondaryColor || c.lucidTheme.secondary || '#00f5ff';
        tertiaryColor = c.lucidTheme.secondary || '#ffe600';
      } else if (synthTheme === 'cyber') {
        primaryColor = '#00ff66';
        secondaryColor = '#00ffff';
        tertiaryColor = '#ff00aa';
        skyTop = '#000803';
        skyMid = '#011a09';
        skyBottom = '#02381e';
      } else if (synthTheme === 'vaporwave') {
        primaryColor = '#f3c4fb';
        secondaryColor = '#a1c4fd';
        tertiaryColor = '#ffb38a';
        skyTop = '#150a21';
        skyMid = '#221133';
        skyBottom = '#482759';
      } else if (synthTheme === 'sunset_overdrive') {
        primaryColor = '#ff4800';
        secondaryColor = '#ffcc00';
        tertiaryColor = '#ff0055';
        skyTop = '#0d0100';
        skyMid = '#260400';
        skyBottom = '#540800';
      }

      // ── 1. Cielo ─────────────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, skyTop);
      skyGrad.addColorStop(0.5, skyMid);
      skyGrad.addColorStop(0.85, skyBottom);
      skyGrad.addColorStop(1, '#000000');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY + 2);

      // ── 2. Estrellas y meteoros ──────────────────────────────────────────
      const drawStars = Math.min(MAX_STARS, Math.round(120 * starDensity));
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < drawStars; i++) {
        const st = stars[i];
        const twinkle = 0.65 + 0.35 * Math.sin(timeSec * st.speed + st.phase);
        ctx.globalAlpha = Math.max(0.1, Math.min(1, st.base * twinkle + treble * 0.35));
        ctx.beginPath();
        ctx.arc(st.x * W, st.y * 1.9 * horizonY, st.size * (1 + treble * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (starDensity > 0) {
        meteors.forEach((m) => {
          if (!m.active && Math.random() < 0.5 * dt * motion) {
            m.active = true;
            m.x = Math.random() * W * 0.7;
            m.y = Math.random() * horizonY * 0.4;
            m.alpha = 1;
          }
          if (m.active) {
            m.x += Math.cos(m.angle) * m.speed * f;
            m.y += Math.sin(m.angle) * m.speed * f;
            m.alpha -= 0.025 * f;
            if (m.alpha <= 0 || m.y > horizonY) {
              m.active = false;
            } else {
              ctx.beginPath();
              ctx.moveTo(m.x, m.y);
              ctx.lineTo(m.x - Math.cos(m.angle) * m.length, m.y - Math.sin(m.angle) * m.length);
              ctx.strokeStyle = `rgba(255, 255, 255, ${m.alpha * 0.8})`;
              ctx.lineWidth = 1.6;
              ctx.stroke();
            }
          }
        });
      }

      // ── 3. Sol ───────────────────────────────────────────────────────────
      const sunRadius = Math.min(W, H) * (0.21 + bass * 0.04);
      const sunCenterY = horizonY - sunRadius * 0.38;

      ctx.save();
      const sunGlow = ctx.createRadialGradient(vanishingX, sunCenterY, sunRadius * 0.15, vanishingX, sunCenterY, sunRadius * 2.2);
      sunGlow.addColorStop(0, `${primaryColor}b0`);
      sunGlow.addColorStop(0.35, `${primaryColor}38`);
      sunGlow.addColorStop(0.7, `${secondaryColor}12`);
      sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(vanishingX, sunCenterY, sunRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      if (sunStyle === 'eclipse') {
        ctx.beginPath();
        ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#010006';
        ctx.fill();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3.5 + bass * 5;
        ctx.shadowColor = secondaryColor;
        ctx.shadowBlur = (24 + bass * 30) * quality.glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (sunStyle === 'wireframe') {
        ctx.beginPath();
        ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 2, 20, 0.7)';
        ctx.fill();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        const rotPhase = timeSec * 0.8 * motion + bass * 0.5;
        for (let ring = 1; ring <= 5; ring++) {
          const rY = (ring / 6) * sunRadius;
          const rX = Math.sqrt(Math.max(0, sunRadius * sunRadius - rY * rY));
          ctx.beginPath();
          ctx.ellipse(vanishingX, sunCenterY - rY * 0.6, rX, rX * 0.35 * Math.abs(Math.sin(rotPhase)), 0, 0, Math.PI * 2);
          ctx.ellipse(vanishingX, sunCenterY + rY * 0.6, rX, rX * 0.35 * Math.abs(Math.sin(rotPhase)), 0, 0, Math.PI * 2);
          ctx.strokeStyle = secondaryColor;
          ctx.globalAlpha = 0.5 + mid * 0.4;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (sunStyle === 'corona') {
        const rayCount = 18;
        for (let ray = 0; ray < rayCount; ray++) {
          const ang = (ray / rayCount) * Math.PI * 2 + timeSec * 0.2 * motion;
          const rayLen = sunRadius * (1.1 + (rawFft && rawFft[ray * 2] ? (rawFft[ray * 2] / 255) * 0.45 : mid * 0.35));
          ctx.beginPath();
          ctx.moveTo(vanishingX + Math.cos(ang) * sunRadius * 0.9, sunCenterY + Math.sin(ang) * sunRadius * 0.9);
          ctx.lineTo(vanishingX + Math.cos(ang) * rayLen, sunCenterY + Math.sin(ang) * rayLen);
          ctx.strokeStyle = ray % 2 === 0 ? primaryColor : secondaryColor;
          ctx.lineWidth = 2 + bass * 2.5;
          ctx.stroke();
        }
        // Cuerpo del sol: degradado radial real (antes se asignaba un texto CSS inválido y no se dibujaba)
        const body = ctx.createRadialGradient(vanishingX, sunCenterY, 0, vanishingX, sunCenterY, sunRadius);
        body.addColorStop(0, tertiaryColor);
        body.addColorStop(0.7, primaryColor);
        body.addColorStop(1, '#4a0050');
        ctx.beginPath();
        ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = body;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
        ctx.clip();
        const sunGrad = ctx.createLinearGradient(0, sunCenterY - sunRadius, 0, sunCenterY + sunRadius);
        sunGrad.addColorStop(0, tertiaryColor);
        sunGrad.addColorStop(0.3, primaryColor);
        sunGrad.addColorStop(0.7, secondaryColor);
        sunGrad.addColorStop(1, '#060012');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(vanishingX - sunRadius, sunCenterY - sunRadius, sunRadius * 2, sunRadius * 2);
        if (c.isPlaying) sunBlindsOffset = (sunBlindsOffset + 0.0035 * (1 + bass * 0.8) * f * motion) % 1;
        const stripeCount = 12;
        for (let k = 0; k < stripeCount; k++) {
          const t = ((k + sunBlindsOffset) % stripeCount) / stripeCount;
          const stripeY = sunCenterY - sunRadius * 0.1 + t * (sunRadius * 1.12);
          const stripeHeight = Math.pow(t, 1.8) * 11 + 1.8;
          ctx.fillStyle = '#09011a';
          ctx.fillRect(vanishingX - sunRadius - 10, stripeY, sunRadius * 2 + 20, stripeHeight);
        }
      }
      ctx.restore();

      // ── 4. Ciudad y montañas (alturas suavizadas) ────────────────────────
      const smoothK = rateForDt(0.2, dt);
      if (showCity) {
        const cityWidth = W * 0.42;
        const cityStartX = vanishingX - cityWidth * 0.5;
        ctx.save();
        for (let b = 0; b < CITY_BUILDINGS; b++) {
          const bw = (cityWidth / CITY_BUILDINGS) * 0.85;
          const bx = cityStartX + (b / CITY_BUILDINGS) * cityWidth;
          const bSeed = ((b * 47) % 19) / 19;
          const target = 18 + bSeed * 45 + (rawFft && rawFft[b * 3] ? (rawFft[b * 3] / 255) * 18 : mid * 14);
          citySm[b] += (target - citySm[b]) * smoothK;
          const bh = citySm[b];
          ctx.fillStyle = 'rgba(6, 2, 16, 0.95)';
          ctx.fillRect(bx, horizonY - bh, bw, bh);
          ctx.strokeStyle = `${primaryColor}40`;
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, horizonY - bh, bw, bh);
          if (b % 3 === 0) {
            ctx.fillStyle = Math.sin(timeSec * 4 + b) > 0 ? '#ff0055' : '#00ffff';
            ctx.beginPath();
            ctx.arc(bx + bw * 0.5, horizonY - bh - 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      if (showMountains) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let m = 0; m <= MOUNTAIN_POINTS; m++) {
          const x = (m / MOUNTAIN_POINTS) * W;
          const distFromCenter = Math.abs(m / MOUNTAIN_POINTS - 0.5);
          let target = 0;
          if (rawFft && rawFft.length > 0) {
            const binIdx = Math.min(rawFft.length - 1, Math.floor(distFromCenter * 64));
            const amp = (rawFft[binIdx] || 0) / 255;
            // Rampa suave desde el centro: el hueco bajo el sol se abre sin pendientes en cuña
            const ramp = Math.min(1, Math.max(0, (distFromCenter - 0.08) / 0.22));
            target = (amp * 70 + mid * 26) * Math.sin((m / MOUNTAIN_POINTS) * Math.PI) * (1 + bass * 0.6) * ramp * ramp * (3 - 2 * ramp);
          }
          mountainSm[m] += (target - mountainSm[m]) * smoothK;
          ctx.lineTo(x, horizonY - mountainSm[m]);
        }
        ctx.lineTo(W, horizonY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(10, 1, 24, 0.88)';
        ctx.fill();
        ctx.strokeStyle = `${secondaryColor}aa`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }

      // ── 5. Suelo ─────────────────────────────────────────────────────────
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      groundGrad.addColorStop(0, '#03010a');
      groundGrad.addColorStop(0.35, '#0d011e');
      groundGrad.addColorStop(1, '#010005');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      const kickSpeedBoost = audioData.kick ? 0.45 * (audioData.kickStrength || 1) : 0;
      const speed = BASE_SPEED * speedMult * (0.5 + 0.5 * motion) * (1 + bass * 1.6 + energy * 0.9 + kickSpeedBoost);
      if (c.isPlaying) gridOffset = (gridOffset + speed * f) % 1;

      const roadCurve = (Math.sin(timeSec * 0.9) * 0.14 * motion + (mouseX - 0.5) * 0.22 * cursor) * curveIntensity;
      const project = (xRatio: number, zNorm: number) => {
        const depth = Math.pow(zNorm, 2.3);
        const screenY = horizonY + depth * (H - horizonY);
        const spread = (screenY - horizonY) / (H - horizonY);
        const curveOffset = Math.sin((1 - zNorm) * Math.PI * 0.85) * roadCurve * W;
        return { x: vanishingX + curveOffset + (xRatio - 0.5) * W * (0.8 + spread * 3.9), y: screenY };
      };

      // ── 6. Rejilla del entorno (latitudes + longitudes fuera de la calzada) ─
      ctx.save();
      for (let i = 0; i < GRID_LINES_Z; i++) {
        const zNorm = (i + gridOffset) / GRID_LINES_Z;
        ctx.strokeStyle = i % 2 === 0 ? secondaryColor : primaryColor;
        ctx.globalAlpha = Math.pow(zNorm, 1.5) * 0.8;
        ctx.lineWidth = 1 + zNorm * 1.6;
        ctx.beginPath();
        for (let j = 0; j <= GRID_LINES_X; j++) {
          const p = project(j / GRID_LINES_X, zNorm);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (let j = 0; j <= GRID_LINES_X; j++) {
        if (j >= ROAD_LEFT_J && j <= ROAD_RIGHT_J) continue; // la calzada se dibuja aparte
        ctx.strokeStyle = j % 3 === 0 ? primaryColor : secondaryColor;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let i = 0; i < GRID_LINES_Z; i++) {
          const p = project(j / GRID_LINES_X, (i + gridOffset) / GRID_LINES_Z);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // ── 7. Calzada: asfalto oscuro, bordes y discontinua central ─────────
      const leftX = ROAD_LEFT_J / GRID_LINES_X;
      const rightX = ROAD_RIGHT_J / GRID_LINES_X;
      const ROAD_STEPS = 28;
      ctx.globalAlpha = 0.93;
      ctx.fillStyle = '#05010f';
      ctx.beginPath();
      for (let k = 0; k <= ROAD_STEPS; k++) {
        const p = project(leftX, Math.max(0.001, k / ROAD_STEPS));
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      for (let k = ROAD_STEPS; k >= 0; k--) {
        const p = project(rightX, Math.max(0.001, k / ROAD_STEPS));
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();

      for (const edgeX of [leftX, rightX]) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let k = 0; k <= ROAD_STEPS; k++) {
          const p = project(edgeX, Math.max(0.001, k / ROAD_STEPS));
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      const DASH_SEGMENTS = 14;
      for (let d = 0; d < DASH_SEGMENTS; d++) {
        const zStart = ((d * 2 + gridOffset * 2) % (DASH_SEGMENTS * 2)) / (DASH_SEGMENTS * 2);
        const zEnd = Math.min(1, zStart + 0.05);
        if (zStart < 1 && zEnd > zStart) {
          const p1 = project(0.5, zStart);
          const p2 = project(0.5, zEnd);
          ctx.strokeStyle = tertiaryColor;
          ctx.globalAlpha = Math.pow(zStart, 1.4) * 0.95;
          ctx.lineWidth = 2.5 + zStart * 4;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // ── 8. Palmeras ──────────────────────────────────────────────────────
      if (showPalms) {
        palms.forEach((palm) => {
          if (c.isPlaying) {
            palm.z -= speed * 1.5 * f;
            if (palm.z <= 0) palm.z += 30;
          }
          const zNorm = palm.z / 30;
          const basePt = project(palm.side === 'left' ? 0.3 : 0.7, zNorm);
          const treeHeight = palm.height * (0.2 + zNorm * 1.4);
          const topY = basePt.y - treeHeight;
          const trunkLean = (palm.side === 'left' ? -1 : 1) * treeHeight * 0.18;
          // Aparecen y se desvanecen con la distancia para no «saltar» al reciclarse
          const fade = Math.min(1, zNorm * 5) * Math.min(1, (1 - zNorm) * 8 + 0.2);
          ctx.strokeStyle = primaryColor;
          ctx.globalAlpha = Math.pow(zNorm, 1.3) * 0.8 * fade;
          ctx.lineWidth = 1.5 + zNorm * 2;
          ctx.beginPath();
          ctx.moveTo(basePt.x, basePt.y);
          ctx.quadraticCurveTo(basePt.x + trunkLean * 0.5, basePt.y - treeHeight * 0.5, basePt.x + trunkLean, topY);
          ctx.stroke();
          const frondCount = 5;
          ctx.strokeStyle = secondaryColor;
          for (let fr = 0; fr < frondCount; fr++) {
            const angle = (fr / (frondCount - 1) - 0.5) * 1.6 + (palm.side === 'left' ? -0.2 : 0.2);
            const frondLen = treeHeight * 0.45;
            ctx.beginPath();
            ctx.moveTo(basePt.x + trunkLean, topY);
            ctx.quadraticCurveTo(
              basePt.x + trunkLean + Math.cos(angle) * frondLen * 0.6,
              topY - Math.sin(angle) * frondLen * 0.3,
              basePt.x + trunkLean + Math.cos(angle) * frondLen,
              topY + Math.abs(Math.sin(angle)) * frondLen * 0.4
            );
            ctx.stroke();
          }
        });
      }

      // ── 9. Partículas de asfalto ─────────────────────────────────────────
      const drawParticles = Math.min(MAX_PARTICLES, Math.round(40 * particleDensity));
      for (let i = 0; i < drawParticles; i++) {
        const rp = particles[i];
        if (c.isPlaying) {
          rp.z -= speed * 2 * f;
          if (rp.z <= 0) {
            rp.z += 30;
            rp.x = (Math.random() - 0.5) * 0.16;
          }
        }
        const zNorm = rp.z / 30;
        const p = project(0.5 + rp.x, zNorm);
        ctx.fillStyle = rp.color;
        ctx.globalAlpha = Math.pow(zNorm, 1.6) * 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rp.size * (1 + zNorm * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 10. Línea de horizonte ───────────────────────────────────────────
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 4, 0, horizonY + 8);
      horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
      horizonGlow.addColorStop(0.5, `${secondaryColor}cc`);
      horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 4, W, 12);

      if (bass > 0.4) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.min(0.55, (bass - 0.4) * 1.6);
        ctx.lineWidth = 2 + bass * 3;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(W, horizonY);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      ro.disconnect();
    };
  }, [getSmoothedData, motionRef]);

  const scan = blobSettings.synthwaveScanlines ?? 0.25;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none pointer-events-auto"
      style={{ backgroundColor: hasAtmosphere ? 'transparent' : '#000000' }}
    >
      <canvas ref={canvasRef} data-visualizer="true" className="absolute inset-0 w-full h-full block" />

      {/* Líneas de escaneo retro (intensidad ajustable; 0 las quita) */}
      {scan > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: scan,
            backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.6) 50%)',
            backgroundSize: '100% 4px',
          }}
        />
      )}
    </div>
  );
};

export default SynthwaveGridVisualizer;
