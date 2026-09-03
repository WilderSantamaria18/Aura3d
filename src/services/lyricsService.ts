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
   * Fetches lyrics from lyrics.ovh public API
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

      // Check if the returned text is LRC format or plain text
      return this.parseLRC(data.lyrics);
    } catch (error) {
      console.warn('Could not fetch lyrics from lyrics.ovh:', error);
      return { synced: false, lines: [], source: 'none' };
    }
  }
}

