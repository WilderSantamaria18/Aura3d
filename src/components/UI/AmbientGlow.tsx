import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { fftWorkerService } from '../../services/fftWorkerService';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}

export const AmbientGlow: React.FC = React.memo(() => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const mouseEffectsEnabled = usePlayerStore((s) => s.mouseEffectsEnabled);
  const { beatPulse, primaryColor: aiColor } = useAIAudioEngine();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, rawX: -100, rawY: -100, prevX: -100, prevY: -100 });
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200, visible: false });

  // Get token color dynamically
  const tokenColor = typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--ios-teal').trim() || 'rgb(43, 220, 210)'
    : 'rgb(43, 220, 210)';

  const activeColor = isLucid ? (lucidPrimary || tokenColor) : (aiColor || tokenColor);

  // Mouse tracking for parallax and specular follower (only active if user enables it)
  useEffect(() => {
    if (!mouseEffectsEnabled) {
      setCursorPos((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      mouseRef.current = { x: 0, y: 0, targetX: 0, targetY: 0, rawX: -100, rawY: -100, prevX: -100, prevY: -100 };
      return;
    }

    let timeoutId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.rawX = e.clientX;
      mouseRef.current.rawY = e.clientY;
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 40;
      mouseRef.current.targetY = (e.clientY / window.innerHeight - 0.5) * 40;

      setCursorPos({ x: e.clientX, y: e.clientY, visible: true });

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setCursorPos((prev) => ({ ...prev, visible: false }));
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.clearTimeout(timeoutId);
    };
  }, [mouseEffectsEnabled]);

  // Ambient Space Dust & Fluid Cursor Trail Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 35;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      size: 1.0 + Math.random() * 2.2,
      alpha: 0.15 + Math.random() * 0.45,
      color: Math.random() > 0.5 ? activeColor : 'rgba(255, 255, 255, 0.9)',
    }));

    const trailParticles: TrailParticle[] = [];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerp for parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // ── Spawn Fluid Stardust Trail on Cursor Move (only if user enabled mouse effects) ──
      if (mouseEffectsEnabled) {
        const curX = mouseRef.current.rawX;
        const curY = mouseRef.current.rawY;
        const prevX = mouseRef.current.prevX;
        const prevY = mouseRef.current.prevY;
        const activeColorVal = activeColor || 'rgb(43, 220, 210)';

        if (curX > 0 && curY > 0 && prevX > 0 && prevY > 0) {
          const dx = curX - prevX;
          const dy = curY - prevY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 3) {
            const workerBands = fftWorkerService.getLatestBands();
            const trebleBoost = workerBands.treble || 0;
            const spawnCount = Math.min(4, Math.floor(dist / 8) + 1);

            for (let s = 0; s < spawnCount; s++) {
              const lerpFactor = s / spawnCount;
              trailParticles.push({
                x: prevX + dx * lerpFactor + (Math.random() - 0.5) * 6,
                y: prevY + dy * lerpFactor + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * (0.8 + trebleBoost * 1.5) + dx * 0.08,
                vy: (Math.random() - 0.5) * (0.8 + trebleBoost * 1.5) + dy * 0.08,
                size: 1.2 + Math.random() * (2.2 + trebleBoost * 2),
                alpha: 0.65 + Math.random() * 0.35,
                color: Math.random() > 0.3 ? activeColorVal : 'rgba(255, 255, 255, 0.9)',
                life: 1.0,
              });
            }
          }
        }

        mouseRef.current.prevX = curX;
        mouseRef.current.prevY = curY;
      }

      // ── Draw Ambient Floating Space Dust ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const drawX = p.x + (mouseEffectsEnabled ? mouseRef.current.x * (p.size * 0.4) : 0);
        const drawY = p.y + (mouseEffectsEnabled ? mouseRef.current.y * (p.size * 0.4) : 0);

        ctx.save();
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.6 + beatPulse * 0.4);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.fill();
        ctx.restore();
      }

      // ── Draw Cursor Stardust Fluid Trail (only if active) ──
      if (mouseEffectsEnabled && trailParticles.length > 0) {
        for (let j = trailParticles.length - 1; j >= 0; j--) {
          const tp = trailParticles[j];
          tp.x += tp.vx;
          tp.y += tp.vy;
          tp.vx *= 0.94; // Friction
          tp.vy *= 0.94;
          tp.life -= 0.024; // Decay
          tp.alpha = tp.life * 0.7;

          if (tp.life <= 0) {
            trailParticles.splice(j, 1);
            continue;
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, tp.size * tp.life, 0, Math.PI * 2);
          ctx.fillStyle = tp.color;
          ctx.globalAlpha = Math.max(0, tp.alpha);
          ctx.shadowColor = tp.color;
          ctx.shadowBlur = tp.size * 4;
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeColor, beatPulse, mouseEffectsEnabled]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none">
      {/* ── 1. Cinematic Vignette & Deep Contrast Backdrop ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 52%, rgba(2, 4, 10, 0.45) 82%, rgba(1, 2, 6, 0.88) 100%)',
        }}
      />

      {/* ── 2. Specular Follower Spotlight (Smooth radial beam that illuminates glass edges) ── */}
      {mouseEffectsEnabled && cursorPos.visible && (
        <div
          className="absolute w-[440px] h-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-opacity duration-500 mix-blend-screen"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            background: `radial-gradient(circle, ${activeColor}18 0%, ${activeColor}05 45%, transparent 70%)`,
          }}
        />
      )}

      {/* ── 3. Ambient Space Dust & Cursor Stardust Trail Canvas ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
});

export default AmbientGlow;
