import { useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { audioEngine } from '../services/audioEngine';

export interface SmoothedAudioData {
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  raw: Uint8Array;
  /** Energía de las 12 notas (0 = Do … 11 = Si), normalizada 0..1 */
  chroma: Float32Array;
  /** true solo en la llamada en que se detecta un golpe de bombo */
  kick: boolean;
  /** Fuerza del golpe (0..1); 0 si no hay kick */
  kickStrength: number;
}

export const useVisualizer = (smoothingFactor = 0.2) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(64));
  // Picos recientes por banda (auto-gain) y estado del detector de bombo
  const peaksRef = useRef({ bass: 1e-9, mids: 1e-9, highs: 1e-9 });
  const kickRef = useRef({ prev: 0, fluxAvg: 0, last: -1e9, lastBeat: -1 });
  const smoothedRef = useRef<SmoothedAudioData>({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    raw: new Uint8Array(64),
    chroma: new Float32Array(12),
    kick: false,
    kickStrength: 0,
  });

  /**
   * @param kickSensitivity cuánto debe sobresalir el flujo de graves para contar como bombo
   *        (menor = más golpes). 3 es el valor calibrado con música real.
   */
  const getSmoothedData = useCallback((kickSensitivity = 3): SmoothedAudioData => {
    smoothedRef.current.kick = false;
    smoothedRef.current.kickStrength = 0;

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
      for (let k = 0; k < 12; k++) smoothedRef.current.chroma[k] *= 0.9;
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
        if (beatNumber !== kickRef.current.lastBeat) {
          kickRef.current.lastBeat = beatNumber;
          smoothedRef.current.kick = true;
          smoothedRef.current.kickStrength = isDownbeat ? 1 : 0.7;
        }

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

        // Sin señal real (Spotify/iframe): notas de una escala menor al compás para mantener vivas las auroras
        const scale = [0, 3, 5, 7, 10, 12];
        const noteIdx = Math.floor(currentBeat * 0.5) % scale.length;
        const chroma = smoothedRef.current.chroma;
        for (let k = 0; k < 12; k++) {
          const target = k === scale[noteIdx] % 12 ? 0.55 + kickPunch * 0.4 : k === scale[(noteIdx + 2) % scale.length] % 12 ? 0.35 : 0.04;
          chroma[k] += (target - chroma[k]) * 0.2;
        }

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
        for (let k = 0; k < 12; k++) smoothedRef.current.chroma[k] *= 0.88;
        for (let i = 0; i < total; i++) raw[i] = 0;
      }
      return smoothedRef.current;
    }

    // ── Bandas por Hz (independiente de la sample rate del dispositivo) ──
    const sampleRate = activeAnalyser.context?.sampleRate || 48000;
    const binHz = sampleRate / activeAnalyser.fftSize;
    const toBin = (hz: number) => Math.max(0, Math.min(total - 1, Math.round(hz / binHz)));

    const bassLo = 0;
    const bassHi = Math.max(1, toBin(250)); // sub-bajo + kick
    const midHi = Math.max(bassHi + 2, toBin(2500)); // cuerpo, voces, snare
    const highHi = Math.max(midHi + 2, Math.min(total - 1, toBin(16000))); // brillo / hats

    // ── Bandas en amplitud LINEAL ──
    // Los bytes del analizador están en dB: comprimen tanto la dinámica que, con música
    // masterizada, los graves quedan pegados a 1.0 y un bombo nunca "sobresale". Medido con
    // canciones reales: el detector por bytes acertaba 0–9 % de los golpes; en lineal, 56–77 %.
    const minDb = activeAnalyser.minDecibels;
    const dbRange = activeAnalyser.maxDecibels - minDb;
    const lin = (byte: number) => Math.pow(10, (minDb + (byte / 255) * dbRange) / 20);

    let bassLinSum = 0;
    let bassWeights = 0;
    for (let i = bassLo; i <= bassHi; i++) {
      const w = i <= 1 ? 1.6 : 1.0; // el kick vive en los bins más graves
      bassLinSum += lin(raw[i]) * w;
      bassWeights += w;
    }
    const bassLin = bassWeights > 0 ? bassLinSum / bassWeights : 0;

    let midsLinSum = 0;
    for (let i = bassHi + 1; i <= midHi; i++) midsLinSum += lin(raw[i]);
    const midsLin = midsLinSum / Math.max(1, midHi - bassHi);

    let highsLinSum = 0;
    for (let i = midHi + 1; i <= highHi; i++) highsLinSum += lin(raw[i]);
    const highsLin = highsLinSum / Math.max(1, highHi - midHi);

    const rawEnergy = Math.min(1.0, (sum / (total * 255)) * 1.25);

    // ── Auto-gain: cada banda se normaliza contra su pico reciente ──
    // El suelo evita amplificar el ruido en pasajes casi silenciosos.
    const peaks = peaksRef.current;
    const norm = (v: number, key: 'bass' | 'mids' | 'highs', floor: number) => {
      peaks[key] = Math.max(v, peaks[key] * 0.998);
      return Math.min(1, v / Math.max(peaks[key], floor));
    };
    const bass = norm(bassLin, 'bass', 2e-3);
    const mids = Math.pow(norm(midsLin, 'mids', 1e-3), 0.8);
    const highs = Math.pow(norm(highsLin, 'highs', 5e-4), 0.8);
    const energy = Math.min(1.0, (bass * 0.5 + mids * 0.35 + highs * 0.15) * 1.1 + rawEnergy * 0.1);

    // ── Detector de bombo: flujo positivo de graves (amplitud lineal) ──
    const kd = kickRef.current;
    const nowMs = performance.now();
    const flux = Math.max(0, bassLin - kd.prev);
    kd.prev = bassLin;
    const bassPeak = peaks.bass;
    if (flux > kd.fluxAvg * kickSensitivity + bassPeak * 0.02 && bassLin > bassPeak * 0.25 && nowMs - kd.last > 140) {
      kd.last = nowMs;
      smoothedRef.current.kick = true;
      smoothedRef.current.kickStrength = Math.min(1, 0.35 + (flux / (bassPeak * 0.15)) * 0.65);
    }
    kd.fluxAvg += (flux - kd.fluxAvg) * 0.08;

    // Envolvente asimétrica: ataque casi instantáneo (kicks nítidos) y caída orgánica
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
    smoothedRef.current.chroma = audioEngine.getChroma();

    return {
      bass: Math.min(1.0, Math.max(0, smoothedRef.current.bass)),
      mids: Math.min(1.0, Math.max(0, smoothedRef.current.mids)),
      highs: Math.min(1.0, Math.max(0, smoothedRef.current.highs)),
      energy: Math.min(1.0, Math.max(0, smoothedRef.current.energy)),
      raw,
      chroma: smoothedRef.current.chroma,
      kick: smoothedRef.current.kick,
      kickStrength: smoothedRef.current.kickStrength,
    };
  }, [smoothingFactor]);

  return { getSmoothedData };
};
