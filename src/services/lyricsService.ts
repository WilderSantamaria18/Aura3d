import type { LyricLine, LyricsData } from '../types/lyrics';

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

    try {
      // 1. Try exact match on LRCLIB /api/get
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist,
      });

      if (album && album.trim()) {
        params.append('album_name', album.trim());
      }
      if (duration && duration > 0) {
        params.append('duration', String(Math.round(duration)));
      }

      let res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);

      // If 404 with album/duration constraints, retry without album and duration for broader match
      if (!res.ok && (album || duration)) {
        const relaxedParams = new URLSearchParams({
          track_name: cleanTitle,
          artist_name: cleanArtist,
        });
        res = await fetch(`https://lrclib.net/api/get?${relaxedParams.toString()}`);
      }

      // If still not found, try search endpoint
      if (!res.ok) {
        const searchRes = await fetch(
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
        );
        if (searchRes.ok) {
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

      if (res.ok) {
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
      return await this.fetchFromLyricsOvh(cleanArtist, cleanTitle);
    } catch (error) {
      console.warn('[LyricsService] Error al obtener letras de LRCLIB, intentando lyrics.ovh fallback:', error);
      return await this.fetchFromLyricsOvh(cleanArtist, cleanTitle);
    }
  }

  /**
   * Fetches lyrics from lyrics.ovh public API (Fallback)
   */
  public static async fetchFromLyricsOvh(artist: string, title: string): Promise<LyricsData> {
    try {
      const cleanArtist = encodeURIComponent(artist.trim());
      const cleanTitle = encodeURIComponent(title.trim());
      const response = await fetch(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);

      if (!response.ok) {
        throw new Error(`Lyrics not found (${response.status})`);
      }

      const data = await response.json();
      if (!data.lyrics) {
        return { synced: false, lines: [], source: 'none' };
      }

      return this.parseLRC(data.lyrics);
    } catch (error) {
      console.warn('[LyricsService] Could not fetch lyrics from lyrics.ovh:', error);
      return { synced: false, lines: [], source: 'none' };
    }
  }
}

