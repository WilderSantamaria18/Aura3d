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
  /** Analizador de alta resolución (FFT 4096) dedicado a detectar notas */
  private pitchAnalyser: AnalyserNode | null = null;
  private pitchBuffer: Uint8Array | null = null;
  private chromaAcc = new Float32Array(12);
  private chromaValues = new Float32Array(12);
  private chromaPeak = 1.0;
  private chromaStamp = 0;
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
  private systemGain: GainNode | null = null;
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
    captureEnd: ((kind: 'mic' | 'system') => void)[];
  } = {
    timeUpdate: [],
    ended: [],
    stateChange: [],
    error: [],
    captureEnd: [],
  };

  /** Evita que el pause() provocado por un cambio de fuente apague isPlaying en la UI */
  private ignoreNextElementPause = false;

  /** Se incrementa en cada carga; permite descartar cargas viejas que terminan tarde */
  private loadToken = 0;

  /** Notifica cuando el mic o la captura de sistema se cierran desde el motor (cambio de fuente) */
  public onCaptureEnd(callback: (kind: 'mic' | 'system') => void): () => void {
    this.listeners.captureEnd.push(callback);
    return () => {
      this.listeners.captureEnd = this.listeners.captureEnd.filter((cb) => cb !== callback);
    };
  }

  /**
   * Libera las fuentes activas (buffer local, <audio>, mic, sistema, demo procedural) para que al
   * cambiar de fuente nunca suenen dos a la vez.
   *
   * El micrófono y la captura de sistema son entradas EN VIVO: no suenan por los altavoces, solo
   * alimentan el visualizador y la grabación, y el estudio de grabación ("Mix") las usa a la vez.
   * Por eso, al activar una de ellas se conserva la otra (`keepMic` / `keepSystem`); cualquier
   * fuente de reproducción (archivo, URL, radio) sí libera ambas.
   */
  public releaseSources(opts: { keepMic?: boolean; keepSystem?: boolean } = {}): void {
    this.loadToken++;
    this.clearStreamRetry();
    this._stopProcedural();
    this.unloadBuffer();
    if (!opts.keepMic) this.disableMicrophone();
    if (!opts.keepSystem) this.disableSystemCapture();

    const audio = this.audioElement;
    if (!audio.paused) this.ignoreNextElementPause = true;
    audio.pause();
    if (audio.getAttribute('src')) {
      audio.removeAttribute('src');
      audio.load();
    }
  }

  private constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.setupAudioElementListeners(this.audioElement);

    // Mantener el store coherente cuando el motor cierra el mic (p. ej. al cambiar de fuente).
    // Va aquí y no en un hook para que se registre una sola vez, se use el hook que se use.
    this.listeners.captureEnd.push((kind) => {
      if (kind === 'mic') usePlayerStore.setState({ isMicActive: false });
    });
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

  private streamRetries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Esperas antes de cada reintento de un stream caído (radio, YouTube proxy, URLs remotas) */
  public static readonly STREAM_RETRY_DELAYS_MS = [1500, 4000];

  private clearStreamRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  /**
   * Reintenta un stream remoto tras un error de red (MEDIA_ERR_NETWORK = 2). Devuelve true si
   * programó el reintento; false si el error no es de red, no es remoto o ya se agotaron.
   */
  private scheduleStreamRetry(audio: HTMLAudioElement, code: number | undefined): boolean {
    const src = audio.getAttribute('src');
    if (code !== 2 || !src || !/^https?:/i.test(src)) return false;
    const delays = AudioEngine.STREAM_RETRY_DELAYS_MS;
    if (this.streamRetries >= delays.length) return false;

    const delay = delays[this.streamRetries++];
    const token = this.loadToken;
    const resumeAt = audio.currentTime;
    this.clearStreamRetry();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      // Si mientras tanto se cambió de fuente, este reintento ya no corresponde
      if (token !== this.loadToken || audio.getAttribute('src') !== src) return;
      if (resumeAt > 1) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(resumeAt, audio.duration);
          },
          { once: true }
        );
      }
      audio.load();
      audio.play().catch(() => {});
    }, delay);
    return true;
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
      if (this.ignoreNextElementPause) {
        this.ignoreNextElementPause = false;
        return;
      }
      if (!this.loadedAudioBuffer) {
        this.listeners.stateChange.forEach((cb) => cb(false));
      }
    });

    audio.addEventListener('playing', () => {
      this.streamRetries = 0; // la conexión se recuperó (o nunca falló)
    });

    audio.addEventListener('error', () => {
      if (!this.loadedAudioBuffer) {
        // Fallo de red en un stream: se reintenta solo, sin avisar ni apagar isPlaying
        if (this.scheduleStreamRetry(audio, audio.error?.code)) return;
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
        // 48 kHz fijos: el ancho de bin del analizador (≈94 Hz) es igual en todos los
        // dispositivos, así el kick y los graves caen siempre en los mismos bins.
        try {
          this.audioContext = new AudioContextClass({ sampleRate: 48000, latencyHint: 'interactive' });
        } catch {
          this.audioContext = new AudioContextClass();
        }

        // Master Analyser Node for FFT computation — ultra-low latency & zero temporal lag
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        // El suavizado largo retrasaba el kick varios frames antes de llegar a los
        // visualizadores. El hook aplica su propia caída asimétrica, así que aquí
        // priorizamos una lectura rápida del ataque sin volverla inestable.
        this.analyser.smoothingTimeConstant = 0.35;
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

        // Analizador de notas: cuelga del analizador principal, así también recibe
        // micrófono y audio del sistema (que entran directo a this.analyser)
        this.pitchAnalyser = this.audioContext.createAnalyser();
        this.pitchAnalyser.fftSize = 4096;
        this.pitchAnalyser.smoothingTimeConstant = 0.55;
        this.pitchBuffer = new Uint8Array(this.pitchAnalyser.frequencyBinCount);
        this.analyser.connect(this.pitchAnalyser);
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
        this.installContextRecovery();
        usePlayerStore.getState().setAnalyser(this.analyser, this.audioContext);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private gestureResumeArmed = false;

  /**
   * El navegador puede suspender el AudioContext por su cuenta (cambio de dispositivo de salida,
   * reposo del equipo, interrupciones en Safari/iOS). Sin esto el visualizador sigue "reproduciendo"
   * pero no suena nada hasta pulsar pausa y play. Si el resume() es rechazado por falta de gesto
   * del usuario, se reintenta en la siguiente interacción.
   */
  private installContextRecovery(): void {
    const ctx = this.audioContext;
    if (!ctx) return;

    const tryResume = () => {
      if ((ctx.state as string) === 'running') return;
      if (!usePlayerStore.getState().isPlaying) return; // en pausa no hay nada que recuperar
      ctx.resume().catch(() => this.resumeOnNextGesture());
    };

    ctx.addEventListener?.('statechange', tryResume);
    navigator.mediaDevices?.addEventListener?.('devicechange', tryResume);
  }

  private resumeOnNextGesture(): void {
    if (this.gestureResumeArmed || typeof window === 'undefined') return;
    this.gestureResumeArmed = true;
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const handler = () => {
      events.forEach((e) => window.removeEventListener(e, handler, true));
      this.gestureResumeArmed = false;
      this.audioContext?.resume().catch(() => {});
    };
    events.forEach((e) => window.addEventListener(e, handler, true));
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
   * Returns a live MediaStream containing all mixed audio tracks
   * (master player music + microphone + system audio) routed through the analyser,
   * without routing microphone or system loopback into speakers (zero acoustic feedback).
   */
  public getRecordingStream(): MediaStream | null {
    const dest = this.getAudioStreamDestination();
    return dest ? dest.stream : null;
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
  /**
   * Por encima de este tamaño comprimido no se decodifica a memoria: un MP3 de 20 MB (~20 min)
   * ocupa cientos de MB como PCM Float32 y puede tumbar la pestaña. Se reproduce en streaming.
   */
  public static readonly MAX_DECODE_BYTES = 20 * 1024 * 1024;

  /**
   * Carga un archivo local: decodificado en memoria (permite seek exacto y bucles) si es pequeño,
   * o en streaming por el <audio> si es grande o el navegador no puede decodificarlo.
   * Devuelve la duración conocida (0 en streaming hasta que carguen los metadatos).
   */
  public async loadFile(file: File, blobUrl: string): Promise<number> {
    if (file.size <= AudioEngine.MAX_DECODE_BYTES) {
      try {
        return await this.loadArrayBuffer(await file.arrayBuffer(), file.name);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        console.warn('[AudioEngine] No se pudo decodificar, se usa streaming:', err);
      }
    }
    await this.loadTrack(blobUrl, true);
    return this.getDuration() || 0;
  }

  public async loadArrayBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<number> {
    await this.init();
    if (!this.audioContext) return 0;

    const token = ++this.loadToken;
    // Decode primero: si falla, la fuente actual sigue intacta y el llamador puede usar su fallback
    const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
    if (token !== this.loadToken) {
      throw new DOMException('Carga reemplazada por otra fuente', 'AbortError');
    }

    // Liberar cualquier otra fuente (audio element, mic, sistema, buffer anterior)
    this.releaseSources();
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

    // Se conserva el micrófono (modo "Mix"); una captura de sistema anterior sí se sustituye
    this.releaseSources({ keepMic: true });

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = true;
    }
    // Drop video tracks to save CPU / GPU
    stream.getVideoTracks().forEach((t) => t.stop());

    this.systemStream = stream;
    this.systemSourceNode = this.audioContext.createMediaStreamSource(stream);
    this.systemGain = this.audioContext.createGain();
    this.systemGain.gain.setValueAtTime(1.8, this.audioContext.currentTime);

    // ✅ Analyser only — preamplificado para máxima reactividad visual sin afectar altavoces
    this.systemSourceNode.connect(this.systemGain);
    this.systemGain.connect(this.analyser);
    this.isSystemActive = true;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public disableSystemCapture(): void {
    const wasActive = this.isSystemActive;
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
    }
    if (this.systemSourceNode) {
      this.systemSourceNode.disconnect();
      this.systemSourceNode = null;
    }
    if (this.systemGain) {
      this.systemGain.disconnect();
      this.systemGain = null;
    }
    this.isSystemActive = false;
    if (wasActive) this.listeners.captureEnd.forEach((cb) => cb('system'));
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Permiso concedido: ahora sí liberar la fuente anterior (si se deniega, no se corta la música).
      // La captura de sistema se conserva (modo "Mix" del estudio de grabación).
      this.releaseSources({ keepSystem: true });
      this.micStream = stream;

      this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream);
      this.micGain = this.audioContext.createGain();
      this.micGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);

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

  public setMicGain(gain: number): void {
    if (this.micGain && this.audioContext) {
      this.micGain.gain.setValueAtTime(Math.max(0, Math.min(3.0, gain)), this.audioContext.currentTime);
    }
  }

  public disableMicrophone(): void {
    const wasActive = this.isMicActive;
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
    if (wasActive) this.listeners.captureEnd.forEach((cb) => cb('mic'));
  }

  public isMicrophoneActive(): boolean {
    return this.isMicActive;
  }

  public isSystemCaptureActive(): boolean {
    return this.isSystemActive;
  }

  public async loadTrack(url: string, playImmediately = true): Promise<void> {
    const token = ++this.loadToken;
    this.streamRetries = 0;
    this.clearStreamRetry();
    await this.init();
    if (token !== this.loadToken) {
      throw new DOMException('Carga reemplazada por otra fuente', 'AbortError');
    }
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
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'AbortError') {
          // Autoplay bloqueado o carga reemplazada por otra más nueva: no es un fallo de la fuente
          console.warn('Playback requires user gesture unlock / interrupted:', err);
        } else {
          // Fuente inválida o sin soporte: propagar para que el llamador use su fallback (iframe)
          throw err;
        }
      }
    }
  }

  public async play(): Promise<void> {
    this.setLiveInputsEnabled(true);
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

  /**
   * Silencia/reactiva las entradas en vivo (mic y captura de sistema) sin cerrarlas.
   * Una pista deshabilitada emite silencio, así el visualizador se calma al pausar.
   */
  private setLiveInputsEnabled(enabled: boolean): void {
    this.micStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
    this.systemStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  public pause(): void {
    this.clearStreamRetry(); // pausar cancela un reintento pendiente: no debe reanudar solo
    this.setLiveInputsEnabled(false);
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
    this.setLiveInputsEnabled(true);
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
    this.clearStreamRetry();
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

  private generateSyntheticBeat(nowMs: number): FrequencyData {
    if (!this.frequencyBuffer) {
      this.frequencyBuffer = new Uint8Array(256);
    }
    const t = nowMs * 0.001; // seconds
    // 124 BPM rhythm (~2.066 Hz)
    const bpmFreq = 124 / 60;
    const beatPhase = (t * bpmFreq) % 1;
    // Kick punch (sharp decay)
    const kick = Math.pow(Math.max(0, 1 - beatPhase * 2.8), 3);
    // Snare on beat 2 & 4
    const snarePhase = (t * bpmFreq + 0.5) % 1;
    const snare = Math.pow(Math.max(0, 1 - snarePhase * 3.5), 2.5);
    // Hi-hat 16th groove
    const hihatPhase = (t * bpmFreq * 4) % 1;
    const hihat = Math.pow(Math.max(0, 1 - hihatPhase * 4.5), 2) * 0.6;
    // Rolling harmonic wave
    const wave = Math.sin(t * 3.2) * 0.5 + 0.5;

    const bass = Math.min(1.0, kick * 0.88 + 0.12);
    const mids = Math.min(1.0, snare * 0.65 + wave * 0.35 + 0.1);
    const highs = Math.min(1.0, hihat * 0.75 + snare * 0.3 + 0.15);
    const energy = Math.min(1.0, (bass * 1.25 + mids + highs) / 3);

    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      let val = 0;
      if (i <= 14) {
        val = kick * 240 + 25 + Math.random() * 15;
      } else if (i <= 65) {
        val = snare * 190 + wave * 110 + 20 + Math.random() * 15;
      } else if (i <= 150) {
        val = hihat * 170 + snare * 70 + 15 + Math.random() * 10;
      } else {
        val = hihat * 85 + Math.random() * 15;
      }
      this.frequencyBuffer[i] = Math.min(255, Math.floor(val));
    }

    return {
      raw: this.frequencyBuffer,
      bass,
      mids,
      highs,
      energy,
    };
  }

  /**
   * Cromagrama: energía de las 12 notas (0 = Do … 11 = Si) normalizada 0..1.
   * Se pliega el espectro entre 110 Hz y 2.1 kHz (los graves por debajo son bombo, no notas) sobre las 12 clases de nota y se
   * normaliza con auto-gain para que funcione igual con música suave o fuerte.
   */
  public getChroma(): Float32Array {
    const now = performance.now();
    if (!this.pitchAnalyser || !this.pitchBuffer || !this.audioContext) return this.chromaValues;
    if (now - this.chromaStamp < 8) return this.chromaValues;
    this.chromaStamp = now;

    this.pitchAnalyser.getByteFrequencyData(this.pitchBuffer as never);
    const buf = this.pitchBuffer;
    const binHz = this.audioContext.sampleRate / this.pitchAnalyser.fftSize;
    const lo = Math.max(1, Math.ceil(110 / binHz));
    const hi = Math.min(buf.length - 1, Math.floor(2100 / binHz));

    const acc = this.chromaAcc;
    acc.fill(0);
    for (let i = lo; i <= hi; i++) {
      const mag = buf[i] / 255;
      if (mag < 0.32) continue; // suelo de ruido
      const semis = Math.round(12 * Math.log2((i * binHz) / 440));
      const pc = (((semis + 9) % 12) + 12) % 12; // A4 = clase 9, Do = 0
      acc[pc] += mag * mag;
    }

    let mx = 0;
    for (let k = 0; k < 12; k++) if (acc[k] > mx) mx = acc[k];
    this.chromaPeak = Math.max(mx, this.chromaPeak * 0.996);
    const denom = Math.max(this.chromaPeak, 1.0);
    for (let k = 0; k < 12; k++) {
      const v = Math.min(1, acc[k] / denom);
      const cur = this.chromaValues[k];
      this.chromaValues[k] = cur + (v - cur) * (v > cur ? 0.6 : 0.12);
    }
    return this.chromaValues;
  }

  private freqCache: FrequencyData | null = null;
  private freqCacheAt = -Infinity;
  /**
   * Ventana en la que se reutiliza el último análisis. Varios consumidores (fondo, paleta automática,
   * visualizador, medidores…) lo piden en el mismo fotograma; recalcular bandas para cada uno era
   * trabajo repetido. 4 ms < un fotograma incluso a 144 Hz (≈6.9 ms), así que nunca se sirve un
   * dato del fotograma anterior.
   */
  public static readonly FREQ_CACHE_MS = 4;

  public getFrequencyData(): FrequencyData {
    const now = performance.now();
    if (this.freqCache && now - this.freqCacheAt < AudioEngine.FREQ_CACHE_MS) return this.freqCache;
    const data = this.computeFrequencyData();
    this.freqCache = data;
    this.freqCacheAt = now;
    return data;
  }

  private computeFrequencyData(): FrequencyData {
    // El beat sintético es solo para cuando suena Spotify (sin acceso a su audio): con un archivo
    // local o el mic sonando, un pasaje silencioso debe verse silencioso.
    const playerState = usePlayerStore.getState();
    const isSpotifyPlaying =
      playerState.isSpotifyConnected && playerState.isPlaying && playerState.currentTrack?.sourceType === 'spotify';

    if (!this.analyser || !this.frequencyBuffer) {
      if (isSpotifyPlaying) {
        return this.generateSyntheticBeat(performance.now());
      }
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
    // Una sola pasada sobre el buffer (antes eran cuatro por fotograma)
    const buf = this.frequencyBuffer;
    let bassWeightedSum = 0;
    let bassWeightTotal = 0;
    let midsSum = 0;
    let midsCount = 0;
    let highsSum = 0;
    let highsCount = 0;
    let totalSum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      totalSum += v;
      if (i <= 14) {
        const weight = i <= 5 ? 2.5 : i <= 10 ? 1.5 : 1.0;
        bassWeightedSum += (v / 255) * weight;
        bassWeightTotal += weight;
      } else if (i <= 65) {
        midsSum += v;
        midsCount++;
      } else if (i <= 150) {
        highsSum += v;
        highsCount++;
      }
    }
    const rawBass = bassWeightTotal > 0 ? bassWeightedSum / bassWeightTotal : 0;
    // Exponential punch curve: quiet bass remains subtle, strong beats burst with power
    const bass = Math.min(1.0, Math.pow(rawBass, 1.28) * 1.45);

    const mids = midsCount ? Math.min(1.0, (midsSum / (midsCount * 255)) * 1.15) : 0;
    const highs = highsCount ? Math.min(1.0, (highsSum / (highsCount * 255)) * 1.2) : 0;
    const energy = this.frequencyBuffer.length ? Math.min(1.0, (totalSum / (this.frequencyBuffer.length * 255)) * 1.25) : 0;

    // Si está reproduciendo vía iframe (ej. YouTube en Vercel) o vía Spotify Connect sin captura directa activa,
    // generar ondas armónicas rítmicas para mantener vivo y reactivo el visualizador 3D
    if ((this.isIframeMode || isSpotifyPlaying) && energy < 0.05) {
      return this.generateSyntheticBeat(performance.now());
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

  /** Volumen al que debe volver el master tras un fundido: el del store, no el instantáneo */
  private restingGain(): number {
    const s = usePlayerStore.getState();
    return s.isMuted ? 0 : Math.max(0, Math.min(1, s.volume));
  }

  /** Se incrementa en cada fundido; un fundido viejo que termina tarde no debe tocar el volumen */
  private fadeToken = 0;

  private async fadeThroughSilence(
    fadeOutTime: number,
    fadeInTime: number,
    exponential: boolean
  ): Promise<void> {
    if (!this.masterGain || !this.audioContext) return;
    const token = ++this.fadeToken;
    const gain = this.masterGain.gain;
    const floor = exponential ? 0.001 : 0.01;
    const now = this.audioContext.currentTime;

    // Partir del valor actual (si hay otro fundido en curso, se cancela en vez de encadenarse)
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(floor, gain.value), now);
    if (exponential) gain.exponentialRampToValueAtTime(floor, now + fadeOutTime);
    else gain.linearRampToValueAtTime(floor, now + fadeOutTime);

    await new Promise((resolve) => setTimeout(resolve, fadeOutTime * 1000));
    if (token !== this.fadeToken || !this.audioContext) return; // lo reemplazó otro fundido

    const afterNow = this.audioContext.currentTime;
    const target = this.restingGain();
    gain.cancelScheduledValues(afterNow);
    gain.setValueAtTime(floor, afterNow);
    // exponentialRamp no admite destino 0 (silenciado): se usa lineal en ese caso
    if (exponential && target > 0) gain.exponentialRampToValueAtTime(target, afterNow + fadeInTime);
    else gain.linearRampToValueAtTime(target, afterNow + fadeInTime);
  }

  public async crossfade(durationSec = 2.0): Promise<void> {
    await this.fadeThroughSilence(
      Math.max(0.4, durationSec * 0.4),
      Math.max(0.4, durationSec * 0.6),
      false
    );
  }

  // ── Harmonic DJ Crossfade (BPM & Camelot Beat-Sync) ───────────────────────
  public async harmonicCrossfade(durationSec = 2.5, _fromKey?: string, _toKey?: string): Promise<void> {
    await this.fadeThroughSilence(
      Math.max(0.5, durationSec * 0.45),
      Math.max(0.5, durationSec * 0.55),
      true
    );
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
