import { useEffect, useState } from 'react';
import type { SpectralBands, FFTAnalysisResponse } from '../workers/audioAnalysisWorker';

/**
 * FFTWorkerService
 * Puente de comunicación singleton para enviar datos de audio al Web Worker
 * y recibir métricas analizadas de forma asíncrona sin bloquear los 60/120 FPS del hilo de render.
 * Cuenta con fallback síncrono automático si los Web Workers no están disponibles.
 */
class FFTWorkerService {
  private static instance: FFTWorkerService;
  private worker: Worker | null = null;
  private isSupported: boolean = false;
  private fallbackPreviousSpectrum: Float32Array | null = null;
  private fallbackFluxHistory: number[] = [];
  private lastBands: SpectralBands = {
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    energy: 0,
    spectralCentroid: 0,
    spectralFlux: 0,
    isTransientPeak: false,
  };
  private isProcessing: boolean = false;
  private listeners: Set<(bands: SpectralBands) => void> = new Set();

  private constructor() {
    this.initWorker();
  }

  public static getInstance(): FFTWorkerService {
    if (!FFTWorkerService.instance) {
      FFTWorkerService.instance = new FFTWorkerService();
    }
    return FFTWorkerService.instance;
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/audioAnalysisWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent<FFTAnalysisResponse>) => {
          if (e.data?.type === 'ANALYSIS_RESULT') {
            this.lastBands = e.data.bands;
            this.isProcessing = false;
            this.notifyListeners(this.lastBands);
          }
        };

        this.worker.onerror = (err) => {
          console.warn('[FFTWorkerService] Error en Web Worker, usando fallback directo:', err);
          this.isSupported = false;
          this.isProcessing = false;
        };

        this.isSupported = true;
      } catch (err) {
        console.warn('[FFTWorkerService] Inicialización de Worker no disponible:', err);
        this.isSupported = false;
      }
    }
  }

  private notifyListeners(bands: SpectralBands) {
    this.listeners.forEach((listener) => {
      try {
        listener(bands);
      } catch (e) {
        console.error('[FFTWorkerService] Error en listener:', e);
      }
    });
  }

  /**
   * Envía un fotograma de datos de frecuencia FFT para análisis en el worker.
   * Si el worker no está disponible, computa el análisis con fallback síncrono.
   */
  public analyzeFrame(freqData: Uint8Array | Float32Array, sampleRate = 48000, fftSize = 1024) {
    if (!freqData || freqData.length === 0) return;

    if (this.isSupported && this.worker) {
      if (this.isProcessing) return; // Evitar saturar el canal de postMessage
      this.isProcessing = true;

      // Crear copia desacoplada para transferir/enviar al worker
      const copy = freqData instanceof Float32Array ? new Float32Array(freqData) : new Uint8Array(freqData);
      this.worker.postMessage({
        type: 'ANALYZE_FRAME',
        freqData: copy,
        sampleRate,
        fftSize,
      });
    } else {
      // Fallback síncrono en hilo principal
      this.computeFallbackAnalysis(freqData, sampleRate);
    }
  }

  /**
   * Fallback síncrono para entornos sin soporte de Web Workers
   */
  private computeFallbackAnalysis(freqData: Uint8Array | Float32Array, sampleRate: number) {
    const len = freqData.length;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / len;
    const isFloat = freqData instanceof Float32Array;

    let subSum = 0, subCount = 0;
    let bassSum = 0, bassCount = 0;
    let lowMidSum = 0, lowMidCount = 0;
    let midSum = 0, midCount = 0;
    let highMidSum = 0, highMidCount = 0;
    let trebleSum = 0, trebleCount = 0;
    let totalEnergy = 0;
    let weightedFreqSum = 0;

    const normalized = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const val = isFloat
        ? (freqData[i] <= 0 && freqData[i] >= -120 ? Math.max(0, (freqData[i] + 100) / 100) : Math.min(1, Math.max(0, freqData[i])))
        : freqData[i] / 255.0;
      normalized[i] = val;

      const freq = i * binWidth;
      totalEnergy += val;
      weightedFreqSum += freq * val;

      if (freq < 60) { subSum += val; subCount++; }
      else if (freq < 250) { bassSum += val; bassCount++; }
      else if (freq < 500) { lowMidSum += val; lowMidCount++; }
      else if (freq < 2000) { midSum += val; midCount++; }
      else if (freq < 6000) { highMidSum += val; highMidCount++; }
      else { trebleSum += val; trebleCount++; }
    }

    let flux = 0;
    if (this.fallbackPreviousSpectrum && this.fallbackPreviousSpectrum.length === len) {
      for (let i = 0; i < len; i++) {
        const diff = normalized[i] - this.fallbackPreviousSpectrum[i];
        if (diff > 0) flux += diff;
      }
    } else {
      this.fallbackPreviousSpectrum = new Float32Array(len);
    }
    this.fallbackPreviousSpectrum.set(normalized);

    this.fallbackFluxHistory.push(flux);
    if (this.fallbackFluxHistory.length > 25) this.fallbackFluxHistory.shift();
    const avgFlux = this.fallbackFluxHistory.reduce((a, b) => a + b, 0) / this.fallbackFluxHistory.length;
    const isTransientPeak = flux > avgFlux * 1.5 && flux > 0.12;

    this.lastBands = {
      sub: subCount > 0 ? Math.min(1.0, (subSum / subCount) * 1.3) : 0,
      bass: bassCount > 0 ? Math.min(1.0, (bassSum / bassCount) * 1.25) : 0,
      lowMid: lowMidCount > 0 ? Math.min(1.0, (lowMidSum / lowMidCount) * 1.15) : 0,
      mid: midCount > 0 ? Math.min(1.0, (midSum / midCount) * 1.1) : 0,
      highMid: highMidCount > 0 ? Math.min(1.0, (highMidSum / highMidCount) * 1.15) : 0,
      treble: trebleCount > 0 ? Math.min(1.0, (trebleSum / trebleCount) * 1.2) : 0,
      energy: Math.min(1.0, (totalEnergy / Math.max(1, len)) * 1.2),
      spectralCentroid: totalEnergy > 0 ? weightedFreqSum / totalEnergy : 0,
      spectralFlux: flux,
      isTransientPeak,
    };

    this.notifyListeners(this.lastBands);
  }

  public getLatestBands(): SpectralBands {
    return this.lastBands;
  }

  public isWorkerActive(): boolean {
    return this.isSupported && this.worker !== null;
  }

  public subscribe(listener: (bands: SpectralBands) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const fftWorkerService = FFTWorkerService.getInstance();
export type { SpectralBands };

/**
 * React Hook para suscribirse a las métricas del worker DSP
 */
export function useSpectralAnalysis(): SpectralBands {
  const [bands, setBands] = useState<SpectralBands>(() => fftWorkerService.getLatestBands());

  useEffect(() => {
    return fftWorkerService.subscribe((newBands) => {
      setBands(newBands);
    });
  }, []);

  return bands;
}

