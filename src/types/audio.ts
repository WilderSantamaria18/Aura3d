export type AudioSourceType = 'local' | 'spotify' | 'youtube' | 'demo' | 'mic' | 'system';
export type VisualizerMode = 'sphere' | 'blob' | 'party';
export type VisualizerShape = 'sphere' | 'rings' | 'spikes' | 'cloud' | 'torus' | 'wave' | 'icosahedron' | 'octahedron';
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
    id: 'cyber-emerald',
    name: 'Esmeralda Cyber',
    primary: '#39FF14',
    secondary: '#00ffb3',
    glow: 'rgba(57, 255, 20, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #03140a 0%, #010604 70%, #000000 100%)',
    glassColor: 'rgba(57, 255, 20, 0.08)',
    borderColor: 'rgba(57, 255, 20, 0.35)',
    textColor: '#39FF14',
  },
  {
    id: 'quantum-cyan',
    name: 'Cian Cuántico',
    primary: '#00f2fe',
    secondary: '#4facfe',
    glow: 'rgba(0, 242, 254, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #04172a 0%, #010813 70%, #000000 100%)',
    glassColor: 'rgba(0, 242, 254, 0.08)',
    borderColor: 'rgba(0, 242, 254, 0.35)',
    textColor: '#00f2fe',
  },
  {
    id: 'neon-violet',
    name: 'Violeta Neón',
    primary: '#8a2be2',
    secondary: '#c471ed',
    glow: 'rgba(138, 43, 226, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #170529 0%, #080112 70%, #000000 100%)',
    glassColor: 'rgba(138, 43, 226, 0.08)',
    borderColor: 'rgba(138, 43, 226, 0.35)',
    textColor: '#8a2be2',
  },
  {
    id: 'magenta-flare',
    name: 'Magenta Flare',
    primary: '#ff088a',
    secondary: '#f355da',
    glow: 'rgba(255, 8, 138, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #260216 0%, #0f0109 70%, #000000 100%)',
    glassColor: 'rgba(255, 8, 138, 0.08)',
    borderColor: 'rgba(255, 8, 138, 0.35)',
    textColor: '#ff088a',
  },
  {
    id: 'solar-amber',
    name: 'Ámbar Solar',
    primary: '#ffe600',
    secondary: '#ff5e00',
    glow: 'rgba(255, 230, 0, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #261b02 0%, #0f0a01 70%, #000000 100%)',
    glassColor: 'rgba(255, 230, 0, 0.08)',
    borderColor: 'rgba(255, 230, 0, 0.35)',
    textColor: '#ffe600',
  },
  {
    id: 'ruby-crimson',
    name: 'Rubí Fuego',
    primary: '#ff0055',
    secondary: '#ff3366',
    glow: 'rgba(255, 0, 85, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #290209 0%, #120104 70%, #000000 100%)',
    glassColor: 'rgba(255, 0, 85, 0.08)',
    borderColor: 'rgba(255, 0, 85, 0.35)',
    textColor: '#ff0055',
  },
  {
    id: 'electric-cobalt',
    name: 'Cobalto Eléctrico',
    primary: '#0066ff',
    secondary: '#00d2ff',
    glow: 'rgba(0, 102, 255, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #020c29 0%, #010412 70%, #000000 100%)',
    glassColor: 'rgba(0, 102, 255, 0.08)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    textColor: '#0066ff',
  },
  {
    id: 'mint-aurora',
    name: 'Menta Aurora',
    primary: '#00f5d4',
    secondary: '#7b2cbf',
    glow: 'rgba(0, 245, 212, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #03211e 0%, #010e0c 70%, #000000 100%)',
    glassColor: 'rgba(0, 245, 212, 0.08)',
    borderColor: 'rgba(0, 245, 212, 0.35)',
    textColor: '#00f5d4',
  },
  {
    id: 'deep-orchid',
    name: 'Orquídea Psicodélica',
    primary: '#9d00ff',
    secondary: '#ff007f',
    glow: 'rgba(157, 0, 255, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #1e022b 0%, #09010d 70%, #000000 100%)',
    glassColor: 'rgba(157, 0, 255, 0.08)',
    borderColor: 'rgba(157, 0, 255, 0.35)',
    textColor: '#9d00ff',
  },
  {
    id: 'rainbow-prism',
    name: 'Prisma Arcoíris',
    primary: '#ff007f',
    secondary: '#00f2fe',
    glow: 'rgba(255, 0, 127, 0.4)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #130a24 0%, #06020d 70%, #000000 100%)',
    glassColor: 'rgba(255, 0, 127, 0.08)',
    borderColor: 'rgba(255, 0, 127, 0.35)',
    textColor: '#ff007f',
  },
];

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
  coverUrl?: string;
  lrcContent?: string;
  addedAt: number;
  isFavorite?: boolean;
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
