/**
 * Capa del navegador de las tarjetas: carga de fuentes e imágenes, captura del visualizador,
 * procesado de la foto de perfil y exportación a PNG. El dibujo en sí está en templates.ts.
 */
import { findVisualizerCanvas } from '../../utils/visualizerCanvas';
import { CARD_FONTS, CARD_FORMATS, type CardConfig, type CardFontId, type ResolvedCardContent } from './config';
import { renderStoryCard } from './templates';
import type { CardAssets } from './blocks';
import type { CanvasFactory, CanvasLike, Ctx } from './draw';

/** Fábrica de lienzos: OffscreenCanvas si existe y, si no, un <canvas> suelto */
export const createBrowserCanvas: CanvasFactory = (width, height): CanvasLike => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height) as unknown as CanvasLike;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as CanvasLike;
};

// ── Fuentes ─────────────────────────────────────────────────────────────────

const loadedFonts = new Set<string>();

/**
 * El canvas no espera a las fuentes web: si no están cargadas, dibuja con la de reserva y la
 * tarjeta sale distinta a lo previsto. Se precargan los pesos que usan las plantillas.
 */
export async function ensureCardFonts(fontId: CardFontId): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts?.load) return false;
  const families = [CARD_FONTS[fontId].loadFamily, 'JetBrains Mono'];
  const specs = families.flatMap((family) => [500, 600, 700, 800].map((w) => `${w} 40px "${family}"`));
  const key = specs.join('|');
  if (loadedFonts.has(key)) return true;

  try {
    await Promise.race([
      Promise.all(specs.map((spec) => document.fonts.load(spec))),
      new Promise((resolve) => setTimeout(resolve, 2500)), // no bloquear si la red es lenta
    ]);
    loadedFonts.add(key);
    return true;
  } catch {
    return false;
  }
}

// ── Imágenes ────────────────────────────────────────────────────────────────

/**
 * Carga una imagen pidiendo CORS: si el servidor no lo permite devuelve null, porque dibujar una
 * imagen «contaminada» impediría después exportar el PNG (toBlob lanzaría un error de seguridad).
 */
export function loadImage(src: string, timeoutMs = 8000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (value: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
  });
}

/**
 * ¿El lienzo está vacío (totalmente transparente)? Pasa con lienzos decorativos o con un WebGL que
 * no conserva el búfer: usarlo como imagen principal dejaría la tarjeta en blanco. Se mira una
 * versión reducida a 32×32 para que sea barato. Si no se puede leer, se asume que tiene contenido.
 */
function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  try {
    const probe = document.createElement('canvas');
    probe.width = 32;
    probe.height = 32;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return false;
    pctx.drawImage(canvas, 0, 0, 32, 32);
    const data = pctx.getImageData(0, 0, 32, 32).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 12) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Copia el fotograma actual del visualizador activo (Rainbow, Terrain, Warp…). Se copia a un lienzo
 * propio porque el visualizador sigue dibujando y la tarjeta debe usar un fotograma fijo.
 */
export function captureVisualizerSnapshot(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const source = findVisualizerCanvas();
  if (!source || !source.width || !source.height) return null;

  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(source, 0, 0);
    // Un lienzo decorativo vacío no es un visualizador: mejor el aura de reserva que una tarjeta en blanco
    return isBlankCanvas(copy) ? null : copy;
  } catch (err) {
    console.warn('[storyCard] No se pudo capturar el visualizador:', err);
    return null;
  }
}

const AVATAR_SIZE = 256;
const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024;

/** Recorta al centro y reduce la foto de perfil a un JPEG cuadrado pequeño (cabe en localStorage) */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > MAX_AVATAR_FILE_BYTES) throw new Error('La imagen pesa más de 8 MB.');

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img) throw new Error('No se pudo leer la imagen.');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen.');
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Exportación ─────────────────────────────────────────────────────────────

export interface CardExportInput {
  config: CardConfig;
  content: ResolvedCardContent;
  assets: CardAssets;
}

/** Calidad del JPEG: indistinguible a simple vista y ~10 veces más ligero que el PNG */
const JPEG_QUALITY = 0.92;

/** Dibuja la tarjeta a tamaño completo (1080 px de ancho) y devuelve el archivo (PNG o JPEG) */
export async function exportCardBlob(input: CardExportInput): Promise<Blob> {
  const spec = CARD_FORMATS[input.config.format];
  await ensureCardFonts(input.config.font);

  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('No se pudo inicializar el lienzo de la tarjeta.');

  renderStoryCard(ctx, spec.width, spec.height, { ...input, createCanvas: createBrowserCanvas });

  const mime = input.config.fileFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo generar la imagen.'));
        },
        mime,
        JPEG_QUALITY // solo lo usa JPEG; PNG no tiene pérdida
      );
    } catch (err) {
      reject(err instanceof Error ? err : new Error('No se pudo generar la imagen.'));
    }
  });
}

/** Nombre de archivo seguro a partir del título */
export function cardFileName(config: CardConfig, title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `Aura3D_${config.format}_${slug || 'tarjeta'}.${config.fileFormat === 'jpeg' ? 'jpg' : 'png'}`;
}
