export function applyGravitationalLens(
  px: number,
  py: number,
  cx: number,
  cy: number,
  voidR: number,
  u: number,
  intensity = 1.0
): { x: number; y: number } {
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy);
  const lensRadius = voidR * 1.8;

  if (dist < lensRadius && dist > voidR) {
    const bendFactor = 1 - Math.pow((dist - voidR) / (lensRadius - voidR), 2);
    const angle = Math.atan2(dy, dx);
    const newDist = dist - bendFactor * 12 * u * intensity;
    return {
      x: cx + Math.cos(angle) * newDist,
      y: cy + Math.sin(angle) * newDist,
    };
  }
  return { x: px, y: py };
}

export function renderGravitationalLensRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  sBass: number,
  intensity = 1.0
): void {
  ctx.save();
  const photonRadius = baseCircleRadius * (1.18 + sBass * 0.08);
  const ringAlpha = Math.min(0.65, (0.18 + sBass * 0.22) * intensity);

  // Outer distorted photon ring (Einstein ring effect)
  ctx.beginPath();
  const segments = 60;
  for (let s = 0; s <= segments; s++) {
    const theta = (s / segments) * Math.PI * 2;
    const wave = Math.sin(theta * 6 + timeSec * 2.5) * 3 * u * intensity;
    const r = photonRadius + wave;
    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})`;
  ctx.lineWidth = Math.max(0.6, 1.2 * u * Math.min(intensity, 1.5));
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 10 * u * intensity;
  ctx.stroke();

  ctx.restore();
}
