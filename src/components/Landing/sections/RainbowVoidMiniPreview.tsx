import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../../stores/playerStore';
import { audioEngine } from '../../../services/audioEngine';

export const RainbowVoidMiniPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const freqData = new Uint8Array(64);

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Get audio data or generate harmonic simulation
      let energy = 0.4;
      const analyser = audioEngine.analyser || usePlayerStore.getState().analyser;
      if (isPlaying && analyser) {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += freqData[i];
        energy = 0.2 + (sum / 32 / 255) * 0.8;
      } else {
        energy = 0.45 + Math.sin(time * 2.5) * 0.15;
      }

      // Draw sacred geometric concentric rings and nodes
      const ringCount = 8;
      const maxRadius = Math.min(cx, cy) * 0.85;

      for (let r = 1; r <= ringCount; r++) {
        const radius = (r / ringCount) * maxRadius * (0.85 + energy * 0.25);
        const points = 6 + r * 2;
        const hue = (time * 25 + r * 35) % 360;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2 + (r % 2 === 0 ? time * 0.6 : -time * 0.6);
          const deform = Math.sin(angle * 4 + time * 3) * (6 * energy);
          const x = cx + Math.cos(angle) * (radius + deform);
          const y = cy + Math.sin(angle) * (radius + deform);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.25 + energy * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.shadowBlur = 12 * energy;
        ctx.stroke();
      }

      // Draw central hyper-glowing core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * energy);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, 'rgba(0, 229, 255, 0.8)');
      coreGrad.addColorStop(1, 'rgba(140, 56, 255, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, 40 * energy, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 24 * energy;
      ctx.shadowColor = '#00e5ff';
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[320px] sm:min-h-[400px] flex items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-b from-white/[0.04] to-black/60 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.8)]">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="w-full h-full max-w-[420px] max-h-[420px] object-contain"
      />
      {/* Real-time reactive telemetry badge */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-mono text-[9px] tracking-widest text-white/70 uppercase">
          {isPlaying ? 'AUDIO REACTIVO EN VIVO' : 'ONDA ARMÓNICA SIMULADA'}
        </span>
      </div>
    </div>
  );
};
