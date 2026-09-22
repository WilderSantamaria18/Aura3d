export function renderHolographicScanlines(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  intensity = 1.0
): void {
  ctx.save();

  // Clip within the central void
  ctx.beginPath();
  ctx.arc(cx, cy, baseCircleRadius * 0.94, 0, Math.PI * 2);
  ctx.clip();

  const scanOffset = (timeSec * 28 * u) % (8 * u);
  const lineSpacing = 8 * u;
  const alpha = Math.min(0.35, 0.08 * intensity);

  ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
  ctx.lineWidth = Math.max(0.6, 1 * u);

  for (let y = -scanOffset; y < baseCircleRadius * 2; y += lineSpacing) {
    const lineY = cy - baseCircleRadius + y;
    ctx.beginPath();
    ctx.moveTo(cx - baseCircleRadius, lineY);
    ctx.lineTo(cx + baseCircleRadius, lineY);
    ctx.stroke();
  }

  ctx.restore();
}
