import { AudioEngine } from './audioEngine';

export interface HarmonicKeyResult {
  key: string;         // e.g. "Do Menor" / "C Minor"
  shortKey: string;    // e.g. "Cm"
  mode: 'major' | 'minor';
  rootNote: string;    // e.g. "C"
  camelot: string;     // e.g. "5A"
  confidence: number;  // 0.0 to 1.0
  chromagram: number[]; // 12-element normalized array (C to B)
  harmonicEnergy: number; // overall audio activity
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SPANISH_NOTES: Record<string, string> = {
  'C': 'Do',
  'C#': 'Do#',
  'D': 'Re',
  'D#': 'Re#',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'G': 'Sol',
  'G#': 'Sol#',
  'A': 'La',
  'A#': 'La#',
  'B': 'Si',
};

// Camelot Wheel mapping for DJs (Root index 0=C, 1=C#, etc.)
// Major:
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
// Minor:
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

// Krumhansl-Schmuckler Key Profiles (12 semitones relative to tonic)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

class HarmonicAnalysisService {
  private static instance: HarmonicAnalysisService | null = null;
  private isRunning = false;
  private animFrameId: number | null = null;

  private smoothedChroma: number[] = new Array(12).fill(0);
  private lastResult: HarmonicKeyResult = {
    key: 'Detectando...',
    shortKey: '--',
    mode: 'major',
    rootNote: 'C',
    camelot: '--',
    confidence: 0,
    chromagram: new Array(12).fill(0),
    harmonicEnergy: 0,
  };

  private listeners: ((res: HarmonicKeyResult) => void)[] = [];
  private freqDataBuffer: Uint8Array | null = null;
  private lastEmitTime = 0;

  private constructor() {}

  public static getInstance(): HarmonicAnalysisService {
    if (!HarmonicAnalysisService.instance) {
      HarmonicAnalysisService.instance = new HarmonicAnalysisService();
    }
    return HarmonicAnalysisService.instance;
  }

