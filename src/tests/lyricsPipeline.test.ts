/**
 * Tests del pipeline de letras.
 *
 * Cubren los escenarios exigidos: resultado exacto, 404 → search, 503 con backoff limitado,
 * fallback secundario, todos los proveedores sin resultados, cambio rápido de canción,
 * cancelación con AbortController, cache hit/miss y normalización de metadatos.
 */
import { describe, it, expect, vi } from 'vitest';
import { LyricsPipeline } from '../services/lyrics/lyricsPipeline';
import { CircuitBreaker, LRCLIB_FAILURE_THRESHOLD } from '../services/lyrics/lyricsPolicy';
import { normalizeMusicMetadata } from '../utils/musicMetadata';

const SYNCED = '[00:10.00] Primera línea\n[00:14.50] Segunda línea';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

interface FakeFetchOptions {
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>;
}

function makeFetch({ handler }: FakeFetchOptions) {
  const calls: string[] = [];
  const impl = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function makePipeline(options: {
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>;
  now?: () => number;
}) {
  const { impl, calls } = makeFetch({ handler: options.handler });
  const sleeps: number[] = [];
  const pipeline = new LyricsPipeline({
    fetchImpl: impl,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
    random: () => 0.5, // sin jitter: los retardos son exactos y comprobables
    now: options.now ?? (() => 1_000),
  });
  return { pipeline, calls, sleeps };
}

const calla = { title: 'Callaíta', artist: 'Bad Bunny' };

describe('pipeline de letras · camino feliz', () => {
  it('1. resuelve con la coincidencia exacta en una sola petición', async () => {
    const { pipeline, calls } = makePipeline({
      handler: (url) => (url.includes('/api/get') ? jsonResponse({ syncedLyrics: SYNCED }) : jsonResponse([])),
    });

    const result = await pipeline.lookup({ ...calla, album: 'Un Verano Sin Ti', duration: 197 });

    expect(result.status).toBe('loaded');
    expect(result.provider).toBe('lrclib-exact');
    expect(result.attempts).toBe(1);
    expect(result.data.lines).toHaveLength(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('album_name=Un+Verano+Sin+Ti');
  });

  it('2. la coincidencia exacta da 404 y el pipeline continúa con la búsqueda', async () => {
    const { pipeline, calls } = makePipeline({
      handler: (url) => {
        if (url.includes('/api/get') && url.includes('album_name')) return jsonResponse({}, 404);
        if (url.includes('/api/get')) return jsonResponse({}, 404);
        return jsonResponse([{ syncedLyrics: SYNCED, duration: 197, artistName: 'Bad Bunny' }]);
      },
    });

    const result = await pipeline.lookup({ ...calla, album: 'Un Verano Sin Ti', duration: 197 });

    expect(result.status).toBe('loaded');
    expect(result.provider).toBe('lrclib-search');
    // exacta (404) → simplificada (404) → search (ok): tres peticiones, ninguna repetida
    expect(calls).toHaveLength(3);
  });
});

describe('pipeline de letras · 503 vs 404', () => {
  it('3. un 503 reintenta con backoff 1 s → 2 s y luego usa el proveedor secundario', async () => {
    const { pipeline, calls, sleeps } = makePipeline({
      handler: (url) => {
        if (url.includes('lrclib.net')) return jsonResponse({ error: 'unavailable' }, 503);
        return jsonResponse({ lyrics: 'Letra de respaldo' });
      },
    });

    const result = await pipeline.lookup(calla);

    expect(result.status).toBe('loaded');
    expect(result.provider).toBe('lyrics-ovh');
    expect(sleeps).toEqual([1000, 2000]); // 1 intento + 2 reintentos, con jitter desactivado
    const lrclibCalls = calls.filter((url) => url.includes('lrclib.net'));
    expect(lrclibCalls).toHaveLength(3); // el circuito se abre y deja de martillear LRCLIB
    expect(calls.filter((url) => url.includes('lyrics.ovh'))).toHaveLength(1);
  });

  it('4. el reintento está acotado: nunca hace decenas de peticiones', async () => {
    const { pipeline, calls } = makePipeline({
      handler: () => jsonResponse({ error: 'unavailable' }, 503),
    });

    const result = await pipeline.lookup({ ...calla, album: 'X', duration: 197 });

    expect(result.status).toBe('temporarily_unavailable');
    // LRCLIB recibe como mucho el umbral que abre el circuito, y el secundario 1 reintento.
    expect(calls.filter((url) => url.includes('lrclib.net'))).toHaveLength(LRCLIB_FAILURE_THRESHOLD);
    expect(calls.length).toBeLessThanOrEqual(5);
    expect(pipeline.circuit.isOpen()).toBe(true);
  });

  it('4b. un 503 transitorio que se recupera resuelve sin llegar al secundario', async () => {
    let attempt = 0;
    const { pipeline, sleeps } = makePipeline({
      handler: () => {
        attempt += 1;
        if (attempt === 1) return jsonResponse({ error: 'busy' }, 503);
        return jsonResponse({ syncedLyrics: SYNCED });
      },
    });

    const result = await pipeline.lookup(calla);

    expect(result.status).toBe('loaded');
    expect(result.attempts).toBe(2);
    expect(sleeps).toEqual([1000]);
  });

  it('5. respeta Retry-After cuando el proveedor lo indica', async () => {
    let attempt = 0;
    const { pipeline, sleeps } = makePipeline({
      handler: () => {
        attempt += 1;
        if (attempt === 1) return jsonResponse({ error: 'busy' }, 429, { 'Retry-After': '3' });
        return jsonResponse({ syncedLyrics: SYNCED });
      },
    });

    const result = await pipeline.lookup(calla);

    expect(result.status).toBe('loaded');
    expect(sleeps).toEqual([3000]);
  });

  it('6. todos los proveedores sin resultados ⇒ not_found (404, no 503)', async () => {
    const { pipeline } = makePipeline({ handler: () => jsonResponse({}, 404) });

    const result = await pipeline.lookup({ ...calla, album: 'X', duration: 197 });

    expect(result.status).toBe('not_found');
    expect(result.data.lines).toHaveLength(0);
  });

  it('no cachea el 503 como si la letra no existiera', async () => {
    let phase: 'transient' | 'ok' = 'transient';
    const { pipeline, calls } = makePipeline({
      handler: () => {
        if (phase === 'transient') return jsonResponse({ error: 'busy' }, 503);
        return jsonResponse({ syncedLyrics: SYNCED });
      },
    });

    const first = await pipeline.lookup(calla);
    expect(first.status).toBe('temporarily_unavailable');

    // Se recupera el proveedor y se cumple el enfriamiento del circuito
    phase = 'ok';
    pipeline.circuit.reset();
    const second = await pipeline.lookup(calla);

    expect(second.status).toBe('loaded');
    expect(calls.length).toBeGreaterThan(1);
  });
});

describe('pipeline de letras · caché', () => {
  it('9. cache hit: la misma canción no vuelve a consultar', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({ syncedLyrics: SYNCED }) });

    const first = await pipeline.lookup(calla);
    const second = await pipeline.lookup({ title: 'callaíta', artist: 'BAD BUNNY' });

    expect(first.status).toBe('loaded');
    expect(second.status).toBe('loaded');
    expect(second.fromCache).toBe('memory');
    expect(second.attempts).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('10. cache miss: títulos distintos sí consultan', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({ syncedLyrics: SYNCED }) });

    await pipeline.lookup(calla);
    await pipeline.lookup({ title: 'Otra canción', artist: 'Bad Bunny' });

    expect(calls).toHaveLength(2);
  });

  it('cachea el negativo para no repetir un 404 inmediatamente', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({}, 404) });

    await pipeline.lookup(calla);
    const second = await pipeline.lookup(calla);

    expect(second.status).toBe('not_found');
    expect(second.fromCache).toBe('negative');
    expect(calls).toHaveLength(3); // sólo las 3 del primer pipeline (simple, search, ovh)
  });

  it('el negativo caduca y vuelve a consultar', async () => {
    let now = 1_000;
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({}, 404), now: () => now });

    await pipeline.lookup(calla);
    now += 11 * 60 * 1000;
    await pipeline.lookup(calla);

    expect(calls).toHaveLength(6);
  });

  it('deduplica consultas simultáneas de la misma canción', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({ syncedLyrics: SYNCED }) });

    const [a, b] = await Promise.all([pipeline.lookup(calla), pipeline.lookup(calla)]);

    expect(a.status).toBe('loaded');
    expect(b.status).toBe('loaded');
    expect(calls).toHaveLength(1);
  });
});

