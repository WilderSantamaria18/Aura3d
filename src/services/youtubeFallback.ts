/**
 * Máquina de estados del fallback entre candidatos de YouTube.
 *
 * Puro y sin DOM: recibe por inyección cómo buscar candidatos y cómo intentar reproducir
 * uno. Así el comportamiento crítico (límite de intentos, timeout por intento, exclusiones
 * acumuladas, callbacks tardíos) se prueba sin iframe ni red.
 *
 * Reglas:
 *  - Presupuesto de intentos acotado (5 por defecto): **nunca** hay bucle infinito.
 *  - Un candidato que falla queda excluido para el resto de la sesión (no hay ping-pong).
 *  - Timeout por intento (`PLAYER_TIMEOUT`) y taxonomía de errores del IFrame API
 *    (101/150 = no incrustable, 2/100 = no disponible, 5 = error del reproductor).
 */

export type YouTubePlaybackStatus =
  | 'idle'
  | 'searching'
  | 'loading'
  | 'playing'
  | 'retrying'
  | 'unavailable'
  | 'error';

export type YouTubeFailureReason =
  | 'PLAYER_TIMEOUT'
  | 'PLAYER_NOT_READY'
  | 'NOT_EMBEDDABLE'
  | 'VIDEO_UNAVAILABLE'
  | 'PLAYER_ERROR'
  | 'SEARCH_FAILED'
  | 'NO_CANDIDATES';

export const YT_MAX_ATTEMPTS = 5;
export const YT_ATTEMPT_TIMEOUT_MS = 8000;
export const YT_RETRY_DELAY_MS = 400;
export const YT_MAX_SEARCHES = 2;

export const FAILURE_MESSAGES: Record<YouTubeFailureReason, string> = {
  PLAYER_TIMEOUT: 'YouTube no respondió a tiempo con este vídeo.',
  PLAYER_NOT_READY: 'El reproductor de YouTube no llegó a inicializarse.',
  NOT_EMBEDDABLE: 'El vídeo no permite reproducción incrustada.',
  VIDEO_UNAVAILABLE: 'El vídeo no está disponible (eliminado, privado o restringido).',
  PLAYER_ERROR: 'El reproductor de YouTube devolvió un error.',
  SEARCH_FAILED: 'No se pudo buscar en YouTube.',
  NO_CANDIDATES: 'No se encontró ninguna versión reproducible en YouTube.',
};

/** Códigos del IFrame API de YouTube. */
export function classifyYouTubeErrorCode(code: number): YouTubeFailureReason {
  switch (code) {
    case 101:
    case 150:
      return 'NOT_EMBEDDABLE';
    case 2:
    case 100:
      return 'VIDEO_UNAVAILABLE';
    case 5:
    default:
      return 'PLAYER_ERROR';
  }
}

export class YouTubePlaybackError extends Error {
  readonly reason: YouTubeFailureReason;
  readonly videoId?: string;
  readonly code?: number;

  constructor(
    reason: YouTubeFailureReason,
    message?: string,
    options: { videoId?: string; code?: number } = {}
  ) {
    super(message || FAILURE_MESSAGES[reason]);
    this.name = 'YouTubePlaybackError';
    this.reason = reason;
    this.videoId = options.videoId;
    this.code = options.code;
  }
}

export function reasonFromError(error: unknown): YouTubeFailureReason {
  if (error instanceof YouTubePlaybackError) return error.reason;
  if (error instanceof DOMException && error.name === 'AbortError') return 'PLAYER_TIMEOUT';
  return 'PLAYER_ERROR';
}

