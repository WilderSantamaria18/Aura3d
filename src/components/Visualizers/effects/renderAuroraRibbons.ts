import { withAlpha } from './color';

// Degradados de cinta cacheados por color y ancho. Se dibujan trasladando el contexto, así que el mismo
// degradado (definido en el origen) sirve en todos los frames: antes se creaban 4 por frame.
const gradientCache = new Map<string, CanvasGradient>();

function ribbonGradient(ctx: CanvasRenderingContext2D, color: string, halfWidth: number): CanvasGradient {
  const key = `${color}|${halfWidth.toFixed(1)}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
    grad.addColorStop(0, withAlpha(color, 0));
    grad.addColorStop(0.5, withAlpha(color, 1));
    grad.addColorStop(1, withAlpha(color, 0));
    if (gradientCache.size > 12) gradientCache.clear();
    gradientCache.set(key, grad);
  }
  return grad;
}

export function renderAuroraRibbons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  sEnergy: number,
  intensity = 1.0,
  primaryColor = '#00ff96',
  secondaryColor = '#00c8ff'
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const ribbons = 4;
  const baseAlpha = Math.min(0.45, (0.12 + sEnergy * 0.16) * intensity);
  const halfWidth = 35 * u;

  ctx.globalAlpha = baseAlpha;
  ctx.lineWidth = Math.max(12, 35 * u * Math.min(intensity, 1.4));

  for (let r = 0; r < ribbons; r++) {
    const ribbonPhase = timeSec * (0.35 + r * 0.12);
    const ribbonX = cx + Math.sin(ribbonPhase) * 75 * u;

    // Colores de la paleta activa (antes verde/cian fijos, ajenos a la paleta y al modo lúcido)
    ctx.strokeStyle = ribbonGradient(ctx, r % 2 === 0 ? primaryColor : secondaryColor, halfWidth);

    ctx.save();
    ctx.translate(ribbonX, 0);
    ctx.beginPath();
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const waveY = cy + (t - 0.5) * baseCircleRadius * 3.2;
      const waveX = Math.sin(t * 6 + ribbonPhase) * 28 * u;
      if (i === 0) ctx.moveTo(waveX, waveY);
      else ctx.lineTo(waveX, waveY);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
