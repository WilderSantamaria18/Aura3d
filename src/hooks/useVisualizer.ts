import { useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { audioEngine } from '../services/audioEngine';
import { clampDelta, decayForDt, rateForDt, REFERENCE_FPS } from '../utils/frameTiming';
import { getPlaybackTime } from '../services/playbackClock';

const STREAMING_KICK_PATTERNS = [0x1111, 0x0941, 0x4181, 0x4489] as const;

function hashTrackKey(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

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

export interface UseVisualizerOptions {
  /**
   * Suavizado, auto-gain y detector de bombo en función del tiempo real entre llamadas en lugar de
   * "por llamada". A 60 FPS el resultado es idéntico; a 30 o 144 FPS ya no cambia la velocidad de
   * respuesta. Opt-in: el resto de consumidores conserva su comportamiento por llamada.
   */
  timeBased?: boolean;
}

export const useVisualizer = (smoothingFactor = 0.2, options: UseVisualizerOptions = {}) => {
  const timeBased = options.timeBased === true;
  const lastCallRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(64));
  // Picos recientes por banda (auto-gain) y estado del detector de bombo
  const peaksRef = useRef({ bass: 1e-9, mids: 1e-9, highs: 1e-9 });
  const kickRef = useRef({ prev: 0, fluxAvg: 0, last: -1e9 });
  const streamingRef = useRef({ trackKey: '', seed: 0, lastStep: -1 });
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

    // Intervalo real desde la llamada anterior. Con timeBased, los factores calibrados a 60 FPS se
    // convierten a este dt; sin él se usan tal cual (comportamiento histórico, factor por llamada).
    const callNow = performance.now();
    const dt = timeBased
      ? clampDelta(lastCallRef.current > 0 ? (callNow - lastCallRef.current) / 1000 : 1 / REFERENCE_FPS)
      : 1 / REFERENCE_FPS;
    lastCallRef.current = callNow;
    const rate = (f: number) => (timeBased ? rateForDt(f, dt) : f);
    const decay = (f: number) => (timeBased ? decayForDt(f, dt) : f);

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
      const d = decay(0.9);
      smoothedRef.current.bass *= d;
      smoothedRef.current.mids *= d;
      smoothedRef.current.highs *= d;
      smoothedRef.current.energy *= d;
      for (let k = 0; k < 12; k++) smoothedRef.current.chroma[k] *= d;
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

    // Silent state decay or rhythmic procedural pulse if playing (e.g. Spotify remote playback / YouTube iframe)
    if (sum === 0) {
      if (playerState.isPlaying) {
        const now = performance.now();
        // El reloj compartido interpola YouTube/Spotify sin saltos hacia atrás entre sondeos.
        const timeSec = getPlaybackTime(now);
        const bpm = playerState.currentTrack?.bpm || playerState.spotifyBpm || 124;
        const bps = bpm / 60; // Beats per second
        const currentBeat = timeSec * bps;

        const trackKey = playerState.currentTrack?.spotifyUri || playerState.currentTrack?.youtubeId || playerState.currentTrack?.id || 'stream';
        const proxy = streamingRef.current;
        if (proxy.trackKey !== trackKey) {
          proxy.trackKey = trackKey;
          proxy.seed = hashTrackKey(trackKey);
          proxy.lastStep = -1;
        }

        const energyMultiplier = Math.max(0.75, Math.min(1.35, playerState.spotifyEnergy || 0.95));
        const danceMultiplier = Math.max(0.70, Math.min(1.35, playerState.spotifyDanceability || 0.88));

        // Secuenciador musical inteligente de 16 pasos:
        // Selecciona patrones con pulso rítmico coherente según el tempo y energía
        const stepFloat = currentBeat * 4;
        const stepNumber = Math.floor(stepFloat);
        const step = ((stepNumber % 16) + 16) % 16;
        const stepPhase = stepFloat - stepNumber;

        // Patrones con sólida ancla rítmica:
        // 0x1111: Four-on-the-floor (pasos 0, 4, 8, 12 - dance, pop, disco, electrónica)
        // 0x1010: Downbeat + beat 3 (pasos 0, 8 - trap, hip-hop, baladas)
        // 0x4489: Dembow / urbano (pasos 0, 3, 7, 10, 14 - reggaeton, funk)
        // 0x1151: Funk groove (pasos 0, 4, 6, 8, 12)
        const rhythmicPatterns = [0x1111, 0x1010, 0x4489, 0x1151] as const;
        let patternIndex = 0;
        if (bpm > 118 || danceMultiplier > 0.84) {
          patternIndex = 0; // Four-on-the-floor
        } else if (bpm < 96) {
          patternIndex = 1; // Half-time hip-hop / trap
        } else {
          patternIndex = 2 + (proxy.seed % 2); // Dembow o funk groove
        }

        const kickPattern = rhythmicPatterns[patternIndex];
        const kickOn = ((kickPattern >>> step) & 1) === 1;
        const snareOn = step === 4 || step === 12;
        const hatOn = step % 2 === 0 || (danceMultiplier > 0.80 && step % 2 === 1);
        const isDownbeat = step === 0;

        if (stepNumber !== proxy.lastStep) {
          proxy.lastStep = stepNumber;
          if (kickOn) {
            const seededAccent = 0.88 + (((proxy.seed >>> (step % 8)) & 3) / 3) * 0.12;
            const strength = (isDownbeat ? 1.0 : 0.76 + danceMultiplier * 0.18) * seededAccent;
            smoothedRef.current.kick = true;
            smoothedRef.current.kickStrength = Math.min(1.0, strength * energyMultiplier);
          }
        }

        // Envolventes musicales: ataque rápido y caída natural
        const kickPunch = kickOn ? Math.pow(Math.max(0, 1 - stepPhase * 1.5), 1.6) : 0;
        const subTail = kickOn ? Math.pow(Math.max(0, 1 - stepPhase * 0.8), 1.2) : 0;
        const snarePunch = snareOn ? Math.pow(Math.max(0, 1 - stepPhase * 1.9), 1.5) : 0;
        const hiHatTick = hatOn ? Math.pow(Math.max(0, 1 - stepPhase * 2.8), 1.7) : 0;

        // Presencia continua de bajo y armonía a plena potencia (ondas vivas al máximo)
        const barPhase = ((currentBeat / 4) + (proxy.seed % 11) * 0.07) % 1;
        const basslineGroove = 0.42 + 0.18 * Math.sin(currentBeat * Math.PI + (proxy.seed % 7)) + 0.09 * Math.cos(currentBeat * 0.5 * Math.PI);
        const chordBreathing = 0.40 + 0.20 * Math.sin(barPhase * Math.PI * 2) + 0.10 * Math.sin(currentBeat * Math.PI + (proxy.seed % 17));
        const airFloor = 0.34 + 0.14 * Math.sin(currentBeat * 2 * Math.PI + proxy.seed * 0.002);

        const dynamicBass = Math.min(1.0, (basslineGroove + kickPunch * 0.65 + subTail * 0.32) * energyMultiplier * 1.15);
        const dynamicMids = Math.min(1.0, (chordBreathing + snarePunch * 0.50) * danceMultiplier * 1.15);
        const dynamicHighs = Math.min(1.0, (airFloor + hiHatTick * 0.52 + snarePunch * 0.20) * energyMultiplier * 1.15);
        const dynamicEnergy = Math.min(1.0, (dynamicBass * 0.46 + dynamicMids * 0.34 + dynamicHighs * 0.20) * 1.12);

        smoothedRef.current.bass += (dynamicBass - smoothedRef.current.bass) * rate(dynamicBass > smoothedRef.current.bass ? 0.94 : 0.24);
        smoothedRef.current.mids += (dynamicMids - smoothedRef.current.mids) * rate(dynamicMids > smoothedRef.current.mids ? 0.88 : 0.20);
        smoothedRef.current.highs += (dynamicHighs - smoothedRef.current.highs) * rate(dynamicHighs > smoothedRef.current.highs ? 0.94 : 0.28);
        smoothedRef.current.energy += (dynamicEnergy - smoothedRef.current.energy) * rate(dynamicEnergy > smoothedRef.current.energy ? 0.90 : 0.20);

        // Notas armónicas acordes al compás con plena definición
        const root = proxy.seed % 12;
        const chordStep = Math.floor(currentBeat / 4) % 4;
        const progression = [0, 5, 3, 7];
        const chordRoot = (root + progression[chordStep]) % 12;
        const chroma = smoothedRef.current.chroma;
        for (let k = 0; k < 12; k++) {
          const distance = (k - chordRoot + 12) % 12;
          const target = distance === 0 ? 0.88 : distance === 3 || distance === 4 ? 0.64 : distance === 7 ? 0.52 : 0.08;
          chroma[k] += (target - chroma[k]) * rate(0.20);
        }

        // Espectro de frecuencias sintetizado orgánico (sub-graves, medios y agudos ricos a toda potencia)
        for (let i = 0; i < total; i++) {
          const ratio = i / Math.max(1, total - 1);
          let value: number;
          if (ratio < 0.12) {
            // Cúpula acústica de sub-graves y bombo con empuje
            const subHump = Math.sin((ratio / 0.12) * Math.PI);
            value = dynamicBass * 255 * (0.82 + 0.24 * subHump);
          } else if (ratio < 0.48) {
            // Rango melódico y armónicos vocales
            const midRatio = (ratio - 0.12) / 0.36;
            const harmonic = 0.76 + 0.24 * Math.sin(i * 0.48 + currentBeat * 1.5 + (proxy.seed % 13));
            value = dynamicMids * 240 * harmonic * Math.pow(1 - midRatio * 0.45, 0.82);
          } else {
            // Brillo, platillos y aire de alta frecuencia
            const highRatio = (ratio - 0.48) / 0.52;
            const shimmer = 0.70 + 0.30 * Math.sin(i * 1.15 + stepFloat * 0.7 + (proxy.seed % 19));
            value = dynamicHighs * 215 * shimmer * Math.pow(1 - highRatio * 0.60, 0.95);
          }
          raw[i] = Math.max(0, Math.min(255, Math.round(value)));
        }
      } else {
        const d = decay(0.88);
        smoothedRef.current.bass *= d;
        smoothedRef.current.mids *= d;
        smoothedRef.current.highs *= d;
        smoothedRef.current.energy *= d;
        for (let k = 0; k < 12; k++) smoothedRef.current.chroma[k] *= d;
        for (let i = 0; i < total; i++) raw[i] = 0;
      }
      return smoothedRef.current;
    }

    // ── Bandas por Hz (independiente de la sample rate del dispositivo) ──
    const sampleRate = activeAnalyser.context?.sampleRate || 48000;
    const binHz = sampleRate / activeAnalyser.fftSize;
    const toBin = (hz: number) => Math.max(0, Math.min(total - 1, Math.round(hz / binHz)));

    // Bins delimitados con precisión musical:
    const bassLo = Math.max(1, toBin(25)); // Evita Bin 0 (DC offset / ruido eléctrico)
    const bassHi = Math.max(bassLo + 1, toBin(260)); // Sub-bass (40-80Hz) + Kick fundamental + Bajo (hasta 260Hz)
    const midHi = Math.max(bassHi + 2, toBin(3200)); // Cuerpo vocal, guitarras, caja, sintetizadores
    const highHi = Math.max(midHi + 2, Math.min(total - 1, toBin(16000))); // Hi-hats, platillos, brillo, aire

    // ── Respuesta Perceptual de Amplitud (Potencia ponderada) ──
    // En lugar de una conversión lineal estricta que pulveriza la dinámica,
    // usamos una ponderación perceptual acústica con gamma suave.
    let bassSum = 0;
    let bassWeights = 0;
    for (let i = bassLo; i <= bassHi; i++) {
      const hz = i * binHz;
      // Los bins de 45Hz a 125Hz contienen el golpe principal del bombo
      const kickWeight = hz >= 45 && hz <= 125 ? 1.6 : 1.0;
      const val = raw[i] / 255;
      bassSum += Math.pow(val, 1.25) * kickWeight;
      bassWeights += kickWeight;
    }
    const bassRaw = bassWeights > 0 ? bassSum / bassWeights : 0;

    let midsSum = 0;
    for (let i = bassHi + 1; i <= midHi; i++) {
      midsSum += Math.pow(raw[i] / 255, 1.15);
    }
    const midsRaw = midsSum / Math.max(1, midHi - bassHi);

    let highsSum = 0;
    for (let i = midHi + 1; i <= highHi; i++) {
      highsSum += Math.pow(raw[i] / 255, 1.1);
    }
    const highsRaw = highsSum / Math.max(1, highHi - midHi);

    const rawEnergy = Math.min(1.0, (sum / (total * 255)) * 1.25);

    // ── Auto-gain adaptativo: cada banda se calibra contra su pico reciente ──
    // Decaimiento optimizado: recuperación en ~1.8 s (decay 0.993) para que pasajes suaves
    // tras un golpe fuerte recuperen la expresividad inmediatamente.
    const peaks = peaksRef.current;
    const norm = (v: number, key: 'bass' | 'mids' | 'highs', minFloor: number) => {
      peaks[key] = Math.max(v, peaks[key] * decay(0.993));
      const targetPeak = Math.max(peaks[key], minFloor);
      return Math.min(1.0, v / targetPeak);
    };

    const bass = Math.min(1.0, Math.pow(norm(bassRaw, 'bass', 0.035), 0.75) * 1.42);
    const mids = Math.min(1.0, Math.pow(norm(midsRaw, 'mids', 0.030), 0.74) * 1.38);
    const highs = Math.min(1.0, Math.pow(norm(highsRaw, 'highs', 0.022), 0.72) * 1.42);
    const energy = Math.min(1.0, (bass * 0.48 + mids * 0.34 + highs * 0.18) * 1.15 + rawEnergy * 0.08);

    // ── Detector de bombo: flujo positivo de transitorios de graves ──
    const kd = kickRef.current;
    const nowMs = performance.now();
    const flux = Math.max(0, bassRaw - kd.prev) * (timeBased ? 1 / (REFERENCE_FPS * dt) : 1);
    kd.prev = bassRaw;
    const bassPeak = Math.max(peaks.bass, 0.06);

    // Umbral musical calibrado: detecta con precisión el ataque de los bombos reales
    const fluxThreshold = kd.fluxAvg * (0.80 + kickSensitivity * 0.40) + bassPeak * 0.020;
    const isMinBassSatisfied = bassRaw > bassPeak * 0.14;
    const isRefractoryPassed = nowMs - kd.last > 125; // Permite bombos rápidos hasta 240 BPM

    if (flux > fluxThreshold && isMinBassSatisfied && isRefractoryPassed) {
      kd.last = nowMs;
      smoothedRef.current.kick = true;
      const kickImpulseRatio = (flux - fluxThreshold) / Math.max(0.01, bassPeak * 0.20);
      smoothedRef.current.kickStrength = Math.min(1.0, Math.max(0.55, 0.60 + kickImpulseRatio * 0.40));
    }
    kd.fluxAvg += (flux - kd.fluxAvg) * rate(0.09);

    // Envolvente asimétrica de alta fidelidad: ataque instantáneo y caída orgánica
    const attackFactor = 0.92;
    const bassDecay = 0.22;
    const midsDecay = 0.18;
    const highsDecay = 0.28;
    const energyDecay = 0.18;

    const bFactor = rate(bass > smoothedRef.current.bass ? attackFactor : bassDecay);
    const mFactor = rate(mids > smoothedRef.current.mids ? attackFactor : midsDecay);
    const hFactor = rate(highs > smoothedRef.current.highs ? attackFactor : highsDecay);
    const eFactor = rate(energy > smoothedRef.current.energy ? attackFactor : energyDecay);

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
  }, [smoothingFactor, timeBased]);

  return { getSmoothedData };
};
