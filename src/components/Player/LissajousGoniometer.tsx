import React, { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';

interface LissajousGoniometerProps {
  className?: string;
  size?: number;
  showCorrelationBar?: boolean;
  showLabels?: boolean;
}

type PhosphorMode = 'neon' | 'emerald' | 'amber';

/**
 * LissajousGoniometer — Vector-Scope / Goniómetro de Fase Estéreo Lissajous
 *
 * Instrumento analógico de precisión para masterización de estudio que visualiza
 * la apertura estéreo (Mid/Side), distribución espacial y correlación de fase (-1 a +1)
 * con persistencia fosforescente estilo osciloscopio CRT.
 */
export const LissajousGoniometer: React.FC<LissajousGoniometerProps> = ({
  className = '',
  size = 130,
  showCorrelationBar = true,
  showLabels = true,
}) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const primaryColor = isLucid ? lucidTheme?.primary || '#00e5ff' : '#00e5ff';
  const secondaryColor = isLucid ? lucidTheme?.secondary || '#ff007f' : '#a855f7';

  const [phosphorMode, setPhosphorMode] = useState<PhosphorMode>('neon');
  const [correlationVal, setCorrelationVal] = useState<number>(1.0);
  const [stereoWidthVal, setStereoWidthVal] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const corrRef = useRef<number>(1.0);
  const widthRef = useRef<number>(0);

  // Colores de fósforo
  const phosphorColors = {
    neon: {
      beam: primaryColor,
      secondary: secondaryColor,
      glow: primaryColor,
      bg: '#05070d',
    },
    emerald: {
      beam: '#00ff66',
      secondary: '#00b347',
      glow: '#00ff66',
      bg: '#020d06',
    },
    amber: {
      beam: '#ffb300',
      secondary: '#d97706',
      glow: '#ffb300',
      bg: '#0d0802',
    },
  }[phosphorMode];

  const togglePhosphor = () => {
    setPhosphorMode((prev) => (prev === 'neon' ? 'emerald' : prev === 'emerald' ? 'amber' : 'neon'));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = size;
    const H = size;

    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
    }

    const cx = W / 2;
    const cy = H / 2;
    const radius = W * 0.44;
    let lastUiUpdate = 0;

    const render = (now: number) => {
      // 1. Persistencia fosforescente de tubo CRT (desvanecimiento gradual)
      ctx.fillStyle = phosphorColors.bg + '38'; // ~22% alpha para dejar estela suave
      ctx.fillRect(0, 0, W, H);

      // 2. Retícula del instrumento (graticule rings y ejes M/S a 45 grados)
      ctx.save();

      // Círculo límite exterior (-0 dB)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Anillos interiores (-6 dB y -12 dB)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ejes ortogonales Mid / Side (M vertical, S horizontal)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.stroke();

      // Ejes diagonales L y R (±45 grados)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      const diag = radius * 0.92 * 0.7071; // cos(45°)
      ctx.beginPath();
      ctx.moveTo(cx - diag, cy + diag);
      ctx.lineTo(cx + diag, cy - diag); // Eje L (+45°)
      ctx.moveTo(cx + diag, cy + diag);
      ctx.lineTo(cx - diag, cy - diag); // Eje R (-45°)
      ctx.stroke();

      // Etiquetas L, R, +M, -S
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+M', cx, cy - radius + 7);
      ctx.fillText('+S', cx + radius - 7, cy);
      ctx.fillText('L', cx - diag + 4, cy - diag + 4);
      ctx.fillText('R', cx + diag - 4, cy - diag + 4);

      ctx.restore();

      // 3. Captura y cálculo de datos en tiempo real de fase y forma de onda
      const stereoData = AudioEngine.getInstance().getStereoPhaseData();
      const leftBuf = stereoData.left;
      const rightBuf = stereoData.right;

      // Balística suave de correlación y ancho estéreo
      corrRef.current += (stereoData.correlation - corrRef.current) * 0.15;
      widthRef.current += (stereoData.width - widthRef.current) * 0.15;

      // Throttle UI React state updates a ~15 FPS para cero costo de re-render
      if (now - lastUiUpdate > 66) {
        lastUiUpdate = now;
        setCorrelationVal(corrRef.current);
        setStereoWidthVal(widthRef.current);
      }

      // 4. Dibujar nube o haz de Lissajous (Mid / Side Transformation)
      if (isPlaying && leftBuf && rightBuf) {
        const step = 2; // samplear cada 2 muestras para óptimo rendimiento
        const scale = radius * 0.88;

        ctx.save();
        ctx.beginPath();

        let started = false;
        const sqrt2 = 1.41421356;

        for (let i = 0; i < leftBuf.length; i += step) {
          const l = leftBuf[i];
          const r = rightBuf[i];

          // Transformación M/S (Mid/Side Matrix):
          // Side (horizontal) = (L - R) / √2
          // Mid (vertical)   = (L + R) / √2
          const side = (l - r) / sqrt2;
          const mid = (l + r) / sqrt2;

          const px = cx + side * scale;
          const py = cy - mid * scale;

          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }

        // Resplandor de haz fosforescente láser
        ctx.shadowColor = phosphorColors.glow;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = phosphorColors.beam;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Núcleo blanco caliente en puntos de alta intensidad
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();
      } else {
        // En reposo: punto o aguja central en reposo
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = phosphorColors.beam;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, phosphorColors, size]);

  // Barra de correlación de fase (-1 a +1)
  // -1 = Rojo (desfase 180°), 0 = Ámbar (estéreo 90°), +1 = Verde/Cyan (mono fase perfecta)
  const normCorr = (correlationVal + 1) / 2; // 0..1
  const corrPct = Math.max(0, Math.min(100, normCorr * 100));

  const corrColor =
    correlationVal < 0
      ? '#f43f5e' // Rojo: problema de fase
      : correlationVal < 0.3
      ? '#fbbf24' // Ámbar: apertura estéreo muy amplia
      : primaryColor; // Cyan/Verde: correlación sólida

  return (
    <div
      className={`flex flex-col items-center select-none font-mono ${className}`}
      title="Goniómetro Vector-Scope Lissajous (Clic para cambiar color de fósforo)"
    >
      {showLabels && (
        <div className="flex items-center justify-between w-full text-[8px] text-white/50 tracking-wider uppercase mb-1 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phosphorColors.beam }} />
            Vector-Scope
          </span>
          <button
            type="button"
            onClick={togglePhosphor}
            className="text-[7px] text-white/40 hover:text-white/80 transition-colors uppercase cursor-pointer"
          >
            {phosphorMode}
          </button>
        </div>
      )}

      {/* Pantalla circular del osciloscopio */}
      <div
        onClick={togglePhosphor}
        className="relative rounded-full p-1 cursor-pointer transition-transform active:scale-95 border border-white/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_4px_16px_rgba(0,0,0,0.6)]"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08) 0%, rgba(10,12,20,0.95) 70%)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="rounded-full block"
        />

        {/* Brillo de lente convexa de cristal */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Barra de correlación de fase (-1 a +1) */}
      {showCorrelationBar && (
        <div className="w-full mt-2 space-y-0.5 px-0.5">
          <div className="flex justify-between text-[7px] text-white/45 tracking-widest uppercase">
            <span className="text-rose-400/80">-1</span>
            <span className="text-white/30">0</span>
            <span className="text-emerald-400/80">+1</span>
          </div>

          <div className="relative h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden border border-white/[0.06]">
            {/* Divisor central 0 */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/30 z-10 -translate-x-1/2" />

            {/* Barra indicadora */}
            <div
              className="absolute top-0 bottom-0 transition-all duration-75 rounded-full"
              style={{
                left: correlationVal >= 0 ? '50%' : `${corrPct}%`,
                width: `${Math.abs(correlationVal) * 50}%`,
                backgroundColor: corrColor,
                boxShadow: `0 0 6px ${corrColor}80`,
              }}
            />
          </div>

          <div className="flex justify-between text-[8px] text-white/60 pt-0.5">
            <span>FASE</span>
            <span className="font-bold tabular-nums" style={{ color: corrColor }}>
              {correlationVal >= 0 ? `+${correlationVal.toFixed(2)}` : correlationVal.toFixed(2)}
            </span>
            <span className="text-white/40">{(stereoWidthVal * 100).toFixed(0)}% W</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LissajousGoniometer;
