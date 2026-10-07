/**
 * DemoAudioSynthesizer — Real-time Web Audio Synthesizer for Landing Hero
 *
 * Produces instant, zero-latency, high-fidelity audio stems purely with the
 * native Web Audio API (oscillators, envelopes, biquad filters, noise).
 * Requires zero external audio downloads and works 100% offline.
 * Exposes an AnalyserNode so landing visualizers can react to real audio frequencies.
 */

export type DemoPreset = 'cyberpunk' | 'lofi' | 'spatial';

class DemoAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning = false;
  private currentPreset: DemoPreset | null = null;
  private loopTimer: number | null = null;
  private dataArray: Uint8Array | null = null;
  private masterGain: GainNode | null = null;
  private listeners: Set<(preset: DemoPreset | null) => void> = new Set();

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public subscribe(cb: (preset: DemoPreset | null) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentPreset));
  }

  public getCurrentPreset(): DemoPreset | null {
    return this.currentPreset;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray || !this.isRunning) return null;
    this.analyser.getByteFrequencyData(this.dataArray as unknown as Uint8Array<ArrayBuffer>);
    return this.dataArray;
  }

  public async start(preset: DemoPreset = 'cyberpunk') {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.isRunning = true;
    this.currentPreset = preset;
    this.notify();

    let step = 0;
    const bpm = preset === 'lofi' ? 84 : preset === 'cyberpunk' ? 124 : 110;
    const stepInterval = (60 / bpm / 4) * 1000; // 16th notes

    const tick = () => {
      if (!this.isRunning || !this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;

      if (preset === 'cyberpunk') {
        this.playCyberpunkStep(step, t);
      } else if (preset === 'lofi') {
        this.playLofiStep(step, t);
      } else {
        this.playSpatialStep(step, t);
      }

      step = (step + 1) % 16;
      this.loopTimer = window.setTimeout(tick, stepInterval);
    };

    tick();
  }

  public stop() {
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.isRunning = false;
    this.currentPreset = null;
    this.notify();
  }

  public toggle(preset: DemoPreset) {
    if (this.isRunning && this.currentPreset === preset) {
      this.stop();
    } else {
      void this.start(preset);
    }
  }

  // ── PRESET 1: Cyberpunk 808 ───────────────────────────────────────────────
  private playCyberpunkStep(step: number, t: number) {
    if (!this.ctx || !this.masterGain) return;

    // Kick on steps 0, 4, 8, 12 (four-on-the-floor)
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);

      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    // Snare on steps 4 and 12
    if (step === 4 || step === 12) {
      const noise = this.createNoiseBuffer();
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
        src.stop(t + 0.2);
      }
    }

    // Hi-hat on every off-beat 16th
    if (step % 2 === 1) {
      const noise = this.createNoiseBuffer();
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
        src.stop(t + 0.06);
      }
    }

    // 16th-note Arp Bass
    const arpNotes = [55, 55, 110, 82.4, 55, 65.4, 98, 73.4];
    const freq = arpNotes[step % arpNotes.length];
    const arpOsc = this.ctx.createOscillator();
    const arpFilter = this.ctx.createBiquadFilter();
    const arpGain = this.ctx.createGain();

    arpOsc.type = 'sawtooth';
    arpOsc.frequency.setValueAtTime(freq, t);

    arpFilter.type = 'lowpass';
    const cutoff = 400 + Math.sin(t * 2) * 600;
    arpFilter.frequency.setValueAtTime(cutoff, t);

    arpGain.gain.setValueAtTime(0.3, t);
    arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    arpOsc.connect(arpFilter);
    arpFilter.connect(arpGain);
    arpGain.connect(this.masterGain);
    arpOsc.start(t);
    arpOsc.stop(t + 0.14);
  }

  // ── PRESET 2: Lo-Fi Dream ─────────────────────────────────────────────────
  private playLofiStep(step: number, t: number) {
    if (!this.ctx || !this.masterGain) return;

    // Sub kick on steps 0, 7, 10
    if (step === 0 || step === 7 || step === 10) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.2);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.36);
    }

    // Rim snare on steps 4 and 12
    if (step === 4 || step === 12) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    // Warm Rhodes Chords on measure start (step 0 and 8)
    if (step === 0 || step === 8) {
      const chord = step === 0 ? [220, 261.6, 329.6, 392] : [196, 246.9, 293.7, 349.2];
      chord.forEach((f) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.95);
      });
    }
  }

  // ── PRESET 3: Spatial Pulse ───────────────────────────────────────────────
  private playSpatialStep(step: number, t: number) {
    if (!this.ctx || !this.masterGain) return;

    if (step === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.6);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.75);
    }

    if (step % 2 === 0) {
      const notes = [440, 554.37, 659.25, 880, 987.77];
      const freq = notes[(step / 2) % notes.length];
      const osc = this.ctx.createOscillator();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      if (panner) {
        panner.pan.setValueAtTime(Math.sin(step * 0.8), t);
        osc.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 0.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
}

export const demoAudioSynthesizer = new DemoAudioSynthesizer();
