/**
 * Tipos y constantes del store del reproductor.
 * (Separado de playerStore.ts para que el store solo contenga estado y acciones.)
 */
import type {
  Track,
  Playlist,
  EqualizerBand,
  VisualizerMode,
  VisualizerShape,
  BlobShape,
  WaveEffectMode,
  BlobCustomSettings,
  LucidTheme,
  ReverbPreset,
  MasteringLimiterPreset,
  VocalMode,
  LyricsPanelState,
  RomanizationMode,
  KawarpSettings,
  LenisSettings,
} from '../types/audio';

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

export type CameraPreset = 'front' | 'orbit' | 'top' | 'driver' | 'drone';
export type PlaybackStatus = 'idle' | 'resolving' | 'buffering' | 'playing' | 'error';
export type DjCrossfadeCurve = 'equal_power' | 'bass_swap' | 'beatmatch' | 'smooth_linear' | 'cut' | 'ambient';

export const DEFAULT_KAWARP_SETTINGS: KawarpSettings = {
  enabled: true,
  warpIntensity: 0.5,
  blurPasses: 16,
  motionSpeed: 0.8,
  saturation: 1.2,
  brightness: 1.0,
};

export const DEFAULT_LENIS_SETTINGS: LenisSettings = {
  enabled: true,
  duration: 1.2,
  smoothWheel: true,
  wheelMultiplier: 1.0,
};

export interface PlayerState {
  // App navigation state
  hasStarted: boolean;

  // Lucid Mode (Modo Lúcido) & Color Customization
  isLucid: boolean;
  lucidTheme: LucidTheme;
  customLucidThemes: LucidTheme[];
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

  // 3D Air Virtual Instruments & Spatial Camera Studio
  isCameraStudioOpen: boolean;
  isAirInstrumentsActive: boolean;
  airInstrumentType: 'synth' | 'drums' | 'theremin' | 'pads' | 'pose';
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
  playbackStatus: PlaybackStatus;
  playbackMessage: string | null;
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
  isCrossfadeActive: boolean;
  toggleCrossfade: () => void;
  djCrossfadeCurve: DjCrossfadeCurve;
  setDjCrossfadeCurve: (curve: DjCrossfadeCurve) => void;
  isBeatmatchEnabled: boolean;
  toggleBeatmatch: () => void;
  isBassSwapEnabled: boolean;
  toggleBassSwap: () => void;
  isDjModalOpen: boolean;
  setDjModalOpen: (isOpen: boolean) => void;
  toggleDjModal: () => void;
  manualCrossfader: number;
  setManualCrossfader: (val: number) => void;
  isDjTransitioning: boolean;
  setIsDjTransitioning: (val: boolean) => void;

  // 8D Audio & Spatial Panning DSP
  is8DAudioActive: boolean;
  eightDSpeed: number;
  toggle8DAudio: () => void;
  set8DSpeed: (speed: number) => void;

  // Virtual Studio Reverb
  reverbPreset: ReverbPreset;
  setReverbPreset: (preset: ReverbPreset) => void;

  // Post-Processing Reactive Glitch & Shockwave
  isRgbGlitchActive: boolean;
  toggleRgbGlitch: () => void;

  // Sleep Timer
  sleepTimerMinutes: number;
  sleepTimerRemainingSec: number;
  setSleepTimer: (minutes: number) => void;
  decrementSleepTimer: () => void;

  // Retro CRT & Film Grain
  isRetroCrtActive: boolean;
  toggleRetroCrt: () => void;
  setRetroCrt: (active: boolean) => void;

  // 3D Audio Ribbons
  showAudioRibbons: boolean;
  toggleAudioRibbons: () => void;
  setShowAudioRibbons: (show: boolean) => void;

  // 3D Floating Karaoke Lyrics
  isLyrics3DActive: boolean;
  toggleLyrics3D: () => void;
  setLyrics3DActive: (active: boolean) => void;

  // Audio DSP: Underwater Club Filter
  isUnderwaterActive: boolean;
  toggleUnderwater: () => void;

