/**
 * FxBus — Sub-bus para efectos de sonido de interacción (whooshes, impactos táctiles, UI).
 */
export class FxBus {
  private inputNode: GainNode;
  private busGain: GainNode;
  private outputNode: GainNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.busGain = ctx.createGain();
    this.busGain.gain.setValueAtTime(0.7, ctx.currentTime);
    this.outputNode = ctx.createGain();

    this.inputNode.connect(this.busGain);
    this.busGain.connect(this.outputNode);
  }

  public getInputNode(): GainNode {
    return this.inputNode;
  }

  public getOutputNode(): GainNode {
    return this.outputNode;
  }

  public setVolume(volume: number): void {
    this.busGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, volume)), this.ctx.currentTime);
  }

  /**
   * Genera un pulso sónico sintético de confirmación táctil (Click/Pop suave)
   */
  public playTouchFeedback(frequency: number = 880): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.inputNode);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Sonido sutil al agarrar un objeto en el espacio 3D (rising tone)
   */
  public playGrabSound(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(this.inputNode);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Sonido sutil al soltar un objeto en el espacio con inercia (descending release)
   */
  public playReleaseSound(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.inputNode);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Micro-click casi inaudible al posar el cursor sobre un objeto interactivo
   */
  public playHoverTick(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.012);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(gain);
    gain.connect(this.inputNode);

    osc.start(now);
    osc.stop(now + 0.015);
  }
}
