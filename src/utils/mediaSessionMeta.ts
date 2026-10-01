import type { Track } from '../types/audio';

export interface MediaSessionInfo {
  title: string;
  artist: string;
  album: string;
  artwork: { src: string; sizes?: string; type?: string }[];
}

/** Datos que el sistema operativo muestra (pantalla de bloqueo, teclas multimedia, auriculares). */
export function mediaSessionInfo(track: Track | null): MediaSessionInfo | null {
  if (!track) return null;
  const src = track.coverUrl;
  return {
    title: track.title,
    artist: track.artist,
    album: track.album || '',
    // Sin portada no se manda artwork: algunas plataformas muestran un icono roto con src vacío
    artwork: src ? [{ src }] : [],
  };
}

/**
 * Clave estable de los metadatos. El store crea un objeto Track nuevo en cada sondeo de Spotify,
 * así que comparar por identidad reescribiría los metadatos cada 2 s.
 */
export function mediaSessionKey(track: Track | null): string {
  if (!track) return '';
  return [track.id, track.title, track.artist, track.album || '', track.coverUrl || ''].join('\u0001');
}

/**
 * positionState válido: el navegador lanza TypeError si la duración no es finita y positiva
 * o la posición queda fuera de [0, duración] (lo habitual en directos y entradas en vivo).
 */
export function mediaSessionPosition(
  duration: number,
  currentTime: number
): { duration: number; position: number; playbackRate: number } | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (!Number.isFinite(currentTime)) return null;
  return { duration, position: Math.max(0, Math.min(currentTime, duration)), playbackRate: 1 };
}
