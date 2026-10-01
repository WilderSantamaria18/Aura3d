import { describe, it, expect } from 'vitest';
import {
  MAX_PERSISTED_QUEUE,
  isRestorable,
  parsePersistedQueue,
  serializeQueue,
} from '../utils/queuePersistence';
import type { Track } from '../types/audio';

const t = (p: Partial<Track> & { id: string }): Track => ({
  title: p.id,
  artist: 'a',
  duration: 100,
  sourceType: 'youtube',
  youtubeId: p.id,
  addedAt: 1,
  ...p,
});

describe('isRestorable', () => {
  it('acepta YouTube y radio con URL remota', () => {
    expect(isRestorable(t({ id: 'abc' }))).toBe(true);
    expect(isRestorable(t({ id: 'r', sourceType: 'radio', youtubeId: undefined, url: 'https://radio/stream' }))).toBe(true);
  });

  it('descarta lo que no sobrevive a una recarga', () => {
    expect(isRestorable(t({ id: 'l', sourceType: 'local', youtubeId: undefined, url: 'blob:x' }))).toBe(false);
    expect(isRestorable(t({ id: 'f', file: new File([], 'a.mp3') }))).toBe(false);
    expect(isRestorable(t({ id: 'm', sourceType: 'mic', youtubeId: undefined }))).toBe(false);
    expect(isRestorable(t({ id: 's', sourceType: 'system', youtubeId: undefined }))).toBe(false);
    expect(isRestorable(t({ id: 'sp', sourceType: 'spotify', youtubeId: undefined, url: 'x' }))).toBe(false);
    expect(isRestorable(t({ id: 'b', youtubeId: undefined, url: 'blob:y' }))).toBe(false);
    expect(isRestorable(t({ id: 'n', sourceType: 'radio', youtubeId: undefined }))).toBe(false); // sin nada que reproducir
  });
});

describe('serializeQueue', () => {
  it('filtra y reubica el índice de la pista actual', () => {
    const queue = [
      t({ id: 'local', sourceType: 'local', youtubeId: undefined, url: 'blob:z' }),
      t({ id: 'yt1' }),
      t({ id: 'yt2' }),
    ];
    const out = serializeQueue(queue, 2);
    expect(out.tracks.map((x) => x.id)).toEqual(['yt1', 'yt2']);
    expect(out.index).toBe(1);
  });

  it('si la pista actual no es restaurable, el índice queda en 0', () => {
    const queue = [t({ id: 'yt1' }), t({ id: 'local', sourceType: 'local', youtubeId: undefined, url: 'blob:z' })];
    expect(serializeQueue(queue, 1).index).toBe(0);
  });

  it('no guarda campos no serializables y limita el tamaño', () => {
    const many = Array.from({ length: MAX_PERSISTED_QUEUE + 50 }, (_, i) => t({ id: `v${i}` }));
    const out = serializeQueue(many, 0);
    expect(out.tracks).toHaveLength(MAX_PERSISTED_QUEUE);
    expect(Object.keys(out.tracks[0])).not.toContain('file');
    expect(() => JSON.stringify(out)).not.toThrow();
  });
});

describe('parsePersistedQueue', () => {
  it('es tolerante con datos vacíos, corruptos o de otra forma', () => {
    const empty = { tracks: [], index: 0 };
    expect(parsePersistedQueue(null)).toEqual(empty);
    expect(parsePersistedQueue('{no es json')).toEqual(empty);
    expect(parsePersistedQueue('"texto"')).toEqual(empty);
    expect(parsePersistedQueue(JSON.stringify({ tracks: 'x' }))).toEqual(empty);
  });

  it('descarta pistas inválidas o no restaurables y corrige el índice', () => {
    const raw = JSON.stringify({
      tracks: [t({ id: 'ok1' }), { foo: 1 }, null, t({ id: 'bad', sourceType: 'mic', youtubeId: undefined }), t({ id: 'ok2' })],
      index: 99,
    });
    const out = parsePersistedQueue(raw);
    expect(out.tracks.map((x) => x.id)).toEqual(['ok1', 'ok2']);
    expect(out.index).toBe(1);
  });

  it('ida y vuelta conserva la cola', () => {
    const queue = [t({ id: 'a' }), t({ id: 'b' }), t({ id: 'c' })];
    const out = parsePersistedQueue(JSON.stringify(serializeQueue(queue, 2)));
    expect(out.tracks.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out.index).toBe(2);
  });
});
