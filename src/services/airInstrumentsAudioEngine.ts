import { AudioEngine } from './audioEngine';
import { SpatialAudioEngine } from '../spatial/audio/SpatialAudioEngine';

export type InstrumentMode = 'synth' | 'drums' | 'theremin' | 'pads' | 'pose';
export type OscillatorWaveform = 'sawtooth' | 'sine' | 'square' | 'triangle';

export interface NoteDefinition {
  name: string;
  freq: number;
}

export const SYNTH_SCALES: Record<string, { name: string; notes: NoteDefinition[] }> = {
  pentatonic_minor: {
    name: 'Pentatónica Menor (A Minor)',
    notes: [
      { name: 'A3', freq: 220.0 },
      { name: 'C4', freq: 261.63 },
      { name: 'D4', freq: 293.66 },
      { name: 'E4', freq: 329.63 },
      { name: 'G4', freq: 392.0 },
      { name: 'A4', freq: 440.0 },
      { name: 'C5', freq: 523.25 },
      { name: 'D5', freq: 587.33 },
    ],
  },
  pentatonic_major: {
    name: 'Pentatónica Mayor (C Major)',
    notes: [
      { name: 'C4', freq: 261.63 },
      { name: 'D4', freq: 293.66 },
      { name: 'E4', freq: 329.63 },
      { name: 'G4', freq: 392.0 },
      { name: 'A4', freq: 440.0 },
      { name: 'C5', freq: 523.25 },
      { name: 'D5', freq: 587.33 },
      { name: 'E5', freq: 659.25 },
    ],
  },
  cyberpunk: {
    name: 'Cyberpunk Synthwave (D Minor)',
    notes: [
      { name: 'D3', freq: 146.83 },
      { name: 'F3', freq: 174.61 },
      { name: 'G3', freq: 196.0 },
      { name: 'A3', freq: 220.0 },
      { name: 'C4', freq: 261.63 },
      { name: 'D4', freq: 293.66 },
      { name: 'F4', freq: 349.23 },
      { name: 'G4', freq: 392.0 },
    ],
  },
  japanese: {
    name: 'Insen Oriental (D Insen)',
    notes: [
      { name: 'D4', freq: 293.66 },
      { name: 'Eb4', freq: 311.13 },
      { name: 'G4', freq: 392.0 },
      { name: 'A4', freq: 440.0 },
      { name: 'C5', freq: 523.25 },
      { name: 'D5', freq: 587.33 },
      { name: 'Eb5', freq: 622.25 },
      { name: 'G5', freq: 783.99 },
    ],
  },
};

interface ActiveVoice {
  osc: OscillatorNode;
  gain: GainNode;
  noteName: string;
  startTime: number;
}

export class AirInstrumentsAudioEngine {
  private static instance: AirInstrumentsAudioEngine | null = null;

  // Master bus para instrumentos de aire
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Sintetizador Polifónico (Voice Pool de 6 voces)
  private activeVoices: Map<number, ActiveVoice> = new Map();
  private maxPolyphony = 6;
  private currentWaveform: OscillatorWaveform = 'sawtooth';
  private currentScale = 'pentatonic_minor';

  // Theremin Continuo
  private thereminOsc: OscillatorNode | null = null;
  private thereminGain: GainNode | null = null;
  private thereminFilter: BiquadFilterNode | null = null;
  private isThereminRunning = false;

  private constructor() {}

  public static getInstance(): AirInstrumentsAudioEngine {
    if (!AirInstrumentsAudioEngine.instance) {
      AirInstrumentsAudioEngine.instance = new AirInstrumentsAudioEngine();
    }
    return AirInstrumentsAudioEngine.instance;
  }

  /**
   * Inicializa la cadena de audio y conecta al AnalyserNode de Aura3D
   */
  private async ensureAudioContext(): Promise<AudioContext | null> {
    const mainEngine = AudioEngine.getInstance();
    await mainEngine.init();
    const ctx = mainEngine.getContext();
    if (!ctx) return null;

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, ctx.currentTime);

