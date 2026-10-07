import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { useChameleonPalette } from '../../hooks/useChameleonPalette';

interface SparkParticle {
  active: boolean;
  edge: 0 | 1 | 2 | 3; // 0: Top, 1: Right, 2: Bottom, 3: Left
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  sparkleSpeed: number;
}

const MAX_PARTICLES_HIGH = 120;
const MAX_PARTICLES_LOW = 45;

/**
 * EdgeReactiveSparks — Partículas Reactivas Perimetrales
 *
 * Emits vibrant electric micro-sparks along the screen perimeter synchronized
 * with audio bass kicks, drops, and liquid album color transitions.
 */
export const EdgeReactiveSparks: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const performanceTier = usePlayerStore((s) => s.performanceTier);
  const palette = useChameleonPalette();

  const prevTrackIdRef = useRef<string | null>(null);
  const prevBassRef = useRef<number>(0);
  const lastKickTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const maxParticles = performanceTier === 'eco' ? MAX_PARTICLES_LOW : MAX_PARTICLES_HIGH;
    const pool: SparkParticle[] = Array.from({ length: maxParticles }, () => ({
      active: false,
      edge: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 8,
      thickness: 1.5,
      color: '#00e5ff',
      alpha: 1,
      life: 0,
      maxLife: 60,
      sparkleSpeed: 0.1,
    }));

    const colors = [palette.primary, palette.secondary, palette.accent, '#ffffff'];

    const spawnSpark = (edge?: 0 | 1 | 2 | 3, speedMult = 1, customColor?: string) => {
      const p = pool.find((particle) => !particle.active);
      if (!p) return;

      const chosenEdge = edge !== undefined ? edge : ((Math.floor(Math.random() * 4)) as 0 | 1 | 2 | 3);
      p.active = true;
      p.edge = chosenEdge;
      p.color = customColor || colors[Math.floor(Math.random() * colors.length)];
      p.maxLife = 30 + Math.random() * 45;
      p.life = 0;
      p.alpha = 0.8 + Math.random() * 0.2;
      p.thickness = 1 + Math.random() * 2;
      p.length = (6 + Math.random() * 18) * speedMult;
      p.sparkleSpeed = 0.08 + Math.random() * 0.15;

      const baseSpeed = (2 + Math.random() * 5) * speedMult;
      const direction = Math.random() > 0.5 ? 1 : -1;

      switch (chosenEdge) {
        case 0: // Top
          p.x = Math.random() * width;
          p.y = Math.random() * 4;
          p.vx = baseSpeed * direction;
          p.vy = (Math.random() - 0.2) * 0.8;
          break;
        case 1: // Right
          p.x = width - Math.random() * 4;
          p.y = Math.random() * height;
          p.vx = -(Math.random() - 0.2) * 0.8;
          p.vy = baseSpeed * direction;
          break;
        case 2: // Bottom
          p.x = Math.random() * width;
          p.y = height - Math.random() * 4;
          p.vx = baseSpeed * direction;
          p.vy = -(Math.random() - 0.2) * 0.8;
          break;
        case 3: // Left
          p.x = Math.random() * 4;
          p.y = Math.random() * height;
          p.vx = (Math.random() - 0.2) * 0.8;
          p.vy = baseSpeed * direction;
          break;
      }
    };

    const triggerBurst = (count: number, speedMult = 1.6) => {
      for (let i = 0; i < count; i++) {
        spawnSpark(undefined, speedMult);
      }
    };

    // Track change burst celebration
    if (prevTrackIdRef.current && prevTrackIdRef.current !== currentTrack?.id) {
      triggerBurst(Math.floor(maxParticles * 0.6), 2.2);
    }
    prevTrackIdRef.current = currentTrack?.id || null;

    let rafId: number;
    let smoothBass = 0;

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Check audio kicks
      if (isPlaying) {
        const freq = AudioEngine.getInstance().getFrequencyData();
        const rawBass = freq.bass || 0;
        smoothBass += (rawBass - smoothBass) * 0.2;

        const bassSpike = rawBass - prevBassRef.current;
        prevBassRef.current = rawBass;

        // Kick onset detection (> 0.42 bass level with sharp rising edge)
        if (rawBass > 0.42 && bassSpike > 0.14 && now - lastKickTimeRef.current > 180) {
          lastKickTimeRef.current = now;
          const kickCount = Math.min(24, Math.floor(rawBass * 28));
          // Emit concentrated sparks on bottom and perimeter
          for (let k = 0; k < kickCount; k++) {
            const edge = Math.random() < 0.6 ? 2 : ((Math.floor(Math.random() * 4)) as 0 | 1 | 2 | 3);
            spawnSpark(edge, 1.4 + rawBass * 1.2);
          }
        }

        // Ambient intermittent perimeter crawlers
        if (Math.random() < 0.25 + smoothBass * 0.4) {
          spawnSpark();
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.life++;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Constrain near edge
        if (p.edge === 0) p.y = Math.max(0, Math.min(10, p.y));
        if (p.edge === 1) p.x = Math.max(width - 10, Math.min(width, p.x));
        if (p.edge === 2) p.y = Math.max(height - 10, Math.min(height, p.y));
        if (p.edge === 3) p.x = Math.max(0, Math.min(10, p.x));

        // Wrap around corners
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const progress = p.life / p.maxLife;
        const fade = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        const currentAlpha = Math.max(0, Math.min(1, p.alpha * fade));

        // Draw electric streak with bright core head
        const headX = p.x;
        const headY = p.y;
        const tailX = p.x - (p.vx > 0 ? p.length : -p.length);
        const tailY = p.y - (p.vy > 0 ? p.length : -p.length);

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, p.color);
        grad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = grad;
        ctx.lineWidth = p.thickness;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Specular spark head point
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(headX, headY, p.thickness * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, currentTrack?.id, performanceTier, palette.primary, palette.secondary, palette.accent]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none select-none z-[3] overflow-hidden"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default EdgeReactiveSparks;
