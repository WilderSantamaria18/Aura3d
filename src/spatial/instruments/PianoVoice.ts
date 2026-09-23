import type { InstrumentVoice } from './types';

/**
 * PianoVoice — Síntesis aditiva de piano acústico/eléctrico con armónicos y ADSR.
 *
 * Arquitectura:
 *   Osc1 (Sine, Fundamental)  ──┐
 *   Osc2 (Triangle, +2 cents) ──┼──► BiquadFilter (Lowpass con tracking de velocidad)
 *   Transient Click           ──┘       │
 *                                       ▼
 *                                   GainNode (Envolvente ADSR)
 *                                       │
 *                                       ▼
 *                                  Destination (InstrumentBus)
 */
export class PianoVoice implements InstrumentVoice {
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode;
  private voiceGain: GainNode;
  private active = false;
  private ctx: AudioContext;
  private outputNode: AudioNode;

  constructor(ctx: AudioContext, outputNode: AudioNode) {
    this.ctx = ctx;
    this.outputNode = outputNode;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(0, ctx.currentTime);

    this.filter.connect(this.voiceGain);
    this.voiceGain.connect(this.outputNode);
  }

  public isAvailable(): boolean {
    return !this.active;
  }

  public start(freq: number, velocity: number = 0.9, time: number): void {
    this.stop(time);
    this.active = true;

    const vel = Math.max(0.1, Math.min(1.0, velocity));

    // 1. Oscilador fundamental
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(freq, time);

    // 2. Oscilador de cuerpo armónico (triángulo ligeramente desafinado +2 cents)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(freq * Math.pow(2, 2 / 1200), time);

    // 3. Filtro dinámico con brillo proporcional a la velocidad de pulsación
    const cutoff = Math.min(16000, 1800 + vel * 6400);
    this.filter.frequency.setValueAtTime(cutoff, time);
    this.filter.frequency.exponentialRampToValueAtTime(cutoff * 0.45, time + 0.35);

    // 4. Envolvente ADSR:
    // Attack: 8ms
    // Decay: 150ms hasta sustain (0.55 del volumen pico)
    const peakVol = vel * 0.42;
    const sustainVol = peakVol * 0.55;

    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.setValueAtTime(0.0001, time);
    this.voiceGain.gain.linearRampToValueAtTime(peakVol, time + 0.008);
    this.voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainVol), time + 0.15);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);

    this.osc1.start(time);
    this.osc2.start(time);
  }

  public stop(time: number): void {
    if (!this.active) return;
    this.active = false;

    // Release: desvanecimiento suave de 240ms
    const releaseDuration = 0.24;
    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.setValueAtTime(Math.max(0.0001, this.voiceGain.gain.value), time);
    this.voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + releaseDuration);

    const oldOsc1 = this.osc1;
    const oldOsc2 = this.osc2;
    this.osc1 = null;
    this.osc2 = null;

    setTimeout(() => {
      try {
        oldOsc1?.stop();
        oldOsc1?.disconnect();
        oldOsc2?.stop();
        oldOsc2?.disconnect();
      } catch {
        // Desconexión segura
      }
    }, releaseDuration * 1000 + 40);
  }

  public dispose(): void {
    this.stop(this.ctx.currentTime);
    this.filter.disconnect();
    this.voiceGain.disconnect();
  }
}
