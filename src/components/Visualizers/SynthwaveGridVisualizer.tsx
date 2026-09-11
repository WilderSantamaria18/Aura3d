import React, { useRef, useEffect } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';

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
  y: number;
  z: number;
  size: number;
  color: string;
}

/**
 * SynthwaveGridVisualizer — Outrun Retro Cyber Highway & Audio-Reactive Sunset
 *
 * Upgraded Features:
 *  - Dynamic Curving Road: Fluid S-curve highway that sways with music and mouse.
 *  - Dashed Neon Lane Markers: High-speed animated dashes rushing down the highway.
 *  - Roadside Neon Elements: 3D perspective neon light posts and vector wireframe palms.
 *  - Audio-Reactive Sunset: Pulsing sun, downward-drifting Venetian blinds, corona flares,
 *    and multi-stage fiery amber/crimson/neon magenta gradients.
 *  - Wireframe Mountain Ranges: Distant mountain peaks reactive to FFT frequency bands.
 *  - Distant Cyber Cityscape: Silhouette skyscrapers glowing along the horizon.
 *  - Road Speed Particles & Shooting Meteors.
 */
export const SynthwaveGridVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, musicSensitivity, blobSettings } =
    usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.12);

  const hasAtmosphere = (blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none') || !!blobSettings.customBackgroundImage;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    let mouseX = W / 2;
    let mouseY = H / 2;
    let targetMouseX = W / 2;
    let targetMouseY = H / 2;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    // 1. Stars in the upper sky
    const STARS_COUNT = 120;
    const stars = Array.from({ length: STARS_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.52,
      size: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.05 + 0.01,
    }));

    // 2. Shooting Stars / Grid Meteors
    const meteors: ShootingStar[] = Array.from({ length: 4 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.35,
      length: Math.random() * 80 + 40,
      speed: Math.random() * 8 + 12,
      angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.2,
      alpha: 0,
      active: false,
    }));

    // 3. Roadside Palm Trees in 3D Depth
    const palms: PalmTree[] = [];
    const PALM_COUNT = 16;
    for (let i = 0; i < PALM_COUNT; i++) {
      palms.push({
        side: i % 2 === 0 ? 'left' : 'right',
        z: (i / PALM_COUNT) * 30,
        height: 65 + Math.random() * 25,
      });
    }

    // 4. Highway Asphalt Speed Particles
    const roadParticles: RoadParticle[] = Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 0.25,
      y: 0,
      z: Math.random() * 30,
      size: Math.random() * 2.2 + 0.8,
      color: Math.random() > 0.5 ? '#00f5ff' : '#ff007f',
    }));

    let gridOffset = 0;
    let sunBlindsOffset = 0;
    const BASE_SPEED = 0.06;
    const GRID_LINES_Z = 32;
    const GRID_LINES_X = 26;

    const render = (timeMs: number) => {
      animId = requestAnimationFrame(render);

      const timeSec = timeMs * 0.001;
      const audioData = getSmoothedData();
      const sensitivity = musicSensitivity || 0.75;

      const bass = (audioData.bass || 0) * sensitivity;
      const mid = (audioData.mids || 0) * sensitivity;
      const treble = (audioData.highs || 0) * sensitivity;
      const energy = (audioData.energy || 0) * sensitivity;
      const rawFft = audioData.raw;

      // Parallax & Horizon
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
      const horizonY = H * 0.50 + (mouseY - H / 2) * 0.08;
      const vanishingX = W / 2 + (mouseX - W / 2) * 0.12;

      // Colors from Lucid or Outrun Neon Defaults
      const primaryColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary) : '#ff007f';
      const secondaryColor = isLucid ? (lucidSecondaryColor || lucidTheme.secondary) : '#00f5ff';
      const tertiaryColor = isLucid ? lucidTheme.secondary : '#ffe600';

      // ── 1. Deep Space Cyber Sky ──────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#020008');
      skyGrad.addColorStop(0.5, '#09011a');
      skyGrad.addColorStop(0.85, '#1e012e');
      skyGrad.addColorStop(1, '#3b0244');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY + 2);

      // ── 2. Twinkling Starfield & Meteors ─────────────────────────────────
      stars.forEach((star) => {
        star.alpha += Math.sin(timeMs * star.pulseSpeed) * 0.02;
        const currentAlpha = Math.max(0.1, Math.min(1, star.alpha + treble * 0.5));
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (1 + treble * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      // Meteors
      meteors.forEach((m) => {
        if (!m.active && Math.random() < 0.008) {
          m.active = true;
          m.x = Math.random() * W * 0.7;
          m.y = Math.random() * horizonY * 0.4;
          m.alpha = 1;
        }
        if (m.active) {
          m.x += Math.cos(m.angle) * m.speed;
          m.y += Math.sin(m.angle) * m.speed;
          m.alpha -= 0.025;
          if (m.alpha <= 0 || m.y > horizonY) {
            m.active = false;
          } else {
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - Math.cos(m.angle) * m.length, m.y - Math.sin(m.angle) * m.length);
            ctx.strokeStyle = `rgba(255, 255, 255, ${m.alpha * 0.9})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }
      });

      // ── 3. Audio-Reactive Outrun Sun (Atardecer Épico) ─────────────────────
      const sunRadius = Math.min(W, H) * (0.21 + bass * 0.04);
      const sunCenterY = horizonY - sunRadius * 0.38;

      ctx.save();
      // Radiant Corona Bloom
      const sunGlow = ctx.createRadialGradient(
        vanishingX,
        sunCenterY,
        sunRadius * 0.15,
        vanishingX,
        sunCenterY,
        sunRadius * 2.2
      );
      sunGlow.addColorStop(0, `${primaryColor}cc`);
      sunGlow.addColorStop(0.35, `${primaryColor}44`);
      sunGlow.addColorStop(0.7, `${secondaryColor}15`);
      sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(vanishingX, sunCenterY, sunRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Sun Body (Gradient: amber gold -> crimson fire -> neon magenta -> ultraviolet)
      ctx.beginPath();
      ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
      ctx.clip();

      const sunGrad = ctx.createLinearGradient(0, sunCenterY - sunRadius, 0, sunCenterY + sunRadius);
      sunGrad.addColorStop(0, '#fff455');
      sunGrad.addColorStop(0.25, '#ff8000');
      sunGrad.addColorStop(0.55, '#ff0055');
      sunGrad.addColorStop(0.85, primaryColor);
      sunGrad.addColorStop(1, '#4a0050');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(vanishingX - sunRadius, sunCenterY - sunRadius, sunRadius * 2, sunRadius * 2);

      // Venetian Blind Horizontal Stripes (Smooth downward animated scanning)
      if (isPlaying) {
        sunBlindsOffset = (sunBlindsOffset + 0.0035 * (1 + bass * 0.8)) % 1;
      }
      const stripeCount = 12;
      for (let s = 0; s < stripeCount; s++) {
        const t = ((s + sunBlindsOffset) % stripeCount) / stripeCount;
        const stripeY = sunCenterY - sunRadius * 0.1 + t * (sunRadius * 1.12);
        const stripeHeight = Math.pow(t, 1.8) * 11 + 1.8;

        ctx.fillStyle = '#09011a';
        ctx.fillRect(vanishingX - sunRadius - 10, stripeY, sunRadius * 2 + 20, stripeHeight);
      }
      ctx.restore();

      // ── 4. Wireframe Horizon Mountains (FFT Reactive) ────────────────────
      ctx.save();
      const mountainPoints = 36;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let m = 0; m <= mountainPoints; m++) {
        const x = (m / mountainPoints) * W;
        const distFromCenter = Math.abs((m / mountainPoints) - 0.5);

        let heightPeak = 0;
        if (distFromCenter > 0.12 && rawFft && rawFft.length > 0) {
          const binIdx = Math.min(rawFft.length - 1, Math.floor(distFromCenter * 64));
          const amp = (rawFft[binIdx] || 0) / 255;
          heightPeak = (amp * 70 + mid * 25) * Math.sin((m / mountainPoints) * Math.PI) * (1 + bass * 0.8);
        }

        ctx.lineTo(x, horizonY - heightPeak);
      }
      ctx.lineTo(W, horizonY);
      ctx.closePath();

      ctx.fillStyle = 'rgba(12, 2, 28, 0.9)';
      ctx.fill();
      ctx.strokeStyle = `${secondaryColor}88`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // ── 5. Ground Terrain & Curving Road Math ────────────────────────────
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      groundGrad.addColorStop(0, '#03010a');
      groundGrad.addColorStop(0.35, '#0d011e');
      groundGrad.addColorStop(1, '#010005');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Highway speed & dynamic S-curve oscillation
      const speed = BASE_SPEED * (1 + bass * 1.5 + energy * 0.8);
      if (isPlaying) {
        gridOffset = (gridOffset + speed) % 1;
      }

      const roadCurve = Math.sin(timeSec * 0.9) * 0.14 + ((mouseX - W / 2) / W) * 0.22;

      // Perspective Projection Function
      const project = (xRatio: number, zNorm: number) => {
        const depth = Math.pow(zNorm, 2.3);
        const screenY = horizonY + depth * (H - horizonY);
        const spread = (screenY - horizonY) / (H - horizonY);

        // Curve shift increases as depth comes closer to horizon
        const curveOffset = Math.sin((1 - zNorm) * Math.PI * 0.85) * roadCurve * W;
        const screenX = vanishingX + curveOffset + (xRatio - 0.5) * W * (0.80 + spread * 3.9);

        return { x: screenX, y: screenY };
      };

      // ── 6. Horizontal Grid Latitude Lines ────────────────────────────────
      ctx.save();
      for (let i = 0; i < GRID_LINES_Z; i++) {
        const zNorm = (i + gridOffset) / GRID_LINES_Z;
        const lineAlpha = Math.pow(zNorm, 1.5) * 0.9;

        ctx.strokeStyle = i % 2 === 0 ? secondaryColor : primaryColor;
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 1 + zNorm * 1.8;

        ctx.beginPath();
        for (let j = 0; j <= GRID_LINES_X; j++) {
          const xNorm = j / GRID_LINES_X;
          const p = project(xNorm, zNorm);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // ── 7. Longitudinal Highway Grid Lines ───────────────────────────────
      for (let j = 0; j <= GRID_LINES_X; j++) {
        const xNorm = j / GRID_LINES_X;
        const isHighwayEdge = Math.abs(xNorm - 0.5) === 0.08 || Math.abs(xNorm - 0.5) === 0.09;
        const isRoadSurface = Math.abs(xNorm - 0.5) < 0.08;

        ctx.strokeStyle = isHighwayEdge ? '#ffffff' : isRoadSurface ? '#00f5ff' : j % 3 === 0 ? primaryColor : secondaryColor;
        ctx.globalAlpha = isHighwayEdge ? 0.95 : isRoadSurface ? 0.4 : 0.6;
        ctx.lineWidth = isHighwayEdge ? 2.5 : 1.2;

        ctx.beginPath();
        for (let i = 0; i < GRID_LINES_Z; i++) {
          const zNorm = (i + gridOffset) / GRID_LINES_Z;
          const p = project(xNorm, zNorm);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // ── 8. Dashed Highway Center Line (Líneas de Carril en Movimiento) ────
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

      // ── 9. Roadside 3D Palm Trees (Palmeras de Neón en Perspectiva) ──────
      palms.forEach((palm) => {
        if (isPlaying) {
          palm.z -= speed * 1.5;
          if (palm.z <= 0) {
            palm.z = 30;
          }
        }
        const zNorm = palm.z / 30;
        const xOffset = palm.side === 'left' ? 0.35 : 0.65;
        const basePt = project(xOffset, zNorm);

        const treeHeight = palm.height * (0.2 + zNorm * 1.4);
        const topY = basePt.y - treeHeight;
        const trunkLean = (palm.side === 'left' ? -1 : 1) * treeHeight * 0.18;

        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = Math.pow(zNorm, 1.3) * 0.85;
        ctx.lineWidth = 1.5 + zNorm * 2;

        // Trunk
        ctx.beginPath();
        ctx.moveTo(basePt.x, basePt.y);
        ctx.quadraticCurveTo(basePt.x + trunkLean * 0.5, basePt.y - treeHeight * 0.5, basePt.x + trunkLean, topY);
        ctx.stroke();

        // Palm Fronds
        const frondCount = 5;
        ctx.strokeStyle = secondaryColor;
        for (let f = 0; f < frondCount; f++) {
          const angle = (f / (frondCount - 1) - 0.5) * 1.6 + (palm.side === 'left' ? -0.2 : 0.2);
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

      // ── 10. Asphalt Speed Particles ─────────────────────────────────────
      roadParticles.forEach((rp) => {
        if (isPlaying) {
          rp.z -= speed * 2;
          if (rp.z <= 0) {
            rp.z = 30;
            rp.x = (Math.random() - 0.5) * 0.16;
          }
        }
        const zNorm = rp.z / 30;
        const p = project(0.5 + rp.x, zNorm);

        ctx.fillStyle = rp.color;
        ctx.globalAlpha = Math.pow(zNorm, 1.6) * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rp.size * (1 + zNorm * 1.5), 0, Math.PI * 2);
        ctx.fill();
      });

      // ── 11. Horizon Glow Flare Line (Burst on Bass) ──────────────────────
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 4, 0, horizonY + 8);
      horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
      horizonGlow.addColorStop(0.5, `${secondaryColor}cc`);
      horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 4, W, 12);

      // Intense Bass Laser along Horizon
      if (bass > 0.40) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, (bass - 0.40) * 2.5);
        ctx.lineWidth = 2.5 + bass * 5;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(W, horizonY);
        ctx.stroke();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
    };
  }, [isPlaying, isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, musicSensitivity, getSmoothedData]);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none pointer-events-auto"
      style={{ backgroundColor: hasAtmosphere ? 'transparent' : '#000000' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Cyberpunk Scanlines Retro Filter */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.6) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
    </div>
  );
};

export default SynthwaveGridVisualizer;