describe('pipeline de letras · cancelación', () => {
  it('8. abortar cancela la petición en curso y no cachea nada', async () => {
    const controller = new AbortController();
    let aborted = false;
    const { impl } = makeFetch({
      handler: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('abortado', 'AbortError'));
          });
        }),
    });
    const pipeline = new LyricsPipeline({
      fetchImpl: impl,
      sleep: async () => undefined,
      random: () => 0.5,
      now: () => 1_000,
    });

    const pending = pipeline.lookup(calla, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(aborted).toBe(true);
    expect(pipeline.stats().positives).toBe(0);
    expect(pipeline.stats().negatives).toBe(0);
  });

  it('7. cambio rápido de canción: la respuesta antigua no sobrescribe la nueva', async () => {
    const resolvers: Array<(value: Response) => void> = [];
    const { impl } = makeFetch({
      handler: () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        }),
    });
    const pipeline = new LyricsPipeline({
      fetchImpl: impl,
      sleep: async () => undefined,
      random: () => 0.5,
      now: () => 1_000,
    });

    const controllerA = new AbortController();
    const pendingA = pipeline.lookup(calla, { signal: controllerA.signal });
    controllerA.abort(); // el usuario cambia de canción
    const pendingB = pipeline.lookup({ title: 'Otra canción', artist: 'Otro Artista' });

    // La canción A termina tarde, después de haber sido cancelada
    resolvers[0]?.(jsonResponse({ syncedLyrics: '[00:01.00] A' }));
    resolvers[1]?.(jsonResponse({ syncedLyrics: '[00:01.00] B' }));

    await expect(pendingA).rejects.toMatchObject({ name: 'AbortError' });
    const resultB = await pendingB;

    expect(resultB.status).toBe('loaded');
    expect(resultB.data.lines[0]?.text).toBe('B');
    expect(pipeline.cached(normalizeMusicMetadata(calla))).toBeUndefined(); // A no ensució la caché
  });

  it('el circuito abierto no bloquea al proveedor secundario', async () => {
    const breaker = new CircuitBreaker(1, 60_000, () => 1_000);
    breaker.recordTransient(); // circuito abierto de inmediato
    const { pipeline, calls } = makePipeline({
      handler: (url) => (url.includes('lrclib.net') ? jsonResponse({ syncedLyrics: SYNCED }) : jsonResponse({ lyrics: 'x' })),
    });
    // Se inyecta el mismo reloj en el pipeline nuevo para que el breaker compartido funcione
    const shared = new LyricsPipeline({
      fetchImpl: (async (input: unknown, init?: RequestInit) => {
        calls.push(String(input));
        return String(input).includes('lrclib.net') ? jsonResponse({ syncedLyrics: SYNCED }) : jsonResponse({ lyrics: 'x' });
      }) as unknown as typeof fetch,
      sleep: async () => undefined,
      random: () => 0.5,
      now: () => 1_000,
      breaker,
    });

    const result = await shared.lookup(calla);

    expect(calls.filter((url) => url.includes('lrclib.net'))).toHaveLength(0);
    expect(result.status).toBe('loaded');
    expect(result.provider).toBe('lyrics-ovh');
    expect(pipeline).toBeDefined();
  });
});

