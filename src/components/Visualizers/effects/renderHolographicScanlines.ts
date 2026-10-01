import { withAlpha } from './color';

export function renderHolographicScanlines(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  intensity = 1.0,
  color = '#00f0ff'
): void {
  ctx.save();

  // Clip within the central void
  ctx.beginPath();
  ctx.arc(cx, cy, baseCircleRadius * 0.94, 0, Math.PI * 2);
  ctx.clip();

  const scanOffset = (timeSec * 28 * u) % (8 * u);
  const lineSpacing = 8 * u;
  const alpha = Math.min(0.35, 0.08 * intensity);

  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = Math.max(0.6, 1 * u);

  // Todas las líneas en un único trazado (antes: beginPath + stroke por línea, ~20-40 por frame)
  ctx.beginPath();
  for (let y = -scanOffset; y < baseCircleRadius * 2; y += lineSpacing) {
    const lineY = cy - baseCircleRadius + y;
    ctx.moveTo(cx - baseCircleRadius, lineY);
    ctx.lineTo(cx + baseCircleRadius, lineY);
  }
  ctx.stroke();

  ctx.restore();
}
