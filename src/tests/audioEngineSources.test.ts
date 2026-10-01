import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Cambio de fuente de audio: mic ↔ sistema ↔ archivo local ↔ URL.
 * Se simulan Audio / AudioContext / mediaDevices porque el entorno de tests es node.
 */

const param = () => ({
  value: 0,
  setValueAtTime() {},
  setTargetAtTime() {},
  cancelScheduledValues() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
});

/** Nodo Web Audio falso: cualquier propiedad desconocida se comporta como un AudioParam */
function fakeNode(extra: Record<string, unknown> = {}) {
  const target: Record<string | symbol, unknown> = {
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
    ...extra,
  };
  return new Proxy(target, {
    get(t, k) {
      if (!(k in t)) t[k] = param();
      return t[k];
    },
  });
}

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = fakeNode();
  constructor() {
    return new Proxy(this, {
      get(t, k, r) {
        if (k in t) return Reflect.get(t, k, r);
        if (typeof k === 'string' && k.startsWith('create')) return () => fakeNode();
        return undefined;
      },
    });
  }
  handlers: Record<string, (() => void)[]> = {};
  resumeImpl: () => Promise<void> = () => Promise.resolve();
  resume = vi.fn(() => this.resumeImpl());
  addEventListener(type: string, cb: () => void) {
    (this.handlers[type] ??= []).push(cb);
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 10 });
  }
  createBufferSource() {
    return fakeNode({ buffer: null, onended: null });
  }
}

