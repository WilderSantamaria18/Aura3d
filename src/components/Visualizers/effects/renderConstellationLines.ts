export function renderConstellationLines(
  ctx: CanvasRenderingContext2D,
  tipPoints: { x: number; y: number }[],
  u: number,
  sEnergy: number,
  intensity = 1.0
): void {
  const count = tipPoints.length;
  if (count < 3) return;

  ctx.save();
  const maxDistance = 210 * u;
  // Limit to at most 8 nodes to cap complexity
  const limit = Math.min(count, 8);

  ctx.lineWidth = Math.max(0.4, 0.65 * u * Math.min(intensity, 1.5));

  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const p1 = tipPoints[i];
      const p2 = tipPoints[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

      if (dist < maxDistance) {
        const proximityFactor = 1 - dist / maxDistance;
        const alpha = Math.min(
          0.7,
          proximityFactor * 0.32 * (0.5 + sEnergy * 0.5) * intensity
        );

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}
