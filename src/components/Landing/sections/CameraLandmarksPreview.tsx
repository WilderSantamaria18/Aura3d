import React, { useRef, useEffect } from 'react';

export const CameraLandmarksPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // 21 base joints normalized relative to wrist (0)
    // MediaPipe Hand topology connections
    const connections: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17], // Palm base
    ];

    const baseLandmarks = [
      { x: 0, y: 0.8 }, // 0: Wrist
      { x: -0.22, y: 0.65 }, { x: -0.32, y: 0.45 }, { x: -0.38, y: 0.28 }, { x: -0.44, y: 0.15 }, // 1-4 Thumb
      { x: -0.15, y: 0.35 }, { x: -0.18, y: 0.15 }, { x: -0.19, y: -0.05 }, { x: -0.20, y: -0.25 }, // 5-8 Index
      { x: 0.0, y: 0.32 }, { x: 0.0, y: 0.10 }, { x: 0.0, y: -0.12 }, { x: 0.0, y: -0.32 }, // 9-12 Middle
      { x: 0.15, y: 0.35 }, { x: 0.18, y: 0.15 }, { x: 0.19, y: -0.05 }, { x: 0.20, y: -0.22 }, // 13-16 Ring
      { x: 0.28, y: 0.42 }, { x: 0.32, y: 0.25 }, { x: 0.35, y: 0.10 }, { x: 0.38, y: -0.05 }, // 17-20 Pinky
    ];

    const render = () => {
      time += 0.025;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 30;

      ctx.clearRect(0, 0, w, h);

      // Subtle dark grid background for spatial scanning feel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Calculate transformed points with smooth kinetic sway
      const scale = Math.min(w, h) * 0.42;
      const points = baseLandmarks.map((pt, idx) => {
        const swayX = Math.sin(time + idx * 0.15) * 12;
        const swayY = Math.cos(time * 1.2 + idx * 0.2) * 8;
        return {
          x: cx + pt.x * scale + swayX,
          y: cy + pt.y * scale + swayY,
        };
      });

      // Draw skeleton connecting lines
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;

      connections.forEach(([from, to]) => {
        const p1 = points[from];
        const p2 = points[to];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw landmark points
      points.forEach((pt, i) => {
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 5.5 : 3.5;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = isTip ? 16 : 8;
        ctx.fill();

        if (isTip) {
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[320px] sm:min-h-[400px] flex items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-b from-white/[0.04] to-black/70 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.8)]">
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        className="w-full h-full max-w-[400px] max-h-[400px] object-contain"
      />
      {/* Telemetry Tag */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="font-mono text-[9px] tracking-widest text-white/80 uppercase">
          MEDIAPIPE 21-LANDMARK GESTURE ENGINE
        </span>
      </div>
    </div>
  );
};
