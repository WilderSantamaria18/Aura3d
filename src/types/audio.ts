export type AudioSourceType = 'local' | 'spotify' | 'youtube' | 'demo' | 'mic' | 'system' | 'radio';
export type VisualizerMode = 'sphere' | 'blob' | 'synthwave' | 'warp' | 'terrain';
export type VocalMode = 'off' | 'karaoke' | 'acappella';
export type ReverbPreset = 'off' | 'studio' | 'club' | 'concert' | 'cathedral';
export type VisualizerShape =
  | 'sphere'
  | 'rings'
  | 'spikes'
  | 'cloud'
  | 'torus'
  | 'wave'
  | 'kaleidoscope'
  | 'vortex'
  | 'fractal'
  | 'nebula'
  | 'bars'
  | 'laser'
  | 'icosahedron'
  | 'octahedron'
  | 'cat_ears'
  | 'fox_ears'
  | 'cyber_horns'
  | 'valkyrie_wings'
  | 'laser_crown'
  | 'dual_crest'
  | 'vector_spires'
  | 'pulse_antennas'
  | 'aero_fins'
  | 'apex_prism'
  | 'harmonic_crown'
  | 'hyperbolic_arcs'
  | 'laser_needles'
  | 'wave_peaks';
export type WaveEffectMode = 'concentric' | 'sinusoidal' | 'spiral' | 'void' | 'off';


