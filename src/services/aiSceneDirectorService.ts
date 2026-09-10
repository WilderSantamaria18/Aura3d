/**
 * aiSceneDirectorService — Director Autónomo de Escena por DSP Musical
 *
 * Propósito:
 * Analiza el flujo espectral en tiempo real (FFT) para identificar fases musicales
 * (Chill/Ambient, Build-up, Drop/Impact, Clímax) y coreografiar automáticamente
 * los parámetros de los visualizadores (rotación, turbulencia, escala y color duotono armónico)
 * sin requerir modelos generativos externos ni causar caídas de FPS.
 */

import React from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { hslToHex } from '../utils/colorUtils';

export type MusicPhase = 'ambient' | 'buildup' | 'drop' | 'climax';

export interface AIDirectorMetrics {
  phase: MusicPhase;
  energyLevel: number;        // 0.0 - 1.0
  spectralFlux: number;       // Instantaneous onset intensity
  warmth: number;             // 0.0 (bright/crisp) to 1.0 (warm/heavy bass)
  turbulenceFactor: number;   // 0.2 - 2.5 (for blob & sphere deform)
  rotationSpeedMultiplier: number; // 0.3 - 2.2 (for camera orbit & rings)
  suggestedPrimary: string;
  suggestedSecondary: string;
}

class AISceneDirectorService {
  private isRunning = false;
  private animId: number | null = null;
  private prevSpectrum: Uint8Array | null = null;
  private energyHistory: number[] = [];
  private currentPhase: MusicPhase = 'ambient';

  // Smoothed output values to prevent jitter
  private smoothedEnergy = 0.2;
  private smoothedTurbulence = 1.0;
  private smoothedSpeed = 1.0;
  private primaryHue = 0.52;   // cyan baseline
  private secondaryHue = 0.92; // pink baseline

  private lastMetrics: AIDirectorMetrics = {
    phase: 'ambient',
    energyLevel: 0.2,
    spectralFlux: 0.0,
    warmth: 0.5,
    turbulenceFactor: 1.0,
    rotationSpeedMultiplier: 1.0,
    suggestedPrimary: '#00f2fe',
    suggestedSecondary: '#ff088a',
  };

  private listeners = new Set<(metrics: AIDirectorMetrics) => void>();
  private lastBroadcast = 0;

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

  public getMetrics(): AIDirectorMetrics {
    return this.lastMetrics;
  }

