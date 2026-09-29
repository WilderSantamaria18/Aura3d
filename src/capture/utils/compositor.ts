import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { calculateCenterCrop } from './captureGeometry';

export interface SceneCompositeElements {
  wallpaperImg: HTMLImageElement | null;
  atmosphereCanvas: HTMLCanvasElement | null;
  visualizerCanvas: HTMLCanvasElement | null;
  isRainbowVoid: boolean;
  /** Portada/logo del disco central de Rainbow Void */
  coverImg?: HTMLImageElement | null;
}

const TAU = Math.PI * 2;

/* ── Carga de imágenes (con CORS para no "manchar" el canvas de captura) ─── */
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('[Compositor] No se pudo cargar imagen para captura:', url.slice(0, 80));
      imageCache.delete(url);
      resolve(null);
    };
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

export function findAtmosphereCanvas(): HTMLCanvasElement | null {
  return (
    (document.getElementById('atmosphere-canvas') as HTMLCanvasElement) ||
    (document.querySelector('canvas[data-atmosphere="true"]') as HTMLCanvasElement) ||
    null
  );
}

export async function loadActiveWallpaperImage(): Promise<HTMLImageElement | null> {
  const wallpaperStore = useWallpaperStore.getState();
  const playerStore = usePlayerStore.getState();

  const wallpaperUrl =
    wallpaperStore.currentWallpaper?.url || playerStore.blobSettings?.customBackgroundImage || null;

  return wallpaperUrl ? loadImage(wallpaperUrl) : null;
}

/** Portada o logo que se muestra en el disco central de Rainbow Void */
export async function loadActiveCoverImage(): Promise<HTMLImageElement | null> {
  const s = usePlayerStore.getState();
  const url = s.blobSettings?.customLogoUrl || s.currentTrack?.coverUrl || null;
  return url ? loadImage(url) : null;
}

/* ── Color ────────────────────────────────────────────────────────────────── */
function toRgba(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7);
    const n = parseInt(h, 16);
    if (!Number.isNaN(n)) return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return `rgba(255,255,255,${alpha})`;
}

/* ── Estilo del disco leído del DOM (cacheado: getComputedStyle es caro) ─── */
let discStyleCache: { at: number; bg: string; border: string } | null = null;
function readDiscStyle(disc: HTMLElement | null): { bg: string; border: string } {
  const now = performance.now();
  if (discStyleCache && now - discStyleCache.at < 400) return discStyleCache;
  let bg = '#070a16';
  let border = 'rgba(255,255,255,0.18)';
  if (disc) {
    const cs = getComputedStyle(disc);
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bg = cs.backgroundColor;
    if (cs.borderTopColor) border = cs.borderTopColor;
  }
  discStyleCache = { at: now, bg, border };
  return discStyleCache;
}

/** Dibuja el disco central tal como se ve en pantalla: fondo, portada girando, surcos, agujero y borde. */
function drawVoidDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  cover: HTMLImageElement | null,
  disc: HTMLElement | null
): void {
  const style = readDiscStyle(disc);
  ctx.save();

  // Base del "void"
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = style.bg;
  ctx.fill();

  if (cover && cover.width > 0 && cover.height > 0) {
    // En pantalla el disco de la portada mide el 86 % del círculo y gira (48 s por vuelta)
    const rr = R * 0.86;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TAU);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(((performance.now() / 48000) % 1) * TAU);
    const side = Math.min(cover.width, cover.height);
    ctx.drawImage(cover, (cover.width - side) / 2, (cover.height - side) / 2, side, side, -rr, -rr, rr * 2, rr * 2);
    ctx.restore();

    // Surcos de vinilo y agujero central
    ctx.lineWidth = Math.max(1, R * 0.008);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    for (const f of [1, 0.85, 0.7, 0.55]) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr * f, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, rr * 0.05), 0, TAU);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.stroke();
  }

  // Borde del void y bisel interior
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = Math.max(1.5, R * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.975, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = Math.max(1, R * 0.01);
  ctx.stroke();
  ctx.restore();
}

