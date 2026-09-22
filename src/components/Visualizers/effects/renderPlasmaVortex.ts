export function renderPlasmaVortex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  timeSec: number,
  sBass: number,
  sEnergy: number,
  primaryColor: string,
  intensity = 1.0
): void {
  ctx.save();

  // Clip strictly inside the central void
  ctx.beginPath();
  ctx.arc(cx, cy, baseCircleRadius * 0.94, 0, Math.PI * 2);
  ctx.clip();

  const vortexArms = 6;
  const vortexRotation = timeSec * 0.45 + sBass * 0.75;
  const vortexAlpha = Math.min(0.7, (0.22 + sEnergy * 0.28) * intensity);

  for (let arm = 0; arm < vortexArms; arm++) {
    const armAngle = (arm / vortexArms) * Math.PI * 2 + vortexRotation;
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = t * baseCircleRadius * 0.88;
      const spiralAngle = armAngle + t * Math.PI * 1.25;
      const px = cx + Math.cos(spiralAngle) * r;
      const py = cy + Math.sin(spiralAngle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseCircleRadius * 0.9);
    grad.addColorStop(0, primaryColor || '#00f2fe');
    grad.addColorStop(0.7, `${primaryColor || '#ff088a'}55`);
    grad.addColorStop(1, 'transparent');

    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1.0, 2.2 * u * Math.min(intensity, 1.4));
    ctx.globalAlpha = vortexAlpha;
    ctx.stroke();
  }

  ctx.restore();
}
