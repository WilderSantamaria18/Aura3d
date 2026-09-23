import { SpatialAudioEngine } from '../audio/SpatialAudioEngine';
import type { InstrumentId, InstrumentVoice } from './types';
import { PianoVoice } from './PianoVoice';
import { KarplusStrongVoice } from './KarplusStrongVoice';
import { ViolinVoice } from './ViolinVoice';

/**
 * SpatialInstrumentEngine — Gestor unificado de instrumentos sintetizados espaciales.
 *
 * Cumple con:
 * - Aislamiento estricto: Todo el audio se inyecta únicamente en InstrumentBus.
 * - Ducking automático sobre el canal de música principal.
 * - Pool de polifonía con robo de voces inteligente.
 * - Cero allocations en el render loop.
 */
export class SpatialInstrumentEngine {
  private static instance: SpatialInstrumentEngine | null = null;

  private activeInstrument: InstrumentId = 'piano';
  private ctx: AudioContext | null = null;
  private instrumentBusInput: GainNode | null = null;

  // Pools de voces polifónicas
  private pianoVoices: PianoVoice[] = [];
  private guitarVoices: KarplusStrongVoice[] = [];
  private violinVoices: ViolinVoice[] = [];

  // Mapeo de notas activas por índice para release polifónico
  private activeVoiceMap: Map<number, InstrumentVoice> = new Map();

  // Batería procedural (ruido blanco y osciladores)
  private noiseBuffer: AudioBuffer | null = null;

  // Theremin
  private thereminOsc: OscillatorNode | null = null;
  private thereminGain: GainNode | null = null;
  private thereminFilter: BiquadFilterNode | null = null;
  private isThereminRunning = false;

  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SpatialInstrumentEngine {
    if (!SpatialInstrumentEngine.instance) {
      SpatialInstrumentEngine.instance = new SpatialInstrumentEngine();
    }
    return SpatialInstrumentEngine.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    const spatialAudio = SpatialAudioEngine.getInstance();
    await spatialAudio.init();

    const ctx = spatialAudio.getContext();
    const bus = spatialAudio.getInstrumentBus();

    if (!ctx || !bus) {
      throw new Error('[SpatialInstrumentEngine] No se pudo inicializar el grafo de audio.');
    }

    this.ctx = ctx;
    this.instrumentBusInput = bus.getInputNode();

    // 1. Inicializar Voice Pools
    for (let i = 0; i < 8; i++) {
      this.pianoVoices.push(new PianoVoice(ctx, this.instrumentBusInput));
    }
    for (let i = 0; i < 6; i++) {
      this.guitarVoices.push(new KarplusStrongVoice(ctx, this.instrumentBusInput));
    }
    for (let i = 0; i < 4; i++) {
      this.violinVoices.push(new ViolinVoice(ctx, this.instrumentBusInput));
    }

    // 2. Crear buffer de ruido blanco para percusiones (snare/clap/hihat)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;

    this.isInitialized = true;
  }

  public setInstrument(id: InstrumentId): void {
    if (this.activeInstrument !== id) {
      this.stopAllNotes();
      this.activeInstrument = id;
    }
  }

  public getInstrument(): InstrumentId {
    return this.activeInstrument;
  }

  /**
   * Toca una nota con el instrumento activo y dispara auto-ducking en el canal de música
   */
  public triggerNoteOn(noteIndex: number, freq: number, velocity: number = 0.9): void {
    if (!this.ctx || !this.instrumentBusInput) {
      this.init().then(() => this.triggerNoteOn(noteIndex, freq, velocity));
      return;
    }

    const now = this.ctx.currentTime;

    // Disparar ducking automático en la música principal (-2.5 dB, 220ms)
    SpatialAudioEngine.getInstance().triggerDucking(2.5, 220);

    // Detener nota previa si ya estaba asignada
    this.triggerNoteOff(noteIndex);

    // Obtener voz disponible según el instrumento
    let voice: InstrumentVoice | undefined;

    if (this.activeInstrument === 'piano') {
      voice = this.pianoVoices.find((v) => v.isAvailable()) || this.pianoVoices[0];
    } else if (this.activeInstrument === 'guitar') {
      voice = this.guitarVoices.find((v) => v.isAvailable()) || this.guitarVoices[0];
    } else if (this.activeInstrument === 'violin') {
      voice = this.violinVoices.find((v) => v.isAvailable()) || this.violinVoices[0];
    }

    if (voice) {
      voice.start(freq, velocity, now);
      this.activeVoiceMap.set(noteIndex, voice);
    }
  }