describe('pipeline de letras · metadatos normalizados antes de consultar', () => {
  it('11. «Callaíta - 432 hertz» se consulta como «Callaíta»', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({}, 404) });

    await pipeline.lookup({ title: 'Callaíta - 432 hertz', artist: 'Guad4W' });

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((url) => !url.includes('432'))).toBe(true);
    expect(calls.every((url) => !url.toLowerCase().includes('guad4w'))).toBe(true);
    expect(decodeURIComponent(calls[0])).toContain('Callaíta');
  });

  it('12. «Official Video» no llega a la consulta', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({}, 404) });

    await pipeline.lookup({ title: 'MOJABI GHOST (Official Video)', artist: 'Bad Bunny' });

    expect(calls.every((url) => !/official/i.test(decodeURIComponent(url)))).toBe(true);
    expect(calls.every((url) => !/video/i.test(decodeURIComponent(url)))).toBe(true);
  });

  it('13. el uploader no se usa como artista', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({}, 404) });

    await pipeline.lookup({ title: 'Callaíta', artist: 'YouTube Stream', uploader: 'sweetblue.' });

    expect(calls.every((url) => !url.toLowerCase().includes('sweetblue'))).toBe(true);
    expect(calls.every((url) => !url.toLowerCase().includes('youtube'))).toBe(true);
  });

  it('las mezclas e instrumentales no consultan la red', async () => {
    const { pipeline, calls } = makePipeline({ handler: () => jsonResponse({ syncedLyrics: SYNCED }) });

    const result = await pipeline.lookup({ title: 'MOJABI GHOST (Slowed + Reverb)', artist: 'Bad Bunny' });

    expect(result.status).toBe('not_found');
    expect(calls).toHaveLength(0);
  });
  it('un proveedor que no responde nunca deja la búsqueda colgada (timeout por petición)', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const { impl } = makeFetch({
      handler: (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('abortado', 'AbortError'));
          });
        }),
    });
    const pipeline = new LyricsPipeline({
      fetchImpl: impl,
      sleep: async () => undefined,
      random: () => 0.5,
      now: () => 1_000,
      requestTimeoutMs: 4000,
    });

    const pending = pipeline.lookup(calla);
    // 4 proveedores × (1 intento + 2 reintentos de LRCLIB o 1 del secundario) con timeout
    await vi.advanceTimersByTimeAsync(600_000);
    const result = await pending;

    expect(aborted).toBe(true);
    expect(result.status).toBe('temporarily_unavailable');
    expect(result.attempts).toBeLessThan(10); // acotado, no una tormenta de peticiones
    vi.useRealTimers();
  });
});

