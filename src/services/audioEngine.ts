import type { EqualizerBand, FrequencyData, ReverbPreset, MasteringLimiterPreset, VocalMode } from '../types/audio';
import { usePlayerStore } from '../stores/playerStore';
import { proceduralAudio } from '../config/demoTracks';

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
  public masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement;

  // 8D Audio & Spatial Panning DSP
  private stereoPanner: StereoPannerNode | null = null;
  private is8DActive = false;
  private eightDSpeed = 0.18; // Hz
  private eightDAnimId: number | null = null;

  // Studio Dynamic Mastering Limiter
  private masteringCompressor: DynamicsCompressorNode | null = null;
  private currentMasteringPreset: MasteringLimiterPreset = 'off';

  // DJ Looper A-B
  private loopA: number | null = null;
  private loopB: number | null = null;
  private isLoopActive = false;

  // Studio Virtual Space Reverb DSP (Procedural Convolver)
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private currentReverb: ReverbPreset = 'off';
  private reverbBuffers: Map<string, AudioBuffer> = new Map();

  private loadedAudioBuffer: AudioBuffer | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private bufferGain: GainNode | null = null;
  private bufferStartTime = 0;
  private bufferStartOffset = 0;
  private bufferIsPlaying = false;
  private isProceduralPlaying = false;

  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private isMicActive = false;

  private systemStream: MediaStream | null = null;
  private systemSourceNode: MediaStreamAudioSourceNode | null = null;
  private isSystemActive = false;
  private recordDestination: MediaStreamAudioDestinationNode | null = null;

  private eqFilters: BiquadFilterNode[] = [];
  private bands: EqualizerBand[] = [...DEFAULT_EQ_BANDS];

  private frequencyBuffer: Uint8Array | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private isIframeMode = false;

  private underwaterFilter: BiquadFilterNode | null = null;
  private isUnderwater = false;
  private currentDspProfile: 'normal' | 'slowed' | 'nightcore' = 'normal';

  // Vocal Remover & Karaoke / Instrumental DSP
  private vocalMode: VocalMode = 'off';
  private vocalInGain: GainNode | null = null;
  private vocalOutGain: GainNode | null = null;
  private vocalBypassGain: GainNode | null = null;
  private vocalKaraokeGain: GainNode | null = null;
  private vocalAcappellaGain: GainNode | null = null;

  // Binaural Beats & Solfeggio 432 Hz Generator
  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;
  private binauralMerger: ChannelMergerNode | null = null;
  private binauralActiveType: 'off' | 'alpha' | 'theta' | 'solfeggio432' = 'off';

  public setIframeMode(enabled: boolean): void {
    this.isIframeMode = enabled;
  }

  private listeners: {
    timeUpdate: ((currentTime: number, duration: number) => void)[];
    ended: (() => void)[];
    stateChange: ((isPlaying: boolean) => void)[];
    error: ((errorMsg: string) => void)[];
  } = {
    timeUpdate: [],
    ended: [],
    stateChange: [],
    error: [],
  };

  private constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.setupAudioElementListeners(this.audioElement);
  }

  public onError(callback: (errorMsg: string) => void): () => void {
    this.listeners.error.push(callback);
    return () => {
      this.listeners.error = this.listeners.error.filter((cb) => cb !== callback);
    };
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private setupAudioElementListeners(audio: HTMLAudioElement) {
    audio.addEventListener('timeupdate', () => {
      if (!this.loadedAudioBuffer) {
        const current = audio.currentTime;
        const dur = audio.duration || 0;

        // DJ Looper A-B seamless loop
        if (this.isLoopActive && this.loopA !== null && this.loopB !== null && this.loopB > this.loopA) {
          if (current >= this.loopB) {
            audio.currentTime = this.loopA;
            this.listeners.timeUpdate.forEach((cb) => cb(this.loopA!, dur));
            return;
          }
        }

        this.listeners.timeUpdate.forEach((cb) => cb(current, dur));
      }
    });

    audio.addEventListener('ended', () => {
      if (!this.loadedAudioBuffer) {
        this.listeners.ended.forEach((cb) => cb());
      }
    });

    audio.addEventListener('play', () => {
      // Guard against race conditions where pause() occurred before play resolved
      if (!this.loadedAudioBuffer && !audio.paused) {
        this.listeners.stateChange.forEach((cb) => cb(true));
      }
    });

    audio.addEventListener('pause', () => {
      if (!this.loadedAudioBuffer) {
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
    });

    audio.addEventListener('error', () => {
      if (!this.loadedAudioBuffer) {
        this.listeners.stateChange.forEach((cb) => cb(false));
        const err = audio.error;
        const msg = err
          ? `Error de reproducción (${err.code}): ${err.message || 'No se pudo cargar el audio'}`
          : 'Error al cargar pista de audio';
        console.warn('[AudioEngine]', msg);
        this.listeners.error.forEach((cb) => cb(msg));
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

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        // Master Analyser Node for FFT computation — ultra-low latency & zero temporal lag
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
        this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount);

        // Master Gain (Controls speaker output volume independently from FFT)
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

        // Reverb Parallel Bus (Dry / Wet)
        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);

        this.convolver = this.audioContext.createConvolver();
        this.wetGain = this.audioContext.createGain();
        this.wetGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);

        // 8D Stereo Panner Node
        if (typeof this.audioContext.createStereoPanner === 'function') {
          this.stereoPanner = this.audioContext.createStereoPanner();
        }

        // Underwater / Outside the Club Muffled Filter
        this.underwaterFilter = this.audioContext.createBiquadFilter();
        this.underwaterFilter.type = 'lowpass';
        this.underwaterFilter.frequency.setValueAtTime(this.isUnderwater ? 450 : 22000, this.audioContext.currentTime);
        this.underwaterFilter.Q.setValueAtTime(this.isUnderwater ? 2.5 : 0.7, this.audioContext.currentTime);

        // Strict Web Audio DSP routing:
        // Source -> EQ Filters -> Underwater Filter -> AnalyserNode -> [Dry + (Convolver -> Wet)] -> [StereoPanner 8D] -> GainNode (masterGain) -> AudioContext.destination
        const lastFilter = this.eqFilters[this.eqFilters.length - 1];
        lastFilter.connect(this.underwaterFilter);
        this.underwaterFilter.connect(this.analyser);

        this.analyser.connect(this.dryGain);
        this.analyser.connect(this.convolver);
        this.convolver.connect(this.wetGain);

        if (this.stereoPanner) {
          this.dryGain.connect(this.stereoPanner);
          this.wetGain.connect(this.stereoPanner);
          this.stereoPanner.connect(this.masterGain);
        } else {
          this.dryGain.connect(this.masterGain);
          this.wetGain.connect(this.masterGain);
        }

        // Master Limiting Dynamics Compressor -> Destination
        this.masteringCompressor = this.audioContext.createDynamicsCompressor();
        this.masterGain.connect(this.masteringCompressor);
        this.masteringCompressor.connect(this.audioContext.destination);
        this.setMasteringPreset(this.currentMasteringPreset);

        // Vocal Remover / Instrumental / A Cappella DSP Routing Node
        this.vocalInGain = this.audioContext.createGain();
        this.vocalOutGain = this.audioContext.createGain();

        // 1. Direct Bypass
        this.vocalBypassGain = this.audioContext.createGain();
        this.vocalBypassGain.gain.setValueAtTime(this.vocalMode === 'off' ? 1.0 : 0.0, this.audioContext.currentTime);
        this.vocalInGain.connect(this.vocalBypassGain);
        this.vocalBypassGain.connect(this.vocalOutGain);

        // 2. Karaoke / Instrumental (M/S Center Vocal Inversion with Bass Preservation)
        const vocalSplitter = this.audioContext.createChannelSplitter(2);
        this.vocalInGain.connect(vocalSplitter);

        const karaokeMerger = this.audioContext.createChannelMerger(2);
        const phaseInverter = this.audioContext.createGain();
        phaseInverter.gain.setValueAtTime(-1.0, this.audioContext.currentTime);

        vocalSplitter.connect(karaokeMerger, 0, 0); // L to L
        vocalSplitter.connect(karaokeMerger, 1, 1); // R to R
        vocalSplitter.connect(phaseInverter, 1);     // R to inverter
        phaseInverter.connect(karaokeMerger, 0, 0);  // -R to L (cancels Mid)

        // Bass Preserver (Keep sub-bass < 160Hz from being canceled)
        const bassPreserveFilter = this.audioContext.createBiquadFilter();
        bassPreserveFilter.type = 'lowpass';
        bassPreserveFilter.frequency.setValueAtTime(160, this.audioContext.currentTime);
        bassPreserveFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        this.vocalInGain.connect(bassPreserveFilter);

        const bassPreserveGain = this.audioContext.createGain();
        bassPreserveGain.gain.setValueAtTime(0.85, this.audioContext.currentTime);
        bassPreserveFilter.connect(bassPreserveGain);

        this.vocalKaraokeGain = this.audioContext.createGain();
        this.vocalKaraokeGain.gain.setValueAtTime(this.vocalMode === 'karaoke' ? 1.0 : 0.0, this.audioContext.currentTime);
        karaokeMerger.connect(this.vocalKaraokeGain);
        bassPreserveGain.connect(this.vocalKaraokeGain);
        this.vocalKaraokeGain.connect(this.vocalOutGain);

        // 3. A Cappella (Center Vocal Isolation with Side suppression)
        const vocalBandpass = this.audioContext.createBiquadFilter();
        vocalBandpass.type = 'bandpass';
        vocalBandpass.frequency.setValueAtTime(1400, this.audioContext.currentTime);
        vocalBandpass.Q.setValueAtTime(0.65, this.audioContext.currentTime);
        this.vocalInGain.connect(vocalBandpass);

        this.vocalAcappellaGain = this.audioContext.createGain();
        this.vocalAcappellaGain.gain.setValueAtTime(this.vocalMode === 'acappella' ? 1.25 : 0.0, this.audioContext.currentTime);
        vocalBandpass.connect(this.vocalAcappellaGain);
        this.vocalAcappellaGain.connect(this.vocalOutGain);

        // Connect vocalOutGain into first EQ Filter
        this.vocalOutGain.connect(this.eqFilters[0]);

        // Single MediaElementAudioSourceNode routing the lone <audio> element through Web Audio API into vocalInGain
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.vocalInGain);

        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.isInitialized = true;
        usePlayerStore.getState().setAnalyser(this.analyser, this.audioContext);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Provides a dedicated MediaStream destination for high-quality audio recording
   * synchronized with visualizer stream without affecting live speaker output.
   */
  public getAudioStreamDestination(): MediaStreamAudioDestinationNode | null {
    if (!this.audioContext) return null;
    if (!this.recordDestination) {
      this.recordDestination = this.audioContext.createMediaStreamDestination();
      if (this.analyser) {
        this.analyser.connect(this.recordDestination);
      }
    }
    return this.recordDestination;
  }

  /**
   * Connect any external sound generator (e.g. 3D Air Synthesizer / Cyber Drums)
   * into the master EQ and Analyser chain so visualizers react in real-time.
   */
  public connectAudioNode(node: AudioNode): void {
    if (!this.audioContext) return;
    if (this.eqFilters.length > 0) {
      node.connect(this.eqFilters[0]);
    } else if (this.masterGain) {
      node.connect(this.masterGain);
    }
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
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
    // Route: bufferSource -> bufferGain -> vocalInGain -> eqFilters[0] -> masterGain -> analyser -> destination
    this.bufferGain.connect(this.vocalInGain || this.eqFilters[0]);

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
    this._stopProcedural();
    this.unloadBuffer();
    this.disableMicrophone();
    this.disableSystemCapture();

    // Cleanly reset current audio element
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.src = url;
    this.audioElement.load();

    if (playImmediately) {
      try {
        await this.audioElement.play();
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
      this._stopProcedural();
      if (!this.bufferIsPlaying) {
        this._startBufferFrom(this.bufferStartOffset);
        this.listeners.stateChange.forEach((cb) => cb(true));
      }
      return;
    }
    const audio = this.audioElement;
    if (audio.src && audio.src !== window.location.href && !audio.src.endsWith('/')) {
      this._stopProcedural();
      try {
        await audio.play();
      } catch (e) {
        console.warn('Play error:', e);
      }
    }
  }

  public pause(): void {
    this._stopProcedural();
    if (this.loadedAudioBuffer) {
      if (this.bufferIsPlaying && this.audioContext) {
        // Save offset so we can resume from here
        this.bufferStartOffset += this.audioContext.currentTime - this.bufferStartTime;
        this._stopBufferSource();
        this.bufferIsPlaying = false;
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
      return;
    }
    this.audioElement.pause();
  }

  public async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.loadedAudioBuffer && !this.bufferIsPlaying) {
      this._stopProcedural();
      this._startBufferFrom(this.bufferStartOffset);
      this.bufferIsPlaying = true;
      this.listeners.stateChange.forEach((cb) => cb(true));
      return;
    }
    const audio = this.audioElement;
    if (audio.src && audio.src !== window.location.href && !audio.src.endsWith('/')) {
      this._stopProcedural();
      if (audio.paused) {
        await audio.play().catch(() => {});
      }
    }
  }

  public stop(): void {
    this._stopProcedural();
    this.unloadBuffer();
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.disableMicrophone();
    this.disableSystemCapture();
  }

  public startProceduralDemo(): void {
    if (!this.audioContext) return;
    this.isProceduralPlaying = true;
    const dest = this.eqFilters[0] || this.masterGain || this.analyser;
    if (dest) {
      proceduralAudio.start(this.audioContext, dest);
    }
    this.listeners.stateChange.forEach((cb) => cb(true));
  }

  private _stopProcedural(): void {
    if (this.isProceduralPlaying) {
      proceduralAudio.stop();
      this.isProceduralPlaying = false;
      this.listeners.stateChange.forEach((cb) => cb(false));
    }
  }

  public seek(seconds: number): void {
    if (this.loadedAudioBuffer) {
      this.seekBuffer(seconds);
      return;
    }
    if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration));
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
    // Audio element volume is maintained at 1.0 so the Web Audio API has full resolution
    this.audioElement.volume = 1.0;
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

    // Si está reproduciendo vía iframe (ej. YouTube en Vercel sin CORS audio directo),
    // simular ondas armónicas rítmicas para mantener vivo el visualizador 3D
    if (this.isIframeMode && energy < 0.05) {
      const now = performance.now() * 0.003;
      const beat = Math.pow(Math.max(0, Math.sin(now * 4.0)), 4);
      const wave = Math.sin(now * 2.5) * 0.5 + 0.5;
      const simBass = Math.min(1.0, beat * 0.85 + 0.15);
      const simMids = Math.min(1.0, wave * 0.55 + beat * 0.3);
      const simHighs = Math.min(1.0, Math.sin(now * 5.5) * 0.3 + beat * 0.4 + 0.15);
      const simEnergy = (simBass + simMids + simHighs) / 3;

      for (let i = 0; i < this.frequencyBuffer.length; i++) {
        const falloff = Math.exp(-i / 45);
        this.frequencyBuffer[i] = Math.min(255, Math.floor((beat * falloff * 210) + (wave * 70) + Math.random() * 20));
      }

      return {
        raw: this.frequencyBuffer,
        bass: simBass,
        mids: simMids,
        highs: simHighs,
        energy: simEnergy,
      };
    }

    return {
      raw: this.frequencyBuffer,
      bass,
      mids,
      highs,
      energy,
    };
  }

  // ── 8D Audio / Binaural 360° Orbit Engine ─────────────────────────────────
  public set8DMode(enabled: boolean, speed = 0.18): void {
    this.is8DActive = enabled;
    this.eightDSpeed = speed;

    if (this.eightDAnimId) {
      cancelAnimationFrame(this.eightDAnimId);
      this.eightDAnimId = null;
    }

    if (!enabled) {
      if (this.stereoPanner && this.audioContext) {
        this.stereoPanner.pan.setValueAtTime(0, this.audioContext.currentTime);
      }
      return;
    }

    const orbitLoop = () => {
      if (!this.is8DActive) return;
      if (this.stereoPanner && this.audioContext) {
        // Continuous smooth orbital sine panning (-1 to 1)
        const t = performance.now() * 0.001;
        const panValue = Math.sin(t * this.eightDSpeed * Math.PI * 2);
        this.stereoPanner.pan.setValueAtTime(
          Math.max(-1, Math.min(1, panValue)),
          this.audioContext.currentTime
        );
      }
      this.eightDAnimId = requestAnimationFrame(orbitLoop);
    };

    this.eightDAnimId = requestAnimationFrame(orbitLoop);
  }

  public set8DSpeed(speed: number): void {
    this.eightDSpeed = Math.max(0.05, Math.min(1.0, speed));
  }

  // ── Virtual Studio Reverb (Procedural Convolver Synthesis) ────────────────
  private createImpulseResponse(durationSec: number, decay: number): AudioBuffer {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  public setReverbPreset(preset: ReverbPreset): void {
    this.currentReverb = preset;
    if (!this.convolver || !this.dryGain || !this.wetGain || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    if (preset === 'off') {
      this.dryGain.gain.setValueAtTime(1.0, now);
      this.wetGain.gain.setValueAtTime(0.0, now);
      return;
    }

    let buffer = this.reverbBuffers.get(preset);
    let dryLevel = 0.85;
    let wetLevel = 0.35;

    if (!buffer) {
      if (preset === 'studio') {
        buffer = this.createImpulseResponse(0.4, 3.8);
        dryLevel = 0.92;
        wetLevel = 0.28;
      } else if (preset === 'club') {
        buffer = this.createImpulseResponse(0.9, 2.6);
        dryLevel = 0.82;
        wetLevel = 0.48;
      } else if (preset === 'concert') {
        buffer = this.createImpulseResponse(2.2, 2.0);
        dryLevel = 0.72;
        wetLevel = 0.65;
      } else if (preset === 'cathedral') {
        buffer = this.createImpulseResponse(4.5, 1.4);
        dryLevel = 0.60;
        wetLevel = 0.85;
      }
      if (buffer) {
        this.reverbBuffers.set(preset, buffer);
      }
    }

    if (buffer) {
      this.convolver.buffer = buffer;
      this.dryGain.gain.setValueAtTime(dryLevel, now);
      this.wetGain.gain.setValueAtTime(wetLevel, now);
    }
  }

  // ── Smart Crossfade Transition ────────────────────────────────────────────
  public async crossfade(durationSec = 2.0): Promise<void> {
    if (!this.masterGain || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const currentGain = this.masterGain.gain.value;
    const fadeOutTime = Math.max(0.4, durationSec * 0.4);
    const fadeInTime = Math.max(0.4, durationSec * 0.6);

    // Ramp down
    this.masterGain.gain.setValueAtTime(currentGain, now);
    this.masterGain.gain.linearRampToValueAtTime(0.01, now + fadeOutTime);

    await new Promise((resolve) => setTimeout(resolve, fadeOutTime * 1000));

    // Ramp back up
    const afterNow = this.audioContext.currentTime;
    this.masterGain.gain.setValueAtTime(0.01, afterNow);
    this.masterGain.gain.linearRampToValueAtTime(currentGain, afterNow + fadeInTime);
  }

  // ── Harmonic DJ Crossfade (BPM & Camelot Beat-Sync) ───────────────────────
  public async harmonicCrossfade(durationSec = 2.5, _fromKey?: string, _toKey?: string): Promise<void> {
    if (!this.masterGain || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const currentGain = this.masterGain.gain.value;

    const fadeOutTime = Math.max(0.5, durationSec * 0.45);
    const fadeInTime = Math.max(0.5, durationSec * 0.55);

    this.masterGain.gain.setValueAtTime(currentGain, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);

    await new Promise((resolve) => setTimeout(resolve, fadeOutTime * 1000));

    const afterNow = this.audioContext.currentTime;
    this.masterGain.gain.setValueAtTime(0.001, afterNow);
    this.masterGain.gain.exponentialRampToValueAtTime(currentGain, afterNow + fadeInTime);
  }

  // ── Studio Dynamic Mastering Limiter ─────────────────────────────────────
  public setMasteringPreset(preset: MasteringLimiterPreset): void {
    this.currentMasteringPreset = preset;
    if (!this.masteringCompressor || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    switch (preset) {
      case 'punchy_club':
        // Tight, punchy transient control. Kicks stand out cleanly with body
        this.masteringCompressor.threshold.setValueAtTime(-18, now);
        this.masteringCompressor.knee.setValueAtTime(6, now);
        this.masteringCompressor.ratio.setValueAtTime(6.0, now);
        this.masteringCompressor.attack.setValueAtTime(0.005, now);
        this.masteringCompressor.release.setValueAtTime(0.15, now);
        break;

      case 'warm_tape':
        // Soft-knee warm tape glue compression
        this.masteringCompressor.threshold.setValueAtTime(-24, now);
        this.masteringCompressor.knee.setValueAtTime(18, now);
        this.masteringCompressor.ratio.setValueAtTime(3.5, now);
        this.masteringCompressor.attack.setValueAtTime(0.02, now);
        this.masteringCompressor.release.setValueAtTime(0.25, now);
        break;

      case 'vocal_clarity':
        // Acoustic presence & clean vocal dynamic preservation
        this.masteringCompressor.threshold.setValueAtTime(-14, now);
        this.masteringCompressor.knee.setValueAtTime(12, now);
        this.masteringCompressor.ratio.setValueAtTime(2.5, now);
        this.masteringCompressor.attack.setValueAtTime(0.01, now);
        this.masteringCompressor.release.setValueAtTime(0.08, now);
        break;

      case 'off':
      default:
        // Neutral bypass
        this.masteringCompressor.threshold.setValueAtTime(0, now);
        this.masteringCompressor.knee.setValueAtTime(0, now);
        this.masteringCompressor.ratio.setValueAtTime(1.0, now);
        this.masteringCompressor.attack.setValueAtTime(0.01, now);
        this.masteringCompressor.release.setValueAtTime(0.25, now);
        break;
    }
  }

  // ── Vocal Remover & Karaoke / Instrumental DSP ───────────────────────────
  public setVocalMode(mode: VocalMode): void {
    this.vocalMode = mode;
    if (!this.audioContext || !this.vocalBypassGain || !this.vocalKaraokeGain || !this.vocalAcappellaGain) return;
    const now = this.audioContext.currentTime;
    const tau = 0.05; // 50ms smooth crossfade
    this.vocalBypassGain.gain.setTargetAtTime(mode === 'off' ? 1.0 : 0.0, now, tau);
    this.vocalKaraokeGain.gain.setTargetAtTime(mode === 'karaoke' ? 1.0 : 0.0, now, tau);
    this.vocalAcappellaGain.gain.setTargetAtTime(mode === 'acappella' ? 1.25 : 0.0, now, tau);
  }

  public getVocalMode(): VocalMode {
    return this.vocalMode;
  }

  // ── DJ Looper A-B Control ────────────────────────────────────────────────
  public setLoopPoints(loopA: number | null, loopB: number | null, active = true): void {
    this.loopA = loopA;
    this.loopB = loopB;
    this.isLoopActive = active && loopA !== null && loopB !== null && loopB > loopA;
  }

  public clearLoop(): void {
    this.loopA = null;
    this.loopB = null;
    this.isLoopActive = false;
  }

  public getLoopState(): { loopA: number | null; loopB: number | null; isActive: boolean } {
    return { loopA: this.loopA, loopB: this.loopB, isActive: this.isLoopActive };
  }

  // ── Quick 3-Band Equalizer (Bass, Mids, Treble) ───────────────────────────
  public setThreeBandEQ(bassDb: number, midDb: number, trebleDb: number): void {
    // Bands 0-2 (Sub/Bass 32Hz, 64Hz, 125Hz)
    this.setBandGain(0, bassDb);
    this.setBandGain(1, bassDb);
    this.setBandGain(2, bassDb);

    // Bands 4-6 (Mids 500Hz, 1kHz, 2kHz)
    this.setBandGain(4, midDb);
    this.setBandGain(5, midDb);
    this.setBandGain(6, midDb);

    // Bands 8-9 (Treble / Air 8kHz, 16kHz)
    this.setBandGain(8, trebleDb);
    this.setBandGain(9, trebleDb);
  }

  public getActiveAudioElement(): HTMLAudioElement {
    return this.audioElement;
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

  // ── Advanced DSP Modulations: Underwater, Slowed/Nightcore, Binaural ────────

  /**
   * Underwater / Outside the Club Muffled Filter:
   * Sets low-pass biquad filter at 450Hz with high wet cavern reverb.
   */
  public setUnderwaterMode(enabled: boolean): void {
    this.isUnderwater = enabled;
    if (!this.audioContext) return;

    if (this.underwaterFilter) {
      const targetFreq = enabled ? 450 : 22000;
      const targetQ = enabled ? 2.5 : 0.7;
      this.underwaterFilter.frequency.setTargetAtTime(targetFreq, this.audioContext.currentTime, 0.08);
      this.underwaterFilter.Q.setTargetAtTime(targetQ, this.audioContext.currentTime, 0.08);
    }

    if (this.wetGain) {
      const targetWet = enabled ? 0.60 : this.currentDspProfile === 'slowed' ? 0.65 : 0.0;
      this.wetGain.gain.setTargetAtTime(targetWet, this.audioContext.currentTime, 0.08);
    }
  }

  public isUnderwaterModeActive(): boolean {
    return this.isUnderwater;
  }

  /**
   * Speed & Pitch Shifter:
   * - 'normal': 1.0x playback rate
   * - 'slowed': 0.85x playback rate with cavernous wet reverb
   * - 'nightcore': 1.20x playback rate
   */
  public applyDspProfile(profile: 'normal' | 'slowed' | 'nightcore'): void {
    this.currentDspProfile = profile;
    const rate = profile === 'slowed' ? 0.85 : profile === 'nightcore' ? 1.20 : 1.0;

    const audio = this.getActiveAudioElement();
    audio.playbackRate = rate;

    if (this.bufferSourceNode && this.audioContext) {
      try {
        this.bufferSourceNode.playbackRate.setValueAtTime(rate, this.audioContext.currentTime);
      } catch {}
    }

    if (this.wetGain && this.audioContext && !this.isUnderwater) {
      const targetWet = profile === 'slowed' ? 0.65 : 0.0;
      this.wetGain.gain.setTargetAtTime(targetWet, this.audioContext.currentTime, 0.08);
    }
  }

  public getCurrentDspProfile(): 'normal' | 'slowed' | 'nightcore' {
    return this.currentDspProfile;
  }

  // ── Vinyl Tape Stop & DJ Turntable Physics ───────────────────
  private isTapeStoppingState = false;
  private tapeAnimId: number | null = null;

  public isTapeStopping(): boolean {
    return this.isTapeStoppingState;
  }

  /**
   * Analog Vinyl / Tape Stop:
   * Smoothly decelerates playback rate with inverse quadratic physical inertia (wuuu-oop sound),
   * then cleanly pauses and restores the base playback rate.
   */
  public triggerTapeStop(durationSec = 0.85, onComplete?: () => void): void {
    const audio = this.getActiveAudioElement();
    if (!audio || audio.paused || this.isTapeStoppingState) return;

    this.isTapeStoppingState = true;
    if (this.tapeAnimId !== null) {
      cancelAnimationFrame(this.tapeAnimId);
    }

    const startRate = audio.playbackRate || 1.0;
    const startTime = performance.now();
    const durationMs = durationSec * 1000;

    const rampDown = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Inverse quadratic deceleration curve (classic vinyl motor wind-down)
      const currentFactor = Math.pow(1 - progress, 2);
      const newRate = Math.max(0.02, startRate * currentFactor);

      try {
        audio.playbackRate = newRate;
        if (this.bufferSourceNode && this.audioContext) {
          this.bufferSourceNode.playbackRate.setValueAtTime(newRate, this.audioContext.currentTime);
        }
      } catch {}

      if (progress < 1) {
        this.tapeAnimId = requestAnimationFrame(rampDown);
      } else {
        this.isTapeStoppingState = false;
        this.tapeAnimId = null;
        this.pause();
        // Restore target base rate for when playback resumes
        const baseRate = this.currentDspProfile === 'slowed' ? 0.85 : this.currentDspProfile === 'nightcore' ? 1.20 : 1.0;
        audio.playbackRate = baseRate;
        onComplete?.();
      }
    };

    this.tapeAnimId = requestAnimationFrame(rampDown);
  }

  /**
   * Analog Vinyl Motor Spin-Up:
   * Starts playback and accelerates from 0.08x to full speed with turntable torque curve.
   */
  public triggerTapeStart(durationSec = 0.55): void {
    const audio = this.getActiveAudioElement();
    if (!audio || !audio.paused) return;

    if (this.tapeAnimId !== null) {
      cancelAnimationFrame(this.tapeAnimId);
      this.tapeAnimId = null;
    }

    const targetRate = this.currentDspProfile === 'slowed' ? 0.85 : this.currentDspProfile === 'nightcore' ? 1.20 : 1.0;
    audio.playbackRate = 0.08;
    this.play();

    const startTime = performance.now();
    const durationMs = durationSec * 1000;

    const rampUp = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const factor = Math.sqrt(progress);
      const newRate = 0.08 + (targetRate - 0.08) * factor;

      try {
        audio.playbackRate = Math.min(targetRate, newRate);
        if (this.bufferSourceNode && this.audioContext) {
          this.bufferSourceNode.playbackRate.setValueAtTime(audio.playbackRate, this.audioContext.currentTime);
        }
      } catch {}

      if (progress < 1) {
        this.tapeAnimId = requestAnimationFrame(rampUp);
      } else {
        audio.playbackRate = targetRate;
        this.tapeAnimId = null;
      }
    };

    this.tapeAnimId = requestAnimationFrame(rampUp);
  }

  /**
   * DJ Vinyl Scratch Modulator:
   * Tactile forward-and-backward pitch flutter simulating a quick scratch.
   */
  public triggerDjScratch(): void {
    const audio = this.getActiveAudioElement();
    if (!audio || audio.paused) return;

    const baseRate = this.currentDspProfile === 'slowed' ? 0.85 : this.currentDspProfile === 'nightcore' ? 1.20 : 1.0;
    try {
      audio.playbackRate = 0.22;
      setTimeout(() => {
        try {
          audio.playbackRate = 1.75;
          setTimeout(() => {
            try {
              audio.playbackRate = 0.45;
              setTimeout(() => {
                audio.playbackRate = baseRate;
              }, 65);
            } catch {}
          }, 70);
        } catch {}
      }, 65);
    } catch {}
  }

  /**
   * Binaural Beats & Solfeggio 432 Hz Generator:
   * - 'alpha': 10 Hz frequency difference for deep focus / study
   * - 'theta': 6 Hz frequency difference for meditation / relaxation
   * - 'solfeggio432': Pure 432 Hz harmonic healing tone
   */
  public startBinauralBeats(type: 'alpha' | 'theta' | 'solfeggio432', volume = 0.12): void {
    if (!this.audioContext) return;
    this.stopBinauralBeats();

    this.binauralActiveType = type;
    this.binauralGain = this.audioContext.createGain();
    this.binauralGain.gain.setValueAtTime(volume, this.audioContext.currentTime);

    if (type === 'solfeggio432') {
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, this.audioContext.currentTime);
      osc.connect(this.binauralGain);
      osc.start();
      this.binauralLeftOsc = osc;
    } else {
      const baseFreq = 200;
      const diff = type === 'alpha' ? 10 : 6;

      const leftOsc = this.audioContext.createOscillator();
      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);

      const rightOsc = this.audioContext.createOscillator();
      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(baseFreq + diff, this.audioContext.currentTime);

      if (typeof this.audioContext.createChannelMerger === 'function') {
        this.binauralMerger = this.audioContext.createChannelMerger(2);
        leftOsc.connect(this.binauralMerger, 0, 0);
        rightOsc.connect(this.binauralMerger, 0, 1);
        this.binauralMerger.connect(this.binauralGain);
      } else {
        leftOsc.connect(this.binauralGain);
        rightOsc.connect(this.binauralGain);
      }

      leftOsc.start();
      rightOsc.start();

      this.binauralLeftOsc = leftOsc;
      this.binauralRightOsc = rightOsc;
    }

    if (this.masterGain) {
      this.binauralGain.connect(this.masterGain);
    }
  }

  public stopBinauralBeats(): void {
    if (this.binauralLeftOsc) {
      try {
        this.binauralLeftOsc.stop();
        this.binauralLeftOsc.disconnect();
      } catch {}
      this.binauralLeftOsc = null;
    }
    if (this.binauralRightOsc) {
      try {
        this.binauralRightOsc.stop();
        this.binauralRightOsc.disconnect();
      } catch {}
      this.binauralRightOsc = null;
    }
    if (this.binauralMerger) {
      try {
        this.binauralMerger.disconnect();
      } catch {}
      this.binauralMerger = null;
    }
    if (this.binauralGain) {
      try {
        this.binauralGain.disconnect();
      } catch {}
      this.binauralGain = null;
    }
    this.binauralActiveType = 'off';
  }

  public getBinauralActiveType(): 'off' | 'alpha' | 'theta' | 'solfeggio432' {
    return this.binauralActiveType;
  }

  /**
   * Fade master volume exponentially (for Sleep Timer graceful shutdown)
   */
  public async fadeMasterVolume(targetVolume: number, durationSeconds: number): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    const clampedTarget = Math.max(0.0001, targetVolume);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(clampedTarget, now + durationSeconds);
    await new Promise((res) => setTimeout(res, durationSeconds * 1000));
  }
}

export const audioEngine = AudioEngine.getInstance();