export function isAbortLike(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export interface YouTubeCandidateLike {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  thumbnail?: string;
  type?: 'video' | 'playlist';
}

export interface YouTubeFallbackState {
  status: YouTubePlaybackStatus;
  attempt: number;
  maxAttempts: number;
  candidate?: YouTubeCandidateLike;
  reason?: YouTubeFailureReason;
  message?: string;
  excludedIds: string[];
}

export interface YouTubeFallbackSearchContext {
  attempt: number;
  excludedIds: string[];
  signal: AbortSignal;
}

export interface YouTubeFallbackPlayContext {
  attempt: number;
  signal: AbortSignal;
  /** Presupuesto de este intento (el timeout del vídeo se reparte dentro). */
  timeoutMs: number;
}

export interface YouTubeFallbackDeps {
  searchCandidates: (context: YouTubeFallbackSearchContext) => Promise<YouTubeCandidateLike[]>;
  playCandidate: (candidate: YouTubeCandidateLike, context: YouTubeFallbackPlayContext) => Promise<void>;
  onState?: (state: YouTubeFallbackState) => void;
  maxAttempts?: number;
  attemptTimeoutMs?: number;
  retryDelayMs?: number;
  maxSearches?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export type YouTubeFallbackOutcome = 'playing' | 'unavailable' | 'cancelled';

export interface YouTubeFallbackResult {
  outcome: YouTubeFallbackOutcome;
  status: YouTubePlaybackStatus;
  candidate?: YouTubeCandidateLike;
  attempts: number;
  excludedIds: string[];
  reason?: YouTubeFailureReason;
  message: string;
}

const defaultSleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('cancelado', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('cancelado', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export class YouTubeFallbackSession {
  private readonly deps: YouTubeFallbackDeps;
  private readonly maxAttempts: number;
  private readonly attemptTimeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly maxSearches: number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;

  private readonly controller = new AbortController();
  private readonly excluded = new Set<string>();
  private pool: YouTubeCandidateLike[] = [];
  private searches = 0;
  private attempts = 0;
  private current: YouTubeCandidateLike | undefined;
  private status: YouTubePlaybackStatus = 'idle';
  private lastReason: YouTubeFailureReason | undefined;

  constructor(deps: YouTubeFallbackDeps) {
    this.deps = deps;
    this.maxAttempts = deps.maxAttempts ?? YT_MAX_ATTEMPTS;
    this.attemptTimeoutMs = deps.attemptTimeoutMs ?? YT_ATTEMPT_TIMEOUT_MS;
    this.retryDelayMs = deps.retryDelayMs ?? YT_RETRY_DELAY_MS;
    this.maxSearches = deps.maxSearches ?? YT_MAX_SEARCHES;
    this.sleep = deps.sleep ?? defaultSleep;
    this.excluded = new Set();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get currentStatus(): YouTubePlaybackStatus {
    return this.status;
  }

  get attempted(): number {
    return this.attempts;
  }

  get excludedIds(): string[] {
    return [...this.excluded];
  }

  get candidate(): YouTubeCandidateLike | undefined {
    return this.current;
  }

  private emit(status: YouTubePlaybackStatus, extra: Partial<YouTubeFallbackState> = {}): void {
    this.status = status;
    this.deps.onState?.({
      status,
      attempt: this.attempts,
      maxAttempts: this.maxAttempts,
      candidate: this.current,
      excludedIds: this.excludedIds,
      ...extra,
    });
  }

  /** Excluye un candidato por id y lo saca del grupo disponible. */
  exclude(videoId: string): void {
    const clean = videoId.replace(/^yt_/, '');
    if (!clean) return;
    this.excluded.add(clean);
  }

  private pickNext(): YouTubeCandidateLike | undefined {
    const candidate = this.pool.find(
      (item) =>
        item &&
        item.id &&
        item.type !== 'playlist' &&
        !this.excluded.has(item.id.replace(/^yt_/, ''))
    );
    return candidate;
  }

  cancel(): void {
    this.controller.abort();
    this.status = 'idle';
  }

  async run(): Promise<YouTubeFallbackResult> {
    this.attempts = 0;
    this.emit('searching');

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      if (this.controller.signal.aborted) {
        return this.result('cancelled', 'Búsqueda cancelada.', undefined);
      }

      let candidate = this.pickNext();
      if (!candidate && this.searches < this.maxSearches) {
        this.searches += 1;
        try {
          const found = await this.deps.searchCandidates({
            attempt,
            excludedIds: this.excludedIds,
            signal: this.controller.signal,
          });
          this.pool = [...(found || []), ...this.pool];
        } catch (error) {
          if (isAbortLike(error) || this.controller.signal.aborted) {
            return this.result('cancelled', 'Búsqueda cancelada.', undefined);
          }
          this.emit('unavailable', {
            reason: 'SEARCH_FAILED',
            message: FAILURE_MESSAGES.SEARCH_FAILED,
          });
          return this.result('unavailable', FAILURE_MESSAGES.SEARCH_FAILED, 'SEARCH_FAILED');
        }
        candidate = this.pickNext();
      }

      if (!candidate) {
        // Se agotaron los candidatos: si ya hubo fallos, el motivo del último es más útil
        // que un genérico «no hay candidatos».
        const reason = this.lastReason ?? 'NO_CANDIDATES';
        const message = FAILURE_MESSAGES[reason];
        this.emit('unavailable', { reason, message });
        return this.result('unavailable', message, reason);
      }

      this.attempts = attempt;
      this.current = candidate;
      this.emit(attempt === 1 ? 'loading' : 'retrying', {
        candidate,
        message: attempt === 1
          ? `Conectando con YouTube: ${candidate.title}`
          : `Reintentando (${attempt}/${this.maxAttempts}): ${candidate.title}`,
      });

      try {
        await this.attemptWithTimeout(candidate, attempt);
        if (this.controller.signal.aborted) {
          return this.result('cancelled', 'Intento cancelado.', undefined);
        }
        this.emit('playing', { candidate, message: `Reproduciendo: ${candidate.title}` });
        return this.result('playing', `Reproduciendo: ${candidate.title}`, undefined, candidate);
      } catch (error) {
        if (isAbortLike(error) || this.controller.signal.aborted) {
          return this.result('cancelled', 'Intento cancelado.', undefined);
        }
        const reason = reasonFromError(error);
        this.lastReason = reason;
        this.exclude(candidate.id);
        const message = error instanceof Error && error.message ? error.message : FAILURE_MESSAGES[reason];
        if (attempt >= this.maxAttempts) {
          this.emit('unavailable', { reason, message: FAILURE_MESSAGES[reason] });
          return this.result('unavailable', FAILURE_MESSAGES[reason], reason);
        }
        this.emit('retrying', { reason, message });
        try {
          await this.sleep(this.retryDelayMs, this.controller.signal);
        } catch {
          return this.result('cancelled', 'Intento cancelado.', undefined);
        }
      }
    }

    const reason = this.lastReason ?? 'NO_CANDIDATES';
    this.emit('unavailable', { reason, message: FAILURE_MESSAGES[reason] });
    return this.result('unavailable', FAILURE_MESSAGES[reason], reason);
  }

  /**
   * Presupuesto de un intento. `playCandidate` ya aplica su propio timeout interno, pero
   * la sesión no delega en él: así una implementación que se quede colgada tampoco puede
   * dejar el reproductor en «cargando» para siempre, y el temporizador siempre se limpia.
   */
  private async attemptWithTimeout(candidate: YouTubeCandidateLike, attempt: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new YouTubePlaybackError('PLAYER_TIMEOUT', undefined, { videoId: candidate.id }));
      }, this.attemptTimeoutMs);
    });
    try {
      await Promise.race([
        this.deps.playCandidate(candidate, {
          attempt,
          signal: this.controller.signal,
          timeoutMs: this.attemptTimeoutMs,
        }),
        timeout,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private result(
    outcome: YouTubeFallbackOutcome,
    message: string,
    reason?: YouTubeFailureReason,
    candidate?: YouTubeCandidateLike
  ): YouTubeFallbackResult {
    return {
      outcome,
      status: this.status,
      candidate: candidate ?? this.current,
      attempts: this.attempts,
      excludedIds: this.excludedIds,
      reason,
      message,
    };
  }
}
