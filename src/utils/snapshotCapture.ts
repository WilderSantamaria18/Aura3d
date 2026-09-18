/**
 * Snapshot Capture Utility for Aura3D
 * Captures clean WebGL canvas frames and exports them as wallpapers (Full HD up to 4K resolution)
 * with precise aspect ratio framing (16:9, 9:16, 1:1, 4:5, or native viewport)
 * without any UI elements obscuring the visualizer.
 */

import { usePlayerStore } from '../stores/playerStore';

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

export async function captureVisualizerSnapshot(options: CaptureOptions = {}): Promise<boolean> {
  const {
    resolution = '4k',
    aspectRatio = '16:9',
    trackTitle = 'Aura3D_Visualizer',
    format = 'png',
    includeWatermark = false,
  } = options;

  try {
    // 1. Locate the WebGL Canvas (SceneContainer, WarpTunnel, Terrain, BlackHole, Visualizer3D)
    const canvases = Array.from(document.querySelectorAll('canvas'));
    const webglCanvas =
      canvases.find((c) => {
        const isWebGL = c.getContext('webgl2') || c.getContext('webgl');
        const rect = c.getBoundingClientRect();
        return isWebGL && rect.width > 200 && rect.height > 200;
      }) || canvases[0];

    if (!webglCanvas) {
      console.warn('[SnapshotCapture] No se encontró ningún canvas WebGL para capturar.');
      return false;
    }

    const srcW = webglCanvas.width;
    const srcH = webglCanvas.height;

    // 2. Calculate target dimensions based on requested aspect ratio & resolution
    const { targetW, targetH } = getDimensionsForAspect(
      aspectRatio,
      resolution,
      srcW,
      srcH
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

    // 3. Compute precise center-crop from source WebGL canvas (NO distortion / stretching)
    const srcAspect = srcW / srcH;
    const targetAspect = targetW / targetH;

    let cropW = srcW;
    let cropH = srcH;
    let cropX = 0;
    let cropY = 0;

    if (srcAspect > targetAspect) {
      // Source canvas is wider than target: crop sides
      cropW = srcH * targetAspect;
      cropX = (srcW - cropW) / 2;
    } else {
      // Source canvas is taller than target: crop top and bottom
      cropH = srcW / targetAspect;
      cropY = (srcH - cropH) / 2;
    }

    // Draw pristine undistorted frame
    ctx.drawImage(webglCanvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

    // 4. Optional subtle watermark pill
    if (includeWatermark) {
      drawAuraWatermark(ctx, targetW, targetH, aspectRatio);
    }

    // 5. Export and trigger download
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.98 : undefined;
    const dataUrl = hiResCanvas.toDataURL(mimeType, quality);

    const cleanTitle = (trackTitle || 'Visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const ratioTag = aspectRatio.replace(':', '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Aura3D_${resolution.toUpperCase()}_${ratioTag}_${cleanTitle}_${timestamp}.${format}`;

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

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