export function drawSceneComposite(
  ctx: CanvasRenderingContext2D,
  targetW: number,
  targetH: number,
  elements: SceneCompositeElements
): void {
  const { wallpaperImg, atmosphereCanvas, visualizerCanvas, isRainbowVoid, coverImg } = elements;
  const playerStore = usePlayerStore.getState();
  const blobSettings = playerStore.blobSettings || {};

  // ── 1. Fondo de escena: base oscura + wallpaper con la misma opacidad/desenfoque que en pantalla ──
  ctx.fillStyle = '#050711';
  ctx.fillRect(0, 0, targetW, targetH);

  if (wallpaperImg && wallpaperImg.width > 0 && wallpaperImg.height > 0) {
    const ws = useWallpaperStore.getState().applicationSettings;
    const opacity = blobSettings.backgroundOpacity ?? ws?.opacity ?? 1;
    const blurPx = (blobSettings.backgroundBlur ?? ws?.blur ?? 0) * (targetH / Math.max(1, window.innerHeight));
    const brightness = ws?.brightness ?? 1;
    const saturation = ws?.saturation ?? 1;
    const hasFilters = blurPx > 0 || brightness !== 1 || saturation !== 1;

    const crop = calculateCenterCrop(wallpaperImg.width, wallpaperImg.height, targetW, targetH);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    if (hasFilters && 'filter' in ctx) {
      ctx.filter = `blur(${blurPx.toFixed(1)}px) brightness(${brightness}) saturate(${saturation})`;
    }
    ctx.drawImage(wallpaperImg, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, targetW, targetH);
    ctx.restore();

    // Velo suave para que el visualizador destaque
    ctx.fillStyle = 'rgba(2, 4, 10, 0.25)';
    ctx.fillRect(0, 0, targetW, targetH);
  } else {
    // Sin imagen: gradiente espacial
    const bgGrad = ctx.createRadialGradient(targetW / 2, targetH / 2, targetH * 0.1, targetW / 2, targetH / 2, targetH * 0.9);
    bgGrad.addColorStop(0, '#0c1224');
    bgGrad.addColorStop(0.5, '#050711');
    bgGrad.addColorStop(1, '#020306');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // ── 2. Atmósfera (partículas, lluvia, estrellas) ──
  if (atmosphereCanvas && atmosphereCanvas.width > 0 && atmosphereCanvas.height > 0) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(atmosphereCanvas, 0, 0, targetW, targetH);
      ctx.restore();
    } catch {
      // canvas bloqueado
    }
  }

  // ── 3. Visualizador ──
  if (!visualizerCanvas || visualizerCanvas.width <= 0 || visualizerCanvas.height <= 0) return;

  if (isRainbowVoid) {
    const posX = (targetW * (blobSettings.posX ?? 50)) / 100;
    const posY = (targetH * (blobSettings.posY ?? 50)) / 100;
    const isVertical = targetH > targetW;
    const diameter = isVertical ? Math.round(targetW * 0.75) : Math.round(targetH * 0.58);

    // Escala pantalla → captura y posición/tamaño reales del disco (incluye el rebote de graves)
    const canvasRect = visualizerCanvas.getBoundingClientRect();
    const scale = canvasRect.width > 0 ? diameter / canvasRect.width : 1;
    const disc = document.querySelector<HTMLElement>('[data-void-disc]');
    let discX = posX;
    let discY = posY;
    let discR = (diameter / 2) * 0.26;
    if (disc) {
      const dr = disc.getBoundingClientRect();
      discX = posX + (dr.left + dr.width / 2 - (canvasRect.left + canvasRect.width / 2)) * scale;
      discY = posY + (dr.top + dr.height / 2 - (canvasRect.top + canvasRect.height / 2)) * scale;
      discR = (dr.width / 2) * scale;
    }

    // Resplandor ambiental sutil del color principal
    const isLucid = playerStore.isLucid;
    const primary = isLucid ? playerStore.lucidPrimaryColor || playerStore.lucidTheme?.primary || '#00e5ff' : '#00f2fe';
    const glow = ctx.createRadialGradient(discX, discY, discR * 0.8, discX, discY, discR * 3);
    glow.addColorStop(0, toRgba(primary, 0.12));
    glow.addColorStop(1, toRgba(primary, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(discX, discY, discR * 3, 0, TAU);
    ctx.fill();

    // Disco central (portada) y, encima, los efectos del canvas de Rainbow Void
    drawVoidDisc(ctx, discX, discY, discR, coverImg ?? null, disc);
    ctx.drawImage(visualizerCanvas, posX - diameter / 2, posY - diameter / 2, diameter, diameter);
  } else {
    // Visualizadores a pantalla completa (Synthwave, Warp, Terrain)
    const crop = calculateCenterCrop(visualizerCanvas.width, visualizerCanvas.height, targetW, targetH);
    ctx.drawImage(visualizerCanvas, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, targetW, targetH);
  }
}