class FakeAudio extends EventTarget {
  static playImpl: () => Promise<void> = () => Promise.resolve();
  paused = true;
  error: { code: number; message: string } | null = null;
  currentTime = 0;
  duration = 0;
  volume = 1;
  playbackRate = 1;
  crossOrigin = '';
  preload = '';
  private _src = '';
  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
  }
  getAttribute(name: string) {
    return name === 'src' && this._src ? this._src : null;
  }
  removeAttribute(name: string) {
    if (name === 'src') this._src = '';
  }
  load() {}
  play() {
    this.paused = false;
    return FakeAudio.playImpl();
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

function fakeStream() {
  const tracks = [{ enabled: true, stopped: false, stop() { this.stopped = true; } }];
  return {
    tracks,
    stream: {
      getTracks: () => tracks,
      getAudioTracks: () => tracks,
      getVideoTracks: () => [],
    },
  };
}

async function freshEngine() {
  vi.resetModules();
  const { audioEngine } = await import('../services/audioEngine');
  const { usePlayerStore } = await import('../stores/playerStore');
  await audioEngine.init();
  return { audioEngine, usePlayerStore };
}

describe('audioEngine: cambio de fuente', () => {
  const g = globalThis as Record<string, unknown>;
  let mic: ReturnType<typeof fakeStream>;

  beforeEach(() => {
    mic = fakeStream();
    FakeAudio.playImpl = () => Promise.resolve();
    g.Audio = FakeAudio;
    g.AudioContext = FakeAudioContext;
    g.window = {
      AudioContext: FakeAudioContext,
      location: { href: 'http://localhost/' },
      addEventListener() {},
      removeEventListener() {},
    };
    g.requestAnimationFrame = () => 1;
    g.cancelAnimationFrame = () => {};
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia: () => Promise.resolve(mic.stream) } },
    });
  });

  afterEach(() => {
    delete g.Audio;
    delete g.AudioContext;
    delete g.window;
  });

  it('cargar un archivo local libera el micrófono y avisa al store', async () => {
    const { audioEngine, usePlayerStore } = await freshEngine();
    await audioEngine.enableMicrophone();
    usePlayerStore.setState({ isMicActive: true });
    const ended: string[] = [];
    audioEngine.onCaptureEnd((k) => ended.push(k));

    await audioEngine.loadArrayBuffer(new ArrayBuffer(8), 'a.mp3');

    expect(audioEngine.isMicrophoneActive()).toBe(false);
    expect(mic.tracks[0].stopped).toBe(true);
    expect(ended).toContain('mic');
    expect(usePlayerStore.getState().isMicActive).toBe(false);
    expect(audioEngine.isBufferMode()).toBe(true);
  });

  it('activar el micrófono libera el archivo local cargado', async () => {
    const { audioEngine } = await freshEngine();
    await audioEngine.loadArrayBuffer(new ArrayBuffer(8), 'a.mp3');
    expect(audioEngine.isBufferMode()).toBe(true);

    await audioEngine.enableMicrophone();

    expect(audioEngine.isBufferMode()).toBe(false);
    expect(audioEngine.isMicrophoneActive()).toBe(true);
  });

  it('micrófono y captura de sistema coexisten (modo "Mix" del estudio de grabación)', async () => {
    const { audioEngine } = await freshEngine();
    await audioEngine.enableMicrophone();
    const sys = fakeStream();

    await audioEngine.enableSystemCapture(sys.stream as unknown as MediaStream);
    expect(audioEngine.isMicrophoneActive()).toBe(true);
    expect(audioEngine.isSystemCaptureActive()).toBe(true);

    // Y al revés: activar el micrófono estando la captura activa no la cierra
    audioEngine.disableMicrophone();
    await audioEngine.enableMicrophone();
    expect(audioEngine.isSystemCaptureActive()).toBe(true);
    expect(sys.tracks[0].stopped).toBe(false);
  });

  it('una nueva captura de sistema sustituye a la anterior (sin dejar una huérfana)', async () => {
    const { audioEngine } = await freshEngine();
    const first = fakeStream();
    const second = fakeStream();

    await audioEngine.enableSystemCapture(first.stream as unknown as MediaStream);
    await audioEngine.enableSystemCapture(second.stream as unknown as MediaStream);

    expect(first.tracks[0].stopped).toBe(true);
    expect(second.tracks[0].stopped).toBe(false);
  });

  it('cargar un archivo o una URL sí libera el micrófono y la captura de sistema', async () => {
    const { audioEngine } = await freshEngine();
    const sys = fakeStream();
    await audioEngine.enableMicrophone();
    await audioEngine.enableSystemCapture(sys.stream as unknown as MediaStream);

    await audioEngine.loadTrack('http://x/a.mp3', true);

    expect(audioEngine.isMicrophoneActive()).toBe(false);
    expect(audioEngine.isSystemCaptureActive()).toBe(false);
    expect(sys.tracks[0].stopped).toBe(true);
  });

  it('si el permiso del micrófono se deniega, no se corta la fuente actual', async () => {
    const { audioEngine } = await freshEngine();
    await audioEngine.loadArrayBuffer(new ArrayBuffer(8), 'a.mp3');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: () => Promise.reject(new DOMException('no', 'NotAllowedError')),
        },
      },
    });

    await expect(audioEngine.enableMicrophone()).rejects.toThrow();
    expect(audioEngine.isBufferMode()).toBe(true);
  });

  it('releaseSources no apaga isPlaying por el pause() del <audio>', async () => {
    const { audioEngine } = await freshEngine();
    await audioEngine.loadTrack('http://x/a.mp3', true);
    const states: boolean[] = [];
    audioEngine.onStateChange((p) => states.push(p));

    audioEngine.releaseSources();

    expect(states).not.toContain(false);
    expect(audioEngine.getActiveAudioElement().getAttribute('src')).toBeNull();
  });

  it('una carga reemplazada por otra termina con AbortError', async () => {
    const { audioEngine } = await freshEngine();
    const first = audioEngine.loadTrack('http://x/1.mp3', true);
    const second = audioEngine.loadTrack('http://x/2.mp3', true);

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await expect(second).resolves.toBeUndefined();
    expect(audioEngine.getActiveAudioElement().src).toBe('http://x/2.mp3');
  });

  it('loadTrack propaga fuentes no soportadas pero ignora el autoplay bloqueado', async () => {
    const { audioEngine } = await freshEngine();

    FakeAudio.playImpl = () => Promise.reject(new DOMException('x', 'NotAllowedError'));
    await expect(audioEngine.loadTrack('http://x/a.mp3', true)).resolves.toBeUndefined();

    FakeAudio.playImpl = () => Promise.reject(new DOMException('x', 'NotSupportedError'));
    await expect(audioEngine.loadTrack('http://x/b.mp3', true)).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
  });

  const fakeFile = (size: number) =>
    ({ size, name: 'a.mp3', arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as File;

  it('loadFile: un archivo pequeño se decodifica en memoria', async () => {
    const { audioEngine } = await freshEngine();

    const dur = await audioEngine.loadFile(fakeFile(1024), 'blob:small');

    expect(dur).toBe(10);
    expect(audioEngine.isBufferMode()).toBe(true);
  });

  it('loadFile: un archivo grande se reproduce en streaming sin decodificar', async () => {
    const { audioEngine } = await freshEngine();
    const decode = vi.spyOn(FakeAudioContext.prototype, 'decodeAudioData');

    await audioEngine.loadFile(fakeFile(25 * 1024 * 1024), 'blob:big');

    expect(decode).not.toHaveBeenCalled();
    expect(audioEngine.isBufferMode()).toBe(false);
    expect(audioEngine.getActiveAudioElement().src).toBe('blob:big');
    decode.mockRestore();
  });

  it('loadFile: si la decodificación falla, cae a streaming', async () => {
    const { audioEngine } = await freshEngine();
    const decode = vi
      .spyOn(FakeAudioContext.prototype, 'decodeAudioData')
      .mockRejectedValueOnce(new Error('formato no soportado'));

    await audioEngine.loadFile(fakeFile(1024), 'blob:video');

    expect(audioEngine.isBufferMode()).toBe(false);
    expect(audioEngine.getActiveAudioElement().src).toBe('blob:video');
    decode.mockRestore();
  });

  it('dos crossfades seguidos terminan en el volumen del store, no en el del fundido', async () => {
    const { audioEngine, usePlayerStore } = await freshEngine();
    usePlayerStore.setState({ volume: 0.7, isMuted: false });
    const gain = (audioEngine as unknown as { masterGain: { gain: Record<string, unknown> } }).masterGain.gain;
    const ramp = vi.fn();
    gain.linearRampToValueAtTime = ramp;

    vi.useFakeTimers();
    try {
      const first = audioEngine.crossfade(2);
      const second = audioEngine.crossfade(2);
      await vi.advanceTimersByTimeAsync(3000);
      await Promise.all([first, second]);
    } finally {
      vi.useRealTimers();
    }

    const targets = ramp.mock.calls.map((c) => c[0]);
    expect(targets.filter((v) => v === 0.7)).toHaveLength(1); // solo el último fundido sube el volumen
    expect(targets.every((v) => v === 0.01 || v === 0.7)).toBe(true);
  });

  it('si el navegador suspende el contexto mientras suena, se reanuda solo', async () => {
    const { audioEngine, usePlayerStore } = await freshEngine();
    const ctx = audioEngine.audioContext as unknown as FakeAudioContext;
    usePlayerStore.setState({ isPlaying: true });
    ctx.resume.mockClear();

    ctx.state = 'suspended';
    ctx.handlers.statechange.forEach((cb) => cb());

    expect(ctx.resume).toHaveBeenCalledOnce();
  });

  it('en pausa no intenta reanudar el contexto', async () => {
    const { audioEngine, usePlayerStore } = await freshEngine();
    const ctx = audioEngine.audioContext as unknown as FakeAudioContext;
    usePlayerStore.setState({ isPlaying: false });
    ctx.resume.mockClear();

    ctx.state = 'suspended';
    ctx.handlers.statechange.forEach((cb) => cb());

    expect(ctx.resume).not.toHaveBeenCalled();
  });

  it('si resume() se rechaza por falta de gesto, reintenta en la siguiente interacción', async () => {
    const { audioEngine, usePlayerStore } = await freshEngine();
    const ctx = audioEngine.audioContext as unknown as FakeAudioContext;
    const added: string[] = [];
    (g.window as Record<string, unknown>).addEventListener = (type: string) => added.push(type);
    usePlayerStore.setState({ isPlaying: true });
    ctx.resumeImpl = () => Promise.reject(new DOMException('gesto', 'NotAllowedError'));

    ctx.state = 'suspended';
    ctx.handlers.statechange.forEach((cb) => cb());
    await Promise.resolve();
    await Promise.resolve();

    expect(added).toEqual(expect.arrayContaining(['pointerdown', 'keydown', 'touchstart']));
  });

  describe('reintento de streams', () => {
    const setup = async () => {
      const { audioEngine } = await freshEngine();
      await audioEngine.loadTrack('https://radio/stream', true);
      const audio = audioEngine.getActiveAudioElement() as unknown as FakeAudio;
      const errors: string[] = [];
      audioEngine.onError((m) => errors.push(m));
      const load = vi.spyOn(audio, 'load');
      return { audioEngine, audio, errors, load };
    };
    const fail = (audio: FakeAudio, code: number) => {
      audio.error = { code, message: '' };
      audio.dispatchEvent(new Event('error'));
    };

    it('un fallo de red se reintenta solo y avisa únicamente al agotar los reintentos', async () => {
      const { audio, errors, load } = await setup();
      vi.useFakeTimers();
      try {
        fail(audio, 2);
        expect(errors).toHaveLength(0);
        await vi.advanceTimersByTimeAsync(1500);
        expect(load).toHaveBeenCalledTimes(1);

        fail(audio, 2);
        await vi.advanceTimersByTimeAsync(4000);
        expect(load).toHaveBeenCalledTimes(2);
        expect(errors).toHaveLength(0);

        fail(audio, 2); // reintentos agotados
        expect(errors).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('un error que no es de red (formato no soportado) avisa de inmediato', async () => {
      const { audio, errors, load } = await setup();
      fail(audio, 4);
      expect(errors).toHaveLength(1);
      expect(load).not.toHaveBeenCalled();
    });

    it('si la reproducción se recupera, el contador de reintentos se reinicia', async () => {
      const { audio, errors, load } = await setup();
      vi.useFakeTimers();
      try {
        fail(audio, 2);
        await vi.advanceTimersByTimeAsync(1500);
        fail(audio, 2);
        await vi.advanceTimersByTimeAsync(4000);
        audio.dispatchEvent(new Event('playing')); // se recuperó

        fail(audio, 2); // vuelve a tener reintentos disponibles
        expect(errors).toHaveLength(0);
        await vi.advanceTimersByTimeAsync(1500);
        expect(load).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });

    it('pausar cancela el reintento pendiente', async () => {
      const { audioEngine, audio, load } = await setup();
      vi.useFakeTimers();
      try {
        fail(audio, 2);
        audioEngine.pause();
        await vi.advanceTimersByTimeAsync(5000);
        expect(load).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('cambiar de pista cancela el reintento de la anterior', async () => {
      const { audioEngine, audio, load } = await setup();
      vi.useFakeTimers();
      try {
        fail(audio, 2);
        await audioEngine.loadTrack('https://radio/otra', true);
        load.mockClear();
        await vi.advanceTimersByTimeAsync(5000);
        expect(load).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('caché de análisis por fotograma', () => {
    const setup = async () => {
      const { audioEngine } = await freshEngine();
      const analyser = audioEngine.analyser as unknown as { getByteFrequencyData: ReturnType<typeof vi.fn> };
      analyser.getByteFrequencyData = vi.fn();
      (audioEngine as unknown as { frequencyBuffer: Uint8Array }).frequencyBuffer = new Uint8Array(256);
      return { audioEngine, read: analyser.getByteFrequencyData };
    };

    it('varios consumidores en el mismo fotograma comparten un único análisis', async () => {
      const { audioEngine, read } = await setup();
      const now = vi.spyOn(performance, 'now');
      now.mockReturnValue(1000);

      const a = audioEngine.getFrequencyData();
      now.mockReturnValue(1001.5); // mismo fotograma
      const b = audioEngine.getFrequencyData();
      const c = audioEngine.getFrequencyData();

      expect(read).toHaveBeenCalledTimes(1);
      expect(b).toBe(a);
      expect(c).toBe(a);
      now.mockRestore();
    });

    it('en el fotograma siguiente se vuelve a analizar (nunca se sirve un dato viejo)', async () => {
      const { audioEngine, read } = await setup();
      const now = vi.spyOn(performance, 'now');
      now.mockReturnValue(1000);
      const a = audioEngine.getFrequencyData();

      now.mockReturnValue(1000 + 6.9); // un fotograma a 144 Hz
      const b = audioEngine.getFrequencyData();

      expect(read).toHaveBeenCalledTimes(2);
      expect(b).not.toBe(a);
      now.mockRestore();
    });
  });

  it('pausar silencia el micrófono y reproducir lo reactiva', async () => {
    const { audioEngine } = await freshEngine();
    await audioEngine.enableMicrophone();

    audioEngine.pause();
    expect(mic.tracks[0].enabled).toBe(false);

    await audioEngine.resume();
    expect(mic.tracks[0].enabled).toBe(true);
  });
});
