import { AudioEngine } from './audioEngine';

export type SoundscapeType =
  | 'rain'
  | 'fire'
  | 'cafe'
  | 'ocean'
  | 'cosmic'
  | 'vinyl'
  | 'thunder'
  | 'forest';

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
  cosmic: SoundscapeState;
  vinyl: SoundscapeState;
  thunder: SoundscapeState;
  forest: SoundscapeState;
}

export interface SoundscapePreset {
  id: string;
  name: string;
  description: string;
  iconName: string;
  config: Partial<Record<SoundscapeType, number>>;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'rainy_cafe',
    name: 'Café Lluvioso',
    description: 'Lluvia en ventana y murmullo de café',
    iconName: 'Coffee',
    config: { rain: 0.55, cafe: 0.40 },
  },
  {
    id: 'space_meditation',
    name: 'Meditación Espacial',
    description: 'Binaural 432 Hz y oleaje cósmico',
    iconName: 'Sparkles',
    config: { cosmic: 0.60, ocean: 0.35 },
  },
  {
    id: 'forest_night',
    name: 'Noche en el Bosque',
    description: 'Grillos, brisa entre árboles y fogata',
    iconName: 'Flame',
    config: { forest: 0.55, fire: 0.35 },
  },
  {
    id: 'vintage_storm',
    name: 'Tormenta Vintage',
    description: 'Vinilo analógico con truenos y lluvia',
    iconName: 'Zap',
    config: { thunder: 0.55, vinyl: 0.40, rain: 0.30 },
  },
  {
    id: 'midnight_study',
    name: 'Estudio Nocturno',
    description: 'Vinilo retro, café y zumbido 432 Hz',
    iconName: 'Radio',
    config: { vinyl: 0.45, cafe: 0.30, cosmic: 0.35 },
  },
];

const STORAGE_KEY = 'aura3d_soundscapes_cfg';

const DEFAULT_CONFIG: SoundscapesConfig = {
  masterMuted: false,
  rain: { volume: 0.45, enabled: false },
  fire: { volume: 0.40, enabled: false },
  cafe: { volume: 0.35, enabled: false },
  ocean: { volume: 0.45, enabled: false },
  cosmic: { volume: 0.40, enabled: false },
  vinyl: { volume: 0.35, enabled: false },
  thunder: { volume: 0.45, enabled: false },
  forest: { volume: 0.40, enabled: false },
};

class SoundscapeEngine {
  private static instance: SoundscapeEngine | null = null;
  private config: SoundscapesConfig = { ...DEFAULT_CONFIG };

  // Audio nodes per soundscape
  private masterGain: GainNode | null = null;
  private channelGains: Record<SoundscapeType, GainNode | null> = {
    rain: null,
    fire: null,
    cafe: null,
    ocean: null,
    cosmic: null,
    vinyl: null,
    thunder: null,
    forest: null,
  };

  // Sources tracked per channel for clean teardown
  private channelSources: Record<SoundscapeType, AudioScheduledSourceNode[]> = {
    rain: [],
    fire: [],
    cafe: [],
    ocean: [],
    cosmic: [],
    vinyl: [],
    thunder: [],
    forest: [],
  };

  // Active timers
  private oceanLfoTimer: ReturnType<typeof setInterval> | null = null;
  private fireCrackleTimer: ReturnType<typeof setTimeout> | null = null;
  private vinylCrackleTimer: ReturnType<typeof setTimeout> | null = null;
  private thunderTimer: ReturnType<typeof setTimeout> | null = null;
  private thunderRumbleTimeout: ReturnType<typeof setTimeout> | null = null;
  private cricketTimer: ReturnType<typeof setTimeout> | null = null;
  private windLfoTimer: ReturnType<typeof setInterval> | null = null;

  private listeners: ((cfg: SoundscapesConfig) => void)[] = [];

