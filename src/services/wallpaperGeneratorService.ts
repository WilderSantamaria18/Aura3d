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

/** Dimensiones nativas optimizadas para IA (múltiplos de 64, sin deformación) */
const HORDE_NATIVE_DIMS: Record<WallpaperAspectRatio, { width: number; height: number }> = {
  '16:9': { width: 896, height: 512 },
  '21:9': { width: 896, height: 384 },
  '9:16': { width: 512, height: 896 },
  '1:1': { width: 512, height: 512 },
  '4:3': { width: 768, height: 576 },
};

/** Resoluciones estándar según la relación de aspecto y nivel de calidad */
const STANDARD_DIMS: Record<WallpaperAspectRatio, Record<WallpaperQuality, { width: number; height: number }>> = {
  '16:9': {
    hd: { width: 1280, height: 720 },
    fhd: { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  },
  '21:9': {
    hd: { width: 1680, height: 720 },
    fhd: { width: 2560, height: 1080 },
    '4k': { width: 5120, height: 2160 },
  },
  '9:16': {
    hd: { width: 720, height: 1280 },
    fhd: { width: 1080, height: 1920 },
    '4k': { width: 2160, height: 3840 },
  },
  '1:1': {
    hd: { width: 1080, height: 1080 },
    fhd: { width: 1440, height: 1440 },
    '4k': { width: 2880, height: 2880 },
  },
  '4:3': {
    hd: { width: 960, height: 720 },
    fhd: { width: 1440, height: 1080 },
    '4k': { width: 2880, height: 2160 },
  },
};

export interface WallpaperDimensions {
  /** Resolución final que se guarda */
  width: number;
  height: number;
  /** Resolución que se pide a la IA (múltiplos de 64) */
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
   */
  static getDimensions(aspectRatio: WallpaperAspectRatio, quality: WallpaperQuality = 'fhd'): WallpaperDimensions {
    const finalDims = STANDARD_DIMS[aspectRatio]?.[quality] ?? STANDARD_DIMS['16:9'][quality];
    const native = HORDE_NATIVE_DIMS[aspectRatio] ?? HORDE_NATIVE_DIMS['16:9'];
    return {
      width: finalDims.width,
      height: finalDims.height,
      nativeWidth: native.width,
      nativeHeight: native.height,
    };
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
    // 1. Backend local (Hugging Face FLUX.1-schnell)
    onProgress?.(25);
    let resp: Response;
    try {
      resp = await fetchWithTimeout(
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
    } catch (err: any) {
      console.warn('[WallpaperGeneratorService] Backend no disponible:', err);
      throw new Error(
        'No se pudo conectar con el servidor backend. Verifica que esté corriendo con "npm run dev".'
      );
    }

    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      if (errData?.error) {
        throw new Error(errData.error);
      }
      throw new Error(`El servidor de IA respondió con error HTTP ${resp.status}`);
    }

    const data = await resp.json().catch(() => null);
    if (!data?.success || !data?.url) {
      throw new Error(data?.error || 'No se recibió una URL válida de la imagen generada.');
    }

    onProgress?.(55);
    const imgResp = await fetchWithTimeout(data.url, {}, 45000);
    if (!imgResp.ok) {
      throw new Error('No se pudo descargar la imagen generada por el servidor.');
    }

    const blob = await imgResp.blob();
    if (blob.size < 1000) {
      throw new Error('La imagen devuelta por la IA está corrupta o incompleta.');
    }

    return blob;
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
