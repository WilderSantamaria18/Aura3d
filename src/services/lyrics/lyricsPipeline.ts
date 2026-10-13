/**
 * Pipeline de letras: acotado, cancelable y con caché.
 *
 * − Como máximo 4 pasos por canción (exacta → simplificada → search → proveedor secundario).
 * − **404** ⇒ siguiente paso. **503/429/red** ⇒ backoff 1 s→2 s→4 s con jitter, y si aun así
 *   falla, el resultado es `temporarily_unavailable` y **no se cachea** como «no existe».
 * − **Circuit breaker** de LRCLIB: si el proveedor encadena fallos transitorios, se deja de
 *   llamar durante el enfriamiento y se sigue con el proveedor secundario.
 * − Cancelación real con `AbortSignal`; las peticiones comparten resultado si son idénticas.
 */
import type { EnhancedLyricsData } from '../../types/lyrics';
import {
  buildLyricsQueries,
  lyricsCacheKey,
  normalizeMusicMetadata,
  shouldSkipLyricsLookup,
  type LyricsQueryStep,
  type LyricsQueryStepId,
  type MusicMetadataInput,
  type NormalizedMusicMetadata,
} from '../../utils/musicMetadata';
import {
  AbortError,
  backoffDelay,
  CircuitBreaker,
  MAX_TRANSIENT_RETRIES,
  SECONDARY_MAX_TRANSIENT_RETRIES,
  sleep as defaultSleep,
} from './lyricsPolicy';
import {
  executeLyricsStep,
  isLrclibStep,
  LYRICS_REQUEST_TIMEOUT_MS,
  type LyricsMatchHints,
  type LyricsStepOutcome,
} from './lyricsProviders';

export type LyricsStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'not_found'
  | 'temporarily_unavailable'
  | 'error';

export interface LyricsLookupResult {
  status: LyricsStatus;
  data: EnhancedLyricsData;
  /** Peticiones HTTP realmente realizadas (para tests y telemetría). */
  attempts: number;
  provider?: LyricsQueryStepId;
  message?: string;
  fromCache?: 'memory' | 'negative';
}

export interface LyricsPipelineDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
  now?: () => number;
  breaker?: CircuitBreaker;
  /** Presupuesto por petición HTTP (por defecto 8 s). */
  requestTimeoutMs?: number;
}

export interface LyricsLookupOptions {
  signal?: AbortSignal;
  /** Ignora la caché (positiva y negativa) y vuelve a consultar. */
  force?: boolean;
}

const NEGATIVE_TTL_MS = 10 * 60 * 1000;
const POSITIVE_CACHE_LIMIT = 300;

const EMPTY_LYRICS: EnhancedLyricsData = { synced: false, lines: [], source: 'none', isWordSynced: false };

interface InFlightEntry {
  promise: Promise<LyricsLookupResult>;
  controller: AbortController;
  waiters: number;
}

export class LyricsPipeline {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly breaker: CircuitBreaker;
  private readonly requestTimeoutMs: number;

  private readonly positiveCache = new Map<string, EnhancedLyricsData>();
  private readonly negativeCache = new Map<string, number>();
  private readonly inFlight = new Map<string, InFlightEntry>();

  constructor(deps: LyricsPipelineDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? ((...args) => fetch(...args));
    this.sleep = deps.sleep ?? defaultSleep;
    this.random = deps.random ?? Math.random;
    this.now = deps.now ?? (() => Date.now());
    this.breaker = deps.breaker ?? new CircuitBreaker(undefined, undefined, this.now);
    this.requestTimeoutMs = deps.requestTimeoutMs ?? LYRICS_REQUEST_TIMEOUT_MS;
  }

  get circuit(): CircuitBreaker {
    return this.breaker;
  }

  /** `true` si hay letra en caché para esa canción (sin tocar la red). */
  hasCached(input: MusicMetadataInput | NormalizedMusicMetadata): boolean {
    return this.positiveCache.has(this.keyOf(input));
  }

