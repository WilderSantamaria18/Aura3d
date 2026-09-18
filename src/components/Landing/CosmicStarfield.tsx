import React, { useRef, useEffect } from 'react';

interface Star {
  x: number;
  y: number;
  z: number; // 0.1 (far) to 1.0 (near)
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
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

/**
 * CosmicStarfield
 * Fondo de partículas estelares ultrarrealista optimizado para la LandingScreen de Aura3D.
 * - 3 capas de profundidad 3D con centelleo sinusoidal físico (twinkling)
 * - Estrellas fugaces ocasionales y polvo estelar cósmico
 * - Renderizado en Canvas 2D acelerado por hardware con DPR clamped a 2
 * - Sin movimiento brusco con el ratón: deriva cósmica suave, orgánica y constante
 * - Auto-pausa cuando la pestaña está oculta para conservar 100% de GPU
 */
export const CosmicStarfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Cosmic color temperatures
    const STAR_COLORS = [
      'rgba(255, 255, 255, ',   // Diamante puro
      'rgba(224, 247, 250, ',   // Cian estelar helado
      'rgba(178, 235, 242, ',   // Neón tenue
      'rgba(225, 190, 231, ',   // Violeta celestial
      'rgba(255, 248, 225, ',   // Oro tenue estelar
    ];

    // Initialize 300 star particles across 3 depth planes
    const STAR_COUNT = Math.min(320, Math.floor((width * height) / 3800));
    const stars: Star[] = new Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const z = Math.random() * 0.9 + 0.1; // 0.1 (far) to 1.0 (near)
      const colorPrefix = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      stars[i] = {
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        size: (0.6 + z * 1.5) * dpr,
        alpha: 0.2 + z * 0.7,
        baseAlpha: 0.25 + z * 0.65,
        twinkleSpeed: 0.8 + Math.random() * 2.2,
        twinklePhase: Math.random() * Math.PI * 2,
        color: colorPrefix,
      };
    }

    // Shooting stars pool (reused to prevent GC)
    const shootingStars: ShootingStar[] = [
      { x: 0, y: 0, length: 0, speed: 0, angle: 0, alpha: 0, active: false },
      { x: 0, y: 0, length: 0, speed: 0, angle: 0, alpha: 0, active: false },
    ];

    let lastShootingStarTime = performance.now();
    let nextShootingStarDelay = 4000 + Math.random() * 6000;

    const spawnShootingStar = (now: number) => {
      const inactive = shootingStars.find((s) => !s.active);
      if (!inactive) return;

      inactive.x = Math.random() * width * 0.8;
      inactive.y = Math.random() * height * 0.4;
      inactive.length = (80 + Math.random() * 120) * dpr;
      inactive.speed = (600 + Math.random() * 400) * dpr;
      inactive.angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.2; // ~45 degrees downward
      inactive.alpha = 1.0;
      inactive.active = true;

      lastShootingStarTime = now;
      nextShootingStarDelay = 6000 + Math.random() * 9000;
    };

    // Resize handling with proper DPR
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let lastTime = performance.now();
    let isVisible = true;

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // High performance 60fps render loop
    const render = (now: number) => {
      if (!isVisible) return;

      const delta = Math.min(0.1, (now - lastTime) * 0.001);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // 1. Render and animate stars
      for (let i = 0; i < STAR_COUNT; i++) {
        const star = stars[i];

        // Organic slow cosmic upward/sideway drift
        star.y -= 4 * star.z * delta;
        star.x += 1.5 * star.z * delta;

        if (star.y < -10) {
          star.y = height + 10;
          star.x = Math.random() * width;
        }
        if (star.x > width + 10) {
          star.x = -10;
        }

        // Real-time sinusoidal twinkle
        const twinkle = Math.sin(now * 0.0015 * star.twinkleSpeed + star.twinklePhase);
        const currentAlpha = Math.max(0.08, Math.min(1.0, star.baseAlpha + twinkle * 0.28));

        ctx.fillStyle = `${star.color}${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size / dpr, 0, Math.PI * 2);
        ctx.fill();

        // Extra delicate glow aura for close / prominent stars
        if (star.z > 0.8) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, (star.size * 2.2) / dpr, 0, Math.PI * 2);
          ctx.fillStyle = `${star.color}${currentAlpha * 0.18})`;
          ctx.fill();
        }
      }

      // 2. Check and spawn shooting stars
      if (now - lastShootingStarTime > nextShootingStarDelay) {
        spawnShootingStar(now);
      }

      // 3. Render active shooting stars
      for (let j = 0; j < shootingStars.length; j++) {
        const meteor = shootingStars[j];
        if (!meteor.active) continue;

        meteor.x += Math.cos(meteor.angle) * meteor.speed * delta;
        meteor.y += Math.sin(meteor.angle) * meteor.speed * delta;
        meteor.alpha -= 1.1 * delta;

        if (meteor.alpha <= 0 || meteor.x > width + 100 || meteor.y > height + 100) {
          meteor.active = false;
          continue;
        }

        const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length;
        const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length;

        const grad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0)');
        grad.addColorStop(0.7, `rgba(0, 229, 255, ${meteor.alpha * 0.4})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${meteor.alpha * 0.95})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();

        // Brilliant head spark
        ctx.fillStyle = `rgba(255, 255, 255, ${meteor.alpha})`;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#03050c]">
      {/* 1. Deep Space Cosmic Fog / Ambient Glows */}
      <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.08] blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-purple-600/[0.10] blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-[700px] h-[500px] rounded-full bg-rose-500/[0.07] blur-[170px] pointer-events-none" />

      {/* 2. Deep High-Precision Starfield Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default CosmicStarfield;
