/**
 * Duración real de un <video>.
 *
 * Chrome escribe los `webm` de MediaRecorder sin la duración en la cabecera: `video.duration` vale
 * `Infinity`, y con ella no se puede dibujar una barra de progreso, marcar un recorte ni exportar
 * un tramo. El truco conocido es pedir un salto enorme (`currentTime = 1e101`): el navegador recorre
 * el archivo hasta el final, calcula la duración y la publica con `durationchange`.
 */

/** ¿Es una duración con la que se puede trabajar? (finita y positiva) */
export const isUsableDuration = (d: number): boolean => Number.isFinite(d) && d > 0;

const HUGE_SEEK = 1e101;

/**
 * Devuelve la duración del vídeo en segundos. Si el archivo no la declara, la calcula; si no se
 * consigue (archivo corrupto o sin tiempo), devuelve `fallbackSeconds`. Deja la posición como estaba.
 */
export async function resolveVideoDuration(
  video: HTMLVideoElement,
  fallbackSeconds = 0,
  timeoutMs = 4000
): Promise<number> {
  if (isUsableDuration(video.duration)) return video.duration;

  const previous = Number.isFinite(video.currentTime) ? video.currentTime : 0;

  const resolved = await new Promise<number>((resolve) => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (value: number) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      video.removeEventListener('durationchange', check);
      video.removeEventListener('timeupdate', check);
      video.removeEventListener('seeked', check);
      resolve(value);
    };
    const check = () => {
      if (isUsableDuration(video.duration)) finish(video.duration);
    };

    video.addEventListener('durationchange', check);
    video.addEventListener('timeupdate', check);
    video.addEventListener('seeked', check);
    timer = setTimeout(() => finish(fallbackSeconds), timeoutMs);

    try {
      video.currentTime = HUGE_SEEK;
    } catch {
      finish(fallbackSeconds);
    }
  });

  try {
    video.currentTime = previous;
  } catch {
    /* si el navegador no deja volver, el llamador ya fija la posición que necesite */
  }
  return isUsableDuration(resolved) ? resolved : fallbackSeconds;
}
