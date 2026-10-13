/**
 * LyricsService — fachada del sistema de letras.
 *
 * El parseo vive en `./lyrics/lyricsParsing` y la búsqueda en `./lyrics/lyricsPipeline`
 * (pipeline acotado de 4 pasos con caché, backoff y circuit breaker). Aquí se conserva
 * la API estática que ya usaba el resto de la aplicación.
 */
import type { LyricLine, LyricsData, EnhancedLyricLine, EnhancedLyricsData } from '../types/lyrics';
import { lyricsPipeline } from './lyrics/lyricsPipeline';
import {
  detectLanguage as detectLanguageFromText,
  parseEnhancedLRC as parseEnhancedLRCInternal,
  parseLRC as parseLRCInternal,
  plainTextToLines,
  wrapAsEnhanced as wrapAsEnhancedInternal,
} from './lyrics/lyricsParsing';
import {
  cleanMusicTitle,
  normalizeMusicMetadata,
  splitArtistFromTitle,
  type NormalizedMusicMetadata,
} from '../utils/musicMetadata';

export interface LyricsFetchOptions {
  signal?: AbortSignal;
  force?: boolean;
}

const EMPTY: EnhancedLyricsData = { synced: false, lines: [], source: 'none', isWordSynced: false };

export class LyricsService {
  /** Parsea `.lrc` estándar (`[mm:ss.xx]`) o texto plano. */
  public static parseLRC(lrcText: string): LyricsData {
    return parseLRCInternal(lrcText);
  }

  /** Parsea Enhanced LRC con sincronía por palabra y cae a LRC estándar si no la hay. */
  public static parseEnhancedLRC(lrcText: string): EnhancedLyricsData {
    return parseEnhancedLRCInternal(lrcText);
  }

  public static wrapAsEnhanced(data: LyricsData): EnhancedLyricsData {
    return wrapAsEnhancedInternal(data);
  }

  /** Metadatos normalizados de una pista (título limpio + artista fiable). */
  public static normalizeMetadata(
    artist: string,
    title: string,
    album?: string,
    duration?: number
  ): NormalizedMusicMetadata {
    return normalizeMusicMetadata({ artist, title, album, duration });
  }

  /**
   * Variantes del artista. Antes generaba hasta 10 (y el pipeline las consultaba todas);
   * ahora sólo se usa para compatibilidad: como mucho 2 entradas.
   */
  public static getArtistCandidates(rawArtist: string): string[] {
    const base = (rawArtist || '').trim();
    if (!base) return [];
    const candidates = [base];
    const withoutSecondary = base.replace(/\s+(?:y\s+(?:su|sus)\s+|de\s+).+$/i, '').trim();
    if (withoutSecondary && withoutSecondary !== base) candidates.push(withoutSecondary);
    return candidates.slice(0, 2);
  }

  /**
   * Variantes del título. La versión anterior convertía «Callaíta - 432 hertz» en
   * «432 hertz» (se quedaba con el lado derecho del guion). Ahora se limpia y se
   * devuelve como mucho 2 entradas: la limpia y la original.
   */
  public static getTitleCandidates(rawTitle: string): string[] {
    const base = (rawTitle || '').trim();
    if (!base) return [];
    const cleaned = cleanMusicTitle(splitArtistFromTitle(base).title);
    if (cleaned && cleaned !== base) return [cleaned, base].slice(0, 2);
    return [base];
  }

  /**
   * Busca la letra con el pipeline acotado y devuelve los datos (compatibilidad).
   * Para conocer el estado de la búsqueda (`not_found`, `temporarily_unavailable`…)
   * usa `lyricsPipeline.lookup()` directamente.
   */
  public static async fetchFromLRCLIB(
    artist: string,
    title: string,
    album?: string,
    duration?: number,
    options: LyricsFetchOptions = {}
  ): Promise<EnhancedLyricsData> {
    if (!(artist || '').trim() && !(title || '').trim()) return EMPTY;
    try {
      const result = await lyricsPipeline.lookup(
        { artist, title, album, duration },
        { signal: options.signal, force: options.force }
      );
      return result.data;
    } catch {
      // Cancelación o fallo inesperado: quien llama decide qué mostrar.
      return EMPTY;
    }
  }

  /** Proveedor secundario directo (se mantiene para compatibilidad). */
  public static async fetchFromLyricsOvh(artist: string, title: string): Promise<EnhancedLyricsData> {
    const cleanArtist = encodeURIComponent((artist || '').trim());
    const cleanTitle = encodeURIComponent((title || '').trim());
    if (!cleanArtist || !cleanTitle) return EMPTY;
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);
      if (!response.ok) return EMPTY;
      const data = (await response.json()) as { lyrics?: string };
      if (!data?.lyrics) return EMPTY;
      return { ...plainTextToLines(data.lyrics), source: 'api' };
    } catch {
      return EMPTY;
    }
  }
}

/** Detecta el idioma de la letra (romanización / furigana). */
export const detectLanguage = detectLanguageFromText;

export type { LyricLine, LyricsData, EnhancedLyricLine, EnhancedLyricsData };
