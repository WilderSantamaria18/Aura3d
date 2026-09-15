import { describe, it, expect } from 'vitest';
import { fftWorkerService } from '../services/fftWorkerService';

describe('FFTWorkerService & Spectral Analysis', () => {
  it('should initialize with default spectral bands', () => {
    const bands = fftWorkerService.getLatestBands();
    expect(bands).toBeDefined();
    expect(bands).toHaveProperty('sub');
    expect(bands).toHaveProperty('bass');
    expect(bands).toHaveProperty('mid');
    expect(bands).toHaveProperty('treble');
    expect(bands).toHaveProperty('energy');
    expect(bands).toHaveProperty('spectralCentroid');
    expect(bands).toHaveProperty('spectralFlux');
    expect(bands).toHaveProperty('isTransientPeak');
  });

  it('should process Uint8Array frequency frame via fallback gracefully', () => {
    const mockFreq = new Uint8Array(256);
    // Fill with simulated bass frequency peaks
    for (let i = 0; i < 20; i++) {
      mockFreq[i] = 200;
    }
    fftWorkerService.analyzeFrame(mockFreq, 48000);

    const updatedBands = fftWorkerService.getLatestBands();
    expect(updatedBands.energy).toBeGreaterThanOrEqual(0);
    expect(updatedBands.bass).toBeGreaterThanOrEqual(0);
  });

  it('should process Float32Array frequency frame', () => {
    const mockFloatFreq = new Float32Array(512);
    for (let i = 0; i < 50; i++) {
      mockFloatFreq[i] = -20; // -20 dB
    }
    fftWorkerService.analyzeFrame(mockFloatFreq, 48000);

    const bands = fftWorkerService.getLatestBands();
    expect(bands.energy).toBeGreaterThanOrEqual(0);
  });
});
