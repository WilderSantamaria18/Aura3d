import { useRef, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { FrequencyData } from '../types/audio';

export interface SmoothedAudioData {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  raw: Uint8Array;
}

export const useVisualizer = (smoothingFactor = 0.18) => {
  const { isPlaying, isMicActive } = usePlayerStore();
  const smoothedRef = useRef<SmoothedAudioData>({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    raw: new Uint8Array(128),
  });

  const getSmoothedData = useCallback((): SmoothedAudioData => {
    const current = smoothedRef.current;
    const fresh: FrequencyData = audioEngine.getFrequencyData();

    // If audio is completely silent, gently decay to resting state
    if (fresh.energy < 0.001 && !isPlaying && !isMicActive) {
      current.bass   *= 0.88;
      current.mids   *= 0.88;
      current.highs  *= 0.88;
      current.energy *= 0.88;
      if (current.bass   < 0.001) current.bass   = 0;
      if (current.mids   < 0.001) current.mids   = 0;
      if (current.highs  < 0.001) current.highs  = 0;
      if (current.energy < 0.001) current.energy = 0;
      current.raw.fill(0);
      return current;
    }

    // Asymmetric Audio Envelope (Instant 0-delay Attack, Snappy Release for distinct small-to-large pump)
    const attackFactor = 0.90; // Instant microsecond expansion on beat rise
    const bassDecayFactor = 0.24; // Snappy contraction back to small size between beats
    const generalDecay = smoothingFactor;

    const bassFactor   = fresh.bass   > current.bass   ? attackFactor : bassDecayFactor;
    const midsFactor   = fresh.mids   > current.mids   ? attackFactor * 0.85 : generalDecay;
    const highsFactor  = fresh.highs  > current.highs  ? attackFactor * 0.85 : generalDecay;
    const energyFactor = fresh.energy > current.energy ? attackFactor : generalDecay;

    current.bass   += (fresh.bass   - current.bass)   * bassFactor;
    current.mids   += (fresh.mids   - current.mids)   * midsFactor;
    current.highs  += (fresh.highs  - current.highs)  * highsFactor;
    current.energy += (fresh.energy - current.energy) * energyFactor;
    current.raw = fresh.raw;

    return current;
  }, [smoothingFactor, isPlaying, isMicActive]);

  return { getSmoothedData };
};
