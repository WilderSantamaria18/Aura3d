/**
 * Piezas de la carga de una canción de YouTube que no deben dejar la interfaz esperando.
 *
 * Antes la app esperaba, sin límite de tiempo, a que el servidor respondiera los metadatos
 * (`/api/youtube/info`, 7 s medidos en desarrollo) y a que el stream empezara a sonar (yt-dlp puede
 * tardar mucho) antes de mostrar la canción: la interfaz se quedaba en «Conectando con YouTube…».
 */

export interface YouTubeInfo {
  title?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
}

/** Tiempo máximo que se espera a los metadatos (son opcionales: la canción ya tiene título y portada) */
export const INFO_TIMEOUT_MS = 6000;

/** Tiempo máximo que se espera a que un stream propio empiece a sonar antes de usar el reproductor de YouTube */
export const STREAM_START_TIMEOUT_MS = 8000;

/** Metadatos del vídeo, o null si el servidor falla, no responde a tiempo o se cancela */
export async function fetchYouTubeInfo(
  videoId: string,
  timeoutMs: number = INFO_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch
): Promise<YouTubeInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`/api/youtube/info?v=${encodeURIComponent(videoId)}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as YouTubeInfo;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null; // sin red, tiempo agotado o respuesta inválida: se sigue con lo que ya se tiene
  } finally {
    clearTimeout(timer);
  }
}

export class StreamStartTimeoutError extends Error {
  constructor(ms: number) {
    super(`El stream no empezó en ${Math.round(ms / 1000)} s.`);
    this.name = 'StreamStartTimeoutError';
  }
}

/**
 * Ejecuta el arranque de un stream con un tiempo máximo. Si se agota, llama a `onTimeout` (que debe
 * cancelar la carga pendiente: si no, el stream empezaría a sonar a la vez que el reproductor de
 * reserva) y lanza `StreamStartTimeoutError`.
 */
export async function startWithTimeout(
  start: () => Promise<void>,
  timeoutMs: number = STREAM_START_TIMEOUT_MS,
  onTimeout?: () => void
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new StreamStartTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    // Promise.race atiende también el resultado tardío de start(): un rechazo posterior no queda sin gestionar
    await Promise.race([start(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
