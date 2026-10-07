import { describe, it, expect } from 'vitest';
import { camelotWheelService } from '../services/camelotWheelService';
import type { Track } from '../types/audio';

describe('Fullscreen Lyrics Stage & Frosted Backdrop', () => {
  const mockTrack: Track = {
    id: 'track-sing-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
    duration: 200,
    bpm: 171,
    camelotKey: '8B',
  };

  it('calcula armónicos de Camelot y BPM para la tarjeta del escenario en pantalla completa', () => {
    const harmonics = camelotWheelService.getTrackHarmonics(mockTrack);
    expect(harmonics.camelotKey).toBe('8B');
    expect(harmonics.bpm).toBe(171);
    expect(harmonics.parsed.mode).toBe('B');
  });

  it('calcula armónicos fallback limpios para pistas sin metadata explícita', () => {
    const fallbackTrack: Track = {
      id: 'track-unknown',
      title: 'Unknown Track',
      artist: 'Unknown Artist',
    };
    const harmonics = camelotWheelService.getTrackHarmonics(fallbackTrack);
    expect(harmonics.camelotKey).toMatch(/^[0-9]{1,2}[AB]$/);
    expect(harmonics.bpm).toBeGreaterThan(0);
  });

  it('calcula la caída de desenfoque de profundidad (Depth of Field) para versos', () => {
    // Distancia 0 (verso activo): blur 0px
    const getBlurForDistance = (distance: number) => {
      if (distance === 0) return 0;
      return Math.min(4.5, distance * 1.15);
    };

    expect(getBlurForDistance(0)).toBe(0);
    expect(getBlurForDistance(1)).toBeCloseTo(1.15, 2);
    expect(getBlurForDistance(2)).toBeCloseTo(2.3, 2);
    expect(getBlurForDistance(4)).toBe(4.5); // Tope máximo de desenfoque
  });

  it('calcula la opacidad progresiva para mantener legibilidad sin sobrecargar el minimalismo', () => {
    const getOpacityForDistance = (distance: number, isActive: boolean) => {
      if (isActive) return 1.0;
      return Math.max(0.18, 0.72 - distance * 0.15);
    };

    expect(getOpacityForDistance(0, true)).toBe(1.0);
    expect(getOpacityForDistance(1, false)).toBeCloseTo(0.57, 2);
    expect(getOpacityForDistance(2, false)).toBeCloseTo(0.42, 2);
    expect(getOpacityForDistance(5, false)).toBe(0.18); // Límite inferior para que no desaparezca totalmente
  });
});
