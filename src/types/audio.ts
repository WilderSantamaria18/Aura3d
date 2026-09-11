export type AudioSourceType = 'local' | 'spotify' | 'youtube' | 'demo' | 'mic' | 'system' | 'radio';
export type VisualizerMode = 'sphere' | 'blob' | 'synthwave';
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
  | 'octahedron';
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
    id: 'cyber-prism',
    name: 'Cian & Rosa Neón',
    primary: '#00f2fe',
    secondary: '#ff088a',
    glow: 'rgba(0, 242, 254, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #06152a 0%, #170314 65%, #02040a 100%)',
    glassColor: 'rgba(0, 242, 254, 0.08)',
    borderColor: 'rgba(0, 242, 254, 0.35)',
    textColor: '#00f2fe',
  },
  {
    id: 'synth-sunset',
    name: 'Púrpura & Durazno Solar',
    primary: '#7928ca',
    secondary: '#ff0080',
    glow: 'rgba(121, 40, 202, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #150325 0%, #200213 65%, #050109 100%)',
    glassColor: 'rgba(121, 40, 202, 0.08)',
    borderColor: 'rgba(121, 40, 202, 0.35)',
    textColor: '#ff0080',
  },
  {
    id: 'toxic-violet',
    name: 'Lima Eléctrico & Púrpura',
    primary: '#39ff14',
    secondary: '#9d00ff',
    glow: 'rgba(57, 255, 20, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #061908 0%, #150226 65%, #020603 100%)',
    glassColor: 'rgba(57, 255, 20, 0.08)',
    borderColor: 'rgba(57, 255, 20, 0.35)',
    textColor: '#39ff14',
  },
  {
    id: 'solar-cyan',
    name: 'Naranja Fuego & Aguamarina',
    primary: '#ff5e00',
    secondary: '#00f5d4',
    glow: 'rgba(255, 94, 0, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #240a02 0%, #021a16 65%, #080301 100%)',
    glassColor: 'rgba(255, 94, 0, 0.08)',
    borderColor: 'rgba(255, 94, 0, 0.35)',
    textColor: '#ff5e00',
  },
  {
    id: 'ultraviolet-sky',
    name: 'Azul Cobalto & Magenta',
    primary: '#0066ff',
    secondary: '#ff007f',
    glow: 'rgba(0, 102, 255, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #020e2b 0%, #210212 65%, #01040d 100%)',
    glassColor: 'rgba(0, 102, 255, 0.08)',
    borderColor: 'rgba(0, 102, 255, 0.35)',
    textColor: '#0066ff',
  },
  {
    id: 'aurora-emerald',
    name: 'Verde Esmeralda & Azul Real',
    primary: '#00ffb3',
    secondary: '#0070f3',
    glow: 'rgba(0, 255, 179, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #021a14 0%, #021129 65%, #01070e 100%)',
    glassColor: 'rgba(0, 255, 179, 0.08)',
    borderColor: 'rgba(0, 255, 179, 0.35)',
    textColor: '#00ffb3',
  },
  {
    id: 'crimson-gold',
    name: 'Rubí Carmesí & Oro Ámbar',
    primary: '#ff0055',
    secondary: '#ffb703',
    glow: 'rgba(255, 0, 85, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #25020c 0%, #241602 65%, #0c0104 100%)',
    glassColor: 'rgba(255, 0, 85, 0.08)',
    borderColor: 'rgba(255, 0, 85, 0.35)',
    textColor: '#ff0055',
  },
  {
    id: 'glacier-fuchsia',
    name: 'Hielo Ártico & Fucsia',
    primary: '#a0e9ff',
    secondary: '#d90429',
    glow: 'rgba(160, 233, 255, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #051924 0%, #210309 65%, #02070a 100%)',
    glassColor: 'rgba(160, 233, 255, 0.08)',
    borderColor: 'rgba(160, 233, 255, 0.35)',
    textColor: '#a0e9ff',
  },
  {
    id: 'miami-vice',
    name: 'Flamingo & Turquesa',
    primary: '#ff3385',
    secondary: '#00e5ff',
    glow: 'rgba(255, 51, 133, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #260515 0%, #021721 65%, #080105 100%)',
    glassColor: 'rgba(255, 51, 133, 0.08)',
    borderColor: 'rgba(255, 51, 133, 0.35)',
    textColor: '#ff3385',
  },
  {
    id: 'cyberpunk-matrix',
    name: 'Amarillo Neón & Cian Eléctrico',
    primary: '#ffe600',
    secondary: '#00f2fe',
    glow: 'rgba(255, 230, 0, 0.45)',
    bgGradient: 'radial-gradient(ellipse at 30% 30%, #241e02 0%, #021624 65%, #0a0801 100%)',
    glassColor: 'rgba(255, 230, 0, 0.08)',
    borderColor: 'rgba(255, 230, 0, 0.35)',
    textColor: '#ffe600',
  },
];

export type BackgroundAtmosphere =
  | 'none'
  | 'ripples'
  | 'rain'
  | 'sand'
  | 'sunset'
  | 'cyber_city'
  | 'cosmic_voyager'
  | 'stars'
  | 'matrix'
  | 'aurora';

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
