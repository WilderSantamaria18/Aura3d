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

    // Silent state decay or rhythmic procedural pulse if playing (e.g. Spotify remote playback)
    if (sum === 0) {
      if (playerState.isPlaying) {
        const now = performance.now();
        // Continuous sub-millisecond timeline interpolated from last sync
        let timeSec: number;
        if (playerState.isSpotifyConnected && playerState.spotifySyncTimestamp > 0) {
          const elapsedSec = (now - playerState.spotifySyncTimestamp) * 0.001;
          timeSec = (playerState.spotifyProgressMs * 0.001) + elapsedSec;
        } else if (playerState.currentTime > 0) {
          timeSec = playerState.currentTime + ((now % 1000) * 0.001);
        } else {
          timeSec = now * 0.001;
        }

        const bpm = playerState.spotifyBpm || 124;
        const bps = bpm / 60; // Beats per second
        const currentBeat = timeSec * bps;
        const beatNumber = Math.floor(currentBeat);
        const beatPhase = currentBeat % 1.0; // 0.0 to 1.0 within current beat

        const energyMultiplier = Math.max(0.65, playerState.spotifyEnergy || 0.85);
        const danceMultiplier = Math.max(0.65, playerState.spotifyDanceability || 0.75);

        // Downbeat accent (beat 1 of measure in 4/4 time)
        const isDownbeat = (beatNumber % 4) === 0;
        const isBackbeat = (beatNumber % 2) === 1; // Beats 2 & 4: Snare / Clap

        // 1. Kick drum attack with exponential release curve
        const kickPunch = Math.pow(Math.max(0, 1.0 - beatPhase * 3.6), 2.2);
        const subBassDrop = isDownbeat ? Math.pow(Math.max(0, 1.0 - beatPhase * 2.0), 1.6) * 0.42 : 0;

        // 2. Snare / Clap transient on beats 2 & 4
        const snarePunch = isBackbeat ? Math.pow(Math.max(0, 1.0 - beatPhase * 4.2), 2.0) : 0;

        // 3. 8th-note Hi-hat tick
        const eighthPhase = (currentBeat * 2) % 1.0;
        const hiHatTick = Math.pow(Math.max(0, 1.0 - eighthPhase * 5.0), 3.0);

        // 4. Harmonic synth modulation & chord breathing
        const chordBreathing = (Math.sin(timeSec * (bps * 0.5) * Math.PI) + 1) * 0.5;
        const arpWave = Math.sin(timeSec * (bps * 4) * Math.PI);

        // Dynamic frequency levels
        const dynamicBass = Math.min(1.0, 0.22 + (kickPunch * 0.58 + subBassDrop) * energyMultiplier + chordBreathing * 0.06);
        const dynamicMids = Math.min(1.0, 0.18 + (snarePunch * 0.45 + chordBreathing * 0.20) * danceMultiplier + (arpWave > 0 ? arpWave * 0.10 : 0));
        const dynamicHighs = Math.min(1.0, 0.15 + (hiHatTick * 0.40 + snarePunch * 0.22) * energyMultiplier);
        const dynamicEnergy = Math.min(1.0, 0.24 + (kickPunch * 0.42 + snarePunch * 0.20 + chordBreathing * 0.14) * energyMultiplier);

        smoothedRef.current.bass = dynamicBass;
        smoothedRef.current.mids = dynamicMids;
        smoothedRef.current.highs = dynamicHighs;
        smoothedRef.current.energy = dynamicEnergy;

        // Populate raw FFT buffer with realistic acoustic harmonics so all visualizers dance to the real beat
        for (let i = 0; i < total; i++) {
          if (i < 8) {
            // Sub-bass & Kick frequencies (20Hz - 150Hz)
            const kickHarmonic = Math.cos((i / 8) * (Math.PI / 2));
            raw[i] = Math.min(255, Math.floor(dynamicBass * 255 * kickHarmonic));
          } else if (i < 64) {
            // Melodic & Harmonics range (150Hz - 2500Hz)
            const binNoteMod = Math.sin((i - 8) * 0.38 + timeSec * (bps * 2));
            const notePunch = (binNoteMod > 0 ? binNoteMod : 0) * (0.5 + 0.5 * arpWave);
            const val = (dynamicMids * 180 + notePunch * 70 * danceMultiplier) * (1 - (i - 8) / 70);
            raw[i] = Math.min(255, Math.max(0, Math.floor(val)));
          } else if (i < 128) {
            // High mids & snare transients (2.5kHz - 6kHz)
            const snareSpike = snarePunch * 160 * (1 - Math.abs((i - 90) / 40));
            raw[i] = Math.min(255, Math.max(0, Math.floor(dynamicMids * 90 + snareSpike)));
          } else {
            // Air & Treble (6kHz - 20kHz): Hi-hats & shimmer
            const hiHatSpike = hiHatTick * 140 * Math.random();
            const shimmer = Math.sin(i * 0.5 + timeSec * 12) * 15;
            raw[i] = Math.min(255, Math.max(0, Math.floor(dynamicHighs * 80 + hiHatSpike + shimmer)));
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
