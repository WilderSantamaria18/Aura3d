export interface LyricLine {
  id: number;
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  source?: 'lrc' | 'api' | 'none';
}

// ── Enhanced LRC types (word-by-word karaoke sync) ──────────────────────────

/**
 * Represents a single word with start/end timestamps.
 * `endTime` is calculated from the next word's startTime (or line end).
 */
export interface LyricWord {
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

/**
 * Extends LyricLine with optional per-word timestamps.
 * If `words` is undefined, the component falls back to line-level sync.
 */
export interface EnhancedLyricLine extends LyricLine {
  words?: LyricWord[];
}

/**
 * Enhanced lyrics dataset — superset of LyricsData.
 * `isWordSynced = true` when at least one line has `words[]`.
 */
export interface EnhancedLyricsData extends LyricsData {
  lines: EnhancedLyricLine[];
  isWordSynced: boolean;
}
