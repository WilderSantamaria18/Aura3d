import { describe, it, expect, beforeEach, vi } from 'vitest';

// playerStore arrastra audioEngine, que crea un <audio> al importarse; en Node se sustituye por un stub inerte
vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});
import { usePlayerStore } from '../stores/playerStore';
import { isSpotifyActiveSource } from '../utils/spotifyRouting';
import type { Track } from '../types/audio';

const track = (sourceType: Track['sourceType'], id = sourceType as string): Track => ({
  id,
  title: id,
  artist: 'x',
  duration: 100,
  sourceType,
  addedAt: 0,
});

const spotifyData = (isPlaying: boolean, uri = 'spotify:track:abc') => ({
  title: 'Tema Spotify',
  artist: 'Artista',
  album: '',
  duration: 200,
  coverUrl: '',
  spotifyUri: uri,
  currentTime: 30,
  isPlaying,
});

describe('isSpotifyActiveSource', () => {
  it('solo es true si Spotify está conectado Y la pista actual es de Spotify', () => {
    expect(isSpotifyActiveSource({ isSpotifyConnected: true, currentTrack: track('spotify') })).toBe(true);
    expect(isSpotifyActiveSource({ isSpotifyConnected: true, currentTrack: track('local') })).toBe(false);
    expect(isSpotifyActiveSource({ isSpotifyConnected: true, currentTrack: track('youtube') })).toBe(false);
    expect(isSpotifyActiveSource({ isSpotifyConnected: true, currentTrack: null })).toBe(false);
    expect(isSpotifyActiveSource({ isSpotifyConnected: false, currentTrack: track('spotify') })).toBe(false);
  });
});

describe('updateFromSpotify no pisa otras fuentes', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      isMicActive: false,
      isSpotifyConnected: true,
    });
  });

  it('sin pista actual, Spotify se aplica', () => {
    usePlayerStore.getState().updateFromSpotify(spotifyData(true));
    const s = usePlayerStore.getState();
    expect(s.currentTrack?.sourceType).toBe('spotify');
    expect(s.isPlaying).toBe(true);
  });

  it('con un archivo local sonando, el sondeo de Spotify se ignora', () => {
    const local = track('local');
    usePlayerStore.setState({ currentTrack: local, isPlaying: true });

    usePlayerStore.getState().updateFromSpotify(spotifyData(false));

    const s = usePlayerStore.getState();
    expect(s.currentTrack).toBe(local);
    expect(s.isPlaying).toBe(true); // Spotify en pausa no debe pausar el archivo local
  });

  it('con el micrófono activo, el sondeo de Spotify se ignora', () => {
    const mic = track('mic');
    usePlayerStore.setState({ currentTrack: mic, isPlaying: false, isMicActive: true });

    usePlayerStore.getState().updateFromSpotify(spotifyData(true));

    expect(usePlayerStore.getState().currentTrack).toBe(mic);
  });

  it('si la otra fuente está en pausa, Spotify retoma', () => {
    usePlayerStore.setState({ currentTrack: track('local'), isPlaying: false });

    usePlayerStore.getState().updateFromSpotify(spotifyData(true));

    expect(usePlayerStore.getState().currentTrack?.sourceType).toBe('spotify');
  });

  it('con una pista de Spotify ya activa, sigue actualizándose', () => {
    usePlayerStore.getState().updateFromSpotify(spotifyData(true, 'spotify:track:one'));
    usePlayerStore.getState().updateFromSpotify(spotifyData(false, 'spotify:track:two'));

    const s = usePlayerStore.getState();
    expect(s.currentTrack?.spotifyUri).toBe('spotify:track:two');
    expect(s.isPlaying).toBe(false);
  });
});
