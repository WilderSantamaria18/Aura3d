import type { LyricLine, LyricsData, EnhancedLyricLine, EnhancedLyricsData, LyricWord } from '../types/lyrics';

export class LyricsService {
  /**
   * Parses .lrc content into structured synchronized lines.
   * Matches tags like [01:23.45] or [01:23.456] or [01:23]
   */
  public static parseLRC(lrcText: string): LyricsData {
    if (!lrcText || typeof lrcText !== 'string') {
      return { synced: false, lines: [], source: 'none' };
    }

    const lines = lrcText.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    let autoId = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Extract all timestamp tags on this line
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length > 0) {
        // Strip timestamps to get the clean text
        const text = line.replace(timeRegex, '').trim();

        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
          const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;

          result.push({
            id: ++autoId,
            time: totalSeconds,
            text: text || '♪',
          });
        }
      }
    }

    if (result.length > 0) {
      // Sort chronologically
      result.sort((a, b) => a.time - b.time);
      return {
        synced: true,
        lines: result,
        source: 'lrc',
      };
    }

    // If no timestamps were detected, return as plain text lines
    const plainLines: LyricLine[] = lines
      .filter((l) => l.trim().length > 0)
      .map((text, idx) => ({
        id: idx + 1,
        time: idx * 4, // dummy interval for preview
        text: text.trim(),
      }));

    return {
      synced: false,
      lines: plainLines,
      source: 'lrc',
    };
  }

  // In-memory cache for positive and negative (not found) lyrics lookups
  private static lyricsCache = new Map<string, EnhancedLyricsData>();
  private static inFlightRequests = new Map<string, Promise<EnhancedLyricsData>>();

  /**
   * Generates candidate variations for an artist name.
   * Strips secondary qualifiers like "de Walther Lozada", "y su orquesta", "feat. X", etc.
   */
  public static getArtistCandidates(rawArtist: string): string[] {
    const list: string[] = [];
    const base = rawArtist.trim();
    if (!base) return list;
    list.push(base);

    // Remove "de [Name]" suffix (e.g. "Armonía 10 de Walther Lozada" -> "Armonía 10")
    const strippedDe = base.replace(/\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+$/i, '').trim();
    if (strippedDe && !list.includes(strippedDe)) {
      list.push(strippedDe);
    }

    // Remove "y su / sus [Group/Orquesta]"
    const strippedOrquesta = base.replace(/\s+y\s+(su\s+|sus\s+).+$/i, '').trim();
    if (strippedOrquesta && !list.includes(strippedOrquesta)) {
      list.push(strippedOrquesta);
    }

    // Remove featured artists: "feat.", "ft.", "featuring", "with", "con"
    const strippedFeat = base.replace(/\s*(feat\.?|ft\.?|featuring|with|con)\s+.*$/i, '').trim();
    if (strippedFeat && !list.includes(strippedFeat)) {
      list.push(strippedFeat);
    }

    // Primary artist before comma/slash/semicolon
    const primary = base.split(/[,;&/]/)[0].trim();
    if (primary && !list.includes(primary)) {
      list.push(primary);
    }

    // Add unaccented versions (normalize NFD)
    for (const item of [...list]) {
      const unacc = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (unacc && !list.includes(unacc)) {
        list.push(unacc);
      }
    }

    return list;
  }

  /**
   * Generates candidate variations for a track title.
   * Strips common YouTube video labels, brackets, and suffixes.
   */
  public static getTitleCandidates(rawTitle: string): string[] {
    const list: string[] = [];
    const base = rawTitle.trim();
    if (!base) return list;
    list.push(base);

    let cleaned = base
      .replace(/\s*[\(\[](official\s*video|video\s*oficial|audio\s*oficial|visualizer|lyric\s*video|audio|lyrics|hd|4k|remix|en\s*vivo|live|remaster(?:ed)?(?:\s*\d{4})?|video\s*con\s*letra|letra)[\)\]]/gi, '')
      .replace(/\s*[-–—]\s*(official\s*video|video\s*oficial|audio\s*oficial|en\s*vivo|live|remaster(?:ed)?|lyrics|audio).*$/gi, '')
      .replace(/\s*\(feat\.?.*?\)/gi, '')
      .replace(/\s*\[feat\.?.*?\)/gi, '')
      .replace(/\s*feat\.?.*$/gi, '')
      .replace(/\s*ft\.?.*$/gi, '')
      .replace(/\|.*$/, '')
      .trim();

    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      if (parts.length >= 2) {
        cleaned = parts.slice(1).join(' - ').trim();
      }
    }

    if (cleaned && !list.includes(cleaned)) {
      list.push(cleaned);
    }

    for (const item of [...list]) {
      const unacc = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (unacc && !list.includes(unacc)) {
        list.push(unacc);
      }
    }

    return list;
  }

  /**
   * Fetches lyrics from LRCLIB with intelligent fallback and deduplicated caching
   */
  public static async fetchFromLRCLIB(
    artist: string,
    title: string,
    album?: string,
    duration?: number
  ): Promise<EnhancedLyricsData> {
    const cleanArtist = artist.trim();
    const cleanTitle = title.trim();

    if (!cleanArtist || !cleanTitle) {
      return { synced: false, lines: [], source: 'none', isWordSynced: false };
    }

    // Check in-memory cache first
    const cacheKey = `${cleanArtist.toLowerCase()}::${cleanTitle.toLowerCase()}`;
    if (this.lyricsCache.has(cacheKey)) {
      return this.lyricsCache.get(cacheKey)!;
    }

    // Deduplicate concurrent in-flight requests for the same track
    if (this.inFlightRequests.has(cacheKey)) {
      return await this.inFlightRequests.get(cacheKey)!;
    }

    const fetchPromise = (async (): Promise<EnhancedLyricsData> => {
      // 0. Si es un Mix, sesión de DJ, compilación o track instrumental/phonk/slowed sin vocales
      const isMixOrLongSet =
        (duration && duration > 720) ||
        /\b(mix|dj set|session|vol\.\s*\d+|compilation|full album|podcast|sesi[oó]n)\b/i.test(cleanTitle) ||
        cleanTitle.includes('|') ||
        cleanTitle.split(',').length > 3;

      const isInstrumentalOrPhonk =
        /\b(montagem|phonk|slowed|instrumental|karaoke|type beat|bass boosted|drift phonk|sped up)\b/i.test(cleanTitle) ||
        /\b(slowed|reverb)\b/i.test(cleanArtist);

      if (isMixOrLongSet || isInstrumentalOrPhonk) {
        return { synced: false, lines: [], source: 'none', isWordSynced: false };
      }

      const artistCandidates = this.getArtistCandidates(cleanArtist);
      const titleCandidates = this.getTitleCandidates(cleanTitle);

      const effArtist = artistCandidates[1] || artistCandidates[0] || cleanArtist;
      const effTitle = titleCandidates[1] || titleCandidates[0] || cleanTitle;

      try {
        // 1. Try exact match on LRCLIB /api/get with provided metadata
        const params = new URLSearchParams({
          track_name: effTitle,
          artist_name: effArtist,
        });

        if (album && album.trim()) {
          params.append('album_name', album.trim());
        }
        if (duration && duration > 0) {
          params.append('duration', String(Math.round(duration)));
        }

        let res = await fetch(`https://lrclib.net/api/get?${params.toString()}`).catch(() => null);

        // If 404 with album/duration constraints, retry without them
        if ((!res || !res.ok) && (album || duration)) {
          const relaxedParams = new URLSearchParams({
            track_name: effTitle,
            artist_name: effArtist,
          });
          res = await fetch(`https://lrclib.net/api/get?${relaxedParams.toString()}`).catch(() => null);
        }

        // If still 404, try each artist candidate with the title
        if (!res || !res.ok) {
          for (const candArtist of artistCandidates) {
            if (candArtist === effArtist) continue;
            const candParams = new URLSearchParams({
              track_name: effTitle,
              artist_name: candArtist,
            });
            const candRes = await fetch(`https://lrclib.net/api/get?${candParams.toString()}`).catch(() => null);
            if (candRes && candRes.ok) {
              res = candRes;
              break;
            }
          }
        }

        // 2. If /api/get didn't match, use LRCLIB /api/search with track_name and artist_name
        if (!res || !res.ok) {
          for (const candArtist of artistCandidates) {
            const searchParams = new URLSearchParams({
              track_name: effTitle,
              artist_name: candArtist,
            });
            const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`).catch(() => null);
            if (searchRes && searchRes.ok) {
              const list = await searchRes.json();
              if (Array.isArray(list) && list.length > 0) {
                const firstWithLyrics = list.find((item: any) => item.syncedLyrics || item.plainLyrics) || list[0];
                if (firstWithLyrics?.syncedLyrics) {
                  return { ...this.parseEnhancedLRC(firstWithLyrics.syncedLyrics), source: 'api' };
                }
                if (firstWithLyrics?.plainLyrics) {
                  const lines = firstWithLyrics.plainLyrics
                    .split('\n')
                    .filter((l: string) => l.trim().length > 0)
                    .map((text: string, idx: number) => ({
                      id: idx + 1,
                      time: idx * 4,
                      text: text.trim(),
                    }));
                  return { synced: false, lines, source: 'api', isWordSynced: false };
                }
              }
            }
          }
        }

        // 3. If still not found, try search endpoint by query (q=)
        if (!res || !res.ok) {
          const queryStr = `${effArtist} ${effTitle}`.trim();
          const searchRes = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`
          ).catch(() => null);

          if (searchRes && searchRes.ok) {
            const list = await searchRes.json();
            if (Array.isArray(list) && list.length > 0) {
              const firstWithLyrics = list.find((item: any) => item.syncedLyrics || item.plainLyrics) || list[0];
              if (firstWithLyrics?.syncedLyrics) {
                return { ...this.parseEnhancedLRC(firstWithLyrics.syncedLyrics), source: 'api' };
              }
              if (firstWithLyrics?.plainLyrics) {
                const lines = firstWithLyrics.plainLyrics
                  .split('\n')
                  .filter((l: string) => l.trim().length > 0)
                  .map((text: string, idx: number) => ({
                    id: idx + 1,
                    time: idx * 4,
                    text: text.trim(),
                  }));
                return { synced: false, lines, source: 'api', isWordSynced: false };
              }
            }
          }
        }

        // 4. If still not found, try search by title alone and match duration or artist substring
        if (!res || !res.ok) {
          const titleSearchRes = await fetch(
            `https://lrclib.net/api/search?track_name=${encodeURIComponent(effTitle)}`
          ).catch(() => null);

          if (titleSearchRes && titleSearchRes.ok) {
            const list = await titleSearchRes.json();
            if (Array.isArray(list) && list.length > 0) {
              // Try finding an item matching duration or artist candidate
              const matchedItem = list.find((item: any) => {
                const hasLyrics = item.syncedLyrics || item.plainLyrics;
                if (!hasLyrics) return false;
                const durMatch = duration && duration > 0 ? Math.abs(item.duration - duration) <= 4 : false;
                const artMatch = artistCandidates.some((cand) =>
                  item.artistName?.toLowerCase().includes(cand.toLowerCase())
                );
                return durMatch || artMatch;
              });

              if (matchedItem) {
                if (matchedItem.syncedLyrics) {
                  return { ...this.parseEnhancedLRC(matchedItem.syncedLyrics), source: 'api' };
                }
                if (matchedItem.plainLyrics) {
                  const lines = matchedItem.plainLyrics
                    .split('\n')
                    .filter((l: string) => l.trim().length > 0)
                    .map((text: string, idx: number) => ({
                      id: idx + 1,
                      time: idx * 4,
                      text: text.trim(),
                    }));
                  return { synced: false, lines, source: 'api', isWordSynced: false };
                }
              }
            }
          }
        }

        // 5. Handle successful /api/get response
        if (res && res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            return { ...this.parseEnhancedLRC(data.syncedLyrics), source: 'api' };
          }
          if (data.plainLyrics) {
            const lines = data.plainLyrics
              .split('\n')
              .filter((l: string) => l.trim().length > 0)
              .map((text: string, idx: number) => ({
                id: idx + 1,
                time: idx * 4,
                text: text.trim(),
              }));
            return { synced: false, lines, source: 'api', isWordSynced: false };
          }
        }

        // 6. Fallback to lyrics.ovh with primary cleaned artist and title
        return await this.fetchFromLyricsOvh(effArtist, effTitle);
      } catch {
        return await this.fetchFromLyricsOvh(effArtist, effTitle);
      }
    })();

    this.inFlightRequests.set(cacheKey, fetchPromise);
    try {
      const result = await fetchPromise;
      this.lyricsCache.set(cacheKey, result);
      return result;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Fetches lyrics from lyrics.ovh public API (Fallback)
   */
  public static async fetchFromLyricsOvh(artist: string, title: string): Promise<EnhancedLyricsData> {
    try {
      const cleanArtist = encodeURIComponent(artist.trim());
      const cleanTitle = encodeURIComponent(title.trim());
      const response = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`).catch(() => null);

      if (!response || !response.ok) {
        return { synced: false, lines: [], source: 'none', isWordSynced: false };
      }

      const data = await response.json();
      if (!data.lyrics) {
        return { synced: false, lines: [], source: 'none', isWordSynced: false };
      }

      const parsed = this.parseEnhancedLRC(data.lyrics);
      return { ...parsed, source: 'api' };
    } catch {
      return { synced: false, lines: [], source: 'none', isWordSynced: false };
    }
  }
  /**
   * Wraps a plain LyricsData into EnhancedLyricsData (no word sync).
   * Use this when only line-level timestamps are available.
   */
  public static wrapAsEnhanced(data: LyricsData): EnhancedLyricsData {
    return {
      ...data,
      lines: data.lines as EnhancedLyricLine[],
      isWordSynced: false,
    };
  }

  /**
   * Parses Enhanced LRC format with per-word timestamps.
   *
   * Standard LRC:    [01:23.45] Full line text
   * Enhanced LRC:    [01:23.45] <01:23.45> word1 <01:24.10> word2 <01:24.80> word3
   *
   * If no word-level tags (<mm:ss.xx>) are detected, falls back to standard LRC parsing
   * and returns `isWordSynced: false`.
   */
  public static parseEnhancedLRC(lrcText: string): EnhancedLyricsData {
    if (!lrcText || typeof lrcText !== 'string') {
      return { synced: false, lines: [], source: 'none', isWordSynced: false };
    }

    // Detect Enhanced LRC: presence of inline <mm:ss.xx> tags
    const wordTagRegex = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/g;
    const hasWordTags = wordTagRegex.test(lrcText);

    if (!hasWordTags) {
      // No word tags → standard parse, wrapped as Enhanced (no word sync)
      return this.wrapAsEnhanced(this.parseLRC(lrcText));
    }

    // ── Enhanced parsing ───────────────────────────────────────────────
    const lineTimeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    const rawLines = lrcText.split('\n');
    const enhancedLines: EnhancedLyricLine[] = [];
    let autoId = 0;

    const parseTimestamp = (m: string, s: string, ms?: string): number => {
      const minutes = parseInt(m, 10);
      const seconds = parseInt(s, 10);
      const millis = ms ? parseInt(ms.padEnd(3, '0').slice(0, 3), 10) : 0;
      return minutes * 60 + seconds + millis / 1000;
    };

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Extract line-level timestamps [mm:ss.xx]
      const lineMatches = [...line.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
      if (lineMatches.length === 0) continue;

      // Strip all line-level tags to get the content part
      const contentPart = line.replace(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g, '').trim();
      if (!contentPart) continue;

      // Extract word-level tags from content: <mm:ss.xx> word ...
      const wordTagPattern = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>\s*([^<]*)/g;
      const wordMatches = [...contentPart.matchAll(wordTagPattern)];

      // Strip all word tags to get clean text
      const cleanText = contentPart.replace(/<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>/g, '').trim();

      for (const lineMatch of lineMatches) {
        const lineTime = parseTimestamp(lineMatch[1], lineMatch[2], lineMatch[3]);

        let words: LyricWord[] | undefined;

        if (wordMatches.length > 0) {
          const parsed: LyricWord[] = wordMatches
            .map((wm) => ({
              text: wm[4].trim(),
              startTime: parseTimestamp(wm[1], wm[2], wm[3]),
              endTime: 0, // filled in next pass
            }))
            .filter((w) => w.text.length > 0);

          // Calculate endTime for each word from next word's startTime
          for (let i = 0; i < parsed.length; i++) {
            parsed[i].endTime = i + 1 < parsed.length
              ? parsed[i + 1].startTime
              : lineTime + 4.5; // last word → line time + generous buffer
          }

          words = parsed;
        }

        enhancedLines.push({
          id: ++autoId,
          time: lineTime,
          text: cleanText || '♪',
          words,
        });
      }
    }

    if (enhancedLines.length === 0) {
      const wrapped = this.wrapAsEnhanced(this.parseLRC(lrcText));
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
}

/**
 * Detect language of lyrics for romanization and furigana rendering
 */
export function detectLanguage(text: string): 'ja' | 'ko' | 'zh' | 'en' | 'es' | 'unknown' {
  if (!text) return 'unknown';

  // Japanese: Hiragana (\u3040-\u309F) or Katakana (\u30A0-\u30FF)
  const jaCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;

  // Korean: Hangul Syllables (\uAC00-\uD7AF) or Jamo (\u1100-\u11FF)
  const koCount = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;

  // Chinese / CJK Ideographs (\u4E00-\u9FFF)
  const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;

  if (jaCount > 0) return 'ja';
  if (koCount > 0) return 'ko';
  if (cjkCount > 2) return 'zh';

  // Spanish detection (common accents & inverted punctuation)
  const esCount = (text.match(/[áéíóúüñ¿¡]/gi) || []).length;
  if (esCount > 0) return 'es';

  // Latin letters
  if (/[a-zA-Z]/.test(text)) return 'en';

  return 'unknown';
}

