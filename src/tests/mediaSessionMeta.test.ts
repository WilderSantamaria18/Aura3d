import { describe, it, expect } from 'vitest';
import { mediaSessionInfo, mediaSessionKey, mediaSessionPosition } from '../utils/mediaSessionMeta';
import type { Track } from '../types/audio';

const track = (p: Partial<Track> = {}): Track => ({
  id: 't1',
  title: 'Tema',
  artist: 'Artista',
  duration: 200,
  sourceType: 'local',
  addedAt: 0,
  ...p,
});

describe('mediaSessionInfo', () => {
  it('sin pista no hay metadatos', () => {
    expect(mediaSessionInfo(null)).toBeNull();
  });

  it('incluye la portada solo si existe', () => {
    expect(mediaSessionInfo(track({ coverUrl: 'http://x/c.jpg' }))?.artwork).toEqual([{ src: 'http://x/c.jpg' }]);
    expect(mediaSessionInfo(track())?.artwork).toEqual([]);
    expect(mediaSessionInfo(track())?.album).toBe('');
  });
});

describe('mediaSessionKey', () => {
  it('es igual para objetos distintos con los mismos datos (sondeo de Spotify)', () => {
    expect(mediaSessionKey(track())).toBe(mediaSessionKey({ ...track() }));
  });

  it('cambia con el título, el artista o la portada', () => {
    const base = mediaSessionKey(track());
    expect(mediaSessionKey(track({ title: 'Otro' }))).not.toBe(base);
    expect(mediaSessionKey(track({ artist: 'Otro' }))).not.toBe(base);
    expect(mediaSessionKey(track({ coverUrl: 'http://x/c.jpg' }))).not.toBe(base);
  });

  it('sin pista es una cadena vacía', () => {
    expect(mediaSessionKey(null)).toBe('');
  });
});

describe('mediaSessionPosition', () => {
  it('rechaza duraciones inválidas (directos, mic, captura)', () => {
    expect(mediaSessionPosition(0, 5)).toBeNull();
    expect(mediaSessionPosition(Infinity, 5)).toBeNull();
    expect(mediaSessionPosition(NaN, 5)).toBeNull();
    expect(mediaSessionPosition(100, NaN)).toBeNull();
  });

  it('limita la posición al rango [0, duración]', () => {
    expect(mediaSessionPosition(100, 250)?.position).toBe(100);
    expect(mediaSessionPosition(100, -5)?.position).toBe(0);
    expect(mediaSessionPosition(100, 40)).toEqual({ duration: 100, position: 40, playbackRate: 1 });
  });
});
