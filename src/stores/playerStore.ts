import { create } from 'zustand';
import type { Track, Playlist, EqualizerBand, VisualizerMode, VisualizerShape, WaveEffectMode, BlobCustomSettings, LucidTheme } from '../types/audio';
import { LUCID_THEMES, PROFESSIONAL_PALETTES } from '../types/audio';
import { StorageService, DEFAULT_BLOB_SETTINGS } from '../services/storageService';
import { DEFAULT_EQ_BANDS } from '../services/audioEngine';

export interface HandLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface PlayerState {
  // App navigation state
  hasStarted: boolean;

  // Lucid Mode (Modo Lúcido) & 10 Color Themes
  isLucid: boolean;
  lucidTheme: LucidTheme;

  // VR Gesture Mode & Full Body Dance Pose
  vrMode: boolean;
  vrTrackingMode: 'body' | 'hands';
  handLandmarks: HandLandmark[] | null;
  handGesture: 'open' | 'closed' | 'pinch' | 'swipe_left' | 'swipe_right' | 'one' | 'fist' | 'unknown' | null;
  handRotation: { x: number; y: number };
  handSensitivity: number;
  poseLandmarks: PoseLandmark[] | null;
  poseVelocity: number;
  rightHandPos: { x: number; y: number; z: number } | null;
  leftHandPos: { x: number; y: number; z: number } | null;
  headPos: { x: number; y: number; z: number } | null;

  // Professional Palettes
  currentPaletteIndex: number;

  // Current track & queue
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  favorites: Track[];
  playlists: Playlist[];

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  previousVolume: number;
  isAudioUnlocked: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffled: boolean;
  crossfadeDuration: number;

  // Visualizer and Input mode
  visualizerMode: VisualizerMode;
  visualizerShape: VisualizerShape;
  waveEffectMode: WaveEffectMode;
  waveEffectIntensity: number;
  bassBoomThreshold: number;
  bassBoomIntensity: number;
  autoMode: boolean;
  isMicActive: boolean;
  showFrequencyBars: boolean;
  sphereOpacity: number;
  sphereRadius: number;

  // Blob Customizer settings
  blobSettings: BlobCustomSettings;
  isBlobPanelOpen: boolean;

  // UI Modals & Views
  isVisualizerSettingsOpen: boolean;
  isEqualizerOpen: boolean;
  isLyricsOpen: boolean;
  isImmersiveMode: boolean;
  isSidebarOpen: boolean;
  isKaraokeFullscreen: boolean;
  isNowPlayingExpanded: boolean;

  // EQ Bands
  eqBands: EqualizerBand[];

