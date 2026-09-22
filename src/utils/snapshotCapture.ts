/**
 * Snapshot Capture Utility for Aura3D
 * Captures clean visualizer canvas frames and exports them as wallpapers (Full HD up to 4K resolution)
 * with precise aspect ratio framing (16:9, 9:16, 1:1, 4:5, or native viewport)
 * without any UI elements obscuring the visualizer.
 */

import { usePlayerStore } from '../stores/playerStore';
import { findVisualizerCanvas } from './visualizerCanvas';

export type SnapshotAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | 'viewport';

export interface CaptureOptions {
  resolution?: '1080p' | '4k' | 'viewport';
  aspectRatio?: SnapshotAspectRatio;
  trackTitle?: string;
  format?: 'png' | 'jpeg';
  includeWatermark?: boolean;
}

export function getDimensionsForAspect(
  ratio: SnapshotAspectRatio,
  resolution: '1080p' | '4k' | 'viewport',
  nativeW: number,
  nativeH: number
): { targetW: number; targetH: number } {
  if (ratio === 'viewport' || resolution === 'viewport') {
    return { targetW: nativeW, targetH: nativeH };
  }

  const is4k = resolution === '4k';

  switch (ratio) {
    case '9:16':
      return is4k ? { targetW: 2160, targetH: 3840 } : { targetW: 1080, targetH: 1920 };
    case '1:1':
      return is4k ? { targetW: 2160, targetH: 2160 } : { targetW: 1080, targetH: 1080 };
    case '4:5':
      return is4k ? { targetW: 1728, targetH: 2160 } : { targetW: 1080, targetH: 1350 };
    case '16:9':
    default:
      return is4k ? { targetW: 3840, targetH: 2160 } : { targetW: 1920, targetH: 1080 };
  }
}

/**
 * Fast content bounding-box detection via downsampling (< 1ms).
 * Trims excess empty border space for centered circular visualizers (e.g. Rainbow Void)
 * while preserving full frame coverage for 3D worlds.
 */
function getContentBoundingBox(
  sourceCanvas: HTMLCanvasElement
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
  try {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    if (w <= 0 || h <= 0) return null;

    const sampleW = Math.min(120, w);
    const sampleH = Math.min(120, h);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sampleW;
    tempCanvas.height = sampleH;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return null;

    tempCtx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);
    const imgData = tempCtx.getImageData(0, 0, sampleW, sampleH).data;

    let minX = sampleW;
    let minY = sampleH;
    let maxX = 0;
    let maxY = 0;
    let foundContent = false;

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3];

        if (a > 20 && (r > 8 || g > 8 || b > 8)) {
          foundContent = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundContent || maxX < minX || maxY < minY) return null;

    const scaleX = w / sampleW;
    const scaleY = h / sampleH;

    const rawMinX = minX * scaleX;
    const rawMaxX = (maxX + 1) * scaleX;
    const rawMinY = minY * scaleY;
    const rawMaxY = (maxY + 1) * scaleY;

    const boxW = rawMaxX - rawMinX;
    const boxH = rawMaxY - rawMinY;
    const padX = boxW * 0.08;
    const padY = boxH * 0.08;

    const clampedMinX = Math.max(0, rawMinX - padX);
    const clampedMinY = Math.max(0, rawMinY - padY);
    const clampedMaxX = Math.min(w, rawMaxX + padX);
    const clampedMaxY = Math.min(h, rawMaxY + padY);

    return {
      minX: clampedMinX,
      minY: clampedMinY,
      maxX: clampedMaxX,
      maxY: clampedMaxY,
      width: clampedMaxX - clampedMinX,
      height: clampedMaxY - clampedMinY,
    };
  } catch {
    return null;
  }
}