  cached(input: MusicMetadataInput | NormalizedMusicMetadata): EnhancedLyricsData | undefined {
    return this.positiveCache.get(this.keyOf(input));
  }

  clear(): void {
    this.positiveCache.clear();
    this.negativeCache.clear();
    this.inFlight.clear();
    this.breaker.reset();
  }

  stats(): { positives: number; negatives: number; inFlight: number; circuitOpen: boolean } {
    return {
      positives: this.positiveCache.size,
      negatives: this.negativeCache.size,
      inFlight: this.inFlight.size,
      circuitOpen: this.breaker.isOpen(),
    };
  }

  private keyOf(input: MusicMetadataInput | NormalizedMusicMetadata): string {
    const meta = this.normalize(input);
    return meta.cacheKey || lyricsCacheKey(meta.artist, meta.title);
  }

  private normalize(input: MusicMetadataInput | NormalizedMusicMetadata): NormalizedMusicMetadata {
    // Un metadata ya normalizado trae `cacheKey` y `artistConfidence`; se respeta tal cual.
    if ((input as NormalizedMusicMetadata).cacheKey !== undefined) {
      return input as NormalizedMusicMetadata;
    }
    return normalizeMusicMetadata(input as MusicMetadataInput);
  }

  async lookup(
    input: MusicMetadataInput | NormalizedMusicMetadata,
    options: LyricsLookupOptions = {}
  ): Promise<LyricsLookupResult> {
    const meta = this.normalize(input);
    const key = meta.cacheKey || lyricsCacheKey(meta.artist, meta.title);

    if (!options.force) {
      const cached = this.positiveCache.get(key);
      if (cached) {
        return { status: 'loaded', data: cached, attempts: 0, fromCache: 'memory' };
      }
      const negativeUntil = this.negativeCache.get(key);
      if (negativeUntil !== undefined) {
        if (negativeUntil > this.now()) {
          return {
            status: 'not_found',
            data: EMPTY_LYRICS,
            attempts: 0,
            fromCache: 'negative',
            message: 'Sin letra disponible para esta canción.',
          };
        }
        this.negativeCache.delete(key);
      }
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      existing.waiters += 1;
      try {
        return await this.raceWithSignal(existing.promise, options.signal);
      } finally {
        existing.waiters -= 1;
        if (existing.waiters <= 0) {
          // Nadie sigue esperando: se cancela la petición compartida.
          existing.controller.abort();
          if (this.inFlight.get(key) === existing) this.inFlight.delete(key);
        }
      }
    }

    const controller = new AbortController();
    const entry: InFlightEntry = {
      controller,
      waiters: 1,
      promise: null as unknown as Promise<LyricsLookupResult>,
    };

    entry.promise = this.runPipeline(meta, controller.signal)
      .then((result) => {
        if (result.status === 'loaded') {
          this.rememberPositive(key, result.data);
        } else if (result.status === 'not_found') {
          this.negativeCache.set(key, this.now() + NEGATIVE_TTL_MS);
        }
        // `temporarily_unavailable` y `error` NO se cachean: el 503 no significa «no existe».
        return result;
      })
      .finally(() => {
        const current = this.inFlight.get(key);
        if (current === entry) this.inFlight.delete(key);
      });

    this.inFlight.set(key, entry);

    try {
      return await this.raceWithSignal(entry.promise, options.signal);
    } finally {
      entry.waiters -= 1;
      if (entry.waiters <= 0) {
        controller.abort();
        if (this.inFlight.get(key) === entry) this.inFlight.delete(key);
      }
    }
  }

