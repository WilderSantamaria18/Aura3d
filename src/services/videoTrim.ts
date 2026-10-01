/**
 * Recorte real de una grabación.
 *
 * El navegador no puede cortar un `webm` sin recodificarlo, así que el tramo se reproduce en un
 * <video> oculto y se vuelve a grabar con `captureStream()` + `MediaRecorder`. Es en tiempo real
 * (un recorte de 10 s tarda ~10 s) y recodifica, pero no necesita ninguna librería externa y
 * respeta el tramo elegido con una precisión de décimas de segundo.
 */
import { resolveVideoDuration } from '../utils/videoDuration';

/** Por debajo de esto el recorte no tiene sentido (y MediaRecorder puede no producir datos) */
export const MIN_TRIM_SECONDS = 0.3;

export interface TrimPlan {
  start: number;
  end: number;
  length: number;
}

/** Valida y ajusta el tramo al vídeo: dentro de [0, duración] y con una longitud mínima */
export function planTrim(start: number, end: number, duration: number): TrimPlan {
  if (![start, end, duration].every(Number.isFinite) || duration <= 0) {
    throw new Error('El recorte no es válido.');
  }
  const s = Math.max(0, Math.min(start, duration));
  const e = Math.max(0, Math.min(end, duration));
  // Tolerancia: 2.3 - 2 vale 0.2999999999999998 en coma flotante y no debe rechazarse un tramo de 0,3 s
  if (e - s < MIN_TRIM_SECONDS - 1e-9) {
    throw new Error('El tramo es demasiado corto: elige al menos 0,3 segundos.');
  }
  return { start: s, end: e, length: e - s };
}

/**
 * ¿Hay un recorte que aplicar? Un tramo que abarca (casi) todo el vídeo no cuenta: así no se
 * recodifica sin necesidad y se conserva la grabación original.
 */
export function isTrimActive(start: number, end: number, duration: number, tolerance = 0.1): boolean {
  if (!(duration > 0) || !(end > 0)) return false;
  return start > tolerance || end < duration - tolerance;
}

const CANDIDATE_MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm',
  'video/mp4',
];

/** Códec con el que recodificar: el del original si el navegador lo admite y, si no, el mejor disponible */
export function pickRecorderMime(sourceType: string, isSupported: (type: string) => boolean): string | null {
  const own = sourceType.trim();
  const candidates = own ? [own, ...CANDIDATE_MIMES] : CANDIDATE_MIMES;
  return candidates.find((type) => isSupported(type)) ?? null;
}

export interface TrimOptions {
  start: number;
  end: number;
  /** Duración conocida del vídeo, por si el archivo no la declara */
  fallbackDuration?: number;
  videoBitsPerSecond?: number;
  /** 0..1 */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

type CapturableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

const abortError = () => new DOMException('Recorte cancelado', 'AbortError');

/** Resuelve cuando el evento ocurre; falla si el vídeo da error o si pasa el tiempo máximo */
function once(target: EventTarget, type: string, timeoutMs: number, what: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`El vídeo no respondió (${what}).`));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('No se pudo leer la grabación para recortarla.'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(type, onOk);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(type, onOk, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

/**
 * Coloca el vídeo en `seconds` y espera a estar realmente ahí. No basta con esperar el primer evento
 * `seeked`: puede ser el de un salto anterior (el que usa resolveVideoDuration para calcular la
 * duración), y entonces la reproducción empezaría desde el final, terminaría al instante y el recorte
 * saldría vacío. Se vuelve a comprobar la posición tras cada `seeked`.
 */
async function seekAndSettle(video: HTMLVideoElement, seconds: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  video.currentTime = seconds;
  while (video.seeking || Math.abs(video.currentTime - seconds) > 0.15) {
    const left = deadline - Date.now();
    if (left <= 0) throw new Error('El vídeo no respondió (posicionamiento).');
    // Si no llega ningún evento en un momento, se vuelve a comprobar en vez de fallar
    await once(video, 'seeked', Math.min(left, 400), 'posicionamiento').catch(() => undefined);
    if (Math.abs(video.currentTime - seconds) > 0.15 && !video.seeking) video.currentTime = seconds;
  }
}

/** El grabador no recibió ningún dato (el vídeo oculto no llegó a pintar fotogramas) */
class EmptyTrimError extends Error {
  constructor() {
    super('El recorte no produjo datos.');
    this.name = 'EmptyTrimError';
  }
}

/**
 * Espera a que el vídeo presente su primer fotograma. MediaRecorder no escribe nada hasta recibir
 * el primer fotograma de TODAS las pistas: si el <video> oculto no llega a pintar (equipo muy
 * cargado), el resultado sale vacío. Se continúa igualmente pasado el tiempo máximo.
 */
function waitForFirstFrame(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const withCallback = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    if (typeof withCallback.requestVideoFrameCallback === 'function') {
      withCallback.requestVideoFrameCallback(done);
    } else {
      video.addEventListener('timeupdate', done, { once: true });
    }
  });
}

