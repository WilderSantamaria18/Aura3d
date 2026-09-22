import { create } from 'zustand';

export type RecorderTab = 'record' | 'preview' | 'cards' | 'export';
export type CaptureSource = 'visualizer' | 'screen' | 'window' | 'tab';
export type CaptureMode = 'canvas' | 'display' | 'window' | 'tab';
export type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9';
export type ResolutionPreset = 'story' | 'feed' | 'post' | 'shorts' | 'youtube' | 'custom';
export type DurationMode = 'manual' | 'song_end' | 'continuous';

export type CardTemplateId = 'pure-void' | 'pure_void' | 'aesthetic' | 'studio' | 'vinyl';
export type CardTemplate = CardTemplateId;
export type CardPaletteId = 'rainbow' | 'neon' | 'pastel' | 'mono' | 'custom';
export type CardTypographyId = 'inter' | 'playfair' | 'caveat' | 'jetbrains' | 'orbitron';
export type CardFontFamily = 'sans' | 'serif' | 'mono';
export type CardLayoutId = 'center' | 'bottom-left' | 'top-right' | 'split';

export interface CardFilters {
  bloom: boolean;
  grain: boolean;
  vignette: boolean;
}

export interface CardElements {
  showLogo: boolean;
  showMetadata: boolean;
  showDate: boolean;
  showCover: boolean;
  showQr: boolean;
}

export interface CardConfig {
  template: CardTemplateId;
  aspectRatio: '9:16' | '1:1';
  resolution: { width: number; height: number };
  palette: CardPaletteId;
  typography: CardTypographyId;
  layout: CardLayoutId;
  filters: CardFilters;
  elements: CardElements;
  customText?: string;
  title?: string;
  artist?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: CardFontFamily;
  bloom?: number;
  grain?: number;
  vignette?: number;
}

export interface ResolutionConfig {
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  usage: string;
}

export const RESOLUTION_PRESETS: Record<ResolutionPreset, ResolutionConfig> = {
  story: {
    label: 'Instagram Story / Reel',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    usage: 'Stories, Reels, TikTok',
  },
  shorts: {
    label: 'YouTube Shorts',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    usage: 'YouTube Shorts',
  },
  feed: {
    label: 'Instagram Feed (Cuadrado)',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    usage: 'Feed cuadrado clásico',
  },
  post: {
    label: 'Instagram Post (Retrato)',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    usage: 'Feed vertical extendido',
  },
  youtube: {
    label: 'YouTube Video',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    usage: 'Video HD horizontal',
  },
  custom: {
    label: 'Personalizado',
    width: 1080,
    height: 1920,
    aspectRatio: 'Manual',
    usage: 'Dimensiones libres',
  },
};

export interface RecorderState {
  // Navigation & Modal
  activeTab: RecorderTab;
  setActiveTab: (tab: RecorderTab) => void;
  isRecorderOpen: boolean;
  setRecorderOpen: (isOpen: boolean) => void;
  toggleRecorder: () => void;
  isModalOpen: boolean;
  openModal: (tab?: RecorderTab) => void;
  closeModal: () => void;

  // Recording Configuration
  captureSource: CaptureSource;
  setCaptureSource: (source: CaptureSource) => void;
  captureMode: CaptureMode;
  setCaptureMode: (mode: CaptureMode) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  format: 'mp4' | 'webm';
  setFormat: (format: 'mp4' | 'webm') => void;
  resolutionPreset: ResolutionPreset;
  setResolutionPreset: (preset: ResolutionPreset) => void;
  customWidth: number;
  customHeight: number;
  setCustomResolution: (width: number, height: number) => void;
  fps: 30 | 60;
  setFps: (fps: 30 | 60) => void;
  videoBitrate: number;
  setVideoBitrate: (bitrate: number) => void;
  durationMode: DurationMode;
  setDurationMode: (mode: DurationMode) => void;
  durationLimitSec: number;
  setDurationLimitSec: (sec: number) => void;
  maxDuration: number;
  setMaxDuration: (sec: number) => void;
  countdown: number;
  setCountdown: (sec: number) => void;
  includeAudio: boolean;
  setIncludeAudio: (include: boolean) => void;
  includeMic: boolean;
  setIncludeMic: (include: boolean) => void;
  audioSource: 'mixed' | 'system' | 'mic' | 'none';
  setAudioSource: (src: 'mixed' | 'system' | 'mic' | 'none') => void;
  includeTrackCard: boolean;
  setIncludeTrackCard: (include: boolean) => void;

