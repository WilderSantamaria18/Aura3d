import { describe, it, expect, beforeEach, vi } from 'vitest';

// playerStore arrastra audioEngine, que crea un <audio> al importarse; en Node se sustituye por un stub inerte
vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});
import { usePlayerStore } from '../stores/playerStore';
import { useTrackLogoStore } from '../stores/trackLogoStore';
import { getActiveLogoSrc } from '../hooks/useActiveLogo';
import {
  DEFAULT_LOGO_APPEARANCE,
  isStreamingTrack,
  logoFilter,
  trackLogoKey,
} from '../utils/logoAppearance';
import type { Track } from '../types/audio';

function makeTrack(partial: Partial<Track>): Track {
  return {
    id: 't1',
    title: 'Canción',
    artist: 'Artista',
    duration: 200,
    sourceType: 'local',
    addedAt: 0,
    ...partial,
  };
}

describe('trackLogoKey', () => {
  it('usa la URI de Spotify y el id de YouTube (no el id interno)', () => {
    expect(trackLogoKey(makeTrack({ sourceType: 'spotify', spotifyUri: 'spotify:track:abc' }))).toBe(
      'sp:spotify:track:abc'
    );
    expect(trackLogoKey(makeTrack({ sourceType: 'youtube', youtubeId: 'dQw4' }))).toBe('yt:dQw4');
  });

  it('en archivos locales es estable entre sesiones (no depende del id aleatorio)', () => {
    const a = trackLogoKey(makeTrack({ id: 'sesion-1', title: 'Tema', artist: 'X', duration: 181.4 }));
    const b = trackLogoKey(makeTrack({ id: 'sesion-2', title: 'Tema', artist: 'X', duration: 181.2 }));
    expect(a).toBe(b);
  });

  it('devuelve null sin canción', () => {
    expect(trackLogoKey(null)).toBeNull();
  });

  it('distingue streaming de archivo local', () => {
    expect(isStreamingTrack(makeTrack({ sourceType: 'spotify' }))).toBe(true);
    expect(isStreamingTrack(makeTrack({ sourceType: 'youtube' }))).toBe(true);
    expect(isStreamingTrack(makeTrack({ sourceType: 'local' }))).toBe(false);
  });
});

describe('logoFilter', () => {
  it('sin cambios genera filtros neutros', () => {
    expect(logoFilter(DEFAULT_LOGO_APPEARANCE)).toBe('brightness(100%) contrast(100%) saturate(100%)');
  });

  it('añade B/N e invertir solo cuando están activos', () => {
    const f = logoFilter({ ...DEFAULT_LOGO_APPEARANCE, grayscale: true, invert: true });
    expect(f).toContain('grayscale(100%)');
    expect(f).toContain('invert(100%)');
  });
});

describe('imagen del logo: la carátula sigue a la canción', () => {
  beforeEach(() => {
    useTrackLogoStore.setState({ overrides: {} });
    usePlayerStore.getState().updateBlobSettings({ customLogoUrl: null, logoAppearance: null });
  });

  it('en Spotify/YouTube cada canción muestra su propia carátula', () => {
    const set = usePlayerStore.setState;
    set({ currentTrack: makeTrack({ sourceType: 'spotify', spotifyUri: 'u1', coverUrl: 'https://cdn/a.jpg' }) });
    expect(getActiveLogoSrc()).toBe('https://cdn/a.jpg');
    set({ currentTrack: makeTrack({ sourceType: 'spotify', spotifyUri: 'u2', coverUrl: 'https://cdn/b.jpg' }) });
    expect(getActiveLogoSrc()).toBe('https://cdn/b.jpg');
  });

  it('una imagen global antigua ya no tapa la carátula de la canción', () => {
    usePlayerStore.getState().updateBlobSettings({ customLogoUrl: 'data:image/png;base64,VIEJO' });
    usePlayerStore.setState({
      currentTrack: makeTrack({ sourceType: 'youtube', youtubeId: 'y1', coverUrl: 'https://img/y1.jpg' }),
    });
    expect(getActiveLogoSrc()).toBe('https://img/y1.jpg');
  });

  it('la imagen global sirve solo de respaldo cuando la canción no tiene carátula', () => {
    usePlayerStore.getState().updateBlobSettings({ customLogoUrl: 'data:image/png;base64,RESPALDO' });
    usePlayerStore.setState({ currentTrack: makeTrack({ sourceType: 'local' }) });
    expect(getActiveLogoSrc()).toBe('data:image/png;base64,RESPALDO');
  });

  it('un mp3 con imagen propia la mantiene y otra canción no la hereda', () => {
    const mp3A = makeTrack({ id: 'a', title: 'A', artist: 'X', duration: 100 });
    const mp3B = makeTrack({ id: 'b', title: 'B', artist: 'X', duration: 150 });
    useTrackLogoStore.getState().setOverride(trackLogoKey(mp3A)!, { src: 'data:image/jpeg;base64,PROPIA' });

    usePlayerStore.setState({ currentTrack: mp3A });
    expect(getActiveLogoSrc()).toBe('data:image/jpeg;base64,PROPIA');

    usePlayerStore.setState({ currentTrack: mp3B });
    expect(getActiveLogoSrc()).toBeNull();
  });
});

describe('metadatos de Spotify', () => {
  it('publica el BPM en el medidor global y en la pista activa', () => {
    usePlayerStore.setState({ bpm: 0, spotifyBpm: 124, currentTrack: null });
    usePlayerStore.getState().updateFromSpotify({
      title: 'Tema',
      artist: 'Artista',
      album: 'Álbum',
      duration: 180,
      coverUrl: '',
      spotifyUri: 'spotify:track:bpm-test',
      currentTime: 12,
      isPlaying: true,
      bpm: 128.4,
    });

    const state = usePlayerStore.getState();
    expect(state.bpm).toBe(128);
    expect(state.spotifyBpm).toBe(128);
    expect(state.currentTrack?.bpm).toBe(128);
  });
});

describe('trackLogoStore', () => {
  beforeEach(() => useTrackLogoStore.setState({ overrides: {} }));

  it('clearOverride con partes conserva el resto y borra la entrada al quedar vacía', () => {
    const s = useTrackLogoStore.getState();
    s.setOverride('k', { src: 'img', appearance: { ...DEFAULT_LOGO_APPEARANCE, zoom: 2 } });

    s.clearOverride('k', ['appearance']);
    expect(useTrackLogoStore.getState().overrides.k?.src).toBe('img');
    expect(useTrackLogoStore.getState().overrides.k?.appearance).toBeUndefined();

    s.clearOverride('k', ['src']);
    expect(useTrackLogoStore.getState().overrides.k).toBeUndefined();
  });

  it('limita el número de canciones guardadas descartando las más antiguas', () => {
    const s = useTrackLogoStore.getState();
    for (let i = 0; i < 70; i++) s.setOverride(`k${i}`, { src: `img${i}` });
    const keys = Object.keys(useTrackLogoStore.getState().overrides);
    expect(keys.length).toBeLessThanOrEqual(60);
    expect(keys).toContain('k69');
  });
});