  // Actions
  setHasStarted: (hasStarted: boolean) => void;
  setIsLucid: (isLucid: boolean) => void;
  toggleLucidMode: () => void;
  setLucidTheme: (theme: LucidTheme) => void;
  cycleLucidTheme: () => void;
  setVrMode: (vrMode: boolean) => void;
  toggleVrMode: () => void;
  setVrTrackingMode: (mode: 'body' | 'hands') => void;
  setHandLandmarks: (landmarks: HandLandmark[] | null) => void;
  setHandGesture: (gesture: 'open' | 'closed' | 'pinch' | 'swipe_left' | 'swipe_right' | 'one' | 'fist' | 'unknown' | null) => void;
  setHandRotation: (rotation: { x: number; y: number }) => void;
  setHandSensitivity: (sensitivity: number) => void;
  setPoseLandmarks: (landmarks: PoseLandmark[] | null) => void;
  setPoseVelocity: (velocity: number) => void;
  setPoseKeypoints: (data: { rightHand?: { x: number; y: number; z: number } | null; leftHand?: { x: number; y: number; z: number } | null; head?: { x: number; y: number; z: number } | null; velocity?: number }) => void;
  setCurrentPaletteIndex: (index: number) => void;
  cyclePalette: () => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setVisualizerShape: (shape: VisualizerShape) => void;
  setWaveEffectMode: (mode: WaveEffectMode) => void;
  setWaveEffectIntensity: (intensity: number) => void;
  setBassBoomThreshold: (threshold: number) => void;
  setBassBoomIntensity: (intensity: number) => void;
  setAutoMode: (autoMode: boolean) => void;
  toggleAutoMode: () => void;
  setIsMicActive: (active: boolean) => void;
  setShowFrequencyBars: (show: boolean) => void;
  setSphereOpacity: (opacity: number) => void;
  setSphereRadius: (radius: number) => void;
  setBlobSettings: (settings: BlobCustomSettings) => void;
  updateBlobSettings: (partial: Partial<BlobCustomSettings>) => void;
  resetBlobSettings: () => void;
  setBlobPanelOpen: (isOpen: boolean) => void;
  setVisualizerSettingsOpen: (isOpen: boolean) => void;
  toggleVisualizerSettings: () => void;
  setAudioUnlocked: (unlocked: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  playTrack: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  nextTrack: () => Track | null;
  previousTrack: () => Track | null;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFavorite: (track: Track) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  setEqualizerOpen: (isOpen: boolean) => void;
  setLyricsOpen: (isOpen: boolean) => void;
  setImmersiveMode: (isImmersive: boolean) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setKaraokeFullscreen: (isFullscreen: boolean) => void;
  setNowPlayingExpanded: (isExpanded: boolean) => void;
  setEqBandGain: (bandId: number, gain: number) => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  setCrossfadeDuration: (seconds: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  hasStarted: false,

  isLucid: false,
  lucidTheme: LUCID_THEMES[0],

  // VR Gesture Mode & Full Body Dance Pose
  vrMode: false,
  vrTrackingMode: 'body',
  handLandmarks: null,
  handGesture: null,
  handRotation: { x: 0, y: 0 },
  handSensitivity: 1.0,
  poseLandmarks: null,
  poseVelocity: 0,
  rightHandPos: null,
  leftHandPos: null,
  headPos: null,

  currentPaletteIndex: 0,

  currentTrack: null,
  queue: [],
  queueIndex: 0,
  favorites: StorageService.getFavorites(),
  playlists: StorageService.getPlaylists(),

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: StorageService.getVolume(),
  isMuted: false,
  previousVolume: 0.85,
  isAudioUnlocked: false,
  repeatMode: 'off',
  isShuffled: false,
  crossfadeDuration: 3,

  visualizerMode: 'sphere',
  visualizerShape: 'sphere',
  waveEffectMode: 'concentric',
  waveEffectIntensity: 0.85,
  bassBoomThreshold: 0.45,
  bassBoomIntensity: 1.0,
  autoMode: false,
  isMicActive: false,
  showFrequencyBars: true,
  sphereOpacity: 0.9,
  sphereRadius: StorageService.getSphereScale(),

  blobSettings: StorageService.getBlobSettings(),
  isBlobPanelOpen: false,
  isVisualizerSettingsOpen: false,

  isEqualizerOpen: false,
  isLyricsOpen: false,
  isImmersiveMode: false,
  isSidebarOpen: false,
  isKaraokeFullscreen: false,
  isNowPlayingExpanded: true,

  eqBands: StorageService.getEqBands() || DEFAULT_EQ_BANDS,

  setHasStarted: (hasStarted) => set({ hasStarted }),
  setIsLucid: (isLucid) => set({ isLucid }),
  toggleLucidMode: () => set((state) => ({ isLucid: !state.isLucid })),

  setLucidTheme: (lucidTheme) => set({ lucidTheme }),
  cycleLucidTheme: () => {
    const { lucidTheme } = get();
    const currentIndex = LUCID_THEMES.findIndex((t) => t.id === lucidTheme.id);
    const nextIndex = (currentIndex + 1) % LUCID_THEMES.length;
    set({ lucidTheme: LUCID_THEMES[nextIndex], isLucid: true });
  },

  setVrMode: (vrMode) => set({ vrMode }),
  toggleVrMode: () => set((state) => ({ vrMode: !state.vrMode })),
  setVrTrackingMode: (vrTrackingMode) => set({ vrTrackingMode }),
  setHandLandmarks: (handLandmarks) => set({ handLandmarks }),
  setHandGesture: (handGesture) => set({ handGesture }),
  setHandRotation: (handRotation) => set({ handRotation }),
  setHandSensitivity: (handSensitivity) => set({ handSensitivity }),
  setPoseLandmarks: (poseLandmarks) => set({ poseLandmarks }),
  setPoseVelocity: (poseVelocity) => set({ poseVelocity }),
  setPoseKeypoints: (data) =>
    set((state) => ({
      rightHandPos: data.rightHand !== undefined ? data.rightHand : state.rightHandPos,
      leftHandPos: data.leftHand !== undefined ? data.leftHand : state.leftHandPos,
      headPos: data.head !== undefined ? data.head : state.headPos,
      poseVelocity: data.velocity !== undefined ? data.velocity : state.poseVelocity,
    })),

  setCurrentPaletteIndex: (currentPaletteIndex) => set({ currentPaletteIndex }),
  cyclePalette: () => {
    const { currentPaletteIndex } = get();
    const next = (currentPaletteIndex + 1) % PROFESSIONAL_PALETTES.length;
    set({ currentPaletteIndex: next });
  },

  setVisualizerMode: (visualizerMode) => set({ visualizerMode }),
  setVisualizerShape: (visualizerShape) => set({ visualizerShape }),
  setWaveEffectMode: (waveEffectMode) => set({ waveEffectMode }),
  setWaveEffectIntensity: (waveEffectIntensity) => set({ waveEffectIntensity }),
  setBassBoomThreshold: (bassBoomThreshold) => set({ bassBoomThreshold }),
  setBassBoomIntensity: (bassBoomIntensity) => set({ bassBoomIntensity }),
  setAutoMode: (autoMode) => set({ autoMode }),
  toggleAutoMode: () => set((state) => ({ autoMode: !state.autoMode })),
  setIsMicActive: (isMicActive) => set({ isMicActive }),
  setShowFrequencyBars: (showFrequencyBars) => set({ showFrequencyBars }),
  setSphereOpacity: (sphereOpacity) => set({ sphereOpacity }),
  setSphereRadius: (sphereRadius) => {
    StorageService.saveSphereScale(sphereRadius);
    set({ sphereRadius });
  },

  setBlobSettings: (blobSettings) => {
    StorageService.saveBlobSettings(blobSettings);
    set({ blobSettings });
  },

  updateBlobSettings: (partial) => {
    const updated = { ...get().blobSettings, ...partial };
    StorageService.saveBlobSettings(updated);
    set({ blobSettings: updated });
  },

  resetBlobSettings: () => {
    StorageService.saveBlobSettings(DEFAULT_BLOB_SETTINGS);
    set({ blobSettings: DEFAULT_BLOB_SETTINGS });
  },

  setBlobPanelOpen: (isBlobPanelOpen) => set({ isBlobPanelOpen }),
  setVisualizerSettingsOpen: (isVisualizerSettingsOpen) => set({ isVisualizerSettingsOpen }),
  toggleVisualizerSettings: () => set((state) => ({ isVisualizerSettingsOpen: !state.isVisualizerSettingsOpen })),

  setAudioUnlocked: (unlocked) => set({ isAudioUnlocked: unlocked }),

  setCurrentTrack: (track) => set({ currentTrack: track }),

  playTrack: (track) => {
    const { queue, autoMode, cyclePalette, cycleLucidTheme, isLucid } = get();
    if (autoMode) {
      if (isLucid) cycleLucidTheme();
      else cyclePalette();
    }
    const existingIndex = queue.findIndex((t) => t.id === track.id);
    if (existingIndex >= 0) {
      set({ currentTrack: track, queueIndex: existingIndex, isPlaying: true, hasStarted: true });
    } else {
      set({
        queue: [track, ...queue],
        queueIndex: 0,
        currentTrack: track,
        isPlaying: true,
        hasStarted: true,
      });
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    set({
      queue: tracks,
      queueIndex: startIndex,
      currentTrack: tracks[startIndex] || null,
    });
  },

  addToQueue: (track) => {
    const queue = [...get().queue, track];
    set({ queue });
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    const newQueue = queue.filter((_, i) => i !== index);
    let newIndex = queueIndex;
    if (index < queueIndex) {
      newIndex = Math.max(0, queueIndex - 1);
    }
    set({ queue: newQueue, queueIndex: newIndex });
  },

  nextTrack: () => {
    const { queue, queueIndex, repeatMode, isShuffled, autoMode, cyclePalette, cycleLucidTheme, isLucid } = get();
    if (queue.length === 0) return null;

    if (autoMode) {
      if (isLucid) cycleLucidTheme();
      else cyclePalette();
    }

    if (repeatMode === 'one') {
      return queue[queueIndex];
    }

    let nextIndex = queueIndex + 1;
    if (isShuffled && queue.length > 1) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return null;
      }
    }

    const next = queue[nextIndex];
    set({ currentTrack: next, queueIndex: nextIndex });
    return next;
  },

  previousTrack: () => {
    const { queue, queueIndex, currentTime, autoMode, cyclePalette, cycleLucidTheme, isLucid } = get();
    if (queue.length === 0) return null;

    if (autoMode) {
      if (isLucid) cycleLucidTheme();
      else cyclePalette();
    }

    if (currentTime > 3) {
      return queue[queueIndex];
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prev = queue[prevIndex];
    set({ currentTrack: prev, queueIndex: prevIndex });
    return prev;
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => {
    StorageService.saveVolume(volume);
    set({ volume, isMuted: volume === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume, previousVolume } = get();
    if (isMuted) {
      const restoreVol = previousVolume > 0 ? previousVolume : 0.85;
      StorageService.saveVolume(restoreVol);
      set({ isMuted: false, volume: restoreVol });
    } else {
      set({ isMuted: true, previousVolume: volume, volume: 0 });
    }
  },

  toggleFavorite: (track) => {
    const { favorites } = get();
    const isFav = favorites.some((t) => t.id === track.id);
    let updatedFavorites: Track[];

    if (isFav) {
      updatedFavorites = favorites.filter((t) => t.id !== track.id);
    } else {
      updatedFavorites = [...favorites, { ...track, isFavorite: true }];
    }

    StorageService.saveFavorites(updatedFavorites);
    set({ favorites: updatedFavorites });
  },

  createPlaylist: (name) => {
    const { playlists } = get();
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now(),
      name,
      tracks: [],
      createdAt: Date.now(),
    };
    const updated = [...playlists, newPlaylist];
    StorageService.savePlaylists(updated);
    set({ playlists: updated });
  },

  addToPlaylist: (playlistId, track) => {
    const { playlists } = get();
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          tracks: [...pl.tracks.filter((t) => t.id !== track.id), track],
        };
      }
      return pl;
    });
    StorageService.savePlaylists(updated);
    set({ playlists: updated });
  },

  removeFromPlaylist: (playlistId, trackId) => {
    const { playlists } = get();
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          tracks: pl.tracks.filter((t) => t.id !== trackId),
        };
      }
      return pl;
    });
    StorageService.savePlaylists(updated);
    set({ playlists: updated });
  },

  setEqualizerOpen: (isOpen) => set({ isEqualizerOpen: isOpen }),
  setLyricsOpen: (isOpen) => set({ isLyricsOpen: isOpen }),
  setImmersiveMode: (isImmersive) => set({ isImmersiveMode: isImmersive }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setKaraokeFullscreen: (isFullscreen) => set({ isKaraokeFullscreen: isFullscreen }),
  setNowPlayingExpanded: (isExpanded) => set({ isNowPlayingExpanded: isExpanded }),

  setEqBandGain: (bandId, gain) => {
    const { eqBands } = get();
    const updated = eqBands.map((b) => (b.id === bandId ? { ...b, gain } : b));
    StorageService.saveEqBands(updated);
    set({ eqBands: updated });
  },

  setRepeatMode: (repeatMode) => set({ repeatMode }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  setCrossfadeDuration: (crossfadeDuration) => set({ crossfadeDuration }),
}));
