/**
 * audioAnalysisWorker.ts
 * Web Worker dedicado al procesamiento matemático de transformadas FFT,
 * análisis espectral multibanda y detección de transientes fuera del hilo principal de UI.
 */

export interface FFTAnalysisRequest {
  type: 'ANALYZE_FRAME';
  freqData: Uint8Array | Float32Array;
  timeData?: Float32Array;
  sampleRate?: number;
  fftSize?: number;
}

export interface SpectralBands {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  energy: number;
  spectralCentroid: number;
  spectralFlux: number;
  isTransientPeak: boolean;
}

export interface FFTAnalysisResponse {
  type: 'ANALYSIS_RESULT';
  bands: SpectralBands;
  timestamp: number;
}

let previousSpectrum: Float32Array | null = null;
const spectralFluxHistory: number[] = [];

self.onmessage = (event: MessageEvent<FFTAnalysisRequest>) => {
  const { type, freqData, sampleRate = 48000 } = event.data;

  if (type === 'ANALYZE_FRAME' && freqData && freqData.length > 0) {
    const len = freqData.length;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / len;

    // Normalizar a 0.0 - 1.0 según el tipo de buffer
    const isFloat = freqData instanceof Float32Array;
    const normalized = new Float32Array(len);

    for (let i = 0; i < len; i++) {
      if (isFloat) {
        const raw = freqData[i];
        normalized[i] = raw <= 0 && raw >= -120 ? Math.max(0, (raw + 100) / 100) : Math.min(1, Math.max(0, raw));
      } else {
        normalized[i] = freqData[i] / 255.0;
      }
    }

    // 1. Cálculo de bandas espectrales por frecuencias psicoacústicas
    let subSum = 0, subCount = 0;
    let bassSum = 0, bassCount = 0;
    let lowMidSum = 0, lowMidCount = 0;
    let midSum = 0, midCount = 0;
    let highMidSum = 0, highMidCount = 0;
    let trebleSum = 0, trebleCount = 0;
    let totalEnergy = 0;
    let weightedFreqSum = 0;

    for (let i = 0; i < len; i++) {
      const val = normalized[i];
      const freq = i * binWidth;

      totalEnergy += val;
      weightedFreqSum += freq * val;

      if (freq < 60) {
        subSum += val;
        subCount++;
      } else if (freq < 250) {
        bassSum += val;
        bassCount++;
      } else if (freq < 500) {
        lowMidSum += val;
        lowMidCount++;
      } else if (freq < 2000) {
        midSum += val;
        midCount++;
      } else if (freq < 6000) {
        highMidSum += val;
        highMidCount++;
      } else {
        trebleSum += val;
        trebleCount++;
      }
    }

    const sub = subCount > 0 ? subSum / subCount : 0;
    const bass = bassCount > 0 ? bassSum / bassCount : 0;
    const lowMid = lowMidCount > 0 ? lowMidSum / lowMidCount : 0;
    const mid = midCount > 0 ? midSum / midCount : 0;
    const highMid = highMidCount > 0 ? highMidSum / highMidCount : 0;
    const treble = trebleCount > 0 ? trebleSum / trebleCount : 0;
    const energy = totalEnergy / Math.max(1, len);
    const spectralCentroid = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0;

    // 2. Cálculo de Spectral Flux (Variación entre fotogramas)
    let flux = 0;
    if (previousSpectrum && previousSpectrum.length === len) {
      for (let i = 0; i < len; i++) {
        const diff = normalized[i] - previousSpectrum[i];
        if (diff > 0) flux += diff;
      }
    } else {
      previousSpectrum = new Float32Array(len);
    }
    previousSpectrum.set(normalized);

    // 3. Detección adaptativa de transientes / kicks
    spectralFluxHistory.push(flux);
    if (spectralFluxHistory.length > 25) spectralFluxHistory.shift();
    const avgFlux = spectralFluxHistory.reduce((a, b) => a + b, 0) / spectralFluxHistory.length;
    const isTransientPeak = flux > avgFlux * 1.5 && flux > 0.12;

    const result: FFTAnalysisResponse = {
      type: 'ANALYSIS_RESULT',
      bands: {
        sub: Math.min(1.0, sub * 1.3),
        bass: Math.min(1.0, bass * 1.25),
        lowMid: Math.min(1.0, lowMid * 1.15),
        mid: Math.min(1.0, mid * 1.1),
        highMid: Math.min(1.0, highMid * 1.15),
        treble: Math.min(1.0, treble * 1.2),
        energy: Math.min(1.0, energy * 1.2),
        spectralCentroid,
        spectralFlux: flux,
        isTransientPeak,
      },
      timestamp: performance.now(),
    };

    self.postMessage(result);
  }
};
