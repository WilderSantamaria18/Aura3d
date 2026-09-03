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

