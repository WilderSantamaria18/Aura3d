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

    const playerState = usePlayerStore.getState();
    if (playerState.isPlaying && audioEngine.audioContext?.state === 'suspended') {
      audioEngine.audioContext.resume().catch(() => {});
    }

    // Silent state decay or rhythmic procedural pulse if playing
    if (sum === 0) {
      if (playerState.isPlaying) {
        const timeSec = playerState.currentTime > 0 ? playerState.currentTime : performance.now() * 0.001;
        // 116 BPM tempo (~1.93 beats per second) with strong transient sub-bass punch
        const beatPhase = (timeSec * 1.93) % 1.0;
        // Sharp kick attack envelope (exponential decay from 1.0 down to 0)
        const kickEnv = Math.pow(Math.max(0, 1.0 - beatPhase * 3.2), 2.5);
        const breath = (Math.sin(timeSec * 3.0) + 1) * 0.5;

        const dynamicBass = 0.22 + kickEnv * 0.55 + breath * 0.08;
        const dynamicMids = 0.18 + Math.sin(timeSec * 4.5) * 0.08 + kickEnv * 0.15;
        const dynamicHighs = 0.14 + Math.cos(timeSec * 6.0) * 0.06 + (beatPhase > 0.45 && beatPhase < 0.55 ? 0.25 : 0);
        const dynamicEnergy = 0.25 + kickEnv * 0.40;

        smoothedRef.current.bass = dynamicBass;
        smoothedRef.current.mids = dynamicMids;
        smoothedRef.current.highs = dynamicHighs;
        smoothedRef.current.energy = dynamicEnergy;

        // Populate raw FFT buffer so particle shaders and radial spikes dance to the beat
        for (let i = 0; i < total; i++) {
          if (i < 8) {
            raw[i] = Math.min(255, Math.floor((dynamicBass * 220) * (1 - i / 10)));
          } else if (i < 40) {
            raw[i] = Math.min(255, Math.floor(dynamicMids * 160 * (1 - (i - 8) / 35)));
          } else {
            raw[i] = Math.min(255, Math.floor(dynamicHighs * 100 * Math.random()));
          }
        }
      } else {
        smoothedRef.current.bass *= 0.88;
        smoothedRef.current.mids *= 0.88;
        smoothedRef.current.highs *= 0.88;
        smoothedRef.current.energy *= 0.88;
        for (let i = 0; i < total; i++) raw[i] = 0;
      }
      return smoothedRef.current;
    }

    // Frequency spectrum bands
    // Frequency spectrum bands: focus sub-bass & kick bins
    const bassEnd = Math.max(2, Math.floor(total * 0.12));
    const midsEnd = Math.max(bassEnd + 1, Math.floor(total * 0.60));

    // Weighted sub-bass: lower bins have higher multiplier for immediate kick punch
    let bassSum = 0;
    let bassWeights = 0;
    for (let i = 0; i < bassEnd; i++) {
      const w = i <= 3 ? 2.2 : 1.2;
      bassSum += raw[i] * w;
      bassWeights += w;
    }
    const rawBass = bassWeights > 0 ? bassSum / (bassWeights * 255) : 0;
    // Enhanced punch curve: explosive kick response with pristine clarity
    const bass = Math.min(1.0, Math.pow(rawBass, 1.15) * 1.55);

    let midsSum = 0;
    for (let i = bassEnd; i < midsEnd; i++) midsSum += raw[i];
    const mids = midsSum / ((midsEnd - bassEnd) * 255);

    let highsSum = 0;
    for (let i = midsEnd; i < total; i++) highsSum += raw[i];
    const highs = highsSum / ((total - midsEnd) * 255);

    const energy = Math.min(1.0, (sum / (total * 255)) * 1.25);

    // Asymmetric audio envelope: Instantaneous 0.92 attack for crisp kicks, musical organic decay
    const attackFactor = 0.92;
    const bassDecay = 0.20;
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
