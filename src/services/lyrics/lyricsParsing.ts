/**
 * Parseo de letras LRC / Enhanced LRC. Puro y sin dependencias: lo comparten el
 * pipeline de red y `LyricsService`.
 */
import type { LyricLine, LyricsData, EnhancedLyricLine, EnhancedLyricsData, LyricWord } from '../../types/lyrics';

const LINE_TIME_REGEX = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
const WORD_TAG_REGEX = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/g;

function toSeconds(minutes: string, seconds: string, millis?: string): number {
  const m = parseInt(minutes, 10);
  const s = parseInt(seconds, 10);
  const ms = millis ? parseInt(millis.padEnd(3, '0').slice(0, 3), 10) : 0;
  return m * 60 + s + ms / 1000;
}

/** Parsea LRC estándar (`[mm:ss.xx]`) o texto plano sin tiempos. */
export function parseLRC(lrcText: string): LyricsData {
  if (!lrcText || typeof lrcText !== 'string') {
    return { synced: false, lines: [], source: 'none' };
  }

  const rawLines = lrcText.split('\n');
  const result: LyricLine[] = [];
  let autoId = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const timeRegex = new RegExp(LINE_TIME_REGEX.source, 'g');
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const text = line.replace(new RegExp(LINE_TIME_REGEX.source, 'g'), '').trim();
    for (const match of matches) {
      result.push({
        id: ++autoId,
        time: toSeconds(match[1], match[2], match[3]),
        text: text || '♪',
      });
    }
  }

  if (result.length > 0) {
    result.sort((a, b) => a.time - b.time);
    return { synced: true, lines: result, source: 'lrc' };
  }

  const plainLines: LyricLine[] = rawLines
    .filter((l) => l.trim().length > 0)
    .map((text, idx) => ({ id: idx + 1, time: idx * 4, text: text.trim() }));

  return { synced: false, lines: plainLines, source: 'lrc' };
}

export function wrapAsEnhanced(data: LyricsData): EnhancedLyricsData {
  return { ...data, lines: data.lines as EnhancedLyricLine[], isWordSynced: false };
}

/** Parsea LRC con sincronía por palabra (`<mm:ss.xx>`), con respaldo a LRC estándar. */
export function parseEnhancedLRC(lrcText: string): EnhancedLyricsData {
  if (!lrcText || typeof lrcText !== 'string') {
    return { synced: false, lines: [], source: 'none', isWordSynced: false };
  }

  const hasWordTags = new RegExp(WORD_TAG_REGEX.source).test(lrcText);
  if (!hasWordTags) {
    return wrapAsEnhanced(parseLRC(lrcText));
  }

  const rawLines = lrcText.split('\n');
  const enhancedLines: EnhancedLyricLine[] = [];
  let autoId = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lineMatches = [...line.matchAll(new RegExp(LINE_TIME_REGEX.source, 'g'))];
    if (lineMatches.length === 0) continue;

    const contentPart = line.replace(new RegExp(LINE_TIME_REGEX.source, 'g'), '').trim();
    if (!contentPart) continue;

    const wordMatches = [...contentPart.matchAll(/<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>\s*([^<]*)/g)];
    const cleanText = contentPart.replace(new RegExp(WORD_TAG_REGEX.source, 'g'), '').trim();

    for (const lineMatch of lineMatches) {
      const lineTime = toSeconds(lineMatch[1], lineMatch[2], lineMatch[3]);
      let words: LyricWord[] | undefined;

      if (wordMatches.length > 0) {
        const parsed: LyricWord[] = wordMatches
          .map((match) => ({
            text: match[4].trim(),
            startTime: toSeconds(match[1], match[2], match[3]),
            endTime: 0,
          }))
          .filter((word) => word.text.length > 0);

        for (let i = 0; i < parsed.length; i++) {
          parsed[i].endTime = i + 1 < parsed.length ? parsed[i + 1].startTime : lineTime + 4.5;
        }
        words = parsed;
      }

      enhancedLines.push({ id: ++autoId, time: lineTime, text: cleanText || '♪', words });
    }
  }

  if (enhancedLines.length === 0) {
    const wrapped = wrapAsEnhanced(parseLRC(lrcText));
    wrapped.language = detectLanguage(lrcText);
    return wrapped;
  }

  enhancedLines.sort((a, b) => a.time - b.time);

  return {
    synced: true,
    lines: enhancedLines,
    source: 'lrc',
    isWordSynced: true,
    language: detectLanguage(lrcText),
  };
}

/** Letra sin tiempos (proveedor secundario: texto plano) → líneas con intervalo ficticio. */
export function plainTextToLines(plainLyrics: string): EnhancedLyricsData {
  const lines = (plainLyrics || '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((text, idx) => ({ id: idx + 1, time: idx * 4, text: text.trim() }));
  return { synced: false, lines, source: 'api', isWordSynced: false };
}

/** Detecta el idioma de la letra para romanización y furigana. */
export function detectLanguage(text: string): 'ja' | 'ko' | 'zh' | 'en' | 'es' | 'unknown' {
  if (!text) return 'unknown';

  const jaCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  const koCount = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;

  if (jaCount > 0) return 'ja';
  if (koCount > 0) return 'ko';
  if (cjkCount > 2) return 'zh';

  const esCount = (text.match(/[áéíóúüñ¿¡]/gi) || []).length;
  if (esCount > 0) return 'es';
  if (/[a-zA-Z]/.test(text)) return 'en';
  return 'unknown';
}
