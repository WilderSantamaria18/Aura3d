import { describe, it, expect, vi, afterEach } from 'vitest';
import { StreamStartTimeoutError, fetchYouTubeInfo, startWithTimeout } from '../services/youtubeLoad';

afterEach(() => {
  vi.useRealTimers();
});

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

describe('fetchYouTubeInfo', () => {
  it('devuelve los metadatos del servidor', async () => {
    const fetchFn = vi.fn(async () => json({ title: 'T', artist: 'A', duration: 19 }));
    expect(await fetchYouTubeInfo('abc', 1000, fetchFn as unknown as typeof fetch)).toEqual({ title: 'T', artist: 'A', duration: 19 });
    expect(fetchFn).toHaveBeenCalledWith('/api/youtube/info?v=abc', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('escapa el id del vídeo en la URL', async () => {
    const fetchFn = vi.fn(async () => json({}));
    await fetchYouTubeInfo('a&b=c', 1000, fetchFn as unknown as typeof fetch);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/youtube/info?v=a%26b%3Dc');
  });

  it('devuelve null si el servidor responde con error, con red caída o con una respuesta inválida', async () => {
    expect(await fetchYouTubeInfo('x', 1000, (async () => json({}, false)) as unknown as typeof fetch)).toBeNull();
    expect(await fetchYouTubeInfo('x', 1000, (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch)).toBeNull();
    expect(await fetchYouTubeInfo('x', 1000, (async () => ({ ok: true, json: async () => { throw new SyntaxError('json'); } })) as unknown as typeof fetch)).toBeNull();
  });

  it('se rinde pasado el tiempo máximo en vez de esperar sin límite', async () => {
    vi.useFakeTimers();
    // Un servidor que nunca responde: solo termina cuando se aborta la petición
    const hanging = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('abortado', 'AbortError')));
      });
    const pending = fetchYouTubeInfo('x', 6000, hanging as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(6001);
    expect(await pending).toBeNull();
  });
});

describe('startWithTimeout', () => {
  it('resuelve si el arranque termina a tiempo y no llama a onTimeout', async () => {
    const onTimeout = vi.fn();
    await expect(startWithTimeout(async () => undefined, 1000, onTimeout)).resolves.toBeUndefined();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('propaga el error del propio arranque sin confundirlo con un tiempo agotado', async () => {
    const onTimeout = vi.fn();
    await expect(
      startWithTimeout(async () => { throw new DOMException('no soportado', 'NotSupportedError'); }, 1000, onTimeout)
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('si no empieza a tiempo cancela la carga pendiente y lanza StreamStartTimeoutError', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const never = () => new Promise<void>(() => undefined);
    const pending = startWithTimeout(never, 8000, onTimeout);
    const assertion = expect(pending).rejects.toBeInstanceOf(StreamStartTimeoutError);
    await vi.advanceTimersByTimeAsync(8001);
    await assertion;
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('un rechazo tardío del arranque, después del tiempo agotado, no queda sin gestionar', async () => {
    vi.useFakeTimers();
    let rejectLate: (e: Error) => void = () => undefined;
    const late = () => new Promise<void>((_r, reject) => { rejectLate = reject; });
    const pending = startWithTimeout(late, 100);
    const assertion = expect(pending).rejects.toBeInstanceOf(StreamStartTimeoutError);
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    rejectLate(new Error('llegó tarde')); // no debe provocar un "unhandled rejection" que rompa la ejecución
    await vi.advanceTimersByTimeAsync(10);
  });

  it('arranca exactamente una vez (no relanza la carga al agotarse el tiempo)', async () => {
    vi.useFakeTimers();
    const start = vi.fn(() => new Promise<void>(() => undefined));
    const pending = startWithTimeout(start, 50);
    const assertion = expect(pending).rejects.toBeInstanceOf(StreamStartTimeoutError);
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
    expect(start).toHaveBeenCalledTimes(1);
  });
});
