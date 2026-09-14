/**
 * Snapshot Capture Utility for Aura3D
 * Captures clean WebGL canvas frames and exports them as wallpapers (up to 4K resolution)
 * without any UI elements obscuring the visualizer.
 */

export interface CaptureOptions {
  resolution?: 'viewport' | '1080p' | '4k';
  trackTitle?: string;
  format?: 'png' | 'jpeg';
}

export async function captureVisualizerSnapshot(options: CaptureOptions = {}): Promise<boolean> {
  const {
    resolution = '4k',
    trackTitle = 'Aura3D_Visualizer',
    format = 'png'
  } = options;

  try {
    // 1. Locate the WebGL Canvas (SceneContainer or active visualizer)
    const canvases = Array.from(document.querySelectorAll('canvas'));
    // Find the 3D canvas (prefer one with WebGL context)
    const webglCanvas = canvases.find((c) => {
      const isWebGL = c.getContext('webgl2') || c.getContext('webgl');
      const rect = c.getBoundingClientRect();
      return isWebGL && rect.width > 300 && rect.height > 300;
    }) || canvases[0];

    if (!webglCanvas) {
      console.warn('[SnapshotCapture] No WebGL canvas found for snapshot.');
      return false;
    }

    let exportCanvas: HTMLCanvasElement = webglCanvas;

    // 2. If 4K or 1080p requested, create a high-res target canvas
    if (resolution === '4k' || resolution === '1080p') {
      const targetWidth = resolution === '4k' ? 3840 : 1920;
      const targetHeight = resolution === '4k' ? 2160 : 1080;

      const hiResCanvas = document.createElement('canvas');
      hiResCanvas.width = targetWidth;
      hiResCanvas.height = targetHeight;
      const ctx = hiResCanvas.getContext('2d', { alpha: false });

      if (ctx) {
        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dark ambient background fill
        ctx.fillStyle = '#03050c';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Aspect ratio preservation (fit / cover centered)
        const srcAspect = webglCanvas.width / webglCanvas.height;
        const dstAspect = targetWidth / targetHeight;

        let drawW = targetWidth;
        let drawH = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (srcAspect > dstAspect) {
          drawW = targetHeight * srcAspect;
          offsetX = (targetWidth - drawW) / 2;
        } else {
          drawH = targetWidth / srcAspect;
          offsetY = (targetHeight - drawH) / 2;
        }

        ctx.drawImage(webglCanvas, offsetX, offsetY, drawW, drawH);
        exportCanvas = hiResCanvas;
      }
    }

    // 3. Convert to data URL or Blob
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.95 : undefined;
    const dataUrl = exportCanvas.toDataURL(mimeType, quality);

    // 4. Trigger download
    const cleanTitle = (trackTitle || 'Visualizer')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Aura3D_${resolution.toUpperCase()}_${cleanTitle}_${timestamp}.${format}`;

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    return true;
  } catch (err) {
    console.error('[SnapshotCapture] Error exporting snapshot:', err);
    return false;
  }
}
