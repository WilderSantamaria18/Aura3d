import type { Track } from '../types/audio';

export const MAX_PERSISTED_QUEUE = 200;

export interface PersistedQueue {
  tracks: Track[];
  index: number;
}

/**
 * ¿Se puede volver a reproducir esta pista tras recargar la página?
 * No: archivos locales (el File y su blob: mueren con la pestaña), micrófono, captura de sistema
 * y Spotify (suena en otro dispositivo y se controla desde el sondeo, no desde la cola).
 */
export function isRestorable(track: Track): boolean {
  if (track.file) return false;
  if (track.sourceType === 'local' || track.sourceType === 'mic' || track.sourceType === 'system') return false;
  if (track.sourceType === 'spotify') return false;
  if (typeof track.url === 'string' && track.url.startsWith('blob:')) return false;
  return Boolean(track.youtubeId || track.url);
}

/** Cola reducida a lo reproducible y a campos serializables, con el índice reubicado. */
export function serializeQueue(queue: Track[], queueIndex: number): PersistedQueue {
  const current = queue[queueIndex];
  const tracks: Track[] = [];
  let index = 0;

  for (const t of queue) {
    if (!isRestorable(t) || tracks.length >= MAX_PERSISTED_QUEUE) continue;
    if (t === current) index = tracks.length;
    tracks.push({
      id: t.id,
      title: t.title || 'Pista desconocida',
      artist: t.artist || 'Aura3D',
      album: t.album,
      duration: t.duration || 0,
      sourceType: t.sourceType,
      url: t.url,
      youtubeId: t.youtubeId,
      isIframePlayback: t.isIframePlayback,
      coverUrl: t.coverUrl,
      addedAt: t.addedAt || Date.now(),
    });
  }
  return { tracks, index };
}

/** Valida lo leído del almacenamiento: puede estar corrupto o venir de otra versión. */
export function parsePersistedQueue(raw: string | null): PersistedQueue {
  const empty: PersistedQueue = { tracks: [], index: 0 };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw) as Partial<PersistedQueue> | null;
    if (!data || !Array.isArray(data.tracks)) return empty;
    const tracks = data.tracks
      .filter((t): t is Track => !!t && typeof t.id === 'string' && typeof t.title === 'string')
      .filter(isRestorable)
      .slice(0, MAX_PERSISTED_QUEUE);
    const index = Number.isInteger(data.index) ? Math.max(0, Math.min(data.index as number, tracks.length - 1)) : 0;
    return { tracks, index: tracks.length ? index : 0 };
  } catch {
    return empty;
  }
}
