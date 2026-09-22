export interface CrystalShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  alpha: number;
  color: string;
}

export function spawnCrystalShards(
  shards: CrystalShard[],
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  primaryColor: string,
  count = 6
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (60 + Math.random() * 80) * u;
    shards.push({
      x: cx + Math.cos(angle) * baseCircleRadius,
      y: cy + Math.sin(angle) * baseCircleRadius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      size: (2.2 + Math.random() * 2.8) * u,
      alpha: 1.0,
      color: primaryColor || '#ffffff',
    });
  }

  // Cap maximum shards to prevent leaks or spikes
  if (shards.length > 14) {
    shards.splice(0, shards.length - 14);
  }
}

export function renderCrystalShards(
  ctx: CanvasRenderingContext2D,
  shards: CrystalShard[],
  u: number,
  dt = 0.016,
  intensity = 1.0
): CrystalShard[] {
  if (shards.length === 0) return shards;

  ctx.save();
  const surviving: CrystalShard[] = [];

  for (let i = 0; i < shards.length; i++) {
    const shard = shards[i];
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    shard.vy += 35 * u * dt; // subtle gravity
    shard.rotation += shard.rotationSpeed;
    shard.alpha *= 0.95;

    if (shard.alpha < 0.04) continue;

    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);

    const s = shard.size * Math.min(intensity, 1.4);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, s * 0.5);
    ctx.lineTo(-s * 0.7, s * 0.5);
    ctx.closePath();

    const displayAlpha = Math.min(1.0, shard.alpha * intensity);
    ctx.fillStyle = `rgba(255, 255, 255, ${displayAlpha.toFixed(3)})`;
    ctx.shadowColor = shard.color;
    ctx.shadowBlur = 8 * u * displayAlpha;
    ctx.fill();

    ctx.restore();
    surviving.push(shard);
  }

  ctx.restore();
  return surviving;
}
