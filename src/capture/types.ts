export type CaptureAspectRatio = '16:9' | '9:16' | '1:1' | '4:5';
export type CaptureResolution = '1080p' | '4k';
export type CaptureSource = 'direct_canvas' | 'screen_tab';
export type CaptureMode = 'photo' | 'video' | 'preview';
export type CaptureStatus = 'idle' | 'preparing' | 'recording' | 'processing' | 'ready' | 'error';

export interface CaptureResult {
  type: 'photo' | 'video';
  blob: Blob;
  url: string;
  fileName: string;
  dimensions: { width: number; height: number };
  durationSec?: number;
  aspectRatio: CaptureAspectRatio;
  createdAt: number;
}

export interface CaptureSession {
  mode: CaptureMode;
  aspectRatio: CaptureAspectRatio;
  resolution: CaptureResolution;
  source: CaptureSource;
  fps: 30 | 60;
  durationLimitSec?: number;
  framingGuide: boolean;
  includeWatermark: boolean;
  includeSongCard: boolean;
  includeAudio: boolean;
  status: CaptureStatus;
}
