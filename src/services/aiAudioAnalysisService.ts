/**
 * aiAudioAnalysisService.ts — Motor de Análisis de Audio en Tiempo Real & Paleta Dinámica Global
 *
 * Características extraídas (FFT 2048):
 * - RMS (volumen general percibido)
 * - Spectral Centroid (brillo / centro de masa espectral)
 * - Spectral Flux (cambios transientes / energía de impacto)
 * - Chroma (distribución de 12 clases de tonos musicales: C a B)
 * - Energy Bands: Bass (20-250Hz), Mids (250-4000Hz), Treble (4000-20000Hz)
 * - Tempo / Beat Pulse: Detección adaptativa de golpes graves
 * - Mood Classification (4 cuadrantes):
 *     1. Energético (High Arousal, High Valence) -> Neones eléctricos saturados
 *     2. Feliz / Sunset (Med-High Arousal, High Valence) -> Ámbar cálido, dorados, coral
 *     3. Relajado / Celestial (Low Arousal, High Valence) -> Pasteles suaves, violeta, menta
 *     4. Melancólico / Deep (Low Arousal, Low Valence) -> Cian oceánico, índigo, azul noche
 *
 * Mapeo OKLCH / HSL con LERP (200-300ms) e inyección directa en :root CSS.
 */

import { usePlayerStore } from '../stores/playerStore';
import { hslToHex } from '../utils/colorUtils';

export type AIMood = 'energetic' | 'happy' | 'chill' | 'melancholic';

export interface AIAudioFeatures {
  rms: number;                    // 0.0 - 1.0 (Root Mean Square energy)
  spectralCentroid: number;       // 0.0 - 1.0 (Audio brightness)
  spectralFlux: number;           // Instantaneous transient delta
  dominantPitch: string;          // e.g. "A", "C#", "F"
  chroma: number[];               // 12 pitch class distribution
  bassEnergy: number;             // 0.0 - 1.0
  midEnergy: number;              // 0.0 - 1.0
  trebleEnergy: number;           // 0.0 - 1.0
  isBeat: boolean;                // Onset beat pulse trigger
  mood: AIMood;                   // 4-quadrant classification
  valence: number;                // Positivity / harmonic brightness (-1 to 1)
  arousal: number;                // Musical intensity / activation (0 to 1)
  bloomModulation: number;        // Dynamic bloom breathing factor (1.20 - 1.45)
}

export interface AIDynamicPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  bgAtmosphere: string;
  beatPulse: number;              // 0.0 to 1.0 decay
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

class AIAudioAnalysisService {
  private isRunning = false;
  private animId: number | null = null;
  private prevFft: Float32Array | null = null;

  // LERP Smoothed Color Components
  private currentPrimaryHue = 190;      // Degrees [0 - 360]
  private currentSecondaryHue = 320;
  private currentAccentHue = 270;
  private currentSaturation = 0.90;     // [0.0 - 1.0]
  private currentLightness = 0.55;      // [0.0 - 1.0]
  private smoothedRms = 0.1;
  private smoothedCentroid = 0.3;
  private smoothedBass = 0.2;
  private smoothedMids = 0.2;
  private smoothedTreble = 0.2;
  private beatPulse = 0.0;

  // Rolling energy history for beat threshold
  private energyHistory: number[] = [];
  private lastBeatTime = 0;

  private currentFeatures: AIAudioFeatures = {
    rms: 0.1,
    spectralCentroid: 0.3,
    spectralFlux: 0.0,
    dominantPitch: 'A',
    chroma: new Array(12).fill(0),
    bassEnergy: 0.2,
    midEnergy: 0.2,
    trebleEnergy: 0.2,
    isBeat: false,
    mood: 'chill',
    valence: 0.2,
    arousal: 0.3,
    bloomModulation: 1.33,
  };

  private currentPalette: AIDynamicPalette = {
    primary: '#00f2fe',
    secondary: '#ff007f',
    accent: '#a855f7',
    glow: 'rgba(0, 242, 254, 0.45)',
    bgAtmosphere: '#060814',
    beatPulse: 0.0,
  };

  private listeners = new Set<(features: AIAudioFeatures, palette: AIDynamicPalette) => void>();
  private cssUpdateCounter = 0;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public getFeatures(): AIAudioFeatures {
    return this.currentFeatures;
  }

  public getPalette(): AIDynamicPalette {
    return this.currentPalette;
  }