/**
 * Devuelve el tramo [start, end] de `source` como un vídeo nuevo. Si la primera vez sale vacío
 * (el navegador no había calentado la decodificación) se reintenta una vez.
 */
export async function trimVideoBlob(source: Blob, opts: TrimOptions): Promise<Blob> {
  try {
    return await trimOnce(source, opts);
  } catch (err) {
    if (err instanceof EmptyTrimError && !opts.signal?.aborted) {
      opts.onProgress?.(0);
      return trimOnce(source, opts);
    }
    throw err;
  }
}

async function trimOnce(source: Blob, opts: TrimOptions): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Este navegador no puede recortar vídeo.');
  }

  const video = document.createElement('video') as CapturableVideo;
  const url = URL.createObjectURL(source);
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let tick: ReturnType<typeof setInterval> | undefined;
  let safety: ReturnType<typeof setTimeout> | undefined;

  // En el DOM pero invisible: algunos navegadores no decodifican vídeos desconectados
  video.muted = true; // se graba el sonido del tramo, pero no debe oírse mientras se recorta
  video.playsInline = true;
  video.preload = 'auto';
  video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none';
  document.body.appendChild(video);

  const release = () => {
    if (tick) clearInterval(tick);
    if (safety) clearTimeout(safety);
    try {
      video.pause();
    } catch {
      /* ya parado */
    }
    stream?.getTracks().forEach((t) => t.stop());
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  };

  try {
    if (opts.signal?.aborted) throw abortError();

    video.src = url;
    await once(video, 'loadedmetadata', 10_000, 'metadatos');
    const duration = await resolveVideoDuration(video, opts.fallbackDuration ?? 0);
    const plan = planTrim(opts.start, opts.end, duration);

    await seekAndSettle(video, plan.start);

    const mimeType = pickRecorderMime(source.type, (t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) throw new Error('Este navegador no tiene un códec para recortar vídeo.');

    // Calentamiento: se reproduce hasta que el primer fotograma se presenta y se vuelve al inicio.
    // Así la decodificación ya está en marcha cuando empieza la grabación de verdad.
    await video.play();
    await waitForFirstFrame(video, 10_000);
    video.pause();
    await seekAndSettle(video, plan.start);

    // El stream se toma una vez reproduciendo: antes de eso el vídeo puede no haber publicado sus pistas
    await video.play();
    if (video.ended || video.currentTime > plan.start + 0.5) {
      throw new Error('El vídeo no empezó donde se esperaba. Inténtalo de nuevo.');
    }
    stream = video.captureStream?.() ?? video.mozCaptureStream?.() ?? null;
    if (!stream || stream.getVideoTracks().length === 0) {
      throw new Error('Este navegador no permite recortar este vídeo.');
    }

    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: opts.videoBitsPerSecond ?? 8_000_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder!.onstop = () => resolve();
    });
    recorder.start(250);

    // Esperar a que la reproducción llegue al final del tramo
    await new Promise<void>((resolve, reject) => {
      const finish = () => resolve();
      tick = setInterval(() => {
        if (opts.signal?.aborted) {
          reject(abortError());
          return;
        }
        opts.onProgress?.(Math.min(1, Math.max(0, (video.currentTime - plan.start) / plan.length)));
        if (video.ended || video.currentTime >= plan.end - 0.03) finish();
      }, 40);
      // Red de seguridad: si la reproducción se atasca no se espera para siempre
      safety = setTimeout(() => reject(new Error('El recorte tardó demasiado y se canceló.')), plan.length * 1500 + 8000);
    });

    video.pause();
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
    if (blob.size === 0) throw new EmptyTrimError();
    opts.onProgress?.(1);
    return blob;
  } finally {
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ya parado */
      }
    }
    release();
  }
}
