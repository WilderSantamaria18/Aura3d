import { extractDominantColor } from './colorExtractor';
import { createLucidTheme, type LucidTheme } from '../types/audio';
import { useWallpaperStore } from '../stores/wallpaperStore';
import { usePlayerStore } from '../stores/playerStore';

function hexToHsl(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = (((h % 360) + 360) % 360) / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Eleva los colores extraídos a valores lúcidos/neón vibrantes
 * para que resplandezcan adecuadamente sobre cristal líquido y modos oscuros.
 */
export function enhanceColorForLucid(hex: string): string {
  try {
    const [h, s, l] = hexToHsl(hex);
    // Garantizar saturación alta y luminosidad legible sin llegar a blanco puro
    const boostedS = Math.max(0.78, Math.min(1.0, s * 1.35));
    const boostedL = Math.max(0.52, Math.min(0.68, l < 0.35 ? 0.54 : l > 0.82 ? 0.65 : l));
    return hslToHex(h, boostedS, boostedL);
  } catch {
    return hex;
  }
}

/**
 * Obtiene la URL de la imagen del fondo activo en el sistema.
 */
export function getActiveWallpaperUrl(): { url: string; title: string } | null {
  try {
    const wallpaperStore = useWallpaperStore.getState();
    if (wallpaperStore.currentWallpaper?.url) {
      return {
        url: wallpaperStore.currentWallpaper.url,
        title: wallpaperStore.currentWallpaper.title || 'Fondo Activo',
      };
    }
  } catch {
    // Ignore store access errors
  }

  try {
    const playerStore = usePlayerStore.getState();
    if (playerStore.blobSettings?.customBackgroundImage) {
      return {
        url: playerStore.blobSettings.customBackgroundImage,
        title: 'Fondo Personalizado',
      };
    }
    if (playerStore.currentTrack?.coverUrl) {
      return {
        url: playerStore.currentTrack.coverUrl,
        title: playerStore.currentTrack.title || 'Carátula',
      };
    }
  } catch {
    // Ignore store access errors
  }

  return null;
}

export interface WallpaperHarmonizationResult {
  primary: string;
  secondary: string;
  theme: LucidTheme;
  sourceTitle: string;
}

/**
 * Extrae y optimiza los colores del fondo de pantalla actual
 * para armonizar todo el ecosistema de Aura3D en Modo Lúcido.
 */
export async function combineColorsFromWallpaper(
  targetUrl?: string,
  targetTitle?: string
): Promise<WallpaperHarmonizationResult | null> {
  const active = targetUrl ? { url: targetUrl, title: targetTitle || 'Fondo' } : getActiveWallpaperUrl();
  if (!active || !active.url) return null;

  try {
    const extracted = await extractDominantColor(active.url);
    const primaryVibrant = enhanceColorForLucid(extracted.primary);
    let secondaryVibrant = enhanceColorForLucid(extracted.secondary);

    // Si ambos colores son muy idénticos en tono, generar un complementario armónico de 50°
    const [h1] = hexToHsl(primaryVibrant);
    const [h2] = hexToHsl(secondaryVibrant);
    if (Math.abs(h1 - h2) < 25 || Math.abs(h1 - h2) > 335) {
      const [sh, ss, sl] = hexToHsl(secondaryVibrant);
      secondaryVibrant = hslToHex((sh + 50) % 360, ss, sl);
    }

    const themeId = `wallpaper-sync-${Date.now()}`;
    const cleanTitle = active.title ? active.title.slice(0, 18) : 'Fondo';
    const themeName = `Fondo: ${cleanTitle}`;
    const theme = createLucidTheme(primaryVibrant, secondaryVibrant, themeName, themeId);

    return {
      primary: primaryVibrant,
      secondary: secondaryVibrant,
      theme,
      sourceTitle: active.title,
    };
  } catch (err) {
    console.error('Error combining colors with wallpaper:', err);
    return null;
  }
}
