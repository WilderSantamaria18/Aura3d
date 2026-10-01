import type { LogoAppearance, Track } from '../types/audio';

export const DEFAULT_LOGO_APPEARANCE: LogoAppearance = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: false,
  invert: false,
  tint: 'none',
  neonBorder: false,
};

export const NEON_TINTS = [
  { id: 'none', name: 'Original', color: 'transparent' },
  { id: 'cyan', name: 'Cian', color: '#00f2fe' },
  { id: 'magenta', name: 'Magenta', color: '#ff088a' },
  { id: 'emerald', name: 'Verde', color: '#39ff14' },
  { id: 'gold', name: 'Oro', color: '#ffd700' },
  { id: 'violet', name: 'Violeta', color: '#9d00ff' },
] as const;

export function tintColor(id: string): string | null {
  const tint = NEON_TINTS.find((t) => t.id === id);
  return tint && tint.color !== 'transparent' ? tint.color : null;
}

/** Cadena CSS `filter` equivalente al estilo (la misma en la vista previa y en el visualizador). */
export function logoFilter(a: LogoAppearance): string {
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    a.grayscale ? 'grayscale(100%)' : '',
    a.invert ? 'invert(100%)' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** ¿La carátula viene de un servicio y cambia sola con cada canción? */
export function isStreamingTrack(track: Track | null | undefined): boolean {
  return track?.sourceType === 'spotify' || track?.sourceType === 'youtube';
}

/**
 * Clave estable de la canción para guardar su logo personalizado.
 * Para archivos locales no basta `track.id` (cambia entre sesiones): se usa nombre + tamaño del archivo.
 */
export function trackLogoKey(track: Track | null | undefined): string | null {
  if (!track) return null;
  switch (track.sourceType) {
    case 'spotify':
      return `sp:${track.spotifyUri || track.id}`;
    case 'youtube':
      return `yt:${track.youtubeId || track.id}`;
    case 'local':
      return track.file
        ? `loc:${track.file.name}|${track.file.size}`
        : `loc:${track.title}|${track.artist}|${Math.round(track.duration || 0)}`;
    default:
      return `id:${track.id}`;
  }
}

/**
 * Reduce una imagen a un cuadrado JPEG (recorte central) para guardarla ligera en localStorage.
 * Una carátula de 3000 px como data URL agotaría la cuota del navegador.
 */
export function downscaleImage(src: string, size = 384): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D no disponible'));
        return;
      }
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}