  public subscribe(listener: (res: HarmonicKeyResult) => void): () => void {
    this.listeners.push(listener);
    listener(this.lastResult);

    if (!this.isRunning && this.listeners.length > 0) {
      this.start();
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      if (this.listeners.length === 0) {
        this.stop();
      }
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.analysisLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public getLastResult(): HarmonicKeyResult {
    return this.lastResult;
  }

  private analysisLoop = (): void => {
    if (!this.isRunning) return;

    const engine = AudioEngine.getInstance();
    const analyser = engine.analyser;
    const ctx = engine.audioContext;

    if (analyser && ctx && ctx.state === 'running') {
      if (!this.freqDataBuffer || this.freqDataBuffer.length !== analyser.frequencyBinCount) {
        this.freqDataBuffer = new Uint8Array(analyser.frequencyBinCount);
      }

      analyser.getByteFrequencyData(this.freqDataBuffer as any);
      this.processFftBins(this.freqDataBuffer, ctx.sampleRate, analyser.fftSize);
    }

    this.animFrameId = requestAnimationFrame(this.analysisLoop);
  };

  /**
   * Fold FFT bins into 12 chroma classes and correlate with Krumhansl-Schmuckler profiles
   */
  private processFftBins(freqData: Uint8Array, sampleRate: number, fftSize: number): void {
    const rawChroma = new Array(12).fill(0);
    const binCount = freqData.length;
    let totalEnergy = 0;

    // Analyze musical frequency range: 65 Hz (C2) to 2100 Hz (C7)
    const minBin = Math.max(1, Math.floor((65 * fftSize) / sampleRate));
    const maxBin = Math.min(binCount - 1, Math.ceil((2100 * fftSize) / sampleRate));

    for (let bin = minBin; bin <= maxBin; bin++) {
      const mag = freqData[bin];
      if (mag < 15) continue; // Noise floor cutoff

      const freq = (bin * sampleRate) / fftSize;
      // Convert frequency to MIDI pitch number
      const midi = 12 * (Math.log2(freq / 440)) + 69;
      const pitchClass = Math.round(midi) % 12;
      const normalizedPitch = ((pitchClass % 12) + 12) % 12;

      // Weight by square of magnitude to favor harmonic peaks over diffuse noise
      const weight = mag * mag;
      rawChroma[normalizedPitch] += weight;
      totalEnergy += weight;
    }

    // Normalize raw chromagram
    const maxVal = Math.max(...rawChroma, 1);
    const normalized = rawChroma.map((v) => v / maxVal);

    // Exponential smoothing for steady, non-jittery reading (alpha = 0.08)
    const alpha = 0.08;
    for (let i = 0; i < 12; i++) {
      this.smoothedChroma[i] = (1 - alpha) * this.smoothedChroma[i] + alpha * normalized[i];
    }

    // Only compute correlation and emit at ~6 Hz to preserve CPU cycles
    const now = performance.now();
    if (now - this.lastEmitTime < 160) return;
    this.lastEmitTime = now;

    if (totalEnergy < 1000) {
      // Audio is silent or too low
      return;
    }

    const { bestKey, bestMode, bestRoot, bestCamelot, bestScore } = this.correlateProfiles(this.smoothedChroma);

    const spanishRoot = SPANISH_NOTES[bestRoot] || bestRoot;
    const modeName = bestMode === 'major' ? 'Mayor' : 'Menor';
    const keyName = `${spanishRoot} ${modeName} (${bestRoot} ${bestMode === 'major' ? 'Maj' : 'Min'})`;
    const shortKey = `${bestRoot}${bestMode === 'minor' ? 'm' : ''}`;

    this.lastResult = {
      key: keyName,
      shortKey,
      mode: bestMode,
      rootNote: bestRoot,
      camelot: bestCamelot,
      confidence: Math.max(0, Math.min(1, (bestScore - 0.2) / 0.7)),
      chromagram: [...this.smoothedChroma],
      harmonicEnergy: totalEnergy,
    };

    this.listeners.forEach((l) => l(this.lastResult));
  }

  /**
   * Pearson correlation between candidate rotation and K-S profile
   */
  private correlateProfiles(chroma: number[]): {
    bestKey: string;
    bestMode: 'major' | 'minor';
    bestRoot: string;
    bestCamelot: string;
    bestScore: number;
  } {
    let bestScore = -Infinity;
    let bestRoot = 'C';
    let bestMode: 'major' | 'minor' = 'major';
    let bestCamelot = '8B';

    // 1. Test 12 Major scales
    for (let root = 0; root < 12; root++) {
      const score = this.pearsonCorrelation(chroma, MAJOR_PROFILE, root);
      if (score > bestScore) {
        bestScore = score;
        bestRoot = PITCH_CLASSES[root];
        bestMode = 'major';
        bestCamelot = CAMELOT_MAJOR[root];
      }
    }

    // 2. Test 12 Minor scales
    for (let root = 0; root < 12; root++) {
      const score = this.pearsonCorrelation(chroma, MINOR_PROFILE, root);
      if (score > bestScore) {
        bestScore = score;
        bestRoot = PITCH_CLASSES[root];
        bestMode = 'minor';
        bestCamelot = CAMELOT_MINOR[root];
      }
    }

    return {
      bestKey: `${bestRoot} ${bestMode}`,
      bestMode,
      bestRoot,
      bestCamelot,
      bestScore,
    };
  }

  private pearsonCorrelation(data: number[], profile: number[], shift: number): number {
    let sumX = 0;
    let sumY = 0;
    const n = 12;

    for (let i = 0; i < n; i++) {
      const rotatedIdx = (i + shift) % n;
      sumX += data[rotatedIdx];
      sumY += profile[i];
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const rotatedIdx = (i + shift) % n;
      const dx = data[rotatedIdx] - meanX;
      const dy = profile[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}

export const harmonicAnalysisService = HarmonicAnalysisService.getInstance();
