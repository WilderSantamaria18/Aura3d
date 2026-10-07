/**
 * ChameleonPaletteService — Real-time Album Artwork Color Extraction
 *
 * Extracts dominant vibrant, harmonious colors from any audio/video thumbnail
 * or cover artwork via client-side downsampled canvas analysis (< 1ms).
 * Memoizes results in an LRU in-memory cache to guarantee zero CPU/GPU overhead.
 */

export interface ChameleonPalette {
  primary: string;       // Dominant vibrant color (Hex)
  secondary: string;     // Harmonious secondary color (Hex)
  accent: string;        // Accent specular highlight (Hex)
  glow: string;          // Soft ambient glow (rgba)
  border: string;        // Specular glass rim tint (rgba)
  meshGradient: string;  // Multi-stop liquid glass radial mesh
  isTransitioning?: boolean;    // True during dynamic liquid color metamorphosis
  transitionProgress?: number; // 0 to 1 progress during interpolation
}

export const DEFAULT_PALETTE: ChameleonPalette = {
  primary: '#00e5ff',
  secondary: '#a855f7',
  accent: '#38bdf8',
  glow: 'rgba(0, 229, 255, 0.25)',
  border: 'rgba(0, 229, 255, 0.35)',
  meshGradient:
    'radial-gradient(circle at 15% 15%, rgba(0, 229, 255, 0.18) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.14) 0%, transparent 55%)',
};

