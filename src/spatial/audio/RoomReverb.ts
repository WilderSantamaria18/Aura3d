/**
 * RoomReverb — Reverb Convolver Procedural para Aura Spatial Mode
 * Genera una respuesta al impulso (IR) sintética con caída exponencial de 1.8s en estéreo.
 * No requiere cargar archivos WAV externos (0 KB de descarga, 0 latencia de red).
 */

export class RoomReverb {
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext, defaultWet: number = 0.15) {
    this.ctx = ctx;
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this.generateProceduralIR(1.8, 2.2);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();

    this.setWet(defaultWet);

    // Input -> Dry -> Output
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Input -> Convolver -> Wet -> Output
    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  /**
   * Genera un buffer estéreo de ruido blanco con caída exponencial natural
   */
  private generateProceduralIR(durationSec: number, decayRate: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.exp(-t * decayRate * 3.5);
      // Ruido estéreo no correlacionado
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    return buffer;
  }

  public setWet(wetRatio: number): void {
    const clamped = Math.max(0, Math.min(1, wetRatio));
    const now = this.ctx.currentTime;
    // Panning de potencia constante (equal power)
    this.wetGain.gain.setValueAtTime(Math.sin(clamped * (Math.PI / 2)), now);
    this.dryGain.gain.setValueAtTime(Math.cos(clamped * (Math.PI / 2)), now);
  }

  public getInput(): GainNode {
    return this.inputNode;
  }

  public getOutput(): GainNode {
    return this.outputNode;
  }
}
