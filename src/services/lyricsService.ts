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

  /**
   * Fetches synchronized or plain lyrics from LRCLIB (https://lrclib.net/)
   * With fallback to lyrics.ovh if LRCLIB returns no matches.
   */
  public static async fetchFromLRCLIB(
    artist: string,
    title: string,
    album?: string,
    duration?: number
  ): Promise<LyricsData> {
    const cleanArtist = artist.trim();
    const cleanTitle = title.trim();

    if (!cleanArtist || !cleanTitle) {
      return { synced: false, lines: [], source: 'none' };
    }

    // 0. Si es un Mix, sesión de DJ, compilación o track largo (> 12 min), no consultar APIs de letras
    const isMixOrLongSet =
      (duration && duration > 720) ||
      /\b(mix|dj set|session|vol\.\s*\d+|compilation|full album|podcast|sesi[oó]n)\b/i.test(cleanTitle) ||
      cleanTitle.includes('|') ||
      cleanTitle.split(',').length > 3;

    if (isMixOrLongSet) {
      return { synced: false, lines: [], source: 'none' };
    }

    // Limpiar títulos de YouTube como "(Official Video)", "[4K]", etc.
    let sanitizedTitle = cleanTitle
      .replace(/\s*[\(\[](official\s*video|video\s*oficial|audio\s*oficial|visualizer|lyric\s*video|hd|4k|remix|en\s*vivo)[\)\]]/gi, '')
      .replace(/\|.*$/, '')
      .trim() || cleanTitle;

    let effArtist = cleanArtist;
    let effTitle = sanitizedTitle;

    // Detect "Artist - Track" in title (very common in YouTube)
    if (sanitizedTitle.includes(' - ')) {
      const parts = sanitizedTitle.split(' - ');
      if (parts.length >= 2) {
        effArtist = parts[0].trim();
        effTitle = parts.slice(1).join(' - ').trim();
      }
    }

    try {
      // 1. Try exact match on LRCLIB /api/get
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

      // If 404 with album/duration constraints, retry without album and duration for broader match
      if ((!res || !res.ok) && (album || duration)) {
        const relaxedParams = new URLSearchParams({
          track_name: effTitle,
          artist_name: effArtist,
        });
        res = await fetch(`https://lrclib.net/api/get?${relaxedParams.toString()}`).catch(() => null);
      }

      // If still not found, try search endpoint by query (q=) for maximal resilience
      if (!res || !res.ok) {
        const queryStr = `${effArtist} ${effTitle}`.trim();
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`
        ).catch(() => null);

        if (searchRes && searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            const firstWithLyrics = list.find((item) => item.syncedLyrics || item.plainLyrics) || list[0];
            if (firstWithLyrics?.syncedLyrics) {
              const parsed = this.parseLRC(firstWithLyrics.syncedLyrics);
              return { ...parsed, source: 'api' };
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
              return { synced: false, lines, source: 'api' };
            }
          }
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        // Prefer syncedLyrics with LRC timestamps
        if (data.syncedLyrics) {
          const parsed = this.parseLRC(data.syncedLyrics);
          return { ...parsed, source: 'api' };
        }

        // Fallback to plainLyrics if synced not available
        if (data.plainLyrics) {
          const lines = data.plainLyrics
            .split('\n')
            .filter((l: string) => l.trim().length > 0)
            .map((text: string, idx: number) => ({
              id: idx + 1,
              time: idx * 4,
              text: text.trim(),
            }));
          return { synced: false, lines, source: 'api' };
        }
      }

      // 2. Fallback to lyrics.ovh if LRCLIB had no lyrics
      return await this.fetchFromLyricsOvh(cleanArtist, sanitizedTitle);
    } catch {
      return await this.fetchFromLyricsOvh(cleanArtist, sanitizedTitle);
    }
  }

  /**
   * Fetches lyrics from lyrics.ovh public API (Fallback)
   */
  public static async fetchFromLyricsOvh(artist: string, title: string): Promise<LyricsData> {
    try {
      const cleanArtist = encodeURIComponent(artist.trim());
      const cleanTitle = encodeURIComponent(title.trim());
      const response = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`).catch(() => null);

      if (!response || !response.ok) {
        return { synced: false, lines: [], source: 'none' };
      }

      const data = await response.json();
      if (!data.lyrics) {
        return { synced: false, lines: [], source: 'none' };
      }

      return this.parseLRC(data.lyrics);
    } catch {
      return { synced: false, lines: [], source: 'none' };
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
      return this.wrapAsEnhanced(this.parseLRC(lrcText));
    }

    enhancedLines.sort((a, b) => a.time - b.time);

    return {
      synced: true,
      lines: enhancedLines,
      source: 'lrc',
      isWordSynced: true,
    };
  }
}

