import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// playerStore arrastra audioEngine, que crea un <audio> al importarse; en Node se sustituye por un stub inerte
const paused = vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
  return { count: 0 };
});
vi.mock('../services/audioEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/audioEngine')>();
  return { ...actual, audioEngine: { pause: () => void paused.count++ } };
});

import { usePlayerStore } from '../stores/playerStore';
import { shouldYieldToOtherTab, installCrossTabPlayback } from '../services/crossTabPlayback';
import { OFFLINE_MESSAGE, installConnectivityNotice, needsNetwork } from '../services/connectivityNotice';
import type { Track } from '../types/audio';

const track = (sourceType: Track['sourceType'], p: Partial<Track> = {}): Track => ({
  id: String(sourceType),
  title: 't',
  artist: 'a',
  duration: 1,
  sourceType,
  addedAt: 0,
  ...p,
});

const base = { isPlaying: true, isMicActive: false, isSpotifyConnected: false };

describe('shouldYieldToOtherTab', () => {
  it('cede el audio cuando suena una pista normal', () => {
    expect(shouldYieldToOtherTab({ ...base, currentTrack: track('youtube') })).toBe(true);
    expect(shouldYieldToOtherTab({ ...base, currentTrack: track('local') })).toBe(true);
  });

  it('no cede si ya está en pausa', () => {
    expect(shouldYieldToOtherTab({ ...base, isPlaying: false, currentTrack: track('youtube') })).toBe(false);
  });

  it('no interrumpe el micrófono ni la captura de sistema', () => {
    expect(shouldYieldToOtherTab({ ...base, currentTrack: track('mic') })).toBe(false);
    expect(shouldYieldToOtherTab({ ...base, currentTrack: track('system') })).toBe(false);
    expect(shouldYieldToOtherTab({ ...base, isMicActive: true, currentTrack: track('youtube') })).toBe(false);
  });

  it('no cede si suena Spotify (está en otro dispositivo)', () => {
    expect(shouldYieldToOtherTab({ ...base, isSpotifyConnected: true, currentTrack: track('spotify') })).toBe(false);
  });
});

describe('installCrossTabPlayback', () => {
  it('pausa esta pestaña cuando otra anuncia que empieza a sonar', async () => {
    installCrossTabPlayback();
    paused.count = 0;
    usePlayerStore.setState({ currentTrack: track('local'), isPlaying: true, isMicActive: false });

    const other = new BroadcastChannel('aura-playback');
    other.postMessage({ type: 'playing', tabId: 'otra-pestana' });
    await new Promise((r) => setTimeout(r, 30));
    other.close();

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(paused.count).toBe(1);
  });

  it('con una pista de iframe solo apaga isPlaying (no toca el motor)', async () => {
    paused.count = 0;
    usePlayerStore.setState({ currentTrack: track('youtube', { isIframePlayback: true }), isPlaying: true });

    const other = new BroadcastChannel('aura-playback');
    other.postMessage({ type: 'playing', tabId: 'otra-pestana' });
    await new Promise((r) => setTimeout(r, 30));
    other.close();

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(paused.count).toBe(0);
  });

  it('ignora mensajes que no son de reproducción', async () => {
    usePlayerStore.setState({ currentTrack: track('local'), isPlaying: true });

    const other = new BroadcastChannel('aura-playback');
    other.postMessage({ type: 'otra-cosa' });
    await new Promise((r) => setTimeout(r, 30));
    other.close();

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

describe('needsNetwork', () => {
  it('archivos locales, mic y captura no necesitan red', () => {
    expect(needsNetwork(track('local'))).toBe(false);
    expect(needsNetwork(track('mic'))).toBe(false);
    expect(needsNetwork(track('system'))).toBe(false);
    expect(needsNetwork(track('youtube', { url: 'blob:abc' }))).toBe(false);
    expect(needsNetwork(null)).toBe(false);
  });

  it('YouTube, radio y Spotify sí', () => {
    expect(needsNetwork(track('youtube'))).toBe(true);
    expect(needsNetwork(track('radio', { url: 'https://r/s' }))).toBe(true);
    expect(needsNetwork(track('spotify'))).toBe(true);
  });
});

describe('installConnectivityNotice', () => {
  const win = new EventTarget();
  const g = globalThis as Record<string, unknown>;

  beforeEach(() => {
    g.window = win;
    usePlayerStore.setState({ audioError: null });
  });
  afterEach(() => {
    delete g.window;
  });

  it('avisa al perder la red solo si suena algo que la necesita, y lo retira al volver', () => {
    installConnectivityNotice();

    usePlayerStore.setState({ currentTrack: track('local'), isPlaying: true });
    win.dispatchEvent(new Event('offline'));
    expect(usePlayerStore.getState().audioError).toBeNull();

    usePlayerStore.setState({ currentTrack: track('youtube'), isPlaying: true });
    win.dispatchEvent(new Event('offline'));
    expect(usePlayerStore.getState().audioError).toBe(OFFLINE_MESSAGE);

    win.dispatchEvent(new Event('online'));
    expect(usePlayerStore.getState().audioError).toBeNull();
  });

  it('al volver la red no borra un error distinto', () => {
    usePlayerStore.setState({ audioError: 'Otro error' });
    win.dispatchEvent(new Event('online'));
    expect(usePlayerStore.getState().audioError).toBe('Otro error');
  });

  it('en pausa no avisa', () => {
    usePlayerStore.setState({ currentTrack: track('youtube'), isPlaying: false });
    win.dispatchEvent(new Event('offline'));
    expect(usePlayerStore.getState().audioError).toBeNull();
  });
});
