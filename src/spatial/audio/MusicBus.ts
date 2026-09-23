import { MusicAnalyser } from './MusicAnalyser';

/**
 * MusicBus — Sub-bus estricto para el stream de música principal.
 * Conecta el analizador de música para el visualizador 3D core
 * y gestiona ducking procedural seguro sin alterar el espectro ni filtros.
 */
export class MusicBus {
  private inputNode: GainNode;
  private busGain: GainNode;
  private analyser: MusicAnalyser;
  private outputNode: GainNode;
  private ctx: AudioContext;

  private baseVolume = 1.0;
  private duckingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.busGain = ctx.createGain();
    this.busGain.gain.setValueAtTime(this.baseVolume, ctx.currentTime);

    this.analyser = new MusicAnalyser(ctx);
    this.outputNode = ctx.createGain();

    // Enrutado:
    // Input -> BusGain -> MusicAnalyser -> OutputNode
    this.inputNode.connect(this.busGain);
    this.busGain.connect(this.analyser.getNode());
    this.analyser.getNode().connect(this.outputNode);
  }

  public getInputNode(): GainNode {
    return this.inputNode;
  }

  public getOutputNode(): GainNode {
    return this.outputNode;
  }

  public getAnalyser(): MusicAnalyser {
    return this.analyser;
  }

  public setVolume(volume: number, rampTimeMs: number = 20): void {
    this.baseVolume = Math.max(0, Math.min(1.5, volume));
    const now = this.ctx.currentTime;
    if (rampTimeMs > 0) {
      this.busGain.gain.cancelScheduledValues(now);
      this.busGain.gain.linearRampToValueAtTime(this.baseVolume, now + rampTimeMs / 1000);
    } else {
      this.busGain.gain.setValueAtTime(this.baseVolume, now);
    }
  }

  /**
   * Aplica ducking automático controlado por envolvente temporal
   * Reduce el volumen de la música suavemente cuando un instrumento toca fuerte.
   */
  public applyDucking(reductionDb: number = 2.5, durationMs: number = 220): void {
    if (this.duckingTimeout) {
      clearTimeout(this.duckingTimeout);
    }

    const now = this.ctx.currentTime;
    const duckFactor = Math.pow(10, -Math.abs(reductionDb) / 20);
    const targetGain = Math.max(0.1, this.baseVolume * duckFactor);

    // Fast attack (15ms)
    this.busGain.gain.cancelScheduledValues(now);
    this.busGain.gain.linearRampToValueAtTime(targetGain, now + 0.015);

    // Release back to baseVolume after duration
    this.duckingTimeout = setTimeout(() => {
      const releaseNow = this.ctx.currentTime;
      this.busGain.gain.cancelScheduledValues(releaseNow);
      this.busGain.gain.linearRampToValueAtTime(this.baseVolume, releaseNow + 0.12);
    }, durationMs);
  }

  public cleanup(): void {
    if (this.duckingTimeout) {
      clearTimeout(this.duckingTimeout);
    }
  }
}