export interface LucidTheme {
  id: string;
  name: string;
  primary: string;       // main neon color (e.g. #39FF14)
  secondary: string;     // accent/complementary neon (e.g. #00f2fe)
  glow: string;          // rgba string for glow shadows (e.g. rgba(57, 255, 20, 0.4))
  bgGradient: string;    // radial gradient background
  glassColor: string;    // glassmorphism background rgba
  borderColor: string;   // border color rgba
  textColor: string;     // text highlight color
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createLucidTheme(
  primary: string,
  secondary: string,
  name = 'Personalizado',
  id = 'custom'
): LucidTheme {
  const glow = hexToRgba(primary, 0.45);
  const glassColor = hexToRgba(primary, 0.08);
  const borderColor = hexToRgba(primary, 0.35);
  const textColor = primary;
  const bgGradient = `radial-gradient(ellipse at 30% 30%, ${hexToRgba(primary, 0.12)} 0%, ${hexToRgba(secondary, 0.05)} 50%, #03050c 85%, #000000 100%)`;

  return {
    id,
    name,
    primary,
    secondary,
    glow,
    bgGradient,
    glassColor,
    borderColor,
    textColor,
  };
}

export const DEFAULT_DARK_THEME: LucidTheme = {
  id: 'default-dark',
  name: 'Oscuro Estándar',
  primary: '#00f2fe',
  secondary: '#ff088a',
  glow: 'rgba(0, 242, 254, 0.3)',
  bgGradient: '#04060d',
  glassColor: 'rgba(9, 14, 28, 0.85)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  textColor: '#00f2fe',
};

export const DEFAULT_LUCID_THEME: LucidTheme = {
  id: 'cyber-emerald',
  name: 'Esmeralda Cyber',
  primary: '#39FF14',
  secondary: '#00ffb3',
  glow: 'rgba(57, 255, 20, 0.4)',
  bgGradient: 'radial-gradient(ellipse at 30% 30%, #03140a 0%, #010604 70%, #000000 100%)',
  glassColor: 'rgba(57, 255, 20, 0.08)',
  borderColor: 'rgba(57, 255, 20, 0.35)',
  textColor: '#39FF14',
};

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const PROFESSIONAL_PALETTES: ColorPalette[] = [
  { name: 'Aurora', colors: ['#39FF14', '#00E5FF', '#9D00FF', '#FF007F'] },
  { name: 'Atardecer', colors: ['#FF6B6B', '#FFA94D', '#FFD93D', '#6BCB77'] },
  { name: 'Océano', colors: ['#0077BE', '#00B4D8', '#90E0EF', '#CAF0F8'] },
  { name: 'Fuego', colors: ['#FF4500', '#FF8C00', '#FFD700', '#FF1493'] },
  { name: 'Neón Clásico', colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000'] },
  { name: 'Cyberpunk', colors: ['#00F2FE', '#4FACFE', '#FF088A', '#9D00FF'] },
  { name: 'Galaxia', colors: ['#8A2BE2', '#C471ED', '#12C2E9', '#F64F59'] },
];

export const LUCID_THEMES: LucidTheme[] = [
  {
    id: 'cosmic-cyan-gold',
    name: 'Cian Cósmico & Oro Solar',
    primary: '#00f5d4',
    secondary: '#ffd166',
    glow: 'rgba(0, 245, 212, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #001f1c 0%, #1c1400 65%, #020606 100%)',
    glassColor: 'rgba(0, 245, 212, 0.08)',
    borderColor: 'rgba(0, 245, 212, 0.35)',
    textColor: '#00f5d4',
  },
  {
    id: 'electric-lavender',
    name: 'Lavanda Eléctrica & Rosa Neón',
    primary: '#b388ff',
    secondary: '#ff4081',
    glow: 'rgba(179, 136, 255, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #17082e 0%, #29001b 65%, #06010d 100%)',
    glassColor: 'rgba(179, 136, 255, 0.08)',
    borderColor: 'rgba(179, 136, 255, 0.35)',
    textColor: '#b388ff',
  },
  {
    id: 'glacier-emerald',
    name: 'Esmeralda Glaciar & Aguamarina',
    primary: '#00f5a0',
    secondary: '#00d9f5',
    glow: 'rgba(0, 245, 160, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #002216 0%, #001924 65%, #010806 100%)',
    glassColor: 'rgba(0, 245, 160, 0.08)',
    borderColor: 'rgba(0, 245, 160, 0.35)',
    textColor: '#00f5a0',
  },
  {
    id: 'tokyo-twilight',
    name: 'Tokyo Twilight & Magenta',
    primary: '#ff2a7a',
    secondary: '#00e5ff',
    glow: 'rgba(255, 42, 122, 0.48)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #290317 0%, #001826 65%, #050106 100%)',
    glassColor: 'rgba(255, 42, 122, 0.08)',
    borderColor: 'rgba(255, 42, 122, 0.35)',
    textColor: '#ff2a7a',
  },
  {
    id: 'mystic-purple-amber',
    name: 'Púrpura Místico & Ámbar Miel',
    primary: '#9d4edd',
    secondary: '#ffb703',
    glow: 'rgba(157, 78, 221, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #1b072e 0%, #261700 65%, #08020d 100%)',
    glassColor: 'rgba(157, 78, 221, 0.08)',
    borderColor: 'rgba(157, 78, 221, 0.35)',
    textColor: '#9d4edd',
  },
  {
    id: 'sapphire-sunset',
    name: 'Azul Zafiro & Naranja Crepúsculo',
    primary: '#3a86ff',
    secondary: '#fb5607',
    glow: 'rgba(58, 134, 255, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #03132e 0%, #260a00 65%, #01050f 100%)',
    glassColor: 'rgba(58, 134, 255, 0.08)',
    borderColor: 'rgba(58, 134, 255, 0.35)',
    textColor: '#3a86ff',
  },
  {
    id: 'toxic-emerald-violet',
    name: 'Verde Tóxico & Violeta Astral',
    primary: '#10b981',
    secondary: '#8b5cf6',
    glow: 'rgba(16, 185, 129, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #021e14 0%, #160829 65%, #010905 100%)',
    glassColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    textColor: '#10b981',
  },
  {
    id: 'quartz-cobalt',
    name: 'Rosa Cuarzo & Azul Cobalto',
    primary: '#f72585',
    secondary: '#4361ee',
    glow: 'rgba(247, 37, 133, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #260314 0%, #050d2e 65%, #080105 100%)',
    glassColor: 'rgba(247, 37, 133, 0.08)',
    borderColor: 'rgba(247, 37, 133, 0.35)',
    textColor: '#f72585',
  },
  {
    id: 'champagne-ruby',
    name: 'Oro Champagne & Rubí Imperial',
    primary: '#ffd700',
    secondary: '#e63946',
    glow: 'rgba(255, 215, 0, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #292000 0%, #240409 65%, #0a0800 100%)',
    glassColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
    textColor: '#ffd700',
  },
  {
    id: 'boreal-mint-indigo',
    name: 'Boreal Mint & Índigo Astral',
    primary: '#2dd4bf',
    secondary: '#6366f1',
    glow: 'rgba(45, 212, 191, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #03201d 0%, #090b2b 65%, #010807 100%)',
    glassColor: 'rgba(45, 212, 191, 0.08)',
    borderColor: 'rgba(45, 212, 191, 0.35)',
    textColor: '#2dd4bf',
  },
  {
    id: 'solar-fire-peach',
    name: 'Fuego Solar & Melocotón Neón',
    primary: '#ff4800',
    secondary: '#ffaa00',
    glow: 'rgba(255, 72, 0, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #290900 0%, #241600 65%, #0a0300 100%)',
    glassColor: 'rgba(255, 72, 0, 0.08)',
    borderColor: 'rgba(255, 72, 0, 0.35)',
    textColor: '#ff4800',
  },
  {
    id: 'oled-pure-black',
    name: 'OLED Minimalista & Plata',
    primary: '#00f2fe',
    secondary: '#ffffff',
    glow: 'rgba(0, 242, 254, 0.40)',
    bgGradient: '#000000',
    glassColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    textColor: '#ffffff',
  },
  {
    id: 'vaporwave-pastel',
    name: 'Vaporwave Pastel & Hielo',
    primary: '#f3c4fb',
    secondary: '#a1c4fd',
    glow: 'rgba(243, 196, 251, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #241426 0%, #0d1a29 65%, #09030a 100%)',
    glassColor: 'rgba(243, 196, 251, 0.08)',
    borderColor: 'rgba(243, 196, 251, 0.35)',
    textColor: '#f3c4fb',
  },
  {
    id: 'cyber-lime-blue',
    name: 'Ciber Lima & Azul Eléctrico',
    primary: '#a6ff00',
    secondary: '#0066ff',
    glow: 'rgba(166, 255, 0, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #152400 0%, #000f29 65%, #040900 100%)',
    glassColor: 'rgba(166, 255, 0, 0.08)',
    borderColor: 'rgba(166, 255, 0, 0.35)',
    textColor: '#a6ff00',
  },
];

export type BackgroundAtmosphere =
  | 'none'
  | 'sunset'
  | 'rain'
  | 'sand'
  | 'stars'
  | 'radial_burst'
  | 'stardust_drift'
  | 'light_beams'
  | 'quantum_waves';

export interface BlobCustomSettings {
  circleColor: string;
  haloColor1: string;
  haloColor2: string;
  isRainbowMode: boolean;
  circleSize: number;
  haloSize: number;
  posX: number;
  posY: number;
  bassBoost: number;
  backgroundBlur: number;
  logoStyle: string;
  customLogoUrl: string | null;
  scaleSensitivity?: number;
  // Background Custom Image & Opacity & Proportional Fit
  customBackgroundImage?: string | null;
  backgroundOpacity?: number;
  backgroundFit?: 'cover' | 'contain';
  backgroundScale?: number;
  // Background Image Text Protection & Lucid Color Contrast Blend
  backgroundContrastMode?: 'none' | 'text_clarity' | 'lucid_tint' | 'deep_cinema';
  backgroundTextScrim?: number;
  backgroundThemeTint?: number;
  // Rainbow Void 2D & Atmospheric Calibration & Dynamics
  backgroundAtmosphere?: BackgroundAtmosphere;
  atmosphereSpeed?: number;
  atmosphereGlow?: number;
  atmosphereSmoothing?: number;
  atmosphereBlend?: BackgroundAtmosphere | 'none';
  kickThreshold?: number;
  kickPower?: number;
  dhonkioInnerSize?: number;
  dhonkioOuterSize?: number;
  dhonkioOpacity?: number;
  dhonkioBloom?: number;
  dhonkioPowerBass?: number;
  dhonkioPowerMid?: number;
  dhonkioPowerKick?: number;
  dhonkioKickBoost?: number;
  isUiHidden?: boolean;
  // Cat-Ears & Sacred Minimalism Parametric Settings
  catEarsCount?: number;
  catEarsLayers?: number;
  catEarsStrokeWidth?: number;
  catEarsSharpness?: number;
  sacredPalette?: 'neon' | 'gold' | 'crystal' | 'lucid' | 'custom' | 'cyberpunk' | 'aurora';
  transparentHalo?: boolean;
  isAdvancedMode?: boolean;
  // LiquidVoidCircle Minimalist & Peripheral Shape Settings
  showPeripheralShapes?: boolean;
  peripheralShapeType?:
    | 'cat_ears'
    | 'fox_ears'
    | 'cyber_horns'
    | 'valkyrie_wings'
    | 'laser_crown'
    | 'dual_crest'
    | 'vector_spires'
    | 'pulse_antennas'
    | 'aero_fins'
    | 'apex_prism'
    | 'harmonic_crown'
    | 'hyperbolic_arcs'
    | 'laser_needles'
    | 'fractal'
    | 'wave_peaks';
  peripheralShapeCount?: 2 | 4;
  strokeHairline?: 0.75 | 1.0 | 1.5;
  kickIntensity?: number;
  crestStretch?: number;
  crestBassBoost?: number;
  crestNoteMovement?: number;
  rotationSpeed?: number;
  rotationDirection?: 'clockwise' | 'counter_clockwise';
  ringThickness?: number;
  bloomIntensity?: number;
  chromaticAberration?: number;
  audioSmoothingMode?: 'fast' | 'balanced' | 'smooth';
  frequencyFocus?: 'full' | 'bass' | 'mids' | 'highs';
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  sourceType: AudioSourceType;
  url?: string; // object URL or stream URL
  file?: File;
  spotifyUri?: string;
  youtubeId?: string;
  isIframePlayback?: boolean;
  coverUrl?: string;
  lrcContent?: string;
  addedAt: number;
  isFavorite?: boolean;
  format?: string;
  bpm?: number;
  camelotKey?: string;
  genre?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export interface EqualizerBand {
  id: number;
  frequency: number; // in Hz
  label: string;
  gain: number; // in dB (-12 to +12)
  type: BiquadFilterType;
}

export interface FrequencyData {
  raw: Uint8Array;
  bass: number;     // 0 - 1 (normalized average of low frequencies 20Hz-250Hz)
  mids: number;     // 0 - 1 (normalized average of mid frequencies 250Hz-4000Hz)
  highs: number;    // 0 - 1 (normalized average of high frequencies 4000Hz-20000Hz)
  energy: number;   // overall audio energy (0 - 1)
}

export type MasteringLimiterPreset = 'off' | 'punchy_club' | 'warm_tape' | 'vocal_clarity';

export interface DjLoopState {
  loopA: number | null;
  loopB: number | null;
  isActive: boolean;
  cuePoints: number[];
}

export interface SessionStatsData {
  totalSeconds: number;
  focusSeconds: number;
  tracksPlayed: number;
  keysDistribution: Record<string, number>;
  sessionStartTime: number;
}

