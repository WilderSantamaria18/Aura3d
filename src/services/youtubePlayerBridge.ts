/**
 * Puente entre el reproductor de YouTube (iframe) y quien espera su resultado.
 *
 * El iframe vive en un singleton a nivel de módulo y sus callbacks llegan mucho después
 * del render que los provocó. Este módulo convierte esos callbacks en eventos con el
 * `videoId` al que pertenecen, de modo que:
 *   - quien espera un intento (`awaitYouTubePlayback`) sólo reacciona a SU vídeo;
 *   - un callback tardío del vídeo anterior se descarta en lugar de atribuirse al actual.
 */
import { YouTubePlaybackError, type YouTubeFailureReason } from './youtubeFallback';

export type YouTubePlaybackEvent =
  | { type: 'playing'; videoId: string }
  | { type: 'error'; videoId: string; reason: YouTubeFailureReason; code?: number }
  | { type: 'ended'; videoId: string };

type Listener = (event: YouTubePlaybackEvent) => void;

const listeners = new Set<Listener>();

/** El reproductor publica aquí lo que ocurre; nunca decide qué canción debe sonar. */
export function notifyYouTubeEvent(event: YouTubePlaybackEvent): void {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch (error) {
      console.warn('[youtubePlayerBridge] listener error:', error);
    }
  }
}

export function onYouTubeEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Promesa de «este vídeo ya está sonando», con presupuesto de tiempo y cancelación. */
export function awaitYouTubePlayback(
  videoId: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      listeners.delete(listener);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const listener: Listener = (event) => {
      if (event.videoId !== videoId) return; // evento de otro vídeo: se ignora
      if (event.type === 'playing') {
        finish(resolve);
      } else if (event.type === 'error') {
        finish(() => reject(new YouTubePlaybackError(event.reason, undefined, { videoId, code: event.code })));
      }
    };
    const timer = setTimeout(() => {
      finish(() => reject(new YouTubePlaybackError('PLAYER_TIMEOUT', undefined, { videoId })));
    }, timeoutMs);
    const onAbort = () => finish(() => reject(new DOMException('Intento cancelado', 'AbortError')));

    listeners.add(listener);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Sesión de fallback activa: permite que un fallo tardío (después de sonar) se
   atribuya a la pista en curso sin que el reproductor conozca el pipeline.
   ──────────────────────────────────────────────────────────────────────────── */
export interface ActiveYouTubeSession {
  readonly trackId: string;
  readonly excludedIds: string[];
  /** `true` mientras el pipeline sigue intentando candidatos y vigila el arranque. */
  readonly running: boolean;
  cancel(): void;
}

let activeSession: ActiveYouTubeSession | null = null;

export function setActiveYouTubeSession(session: ActiveYouTubeSession | null): void {
  activeSession = session;
}

export function getActiveYouTubeSession(): ActiveYouTubeSession | null {
  return activeSession;
}

/** Sólo para tests: limpia oyentes y sesión activa. */
export function resetYouTubePlayerBridge(): void {
  listeners.clear();
  activeSession = null;
}