  private raceWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new AbortError());
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new AbortError());
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  private rememberPositive(key: string, data: EnhancedLyricsData): void {
    if (data.lines.length === 0) return;
    if (this.positiveCache.size >= POSITIVE_CACHE_LIMIT) {
      const oldest = this.positiveCache.keys().next().value;
      if (oldest !== undefined) this.positiveCache.delete(oldest);
    }
    this.positiveCache.set(key, data);
  }

  private async runPipeline(meta: NormalizedMusicMetadata, signal: AbortSignal): Promise<LyricsLookupResult> {
    if (!meta.title) {
      return { status: 'idle', data: EMPTY_LYRICS, attempts: 0 };
    }

    if (shouldSkipLyricsLookup(meta.rawTitle || meta.title, meta.duration)) {
      return {
        status: 'not_found',
        data: EMPTY_LYRICS,
        attempts: 0,
        message: 'Esta pista no tiene letra sincronizada (mezcla o versión instrumental).',
      };
    }

    const steps = buildLyricsQueries(meta);
    if (steps.length === 0) {
      return { status: 'idle', data: EMPTY_LYRICS, attempts: 0 };
    }

    const hints: LyricsMatchHints = {
      artist: meta.artist,
      duration: meta.duration,
      durationTrusted: meta.durationTrusted,
    };

    let attempts = 0;
    let sawNotFound = false;
    let sawTransientOrSkipped = false;
    let sawError = false;

    for (const step of steps) {
      if (signal.aborted) throw new AbortError();

      if (isLrclibStep(step) && this.breaker.isOpen()) {
        // Circuito abierto: no se insiste con LRCLIB; se pasa al proveedor secundario.
        sawTransientOrSkipped = true;
        continue;
      }

      let retries = 0;
      const maxRetries = isLrclibStep(step) ? MAX_TRANSIENT_RETRIES : SECONDARY_MAX_TRANSIENT_RETRIES;
      for (;;) {
        if (signal.aborted) throw new AbortError();

        const outcome: LyricsStepOutcome = await executeLyricsStep(step, {
          fetchImpl: this.fetchImpl,
          signal,
          hints,
          timeoutMs: this.requestTimeoutMs,
        });
        attempts += 1;

        // Defensa extra: si la canción cambió mientras respondía el proveedor, esta
        // respuesta no debe contar (ni acabar en la caché de la canción anterior).
        if (signal.aborted) throw new AbortError();

        if (outcome.kind === 'ok' && outcome.data) {
          if (isLrclibStep(step)) this.breaker.recordSuccess();
          return {
            status: 'loaded',
            data: outcome.data,
            attempts,
            provider: step.id,
          };
        }

        if (outcome.kind === 'not_found') {
          sawNotFound = true;
          if (isLrclibStep(step)) this.breaker.recordSuccess();
          break; // 404: esta combinación no existe → siguiente paso
        }

        if (outcome.kind === 'error') {
          sawError = true;
          break;
        }

        // Transitorio (503/429/red): backoff acotado antes de rendirse con este paso.
        if (isLrclibStep(step)) this.breaker.recordTransient();
        if (retries >= maxRetries) {
          sawTransientOrSkipped = true;
          break;
        }
        const delay = outcome.retryAfterMs ?? backoffDelay(retries, this.random);
        retries += 1;
        await this.sleep(delay, signal);
      }
    }

    if (sawTransientOrSkipped) {
      return {
        status: 'temporarily_unavailable',
        data: EMPTY_LYRICS,
        attempts,
        message: 'El servicio de letras no responde ahora mismo. Se reintentará más tarde.',
      };
    }
    if (sawNotFound) {
      return {
        status: 'not_found',
        data: EMPTY_LYRICS,
        attempts,
        message: 'Sin letra disponible para esta canción.',
      };
    }
    if (sawError) {
      return {
        status: 'error',
        data: EMPTY_LYRICS,
        attempts,
        message: 'No se pudo consultar el servicio de letras.',
      };
    }
    return { status: 'not_found', data: EMPTY_LYRICS, attempts };
  }
}

/** Instancia compartida por toda la aplicación. */
export const lyricsPipeline = new LyricsPipeline();

/** Pasos que ejecutaría el pipeline para estos metadatos (útil en tests y depuración). */
export function planLyricsQueries(input: MusicMetadataInput | NormalizedMusicMetadata): LyricsQueryStep[] {
  const meta = (input as NormalizedMusicMetadata).cacheKey !== undefined
    ? (input as NormalizedMusicMetadata)
    : normalizeMusicMetadata(input as MusicMetadataInput);
  return buildLyricsQueries(meta);
}
