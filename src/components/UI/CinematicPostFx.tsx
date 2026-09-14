import React, { useEffect, useRef } from 'react';

/**
 * CinematicPostFx
 * Canvas overlay strictly sanitized:
 * - NO click droplets or ripples
 * - NO full-screen chromatic aberration / amber background flashes on kicks
 * Completely clean backdrop preservation.
 */
export const CinematicPostFx: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

export default CinematicPostFx;
