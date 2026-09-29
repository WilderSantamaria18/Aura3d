import type {
  WallpaperGenerationRequest,
  WallpaperGenerationResult,
  WallpaperAspectRatio,
  WallpaperQuality,
} from '../types/wallpaper';
import { enhancePrompt, buildNegativePrompt } from './wallpaperPresetsService';
import { WallpaperCacheService } from './wallpaperCacheService';
import { upscaleImage, blobToDataUrl } from './imageUpscale';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

/** Lado largo máximo que la IA entrega de forma nativa y fiable */
const NATIVE_LONG_SIDE = 2048;

/** Relación de aspecto → proporción ancho:alto */
const RATIO: Record<WallpaperAspectRatio, [number, number]> = {
  '16:9': [16, 9],
  '21:9': [21, 9],
  '9:16': [9, 16],
  '1:1': [1, 1],
  '4:3': [4, 3],
};

/** Lado largo final por calidad */
const TARGET_LONG_SIDE: Record<WallpaperQuality, number> = {
  hd: 1280,
  fhd: 1920,
  '4k': 3840,
};

const round16 = (v: number) => Math.max(16, Math.round(v / 16) * 16);

export interface WallpaperDimensions {
  /** Resolución final que se guarda */
  width: number;
  height: number;
  /** Resolución que se pide a la IA (≤ 2048) */
  nativeWidth: number;
  nativeHeight: number;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class WallpaperGeneratorService {
  /**
   * Dimensiones finales y nativas según relación de aspecto y calidad.
   * 4K = 3840 px de lado largo (3840×2160 en 16:9).
   */
  static getDimensions(aspectRatio: WallpaperAspectRatio, quality: WallpaperQuality = 'fhd'): WallpaperDimensions {
    const [rw, rh] = RATIO[aspectRatio] ?? RATIO['16:9'];
    const long = TARGET_LONG_SIDE[quality];
    const scale = long / Math.max(rw, rh);
    const width = Math.round(rw * scale);
    const height = Math.round(rh * scale);

    const nativeLong = Math.min(long, NATIVE_LONG_SIDE);
    const ns = nativeLong / Math.max(rw, rh);
    const nativeWidth = round16(rw * ns);
    const nativeHeight = round16(rh * ns);
    return { width, height, nativeWidth, nativeHeight };
  }

  /**
   * Pide la imagen a la IA. Primero al backend local (guarda en disco y evita CORS) y, si no
   * responde, directo a FLUX. Si nada responde se lanza un error claro: ya NO se sustituye por
   * una foto de stock que no tiene relación con lo pedido.
   */
  private static async fetchNative(
    prompt: string,
    negative: string,
    request: WallpaperGenerationRequest,
    dims: WallpaperDimensions,
    seed: number,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    // 1. Backend local
    try {
      const resp = await fetchWithTimeout(
        `${BACKEND_URL}/api/wallpapers/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            negativePrompt: negative,
            aspectRatio: request.aspectRatio,
            style: request.style,
            palette: request.palette,
            width: dims.nativeWidth,
            height: dims.nativeHeight,
            seed,
          }),
        },
        90000
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.url && !data.isCuratedFallback) {
          const img = await fetchWithTimeout(data.url, {}, 45000);
          if (img.ok) {
            const blob = await img.blob();
            if (blob.size > 15000) return blob;
          }
        }
      }
    } catch (err) {
      console.warn('[WallpaperGeneratorService] Backend no disponible:', err);
    }

    onProgress?.(40);

    // 2. Directo a FLUX (2 intentos; la semilla cambia levemente si el primero falla)
    const cleanPrompt = encodeURIComponent(prompt);
    for (let attempt = 0; attempt < 2; attempt++) {
      const url =
        `https://image.pollinations.ai/prompt/${cleanPrompt}?model=flux` +
        `&width=${dims.nativeWidth}&height=${dims.nativeHeight}&seed=${seed + attempt}` +
        `&nologo=true&enhance=false&private=true`;
      try {
        const res = await fetchWithTimeout(url, {}, 90000);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 15000 && blob.type.startsWith('image/')) return blob;
        }
      } catch (err) {
        console.warn(`[WallpaperGeneratorService] FLUX intento ${attempt + 1} falló:`, err);
      }
      onProgress?.(50);
    }

    throw new Error(
      'El servicio de IA no respondió. Revisa tu conexión y vuelve a intentarlo (no se aplicó ninguna imagen de reemplazo).'
    );
  }

  /**
   * Genera un fondo con IA a la calidad pedida (HD / Full HD / 4K).
   */
  static async generate(
    request: WallpaperGenerationRequest,
    onProgress?: (progress: number) => void
  ): Promise<WallpaperGenerationResult> {
    const quality: WallpaperQuality = request.quality ?? 'fhd';
    const dims = this.getDimensions(request.aspectRatio, quality);
    const enhanced = enhancePrompt(request.prompt, request.style, request.palette);
    const negative = request.negativePrompt || buildNegativePrompt(request.style);
    const seed = request.seed || Math.floor(Math.random() * 10000000);

    onProgress?.(12);
    const native = await this.fetchNative(enhanced || request.prompt, negative, request, dims, seed, onProgress);
    onProgress?.(70);

    // Reescalado a la resolución final (solo si la IA entregó menos de lo pedido)
    const { blob, width, height } = await upscaleImage(native, dims.width, dims.height);
    onProgress?.(88);

    // Data URL: sobrevive a recargas y a la revocación de blob URLs
    const [url, thumbnail] = await Promise.all([blobToDataUrl(blob), this.createThumbnail(blob, 480)]);

    const result: WallpaperGenerationResult = {
      id: `wallpaper-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url,
      thumbnail,
      prompt: request.prompt,
      style: request.style,
      aspectRatio: request.aspectRatio,
      palette: request.palette,
      seed,
      createdAt: Date.now(),
      source: 'ai-generated',
      isFavorite: false,
      width,
      height,
      fileSize: blob.size,
      quality,
      nativeWidth: dims.nativeWidth,
      nativeHeight: dims.nativeHeight,
    };

    await WallpaperCacheService.save(result);
    onProgress?.(100);
    return result;
  }

  /**
   * Crea un thumbnail en base64 webp
   */
  static async createThumbnail(blob: Blob, targetWidth = 360): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const tempUrl = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspect = img.height / (img.width || 1);
        canvas.width = targetWidth;
        canvas.height = Math.round(targetWidth * aspect);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          URL.revokeObjectURL(tempUrl);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(tempUrl);
          resolve(tempUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve(tempUrl);
      };
      img.src = tempUrl;
    });
  }
}
