import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});

import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

function makeTrack(id: string, bpm: number, camelotKey: string): Track {
  return {
    id,
    title: `Track ${id}`,
    artist: `Artist ${id}`,
    duration: 180,
    sourceType: 'local',
    addedAt: Date.now(),
    bpm,
    camelotKey,
  };
}

describe('PlayerStore - DJ Smart Sort Queue Integration', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
    });
  });

  it('sorts queue tracks armónicamente preservando el track en reproducción', () => {
    const t1 = makeTrack('anchor', 124, '8A');
    const t2 = makeTrack('distant', 140, '2B');
    const t3 = makeTrack('next_harmonic', 125, '9A');
    const t4 = makeTrack('relative_maj', 124, '8B');

    usePlayerStore.setState({
      queue: [t1, t2, t3, t4],
      queueIndex: 0,
      currentTrack: t1,
    });

    usePlayerStore.getState().smartDjSortQueue();

    const newQueue = usePlayerStore.getState().queue;
    expect(newQueue[0].id).toBe('anchor');
    // Las siguientes canciones deben ser armónicas (8B o 9A), y la lejana ('distant') al final
    expect(['next_harmonic', 'relative_maj']).toContain(newQueue[1].id);
    expect(['next_harmonic', 'relative_maj']).toContain(newQueue[2].id);
    expect(newQueue[3].id).toBe('distant');
  });

  it('no altera colas con una sola pista o vacías', () => {
    const single = [makeTrack('solo', 120, '8A')];
    usePlayerStore.setState({ queue: single, queueIndex: 0 });
    usePlayerStore.getState().smartDjSortQueue();
    expect(usePlayerStore.getState().queue).toEqual(single);
  });
});
