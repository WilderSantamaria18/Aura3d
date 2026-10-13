/**
 * Política de reintentos y protección contra rate limiting para los proveedores de letras.
 *
 * Reglas (diferenciación 404 / 503):
 *  - **404** → esa combinación no existe: se pasa al siguiente paso del pipeline, sin reintentos.
 *  - **503 / 429 / error de red** → es transitorio: reintento con backoff exponencial
 *    (1 s → 2 s → 4 s) y jitter, sin multiplicar consultas alternativas.
 *  - **Circuit breaker de LRCLIB**: tras varios fallos transitorios consecutivos se deja de
 *    llamar temporalmente (se sirve caché y se usa el proveedor secundario) y se reactiva solo.
 */

/** Backoff exponencial: 1 s → 2 s → 4 s. */
export const TRANSIENT_BACKOFF_MS = [1000, 2000, 4000] as const;

/** Reintentos máximos de un paso transitorio (1 intento + 2 reintentos). */
export const MAX_TRANSIENT_RETRIES = 2;

/** El proveedor secundario es ya un respaldo: como mucho un reintento adicional. */
export const SECONDARY_MAX_TRANSIENT_RETRIES = 1;

/** ±30 % de jitter para no sincronizar reintentos entre pestañas. */
export const JITTER_RATIO = 0.3;

/** Fallos transitorios consecutivos que abren el circuito. */
export const LRCLIB_FAILURE_THRESHOLD = 3;

/** Tiempo que LRCLIB queda suspendido antes de reintentarse. */
export const LRCLIB_COOLDOWN_MS = 60_000;

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = TRANSIENT_BACKOFF_MS[Math.min(Math.max(attempt, 0), TRANSIENT_BACKOFF_MS.length - 1)];
  const jitter = base * JITTER_RATIO * (random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}

export class AbortError extends DOMException {
  constructor(message = 'Consulta cancelada') {
    super(message, 'AbortError');
  }
}

/** Espera cancelable: el abort interrumpe el backoff en lugar de dejarlo correr. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new AbortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface CircuitBreakerSnapshot {
  failures: number;
  open: boolean;
  openedUntil: number;
}

/** Circuit breaker con ventana de enfriamiento y reactivación automática. */
export class CircuitBreaker {
  private failures = 0;
  private openedUntil = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(
    threshold: number = LRCLIB_FAILURE_THRESHOLD,
    cooldownMs: number = LRCLIB_COOLDOWN_MS,
    now: () => number = () => Date.now()
  ) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.now = now;
  }

  isOpen(): boolean {
    if (this.openedUntil === 0) return false;
    if (this.now() >= this.openedUntil) {
      // Se cumplió el enfriamiento: se reactiva y se empieza de cero.
      this.openedUntil = 0;
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedUntil = 0;
  }

  recordTransient(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openedUntil = this.now() + this.cooldownMs;
    }
  }

  /** Foto del estado sin efectos secundarios (no reactiva el circuito). */
  snapshot(): CircuitBreakerSnapshot {
    const open = this.openedUntil !== 0 && this.now() < this.openedUntil;
    return { failures: this.failures, open, openedUntil: this.openedUntil };
  }

  reset(): void {
    this.failures = 0;
    this.openedUntil = 0;
  }
}
