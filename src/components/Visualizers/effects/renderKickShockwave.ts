export interface Shockwave {
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
}

export function renderKickShockwave(
  ctx: CanvasRenderingContext2D,
  shockwaves: Shockwave[],
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  primaryColor: string,
  intensity = 1.0
): Shockwave[] {
  if (shockwaves.length === 0) return shockwaves;

  ctx.save();
  const surviving: Shockwave[] = [];

  for (let i = 0; i < shockwaves.length; i++) {
    const sw = shockwaves[i];
    const elapsed = timeSec - sw.startTime;
    const duration = 0.5; // 500ms
    const progress = elapsed / duration;

    if (progress > 1.0) continue;

    const currentRadius = baseCircleRadius + (sw.maxRadius - baseCircleRadius) * progress;
    const currentAlpha = Math.max(0, sw.alpha * (1 - progress) * intensity);

    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(0.5, (2 - progress * 1.5) * u * Math.min(intensity, 1.5));
    ctx.shadowColor = primaryColor || '#00e5ff';
    ctx.shadowBlur = 12 * u * (1 - progress) * intensity;
    ctx.stroke();

    surviving.push(sw);
  }

  ctx.restore();
  return surviving;
}
