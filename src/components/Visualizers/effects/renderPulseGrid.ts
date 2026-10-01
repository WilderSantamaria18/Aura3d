import { parseColor } from './color';

export function renderPulseGrid(
  ctx: CanvasRenderingContext2D,
  rawAudioData: Uint8Array | number[],
  cx: number,
  cy: number,
  baseCircleRadius: number,
  u: number,
  intensity = 1.0,
  color = '#ffffff'
): void {
  ctx.save();
  const gridSize = 8;
  const spacing = 38 * u;
  const gridStart = -((gridSize - 1) * spacing) / 2;
  const maxBound = baseCircleRadius * 1.55;
  const dataLen = rawAudioData.length || 128;

  // Color fijo y opacidad por punto con globalAlpha: evita construir 64 cadenas rgba() por frame
  const [r, g, b] = parseColor(color);
  ctx.fillStyle = `rgb(${r},${g},${b})`;

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gy = 0; gy < gridSize; gy++) {
      const px = cx + gridStart + gx * spacing;
      const py = cy + gridStart + gy * spacing;

      const distFromCenter = Math.hypot(px - cx, py - cy);
      if (distFromCenter > maxBound) continue;

      const gridFreqIdx = Math.floor(((gx + gy) / (gridSize * 2)) * dataLen);
      const gridFreq = ((rawAudioData[gridFreqIdx] ?? 0) as number) / 255;

      const pulseScale = 0.8 + gridFreq * 0.7 * intensity;
      const dotSize = Math.max(0.8, 1.5 * u * pulseScale);

      ctx.globalAlpha = Math.min(0.65, (0.08 + gridFreq * 0.18) * intensity);
      ctx.beginPath();
      ctx.arc(px, py, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
