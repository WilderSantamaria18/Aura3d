/**
 * Tests del fallback entre candidatos de YouTube.
 *
 * Escenarios exigidos: el primer vídeo funciona · falla el 1 y funciona el 2 · fallan el 1 y el 2
 * y funciona el 3 · fallan todos · timeout por intento · error del endpoint de búsqueda ·
 * cambio de canción durante un reintento · callback tardío del vídeo anterior.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  classifyYouTubeErrorCode,
  FAILURE_MESSAGES,
  reasonFromError,
  YouTubeFallbackSession,
  YouTubePlaybackError,
  YT_MAX_ATTEMPTS,
  type YouTubeCandidateLike,
  type YouTubeFallbackState,
} from '../services/youtubeFallback';
import {
  awaitYouTubePlayback,
  notifyYouTubeEvent,
  resetYouTubePlayerBridge,
} from '../services/youtubePlayerBridge';

const candidate = (id: string): YouTubeCandidateLike => ({
  id,
  title: `Canción ${id}`,
  artist: 'Artista',
  duration: 200,
  thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  type: 'video',
});

interface HarnessOptions {
  candidates: YouTubeCandidateLike[];
  play: (candidate: YouTubeCandidateLike, attempt: number) => Promise<void>;
  search?: () => Promise<YouTubeCandidateLike[]>;
  maxAttempts?: number;
}

function makeSession({ candidates, play, search, maxAttempts = YT_MAX_ATTEMPTS }: HarnessOptions) {
  const states: YouTubeFallbackState[] = [];
  const played: string[] = [];
  const searchCalls: string[][] = [];
  const sleeps: number[] = [];

  const session = new YouTubeFallbackSession({
    maxAttempts,
    attemptTimeoutMs: 50,
    retryDelayMs: 5,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
    onState: (state) => states.push(state),
    searchCandidates: async ({ excludedIds }) => {
      searchCalls.push(excludedIds);
      if (search) return search();
      return candidates;
    },
    playCandidate: async (item, context) => {
      played.push(item.id);
      await play(item, context.attempt);
    },
  });

  return { session, states, played, sleeps, searchCalls };
}

describe('taxonomía de errores del IFrame API', () => {
  it('clasifica 101/150 como no incrustable, 2/100 como no disponible y 5 como error del reproductor', () => {
    expect(classifyYouTubeErrorCode(101)).toBe('NOT_EMBEDDABLE');
    expect(classifyYouTubeErrorCode(150)).toBe('NOT_EMBEDDABLE');
    expect(classifyYouTubeErrorCode(2)).toBe('VIDEO_UNAVAILABLE');
    expect(classifyYouTubeErrorCode(100)).toBe('VIDEO_UNAVAILABLE');
    expect(classifyYouTubeErrorCode(5)).toBe('PLAYER_ERROR');
  });

  it('extrae la razón de un error tipado', () => {
    expect(reasonFromError(new YouTubePlaybackError('PLAYER_TIMEOUT'))).toBe('PLAYER_TIMEOUT');
    expect(reasonFromError(new Error('otra cosa'))).toBe('PLAYER_ERROR');
  });
});

describe('fallback de YouTube · candidatos', () => {
  it('1. el primer candidato funciona a la primera', async () => {
    const { session, played, states } = makeSession({
      candidates: [candidate('aaaaaaaaaaa')],
      play: async () => undefined,
    });

    const result = await session.run();

    expect(result.outcome).toBe('playing');
    expect(result.attempts).toBe(1);
    expect(played).toEqual(['aaaaaaaaaaa']);
    expect(states.map((state) => state.status)).toEqual(['searching', 'loading', 'playing']);
  });

  it('2. falla el vídeo 1 y funciona el vídeo 2', async () => {
    const { session, played, states } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb')],
      play: async (item) => {
        if (item.id === 'aaaaaaaaaaa') throw new YouTubePlaybackError('NOT_EMBEDDABLE');
      },
    });

    const result = await session.run();

    expect(result.outcome).toBe('playing');
    expect(result.candidate?.id).toBe('bbbbbbbbbbb');
    expect(played).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(result.excludedIds).toEqual(['aaaaaaaaaaa']);
    expect(states.some((state) => state.status === 'retrying')).toBe(true);
  });

  it('3. fallan los vídeos 1 y 2 y funciona el 3', async () => {
    const { session, played } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb'), candidate('ccccccccccc')],
      play: async (item) => {
        if (item.id !== 'ccccccccccc') throw new YouTubePlaybackError('VIDEO_UNAVAILABLE');
      },
    });

    const result = await session.run();

    expect(result.outcome).toBe('playing');
    expect(result.attempts).toBe(3);
    expect(result.candidate?.id).toBe('ccccccccccc');
    expect(played).toHaveLength(3);
  });

  it('4. todos fallan ⇒ unavailable con el límite de intentos respetado (sin bucle infinito)', async () => {
    const { session, played, states } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb'), candidate('ccccccccccc')],
      play: async (item) => {
        throw new YouTubePlaybackError(item.id === 'aaaaaaaaaaa' ? 'NOT_EMBEDDABLE' : 'VIDEO_UNAVAILABLE');
      },
    });

    const result = await session.run();

    expect(result.outcome).toBe('unavailable');
    expect(result.status).toBe('unavailable');
    expect(result.attempts).toBeLessThanOrEqual(YT_MAX_ATTEMPTS);
    // Se probaron los tres candidatos disponibles y ninguno se repitió
    expect(played).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    expect(new Set(played).size).toBe(played.length);
    // El motivo mostrado es el del último fallo, no un genérico
    expect(result.message).toBe(FAILURE_MESSAGES.VIDEO_UNAVAILABLE);
    expect(states[states.length - 1].status).toBe('unavailable');
  });

  it('5. el timeout de un intento avanza al siguiente candidato sin intervención del usuario', async () => {
    const { session, played, states } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb')],
      play: async (item) => {
        if (item.id === 'aaaaaaaaaaa') throw new YouTubePlaybackError('PLAYER_TIMEOUT');
      },
    });

    const result = await session.run();

    expect(result.outcome).toBe('playing');
    expect(result.candidate?.id).toBe('bbbbbbbbbbb');
    expect(played).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(states.find((state) => state.reason === 'PLAYER_TIMEOUT')).toBeDefined();
  });

  it('5b. nunca reintenta el mismo candidato (sin ping-pong entre dos vídeos rotos)', async () => {
    const { session, played } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb')],
      play: async () => {
        throw new YouTubePlaybackError('NOT_EMBEDDABLE');
      },
    });

    const result = await session.run();

    expect(played).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(new Set(played).size).toBe(played.length);
    expect(result.outcome).toBe('unavailable');
  });

  it('6. el error del endpoint de búsqueda no cuelga: termina en unavailable', async () => {
    const { session } = makeSession({
      candidates: [],
      play: async () => undefined,
      search: async () => {
        throw new Error('500 del endpoint');
      },
    });

    const result = await session.run();

    expect(result.outcome).toBe('unavailable');
    expect(result.reason).toBe('SEARCH_FAILED');
    expect(result.attempts).toBe(0);
  });

  it('6b. una búsqueda vacía termina en unavailable con NO_CANDIDATES', async () => {
    const { session } = makeSession({ candidates: [], play: async () => undefined, search: async () => [] });

    const result = await session.run();

    expect(result.outcome).toBe('unavailable');
    expect(result.reason).toBe('NO_CANDIDATES');
  });

  it('7. cambio de canción durante un reintento ⇒ se cancela sin seguir probando', async () => {
    let release: (() => void) | undefined;
    const { session, played } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb'), candidate('ccccccccccc')],
      play: async (item) => {
        if (item.id === 'aaaaaaaaaaa') throw new YouTubePlaybackError('NOT_EMBEDDABLE');
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    });

    const pending = session.run();
    // Se le da tiempo a fallar el primero y quedarse esperando el segundo
    await vi.waitFor(() => expect(played).toContain('bbbbbbbbbbb'));
    session.cancel();
    release?.();

    const result = await pending;

    expect(result.outcome).toBe('cancelled');
    expect(played).not.toContain('ccccccccccc');
  });

  it('8. un rechazo tardío del candidato anterior no afecta al intento en curso', async () => {
    const lateRejections: Array<(error: Error) => void> = [];
    const { session } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb')],
      play: async (item) => {
        if (item.id === 'aaaaaaaaaaa') {
          // Falla "tarde": la sesión ya está con el segundo candidato cuando rechaza
          return new Promise<void>((_resolve, reject) => {
            lateRejections.push(reject);
          });
        }
      },
    });

    const pending = session.run();
    await vi.waitFor(() => expect(lateRejections.length).toBe(1));
    // El timeout del intento (50 ms) rechaza el primero y la sesión pasa al segundo
    const result = await pending;

    expect(result.outcome).toBe('playing');
    expect(result.candidate?.id).toBe('bbbbbbbbbbb');
  });

  it('limita también el número de búsquedas, no sólo los intentos', async () => {
    let searches = 0;
    const { session } = makeSession({
      candidates: [],
      play: async () => undefined,
      search: async () => {
        searches += 1;
        return [];
      },
      maxAttempts: 3,
    });

    const result = await session.run();

    expect(result.outcome).toBe('unavailable');
    expect(searches).toBeLessThanOrEqual(2);
  });

  it('excluye candidatos que llegan ya vetados por sus ids', async () => {
    const { session, played } = makeSession({
      candidates: [candidate('aaaaaaaaaaa'), candidate('bbbbbbbbbbb')],
      play: async () => undefined,
    });
    session.exclude('aaaaaaaaaaa');

    const result = await session.run();

    expect(result.outcome).toBe('playing');
    expect(played).toEqual(['bbbbbbbbbbb']);
  });
});

describe('puente del reproductor · callbacks tardíos', () => {
  it('resuelve cuando llega «playing» del vídeo esperado', async () => {
    resetYouTubePlayerBridge();
    const pending = awaitYouTubePlayback('aaaaaaaaaaa', 1000);
    notifyYouTubeEvent({ type: 'playing', videoId: 'aaaaaaaaaaa' });
    await expect(pending).resolves.toBeUndefined();
  });

  it('ignora los eventos del vídeo anterior (no atribuye el fallo al vídeo actual)', async () => {
    resetYouTubePlayerBridge();
    const pending = awaitYouTubePlayback('bbbbbbbbbbb', 1000);
    notifyYouTubeEvent({ type: 'error', videoId: 'aaaaaaaaaaa', reason: 'NOT_EMBEDDABLE' });
    notifyYouTubeEvent({ type: 'ended', videoId: 'aaaaaaaaaaa' });
    notifyYouTubeEvent({ type: 'playing', videoId: 'bbbbbbbbbbb' });
    await expect(pending).resolves.toBeUndefined();
  });

  it('rechaza con la razón tipada cuando el error es del vídeo esperado', async () => {
    resetYouTubePlayerBridge();
    const pending = awaitYouTubePlayback('aaaaaaaaaaa', 1000);
    notifyYouTubeEvent({ type: 'error', videoId: 'aaaaaaaaaaa', reason: 'NOT_EMBEDDABLE', code: 150 });
    await expect(pending).rejects.toMatchObject({ reason: 'NOT_EMBEDDABLE', code: 150 });
  });

  it('se rinde con PLAYER_TIMEOUT si el vídeo nunca arranca', async () => {
    resetYouTubePlayerBridge();
    vi.useFakeTimers();
    const pending = awaitYouTubePlayback('aaaaaaaaaaa', 5000);
    vi.advanceTimersByTime(5001);
    await expect(pending).rejects.toMatchObject({ reason: 'PLAYER_TIMEOUT' });
    vi.useRealTimers();
  });

  it('se cancela con AbortSignal al cambiar de canción', async () => {
    resetYouTubePlayerBridge();
    const controller = new AbortController();
    const pending = awaitYouTubePlayback('aaaaaaaaaaa', 5000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('un evento posterior a la resolución no genera rechazos sin gestionar', async () => {
    resetYouTubePlayerBridge();
    const pending = awaitYouTubePlayback('aaaaaaaaaaa', 1000);
    notifyYouTubeEvent({ type: 'playing', videoId: 'aaaaaaaaaaa' });
    await pending;
    expect(() => notifyYouTubeEvent({ type: 'error', videoId: 'aaaaaaaaaaa', reason: 'PLAYER_ERROR' })).not.toThrow();
  });
});