  public subscribe(fn: (metrics: AIDirectorMetrics) => void): () => void {
    this.listeners.add(fn);
    fn(this.lastMetrics);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const state = usePlayerStore.getState();
    const analyser = state.analyser;
    const isPlaying = state.isPlaying;
    const autoMode = state.autoMode;

    if (analyser && isPlaying && autoMode) {
      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(data);

      if (!this.prevSpectrum || this.prevSpectrum.length !== bufferLength) {
        this.prevSpectrum = new Uint8Array(bufferLength);
      }

      // 1. Multiband Spectral Analysis
      let bass = 0;
      let mids = 0;
      let highs = 0;
      let totalFlux = 0;

      const bassEnd = Math.floor(bufferLength * 0.08); // ~40 - 200 Hz
      const midsEnd = Math.floor(bufferLength * 0.40); // ~200 - 3500 Hz

      for (let i = 0; i < bufferLength; i++) {
        const val = data[i] / 255;
        const diff = Math.max(0, val - this.prevSpectrum[i] / 255);
        totalFlux += diff;

        if (i < bassEnd) {
          bass += val;
        } else if (i < midsEnd) {
          mids += val;
        } else {
          highs += val;
        }
        this.prevSpectrum[i] = data[i];
      }

      bass = bass / Math.max(1, bassEnd);
      mids = mids / Math.max(1, midsEnd - bassEnd);
      highs = highs / Math.max(1, bufferLength - midsEnd);

      const rawEnergy = bass * 0.50 + mids * 0.30 + highs * 0.20;
      this.smoothedEnergy += (rawEnergy - this.smoothedEnergy) * 0.12;

      // Keep recent 45 frames of energy (~0.75s)
      this.energyHistory.push(this.smoothedEnergy);
      if (this.energyHistory.length > 45) {
        this.energyHistory.shift();
      }

      const avgEnergy =
        this.energyHistory.reduce((a, b) => a + b, 0) / Math.max(1, this.energyHistory.length);

      // 2. Intelligent Phase Classification
      const energyDelta = this.smoothedEnergy - avgEnergy;
      const fluxThreshold = 1.2;

      if (this.smoothedEnergy > 0.65 && totalFlux > fluxThreshold) {
        this.currentPhase = 'drop';
      } else if (this.smoothedEnergy > 0.50 || (energyDelta > 0.12 && highs > 0.35)) {
        this.currentPhase = 'buildup';
      } else if (this.smoothedEnergy > 0.70) {
        this.currentPhase = 'climax';
      } else {
        this.currentPhase = 'ambient';
      }

      // 3. Harmonic Color Intelligence (Warmth vs Brilliance)
      // High bass/low highs = warm (amber, magenta, violet).
      // High highs/mids = electric/chill (cyan, aqua, neon pink).
      const warmth = Math.max(0, Math.min(1, (bass - highs + 1) * 0.5));

      // Dynamic harmonic duotone generator:
      // Base primary hue shifts gracefully with warmth
      const targetPrimaryHue = warmth > 0.6 ? 0.95 + warmth * 0.08 : 0.50 + (1 - warmth) * 0.08;
      // Complementary secondary hue (harmonic fifth or triad ~ 0.45 offset)
      const targetSecondaryHue = (targetPrimaryHue + 0.42) % 1.0;

      this.primaryHue += (targetPrimaryHue - this.primaryHue) * 0.03;
      this.secondaryHue += (targetSecondaryHue - this.secondaryHue) * 0.03;

      const sat = Math.min(1.0, 0.85 + this.smoothedEnergy * 0.15);
      const light = Math.min(0.65, 0.45 + this.smoothedEnergy * 0.18);

      const primaryHex = hslToHex(this.primaryHue % 1.0, sat, light);
      const secondaryHex = hslToHex(this.secondaryHue % 1.0, sat, light * 0.9);

      // 4. Reactive Scene Choreography (Turbulence & Speed)
      let targetTurbulence = 1.0;
      let targetSpeed = 1.0;

      switch (this.currentPhase) {
        case 'drop':
          targetTurbulence = 1.8 + bass * 0.7;
          targetSpeed = 1.6 + totalFlux * 0.3;
          break;
        case 'climax':
          targetTurbulence = 1.5 + bass * 0.5;
          targetSpeed = 1.4;
          break;
        case 'buildup':
          targetTurbulence = 1.2 + highs * 0.5;
          targetSpeed = 1.3;
          break;
        case 'ambient':
        default:
          targetTurbulence = 0.7 + bass * 0.3;
          targetSpeed = 0.75;
          break;
      }

      this.smoothedTurbulence += (targetTurbulence - this.smoothedTurbulence) * 0.08;
      this.smoothedSpeed += (targetSpeed - this.smoothedSpeed) * 0.08;

      this.lastMetrics = {
        phase: this.currentPhase,
        energyLevel: this.smoothedEnergy,
        spectralFlux: totalFlux,
        warmth,
        turbulenceFactor: this.smoothedTurbulence,
        rotationSpeedMultiplier: this.smoothedSpeed,
        suggestedPrimary: primaryHex,
        suggestedSecondary: secondaryHex,
      };

      // Push dynamic color to store if autoMode is engaged
      if (primaryHex !== state.dynamicColor) {
        state.setDynamicColor(primaryHex);
      }

      // Broadcast to listeners every ~120ms
      const now = performance.now();
      if (now - this.lastBroadcast > 120) {
        this.lastBroadcast = now;
        this.listeners.forEach((fn) => fn(this.lastMetrics));
      }
    }

    this.animId = requestAnimationFrame(this.loop);
  };
}

export const aiSceneDirector = new AISceneDirectorService();

export function useAIDirectorPhase(): MusicPhase {
  const [phase, setPhase] = React.useState<MusicPhase>(() => aiSceneDirector.getMetrics().phase);
  React.useEffect(() => {
    return aiSceneDirector.subscribe((m) => setPhase(m.phase));
  }, []);
  return phase;
}

export default aiSceneDirector;
