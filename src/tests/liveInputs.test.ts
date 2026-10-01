import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// El módulo real del motor crea un <audio> al importarse (importOriginal): stub mínimo para node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).Audio = class {
    addEventListener() {}
  };
});

const engine = {
  enableSystemCapture: vi.fn(async () => {}),
  enableMicrophone: vi.fn(async () => {}),
  disableSystemCapture: vi.fn(),
  disableMicrophone: vi.fn(),
  isSystemCaptureActive: vi.fn(() => true),
};
vi.mock('../services/audioEngine', async (importOriginal) => {
  // El store necesita los demás exports reales (p. ej. DEFAULT_EQ_BANDS): solo se sustituye la instancia
  const actual = await importOriginal<typeof import('../services/audioEngine')>();
  return { ...actual, audioEngine: engine };
});

type FakeTrack = { label: string; enabled: boolean; onended: null | (() => void); stop: () => void };
const track = (label = ''): FakeTrack => ({ label, enabled: false, onended: null, stop: vi.fn() });

function fakeStream(audio: FakeTrack[], video: FakeTrack[] = []) {
  return {
    getAudioTracks: () => audio,
    getVideoTracks: () => video,
    getTracks: () => [...audio, ...video],
  } as unknown as MediaStream;
}

async function load() {
  const live = await import('../services/liveInputs');
  const { usePlayerStore } = await import('../stores/playerStore');
  return { live, store: usePlayerStore };
}

const g = globalThis as Record<string, unknown>;
const setDisplayMedia = (impl: (opts: unknown) => Promise<MediaStream>) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getDisplayMedia: vi.fn(impl) } },
  });
  return (globalThis.navigator.mediaDevices.getDisplayMedia as unknown) as ReturnType<typeof vi.fn>;
};

describe('liveInputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engine.isSystemCaptureActive.mockReturnValue(true);
    g.window = {};
  });
  afterEach(() => {
    delete g.window;
  });

  it('captura de sistema: pone la pista con el título de la pestaña y marca reproducción', async () => {
    const audio = track('audio');
    setDisplayMedia(async () => fakeStream([audio], [track('Daft Punk - One More Time - YouTube')]));
    const { live, store } = await load();

    const res = await live.startSystemCapture();

    expect(res).toEqual({ ok: true });
    expect(engine.enableSystemCapture).toHaveBeenCalledOnce();
    const s = store.getState();
    expect(s.currentTrack?.title).toBe('One More Time');
    expect(s.currentTrack?.artist).toBe('Daft Punk');
    expect(s.isPlaying).toBe(true);
  });

  it('captura de sistema: cancelar el diálogo no es error y no se reintenta', async () => {
    const getDisplayMedia = setDisplayMedia(async () => {
      throw new DOMException('cancel', 'NotAllowedError');
    });
    const { live } = await load();

    const res = await live.startSystemCapture();

    expect(res).toEqual({ ok: false, cancelled: true });
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(engine.enableSystemCapture).not.toHaveBeenCalled();
  });

  it('captura de sistema: sin pista de audio devuelve error y detiene el stream', async () => {
    const video = track('pantalla');
    setDisplayMedia(async () => fakeStream([], [video]));
    const { live } = await load();

    const res = await live.startSystemCapture();

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.cancelled === false && res.error).toMatch(/Compartir audio/);
    expect(video.stop).toHaveBeenCalled();
    expect(engine.enableSystemCapture).not.toHaveBeenCalled();
  });

  it('captura de sistema: si el usuario deja de compartir, se cierra y se pausa', async () => {
    const audio = track('audio');
    setDisplayMedia(async () => fakeStream([audio]));
    const { live, store } = await load();
    await live.startSystemCapture();

    audio.onended?.();

    expect(engine.disableSystemCapture).toHaveBeenCalledOnce();
    expect(store.getState().isPlaying).toBe(false);
  });

  it('captura de sistema: un onended tardío no cierra una fuente que ya cambió', async () => {
    const audio = track('audio');
    setDisplayMedia(async () => fakeStream([audio]));
    const { live } = await load();
    await live.startSystemCapture();
    engine.isSystemCaptureActive.mockReturnValue(false);

    audio.onended?.();

    expect(engine.disableSystemCapture).not.toHaveBeenCalled();
  });

  it('micrófono: activa el store y crea la pista; detener lo deja inactivo', async () => {
    const { live, store } = await load();

    expect(await live.startMicrophone()).toEqual({ ok: true });
    expect(store.getState().isMicActive).toBe(true);
    expect(store.getState().currentTrack?.sourceType).toBe('mic');

    live.stopMicrophone();
    expect(engine.disableMicrophone).toHaveBeenCalled();
    expect(store.getState().isMicActive).toBe(false);
    expect(store.getState().isPlaying).toBe(false);
  });

  it('micrófono: permiso denegado es cancelación; otro fallo devuelve el mensaje', async () => {
    const { live } = await load();

    engine.enableMicrophone.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    expect(await live.startMicrophone()).toEqual({ ok: false, cancelled: true });

    engine.enableMicrophone.mockRejectedValueOnce(new Error('sin dispositivo'));
    expect(await live.startMicrophone()).toEqual({ ok: false, cancelled: false, error: 'sin dispositivo' });
  });
});
