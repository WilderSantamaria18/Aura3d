import { AudioEngine } from './audioEngine';

export type SoundscapeType = 'rain' | 'fire' | 'cafe' | 'ocean';

export interface SoundscapeState {
  volume: number; // 0 to 1
  enabled: boolean;
}

export interface SoundscapesConfig {
  masterMuted: boolean;
  rain: SoundscapeState;
  fire: SoundscapeState;
  cafe: SoundscapeState;
  ocean: SoundscapeState;
}

const STORAGE_KEY = 'aura3d_soundscapes_cfg';

const DEFAULT_CONFIG: SoundscapesConfig = {
  masterMuted: false,
  rain: { volume: 0.45, enabled: false },
  fire: { volume: 0.40, enabled: false },
  cafe: { volume: 0.35, enabled: false },
  ocean: { volume: 0.45, enabled: false },
};

class SoundscapeEngine {
  private static instance: SoundscapeEngine | null = null;
  private config: SoundscapesConfig = { ...DEFAULT_CONFIG };
  private isInitialized = false;

  // Audio nodes per soundscape
  private masterGain: GainNode | null = null;
  private channelGains: Record<SoundscapeType, GainNode | null> = {
    rain: null,
    fire: null,
    cafe: null,
    ocean: null,
  };

  // Node references for cleanup / loops
  private activeSources: (AudioNode | number)[] = [];
  private oceanLfoTimer: number | null = null;
  private fireCrackleTimer: number | null = null;
  private listeners: ((cfg: SoundscapesConfig) => void)[] = [];

