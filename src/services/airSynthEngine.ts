import { AudioEngine } from './audioEngine';

export type InstrumentType = 'synth' | 'drums' | 'theremin';
export type SynthScale = 'pentatonic_minor' | 'pentatonic_major' | 'cyberpunk' | 'japanese';

export interface NoteDefinition {
  name: string;
  freq: number;
}

export interface DrumPadDefinition {
  id: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'crash';
  name: string;
  color: string;
}

export const SYNTH_SCALES: Record<SynthScale, { name: string; notes: NoteDefinition[] }> = {
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

export const DRUM_PADS: DrumPadDefinition[] = [
  { id: 'kick', name: 'Kick 808', color: '#ff088a' },
  { id: 'snare', name: 'Snare', color: '#00f2fe' },
  { id: 'hihat', name: 'Hi-Hat', color: '#FFD700' },
  { id: 'tom', name: 'Low Tom', color: '#a855f7' },
  { id: 'clap', name: 'Clap', color: '#39FF14' },
  { id: 'crash', name: 'Crash', color: '#f97316' },
];

class AirSynthEngine {
  private masterSynthGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private currentScale: SynthScale = 'pentatonic_minor';

  // Continuous Theremin nodes
  private thereminOsc: OscillatorNode | null = null;
  private thereminGain: GainNode | null = null;
  private thereminFilter: BiquadFilterNode | null = null;

  private async ensureAudioContext(): Promise<AudioContext | null> {
    const audioEngine = AudioEngine.getInstance();
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    if (!ctx) return null;

    if (!this.masterSynthGain) {
      this.masterSynthGain = ctx.createGain();
      this.masterSynthGain.gain.setValueAtTime(0.75, ctx.currentTime);
      audioEngine.connectAudioNode(this.masterSynthGain);
    }

    if (!this.noiseBuffer) {
      // Pre-generate 1-second white noise buffer for drums
      const bufferSize = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    return ctx;
  }

  public setScale(scale: SynthScale): void {
    this.currentScale = scale;
  }

  public getScale(): SynthScale {
    return this.currentScale;
  }

  public getNotes(): NoteDefinition[] {
    return SYNTH_SCALES[this.currentScale].notes;
  }

  /**
   * Play a synth keyboard note with rich dual-oscillator voice and ADSR envelope
   */
  public async triggerNote(noteIndex: number, velocity: number = 1.0): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterSynthGain) return;

    const notes = this.getNotes();
    const note = notes[noteIndex % notes.length];
    if (!note) return;

    const now = ctx.currentTime;
    const clampedVel = Math.min(1.0, Math.max(0.2, velocity));

    // Voice Voice Architecture: Sine (Fundamental) + Triangle (Harmonics) + Resonant Filter
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(note.freq * 3.5, now);
    filter.Q.setValueAtTime(3.0, now);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(note.freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(note.freq * 1.003, now); // subtle detune for stereo lushness

    // ADSR Envelope
    const attackTime = 0.015;
    const decayTime = 0.18;
    const sustainLevel = 0.35 * clampedVel;
    const releaseTime = 0.35;

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(clampedVel, now + attackTime);
    voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime + releaseTime);

    // Audio routing
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(this.masterSynthGain);

    osc1.start(now);
    osc2.start(now);

    const stopTime = now + attackTime + decayTime + releaseTime + 0.05;
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    setTimeout(() => {
      voiceGain.disconnect();
      filter.disconnect();
    }, (attackTime + decayTime + releaseTime + 0.1) * 1000);
  }

  /**
   * Synthesize real-time cyber drum hit
   */
  public async triggerDrum(
    drumId: 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'crash',
    velocity: number = 1.0
  ): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterSynthGain) return;

    const now = ctx.currentTime;
    const vel = Math.min(1.0, Math.max(0.2, velocity));

    switch (drumId) {
      case 'kick': {
        // Punchy 808 Sub Kick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

        gain.gain.setValueAtTime(1.0 * vel, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(this.masterSynthGain);

        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'snare': {
        // Tonal body + white noise burst
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        oscGain.gain.setValueAtTime(0.7 * vel, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(oscGain);
        oscGain.connect(this.masterSynthGain);
        osc.start(now);
        osc.stop(now + 0.15);

        if (this.noiseBuffer) {
          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = this.noiseBuffer;
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.setValueAtTime(1200, now);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.8 * vel, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.masterSynthGain);

          noiseSource.start(now);
          noiseSource.stop(now + 0.22);
        }
        break;
      }

      case 'hihat': {
        // Metallic high-pass noise burst
        if (!this.noiseBuffer) break;
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(9500, now);
        filter.Q.setValueAtTime(4.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7 * vel, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterSynthGain);

        noiseSource.start(now);
        noiseSource.stop(now + 0.07);
        break;
      }

      case 'tom': {
        // Low Tom pitch drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.15);

        gain.gain.setValueAtTime(0.9 * vel, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.masterSynthGain);

        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'clap': {
        // Multi-burst handclap
        if (!this.noiseBuffer) break;
        [0, 0.015, 0.03].forEach((offset) => {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now + offset);
          filter.Q.setValueAtTime(2.0, now + offset);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.7 * vel, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterSynthGain!);

          noise.start(now + offset);
          noise.stop(now + offset + 0.1);
        });
        break;
      }

      case 'crash': {
        // Long decay metallic shimmer
        if (!this.noiseBuffer) break;
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6 * vel, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterSynthGain);

        noiseSource.start(now);
        noiseSource.stop(now + 1.2);
        break;
      }
    }
  }

  /**
   * Continuous Theremin Laser control
   */
  public async setThereminState(
    isActive: boolean,
    normalizedY: number = 0.5,
    normalizedX: number = 0.5
  ): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (!ctx || !this.masterSynthGain) return;

    const now = ctx.currentTime;

    if (!isActive) {
      if (this.thereminGain) {
        this.thereminGain.gain.setTargetAtTime(0, now, 0.05);
      }
      return;
    }

    if (!this.thereminOsc || !this.thereminGain || !this.thereminFilter) {
      this.thereminOsc = ctx.createOscillator();
      this.thereminOsc.type = 'sawtooth';

      this.thereminFilter = ctx.createBiquadFilter();
      this.thereminFilter.type = 'lowpass';

      this.thereminGain = ctx.createGain();
      this.thereminGain.gain.setValueAtTime(0.001, now);

      this.thereminOsc.connect(this.thereminFilter);
      this.thereminFilter.connect(this.thereminGain);
      this.thereminGain.connect(this.masterSynthGain);

      this.thereminOsc.start(now);
    }

    // Pitch: 150Hz to 1200Hz based on Y position (higher hand = higher pitch)
    const targetFreq = 150 + (1 - normalizedY) * 1050;
    this.thereminOsc.frequency.setTargetAtTime(targetFreq, now, 0.03);

    // Filter Cutoff: 400Hz to 6000Hz based on X position
    const targetCutoff = 400 + normalizedX * 5600;
    this.thereminFilter.frequency.setTargetAtTime(targetCutoff, now, 0.03);

    // Gain ramp in
    this.thereminGain.gain.setTargetAtTime(0.6, now, 0.04);
  }
}

export const airSynth = new AirSynthEngine();
