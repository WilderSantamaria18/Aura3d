import type { InstrumentVoice } from './types';

/**
 * ViolinVoice — Emulación de cuerda frotada (Violín / Cello).
 *
 * Características:
 * - Oscilador Sawtooth (armónicos Helmholtz)
 * - LFO de Vibrato (5.5 Hz) con modulación de profundidad
 * - Filtros de formante para simular la caja de resonancia de madera (450 Hz, 1800 Hz, 3200 Hz)
 * - Ataque gradual de arco (60ms) y desvanecimiento expresivo
 */
export class ViolinVoice implements InstrumentVoice {
  private osc: OscillatorNode | null = null;
  private vibratoOsc: OscillatorNode | null = null;
  private vibratoGain: GainNode | null = null;

  private formant1: BiquadFilterNode;
  private formant2: BiquadFilterNode;
  private voiceGain: GainNode;
  private active = false;
  private ctx: AudioContext;
  private outputNode: AudioNode;

  constructor(ctx: AudioContext, outputNode: AudioNode) {
    this.ctx = ctx;
    this.outputNode = outputNode;
    // Formante 1: resonancia de cuerpo de madera (~450 Hz)
    this.formant1 = ctx.createBiquadFilter();
    this.formant1.type = 'peaking';
    this.formant1.frequency.setValueAtTime(450, ctx.currentTime);
    this.formant1.Q.setValueAtTime(2.2, ctx.currentTime);
    this.formant1.gain.setValueAtTime(4.0, ctx.currentTime);

    // Formante 2: brillo de cuerda frotada (~1900 Hz)
    this.formant2 = ctx.createBiquadFilter();
    this.formant2.type = 'peaking';
    this.formant2.frequency.setValueAtTime(1900, ctx.currentTime);
    this.formant2.Q.setValueAtTime(3.0, ctx.currentTime);
    this.formant2.gain.setValueAtTime(6.0, ctx.currentTime);

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(0, ctx.currentTime);

    this.formant1.connect(this.formant2);
    this.formant2.connect(this.voiceGain);
    this.voiceGain.connect(this.outputNode);
  }

  public isAvailable(): boolean {
    return !this.active;
  }

  public start(freq: number, velocity: number = 0.9, time: number): void {
    this.stop(time);
    this.active = true;

    const vel = Math.max(0.1, Math.min(1.0, velocity));

    // 1. Oscilador principal
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.setValueAtTime(freq, time);

    // 2. LFO de Vibrato (5.5 Hz con retardo inicial de 80ms)
    this.vibratoOsc = this.ctx.createOscillator();
    this.vibratoGain = this.ctx.createGain();

    this.vibratoOsc.frequency.setValueAtTime(5.5, time);
    this.vibratoGain.gain.setValueAtTime(0, time);
    // El vibrato entra progresivamente después de pulsar la nota
    this.vibratoGain.gain.linearRampToValueAtTime(freq * 0.018, time + 0.28);

    this.vibratoOsc.connect(this.vibratoGain);
    this.vibratoGain.connect(this.osc.frequency);

    // 3. Envolvente de Arco:
    // Ataque suave (60ms) característico del violín
    const peakVol = vel * 0.38;
    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.setValueAtTime(0.0001, time);
    this.voiceGain.gain.linearRampToValueAtTime(peakVol, time + 0.06);

    this.osc.connect(this.formant1);

    this.osc.start(time);
    this.vibratoOsc.start(time);
  }

  public stop(time: number): void {
    if (!this.active) return;
    this.active = false;

    // Release de arco (180ms)
    const releaseDuration = 0.18;
    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.setValueAtTime(Math.max(0.0001, this.voiceGain.gain.value), time);
    this.voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + releaseDuration);

    const oldOsc = this.osc;
    const oldVib = this.vibratoOsc;
    const oldVibGain = this.vibratoGain;

    this.osc = null;
    this.vibratoOsc = null;
    this.vibratoGain = null;

    setTimeout(() => {
      try {
        oldOsc?.stop();
        oldOsc?.disconnect();
        oldVib?.stop();
        oldVib?.disconnect();
        oldVibGain?.disconnect();
      } catch {
        // Limpieza segura
      }
    }, releaseDuration * 1000 + 40);
  }

  public dispose(): void {
    this.stop(this.ctx.currentTime);
    this.formant1.disconnect();
    this.formant2.disconnect();
    this.voiceGain.disconnect();
  }
}
