import { create } from 'zustand';
import type { Track, Playlist, EqualizerBand, VisualizerMode, VisualizerShape, WaveEffectMode, BlobCustomSettings, LucidTheme } from '../types/audio';
import { LUCID_THEMES, PROFESSIONAL_PALETTES, createLucidTheme } from '../types/audio';
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

export interface AutoPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  accent?: string;
  glow: string;
  bg: string;
}

interface PlayerState {
  // App navigation state
  hasStarted: boolean;

  // Lucid Mode (Modo Lúcido) & Color Customization
  isLucid: boolean;
  lucidTheme: LucidTheme;
  lucidPrimaryColor: string;
  lucidSecondaryColor: string;

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

  // 3D Air Virtual Instruments
  isAirInstrumentsActive: boolean;
  airInstrumentType: 'synth' | 'drums' | 'theremin';
  airSynthScale: 'pentatonic_minor' | 'pentatonic_major' | 'cyberpunk' | 'japanese';
  lastTriggeredNote: string | null;
  multiHandLandmarks: HandLandmark[][] | null;

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
  shuffleHistory: number[];
  crossfadeDuration: number;

  // Shared / Active Visualizer mode
  visualizerMode: VisualizerMode;
  visualizerShape: VisualizerShape;
  waveEffectMode: WaveEffectMode;
  waveEffectIntensity: number;
  bassBoomThreshold: number;
  bassBoomIntensity: number;

  // Independent Sphere 3D Slice
  sphereShape: VisualizerShape;
  sphereWaveMode: WaveEffectMode;
  sphereWaveIntensity: number;
  sphereBassBoomThreshold: number;
  sphereBassBoomIntensity: number;

  // Independent Blob 2D Slice
  blobShape: VisualizerShape;
  blobWaveMode: WaveEffectMode;
  blobWaveIntensity: number;
  blobBassBoomThreshold: number;
  blobBassBoomIntensity: number;
  blobScale: number;

  autoMode: boolean;
  dynamicColor: string;
  baseColorHue: number;
  autoSensitivity: number;
  autoPalette: AutoPalette;
  autoFeedbackToast: boolean;
  autoNotification: { message: string; type: 'info' | 'success' | 'warning'; id: number; color?: string } | null;
  isMicActive: boolean;
  showFrequencyBars: boolean;
  sphereOpacity: number;
  sphereScale: number;
  rainbowScale: number;
  linkScales: boolean;
  sphereRadius: number; // backward compatibility alias
  musicSensitivity: number;
  audioSpeed: number;

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

  // Gamification & Real-Time Stats
  intensityScore: number;
  sessionHighScore: number;
  totalListeningTime: number;
  sessionDuration: number;
  detectedGenre: string;
  genreConfidence: number;
  isAdminModalOpen: boolean;
  isProfileModalOpen: boolean;
  isSysReqModalOpen: boolean;
  performanceTier: 'high' | 'medium' | 'eco';
  userProfile: {
    id: string;
    username: string;
    email?: string;
    role: string;
    isGuest: boolean;
    genres?: string[];
  } | null;

  // Web Audio Analyser & Interaction
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
  userInteracting: boolean;

  // Actions
  setHasStarted: (hasStarted: boolean) => void;
  setIsLucid: (isLucid: boolean) => void;
  toggleLucidMode: () => void;
  setLucidTheme: (theme: LucidTheme) => void;
  setLucidPrimaryColor: (color: string) => void;
  setLucidSecondaryColor: (color: string) => void;
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
  setAirInstrumentsActive: (active: boolean) => void;
  toggleAirInstruments: () => void;
  setAirInstrumentType: (type: 'synth' | 'drums' | 'theremin') => void;
  setAirSynthScale: (scale: 'pentatonic_minor' | 'pentatonic_major' | 'cyberpunk' | 'japanese') => void;
  setLastTriggeredNote: (note: string | null) => void;
  setMultiHandLandmarks: (multiHands: HandLandmark[][] | null) => void;
  setCurrentPaletteIndex: (index: number) => void;
  cyclePalette: () => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setVisualizerShape: (shape: VisualizerShape) => void;
  setWaveEffectMode: (mode: WaveEffectMode) => void;
  setWaveEffectIntensity: (intensity: number) => void;
  setBassBoomThreshold: (threshold: number) => void;
  setBassBoomIntensity: (intensity: number) => void;

