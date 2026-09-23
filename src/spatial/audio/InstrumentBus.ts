import { RoomReverb } from './RoomReverb';
import { InstrumentAnalyser } from './InstrumentAnalyser';

/**
 * InstrumentBus — Sub-bus estricto para instrumentos virtuales espaciales.
 * Garantiza aislamiento absoluto de la música original con reverb procedural propio
 * y analizador independiente para Interaction FX.
 */
export class InstrumentBus {
  private inputNode: GainNode;
  private busGain: GainNode;
  private reverb: RoomReverb;
  private analyser: InstrumentAnalyser;
  private outputNode: GainNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.busGain = ctx.createGain();
    this.busGain.gain.setValueAtTime(0.85, ctx.currentTime);

    this.reverb = new RoomReverb(ctx, 0.18);
    this.analyser = new InstrumentAnalyser(ctx);
    this.outputNode = ctx.createGain();

    // Enrutado:
    // Input -> BusGain -> Reverb (Dry+Wet interno) -> Analyser -> OutputNode
    this.inputNode.connect(this.busGain);
    this.busGain.connect(this.reverb.getInput());
    this.reverb.getOutput().connect(this.analyser.getNode());
    this.analyser.getNode().connect(this.outputNode);
  }

  public getInputNode(): GainNode {
    return this.inputNode;
  }

  public getOutputNode(): GainNode {
    return this.outputNode;
  }

  public getAnalyser(): InstrumentAnalyser {
    return this.analyser;
  }

  public getReverb(): RoomReverb {
    return this.reverb;
  }

  public setVolume(volume: number, rampTimeMs: number = 20): void {
    const clamped = Math.max(0, Math.min(1.5, volume));
    const now = this.ctx.currentTime;
    if (rampTimeMs > 0) {
      this.busGain.gain.cancelScheduledValues(now);
      this.busGain.gain.linearRampToValueAtTime(clamped, now + rampTimeMs / 1000);
    } else {
      this.busGain.gain.setValueAtTime(clamped, now);
    }
  }

  public getVolume(): number {
    return this.busGain.gain.value;
  }
}