  // Audio DSP: Speed & Pitch Shifter (Slowed + Reverb / Nightcore)
  dspSpeedMode: 'normal' | 'slowed' | 'nightcore';
  setDspSpeedMode: (mode: 'normal' | 'slowed' | 'nightcore') => void;

  // Audio DSP: Binaural Beats & Solfeggio 432Hz
  binauralMode: 'off' | 'alpha' | 'theta' | 'solfeggio432';
  setBinauralMode: (mode: 'off' | 'alpha' | 'theta' | 'solfeggio432') => void;

  // Studio Dynamic Mastering Limiter & Smart AGC Normalizer
  masteringPreset: MasteringLimiterPreset;
  setMasteringPreset: (preset: MasteringLimiterPreset) => void;
  isLoudnessNormalizationActive: boolean;
  toggleLoudnessNormalization: () => void;

  // Vocal Remover & Karaoke / Instrumental DSP
  vocalMode: VocalMode;
  setVocalMode: (mode: VocalMode) => void;
  toggleVocalMode: () => void;

  // Auralis Story Card 9:16 Modal
  isStoryCardOpen: boolean;
  setStoryCardOpen: (open: boolean) => void;

  // DJ Looper A-B & Cue Points
  loopA: number | null;
  loopB: number | null;
  isLoopActive: boolean;
  setLoopPointA: () => void;
  setLoopPointB: () => void;
  clearLoop: () => void;
  cuePoints: number[];
  setCuePoint: (index: number) => void;
  jumpToCuePoint: (index: number) => void;

  // Harmonic DJ Sync & Infinite Radio
  isHarmonicSyncActive: boolean;
  toggleHarmonicSync: () => void;
  isInfiniteRadioActive: boolean;
  toggleInfiniteRadio: () => void;

  // Modals & Panels: Command Palette & Session Stats
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isSessionStatsOpen: boolean;
  setSessionStatsOpen: (open: boolean) => void;

  // Quick 3-Band Equalizer (MiniPlayer)
  threeBandEQ: { bass: number; mids: number; treble: number };
  setThreeBandGain: (band: 'bass' | 'mids' | 'treble', gain: number) => void;

  // 3D Cinematic Camera Preset
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;

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
  blobShape: BlobShape;
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
  isMiniPlayerOpen: boolean;
  isVideoTheaterOpen: boolean;
  setVideoTheaterOpen: (isOpen: boolean) => void;
  toggleVideoTheater: () => void;
  isAudioIntelligenceHudOpen: boolean;
  audioIntelligenceHudView: 'multi' | 'goniometer' | 'vu' | 'waterfall';
  setAudioIntelligenceHudOpen: (isOpen: boolean) => void;
  toggleAudioIntelligenceHud: () => void;
  setAudioIntelligenceHudView: (view: 'multi' | 'goniometer' | 'vu' | 'waterfall') => void;
  isZenMode: boolean;
  setIsZenMode: (isZen: boolean) => void;
  toggleZenMode: () => void;
  isTransitioning: boolean;
  setIsTransitioning: (isTransitioning: boolean) => void;

  // ─── Lyrics Evolution V2 ───
  lyricsPanelState: LyricsPanelState;
  setLyricsPanelState: (state: LyricsPanelState) => void;
  isLyricsFullscreen: boolean;
  setLyricsFullscreen: (v: boolean) => void;
  romanizationMode: RomanizationMode;
  setRomanizationMode: (m: RomanizationMode) => void;
  kawarpSettings: KawarpSettings;
  updateKawarpSettings: (s: Partial<KawarpSettings>) => void;
  lenisSettings: LenisSettings;
  updateLenisSettings: (s: Partial<LenisSettings>) => void;
  dominantColors: { primary: string; secondary: string } | null;
  setDominantColors: (c: { primary: string; secondary: string } | null) => void;
  lyricsHideDelay: number;
  setLyricsHideDelay: (ms: number) => void;
  lyricsAutoScroll: boolean;
  setLyricsAutoScroll: (v: boolean) => void;
  lyricsOffset: number;
  setLyricsOffset: (offset: number) => void;
  adjustLyricsOffset: (delta: number) => void;