      // ── Enrutado Aislado V2: Conexión al InstrumentBus dedicado ──
      // Nunca contamina el AnalyserNode central de la música.
      // Pasa por RoomReverb procedural -> InstrumentAnalyser -> BrickwallLimiter
      try {
        const spatialAudio = SpatialAudioEngine.getInstance();
        await spatialAudio.init();
        const bus = spatialAudio.getInstrumentBus();
        if (bus) {
          this.masterGain.connect(bus.getInputNode());
        } else {
          this.masterGain.connect(ctx.destination);
        }
      } catch (e) {
        console.warn('[AirInstrumentsAudioEngine] Usando fallback de salida:', e);
        this.masterGain.connect(ctx.destination);
      }
    }

    if (!this.noiseBuffer) {
      this.createNoiseBuffer(ctx);
    }

    return ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setWaveform(waveform: OscillatorWaveform): void {
    this.currentWaveform = waveform;
  }

  public setScale(scaleKey: string): void {
    if (SYNTH_SCALES[scaleKey]) {
      this.currentScale = scaleKey;
    }
  }

  public getScaleNotes(): NoteDefinition[] {
    return SYNTH_SCALES[this.currentScale]?.notes || SYNTH_SCALES.pentatonic_minor.notes;
  }

  // ── 1. Sintetizador Polifónico (Virtual Key Tap) ───────────────────────────
  public async triggerNoteOn(noteIndex: number, velocity: number = 1.0): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterGain) return;

    const notes = this.getScaleNotes();
    const note = notes[noteIndex % notes.length];
    if (!note) return;

    // Si la voz ya está activa, liberarla antes
    if (this.activeVoices.has(noteIndex)) {
      this.triggerNoteOff(noteIndex);
    }

    // Manejo de pool de polifonía
    if (this.activeVoices.size >= this.maxPolyphony) {
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        this.triggerNoteOff(oldestKey);
      }
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();

    osc.type = this.currentWaveform;
    osc.frequency.setValueAtTime(note.freq, now);

    // Envolvente ADSR:
    // Attack: 10ms hasta el pico de ganancia
    // Decay: 100ms hasta el nivel de sustain
    const targetGain = Math.min(1.0, Math.max(0.1, velocity)) * 0.45;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(targetGain, now + 0.01);
    voiceGain.gain.exponentialRampToValueAtTime(targetGain * 0.7, now + 0.11);

    osc.connect(voiceGain);
    voiceGain.connect(this.masterGain);
    osc.start(now);

    // Auto-ducking en el canal de música principal (-2.5 dB, 220ms)
    SpatialAudioEngine.getInstance().triggerDucking(2.5, 220);

    this.activeVoices.set(noteIndex, {
      osc,
      gain: voiceGain,
      noteName: note.name,
      startTime: now,
    });
  }

  public triggerNoteOff(noteIndex: number): void {
    const voice = this.activeVoices.get(noteIndex);
    if (!voice) return;

    const mainEngine = AudioEngine.getInstance();
    const ctx = mainEngine.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Release: 200ms desvanecimiento exponencial
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    voice.osc.stop(now + 0.22);
    setTimeout(() => {
      voice.osc.disconnect();
      voice.gain.disconnect();
    }, 250);

    this.activeVoices.delete(noteIndex);
  }

  // ── 2. Batería Analógica / Pads Gestuales ───────────────────────────────────
  public async triggerDrum(
    padType: 'kick' | 'snare' | 'hihat' | 'clap',
    velocity: number = 1.0
  ): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const vol = Math.min(1.0, Math.max(0.2, velocity));

    // Auto-ducking en el canal de música principal (-3.0 dB, 180ms)
    SpatialAudioEngine.getInstance().triggerDucking(3.0, 180);

    if (padType === 'kick') {
      // 808 Sub-kick sintetizado
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

      gain.gain.setValueAtTime(vol * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (padType === 'snare' && this.noiseBuffer) {
      // Snare con buffer de ruido blanco + cuerpo tonal
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1000, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.2);

      // Tono del parche
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.frequency.setValueAtTime(185, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
      oscGain.gain.setValueAtTime(vol * 0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (padType === 'hihat' && this.noiseBuffer) {
      // Hi-Hat metálico
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(8500, now);
      filter.Q.setValueAtTime(3.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.05);
    } else if (padType === 'clap' && this.noiseBuffer) {
      // Clap con 3 micro-ráfagas
      const bursts = [0, 0.012, 0.024];
      bursts.forEach((offset, idx) => {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now + offset);
        filter.Q.setValueAtTime(1.5, now + offset);

        const gain = ctx.createGain();
        const decay = idx === bursts.length - 1 ? 0.18 : 0.02;
        gain.gain.setValueAtTime(vol * 0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        noise.start(now + offset);
        noise.stop(now + offset + decay + 0.01);
      });
    }
  }

  // ── 3. Theremin Espacial Continuo ──────────────────────────────────────────
  public async startTheremin(): Promise<void> {
    if (this.isThereminRunning) return;
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    this.thereminOsc = ctx.createOscillator();
    this.thereminGain = ctx.createGain();
    this.thereminFilter = ctx.createBiquadFilter();

    this.thereminOsc.type = 'sine';
    this.thereminOsc.frequency.setValueAtTime(440, now);

    this.thereminFilter.type = 'lowpass';
    this.thereminFilter.frequency.setValueAtTime(2500, now);
    this.thereminFilter.Q.setValueAtTime(2.0, now);

    this.thereminGain.gain.setValueAtTime(0.0001, now);

    this.thereminOsc.connect(this.thereminFilter);
    this.thereminFilter.connect(this.thereminGain);
    this.thereminGain.connect(this.masterGain);

    this.thereminOsc.start(now);
    this.isThereminRunning = true;
  }

  public updateTheremin(xNorm: number, yNorm: number, zNorm: number): void {
    if (!this.isThereminRunning || !this.thereminOsc || !this.thereminGain || !this.thereminFilter) {
      return;
    }
    const mainEngine = AudioEngine.getInstance();
    const ctx = mainEngine.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // X: Frecuencia (130Hz - 1100Hz en escala continua)
    const targetFreq = 130 + Math.pow(xNorm, 1.8) * 970;
    this.thereminOsc.frequency.setTargetAtTime(targetFreq, now, 0.02);

    // Y: Ganancia / Volumen (Invertido: arriba = más volumen)
    const targetVol = Math.max(0.0001, (1.0 - yNorm) * 0.55);
    this.thereminGain.gain.setTargetAtTime(targetVol, now, 0.03);

    // Z: Filtro Pasa-Bajos (cerca = brillante, lejos = amortiguado)
    const filterFreq = Math.min(12000, Math.max(200, (1.0 - Math.abs(zNorm)) * 9000));
    this.thereminFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);
  }

  public stopTheremin(): void {
    if (!this.isThereminRunning || !this.thereminGain || !this.thereminOsc) return;
    const mainEngine = AudioEngine.getInstance();
    const ctx = mainEngine.getContext();

    if (ctx) {
      const now = ctx.currentTime;
      this.thereminGain.gain.setTargetAtTime(0.0001, now, 0.05);
      setTimeout(() => {
        try {
          this.thereminOsc?.stop();
          this.thereminOsc?.disconnect();
          this.thereminGain?.disconnect();
          this.thereminFilter?.disconnect();
        } catch {
          // Ya detenido
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

  // ── Cleanup al cerrar ──────────────────────────────────────────────────────
  public cleanup(): void {
    this.stopTheremin();
    this.activeVoices.forEach((_, key) => this.triggerNoteOff(key));
    this.activeVoices.clear();
  }
}
