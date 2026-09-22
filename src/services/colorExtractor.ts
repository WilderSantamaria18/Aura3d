/**
 * colorExtractor — Dominant color extraction from cover art
 *
 * Uses OffscreenCanvas (64x64 downsample) + simple frequency-based quantization
 * to extract 2 dominant colors from an image URL.
 *
 * Results are cached in a Map to avoid re-processing the same URL.
 * Processing runs in requestIdleCallback when available.
 */

export interface ColorPair {
  primary: string;   // Most dominant color (hex)
  secondary: string; // Second dominant color (hex)
}

const cache = new Map<string, ColorPair>();

const DEFAULT_COLORS: ColorPair = {
  primary: '#00f0ff',
  secondary: '#a855f7',
};

function componentToHex(c: number): string {
  return Math.round(c).toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/** Euclidean distance in RGB space */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Quantize pixel data into dominant colors using frequency bucketing.
 * Buckets pixels into 8x8x8 color groups, returns top 2 by frequency.
 */
function quantize(data: Uint8ClampedArray): ColorPair {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip nearly-transparent pixels and near-black/near-white (not visually useful)
    if (a < 128) continue;
    const brightness = (r + g + b) / 3;
    if (brightness < 25 || brightness > 235) continue;

    // Bucket key: reduce to 5-bit color (32 levels per channel)
    const rB = Math.round(r / 8) * 8;
    const gB = Math.round(g / 8) * 8;
    const bB = Math.round(b / 8) * 8;
    const key = rB + ',' + gB + ',' + bB;

    const existing = buckets.get(key);
    if (existing) {
      existing.count++;
    } else {
      buckets.set(key, { r: rB, g: gB, b: bB, count: 1 });
    }
  }

  if (buckets.size === 0) return DEFAULT_COLORS;

  // Sort by frequency descending
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const primary = sorted[0];

  // Find a second color sufficiently different from the primary
  let secondary = sorted[1] || primary;
  for (const candidate of sorted.slice(1)) {
    if (colorDistance(primary.r, primary.g, primary.b, candidate.r, candidate.g, candidate.b) > 60) {
      secondary = candidate;
      break;
    }
  }

  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
  };
}

/**
 * Extract the 2 dominant colors from an image URL.
 * Results are cached — repeated calls for the same URL are instant.
 *
 * @param imageUrl  URL of the album cover or any image
 * @returns Promise resolving to { primary, secondary } hex colors
 */
export async function extractDominantColor(imageUrl: string): Promise<ColorPair> {
  if (!imageUrl) return DEFAULT_COLORS;

  const cached = cache.get(imageUrl);
  if (cached) return cached;

  return new Promise<ColorPair>((resolve) => {
    const doExtract = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const SIZE = 64;
          const canvas = new OffscreenCanvas(SIZE, SIZE);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(DEFAULT_COLORS);
            return;
          }
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
          const colors = quantize(imageData.data);
          cache.set(imageUrl, colors);
          resolve(colors);
        } catch {
          resolve(DEFAULT_COLORS);
        }
      };

      img.onerror = () => resolve(DEFAULT_COLORS);
      img.src = imageUrl;
    };

    // Use requestIdleCallback when available to avoid blocking the main thread
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(doExtract, { timeout: 500 });
    } else {
      setTimeout(doExtract, 0);
    }
  });
}

/** Clear the color cache (e.g. when memory pressure is detected) */
export function clearColorCache(): void {
  cache.clear();
}