  public subscribe(fn: (features: AIAudioFeatures, palette: AIDynamicPalette) => void): () => void {
    this.listeners.add(fn);
    fn(this.currentFeatures, this.currentPalette);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const state = usePlayerStore.getState();
    const analyser = state.analyser;
    const isPlaying = state.isPlaying;

    if (analyser && isPlaying) {
      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(data);

      const sampleRate = analyser.context.sampleRate || 44100;
      const nyquist = sampleRate / 2;
      const binHz = nyquist / bufferLength;

      // ── 1. RMS & Multiband Energy ──
      let sumSquares = 0;
      let bassSum = 0;
      let bassCount = 0;
      let midSum = 0;
      let midCount = 0;
      let trebleSum = 0;
      let trebleCount = 0;

      // ── 2. Spectral Centroid ──
      let weightedSum = 0;
      let totalMagnitude = 0;

      // ── 3. Spectral Flux ──
      if (!this.prevFft || this.prevFft.length !== bufferLength) {
        this.prevFft = new Float32Array(bufferLength);
      }
      let flux = 0;

      // ── 4. Chroma (12 Pitch Classes) ──
      const chroma = new Array(12).fill(0);
      const chromaCount = new Array(12).fill(0);

      for (let i = 1; i < bufferLength; i++) {
        const val = data[i] / 255;
        sumSquares += val * val;

        const freq = i * binHz;
        weightedSum += freq * val;
        totalMagnitude += val;

        // Flux: half-wave rectification of onset increase
        const prevVal = this.prevFft[i];
        if (val > prevVal) {
          flux += (val - prevVal);
        }
        this.prevFft[i] = val;

        // Band segmentation
        if (freq < 250) {
          bassSum += val;
          bassCount++;
        } else if (freq < 4000) {
          midSum += val;
          midCount++;
        } else {
          trebleSum += val;
          trebleCount++;
        }

        // Chroma pitch class mapping (A4 = 440 Hz = pitch class 9)
        if (freq >= 65 && freq <= 2100 && val > 0.05) {
          const midi = Math.round(69 + 12 * Math.log2(freq / 440));
          const pitchClass = ((midi % 12) + 12) % 12;
          chroma[pitchClass] += val;
          chromaCount[pitchClass]++;
        }
      }

      // Normalize features
      const rawRms = Math.sqrt(sumSquares / bufferLength);
      const rawCentroid = totalMagnitude > 0 ? (weightedSum / totalMagnitude) / nyquist : 0.2;
      const rawBass = bassCount > 0 ? bassSum / bassCount : 0;
      const rawMids = midCount > 0 ? midSum / midCount : 0;
      const rawTreble = trebleCount > 0 ? trebleSum / trebleCount : 0;

      // Normalize Chroma
      let maxChroma = 0;
      let dominantPitchIdx = 9; // default A
      for (let c = 0; c < 12; c++) {
        if (chromaCount[c] > 0) {
          chroma[c] = chroma[c] / chromaCount[c];
        }
        if (chroma[c] > maxChroma) {
          maxChroma = chroma[c];
          dominantPitchIdx = c;
        }
      }
      const dominantPitch = PITCH_NAMES[dominantPitchIdx];

      // ── 5. Beat Pulse Detection (Onset in Sub-Bass) ──
      const now = performance.now();
      let isBeat = false;
      this.energyHistory.push(rawBass);
      if (this.energyHistory.length > 30) this.energyHistory.shift();
      const avgBass = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

      if (rawBass > Math.max(0.38, avgBass * 1.30) && (now - this.lastBeatTime) > 270) {
        isBeat = true;
        this.lastBeatTime = now;
        this.beatPulse = 1.0;
      } else {
        // Fast decay on beat pulse
        this.beatPulse = Math.max(0.0, this.beatPulse - 0.08);
      }

      // ── 6. LERP Smoothing for Audio Metrics ──
      const lerpFactor = 0.16; // ~200-250ms smoothing window
      this.smoothedRms += (rawRms - this.smoothedRms) * lerpFactor;
      this.smoothedCentroid += (rawCentroid - this.smoothedCentroid) * lerpFactor;
      this.smoothedBass += (rawBass - this.smoothedBass) * lerpFactor;
      this.smoothedMids += (rawMids - this.smoothedMids) * lerpFactor;
      this.smoothedTreble += (rawTreble - this.smoothedTreble) * lerpFactor;

      // ── 7. Mood Classification (Valence / Arousal Quadrants) ──
      // Arousal: Musical energy, tempo and brightness [0.0 to 1.0]
      const arousal = Math.min(1.0, Math.max(0.0, this.smoothedRms * 0.50 + this.smoothedBass * 0.30 + this.smoothedCentroid * 0.20));

      // Valence: Harmonic positivity derived from major thirds vs minor thirds consonance
      const majorTriadSum = chroma[0] + chroma[4] + chroma[7] + chroma[5] + chroma[9];
      const minorTriadSum = chroma[1] + chroma[3] + chroma[6] + chroma[8] + chroma[10];
      const harmonicRatio = (majorTriadSum + 0.01) / (minorTriadSum + majorTriadSum + 0.02);
      const valence = Math.min(1.0, Math.max(-1.0, (harmonicRatio - 0.5) * 2.0 + (this.smoothedTreble - this.smoothedBass) * 0.4));

      let mood: AIMood = 'chill';
      if (arousal >= 0.55 && valence >= 0.0) {
        mood = 'energetic';
      } else if (arousal >= 0.45 && valence >= 0.15) {
        mood = 'happy';
      } else if (arousal < 0.45 && valence < 0.0) {
        mood = 'melancholic';
      } else {
        mood = 'chill';
      }

      // ── 8. OKLCH / HSL Dynamic Palette Mapping ──
      let targetBaseHue = 190;
      switch (mood) {
        case 'energetic':
          targetBaseHue = (180 + this.smoothedBass * 140) % 360;
          break;
        case 'happy':
          targetBaseHue = 35 + this.smoothedBass * 45;
          break;
        case 'chill':
          targetBaseHue = 250 + this.smoothedCentroid * 60;
          break;
        case 'melancholic':
          targetBaseHue = 210 + this.smoothedBass * 30;
          break;
      }

      // Fine tune Hue with Spectral Centroid
      targetBaseHue = (targetBaseHue + (this.smoothedCentroid - 0.3) * 40 + 360) % 360;

      // Mid Energy -> Saturation
      const targetSat = Math.min(1.0, Math.max(0.72, 0.80 + this.smoothedMids * 0.20 + (mood === 'energetic' ? 0.08 : 0)));

      // Treble Energy -> Lightness
      const targetLight = Math.min(0.72, Math.max(0.42, 0.48 + this.smoothedTreble * 0.22 + this.beatPulse * 0.05));

      // Continuous LERP Hue without wrap leaps
      let hueDiff = targetBaseHue - this.currentPrimaryHue;
      if (hueDiff > 180) hueDiff -= 360;
      if (hueDiff < -180) hueDiff += 360;
      this.currentPrimaryHue = (this.currentPrimaryHue + hueDiff * 0.08 + 360) % 360;

      this.currentSecondaryHue = (this.currentPrimaryHue + 145) % 360;
      this.currentAccentHue = (this.currentPrimaryHue + 215) % 360;

      this.currentSaturation += (targetSat - this.currentSaturation) * 0.10;
      this.currentLightness += (targetLight - this.currentLightness) * 0.10;

      const primaryHex = hslToHex(this.currentPrimaryHue / 360, this.currentSaturation, this.currentLightness);
      const secondaryHex = hslToHex(this.currentSecondaryHue / 360, this.currentSaturation * 0.95, this.currentLightness * 0.92);
      const accentHex = hslToHex(this.currentAccentHue / 360, this.currentSaturation * 0.90, this.currentLightness * 1.05);

      const bloomModulation = 1.25 + this.smoothedRms * 0.20 + this.beatPulse * 0.08;

      this.currentFeatures = {
        rms: this.smoothedRms,
        spectralCentroid: this.smoothedCentroid,
        spectralFlux: flux,
        dominantPitch,
        chroma,
        bassEnergy: this.smoothedBass,
        midEnergy: this.smoothedMids,
        trebleEnergy: this.smoothedTreble,
        isBeat,
        mood,
        valence,
        arousal,
        bloomModulation,
      };

      this.currentPalette = {
        primary: primaryHex,
        secondary: secondaryHex,
        accent: accentHex,
        glow: `rgba(${parseInt(primaryHex.slice(1, 3), 16)}, ${parseInt(primaryHex.slice(3, 5), 16)}, ${parseInt(primaryHex.slice(5, 7), 16)}, ${Math.min(0.7, 0.35 + this.smoothedBass * 0.35)})`,
        bgAtmosphere: hslToHex(this.currentPrimaryHue / 360, 0.40, 0.04),
        beatPulse: this.beatPulse,
      };

      // ── 9. Inject Global CSS Variables every 2 frames for 60fps performance ──
      this.cssUpdateCounter++;
      if (this.cssUpdateCounter % 2 === 0) {
        this.injectCssVariables();
      }

      // Sync with PlayerStore dynamicColor
      if (state.autoMode && primaryHex !== state.dynamicColor) {
        state.setDynamicColor(primaryHex);
      }

      // Broadcast to listeners
      this.listeners.forEach((fn) => fn(this.currentFeatures, this.currentPalette));
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  /**
   * Injects dynamic CSS variables into document root so all components inherit seamlessly
   */
  private injectCssVariables(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', this.currentPalette.primary);
    root.style.setProperty('--color-secondary', this.currentPalette.secondary);
    root.style.setProperty('--color-accent', this.currentPalette.accent);
    root.style.setProperty('--color-glow', this.currentPalette.glow);
    root.style.setProperty('--color-bg-atmosphere', this.currentPalette.bgAtmosphere);
    root.style.setProperty('--ai-beat-pulse', this.currentPalette.beatPulse.toFixed(3));
    root.style.setProperty('--ai-bloom-intensity', this.currentFeatures.bloomModulation.toFixed(2));
  }
}

export const aiAudioAnalysis = new AIAudioAnalysisService();
export default aiAudioAnalysis;
