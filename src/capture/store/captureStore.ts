import { create } from 'zustand';
import type {
  CaptureAspectRatio,
  CaptureResolution,
  CaptureSource,
  CaptureMode,
  CaptureStatus,
  CaptureResult,
  CaptureSession,
} from '../types';

export interface CaptureStoreState {
  // Modal & Visibility
  isStudioOpen: boolean;
  setStudioOpen: (open: boolean) => void;
  toggleStudio: () => void;

  // Active Session Config
  session: CaptureSession;
  setMode: (mode: CaptureMode) => void;
  setAspectRatio: (aspectRatio: CaptureAspectRatio) => void;
  setResolution: (resolution: CaptureResolution) => void;
  setSource: (source: CaptureSource) => void;
  setFps: (fps: 30 | 60) => void;
  setDurationLimitSec: (sec?: number) => void;
  setFramingGuide: (active: boolean) => void;
  toggleFramingGuide: () => void;
  setIncludeWatermark: (include: boolean) => void;
  setIncludeSongCard: (include: boolean) => void;
  setIncludeAudio: (include: boolean) => void;
  setStatus: (status: CaptureStatus) => void;

  // Live Telemetry
  elapsedSeconds: number;
  setElapsedSeconds: (sec: number) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;

  // Result & Artifacts
  result: CaptureResult | null;
  setResult: (result: CaptureResult | null) => void;
  clearResult: () => void;

  // Trimming in Preview
  trimStartSec: number;
  trimEndSec: number;
  setTrimRange: (start: number, end: number) => void;

  // Reset
  resetSession: () => void;
}

const DEFAULT_SESSION: CaptureSession = {
  mode: 'video',
  aspectRatio: '16:9',
  resolution: '1080p',
  source: 'direct_canvas',
  fps: 60,
  durationLimitSec: undefined,
  framingGuide: false,
  includeWatermark: true,
  includeSongCard: true,
  includeAudio: true,
  status: 'idle',
};

export const useCaptureStore = create<CaptureStoreState>((set, get) => ({
  isStudioOpen: false,
  setStudioOpen: (isStudioOpen) => set({ isStudioOpen }),
  toggleStudio: () => set((s) => ({ isStudioOpen: !s.isStudioOpen })),

  session: { ...DEFAULT_SESSION },

  setMode: (mode) =>
    set((s) => ({
      session: { ...s.session, mode },
    })),

  setAspectRatio: (aspectRatio) =>
    set((s) => ({
      session: { ...s.session, aspectRatio },
    })),

  setResolution: (resolution) =>
    set((s) => ({
      session: { ...s.session, resolution },
    })),

  setSource: (source) =>
    set((s) => ({
      session: { ...s.session, source },
    })),

  setFps: (fps) =>
    set((s) => ({
      session: { ...s.session, fps },
    })),

  setDurationLimitSec: (durationLimitSec) =>
    set((s) => ({
      session: { ...s.session, durationLimitSec },
    })),

  setFramingGuide: (framingGuide) =>
    set((s) => ({
      session: { ...s.session, framingGuide },
    })),

  toggleFramingGuide: () =>
    set((s) => ({
      session: { ...s.session, framingGuide: !s.session.framingGuide },
    })),

  setIncludeWatermark: (includeWatermark) =>
    set((s) => ({
      session: { ...s.session, includeWatermark },
    })),

  setIncludeSongCard: (includeSongCard) =>
    set((s) => ({
      session: { ...s.session, includeSongCard },
    })),

  setIncludeAudio: (includeAudio) =>
    set((s) => ({
      session: { ...s.session, includeAudio },
    })),

  setStatus: (status) =>
    set((s) => ({
      session: { ...s.session, status },
    })),

  elapsedSeconds: 0,
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
  errorMessage: null,
  setErrorMessage: (errorMessage) => set({ errorMessage }),

  result: null,
  setResult: (result) => {
    const prev = get().result;
    if (prev?.url && prev.url !== result?.url) {
      URL.revokeObjectURL(prev.url);
    }
    set({
      result,
      trimStartSec: 0,
      trimEndSec: result?.durationSec || 0,
    });
  },
  clearResult: () => {
    const prev = get().result;
    if (prev?.url) {
      URL.revokeObjectURL(prev.url);
    }
    set({ result: null, trimStartSec: 0, trimEndSec: 0 });
  },

  trimStartSec: 0,
  trimEndSec: 0,
  setTrimRange: (trimStartSec, trimEndSec) => set({ trimStartSec, trimEndSec }),

  resetSession: () => {
    const prev = get().result;
    if (prev?.url) {
      URL.revokeObjectURL(prev.url);
    }
    set({
      session: { ...DEFAULT_SESSION },
      elapsedSeconds: 0,
      errorMessage: null,
      result: null,
      trimStartSec: 0,
      trimEndSec: 0,
    });
  },
}));
