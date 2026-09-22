export type WallpaperSource = 'ai-generated' | 'preset' | 'user-uploaded';
export type WallpaperAspectRatio = '16:9' | '21:9' | '9:16' | '1:1' | '4:3';

export type WallpaperStyle =
  | 'cinematic' // Cinematográfico (Porsche en lavanda)
  | 'ethereal' // Etéreo/onírico (Bote en lago espejo)
  | 'ghibli' // Anime-realista nostálgico Studio Ghibli
  | 'minimal' // Minimalista absoluto y arquitectura
  | 'cyberpunk' // Neón urbano nocturno
  | 'synthwave' // Retro 80s y puesta de sol
  | 'nature' // Naturaleza serena y lagos
  | 'abstract' // Abstracto fluido y mármol líquido
  | 'cosmic' // Espacial / nebulosas profundas
  | 'custom'; // Personalizado

export type WallpaperPalette =
  | 'warm-sunset' // Naranja / rosa / violeta
  | 'cool-night' // Azul / cian / noche
  | 'pastel-dream' // Rosas y lavandas pasteles
  | 'monochrome' // Escala de grises
  | 'vibrant' // Colores saturados
  | 'muted' // Colores desaturados
  | 'custom';

export interface WallpaperGenerationRequest {
  prompt: string;
  style: WallpaperStyle;
  aspectRatio: WallpaperAspectRatio;
  palette?: WallpaperPalette;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
}

export interface WallpaperGenerationResult {
  id: string;
  url: string; // DataURL, blob URL o remote URL
  thumbnail: string; // Base64 thumbnail o preview URL
  prompt: string;
  style: WallpaperStyle;
  aspectRatio: WallpaperAspectRatio;
  palette?: WallpaperPalette;
  seed: number;
  createdAt: number;
  source: WallpaperSource;
  isFavorite: boolean;
  width: number;
  height: number;
  fileSize: number; // bytes
}

export interface WallpaperPreset {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  fullUrl: string;
  style: WallpaperStyle;
  palette: WallpaperPalette;
  tags: string[];
  aspectRatio: WallpaperAspectRatio;
}

export interface WallpaperApplicationSettings {
  opacity: number; // 0.0 - 1.0 (default: 0.85)
  blur: number; // 0 - 40px (default: 0)
  brightness: number; // 0.5 - 2.0 (default: 1.0)
  saturation: number; // 0.5 - 2.0 (default: 1.0)
  blendMode: 'normal' | 'screen' | 'multiply' | 'overlay' | 'soft-light';
  vignette: boolean; // Viñeta radial sutil (default: true)
}

export interface WallpaperHistoryItem {
  id: string;
  thumbnail: string;
  url: string;
  prompt: string;
  style: WallpaperStyle;
  aspectRatio: WallpaperAspectRatio;
  timestamp: number;
  isFavorite: boolean;
}
