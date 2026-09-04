import { useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { audioEngine } from '../services/audioEngine';

export interface SmoothedAudioData {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  raw: Uint8Array;
}

export const useVisualizer = (smoothingFactor = 0.2) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(64));
  const smoothedRef = useRef<SmoothedAudioData>({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    raw: new Uint8Array(64),
  });

  const getSmoothedData = useCallback((): SmoothedAudioData => {
    // 1. Dynamically retrieve live AnalyserNode from AudioEngine singleton or store
    const currentAnalyser = audioEngine.analyser || usePlayerStore.getState().analyser;
    if (currentAnalyser && analyserRef.current !== currentAnalyser) {
      analyserRef.current = currentAnalyser;
      const binCount = currentAnalyser.frequencyBinCount || 64;
      dataArrayRef.current = new Uint8Array(binCount);
      smoothedRef.current.raw = new Uint8Array(binCount);
    }

    const activeAnalyser = analyserRef.current || currentAnalyser;

    if (!activeAnalyser) {
      smoothedRef.current.bass *= 0.9;
      smoothedRef.current.mids *= 0.9;
      smoothedRef.current.highs *= 0.9;
      smoothedRef.current.energy *= 0.9;
      return smoothedRef.current;
    }

    if (dataArrayRef.current.length !== activeAnalyser.frequencyBinCount) {
      const binCount = activeAnalyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(binCount);
      smoothedRef.current.raw = new Uint8Array(binCount);
    }

    const raw = dataArrayRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeAnalyser.getByteFrequencyData(raw as any);

    const total = raw.length;
    let sum = 0;
    for (let i = 0; i < total; i++) {
      sum += raw[i];
    }

    // Silent state decay
    if (sum === 0) {
      smoothedRef.current.bass *= 0.88;
      smoothedRef.current.mids *= 0.88;
      smoothedRef.current.highs *= 0.88;
      smoothedRef.current.energy *= 0.88;
      return smoothedRef.current;
    }

    // Frequency spectrum bands
    const bassEnd = Math.max(1, Math.floor(total * 0.15));
    const midsEnd = Math.max(bassEnd + 1, Math.floor(total * 0.65));

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += raw[i];
    const rawBass = bassSum / (bassEnd * 255);
    const bass = Math.min(1.0, Math.pow(rawBass, 1.1) * 1.45);

    let midsSum = 0;
    for (let i = bassEnd; i < midsEnd; i++) midsSum += raw[i];
    const mids = midsSum / ((midsEnd - bassEnd) * 255);

    let highsSum = 0;
    for (let i = midsEnd; i < total; i++) highsSum += raw[i];
    const highs = highsSum / ((total - midsEnd) * 255);

    const energy = sum / (total * 255);

    // Asymmetric audio envelope for responsive beat attack & smooth organic decay
    const attackFactor = 0.85;
    const bassDecay = 0.22;
    const genDecay = smoothingFactor;

    const bFactor = bass > smoothedRef.current.bass ? attackFactor : bassDecay;
    const mFactor = mids > smoothedRef.current.mids ? attackFactor : genDecay;
    const hFactor = highs > smoothedRef.current.highs ? attackFactor : genDecay;
    const eFactor = energy > smoothedRef.current.energy ? attackFactor : genDecay;

    smoothedRef.current.bass += (bass - smoothedRef.current.bass) * bFactor;
    smoothedRef.current.mids += (mids - smoothedRef.current.mids) * mFactor;
    smoothedRef.current.highs += (highs - smoothedRef.current.highs) * hFactor;
    smoothedRef.current.energy += (energy - smoothedRef.current.energy) * eFactor;
    smoothedRef.current.raw = raw;

    return {
      bass: Math.min(1.0, Math.max(0, smoothedRef.current.bass)),
      mids: Math.min(1.0, Math.max(0, smoothedRef.current.mids)),
      highs: Math.min(1.0, Math.max(0, smoothedRef.current.highs)),
      energy: Math.min(1.0, Math.max(0, smoothedRef.current.energy)),
      raw,
    };
  }, [smoothingFactor]);

  return { getSmoothedData };
};
