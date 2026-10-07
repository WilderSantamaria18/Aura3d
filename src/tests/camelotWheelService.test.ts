import { describe, it, expect } from 'vitest';
import { camelotWheelService } from '../services/camelotWheelService';
import type { Track } from '../types/audio';

function makeMockTrack(id: string, bpm?: number, camelotKey?: string): Track {
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

describe('camelotWheelService', () => {
  it('parses valid camelot keys correctly', () => {
    expect(camelotWheelService.parseCamelot('8A')).toEqual({ number: 8, mode: 'A', raw: '8A' });
    expect(camelotWheelService.parseCamelot('11b')).toEqual({ number: 11, mode: 'B', raw: '11B' });
    expect(camelotWheelService.parseCamelot('12A')).toEqual({ number: 12, mode: 'A', raw: '12A' });
    expect(camelotWheelService.parseCamelot('1B')).toEqual({ number: 1, mode: 'B', raw: '1B' });
  });

  it('translates standard musical keys to Camelot keys', () => {
    expect(camelotWheelService.parseCamelot('Am')).toEqual({ number: 8, mode: 'A', raw: '8A' });
    expect(camelotWheelService.parseCamelot('C')).toEqual({ number: 8, mode: 'B', raw: '8B' });
    expect(camelotWheelService.parseCamelot('Em')).toEqual({ number: 9, mode: 'A', raw: '9A' });
    expect(camelotWheelService.parseCamelot('G')).toEqual({ number: 9, mode: 'B', raw: '9B' });
  });

  it('calculates circular distance on 12-sector wheel accurately', () => {
    expect(camelotWheelService.getCircularDistance(8, 8)).toBe(0);
    expect(camelotWheelService.getCircularDistance(8, 9)).toBe(1);
    expect(camelotWheelService.getCircularDistance(8, 7)).toBe(1);
    expect(camelotWheelService.getCircularDistance(12, 1)).toBe(1);
    expect(camelotWheelService.getCircularDistance(1, 12)).toBe(1);
    expect(camelotWheelService.getCircularDistance(1, 7)).toBe(6);
  });

  it('evaluates perfect harmonic match with low delta BPM', () => {
    const trackA = makeMockTrack('1', 124, '8A');
    const trackB = makeMockTrack('2', 126, '8A');
    const comp = camelotWheelService.getCompatibility(trackA, trackB);

    expect(comp.isSameKey).toBe(true);
    expect(comp.compatibilityLevel).toBe('perfect');
    expect(comp.badgeTheme).toBe('emerald');
    expect(comp.harmonicScore).toBeGreaterThanOrEqual(90);
  });

  it('identifies relative major/minor transitions as harmonic', () => {
    const trackA = makeMockTrack('1', 125, '8A');
    const trackB = makeMockTrack('2', 125, '8B');
    const comp = camelotWheelService.getCompatibility(trackA, trackB);

    expect(comp.isRelative).toBe(true);
    expect(comp.compatibilityLevel).toBe('perfect');
    expect(comp.badgeTheme).toBe('emerald');
  });

  it('identifies adjacent wheel fifths (+1 / -1)', () => {
    const trackA = makeMockTrack('1', 124, '8A');
    const trackB = makeMockTrack('2', 126, '9A');
    const comp = camelotWheelService.getCompatibility(trackA, trackB);

    expect(comp.isAdjacent).toBe(true);
    expect(comp.compatibilityLevel).toBe('compatible');
    expect(comp.badgeTheme).toBe('cyan');
  });

  it('identifies energy jump (+2 Camelot or BPM acceleration)', () => {
    const trackA = makeMockTrack('1', 120, '8A');
    const trackB = makeMockTrack('2', 128, '10A');
    const comp = camelotWheelService.getCompatibility(trackA, trackB);

    expect(comp.isEnergyBoost).toBe(true);
    expect(comp.compatibilityLevel).toBe('energy_boost');
    expect(comp.badgeTheme).toBe('amber');
  });

  it('sorts queue harmonically using DJ Smart Sort greedy path', () => {
    const tracks: Track[] = [
      makeMockTrack('1', 124, '8A'),  // Anchor (current)
      makeMockTrack('2', 140, '2B'),  // Distant
      makeMockTrack('3', 125, '9A'),  // Compatible (+1)
      makeMockTrack('4', 124, '8B'),  // Relative major
    ];

    const sorted = camelotWheelService.sortQueueHarmonically(tracks, 0);

    expect(sorted[0].id).toBe('1'); // Anchor stays first
    // Next track should be 8B or 9A, NOT 2B (distant key & extreme BPM)
    expect(['3', '4']).toContain(sorted[1].id);
    expect(['3', '4']).toContain(sorted[2].id);
    expect(sorted[3].id).toBe('2'); // Distant placed last
  });

  it('filters tracks by energy correctly', () => {
    const tracks: Track[] = [
      makeMockTrack('1', 110, '8A'),
      makeMockTrack('2', 128, '9A'),
      makeMockTrack('3', 135, '10A'),
    ];

    const chill = camelotWheelService.filterTracksByEnergy(tracks, 'chill');
    expect(chill.map(t => t.id)).toEqual(['1']);

    const high = camelotWheelService.filterTracksByEnergy(tracks, 'high_energy');
    expect(high.map(t => t.id)).toEqual(['2', '3']);
  });
});