  setSphereShape: (shape: VisualizerShape) => void;
  setSphereWaveMode: (mode: WaveEffectMode) => void;
  setSphereWaveIntensity: (intensity: number) => void;
  setSphereBassBoomThreshold: (threshold: number) => void;
  setSphereBassBoomIntensity: (intensity: number) => void;

  setBlobShape: (shape: VisualizerShape) => void;
  setBlobWaveMode: (mode: WaveEffectMode) => void;
  setBlobWaveIntensity: (intensity: number) => void;
  setBlobBassBoomThreshold: (threshold: number) => void;
  setBlobBassBoomIntensity: (intensity: number) => void;
  setBlobScale: (scale: number) => void;
  setAutoMode: (autoMode: boolean) => void;
  toggleAutoMode: () => void;
  setDynamicColor: (color: string) => void;
  setBaseColorHue: (hue: number) => void;
  setAutoNotification: (notification: { message: string; type: 'info' | 'success' | 'warning'; id: number; color?: string } | null) => void;
  setAutoSensitivity: (sensitivity: number) => void;
  setAutoPalette: (palette: AutoPalette) => void;
  updateAutoPalette: (fftData: Uint8Array) => void;
  setAutoFeedbackToast: (show: boolean) => void;
  setIsMicActive: (active: boolean) => void;
  setShowFrequencyBars: (show: boolean) => void;
  setSphereOpacity: (opacity: number) => void;
  setSphereScale: (scale: number) => void;
  setRainbowScale: (scale: number) => void;
  setLinkScales: (link: boolean) => void;
  setSphereRadius: (radius: number) => void;
  setMusicSensitivity: (sensitivity: number) => void;
  setAudioSpeed: (speed: number) => void;
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
  toggleKaraokeFullscreen: () => void;
  setNowPlayingExpanded: (isExpanded: boolean) => void;
  setEqBandGain: (bandId: number, gain: number) => void;
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  toggleShuffle: () => void;
  setCrossfadeDuration: (seconds: number) => void;
  setIntensityScore: (score: number) => void;
  setSessionHighScore: (score: number) => void;
  setTotalListeningTime: (seconds: number) => void;
  setSessionDuration: (seconds: number) => void;
  setDetectedGenre: (genre: string, confidence?: number) => void;
  setAdminModalOpen: (isOpen: boolean) => void;
  toggleAdminModal: () => void;
  setProfileModalOpen: (isOpen: boolean) => void;
  toggleProfileModal: () => void;
  setSysReqModalOpen: (isOpen: boolean) => void;
  toggleSysReqModal: () => void;
  setPerformanceTier: (tier: 'high' | 'medium' | 'eco') => void;
  cyclePerformanceTier: () => void;
  setUserProfile: (profile: { id: string; username: string; email?: string; role: string; isGuest: boolean; genres?: string[] } | null) => void;
  isShortcutsModalOpen: boolean;
  setShortcutsModalOpen: (isOpen: boolean) => void;
  toggleShortcutsModal: () => void;
  isPresetsModalOpen: boolean;
  setPresetsModalOpen: (isOpen: boolean) => void;
  togglePresetsModal: () => void;
  bpm: number;
  isBeatPulse: boolean;
  setBpm: (bpm: number) => void;
  triggerBeatPulse: () => void;
  resetBeatPulse: () => void;
  isUiIdle: boolean;
  setIsUiIdle: (idle: boolean) => void;
  setAnalyser: (analyser: AnalyserNode | null, audioContext?: AudioContext | null) => void;
  setUserInteracting: (interacting: boolean) => void;
  isSpotifyConnected: boolean;
  setSpotifyConnected: (connected: boolean) => void;
  updateFromSpotify: (trackData: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    coverUrl: string;
    spotifyUri: string;
    currentTime: number;
    isPlaying: boolean;
  }) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  analyser: null,
  audioContext: null,
  userInteracting: false,

  hasStarted: false,
  isSpotifyConnected: false,

  isLucid: false,
  lucidPrimaryColor: StorageService.getLucidPrimaryColor(),
  lucidSecondaryColor: StorageService.getLucidSecondaryColor(),
  lucidTheme: (() => {
    const p = StorageService.getLucidPrimaryColor();
    const s = StorageService.getLucidSecondaryColor();
    const matched = LUCID_THEMES.find((t) => t.primary.toLowerCase() === p.toLowerCase());
    return matched || createLucidTheme(p, s, 'Personalizado', 'custom');
  })(),

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

  // 3D Air Virtual Instruments
  isAirInstrumentsActive: false,
  airInstrumentType: 'synth',
  airSynthScale: 'pentatonic_minor',
  lastTriggeredNote: null,
  multiHandLandmarks: null,

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
  shuffleHistory: [],
  crossfadeDuration: 3,

  visualizerMode: StorageService.getVisualizerMode(),
  visualizerShape: StorageService.getSphereShape(),
  waveEffectMode: StorageService.getSphereWaveMode(),
  waveEffectIntensity: StorageService.getSphereWaveIntensity(),
  bassBoomThreshold: StorageService.getSphereBassBoomThreshold(),
  bassBoomIntensity: StorageService.getSphereBassBoomIntensity(),

  // Sphere 3D Isolated Config
  sphereShape: StorageService.getSphereShape(),
  sphereWaveMode: StorageService.getSphereWaveMode(),
  sphereWaveIntensity: StorageService.getSphereWaveIntensity(),
  sphereBassBoomThreshold: StorageService.getSphereBassBoomThreshold(),
  sphereBassBoomIntensity: StorageService.getSphereBassBoomIntensity(),

  // Blob 2D Isolated Config
  blobShape: StorageService.getBlobShape(),
  blobWaveMode: StorageService.getBlobWaveMode(),
  blobWaveIntensity: StorageService.getBlobWaveIntensity(),
  blobBassBoomThreshold: StorageService.getBlobBassBoomThreshold(),
  blobBassBoomIntensity: StorageService.getBlobBassBoomIntensity(),
  blobScale: 0.5,
  autoMode: false,
  dynamicColor: '#00f2fe',
  baseColorHue: 180,
  autoSensitivity: 1.0,
  autoPalette: {
    primary: '#00f2fe',
    secondary: '#00f2fe',
    tertiary: '#00f2fe',
    accent: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.6)',
    bg: 'radial-gradient(circle at 30% 30%, rgba(0, 242, 254, 0.2) 0%, #03050c 80%, #000000 100%)',
  },
  autoFeedbackToast: false,
  autoNotification: null,
  isMicActive: false,
  showFrequencyBars: false,
  sphereOpacity: 0.9,
  sphereScale: StorageService.getSphereScale() || 1.0,
  rainbowScale: 0.5,
  linkScales: false,
  sphereRadius: StorageService.getSphereScale() || 1.0,
  musicSensitivity: StorageService.getMusicSensitivity(),
  audioSpeed: StorageService.getMusicSensitivity(),

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

  // Gamification & Real-Time Stats
  intensityScore: 0,
  sessionHighScore: StorageService.getHighScore(),
  totalListeningTime: StorageService.getTotalListeningTime(),
  sessionDuration: 0,
  detectedGenre: 'Detectando...',
  genreConfidence: 0.85,
  isAdminModalOpen: false,
  isProfileModalOpen: false,
  isSysReqModalOpen: false,
  performanceTier: StorageService.getPerformanceTier(),
  userProfile: {
    id: 'usr_guest',
    username: 'Invitado',
    role: 'guest',
    isGuest: true,
    genres: ['Electrónica / EDM'],
  },
  isShortcutsModalOpen: false,
  isPresetsModalOpen: false,
  setPresetsModalOpen: (isPresetsModalOpen) => set({ isPresetsModalOpen }),
  togglePresetsModal: () => set((state) => ({ isPresetsModalOpen: !state.isPresetsModalOpen })),
  bpm: 0,
  isBeatPulse: false,
  isUiIdle: false,
  setIsUiIdle: (isUiIdle) => set({ isUiIdle }),

  setProfileModalOpen: (isProfileModalOpen) => set({ isProfileModalOpen }),
  toggleProfileModal: () => set((state) => ({ isProfileModalOpen: !state.isProfileModalOpen })),
  setSysReqModalOpen: (isSysReqModalOpen) => set({ isSysReqModalOpen }),
  toggleSysReqModal: () => set((state) => ({ isSysReqModalOpen: !state.isSysReqModalOpen })),
  setPerformanceTier: (performanceTier) => {
    StorageService.savePerformanceTier(performanceTier);
    set({ performanceTier });
  },
  cyclePerformanceTier: () => {
    const current = get().performanceTier;
    const next: 'high' | 'medium' | 'eco' =
      current === 'high' ? 'medium' : current === 'medium' ? 'eco' : 'high';
    StorageService.savePerformanceTier(next);
    set({ performanceTier: next });
  },
  setUserProfile: (userProfile) => set({ userProfile }),

  setHasStarted: (hasStarted) => set({ hasStarted }),
  setIsLucid: (isLucid) => set({ isLucid }),
  toggleLucidMode: () => set((state) => ({ isLucid: !state.isLucid })),

  setLucidTheme: (lucidTheme) => {
    StorageService.saveLucidPrimaryColor(lucidTheme.primary);
    StorageService.saveLucidSecondaryColor(lucidTheme.secondary);
    set({
      lucidTheme,
      lucidPrimaryColor: lucidTheme.primary,
      lucidSecondaryColor: lucidTheme.secondary,
      isLucid: true,
    });
  },
  setLucidPrimaryColor: (color) => {
    StorageService.saveLucidPrimaryColor(color);
    set((state) => {
      const updatedTheme = createLucidTheme(
        color,
        state.lucidSecondaryColor,
        'Personalizado',
        'custom'
      );
      return {
        lucidPrimaryColor: color,
        lucidTheme: updatedTheme,
        isLucid: true,
      };
    });
  },
  setLucidSecondaryColor: (color) => {
    StorageService.saveLucidSecondaryColor(color);
    set((state) => {
      const updatedTheme = createLucidTheme(
        state.lucidPrimaryColor,
        color,
        'Personalizado',
        'custom'
      );
      return {
        lucidSecondaryColor: color,
        lucidTheme: updatedTheme,
        isLucid: true,
      };
    });
  },
  cycleLucidTheme: () => {
    const { lucidTheme } = get();
    const currentIndex = LUCID_THEMES.findIndex((t) => t.id === lucidTheme.id);
    const nextIndex = (currentIndex + 1) % LUCID_THEMES.length;
    const nextTheme = LUCID_THEMES[nextIndex];
    StorageService.saveLucidPrimaryColor(nextTheme.primary);
    StorageService.saveLucidSecondaryColor(nextTheme.secondary);
    set({
      lucidTheme: nextTheme,
      lucidPrimaryColor: nextTheme.primary,
      lucidSecondaryColor: nextTheme.secondary,
      isLucid: true,
    });
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

  setAirInstrumentsActive: (isAirInstrumentsActive) => set({ isAirInstrumentsActive }),
  toggleAirInstruments: () => set((state) => ({ isAirInstrumentsActive: !state.isAirInstrumentsActive })),
  setAirInstrumentType: (airInstrumentType) => set({ airInstrumentType }),
  setAirSynthScale: (airSynthScale) => set({ airSynthScale }),
  setLastTriggeredNote: (lastTriggeredNote) => set({ lastTriggeredNote }),
  setMultiHandLandmarks: (multiHandLandmarks) => set({ multiHandLandmarks }),

  setCurrentPaletteIndex: (currentPaletteIndex) => set({ currentPaletteIndex }),
  cyclePalette: () => {
    const { currentPaletteIndex } = get();
    const next = (currentPaletteIndex + 1) % PROFESSIONAL_PALETTES.length;
    set({ currentPaletteIndex: next });
  },

  setVisualizerMode: (visualizerMode) => {
    StorageService.saveVisualizerMode(visualizerMode);
    const state = get();
    const activeShape = visualizerMode === 'blob' ? state.blobShape : state.sphereShape;
    const activeWaveMode = visualizerMode === 'blob' ? state.blobWaveMode : state.sphereWaveMode;
    const activeWaveIntensity = visualizerMode === 'blob' ? state.blobWaveIntensity : state.sphereWaveIntensity;
    const activeBoomThreshold = visualizerMode === 'blob' ? state.blobBassBoomThreshold : state.sphereBassBoomThreshold;
    const activeBoomIntensity = visualizerMode === 'blob' ? state.blobBassBoomIntensity : state.sphereBassBoomIntensity;
    set({
      visualizerMode,
      visualizerShape: activeShape,
      waveEffectMode: activeWaveMode,
      waveEffectIntensity: activeWaveIntensity,
      bassBoomThreshold: activeBoomThreshold,
      bassBoomIntensity: activeBoomIntensity,
    });
  },

  setVisualizerShape: (visualizerShape) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveBlobShape(visualizerShape);
      set({ blobShape: visualizerShape, visualizerShape });
    } else {
      StorageService.saveSphereShape(visualizerShape);
      set({ sphereShape: visualizerShape, visualizerShape });
    }
  },

  setWaveEffectMode: (waveEffectMode) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveBlobWaveMode(waveEffectMode);
      set({ blobWaveMode: waveEffectMode, waveEffectMode });
    } else {
      StorageService.saveSphereWaveMode(waveEffectMode);
      set({ sphereWaveMode: waveEffectMode, waveEffectMode });
    }
  },

  setWaveEffectIntensity: (waveEffectIntensity) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveBlobWaveIntensity(waveEffectIntensity);
      set({ blobWaveIntensity: waveEffectIntensity, waveEffectIntensity });
    } else {
      StorageService.saveSphereWaveIntensity(waveEffectIntensity);
      set({ sphereWaveIntensity: waveEffectIntensity, waveEffectIntensity });
    }
  },

  setBassBoomThreshold: (bassBoomThreshold) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveBlobBassBoomThreshold(bassBoomThreshold);
      set({ blobBassBoomThreshold: bassBoomThreshold, bassBoomThreshold });
    } else {
      StorageService.saveSphereBassBoomThreshold(bassBoomThreshold);
      set({ sphereBassBoomThreshold: bassBoomThreshold, bassBoomThreshold });
    }
  },

  setBassBoomIntensity: (bassBoomIntensity) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveBlobBassBoomIntensity(bassBoomIntensity);
      set({ blobBassBoomIntensity: bassBoomIntensity, bassBoomIntensity });
    } else {
      StorageService.saveSphereBassBoomIntensity(bassBoomIntensity);
      set({ sphereBassBoomIntensity: bassBoomIntensity, bassBoomIntensity });
    }
  },

  setSphereShape: (sphereShape) => {
    StorageService.saveSphereShape(sphereShape);
    set((state) => ({
      sphereShape,
      visualizerShape: state.visualizerMode === 'sphere' ? sphereShape : state.visualizerShape,
    }));
  },
  setSphereWaveMode: (sphereWaveMode) => {
    StorageService.saveSphereWaveMode(sphereWaveMode);
    set((state) => ({
      sphereWaveMode,
      waveEffectMode: state.visualizerMode === 'sphere' ? sphereWaveMode : state.waveEffectMode,
    }));
  },
  setSphereWaveIntensity: (sphereWaveIntensity) => {
    StorageService.saveSphereWaveIntensity(sphereWaveIntensity);
    set((state) => ({
      sphereWaveIntensity,
      waveEffectIntensity: state.visualizerMode === 'sphere' ? sphereWaveIntensity : state.waveEffectIntensity,
    }));
  },
  setSphereBassBoomThreshold: (sphereBassBoomThreshold) => {
    StorageService.saveSphereBassBoomThreshold(sphereBassBoomThreshold);
    set((state) => ({
      sphereBassBoomThreshold,
      bassBoomThreshold: state.visualizerMode === 'sphere' ? sphereBassBoomThreshold : state.bassBoomThreshold,
    }));
  },
  setSphereBassBoomIntensity: (sphereBassBoomIntensity) => {
    StorageService.saveSphereBassBoomIntensity(sphereBassBoomIntensity);
    set((state) => ({
      sphereBassBoomIntensity,
      bassBoomIntensity: state.visualizerMode === 'sphere' ? sphereBassBoomIntensity : state.bassBoomIntensity,
    }));
  },

  setBlobShape: (blobShape) => {
    StorageService.saveBlobShape(blobShape);
    set((state) => ({
      blobShape,
      visualizerShape: state.visualizerMode === 'blob' ? blobShape : state.visualizerShape,
    }));
  },
  setBlobWaveMode: (blobWaveMode) => {
    StorageService.saveBlobWaveMode(blobWaveMode);
    set((state) => ({
      blobWaveMode,
      waveEffectMode: state.visualizerMode === 'blob' ? blobWaveMode : state.waveEffectMode,
    }));
  },
  setBlobWaveIntensity: (blobWaveIntensity) => {
    StorageService.saveBlobWaveIntensity(blobWaveIntensity);
    set((state) => ({
      blobWaveIntensity,
      waveEffectIntensity: state.visualizerMode === 'blob' ? blobWaveIntensity : state.waveEffectIntensity,
    }));
  },
  setBlobBassBoomThreshold: (blobBassBoomThreshold) => {
    StorageService.saveBlobBassBoomThreshold(blobBassBoomThreshold);
    set((state) => ({
      blobBassBoomThreshold,
      bassBoomThreshold: state.visualizerMode === 'blob' ? blobBassBoomThreshold : state.bassBoomThreshold,
    }));
  },
  setBlobBassBoomIntensity: (blobBassBoomIntensity) => {
    StorageService.saveBlobBassBoomIntensity(blobBassBoomIntensity);
    set((state) => ({
      blobBassBoomIntensity,
      bassBoomIntensity: state.visualizerMode === 'blob' ? blobBassBoomIntensity : state.bassBoomIntensity,
    }));
  },
  setBlobScale: (_blobScale) => {
    // Rainbow Void scale strictly locked to 0.5x
    StorageService.saveRainbowScale(0.5);
    set({ blobScale: 0.5, rainbowScale: 0.5 });
  },
  setAutoMode: (autoMode) =>
    set((state) => ({
      autoMode,
      autoFeedbackToast: autoMode,
      autoNotification: autoMode
        ? {
            message: '🧠 Modo Inteligente ACTIVADO: Color dinámico fluido',
            type: 'info',
            id: Date.now(),
            color: state.dynamicColor,
          }
        : null,
    })),
  toggleAutoMode: () =>
    set((state) => {
      const nextMode = !state.autoMode;
      return {
        autoMode: nextMode,
        autoFeedbackToast: nextMode,
        autoNotification: nextMode
          ? {
              message: '🧠 Modo Inteligente ACTIVADO: Color dinámico fluido',
              type: 'info',
              id: Date.now(),
              color: state.dynamicColor,
            }
          : null,
      };
    }),
  setDynamicColor: (dynamicColor) =>
    set({
      dynamicColor,
      autoPalette: {
        primary: dynamicColor,
        secondary: dynamicColor,
        tertiary: dynamicColor,
        accent: dynamicColor,
        glow: `${dynamicColor}66`,
        bg: `radial-gradient(circle at 30% 30%, ${dynamicColor}25 0%, #03050c 80%, #000000 100%)`,
      },
    }),
  setBaseColorHue: (baseColorHue) => set({ baseColorHue: ((baseColorHue % 360) + 360) % 360 }),
  setAutoNotification: (autoNotification) => set({ autoNotification }),
  setAutoSensitivity: (autoSensitivity) => set({ autoSensitivity: Math.min(2.5, Math.max(0.1, autoSensitivity)) }),
  setAutoPalette: (autoPalette) =>
    set({
      autoPalette: {
        ...autoPalette,
        accent: autoPalette.accent || autoPalette.tertiary || '#39FF14',
      },
    }),
  updateAutoPalette: (fftData) => {
    if (!get().autoMode || !fftData || fftData.length === 0) return;

    let maxVal = 0;
    let maxIdx = 0;
    for (let i = 0; i < fftData.length; i++) {
      if (fftData[i] > maxVal) {
        maxVal = fftData[i];
        maxIdx = i;
      }
    }

    const sens = get().autoSensitivity || 1.0;
    const hue = ((maxIdx / Math.max(1, fftData.length)) * 0.85 + 0.15) * sens;
    const baseHueDeg = (hue * 360) % 360;

    const primary = `hsl(${baseHueDeg.toFixed(0)}, 95%, 55%)`;
    const glow = `hsla(${baseHueDeg.toFixed(0)}, 100%, 60%, 0.6)`;
    const bg = `radial-gradient(circle at 30% 30%, hsla(${baseHueDeg.toFixed(0)}, 75%, 15%, 0.95), #03050c)`;

    set({
      dynamicColor: primary,
      autoPalette: {
        primary,
        secondary: primary,
        tertiary: primary,
        accent: primary,
        glow,
        bg,
      },
    });
  },
  setAutoFeedbackToast: (autoFeedbackToast) => set({ autoFeedbackToast }),
  setIsMicActive: (isMicActive) => set({ isMicActive }),
  setShowFrequencyBars: (showFrequencyBars) => set({ showFrequencyBars }),
  setSphereOpacity: (sphereOpacity) => set({ sphereOpacity }),
  setSphereScale: (scale) => {
    const clamped = Math.min(2.5, Math.max(0.5, scale));
    StorageService.saveSphereScale(clamped);
    const { linkScales } = get();
    if (linkScales) {
      StorageService.saveRainbowScale(clamped);
      set({ sphereScale: clamped, sphereRadius: clamped, rainbowScale: clamped });
    } else {
      set({ sphereScale: clamped, sphereRadius: clamped });
    }
  },
  setRainbowScale: (scale) => {
    const { visualizerMode } = get();
    if (visualizerMode === 'blob') {
      StorageService.saveRainbowScale(0.5);
      set({ rainbowScale: 0.5, blobScale: 0.5 });
      return;
    }
    const clamped = Math.min(2.5, Math.max(0.5, scale));
    StorageService.saveRainbowScale(clamped);
    const { linkScales } = get();
    if (linkScales) {
      StorageService.saveSphereScale(clamped);
      set({ rainbowScale: clamped, sphereScale: clamped, sphereRadius: clamped });
    } else {
      set({ rainbowScale: clamped });
    }
  },
  setLinkScales: (linkScales) => {
    StorageService.saveLinkScales(linkScales);
    if (linkScales) {
      const { sphereScale } = get();
      StorageService.saveRainbowScale(sphereScale);
      set({ linkScales, rainbowScale: sphereScale });
    } else {
      set({ linkScales });
    }
  },
  setSphereRadius: (radius) => {
    get().setSphereScale(radius);
  },
  setMusicSensitivity: (sensitivity) => {
    const clamped = Math.min(0.85, Math.max(0.60, sensitivity));
    StorageService.saveMusicSensitivity(clamped);
    set({ musicSensitivity: clamped, audioSpeed: clamped });
  },
  setAudioSpeed: (speed) => {
    const clamped = Math.min(0.85, Math.max(0.60, speed));
    StorageService.saveMusicSensitivity(clamped);
    set({ audioSpeed: clamped, musicSensitivity: clamped });
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
    const { queue, autoMode, baseColorHue } = get();
    if (autoMode) {
      const nextHue = (baseColorHue + 60) % 360;
      set({
        baseColorHue: nextHue,
        autoNotification: {
          message: `🎨 Nuevo color base: ${Math.round(nextHue)}°`,
          type: 'success',
          id: Date.now(),
        },
        autoFeedbackToast: true,
      });
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
    const { queue, queueIndex, repeatMode, isShuffled, autoMode, baseColorHue } = get();
    if (queue.length === 0) return null;

    if (autoMode) {
      const nextHue = (baseColorHue + 60) % 360;
      set({
        baseColorHue: nextHue,
        autoNotification: {
          message: `🎨 Nuevo color base: ${Math.round(nextHue)}°`,
          type: 'success',
          id: Date.now(),
        },
        autoFeedbackToast: true,
      });
    }

    if (repeatMode === 'one') {
      return queue[queueIndex];
    }

    const { shuffleHistory } = get();
    let nextIndex = queueIndex + 1;
    if (isShuffled && queue.length > 1) {
      // Evitar repetir la pista actual y priorizar canciones no tocadas recientemente
      const pool = queue
        .map((_, i) => i)
        .filter((i) => i !== queueIndex && !shuffleHistory.slice(-Math.min(5, queue.length - 1)).includes(i));
      const validPool = pool.length > 0 ? pool : queue.map((_, i) => i).filter((i) => i !== queueIndex);
      nextIndex = validPool[Math.floor(Math.random() * validPool.length)];
      set({ shuffleHistory: [...shuffleHistory, queueIndex] });
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
    const { queue, queueIndex, currentTime, autoMode, baseColorHue, isShuffled, shuffleHistory } = get();
    if (queue.length === 0) return null;

    if (autoMode) {
      const nextHue = (baseColorHue + 300) % 360;
      set({
        baseColorHue: nextHue,
        autoNotification: {
          message: `🎨 Nuevo color base: ${Math.round(nextHue)}°`,
          type: 'success',
          id: Date.now(),
        },
        autoFeedbackToast: true,
      });
    }

    if (currentTime > 3) {
      return queue[queueIndex];
    }

    let prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    if (isShuffled && shuffleHistory.length > 0) {
      const newHistory = [...shuffleHistory];
      const popped = newHistory.pop()!;
      set({ shuffleHistory: newHistory });
      prevIndex = popped;
    }

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
    const isFav = favorites.some(
      (t) => t.id === track.id || (Boolean(track.youtubeId) && t.youtubeId === track.youtubeId)
    );
    let updatedFavorites: Track[];

    if (isFav) {
      updatedFavorites = favorites.filter(
        (t) => t.id !== track.id && (!track.youtubeId || t.youtubeId !== track.youtubeId)
      );
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
  toggleKaraokeFullscreen: () => set((s) => ({ isKaraokeFullscreen: !s.isKaraokeFullscreen })),
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

  setIntensityScore: (intensityScore) => set({ intensityScore }),
  setSessionHighScore: (sessionHighScore) => {
    StorageService.saveHighScore(sessionHighScore);
    set({ sessionHighScore });
  },
  setTotalListeningTime: (totalListeningTime) => {
    StorageService.saveTotalListeningTime(totalListeningTime);
    set({ totalListeningTime });
  },
  setSessionDuration: (sessionDuration) => set({ sessionDuration }),
  setDetectedGenre: (detectedGenre, genreConfidence = 0.85) => set({ detectedGenre, genreConfidence }),
  setAdminModalOpen: (isAdminModalOpen) => set({ isAdminModalOpen }),
  toggleAdminModal: () => set((state) => ({ isAdminModalOpen: !state.isAdminModalOpen })),
  setShortcutsModalOpen: (isShortcutsModalOpen) => set({ isShortcutsModalOpen }),
  toggleShortcutsModal: () => set((state) => ({ isShortcutsModalOpen: !state.isShortcutsModalOpen })),
  setBpm: (bpm) => set({ bpm }),
  triggerBeatPulse: () => set({ isBeatPulse: true }),
  resetBeatPulse: () => set({ isBeatPulse: false }),
  setAnalyser: (analyser: AnalyserNode | null, audioContext?: AudioContext | null) => set((state) => ({
    analyser,
    audioContext: audioContext !== undefined ? audioContext : state.audioContext,
  })),
  setUserInteracting: (userInteracting) => set({ userInteracting }),
  setSpotifyConnected: (connected) => set({ isSpotifyConnected: connected }),
  updateFromSpotify: (data) => {
    set((state) => {
      const prevTrack = state.currentTrack;
      const isSameTrack = prevTrack?.spotifyUri === data.spotifyUri;

      const track: Track = isSameTrack && prevTrack
        ? {
            ...prevTrack,
            title: data.title || prevTrack.title,
            artist: data.artist || prevTrack.artist,
            album: data.album || prevTrack.album,
            duration: data.duration || prevTrack.duration,
            coverUrl: data.coverUrl || prevTrack.coverUrl,
            spotifyUri: data.spotifyUri,
          }
        : {
            id: 'spotify_' + (data.spotifyUri ? data.spotifyUri.replace(/[^a-zA-Z0-9]/g, '_') : Date.now()),
            title: data.title || 'Pista de Spotify',
            artist: data.artist || 'Spotify Artist',
            album: data.album || '',
            duration: data.duration || 0,
            sourceType: 'spotify',
            coverUrl: data.coverUrl || '',
            spotifyUri: data.spotifyUri,
            addedAt: Date.now(),
          };

      return {
        currentTrack: track,
        currentTime: data.currentTime,
        duration: data.duration || state.duration,
        isPlaying: data.isPlaying,
        isSpotifyConnected: true,
      };
    });
  },
}));

// Expose store globally for QA console tests
if (typeof window !== 'undefined') {
  (window as unknown as { __ZUSTAND_STORE__: typeof usePlayerStore }).__ZUSTAND_STORE__ = usePlayerStore;
}
