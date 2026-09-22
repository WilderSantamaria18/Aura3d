export function renderAuroraRibbons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  sEnergy: number,
  intensity = 1.0
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const ribbons = 4;
  const baseAlpha = Math.min(0.45, (0.12 + sEnergy * 0.16) * intensity);

  for (let r = 0; r < ribbons; r++) {
    const ribbonPhase = timeSec * (0.35 + r * 0.12);
    const ribbonX = cx + Math.sin(ribbonPhase) * 75 * u;

    const grad = ctx.createLinearGradient(
      ribbonX - 35 * u,
      0,
      ribbonX + 35 * u,
      0
    );
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(
      0.5,
      r % 2 === 0
        ? `rgba(0, 255, 150, ${baseAlpha.toFixed(3)})`
        : `rgba(0, 200, 255, ${baseAlpha.toFixed(3)})`
    );
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const waveY = cy + (t - 0.5) * baseCircleRadius * 3.2;
      const waveX = ribbonX + Math.sin(t * 6 + ribbonPhase) * 28 * u;
      if (i === 0) ctx.moveTo(waveX, waveY);
      else ctx.lineTo(waveX, waveY);
    }

    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(12, 35 * u * Math.min(intensity, 1.4));
    ctx.stroke();
  }

  ctx.restore();
}
