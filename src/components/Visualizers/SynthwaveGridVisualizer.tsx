import React, { useRef, useEffect } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';

export const SynthwaveGridVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, musicSensitivity } =
    usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.12);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
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

    // Stars in the upper sky
    const STARS_COUNT = 90;
    const stars = Array.from({ length: STARS_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.52,
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.05 + 0.01,
    }));

    let gridOffset = 0;
    const GRID_SPEED = 2.4;
    const GRID_LINES_Z = 30;
    const GRID_LINES_X = 24;

    const render = () => {
      animId = requestAnimationFrame(render);

      const audioData = getSmoothedData();
      const sensitivity = musicSensitivity || 0.75;

      const bass = (audioData.bass || 0) * sensitivity;
      const mid = (audioData.mids || 0) * sensitivity;
      const treble = (audioData.highs || 0) * sensitivity;
      const rawFft = audioData.raw;

      // Smooth mouse parallax
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
      const horizonY = H * 0.52 + (mouseY - H / 2) * 0.08;
      const vanishingX = W / 2 + (mouseX - W / 2) * 0.15;

      // Colors from Lucid or Outrun Neon Defaults
      const primaryColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary) : '#ff007f';
      const secondaryColor = isLucid ? (lucidSecondaryColor || lucidTheme.secondary) : '#00f5ff';

      // 1. Deep Space Sky Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#03010d');
      skyGrad.addColorStop(0.65, '#0b0221');
      skyGrad.addColorStop(1, '#2b023d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY + 2);

      // 2. Audio-reactive Starfield
      stars.forEach((star) => {
        star.alpha += Math.sin(Date.now() * star.pulseSpeed) * 0.02;
        const currentAlpha = Math.max(0.1, Math.min(1, star.alpha + treble * 0.5));
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (1 + treble * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Segmented Outrun Synthwave Sun
      const sunRadius = Math.min(W, H) * (0.19 + bass * 0.035);
      const sunCenterY = horizonY - sunRadius * 0.42;

      ctx.save();
      // Sun ambient glow
      const sunGlow = ctx.createRadialGradient(
        vanishingX,
        sunCenterY,
        sunRadius * 0.2,
        vanishingX,
        sunCenterY,
        sunRadius * 1.8
      );
      sunGlow.addColorStop(0, `${primaryColor}aa`);
      sunGlow.addColorStop(0.5, `${primaryColor}33`);
      sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(vanishingX, sunCenterY, sunRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Sun body (gradient: top yellow/orange -> bottom magenta/pink)
      ctx.beginPath();
      ctx.arc(vanishingX, sunCenterY, sunRadius, 0, Math.PI * 2);
      ctx.clip();

      const sunGrad = ctx.createLinearGradient(0, sunCenterY - sunRadius, 0, sunCenterY + sunRadius);
      sunGrad.addColorStop(0, '#ffea00');
      sunGrad.addColorStop(0.35, '#ff5500');
      sunGrad.addColorStop(0.75, primaryColor);
      sunGrad.addColorStop(1, '#660055');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(vanishingX - sunRadius, sunCenterY - sunRadius, sunRadius * 2, sunRadius * 2);

      // Outrun Horizontal Venetian Blinds Stripes
      const stripeCount = 14;
      for (let s = 0; s < stripeCount; s++) {
        const t = s / stripeCount;
        const stripeY = sunCenterY - sunRadius * 0.15 + t * (sunRadius * 1.15);
        const stripeHeight = Math.pow(t, 1.8) * 9 + 1.2;

        ctx.fillStyle = '#0b0221';
        ctx.fillRect(vanishingX - sunRadius, stripeY, sunRadius * 2, stripeHeight);
      }
      ctx.restore();

      // 4. Infinite Retro Grid Terrain Ground
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      groundGrad.addColorStop(0, '#04010a');
      groundGrad.addColorStop(0.3, '#0e0220');
      groundGrad.addColorStop(1, '#020005');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Grid speed updates
      if (isPlaying) {
        gridOffset = (gridOffset + GRID_SPEED * (1 + bass * 1.2)) % 1;
      }

      ctx.save();
      // Grid Perspective Projection
      const projectGrid = (xRatio: number, zRatio: number) => {
        // Non-linear depth curve
        const depth = Math.pow(zRatio, 2.2);
        const screenY = horizonY + depth * (H - horizonY);
        const spread = (screenY - horizonY) / (H - horizonY);
        const screenX = vanishingX + (xRatio - 0.5) * W * (0.85 + spread * 3.8);

        // Mountain height calculation (audio reactive mountains on flanks, flat central road)
        const distFromCenter = Math.abs(xRatio - 0.5);
        let mountainElevation = 0;
        if (distFromCenter > 0.12 && rawFft && rawFft.length > 0) {
          const binIndex = Math.min(
            rawFft.length - 1,
            Math.floor((distFromCenter - 0.12) * 3.2 * 48)
          );
          const rawAmp = (rawFft[binIndex] || 0) / 255;
          const peakFactor = Math.pow((distFromCenter - 0.12) / 0.38, 1.5);
          mountainElevation = (rawAmp * 95 * peakFactor + mid * 15) * (1 - zRatio * 0.6) * sensitivity;
        }

        return { x: screenX, y: screenY - mountainElevation };
      };

      // Draw horizontal distance lines
      for (let i = 0; i < GRID_LINES_Z; i++) {
        const zNorm = (i + gridOffset) / GRID_LINES_Z;
        const lineAlpha = Math.pow(zNorm, 1.4) * 0.85;

        ctx.strokeStyle = i % 2 === 0 ? secondaryColor : primaryColor;
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 1 + zNorm * 1.6;

        ctx.beginPath();
        for (let j = 0; j <= GRID_LINES_X; j++) {
          const xNorm = j / GRID_LINES_X;
          const pt = projectGrid(xNorm, zNorm);
          if (j === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Draw longitudinal depth lines
      for (let j = 0; j <= GRID_LINES_X; j++) {
        const xNorm = j / GRID_LINES_X;
        const isCenterRoad = Math.abs(xNorm - 0.5) < 0.08;

        ctx.strokeStyle = isCenterRoad ? '#ffffff' : j % 3 === 0 ? primaryColor : secondaryColor;
        ctx.globalAlpha = isCenterRoad ? 0.9 : 0.65;
        ctx.lineWidth = isCenterRoad ? 2.2 : 1.2;

        ctx.beginPath();
        for (let i = 0; i < GRID_LINES_Z; i++) {
          const zNorm = (i + gridOffset) / GRID_LINES_Z;
          const pt = projectGrid(xNorm, zNorm);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      ctx.restore();

      // 5. Horizon Glow Line & Neon Laser Flares
      ctx.save();
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 4, 0, horizonY + 8);
      horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
      horizonGlow.addColorStop(0.5, `${secondaryColor}cc`);
      horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 4, W, 12);

      // Bass kick pulse flare along horizon
      if (bass > 0.45) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, (bass - 0.45) * 2.2);
        ctx.lineWidth = 2 + bass * 4;
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
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      {/* Subtle Retro Scanlines Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.5) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
    </div>
  );
};

export default SynthwaveGridVisualizer;
