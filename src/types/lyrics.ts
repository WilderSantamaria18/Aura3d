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

export type LyricsFontType = 'modern' | 'serif' | 'mono' | 'cursive' | 'display';
export type LyricsPosition = 'dock-right' | 'dock-left' | 'bottom-right' | 'center' | 'custom';
export type LyricsSize = 'compact' | 'standard' | 'lateral' | 'fullscreen';

// ─── Word-by-word sync ───
export interface LyricWord {
  text: string;
  startTime: number; // segundos
  endTime: number;   // segundos
}

export interface EnhancedLyricLine extends LyricLine {
  words?: LyricWord[]; // undefined si no hay sync por palabra
}

export interface EnhancedLyricsData extends LyricsData {
  lines: EnhancedLyricLine[];
  isWordSynced: boolean;
  language?: 'ja' | 'ko' | 'zh' | 'en' | 'es' | 'unknown';
}

// ─── Panel State ───
export type LyricsPanelState = 'hidden' | 'collapsed' | 'expanded';

// ─── Romanization ───
export type RomanizationMode = 'off' | 'romaji' | 'furigana';

// ─── Kawarp Settings ───
export interface KawarpSettings {
  enabled: boolean;
  warpIntensity: number;  // 0-1
  blurPasses: number;     // 1-40
  motionSpeed: number;    // 0.01-4
  saturation: number;     // 0.5-2
  brightness: number;     // 0.5-2
}

// ─── Lenis Settings ───
export interface LenisSettings {
  enabled: boolean;
  duration: number;       // 0.5-2.5
  smoothWheel: boolean;
  wheelMultiplier: number; // 0.5-2
}
