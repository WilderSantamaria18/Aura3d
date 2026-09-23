/**
 * InstrumentAnalyser — Analizador exclusivo para los instrumentos gestuales (InstrumentBus).
 * Alimenta la capa Interaction FX (ondas de choque lumínicas, destellos de color, partículas).
 */

export interface InstrumentTriggerEvent {
  peakFrequency: number;
  intensity: number;
  timestamp: number;
}

export class InstrumentAnalyser {
  private analyser: AnalyserNode;
  private freqData: Uint8Array;
  private prevEnergy = 0;
  private listeners: Set<(event: InstrumentTriggerEvent) => void> = new Set();
  private sampleRate: number;

  constructor(ctx: AudioContext, fftSize: number = 256, smoothingTimeConstant: number = 0.5) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = smoothingTimeConstant;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.sampleRate = ctx.sampleRate;
  }

  public getNode(): AnalyserNode {
    return this.analyser;
  }

  public onTrigger(callback: (event: InstrumentTriggerEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public update(): {
    freqData: Uint8Array;
    energy: number;
    peakFrequency: number;
    hasOnset: boolean;
  } {
    this.analyser.getByteFrequencyData(this.freqData as any);

    const length = this.freqData.length;
    let sum = 0;
    let maxVal = 0;
    let maxIndex = 0;

    for (let i = 0; i < length; i++) {
      const val = this.freqData[i];
      sum += val;
      if (val > maxVal) {
        maxVal = val;
        maxIndex = i;
      }
    }

    const energy = sum / (length * 255);
    const peakFrequency = (maxIndex * (this.sampleRate / 2)) / length;

    // Detección de onset instantáneo (ataque de nota)
    const energyDelta = energy - this.prevEnergy;
    const hasOnset = energyDelta > 0.08 && energy > 0.12;
    this.prevEnergy = energy;

    if (hasOnset) {
      const event: InstrumentTriggerEvent = {
        peakFrequency,
        intensity: Math.min(1.0, energyDelta * 4),
        timestamp: performance.now(),
      };
      this.listeners.forEach((cb) => cb(event));
    }

    return {
      freqData: this.freqData,
      energy,
      peakFrequency,
      hasOnset,
    };
  }
}