export async function captureVisualizerSnapshot(options: CaptureOptions = {}): Promise<boolean> {
  const {
    resolution = '4k',
    aspectRatio = '16:9',
    trackTitle = 'Aura3D_Visualizer',
    format = 'png',
    includeWatermark = false,
  } = options;

  try {
    // 1. Locate the active visualizer canvas with centralized finder
    const targetCanvas = findVisualizerCanvas();

    if (!targetCanvas) {
      console.warn('[SnapshotCapture] No se encontró ningún canvas visualizador activo para capturar.');
      return false;
    }

    const bbox = getContentBoundingBox(targetCanvas);
    const srcX = bbox ? bbox.minX : 0;
    const srcY = bbox ? bbox.minY : 0;
    const srcW = bbox ? bbox.width : targetCanvas.width;
    const srcH = bbox ? bbox.height : targetCanvas.height;

    // 2. Calculate target dimensions based on requested aspect ratio & resolution
    const { targetW, targetH } = getDimensionsForAspect(
      aspectRatio,
      resolution,
      targetCanvas.width,
      targetCanvas.height
    );

    const hiResCanvas = document.createElement('canvas');
    hiResCanvas.width = targetW;
    hiResCanvas.height = targetH;
    const ctx = hiResCanvas.getContext('2d', { alpha: false });

    if (!ctx) {
      console.error('[SnapshotCapture] No se pudo obtener el contexto 2D.');
      return false;
    }

    // High quality bicubic rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Ambient background fill
    ctx.fillStyle = '#03050d';
    ctx.fillRect(0, 0, targetW, targetH);

    // 3. Compute precise center-crop from visualizer canvas (NO distortion / stretching)
    const srcAspect = srcW / srcH;
    const targetAspect = targetW / targetH;

    let cropW = srcW;
    let cropH = srcH;
    let cropX = srcX;
    let cropY = srcY;

    if (srcAspect > targetAspect) {
      cropW = srcH * targetAspect;
      cropX = srcX + (srcW - cropW) / 2;
    } else {
      cropH = srcW / targetAspect;
      cropY = srcY + (srcH - cropH) / 2;
    }

    // Draw pristine undistorted frame
    ctx.drawImage(targetCanvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

    // 4. Optional subtle watermark pill
    if (includeWatermark) {
      drawAuraWatermark(ctx, targetW, targetH, aspectRatio);
    }

    // 5. Non-blocking asynchronous Blob export (avoids main thread freeze in 4K)
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.98 : undefined;

    const cleanTitle = (trackTitle || 'Visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const ratioTag = aspectRatio.replace(':', '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Aura3D_${resolution.toUpperCase()}_${ratioTag}_${cleanTitle}_${timestamp}.${format}`;

    const blob = await new Promise<Blob | null>((resolve) =>
      hiResCanvas.toBlob(resolve, mimeType, quality)
    );

    if (!blob) {
      console.error('[SnapshotCapture] Error al generar blob de la imagen.');
      return false;
    }

    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    }, 1000);

    return true;
  } catch (err) {
    console.error('[SnapshotCapture] Error al exportar captura:', err);
    return false;
  }
}

function drawAuraWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ratio: SnapshotAspectRatio
): void {
  const currentTrack = usePlayerStore.getState().currentTrack;
  const title = currentTrack?.title || 'Aura3D Soundscape';

  ctx.save();
  const isVertical = ratio === '9:16' || ratio === '4:5';
  const cardW = isVertical ? Math.min(width * 0.85, 720) : Math.min(width * 0.45, 580);
  const cardH = isVertical ? 90 : 70;
  const cardX = (width - cardW) / 2;
  const cardY = height - cardH - (isVertical ? 80 : 40);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 24;

  ctx.fillStyle = 'rgba(7, 10, 20, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';

  // Badge text
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('● AURA 3D MASTER CAPTURE', cardX + 22, cardY + 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  const displayTitle = title.length > 32 ? title.substring(0, 30) + '...' : title;
  ctx.fillText(displayTitle, cardX + 22, cardY + 52);

  ctx.restore();
}
