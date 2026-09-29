import type { CaptureAspectRatio } from '../types';

/**
 * Tarjeta de canción. Todas las medidas se escalan con la resolución (referencia 1080 px
 * en el lado corto), así se lee igual en 1080p, 4K, vertical o cuadrado.
 */
export function drawTrackWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  aspectRatio: CaptureAspectRatio,
  trackTitle?: string,
  artistName?: string,
  animatedBars = false
): void {
  const title = trackTitle || 'Aura3D Soundscape';
  const artist = artistName || 'DAW Studio Visualizer';

  const isVertical = aspectRatio === '9:16' || aspectRatio === '4:5';
  const k = Math.max(0.5, Math.min(width, height) / 1080);

  const cardW = isVertical ? Math.min(width * 0.88, 780 * k) : Math.min(width * 0.46, 640 * k);
  const cardH = (animatedBars ? 112 : 96) * k;
  const cardX = (width - cardW) / 2;
  const cardY = isVertical ? height - cardH - 140 * k : height - cardH - 56 * k;
  const pad = 26 * k;

  ctx.save();

  // Sombra y fondo de cristal
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 22 * k;
  ctx.shadowOffsetY = 8 * k;
  ctx.fillStyle = 'rgba(7, 10, 20, 0.86)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = Math.max(1, 1.5 * k);

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(cardX, cardY, cardW, cardH, 26 * k);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';

  const fit = (text: string, font: string, maxW: number): string => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  };

  const reservedRight = animatedBars ? 72 * k : 0;
  const textMaxW = cardW - pad * 2 - reservedRight;

  ctx.textBaseline = 'alphabetic';

  // Etiqueta
  ctx.fillStyle = '#00e5ff';
  ctx.font = `bold ${13 * k}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText('● AURA 3D MASTER CAPTURE', cardX + pad, cardY + 30 * k);

  // Título
  ctx.fillStyle = '#ffffff';
  const titleFont = `bold ${24 * k}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.font = titleFont;
  ctx.fillText(fit(title, titleFont, textMaxW), cardX + pad, cardY + 62 * k);

  // Artista
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
  const artistFont = `${16 * k}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.font = artistFont;
  ctx.fillText(fit(artist, artistFont, textMaxW), cardX + pad, cardY + 88 * k);

  // Mini espectro animado (solo en video)
  if (animatedBars) {
    const barsX = cardX + cardW - pad - 44 * k;
    const barsY = cardY + cardH / 2;
    const t = performance.now() * 0.007;
    ctx.fillStyle = '#00e5ff';
    for (let i = 0; i < 5; i++) {
      const barH = (14 + Math.sin(t + i * 1.3) * 11) * k;
      ctx.fillRect(barsX + i * 9 * k, barsY - barH / 2, 5 * k, barH);
    }
  }

  ctx.restore();
}
