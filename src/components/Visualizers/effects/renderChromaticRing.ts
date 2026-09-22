export function renderChromaticRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  trebleEnergy: number,
  intensity = 1.0
): void {
  ctx.save();
  const offset = Math.max(0.5, trebleEnergy * 3.5 * u * intensity);
  const ringRadius = baseCircleRadius + 2 * u;
  const lineWidth = 1.5 * u * Math.min(intensity, 1.8);
  const alpha = Math.min(0.85, (0.35 + trebleEnergy * 0.3) * intensity);

  // Red channel shifted left
  ctx.beginPath();
  ctx.arc(cx - offset, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 50, 75, ${alpha.toFixed(3)})`;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Green channel centered
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(50, 255, 120, ${alpha.toFixed(3)})`;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Blue/Cyan channel shifted right
  ctx.beginPath();
  ctx.arc(cx + offset, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 210, 255, ${alpha.toFixed(3)})`;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.restore();
}