  private constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = {
          ...DEFAULT_CONFIG,
          ...parsed,
          // Always start with soundscapes paused on fresh page load to respect user audio policy
          rain: { ...parsed.rain, enabled: false },
          fire: { ...parsed.fire, enabled: false },
          cafe: { ...parsed.cafe, enabled: false },
          ocean: { ...parsed.ocean, enabled: false },
        };
      }
    } catch {}
  }

  public static getInstance(): SoundscapeEngine {
    if (!SoundscapeEngine.instance) {
      SoundscapeEngine.instance = new SoundscapeEngine();
    }
    return SoundscapeEngine.instance;
  }

  public subscribe(listener: (cfg: SoundscapesConfig) => void): () => void {
    this.listeners.push(listener);
    listener(this.getConfig());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const cfg = this.getConfig();
    this.listeners.forEach((l) => l(cfg));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {}
  }

  public getConfig(): SoundscapesConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  private getAudioContext(): AudioContext | null {
    const engine = AudioEngine.getInstance();
    return engine.audioContext;
  }

  /**
   * Initializes master bus and starts synthesis for active channels
   */
  public async init(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.config.masterMuted ? 0 : 1, ctx.currentTime);

      const engine = AudioEngine.getInstance();
      if (engine.masterGain) {
        this.masterGain.connect(engine.masterGain);
      } else {
        this.masterGain.connect(ctx.destination);
      }
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * Toggle a specific soundscape on or off
   */
  public async toggleChannel(type: SoundscapeType): Promise<void> {
    const willEnable = !this.config[type].enabled;
    this.config[type].enabled = willEnable;

    if (willEnable) {
      await this.init();
      this.startChannel(type);
    } else {
      this.stopChannel(type);
    }

    this.notify();
  }

  /**
   * Set volume for a specific channel (0 to 1)
   */
  public setVolume(type: SoundscapeType, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.config[type].volume = clamped;

    const ctx = this.getAudioContext();
    const gainNode = this.channelGains[type];
    if (gainNode && ctx && this.config[type].enabled) {
      gainNode.gain.setTargetAtTime(clamped, ctx.currentTime, 0.05);
    }

    this.notify();
  }

  /**
   * Toggle master mute for all soundscapes
   */
  public toggleMasterMute(): void {
    this.config.masterMuted = !this.config.masterMuted;
    const ctx = this.getAudioContext();
    if (this.masterGain && ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.config.masterMuted ? 0 : 1,
        ctx.currentTime,
        0.05
      );
    }
    this.notify();
  }

  // ── Procedural Audio Buffers ─────────────────────────────────

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }

  // ── Channel Starters ─────────────────────────────────────────

  private startChannel(type: SoundscapeType): void {
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    this.stopChannel(type);

    const chGain = ctx.createGain();
    chGain.gain.setValueAtTime(this.config[type].volume, ctx.currentTime);
    chGain.connect(this.masterGain);
    this.channelGains[type] = chGain;

    switch (type) {
      case 'rain':
        this.startRainSynthesis(ctx, chGain);
        break;
      case 'fire':
        this.startFireSynthesis(ctx, chGain);
        break;
      case 'cafe':
        this.startCafeSynthesis(ctx, chGain);
        break;
      case 'ocean':
        this.startOceanSynthesis(ctx, chGain);
        break;
    }
  }

  private stopChannel(type: SoundscapeType): void {
    const chGain = this.channelGains[type];
    if (chGain) {
      try {
        chGain.disconnect();
      } catch {}
      this.channelGains[type] = null;
    }

    if (type === 'fire' && this.fireCrackleTimer !== null) {
      clearInterval(this.fireCrackleTimer);
      this.fireCrackleTimer = null;
    }
    if (type === 'ocean' && this.oceanLfoTimer !== null) {
      clearInterval(this.oceanLfoTimer);
      this.oceanLfoTimer = null;
    }
  }

  /**
   * 🌧️ Rain Synthesis:
   * Continuous pink noise through 750Hz bandpass filter + soft intermittent droplets.
   */
  private startRainSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    const pinkBuffer = this.createPinkNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = pinkBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, ctx.currentTime);
    filter.Q.setValueAtTime(0.75, ctx.currentTime);

    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(250, ctx.currentTime);

    source.connect(filter);
    filter.connect(highPass);
    highPass.connect(targetNode);
    source.start();

    this.activeSources.push(source);
  }

  /**
   * 🔥 Fire Crackle Synthesis:
   * Low-frequency brown rumble + stochastic Poisson crackle bursts.
   */
  private startFireSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    // 1. Deep campfire combustion rumble
    const brownBuffer = this.createBrownNoiseBuffer(ctx, 4);
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = brownBuffer;
    rumbleSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(140, ctx.currentTime);

    rumbleSource.connect(lowpass);
    lowpass.connect(targetNode);
    rumbleSource.start();
    this.activeSources.push(rumbleSource);

    // 2. High-frequency sporadic crackle clicks
    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.8, ctx.currentTime);
    crackleGain.connect(targetNode);

    const triggerCrackle = () => {
      if (!this.config.fire.enabled || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 2400, ctx.currentTime);

        const dur = 0.008 + Math.random() * 0.02;
        clickGain.gain.setValueAtTime(0.3 + Math.random() * 0.7, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

        osc.connect(clickGain);
        clickGain.connect(crackleGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      } catch {}

      // Schedule next random crackle (Poisson process 60ms to 320ms)
      const nextDelay = 60 + Math.random() * 260;
      this.fireCrackleTimer = window.setTimeout(triggerCrackle, nextDelay);
    };

    triggerCrackle();
  }

  /**
   * ☕ Night Café Ambience Synthesis:
   * Dual formant-filtered noise bands (500Hz & 1400Hz) with slow natural acoustic drift.
   */
  private startCafeSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    const pinkBuffer = this.createPinkNoiseBuffer(ctx, 5);
    const source = ctx.createBufferSource();
    source.buffer = pinkBuffer;
    source.loop = true;

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.setValueAtTime(520, ctx.currentTime);
    bp1.Q.setValueAtTime(1.8, ctx.currentTime);

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.setValueAtTime(1350, ctx.currentTime);
    bp2.Q.setValueAtTime(2.2, ctx.currentTime);

    const cafeGain = ctx.createGain();
    cafeGain.gain.setValueAtTime(0.65, ctx.currentTime);

    source.connect(bp1);
    source.connect(bp2);
    bp1.connect(cafeGain);
    bp2.connect(cafeGain);
    cafeGain.connect(targetNode);
    source.start();

    this.activeSources.push(source);
  }

  /**
   * 🌊 Night Ocean Waves Synthesis:
   * Lowpass filtered noise modulated with an 8.5s sinusoidal swell (incoming & receding surf).
   */
  private startOceanSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    const pinkBuffer = this.createPinkNoiseBuffer(ctx, 6);
    const source = ctx.createBufferSource();
    source.buffer = pinkBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.3, ctx.currentTime);

    source.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(targetNode);
    source.start();

    this.activeSources.push(source);

    // 8.5s sinusoidal wave swell modulation
    let phase = 0;
    const updateSwell = () => {
      if (!this.config.ocean.enabled || !ctx) return;
      phase += 0.05;
      // Smooth sinusoidal swell: 0.2 to 1.0
      const swell = (Math.sin(phase) + 1) / 2;
      const targetFreq = 220 + swell * 650; // 220Hz (calm) to 870Hz (crest)
      const targetVol = 0.25 + swell * 0.75;

      try {
        filter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
        swellGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1);
      } catch {}
    };

    this.oceanLfoTimer = window.setInterval(updateSwell, 100);
  }

  /**
   * Stop all soundscapes immediately
   */
  public stopAll(): void {
    (['rain', 'fire', 'cafe', 'ocean'] as SoundscapeType[]).forEach((type) => {
      this.config[type].enabled = false;
      this.stopChannel(type);
    });
    this.notify();
  }
}

export const soundscapeEngine = SoundscapeEngine.getInstance();
