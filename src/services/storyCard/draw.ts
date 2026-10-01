/**
 * Utilidades de dibujo para las tarjetas: color, texto (ajuste, saltos de línea, espaciado), imágenes
 * y ruido determinista. Solo usan la API estándar de Canvas 2D, así que funcionan igual con un
 * <canvas>, un OffscreenCanvas o un lienzo de Node.
 */

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): Ctx | null;
}
export type CanvasFactory = (width: number, height: number) => CanvasLike;

// ── Color ───────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  // parseInt acepta prefijos válidos de textos basura ("basura" → 0xBA): se exige un hex completo
  if (!/^[0-9a-f]{6}$/i.test(h)) return [255, 255, 255];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
};

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = Math.min(1, Math.max(0, t));
  const c = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

// ── Determinismo ────────────────────────────────────────────────────────────

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Generador pseudoaleatorio con semilla: la misma tarjeta se dibuja siempre igual */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Formas ──────────────────────────────────────────────────────────────────

export function roundedRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

// ── Texto ───────────────────────────────────────────────────────────────────

/** Recorta con puntos suspensivos hasta que quepa en `maxWidth` */
export function fitText(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid).trimEnd() + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}

/** Parte por palabras en hasta `maxLines` líneas; la última se recorta con «…» si sobra texto */
export function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) {
      // Última línea permitida: lo que queda va junto y se recorta
      return [...lines, fitText(ctx, [current, ...words.slice(i)].join(' '), maxWidth)];
    }
    lines.push(current);
    current = words[i];
  }
  lines.push(fitText(ctx, current, maxWidth));
  return lines;
}

export function measureTracked(ctx: Ctx, text: string, tracking: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return Math.max(0, w - tracking);
}

/** Texto con espaciado entre letras (`ctx.letterSpacing` no existe en todos los navegadores) */
export function drawTracked(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: 'left' | 'center' | 'right' = 'left'
): number {
  const width = measureTracked(ctx, text, tracking);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let cursor = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = prevAlign;
  return width;
}

// ── Imágenes ────────────────────────────────────────────────────────────────

export function sourceSize(img: CanvasImageSource): { w: number; h: number } {
  const any = img as unknown as {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  };
  return {
    w: any.naturalWidth || any.videoWidth || any.width || 1,
    h: any.naturalHeight || any.videoHeight || any.height || 1,
  };
}

/** Rellena el rectángulo recortando el sobrante (como `object-fit: cover`) */
export function drawImageCover(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number): void {
  const { w: sw, h: sh } = sourceSize(img);
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
}

/** Cabe entero dentro del rectángulo, centrado (como `object-fit: contain`) */
export function drawImageContain(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number): void {
  const { w: sw, h: sh } = sourceSize(img);
  const scale = Math.min(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ── Grano ───────────────────────────────────────────────────────────────────

const NOISE_SIZE = 192;
const noiseCache = new WeakMap<CanvasFactory, CanvasLike>();

/**
 * Baldosa de ruido en grises, determinista, que se repite como patrón. Sustituye al
 * `getImageData` por píxel sobre toda la tarjeta (8 millones de píxeles en una historia).
 */
export function getNoiseTile(createCanvas: CanvasFactory): CanvasLike {
  const cached = noiseCache.get(createCanvas);
  if (cached) return cached;

  const tile = createCanvas(NOISE_SIZE, NOISE_SIZE);
  const tctx = tile.getContext('2d');
  if (tctx && typeof tctx.createImageData === 'function') {
    const img = tctx.createImageData(NOISE_SIZE, NOISE_SIZE);
    const rand = mulberry32(0x5eed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 256);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
  }
  noiseCache.set(createCanvas, tile);
  return tile;
}