  private constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config = {
            ...DEFAULT_CONFIG,
            ...parsed,
            // Always start disabled on initial load to respect audio autoplay policy
            rain: { ...parsed.rain, enabled: false },
            fire: { ...parsed.fire, enabled: false },
            cafe: { ...parsed.cafe, enabled: false },
            ocean: { ...parsed.ocean, enabled: false },
            cosmic: { ...(parsed.cosmic || DEFAULT_CONFIG.cosmic), enabled: false },
            vinyl: { ...(parsed.vinyl || DEFAULT_CONFIG.vinyl), enabled: false },
            thunder: { ...(parsed.thunder || DEFAULT_CONFIG.thunder), enabled: false },
            forest: { ...(parsed.forest || DEFAULT_CONFIG.forest), enabled: false },
          };
        }
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
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
   * Initializes master bus and connects to global audio graph
   */
  public async init(): Promise<boolean> {
    const engine = AudioEngine.getInstance();

    try {
      await engine.init();
    } catch (error) {
      console.warn('[SoundscapeEngine] No se pudo iniciar el motor de audio.', error);
      return false;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (error) {
        console.warn('[SoundscapeEngine] No se pudo reanudar el audio.', error);
        return false;
      }
    }

    if (ctx.state !== 'running') return false;

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.config.masterMuted ? 0 : 1, ctx.currentTime);

      if (engine.masterGain) {
        this.masterGain.connect(engine.masterGain);
      } else {
        this.masterGain.connect(ctx.destination);
      }
    }

    return true;
  }

  /**
   * Toggle a specific soundscape on or off
   */
  public async toggleChannel(type: SoundscapeType): Promise<boolean> {
    const willEnable = !this.config[type].enabled;

    if (willEnable) {
      const ready = await this.init();
      if (!ready) return false;
      this.config[type].enabled = true;
      this.startChannel(type);
    } else {
      this.config[type].enabled = false;
      this.stopChannel(type);
    }

    this.notify();
    return true;
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
   * Apply a soundscape mix preset
   */
  public async applyPreset(presetId: string): Promise<boolean> {
    const preset = SOUNDSCAPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;

    const ready = await this.init();
    if (!ready) return false;

    const allTypes: SoundscapeType[] = [
      'rain',
      'fire',
      'cafe',
      'ocean',
      'cosmic',
      'vinyl',
      'thunder',
      'forest',
    ];

    for (const type of allTypes) {
      const vol = preset.config[type];
      if (vol !== undefined && vol > 0) {
        this.config[type].volume = vol;
        this.config[type].enabled = true;
        this.startChannel(type);
      } else {
        this.config[type].enabled = false;
        this.stopChannel(type);
      }
    }

    this.notify();
    return true;
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
      data[i] *= 3.5;
    }
    return buffer;
  }

  // ── Channel Router ─────────────────────────────────────────

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
      case 'cosmic':
        this.startCosmicSynthesis(ctx, chGain);
        break;
      case 'vinyl':
        this.startVinylSynthesis(ctx, chGain);
        break;
      case 'thunder':
        this.startThunderSynthesis(ctx, chGain);
        break;
      case 'forest':
        this.startForestSynthesis(ctx, chGain);
        break;
    }
  }

  private stopChannel(type: SoundscapeType): void {
    this.channelSources[type].forEach((source) => {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    });
    this.channelSources[type] = [];

    const chGain = this.channelGains[type];
    if (chGain) {
      try {
        chGain.disconnect();
      } catch {}
      this.channelGains[type] = null;
    }

    if (type === 'fire' && this.fireCrackleTimer !== null) {
      clearTimeout(this.fireCrackleTimer);
      this.fireCrackleTimer = null;
    }
    if (type === 'ocean' && this.oceanLfoTimer !== null) {
      clearInterval(this.oceanLfoTimer);
      this.oceanLfoTimer = null;
    }
    if (type === 'vinyl' && this.vinylCrackleTimer !== null) {
      clearTimeout(this.vinylCrackleTimer);
      this.vinylCrackleTimer = null;
    }
    if (type === 'thunder') {
      if (this.thunderTimer !== null) {
        clearTimeout(this.thunderTimer);
        this.thunderTimer = null;
      }
      if (this.thunderRumbleTimeout !== null) {
        clearTimeout(this.thunderRumbleTimeout);
        this.thunderRumbleTimeout = null;
      }
      if (this.windLfoTimer !== null) {
        clearInterval(this.windLfoTimer);
        this.windLfoTimer = null;
      }
    }
    if (type === 'forest' && this.cricketTimer !== null) {
      clearTimeout(this.cricketTimer);
      this.cricketTimer = null;
    }
  }

  // ── 1. 🌧️ Rain Synthesis ────────────────────────────────────

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

    this.channelSources.rain.push(source);
  }

  // ── 2. 🔥 Fire Synthesis ────────────────────────────────────

  private startFireSynthesis(ctx: AudioContext, targetNode: GainNode): void {
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
    this.channelSources.fire.push(rumbleSource);

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

      const nextDelay = 60 + Math.random() * 260;
      this.fireCrackleTimer = setTimeout(triggerCrackle, nextDelay);
    };

    triggerCrackle();
  }

  // ── 3. ☕ Cafe Synthesis ────────────────────────────────────

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

    this.channelSources.cafe.push(source);
  }

  // ── 4. 🌊 Ocean Synthesis ───────────────────────────────────

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

    this.channelSources.ocean.push(source);

    let phase = 0;
    const updateSwell = () => {
      if (!this.config.ocean.enabled || !ctx) return;
      phase += 0.05;
      const swell = (Math.sin(phase) + 1) / 2;
      const targetFreq = 220 + swell * 650;
      const targetVol = 0.25 + swell * 0.75;

      try {
        filter.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
        swellGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1);
      } catch {}
    };

    this.oceanLfoTimer = setInterval(updateSwell, 100);
  }

  // ── 5. 🪐 Cosmic 432 Hz Drone (Binaural Theta Beat) ──────────

  private startCosmicSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    // Left ear: 432 Hz Pythagorean frequency
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(432.0, ctx.currentTime);

    // Right ear: 436 Hz (Generates a 4 Hz Theta binaural beat for deep meditation & focus)
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(436.0, ctx.currentTime);

    // Sub-drone at 108 Hz (2 octaves below) for cosmic gravitational weight
    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(108.0, ctx.currentTime);

    // Warmth harmonic at 216 Hz
    const oscWarmth = ctx.createOscillator();
    oscWarmth.type = 'sine';
    oscWarmth.frequency.setValueAtTime(216.0, ctx.currentTime);

    // Master filter with breathing space resonance
    const cosmicFilter = ctx.createBiquadFilter();
    cosmicFilter.type = 'lowpass';
    cosmicFilter.frequency.setValueAtTime(650, ctx.currentTime);
    cosmicFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    const panLeft = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const panRight = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    if (panLeft && panRight) {
      panLeft.pan.setValueAtTime(-0.85, ctx.currentTime);
      panRight.pan.setValueAtTime(0.85, ctx.currentTime);
      oscLeft.connect(panLeft);
      panLeft.connect(cosmicFilter);
      oscRight.connect(panRight);
      panRight.connect(cosmicFilter);
    } else {
      oscLeft.connect(cosmicFilter);
      oscRight.connect(cosmicFilter);
    }

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.45, ctx.currentTime);
    oscSub.connect(subGain);
    subGain.connect(cosmicFilter);

    const warmthGain = ctx.createGain();
    warmthGain.gain.setValueAtTime(0.35, ctx.currentTime);
    oscWarmth.connect(warmthGain);
    warmthGain.connect(cosmicFilter);

    cosmicFilter.connect(targetNode);

    oscLeft.start();
    oscRight.start();
    oscSub.start();
    oscWarmth.start();

    this.channelSources.cosmic.push(oscLeft, oscRight, oscSub, oscWarmth);
  }

  // ── 6. 📻 Vintage Vinyl Crackle (33 RPM Acetate Noise) ───────

  private startVinylSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    // 1. Surface friction bed (pink noise with 1200Hz highpass & 5800Hz lowpass)
    const pinkBuffer = this.createPinkNoiseBuffer(ctx, 4);
    const surfaceNoise = ctx.createBufferSource();
    surfaceNoise.buffer = pinkBuffer;
    surfaceNoise.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1200, ctx.currentTime);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5800, ctx.currentTime);

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.18, ctx.currentTime);

    surfaceNoise.connect(hp);
    hp.connect(lp);
    lp.connect(bedGain);
    bedGain.connect(targetNode);
    surfaceNoise.start();
    this.channelSources.vinyl.push(surfaceNoise);

    // 2. Subtle 50Hz turntable pre-amp ground hum
    const humOsc = ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(50.0, ctx.currentTime);

    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.04, ctx.currentTime);
    humOsc.connect(humGain);
    humGain.connect(targetNode);
    humOsc.start();
    this.channelSources.vinyl.push(humOsc);

    // 3. Sporadic acetate needle crackle pops
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.7, ctx.currentTime);
    popGain.connect(targetNode);

    const triggerVinylPop = () => {
      if (!this.config.vinyl.enabled || !ctx) return;
      try {
        const osc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        osc.type = Math.random() > 0.5 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(2000 + Math.random() * 5000, ctx.currentTime);

        const dur = 0.003 + Math.random() * 0.007; // Very snappy 3-10ms clicks
        clickGain.gain.setValueAtTime(0.2 + Math.random() * 0.55, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

        osc.connect(clickGain);
        clickGain.connect(popGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      } catch {}

      const nextPop = 40 + Math.random() * 220;
      this.vinylCrackleTimer = setTimeout(triggerVinylPop, nextPop);
    };

    triggerVinylPop();
  }

  // ── 7. ⚡ Thunderstorm & Wind (Low-frequency rolling thunder) ─

  private startThunderSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    // 1. Gusting howling wind bed
    const windBuffer = this.createPinkNoiseBuffer(ctx, 6);
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, ctx.currentTime);
    windFilter.Q.setValueAtTime(1.8, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.4, ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(targetNode);
    windSource.start();
    this.channelSources.thunder.push(windSource);

    // Wind gusting LFO modulation
    let windPhase = 0;
    this.windLfoTimer = setInterval(() => {
      if (!this.config.thunder.enabled || !ctx) return;
      windPhase += 0.08;
      const gust = (Math.sin(windPhase) + Math.cos(windPhase * 0.7) + 2) / 4;
      try {
        windFilter.frequency.setTargetAtTime(200 + gust * 450, ctx.currentTime, 0.2);
        windGain.gain.setTargetAtTime(0.25 + gust * 0.6, ctx.currentTime, 0.2);
      } catch {}
    }, 120);

    // 2. Heavy downpour background
    const rainBuffer = this.createPinkNoiseBuffer(ctx, 4);
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.setValueAtTime(900, ctx.currentTime);

    const rainVol = ctx.createGain();
    rainVol.gain.setValueAtTime(0.3, ctx.currentTime);

    rainSource.connect(rainLp);
    rainLp.connect(rainVol);
    rainVol.connect(targetNode);
    rainSource.start();
    this.channelSources.thunder.push(rainSource);

    // 3. Procedural Rolling Thunderclap Trigger
    const scheduleThunder = () => {
      if (!this.config.thunder.enabled || !ctx) return;
      try {
        const brownBuf = this.createBrownNoiseBuffer(ctx, 5);
        const thunderNoise = ctx.createBufferSource();
        thunderNoise.buffer = brownBuf;

        const thunderFilter = ctx.createBiquadFilter();
        thunderFilter.type = 'lowpass';
        thunderFilter.frequency.setValueAtTime(180, ctx.currentTime);
        thunderFilter.Q.setValueAtTime(3.5, ctx.currentTime);

        const thunderGain = ctx.createGain();
        thunderGain.gain.setValueAtTime(0.01, ctx.currentTime);
        thunderGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.15);
        thunderGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.8);

        // Sub-bass physical vibration boom
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(56, ctx.currentTime);
        subOsc.frequency.exponentialRampToValueAtTime(34, ctx.currentTime + 3.0);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.5, ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);

        thunderNoise.connect(thunderFilter);
        thunderFilter.connect(thunderGain);
        thunderGain.connect(targetNode);

        subOsc.connect(subGain);
        subGain.connect(targetNode);

        thunderNoise.start(ctx.currentTime);
        thunderNoise.stop(ctx.currentTime + 5.0);
        subOsc.start(ctx.currentTime);
        subOsc.stop(ctx.currentTime + 3.6);
      } catch {}

      // Next thunder in 12 to 26 seconds
      const nextDelay = 12000 + Math.random() * 14000;
      this.thunderTimer = setTimeout(scheduleThunder, nextDelay);
    };

    // Initial thunderclap after 4 seconds
    this.thunderTimer = setTimeout(scheduleThunder, 4000);
  }

  // ── 8. 🌲 Forest Night (Breeze & Procedural Crickets) ─────────

  private startForestSynthesis(ctx: AudioContext, targetNode: GainNode): void {
    // 1. Gentle rustling pine breeze
    const brownBuffer = this.createBrownNoiseBuffer(ctx, 5);
    const breezeSource = ctx.createBufferSource();
    breezeSource.buffer = brownBuffer;
    breezeSource.loop = true;

    const breezeFilter = ctx.createBiquadFilter();
    breezeFilter.type = 'lowpass';
    breezeFilter.frequency.setValueAtTime(380, ctx.currentTime);

    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.35, ctx.currentTime);

    breezeSource.connect(breezeFilter);
    breezeFilter.connect(breezeGain);
    breezeGain.connect(targetNode);
    breezeSource.start();
    this.channelSources.forest.push(breezeSource);

    // 2. Procedural Night Crickets Synthesis
    const triggerCricketChirpGroup = () => {
      if (!this.config.forest.enabled || !ctx) return;
      try {
        const chirpsCount = 2 + Math.floor(Math.random() * 3);
        const baseFreq = 4600 + Math.random() * 400;

        for (let i = 0; i < chirpsCount; i++) {
          const chirpTime = ctx.currentTime + i * 0.09;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, chirpTime);

          const chirpGain = ctx.createGain();
          chirpGain.gain.setValueAtTime(0.001, chirpTime);
          chirpGain.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.2, chirpTime + 0.03);
          chirpGain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.07);

          osc.connect(chirpGain);
          chirpGain.connect(targetNode);
          osc.start(chirpTime);
          osc.stop(chirpTime + 0.08);
        }
      } catch {}

      // Next chirp group in 0.8s to 2.4s
      const nextChirp = 800 + Math.random() * 1600;
      this.cricketTimer = setTimeout(triggerCricketChirpGroup, nextChirp);
    };

    triggerCricketChirpGroup();
  }

  /**
   * Stop all soundscapes immediately
   */
  public stopAll(): void {
    const allTypes: SoundscapeType[] = [
      'rain',
      'fire',
      'cafe',
      'ocean',
      'cosmic',
      'vinyl',
      'thunder',
      'forest',
    ];
    allTypes.forEach((type) => {
      this.config[type].enabled = false;
      this.stopChannel(type);
    });
    this.notify();
  }
}

export const soundscapeEngine = SoundscapeEngine.getInstance();
export default soundscapeEngine;
