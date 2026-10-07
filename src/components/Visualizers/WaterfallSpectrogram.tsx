import React, { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { hexToRgba } from '../../types/audio';

interface WaterfallSpectrogramProps {
  className?: string;
  opacity?: number;
  height?: number;
}

/**
 * WaterfallSpectrogram — Espectrograma FFT Neón en Cascada
 *
 * Renderiza una cascada espectral translúcida continua (waterfall FFT) en tiempo real
 * que se desplaza hacia abajo detrás de los 10 deslizadores del ecualizador.
 * Utiliza un mapa de color termo-fosforescente que reacciona a la energía y frecuencias de la música.
 */
export const WaterfallSpectrogram: React.FC<WaterfallSpectrogramProps> = ({
  className = '',
  opacity = 0.45,
  height = 160,
}) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const activeColor = isLucid ? (lucidTheme?.primary || '#00e5ff') : '#00e5ff';
  const secondaryColor = isLucid ? (lucidTheme?.secondary || '#ff007f') : '#a855f7';

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Colormap cache (0 a 255)
    const colorMap: string[] = [];
    for (let i = 0; i <= 255; i++) {
      const t = i / 255;
      if (t < 0.1) {
        colorMap[i] = 'rgba(0, 0, 0, 0)';
      } else if (t < 0.35) {
        const u = (t - 0.1) / 0.25;
        colorMap[i] = hexToRgba(secondaryColor, u * 0.45);
      } else if (t < 0.75) {
        const u = (t - 0.35) / 0.4;
        colorMap[i] = hexToRgba(activeColor, 0.45 + u * 0.4);
      } else {
        const u = (t - 0.75) / 0.25;
        colorMap[i] = `rgba(255, 255, 255, ${0.85 + u * 0.15})`;
      }
    }

    const render = () => {
      const parent = canvas.parentElement;
      const W = parent?.clientWidth || 600;
      const H = height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);
      }

      if (!isPlaying || prefersReduced) {
        // En pausa, desvanecer lentamente hacia transparente
        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 16, 0.08)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      const freqData = AudioEngine.getInstance().getFrequencyData();
      const raw = freqData.raw;

      // 1. Desplazar la imagen existente hacia abajo 1.8 px para crear el efecto cascada
      const scrollStep = 2.0;
      ctx.drawImage(
        canvas,
        0, 0, W * dpr, (H - scrollStep) * dpr,
        0, scrollStep, W, H - scrollStep
      );

      // 2. Dibujar la nueva fila en la parte superior (y = 0 hasta scrollStep)
      const numColumns = 64;
      const colWidth = W / numColumns;

      if (raw && raw.length > 0) {
        for (let c = 0; c < numColumns; c++) {
          // Mapeo no lineal / logarítmico para representar mejor el rango 20Hz - 20kHz
          const normIdx = Math.pow(c / numColumns, 1.6);
          const rawIdx = Math.min(raw.length - 1, Math.floor(normIdx * raw.length * 0.75));
          const val = raw[rawIdx] || 0;

          if (val > 15) {
            ctx.fillStyle = colorMap[val] || colorMap[255];
            ctx.fillRect(c * colWidth, 0, colWidth + 0.5, scrollStep + 0.5);
          }
        }

        // Resplandor difuminado suave en el borde superior de la cascada
        const topGrad = ctx.createLinearGradient(0, 0, 0, 8);
        topGrad.addColorStop(0, hexToRgba(activeColor, 0.25));
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 8);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isLucid, activeColor, secondaryColor, height]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden rounded-2xl select-none mix-blend-screen transition-opacity duration-300 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-2xl"
      />
      {/* Máscara de viñeta para suavizar bordes superior e inferior */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(10, 10, 16, 0.3) 80%, rgba(10, 10, 16, 0.85) 100%)',
        }}
      />
    </div>
  );
};

export default WaterfallSpectrogram;
