import { AudioEngine } from '../../services/audioEngine';
import { MusicBus } from './MusicBus';
import { InstrumentBus } from './InstrumentBus';
import { FxBus } from './FxBus';
import { MusicAnalyser } from './MusicAnalyser';
import { InstrumentAnalyser } from './InstrumentAnalyser';
import { AudioContextUnlocker } from './AudioContextUnlocker';

/**
 * SpatialAudioEngine — Orquestador central del grafo de audio para Aura Spatial Mode.
 *
 * Arquitectura de Grafo Estricto:
 *
 *               AudioContext (único, 48 kHz)
 *                     │
 *       ┌─────────────┼─────────────┐
 *       │             │             │
 *   MusicBus    InstrumentBus     FxBus
 *       │             │             │
 *       │       RoomReverb          │
 *       │             │             │
 *  MusicAnalyser InstrumentAnalyser │
 *   (Visualizer)  (Interact FX)     │
 *       │             │             │
 *       └─────────────┬─────────────┘
 *                     │
 *                 MasterGain
 *                     │
 *              BrickwallLimiter (-1 dBFS, 20:1)
 *                     │
 *                 Destination
 */
export class SpatialAudioEngine {
  private static instance: SpatialAudioEngine | null = null;

  private ctx: AudioContext | null = null;
  private musicBus: MusicBus | null = null;
  private instrumentBus: InstrumentBus | null = null;
  private fxBus: FxBus | null = null;
  private masterGain: GainNode | null = null;
  private brickwallLimiter: DynamicsCompressorNode | null = null;

  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SpatialAudioEngine {
    if (!SpatialAudioEngine.instance) {
      SpatialAudioEngine.instance = new SpatialAudioEngine();
    }
    return SpatialAudioEngine.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const mainEngine = AudioEngine.getInstance();
    await mainEngine.init();
    const ctx = mainEngine.getContext();

    if (!ctx) {
      throw new Error('[SpatialAudioEngine] No se pudo obtener el AudioContext global.');
    }

    this.ctx = ctx;

    // Desbloquear audio automáticamente en Safari e iOS
    AudioContextUnlocker.getInstance().attach(ctx);

    // 1. Crear Limitador de Pico de Ladrillo (Brickwall Limiter)
    this.brickwallLimiter = ctx.createDynamicsCompressor();
    this.brickwallLimiter.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.brickwallLimiter.knee.setValueAtTime(0.0, ctx.currentTime);
    this.brickwallLimiter.ratio.setValueAtTime(20.0, ctx.currentTime);
    this.brickwallLimiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.brickwallLimiter.release.setValueAtTime(0.05, ctx.currentTime);

    // 2. Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.9, ctx.currentTime);

    // Conectar MasterGain -> BrickwallLimiter -> Destination
    this.masterGain.connect(this.brickwallLimiter);
    this.brickwallLimiter.connect(ctx.destination);

    // 3. Crear Sub-buses dedicados
    this.musicBus = new MusicBus(ctx);
    this.instrumentBus = new InstrumentBus(ctx);
    this.fxBus = new FxBus(ctx);

    // Conectar buses aislados al MasterGain
    this.musicBus.getOutputNode().connect(this.masterGain);
    this.instrumentBus.getOutputNode().connect(this.masterGain);
    this.fxBus.getOutputNode().connect(this.masterGain);

    this.isInitialized = true;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMusicBus(): MusicBus | null {
    return this.musicBus;
  }

  public getInstrumentBus(): InstrumentBus | null {
    return this.instrumentBus;
  }

  public getFxBus(): FxBus | null {
    return this.fxBus;
  }

  public getMusicAnalyser(): MusicAnalyser | null {
    return this.musicBus?.getAnalyser() || null;
  }

  public getInstrumentAnalyser(): InstrumentAnalyser | null {
    return this.instrumentBus?.getAnalyser() || null;
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, vol)), this.ctx.currentTime);
    }
  }

  public setInstrumentVolume(vol: number): void {
    this.instrumentBus?.setVolume(vol);
  }

  public setMusicVolume(vol: number): void {
    this.musicBus?.setVolume(vol);
  }

  public triggerDucking(reductionDb: number = 2.5, durationMs: number = 220): void {
    this.musicBus?.applyDucking(reductionDb, durationMs);

    // Duck Main AudioEngine masterGain smoothly if active (preserves visualizer FFT isolation)
    const mainEngine = AudioEngine.getInstance();
    if (mainEngine.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const currentVal = mainEngine.masterGain.gain.value;
      const duckFactor = Math.pow(10, -Math.abs(reductionDb) / 20);
      const target = Math.max(0.1, currentVal * duckFactor);

      mainEngine.masterGain.gain.cancelScheduledValues(now);
      mainEngine.masterGain.gain.linearRampToValueAtTime(target, now + 0.015);

      setTimeout(() => {
        if (mainEngine.masterGain && this.ctx) {
          const restoreNow = this.ctx.currentTime;
          mainEngine.masterGain.gain.cancelScheduledValues(restoreNow);
          mainEngine.masterGain.gain.linearRampToValueAtTime(currentVal, restoreNow + 0.08);
        }
      }, durationMs);
    }
  }

  public cleanup(): void {
    this.musicBus?.cleanup();
    this.isInitialized = false;
  }
}