  /**
   * Libera la nota
   */
  public triggerNoteOff(noteIndex: number): void {
    const voice = this.activeVoiceMap.get(noteIndex);
    if (voice && this.ctx) {
      voice.stop(this.ctx.currentTime);
      this.activeVoiceMap.delete(noteIndex);
    }
  }

  /**
   * Batería analógica sintetizada
   */
  public triggerDrum(pad: 'kick' | 'snare' | 'hihat' | 'clap', velocity: number = 0.95): void {
    if (!this.ctx || !this.instrumentBusInput) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vol = Math.min(1.0, Math.max(0.2, velocity));

    // Ducking más pronunciado para pegada rítmica (-3.0 dB, 180ms)
    SpatialAudioEngine.getInstance().triggerDucking(3.0, 180);

    if (pad === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

      gain.gain.setValueAtTime(vol * 0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.instrumentBusInput);

      osc.start(now);
      osc.stop(now + 0.36);
    } else if (pad === 'snare' && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(950, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentBusInput);

      noise.start(now);
      noise.stop(now + 0.22);
    } else if (pad === 'hihat' && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(8800, now);
      filter.Q.setValueAtTime(4.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.instrumentBusInput);

      noise.start(now);
      noise.stop(now + 0.05);
    } else if (pad === 'clap' && this.noiseBuffer) {
      [0, 0.012, 0.024].forEach((offset, idx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1250, now + offset);
        filter.Q.setValueAtTime(1.5, now + offset);

        const gain = ctx.createGain();
        const decay = idx === 2 ? 0.18 : 0.02;
        gain.gain.setValueAtTime(vol * 0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.instrumentBusInput!);

        noise.start(now + offset);
        noise.stop(now + offset + decay + 0.01);
      });
    }
  }

  /**
   * Theremin espacial
   */
  public startTheremin(): void {
    if (this.isThereminRunning || !this.ctx || !this.instrumentBusInput) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    this.thereminOsc = ctx.createOscillator();
    this.thereminGain = ctx.createGain();
    this.thereminFilter = ctx.createBiquadFilter();

    this.thereminOsc.type = 'sine';
    this.thereminOsc.frequency.setValueAtTime(440, now);

    this.thereminFilter.type = 'lowpass';
    this.thereminFilter.frequency.setValueAtTime(2600, now);
    this.thereminFilter.Q.setValueAtTime(2.0, now);

    this.thereminGain.gain.setValueAtTime(0.0001, now);

    this.thereminOsc.connect(this.thereminFilter);
    this.thereminFilter.connect(this.thereminGain);
    this.thereminGain.connect(this.instrumentBusInput);

    this.thereminOsc.start(now);
    this.isThereminRunning = true;
  }

  public updateTheremin(xNorm: number, yNorm: number, zNorm: number): void {
    if (!this.isThereminRunning || !this.thereminOsc || !this.thereminGain || !this.thereminFilter || !this.ctx) {
      return;
    }

    const now = this.ctx.currentTime;
    const targetFreq = 130 + Math.pow(xNorm, 1.8) * 970;
    this.thereminOsc.frequency.setTargetAtTime(targetFreq, now, 0.02);

    const targetVol = Math.max(0.0001, (1.0 - yNorm) * 0.55);
    this.thereminGain.gain.setTargetAtTime(targetVol, now, 0.03);

    const filterFreq = Math.min(12000, Math.max(200, (1.0 - Math.abs(zNorm)) * 9000));
    this.thereminFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);
  }

  public stopTheremin(): void {
    if (!this.isThereminRunning || !this.thereminGain || !this.thereminOsc) return;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.thereminGain.gain.setTargetAtTime(0.0001, now, 0.05);
      setTimeout(() => {
        try {
          this.thereminOsc?.stop();
          this.thereminOsc?.disconnect();
          this.thereminGain?.disconnect();
          this.thereminFilter?.disconnect();
        } catch {
          // Seguro
        }
        this.thereminOsc = null;
        this.thereminGain = null;
        this.thereminFilter = null;
        this.isThereminRunning = false;
      }, 70);
    } else {
      this.isThereminRunning = false;
    }
  }

  public stopAllNotes(): void {
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.activeVoiceMap.forEach((voice) => voice.stop(now));
      this.activeVoiceMap.clear();
      this.stopTheremin();
    }
  }

  public cleanup(): void {
    this.stopAllNotes();
    this.pianoVoices.forEach((v) => v.dispose());
    this.guitarVoices.forEach((v) => v.dispose());
    this.violinVoices.forEach((v) => v.dispose());
    this.isInitialized = false;
  }
}