  // Live Recording Telemetry
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  elapsedSeconds: number;
  setElapsedSeconds: (sec: number) => void;
  recordingDuration: number;

  // Export & Preview Artifacts
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  recordedBlobUrl: string | null;
  recordedFileName: string | null;
  setRecordedVideo: (blob: Blob | null, fileName?: string) => void;
  resetRecording: () => void;

  // Social Story Cards State
  cardConfig: CardConfig;
  updateCardConfig: (partial: Partial<CardConfig>) => void;
  updateCardFilters: (partial: Partial<CardFilters>) => void;
  updateCardElements: (partial: Partial<CardElements>) => void;
  generatedCardBlob: Blob | null;
  generatedCardUrl: string | null;
  setGeneratedCard: (blob: Blob | null) => void;

  // Trim Range (for preview player)
  trimStartSec: number;
  trimEndSec: number;
  trimRange: { start: number; end: number };
  setTrimRange: (startSec: number, endSec: number) => void;
}

export const useRecorderStore = create<RecorderState>((set, get) => ({
  activeTab: 'record',
  setActiveTab: (activeTab) => set({ activeTab }),
  isRecorderOpen: false,
  setRecorderOpen: (isRecorderOpen) => set({ isRecorderOpen, isModalOpen: isRecorderOpen }),
  toggleRecorder: () => set((s) => ({ isRecorderOpen: !s.isRecorderOpen, isModalOpen: !s.isRecorderOpen })),
  isModalOpen: false,
  openModal: (tab) => set({ isRecorderOpen: true, isModalOpen: true, ...(tab ? { activeTab: tab } : {}) }),
  closeModal: () => set({ isRecorderOpen: false, isModalOpen: false }),

  captureSource: 'visualizer',
  setCaptureSource: (captureSource) => set({ captureSource }),
  captureMode: 'canvas',
  setCaptureMode: (captureMode) => {
    const srcMap: Record<CaptureMode, CaptureSource> = {
      canvas: 'visualizer',
      display: 'screen',
      window: 'window',
      tab: 'tab',
    };
    set({ captureMode, captureSource: srcMap[captureMode] });
  },

  aspectRatio: '9:16',
  setAspectRatio: (aspectRatio) => {
    const presetMap: Record<AspectRatio, ResolutionPreset> = {
      '9:16': 'story',
      '1:1': 'feed',
      '4:5': 'post',
      '16:9': 'youtube',
    };
    const presetKey = presetMap[aspectRatio] || 'story';
    const preset = RESOLUTION_PRESETS[presetKey];
    set({
      aspectRatio,
      resolutionPreset: presetKey,
      customWidth: preset.width,
      customHeight: preset.height,
    });
  },
  format: 'mp4',
  setFormat: (format) => set({ format }),

  resolutionPreset: 'story',
  setResolutionPreset: (resolutionPreset) => {
    const preset = RESOLUTION_PRESETS[resolutionPreset];
    const ratioMap: Record<ResolutionPreset, AspectRatio> = {
      story: '9:16',
      shorts: '9:16',
      feed: '1:1',
      post: '4:5',
      youtube: '16:9',
      custom: '9:16',
    };
    set({
      resolutionPreset,
      customWidth: preset.width,
      customHeight: preset.height,
      aspectRatio: ratioMap[resolutionPreset] || '9:16',
    });
  },
  customWidth: 1080,
  customHeight: 1920,
  setCustomResolution: (customWidth, customHeight) => set({ customWidth, customHeight, resolutionPreset: 'custom' }),
  fps: 60,
  setFps: (fps) => set({ fps }),
  videoBitrate: 8_000_000, // 8 Mbps
  setVideoBitrate: (videoBitrate) => set({ videoBitrate }),
  durationMode: 'manual',
  setDurationMode: (durationMode) => set({ durationMode }),
  durationLimitSec: 30,
  setDurationLimitSec: (durationLimitSec) => set({ durationLimitSec, maxDuration: durationLimitSec }),
  maxDuration: 30,
  setMaxDuration: (maxDuration) => set({ maxDuration, durationLimitSec: maxDuration }),
  countdown: 3,
  setCountdown: (countdown) => set({ countdown }),

  includeAudio: true,
  setIncludeAudio: (includeAudio) => set({ includeAudio }),
  includeMic: false,
  setIncludeMic: (includeMic) => set({ includeMic }),
  audioSource: 'mixed',
  setAudioSource: (audioSource) => {
    set({
      audioSource,
      includeAudio: audioSource === 'mixed' || audioSource === 'system',
      includeMic: audioSource === 'mixed' || audioSource === 'mic',
    });
  },
  includeTrackCard: true,
  setIncludeTrackCard: (includeTrackCard) => set({ includeTrackCard }),

  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),
  elapsedSeconds: 0,
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds, recordingDuration: elapsedSeconds }),
  recordingDuration: 0,

  recordedBlob: null,
  recordedUrl: null,
  recordedBlobUrl: null,
  recordedFileName: null,
  setRecordedVideo: (blob, fileName) => {
    const prevUrl = get().recordedUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    const newUrl = blob ? URL.createObjectURL(blob) : null;
    set({
      recordedBlob: blob,
      recordedUrl: newUrl,
      recordedBlobUrl: newUrl,
      recordedFileName: fileName || (blob ? `aura3d-${Date.now()}.mp4` : null),
      trimStartSec: 0,
      trimEndSec: 0,
      trimRange: { start: 0, end: 0 },
    });
  },
  resetRecording: () => {
    const prevUrl = get().recordedUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    set({
      recordedBlob: null,
      recordedUrl: null,
      recordedBlobUrl: null,
      recordedFileName: null,
      elapsedSeconds: 0,
      recordingDuration: 0,
      trimStartSec: 0,
      trimEndSec: 0,
      trimRange: { start: 0, end: 0 },
    });
  },

  cardConfig: {
    template: 'pure-void',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    palette: 'rainbow',
    typography: 'inter',
    layout: 'bottom-left',
    title: 'Aura3D Soundscape',
    artist: 'Aura Spatial Audio',
    primaryColor: '#8b5cf6',
    secondaryColor: '#3b82f6',
    backgroundColor: '#08080c',
    textColor: '#f8fafc',
    fontFamily: 'sans',
    bloom: 0.6,
    grain: 0.1,
    vignette: 0.4,
    filters: {
      bloom: true,
      grain: false,
      vignette: true,
    },
    elements: {
      showLogo: true,
      showMetadata: true,
      showDate: true,
      showCover: true,
      showQr: false,
    },
  },
  updateCardConfig: (partial) =>
    set((s) => ({
      cardConfig: { ...s.cardConfig, ...partial },
    })),
  updateCardFilters: (partial) =>
    set((s) => ({
      cardConfig: {
        ...s.cardConfig,
        filters: { ...s.cardConfig.filters, ...partial },
      },
    })),
  updateCardElements: (partial) =>
    set((s) => ({
      cardConfig: {
        ...s.cardConfig,
        elements: { ...s.cardConfig.elements, ...partial },
      },
    })),

  generatedCardBlob: null,
  generatedCardUrl: null,
  setGeneratedCard: (blob) => {
    const prevUrl = get().generatedCardUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    const newUrl = blob ? URL.createObjectURL(blob) : null;
    set({ generatedCardBlob: blob, generatedCardUrl: newUrl });
  },

  trimStartSec: 0,
  trimEndSec: 0,
  trimRange: { start: 0, end: 0 },
  setTrimRange: (trimStartSec, trimEndSec) =>
    set({ trimStartSec, trimEndSec, trimRange: { start: trimStartSec, end: trimEndSec } }),
}));
