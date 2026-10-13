/**
 * Ejecución y clasificación de un paso del pipeline de letras.
 *
 * La clasificación es lo que permite tratar distinto un 404 (esa combinación no existe
 * → siguiente paso) de un 503/429 (proveedor saturado → backoff, no multiplicar consultas).
 */
import type { EnhancedLyricsData } from '../../types/lyrics';
import type { LyricsQueryStep } from '../../utils/musicMetadata';
import { parseEnhancedLRC, plainTextToLines } from './lyricsParsing';

export type LyricsOutcomeKind = 'ok' | 'not_found' | 'transient' | 'error';

export interface LyricsStepOutcome {
  kind: LyricsOutcomeKind;
  step: LyricsQueryStep;
  data?: EnhancedLyricsData;
  status?: number;
  retryAfterMs?: number;
}

export interface LyricsMatchHints {
  artist?: string;
  duration?: number;
  durationTrusted?: boolean;
}

export interface LyricsStepDeps {
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
  hints?: LyricsMatchHints;
  /** Presupuesto de la petición HTTP. Sin esto, un proveedor que acepta la conexión y no
   *  responde dejaría la búsqueda de letras en «cargando» para siempre. */
  timeoutMs?: number;
}

/** Tiempo máximo por petición HTTP de letras. */
export const LYRICS_REQUEST_TIMEOUT_MS = 8000;

const LRCLIB_STEP_IDS = new Set(['lrclib-exact', 'lrclib-simple', 'lrclib-search']);

export function isLrclibStep(step: LyricsQueryStep): boolean {
  return LRCLIB_STEP_IDS.has(step.id);
}

/** 404/400/422 = no existe · 429/5xx = transitorio · resto = error del proveedor. */
export function classifyStatus(status: number): LyricsOutcomeKind {
  if (status === 404 || status === 400 || status === 422) return 'not_found';
  if (status === 429) return 'transient';
  if (status >= 500) return 'transient';
  return 'error';
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 8000);
  return undefined;
}

interface LrclibRecord {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
  artistName?: string;
  trackName?: string;
}

function hasLyrics(record: LrclibRecord | undefined | null): boolean {
  return Boolean(record && (record.syncedLyrics || record.plainLyrics));
}

/** Elige el registro más plausible de `/api/search` sin inventar coincidencias. */
export function pickBestLrclibRecord(
  records: LrclibRecord[],
  hints: LyricsMatchHints = {}
): LrclibRecord | undefined {
  const usable = (records || []).filter((record) => hasLyrics(record));
  if (usable.length === 0) return undefined;

  const artistKey = (hints.artist || '').toLowerCase().trim();
  const duration = hints.durationTrusted ? hints.duration : undefined;

  const scored = usable.map((record) => {
    let score = 0;
    if (record.syncedLyrics) score += 30;
    if (duration && typeof record.duration === 'number') {
      const diff = Math.abs(record.duration - duration);
      if (diff <= 4) score += 40;
      else if (diff <= 12) score += 15;
      else score -= 10;
    }
    if (artistKey && record.artistName) {
      const recordArtist = record.artistName.toLowerCase();
      if (recordArtist === artistKey) score += 35;
      else if (recordArtist.includes(artistKey) || artistKey.includes(recordArtist)) score += 20;
    }
    return { record, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.record;
}

function toEnhanced(record: LrclibRecord): EnhancedLyricsData | undefined {
  if (record.syncedLyrics) {
    return { ...parseEnhancedLRC(record.syncedLyrics), source: 'api' };
  }
  if (record.plainLyrics) {
    return plainTextToLines(record.plainLyrics);
  }
  return undefined;
}

/** Ejecuta un paso y devuelve el resultado clasificado. Nunca lanza por errores de red. */
export async function executeLyricsStep(
  step: LyricsQueryStep,
  { fetchImpl, signal, hints = {}, timeoutMs = LYRICS_REQUEST_TIMEOUT_MS }: LyricsStepDeps
): Promise<LyricsStepOutcome> {
  // Cancelación propia: combina el abort del usuario con el presupuesto de la petición.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort, { once: true });
  if (signal?.aborted) onCallerAbort();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(step.url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    // Si canceló el usuario, la cancelación sube; si fue el tiempo agotado o la red, se reintenta.
    if (signal?.aborted) throw error;
    return { kind: 'transient', step };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }

  if (!response.ok) {
    return {
      kind: classifyStatus(response.status),
      step,
      status: response.status,
      retryAfterMs: parseRetryAfter(response.headers?.get?.('Retry-After') ?? null),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { kind: 'error', step, status: response.status };
  }

  if (step.id === 'lyrics-ovh') {
    const lyrics = (payload as { lyrics?: string } | null)?.lyrics;
    if (!lyrics || !lyrics.trim()) return { kind: 'not_found', step, status: response.status };
    return { kind: 'ok', step, status: response.status, data: { ...plainTextToLines(lyrics), source: 'api' } };
  }

  if (Array.isArray(payload)) {
    const record = pickBestLrclibRecord(payload as LrclibRecord[], hints);
    if (!record) return { kind: 'not_found', step, status: response.status };
    const data = toEnhanced(record);
    return data
      ? { kind: 'ok', step, status: response.status, data }
      : { kind: 'not_found', step, status: response.status };
  }

  const record = payload as LrclibRecord | null;
  if (!hasLyrics(record)) return { kind: 'not_found', step, status: response.status };
  const data = toEnhanced(record!);
  return data
    ? { kind: 'ok', step, status: response.status, data }
    : { kind: 'not_found', step, status: response.status };
}
