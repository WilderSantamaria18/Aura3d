export interface ApexTrailPoint {
  x: number;
  y: number;
}

export interface ApexTrail {
  history: ApexTrailPoint[];
}

export function renderMercuryTrails(
  ctx: CanvasRenderingContext2D,
  tipPoints: { x: number; y: number }[],
  apexTrails: Map<number, ApexTrail>,
  u: number,
  primaryColor: string,
  intensity = 1.0
): void {
  if (tipPoints.length === 0) return;

  ctx.save();
  const maxHistory = 8;
  const maxTips = Math.min(tipPoints.length, 6);

  for (let i = 0; i < maxTips; i++) {
    const tip = tipPoints[i];
    let trail = apexTrails.get(i);
    if (!trail) {
      trail = { history: [] };
      apexTrails.set(i, trail);
    }

    trail.history.unshift({ x: tip.x, y: tip.y });
    if (trail.history.length > maxHistory) {
      trail.history.length = maxHistory;
    }

    const histLen = trail.history.length;
    for (let h = 0; h < histLen; h++) {
      const pt = trail.history[h];
      const factor = 1 - h / maxHistory;
      const alpha = Math.min(0.8, factor * 0.55 * intensity);
      const size = Math.max(0.6, (maxHistory - h) * 0.4 * u * Math.min(intensity, 1.4));

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.shadowColor = primaryColor || '#00f2fe';
      ctx.shadowBlur = 8 * u * factor * intensity;
      ctx.fill();
    }
  }

  ctx.restore();
}