  // Studio Capture & Framing Suite
  isCaptureStudioOpen: boolean;
  captureAspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  isFramingGuideActive: boolean;
  captureQuality: '1080p' | '4k';
  captureSourceMode: 'direct_canvas' | 'screen_tab';
  setCaptureStudioOpen: (isOpen: boolean) => void;
  toggleCaptureStudio: () => void;
  setCaptureAspectRatio: (ratio: '16:9' | '9:16' | '1:1' | '4:5') => void;
  setFramingGuideActive: (active: boolean) => void;
  toggleFramingGuide: () => void;
  setCaptureQuality: (quality: '1080p' | '4k') => void;
  setCaptureSourceMode: (mode: 'direct_canvas' | 'screen_tab') => void;

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
  /** Nivel elegido por el usuario: es el techo, nunca lo modifica el modo automático */
  performanceTier: 'high' | 'medium' | 'eco';
  /** Calidad automática por FPS (por defecto activada) */
  autoQuality: boolean;
  /** Tope que impone el modo automático en esta sesión (no se guarda) */
  autoTierCap: 'high' | 'medium' | 'eco';
  /** Nivel que realmente aplican los visualizadores: el menor entre performanceTier y autoTierCap */
  effectiveTier: 'high' | 'medium' | 'eco';
  setAutoQuality: (enabled: boolean) => void;
  setAutoTierCap: (cap: 'high' | 'medium' | 'eco') => void;
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
  saveCustomLucidTheme: (name?: string, primary?: string, secondary?: string) => LucidTheme;
  deleteCustomLucidTheme: (id: string) => void;
  combineWithWallpaper: (targetUrl?: string, targetTitle?: string) => Promise<boolean>;
  setVrMode: (vrMode: boolean) => void;
  toggleVrMode: () => void;
  setVrTrackingMode: (mode: 'body' | 'hands') => void;
  setHandLandmarks: (landmarks: HandLandmark[] | null) => void;
  setHandGesture: (gesture: 'open' | 'closed' | 'pinch' | 'swipe_left' | 'swipe_right' | 'one' | 'fist' | 'unknown' | null) => void;
  setHandRotation: (rotation: { x: number; y: number }) => void;
  setHandSensitivity: (sensitivity: number) => void;
  setPoseLandmarks: (landmarks: PoseLandmark[] | null) => void;
  setPoseVelocity: (velocity: number) => void;
  setPoseKeypoints: (data: { rightHand?: { x: number; y: number; z: number }; leftHand?: { x: number; y: number; z: number }; head?: { x: number; y: number; z: number }; velocity?: number }) => void;
  setCameraStudioOpen: (open: boolean) => void;
  toggleCameraStudio: () => void;
  setAirInstrumentsActive: (active: boolean) => void;
  toggleAirInstruments: () => void;
  setAirInstrumentType: (type: 'synth' | 'drums' | 'theremin' | 'pads' | 'pose') => void;
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

  setBlobShape: (shape: BlobShape) => void;
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
  playNext: (track: Track) => void;
  clearQueue: () => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  smartDjSortQueue: () => void;
  nextTrack: () => Track | null;
  previousTrack: () => Track | null;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackStatus: (status: PlaybackStatus, message?: string | null) => void;
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
  setMiniPlayerOpen: (isOpen: boolean) => void;
  toggleMiniPlayer: () => void;
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
  mouseEffectsEnabled: boolean;
  setMouseEffectsEnabled: (enabled: boolean) => void;
  toggleMouseEffects: () => void;
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
  /** Último error de audio para mostrar al usuario (null = sin error). Global: lo ven todas las pantallas. */
  audioError: string | null;
  setAudioError: (message: string | null) => void;
  spotifyBpm: number;
  spotifyEnergy: number;
  spotifyDanceability: number;
  spotifySyncTimestamp: number;
  spotifyProgressMs: number;
  updateFromSpotify: (trackData: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    coverUrl: string;
    spotifyUri: string;
    currentTime: number;
    isPlaying: boolean;
    progressMs?: number;
    tempo?: number;
    bpm?: number;
    energy?: number;
    danceability?: number;
  }) => void;
}