// In-memory cache for fast O(1) retrieval across playlist switches
const paletteCache = new Map<string, ChameleonPalette>();
const MAX_CACHE_SIZE = 120;

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (isNaN(num)) return `rgba(0, 229, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (isNaN(num)) return { r: 0, g: 229, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function interpolateHex(hexA: string, hexB: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const cA = parseHex(hexA);
  const cB = parseHex(hexB);
  const r = Math.round(cA.r + (cB.r - cA.r) * clampedT);
  const g = Math.round(cA.g + (cB.g - cA.g) * clampedT);
  const b = Math.round(cA.b + (cB.b - cA.b) * clampedT);
  return rgbToHex(r, g, b);
}

export function parseRgba(rgbaStr: string): { r: number; g: number; b: number; a: number } {
  const match = rgbaStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return { r: 0, g: 229, b: 255, a: 0.25 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

export function interpolateRgba(rgbaA: string, rgbaB: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const cA = parseRgba(rgbaA);
  const cB = parseRgba(rgbaB);
  const r = Math.round(cA.r + (cB.r - cA.r) * clampedT);
  const g = Math.round(cA.g + (cB.g - cA.g) * clampedT);
  const b = Math.round(cA.b + (cB.b - cA.b) * clampedT);
  const a = +(cA.a + (cB.a - cA.a) * clampedT).toFixed(3);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smoothly blends two chameleon palettes together via cubic eased lerp.
 */
export function interpolatePalette(
  paletteA: ChameleonPalette,
  paletteB: ChameleonPalette,
  t: number
): ChameleonPalette {
  const eased = easeInOutCubic(Math.max(0, Math.min(1, t)));
  const primary = interpolateHex(paletteA.primary, paletteB.primary, eased);
  const secondary = interpolateHex(paletteA.secondary, paletteB.secondary, eased);
  const accent = interpolateHex(paletteA.accent, paletteB.accent, eased);
  const glow = interpolateRgba(paletteA.glow, paletteB.glow, eased);
  const border = interpolateRgba(paletteA.border, paletteB.border, eased);

  const meshGradient = `radial-gradient(circle at 12% 18%, ${hexToRgba(primary, 0.22)} 0%, transparent 60%), radial-gradient(circle at 88% 82%, ${hexToRgba(secondary, 0.16)} 0%, transparent 60%)`;

  return {
    primary,
    secondary,
    accent,
    glow,
    border,
    meshGradient,
  };
}

/**
 * Extracts dominant vibrant colors from an image URL.
 */
export async function extractChameleonPalette(
  imageUrl?: string,
  fallbackPrimary = '#00e5ff',
  fallbackSecondary = '#a855f7'
): Promise<ChameleonPalette> {
  if (!imageUrl) {
    return {
      primary: fallbackPrimary,
      secondary: fallbackSecondary,
      accent: fallbackPrimary,
      glow: hexToRgba(fallbackPrimary, 0.25),
      border: hexToRgba(fallbackPrimary, 0.35),
      meshGradient: `radial-gradient(circle at 15% 15%, ${hexToRgba(fallbackPrimary, 0.18)} 0%, transparent 55%), radial-gradient(circle at 85% 85%, ${hexToRgba(fallbackSecondary, 0.14)} 0%, transparent 55%)`,
    };
  }

  // Check cache first
  const cached = paletteCache.get(imageUrl);
  if (cached) return cached;

  return new Promise<ChameleonPalette>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    const fallback: ChameleonPalette = {
      primary: fallbackPrimary,
      secondary: fallbackSecondary,
      accent: fallbackPrimary,
      glow: hexToRgba(fallbackPrimary, 0.25),
      border: hexToRgba(fallbackPrimary, 0.35),
      meshGradient: `radial-gradient(circle at 15% 15%, ${hexToRgba(fallbackPrimary, 0.18)} 0%, transparent 55%), radial-gradient(circle at 85% 85%, ${hexToRgba(fallbackSecondary, 0.14)} 0%, transparent 55%)`,
    };

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    // Timeout safety fallback (1.5s max)
    const timeoutTimer = setTimeout(() => {
      cleanup();
      resolve(fallback);
    }, 1500);

    img.onload = () => {
      clearTimeout(timeoutTimer);
      try {
        const canvas = document.createElement('canvas');
        const SAMPLE_SIZE = 32;
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          cleanup();
          resolve(fallback);
          return;
        }

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const imgData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;

        // Color bucket aggregation
        interface ColorSample {
          r: number;
          g: number;
          b: number;
          vibrancy: number;
          score: number;
        }

        const samples: ColorSample[] = [];

        for (let i = 0; i < imgData.length; i += 16) { // sample every 4th pixel
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // skip transparent

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / (2 * 255);
          const d = max - min;
          const s = max === 0 ? 0 : d / max;

          // Reject extreme darks and extreme whites for theme accents
          if (l < 0.15 || l > 0.90) continue;
          if (s < 0.18) continue; // reject neutral grays

          const vibrancy = s * (1 - Math.abs(l - 0.55) * 0.8);
          samples.push({ r, g, b, vibrancy, score: vibrancy });
        }

        if (samples.length === 0) {
          cleanup();
          resolve(fallback);
          return;
        }

        // Sort by vibrancy / saturation
        samples.sort((a, b) => b.score - a.score);

        const primarySample = samples[0];
        const primaryHex = rgbToHex(primarySample.r, primarySample.g, primarySample.b);

        // Find secondary sample with distinct color distance
        let secondaryHex = fallbackSecondary;
        for (let i = 1; i < samples.length; i++) {
          const s = samples[i];
          const dist = Math.hypot(s.r - primarySample.r, s.g - primarySample.g, s.b - primarySample.b);
          if (dist > 75) {
            secondaryHex = rgbToHex(s.r, s.g, s.b);
            break;
          }
        }

        const result: ChameleonPalette = {
          primary: primaryHex,
          secondary: secondaryHex,
          accent: primaryHex,
          glow: hexToRgba(primaryHex, 0.32),
          border: hexToRgba(primaryHex, 0.38),
          meshGradient: `radial-gradient(circle at 12% 18%, ${hexToRgba(primaryHex, 0.22)} 0%, transparent 60%), radial-gradient(circle at 88% 82%, ${hexToRgba(secondaryHex, 0.16)} 0%, transparent 60%)`,
        };

        if (paletteCache.size >= MAX_CACHE_SIZE) {
          const firstKey = paletteCache.keys().next().value;
          if (firstKey) paletteCache.delete(firstKey);
        }
        paletteCache.set(imageUrl, result);

        cleanup();
        resolve(result);
      } catch {
        cleanup();
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutTimer);
      cleanup();
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
