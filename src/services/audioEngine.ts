import type { EqualizerBand, FrequencyData } from '../types/audio';
import { usePlayerStore } from '../stores/playerStore';

export const DEFAULT_EQ_BANDS: EqualizerBand[] = [
  { id: 0, frequency: 32, label: '32Hz', gain: 0, type: 'lowshelf' },
  { id: 1, frequency: 64, label: '64Hz', gain: 0, type: 'peaking' },
  { id: 2, frequency: 125, label: '125Hz', gain: 0, type: 'peaking' },
  { id: 3, frequency: 250, label: '250Hz', gain: 0, type: 'peaking' },
  { id: 4, frequency: 500, label: '500Hz', gain: 0, type: 'peaking' },
  { id: 5, frequency: 1000, label: '1kHz', gain: 0, type: 'peaking' },
  { id: 6, frequency: 2000, label: '2kHz', gain: 0, type: 'peaking' },
  { id: 7, frequency: 4000, label: '4kHz', gain: 0, type: 'peaking' },
  { id: 8, frequency: 8000, label: '8kHz', gain: 0, type: 'peaking' },
  { id: 9, frequency: 16000, label: '16kHz', gain: 0, type: 'highshelf' },
];

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public audioContext: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public masterGain: GainNode | null = null;

  // Dual audio elements for seamless crossfading
  private audioElementA: HTMLAudioElement;
  private audioElementB: HTMLAudioElement;
  private sourceNodeA: MediaElementAudioSourceNode | null = null;
  private sourceNodeB: MediaElementAudioSourceNode | null = null;
  private gainNodeA: GainNode | null = null;
  private gainNodeB: GainNode | null = null;
  private activeSlot: 'A' | 'B' = 'A';

  // Local file via AudioBuffer (bypasses <audio> element for seek+FFT)
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private loadedAudioBuffer: AudioBuffer | null = null;
  private bufferGain: GainNode | null = null;
  private bufferStartOffset = 0;
  private bufferStartTime = 0;
  private bufferIsPlaying = false;

  // Live microphone & system capture
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private isMicActive = false;

  private systemStream: MediaStream | null = null;
  private systemSourceNode: MediaStreamAudioSourceNode | null = null;
  private isSystemActive = false;

  private eqFilters: BiquadFilterNode[] = [];
  private bands: EqualizerBand[] = [...DEFAULT_EQ_BANDS];

  private frequencyBuffer: Uint8Array | null = null;
  private isInitialized = false;

  private listeners: {
    timeUpdate: ((currentTime: number, duration: number) => void)[];
    ended: (() => void)[];
    stateChange: ((isPlaying: boolean) => void)[];
  } = {
    timeUpdate: [],
    ended: [],
    stateChange: [],
  };

  private constructor() {
    this.audioElementA = new Audio();
    this.audioElementB = new Audio();
    this.audioElementA.crossOrigin = 'anonymous';
    this.audioElementB.crossOrigin = 'anonymous';
    this.audioElementA.preload = 'auto';
    this.audioElementB.preload = 'auto';

    this.setupAudioElementListeners(this.audioElementA, 'A');
    this.setupAudioElementListeners(this.audioElementB, 'B');
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private setupAudioElementListeners(audio: HTMLAudioElement, slot: 'A' | 'B') {
    audio.addEventListener('timeupdate', () => {
      if (this.activeSlot === slot && !this.loadedAudioBuffer) {
        const current = audio.currentTime;
        const dur = audio.duration || 0;
        this.listeners.timeUpdate.forEach((cb) => cb(current, dur));
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeSlot === slot && !this.loadedAudioBuffer) {
        this.listeners.ended.forEach((cb) => cb());
      }
    });

    audio.addEventListener('play', () => {
      if (this.activeSlot === slot && !this.loadedAudioBuffer) {
        this.listeners.stateChange.forEach((cb) => cb(true));
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activeSlot === slot && !this.loadedAudioBuffer) {
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Master Analyser Node for FFT computation — ultra-low latency & zero temporal lag
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount);

    // Master Gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.audioContext.currentTime);

    // Build Equalizer filter chain
    this.eqFilters = this.bands.map((band) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.setValueAtTime(band.frequency, this.audioContext!.currentTime);
      filter.gain.setValueAtTime(band.gain, this.audioContext!.currentTime);
      return filter;
    });

    // Connect EQ filters in series: filter[0] -> filter[1] -> ... -> filter[n]
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // Connect last filter -> Master Gain -> Analyser -> Destination
    const lastFilter = this.eqFilters[this.eqFilters.length - 1];
    lastFilter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    // Setup Dual Source Nodes and Gain Nodes for Crossfade
    this.sourceNodeA = this.audioContext.createMediaElementSource(this.audioElementA);
    this.sourceNodeB = this.audioContext.createMediaElementSource(this.audioElementB);

    this.gainNodeA = this.audioContext.createGain();
    this.gainNodeB = this.audioContext.createGain();

    this.gainNodeA.gain.setValueAtTime(1.0, this.audioContext.currentTime);
    this.gainNodeB.gain.setValueAtTime(0.0, this.audioContext.currentTime);

    // Connect sources to their respective slot gain, then to the first EQ filter
    this.sourceNodeA.connect(this.gainNodeA);
    this.sourceNodeB.connect(this.gainNodeB);

    this.gainNodeA.connect(this.eqFilters[0]);
    this.gainNodeB.connect(this.eqFilters[0]);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isInitialized = true;
    usePlayerStore.getState().setAnalyser(this.analyser, this.audioContext);
  }

  /**
   * Load a local audio file (ArrayBuffer) through the singleton analyser chain.
   * This is the KEY fix: local files now route through the SAME analyser that
   * useVisualizer reads from, so the 3D visualizer reacts to the audio.
   */
  public async loadArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<number> {
    await this.init();
    if (!this.audioContext) return 0;

    // Stop any existing buffer playback
    this._stopBufferSource();

    // Decode
    const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
    this.loadedAudioBuffer = decoded;

    // Build a dedicated gain node for buffer playback
    this.bufferGain = this.audioContext.createGain();
    this.bufferGain.gain.setValueAtTime(
      this.masterGain!.gain.value,
      this.audioContext.currentTime
    );
    // Route: bufferSource -> bufferGain -> eqFilters[0] -> masterGain -> analyser -> destination
    this.bufferGain.connect(this.eqFilters[0]);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Fire timeUpdate events via rAF
    this._startBufferTimeLoop();

    // Start from 0
    this._startBufferFrom(0);

    this.listeners.stateChange.forEach((cb) => cb(true));

    console.log(`[AudioEngine] Loaded buffer: "${fileName}", duration=${decoded.duration.toFixed(2)}s`);
    return decoded.duration;
  }

  private _startBufferFrom(offset: number): void {
    if (!this.audioContext || !this.loadedAudioBuffer || !this.bufferGain) return;
    this._stopBufferSource();

    const src = this.audioContext.createBufferSource();
    src.buffer = this.loadedAudioBuffer;
    src.connect(this.bufferGain);

    this.bufferStartOffset = offset;
    this.bufferStartTime = this.audioContext.currentTime;
    src.start(0, offset);
    this.bufferSourceNode = src;
    this.bufferIsPlaying = true;

    src.onended = () => {
      if (this.bufferIsPlaying) {
        this.bufferIsPlaying = false;
        this.listeners.ended.forEach((cb) => cb());
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
    };
  }

  private _stopBufferSource(): void {
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.onended = null;
        this.bufferSourceNode.stop();
        this.bufferSourceNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.bufferSourceNode = null;
    }
    this.bufferIsPlaying = false;
  }

  private _bufferRafId: number | null = null;
  private _lastTimeUpdateEmit = 0;
  private _startBufferTimeLoop(): void {
    if (this._bufferRafId) cancelAnimationFrame(this._bufferRafId);
    const tick = () => {
      if (!this.loadedAudioBuffer || !this.audioContext) return;
      if (this.bufferIsPlaying) {
        const now = performance.now();
        // Throttle timeUpdate to 4 times per second (250ms interval) to match native HTML5 audio timeupdate
        if (now - this._lastTimeUpdateEmit >= 250) {
          this._lastTimeUpdateEmit = now;
          const elapsed = this.bufferStartOffset + (this.audioContext.currentTime - this.bufferStartTime);
          const clamped = Math.min(elapsed, this.loadedAudioBuffer.duration);
          this.listeners.timeUpdate.forEach((cb) => cb(clamped, this.loadedAudioBuffer!.duration));
        }
      }
      this._bufferRafId = requestAnimationFrame(tick);
    };
    this._bufferRafId = requestAnimationFrame(tick);
  }

  public seekBuffer(seconds: number): void {
    if (!this.loadedAudioBuffer || !this.audioContext) return;
    const clamped = Math.max(0, Math.min(seconds, this.loadedAudioBuffer.duration));
    this._startBufferFrom(clamped);
    if (!this.bufferIsPlaying) {
      this.bufferIsPlaying = true;
      this.listeners.stateChange.forEach((cb) => cb(true));
    }
  }

  public unloadBuffer(): void {
    this._stopBufferSource();
    if (this._bufferRafId) {
      cancelAnimationFrame(this._bufferRafId);
      this._bufferRafId = null;
    }
    if (this.bufferGain) {
      this.bufferGain.disconnect();
      this.bufferGain = null;
    }
    this.loadedAudioBuffer = null;
    this.bufferStartOffset = 0;
    this.bufferStartTime = 0;
  }

  public isBufferMode(): boolean {
    return this.loadedAudioBuffer !== null;
  }

  /**
   * Enables system / screen / browser tab audio capture.
   *
   * NO DOUBLE AUDIO: The tab/system audio already plays through the OS.
   * Connect ONLY to the analyser (FFT read) — never to destination.
   *
   * Chain: systemSourceNode → analyser  (visualizer reads FFT, no re-output)
   */
  public async enableSystemCapture(stream: MediaStream): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.analyser) return;

    this.unloadBuffer();
    this.disableSystemCapture();

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = true;
    }
    // Drop video tracks to save CPU / GPU
    stream.getVideoTracks().forEach((t) => t.stop());

    this.systemStream = stream;
    this.systemSourceNode = this.audioContext.createMediaStreamSource(stream);

    // ✅ Analyser only — the audio is already playing in the browser. No re-route.
    this.systemSourceNode.connect(this.analyser);
    this.isSystemActive = true;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public disableSystemCapture(): void {
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
    }
    if (this.systemSourceNode) {
      this.systemSourceNode.disconnect();
      this.systemSourceNode = null;
    }
    this.isSystemActive = false;
  }

  /**
   * Enables live microphone input stream to feed the FFT analyser in real-time
   */
  public async enableMicrophone(): Promise<void> {
    await this.init();
    if (!this.audioContext) return;

    if (this.isMicActive && this.micSourceNode) {
      return;
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
      this.micGain = this.audioContext.createGain();
      this.micGain.gain.setValueAtTime(1.2, this.audioContext.currentTime);

      // Connect mic to Analyser only (NOT to destination to avoid feedback loop)
      this.micSourceNode.connect(this.micGain);
      this.micGain.connect(this.analyser!);

      this.isMicActive = true;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      throw err;
    }
  }

  public disableMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    if (this.micGain) {
      this.micGain.disconnect();
      this.micGain = null;
    }
    this.isMicActive = false;
  }

  public isMicrophoneActive(): boolean {
    return this.isMicActive;
  }

  public isSystemCaptureActive(): boolean {
    return this.isSystemActive;
  }

  public async loadTrack(url: string, playImmediately = true): Promise<void> {
    await this.init();

    // Unload any local buffer first
    this.unloadBuffer();

    const activeAudio = this.getActiveAudioElement();
    activeAudio.src = url;
    activeAudio.load();

    if (playImmediately) {
      try {
        await activeAudio.play();
      } catch (err) {
        console.warn('Playback requires user gesture unlock:', err);
      }
    }
  }

  public async play(): Promise<void> {
    await this.init();
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.loadedAudioBuffer) {
      if (!this.bufferIsPlaying) {
        this._startBufferFrom(this.bufferStartOffset);
        this.listeners.stateChange.forEach((cb) => cb(true));
      }
      return;
    }
    const audio = this.getActiveAudioElement();
    if (audio.src) {
      try {
        await audio.play();
      } catch (e) {
        console.warn('Play error:', e);
      }
    }
  }

  public pause(): void {
    if (this.loadedAudioBuffer) {
      if (this.bufferIsPlaying && this.audioContext) {
        // Save offset so we can resume from here
        this.bufferStartOffset += this.audioContext.currentTime - this.bufferStartTime;
        this._stopBufferSource();
        this.bufferIsPlaying = false;
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
      // Also suspend context so analyser goes quiet
      this.audioContext?.suspend();
      return;
    }
    const audio = this.getActiveAudioElement();
    audio.pause();
    this.audioContext?.suspend();
  }

  public async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.loadedAudioBuffer && !this.bufferIsPlaying) {
      this._startBufferFrom(this.bufferStartOffset);
      this.bufferIsPlaying = true;
      this.listeners.stateChange.forEach((cb) => cb(true));
      return;
    }
    const audio = this.getActiveAudioElement();
    if (audio.src && audio.paused) {
      await audio.play().catch(() => {});
    }
  }

  public stop(): void {
    this.unloadBuffer();
    const audio = this.getActiveAudioElement();
    audio.pause();
    audio.currentTime = 0;
    this.disableMicrophone();
    this.disableSystemCapture();
  }

  public seek(seconds: number): void {
    if (this.loadedAudioBuffer) {
      this.seekBuffer(seconds);
      return;
    }
    const audio = this.getActiveAudioElement();
    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
    if (this.bufferGain && this.audioContext) {
      this.bufferGain.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
    this.audioElementA.volume = clamped;
    this.audioElementB.volume = clamped;
  }

  public setBandGain(bandId: number, gainDb: number): void {
    const clampedGain = Math.max(-12, Math.min(12, gainDb));
    this.bands = this.bands.map((b) => (b.id === bandId ? { ...b, gain: clampedGain } : b));
    if (this.eqFilters[bandId] && this.audioContext) {
      this.eqFilters[bandId].gain.setValueAtTime(clampedGain, this.audioContext.currentTime);
    }
  }

  public getBands(): EqualizerBand[] {
    return [...this.bands];
  }

  public getFrequencyData(): FrequencyData {
    if (!this.analyser || !this.frequencyBuffer) {
      return {
        raw: new Uint8Array(256),
        bass: 0,
        mids: 0,
        highs: 0,
        energy: 0,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getByteFrequencyData(this.frequencyBuffer as any);

    // Compute Weighted Lows / Sub-Bass & Kick (Bins 0 - 12)
    // Low bins (0-5: 20Hz - 220Hz) carry the main kick & 808 sub-bass.
    let bassWeightedSum = 0;
    let bassWeightTotal = 0;
    for (let i = 0; i <= 14; i++) {
      const weight = i <= 5 ? 2.5 : i <= 10 ? 1.5 : 1.0;
      bassWeightedSum += (this.frequencyBuffer[i] / 255) * weight;
      bassWeightTotal += weight;
    }
    const rawBass = bassWeightTotal > 0 ? bassWeightedSum / bassWeightTotal : 0;
    // Exponential punch curve: quiet bass remains subtle, strong beats burst with power
    const bass = Math.min(1.0, Math.pow(rawBass, 1.28) * 1.45);

    let midsSum = 0;
    let midsCount = 0;
    for (let i = 15; i <= 65; i++) {
      midsSum += this.frequencyBuffer[i];
      midsCount++;
    }

    let highsSum = 0;
    let highsCount = 0;
    for (let i = 66; i <= 150; i++) {
      highsSum += this.frequencyBuffer[i];
      highsCount++;
    }

    let totalSum = 0;
    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      totalSum += this.frequencyBuffer[i];
    }

    const mids = midsCount ? Math.min(1.0, (midsSum / (midsCount * 255)) * 1.15) : 0;
    const highs = highsCount ? Math.min(1.0, (highsSum / (highsCount * 255)) * 1.2) : 0;
    const energy = this.frequencyBuffer.length ? Math.min(1.0, (totalSum / (this.frequencyBuffer.length * 255)) * 1.25) : 0;

    return {
      raw: this.frequencyBuffer,
      bass,
      mids,
      highs,
      energy,
    };
  }

  public getActiveAudioElement(): HTMLAudioElement {
    return this.activeSlot === 'A' ? this.audioElementA : this.audioElementB;
  }

  public getCurrentTime(): number {
    if (this.loadedAudioBuffer && this.audioContext) {
      if (!this.bufferIsPlaying) return this.bufferStartOffset;
      return this.bufferStartOffset + (this.audioContext.currentTime - this.bufferStartTime);
    }
    return this.getActiveAudioElement().currentTime || 0;
  }

  public getDuration(): number {
    if (this.loadedAudioBuffer) return this.loadedAudioBuffer.duration;
    return this.getActiveAudioElement().duration || 0;
  }

  public isPlaying(): boolean {
    if (this.loadedAudioBuffer) return this.bufferIsPlaying;
    const audio = this.getActiveAudioElement();
    return !audio.paused && !audio.ended && audio.currentTime > 0;
  }

  public onTimeUpdate(callback: (currentTime: number, duration: number) => void): () => void {
    this.listeners.timeUpdate.push(callback);
    return () => {
      this.listeners.timeUpdate = this.listeners.timeUpdate.filter((cb) => cb !== callback);
    };
  }

  public onEnded(callback: () => void): () => void {
    this.listeners.ended.push(callback);
    return () => {
      this.listeners.ended = this.listeners.ended.filter((cb) => cb !== callback);
    };
  }

  public onStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.listeners.stateChange.push(callback);
    return () => {
      this.listeners.stateChange = this.listeners.stateChange.filter((cb) => cb !== callback);
    };
  }
}

export const audioEngine = AudioEngine.getInstance();
