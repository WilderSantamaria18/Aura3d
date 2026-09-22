/**
 * romanizationService.ts — Romanization & Furigana Service
 *
 * Provides Japanese romaji conversion and furigana parsing.
 * Features:
 *  - Lazy dictionary loading (only initialized when mode !== 'off')
 *  - High-performance memoization cache per line
 *  - Fast fallback with wanakana for kana conversion
 */

import * as wanakana from 'wanakana';
import type { RomanizationMode } from '../types/lyrics';

export interface FuriganaSegment {
  kanji: string;
  reading: string;
}

export interface RomanizeResult {
  original: string;
  romanized?: string;
  furigana?: FuriganaSegment[];
}

const cache = new Map<string, RomanizeResult>();

let kuroshiroInstance: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Lazy-initializes Kuroshiro with KuromojiAnalyzer on demand.
 */
export const initRomanization = async (): Promise<void> => {
  if (kuroshiroInstance) return;
  if (initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      // Dynamic import to keep initial bundle ultra-lightweight
      const { default: Kuroshiro } = await import('kuroshiro');
      const { default: KuromojiAnalyzer } = await import('kuroshiro-analyzer-kuromoji');

      const kuro = new Kuroshiro();
      await kuro.init(new KuromojiAnalyzer());
      kuroshiroInstance = kuro;
    } catch (err) {
      console.warn('[RomanizationService] Kuromoji dictionary load deferred or failed, falling back to Wanakana:', err);
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
};

/**
 * Romanizes or adds furigana to a single line of lyrics.
 * Results are cached in memory.
 */
export const romanizeLine = async (
  text: string,
  mode: RomanizationMode,
  language = 'ja'
): Promise<RomanizeResult> => {
  if (!text || mode === 'off' || language !== 'ja') {
    return { original: text };
  }

  const cacheKey = `${mode}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // If mode is romaji, wanakana can convert kana immediately
  if (mode === 'romaji') {
    let romaji = '';
    if (kuroshiroInstance) {
      try {
        romaji = await kuroshiroInstance.convert(text, { to: 'romaji', mode: 'spaced' });
      } catch {
        romaji = wanakana.toRomaji(text);
      }
    } else {
      romaji = wanakana.toRomaji(text);
      // Trigger lazy init in background
      if (!isInitializing && !kuroshiroInstance) {
        initRomanization().catch(() => {});
      }
    }

    const result: RomanizeResult = { original: text, romanized: romaji };
    cache.set(cacheKey, result);
    return result;
  }

  // Furigana mode: requires Kuroshiro furigana mode (ruby tags)
  if (mode === 'furigana') {
    if (!kuroshiroInstance) {
      await initRomanization();
    }

    if (kuroshiroInstance) {
      try {
        // Kuroshiro furigana returns HTML <ruby>kanji<rp>(</rp><rt>reading</rt><rp>)</rp></ruby>
        const rubyHtml: string = await kuroshiroInstance.convert(text, {
          to: 'hiragana',
          mode: 'furigana',
        });

        // Parse into structured segments
        const segments: FuriganaSegment[] = [];
        const rubyRegex = /<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = rubyRegex.exec(rubyHtml)) !== null) {
          if (match.index > lastIndex) {
            const plain = rubyHtml.substring(lastIndex, match.index).replace(/<[^>]+>/g, '');
            if (plain) segments.push({ kanji: plain, reading: '' });
          }
          segments.push({ kanji: match[1], reading: match[2] });
          lastIndex = rubyRegex.lastIndex;
        }

        if (lastIndex < rubyHtml.length) {
          const remaining = rubyHtml.substring(lastIndex).replace(/<[^>]+>/g, '');
          if (remaining) segments.push({ kanji: remaining, reading: '' });
        }

        const result: RomanizeResult = {
          original: text,
          furigana: segments.length > 0 ? segments : [{ kanji: text, reading: '' }],
        };
        cache.set(cacheKey, result);
        return result;
      } catch {
        const fallback: RomanizeResult = { original: text };
        cache.set(cacheKey, fallback);
        return fallback;
      }
    }
  }

  return { original: text };
};

/**
 * Clears the romanization cache
 */
export const clearRomanizationCache = (): void => {
  cache.clear();
};