describe('pipeline de letras · proveedor secundario', () => {
  it('usa lyrics.ovh cuando LRCLIB no tiene nada', async () => {
    const { pipeline } = makePipeline({
      handler: (url) => (url.includes('lyrics.ovh') ? jsonResponse({ lyrics: 'Verso 1\nVerso 2' }) : jsonResponse([], 200)),
    });

    const result = await pipeline.lookup(calla);

    expect(result.status).toBe('loaded');
    expect(result.provider).toBe('lyrics-ovh');
    expect(result.data.lines.map((line) => line.text)).toEqual(['Verso 1', 'Verso 2']);
    expect(result.data.synced).toBe(false);
  });

  it('un 200 sin letra se considera not_found, no transitorio', async () => {
    const { pipeline, sleeps } = makePipeline({
      handler: (url) => (url.includes('lyrics.ovh') ? jsonResponse({ lyrics: '' }) : jsonResponse({}, 404)),
    });

    const result = await pipeline.lookup(calla);

    expect(result.status).toBe('not_found');
    expect(sleeps).toHaveLength(0);
  });
});

describe('política de reintentos', () => {
  it('el backoff es exponencial con jitter acotado', async () => {
    const { backoffDelay } = await import('../services/lyrics/lyricsPolicy');
    expect(backoffDelay(0, () => 0.5)).toBe(1000);
    expect(backoffDelay(1, () => 0.5)).toBe(2000);
    expect(backoffDelay(2, () => 0.5)).toBe(4000);
    expect(backoffDelay(0, () => 1)).toBe(1300);
    expect(backoffDelay(0, () => 0)).toBe(700);
    expect(backoffDelay(9, () => 0.5)).toBe(4000); // tope
  });

  it('el circuit breaker se abre tras N fallos y se reactiva al cumplir el enfriamiento', () => {
    let now = 1_000;
    const breaker = new CircuitBreaker(3, 60_000, () => now);
    breaker.recordTransient();
    breaker.recordTransient();
    expect(breaker.isOpen()).toBe(false);
    breaker.recordTransient();
    expect(breaker.isOpen()).toBe(true);

    now += 59_000;
    expect(breaker.isOpen()).toBe(true);
    now += 2_000;
    expect(breaker.isOpen()).toBe(false);
    expect(breaker.snapshot().failures).toBe(0);
  });

  it('un éxito cierra el circuito', () => {
    const breaker = new CircuitBreaker(2, 60_000, () => 1_000);
    breaker.recordTransient();
    breaker.recordTransient();
    expect(breaker.isOpen()).toBe(true);
    breaker.recordSuccess();
    expect(breaker.isOpen()).toBe(false);
  });
});

describe('sleep cancelable', () => {
  it('rechaza al abortar durante el backoff', async () => {
    vi.useFakeTimers();
    const { sleep } = await import('../services/lyrics/lyricsPolicy');
    const controller = new AbortController();
    const pending = sleep(5000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    vi.useRealTimers();
  });
});
