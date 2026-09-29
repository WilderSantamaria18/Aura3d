import type { CaptureEngine } from './CaptureEngine';
import type { CaptureResult, CaptureSession } from '../types';
import { getCaptureDimensions, calculateCenterCrop } from '../utils/captureGeometry';
import { drawTrackWatermark } from '../utils/watermark';
import { AudioMixer } from '../audio/AudioMixer';
import { usePlayerStore } from '../../stores/playerStore';

export class ScreenRecordingEngine implements CaptureEngine {
  private activeSession: CaptureSession | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private displayStream: MediaStream | null = null;
  private hiddenVideo: HTMLVideoElement | null = null;
  private isCropping = false;
  private animFrameId: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private hiddenTimerId: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds = 0;
  private startedAt = 0;
  private framesDrawn = 0;
  private audioMixer = new AudioMixer();
  private streamToRecord: MediaStream | null = null;
  private onProgressCallback?: (sec: number) => void;

  public async prepare(session: CaptureSession): Promise<void> {
    this.activeSession = session;
  }

  public async start(onProgress?: (elapsedSec: number) => void, onEnded?: () => void): Promise<void> {
    if (!this.activeSession) {
      throw new Error('Sesión no configurada.');
    }

    this.onProgressCallback = onProgress;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;

    const { width: targetW, height: targetH } = getCaptureDimensions(
      this.activeSession.aspectRatio,
      this.activeSession.resolution
    );

    // Request display media
    try {
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: this.activeSession.fps || 60, max: 60 },
        },
        audio: this.activeSession.includeAudio,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
        surfaceSwitching: 'include',
      } as unknown as DisplayMediaStreamOptions);
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.message?.includes('denied')) {
        throw new Error('Captura cancelada por el usuario.');
      }
      throw err;
    }

    if (!this.displayStream || this.displayStream.getVideoTracks().length === 0) {
      throw new Error('No se obtuvo pista de video para la grabación.');
    }

    // Hidden video element to read frames from display stream
    this.hiddenVideo = document.createElement('video');
    this.hiddenVideo.srcObject = this.displayStream;
    this.hiddenVideo.muted = true;
    this.hiddenVideo.playsInline = true;
    await this.hiddenVideo.play().catch(() => {});

    // Crop canvas
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = targetW;
    cropCanvas.height = targetH;
    const cropCtx = cropCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });

    if (!cropCtx) {
      throw new Error('No se pudo inicializar el contexto de renderizado de video.');
    }

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    this.isCropping = true;
    this.framesDrawn = 0;
    const session = this.activeSession;
    const video = this.hiddenVideo;

    const drawOnce = () => {
      if (!video) return;
      this.framesDrawn++;
      const srcW = video.videoWidth || window.innerWidth;
      const srcH = video.videoHeight || window.innerHeight;
      const crop = calculateCenterCrop(srcW, srcH, targetW, targetH);

      cropCtx.drawImage(
        video,
        crop.sx,
        crop.sy,
        crop.sWidth,
        crop.sHeight,
        0,
        0,
        targetW,
        targetH
      );

      if (session.includeSongCard || session.includeWatermark) {
        const currentTrack = usePlayerStore.getState().currentTrack;
        drawTrackWatermark(
          cropCtx,
          targetW,
          targetH,
          session.aspectRatio,
          currentTrack?.title,
          currentTrack?.artist,
          true
        );
      }
    };

    const renderFrame = () => {
      if (!this.isCropping) return;
      drawOnce();
      this.animFrameId = requestAnimationFrame(renderFrame);
    };

    drawOnce();
    this.animFrameId = requestAnimationFrame(renderFrame);

    // Pestaña oculta: requestAnimationFrame se detiene, así que se dibuja con un temporizador
    this.hiddenTimerId = setInterval(() => {
      if (this.isCropping && document.hidden) drawOnce();
    }, 200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoStream = (cropCanvas as any).captureStream(session.fps || 60);

    // Audio mixing
    const tabAudioTracks = this.displayStream.getAudioTracks();
    // El audio de la pestaña ya incluye lo que suena en la app: mezclarlo con la señal
    // interna lo duplicaría (eco). Solo se usa el interno si la pestaña no aporta audio.
    const mixedAudioTracks = session.includeAudio
      ? tabAudioTracks.length > 0
        ? tabAudioTracks
        : this.audioMixer.getMixedAudioStream([])
      : [];

    const combinedTracks = [...videoStream.getVideoTracks(), ...mixedAudioTracks];
    this.streamToRecord = new MediaStream(combinedTracks);

    // Codec
    const mimeTypes = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    let chosenMime = 'video/webm';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        chosenMime = mime;
        break;
      }
    }

    const videoBitrate = session.resolution === '4k' ? 28_000_000 : 16_000_000;

    this.mediaRecorder = new MediaRecorder(this.streamToRecord, {
      mimeType: chosenMime,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: 320_000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    // Auto-stop if user ends screen sharing via browser native floating bar
    // Si el usuario pulsa «Dejar de compartir» en la barra del navegador, avisa al controlador
    // para que finalice y muestre el resultado (antes se quedaba «grabando» para siempre).
    this.displayStream.getVideoTracks()[0].onended = () => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        onEnded?.();
      }
    };

    this.mediaRecorder.start(1000);

    this.startedAt = performance.now();
    this.timerId = setInterval(() => {
      this.elapsedSeconds = Math.floor((performance.now() - this.startedAt) / 1000);
      this.onProgressCallback?.(this.elapsedSeconds);
    }, 250);
  }

  public stop(): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      this.cleanupTimer();
      this.isCropping = false;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('MediaRecorder inactivo.'));
        return;
      }

      if (this.framesDrawn < 2) {
        // Sin fotogramas el archivo sería un video vacío: se descarta con un mensaje claro
        this.recordedChunks = [];
        try {
          this.mediaRecorder.stop();
        } catch {
          /* ya detenido */
        }
        this.cleanupStreams();
        reject(new Error('No se capturó ningún fotograma. Mantén esta pestaña visible mientras grabas: si pasa a segundo plano el navegador detiene el dibujo y el video queda vacío.'));
        return;
      }

      const session = this.activeSession;
      const duration = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));
      const mime = this.mediaRecorder.mimeType || 'video/webm';

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.recordedChunks, { type: mime });
        this.recordedChunks = [];
        this.cleanupStreams();

        const currentTrack = usePlayerStore.getState().currentTrack;
        const cleanTitle = (currentTrack?.title || 'Visualizer')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 30);
        const ratioTag = (session?.aspectRatio || '16:9').replace(':', '-');
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `Aura3D_Screen_${cleanTitle}_${ratioTag}_${timestamp}.${ext}`;
        const url = URL.createObjectURL(finalBlob);

        const { width, height } = getCaptureDimensions(
          session?.aspectRatio || '16:9',
          session?.resolution || '1080p'
        );

        resolve({
          type: 'video',
          blob: finalBlob,
          url,
          fileName,
          dimensions: { width, height },
          durationSec: duration,
          aspectRatio: session?.aspectRatio || '16:9',
          createdAt: Date.now(),
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  public async cancel(): Promise<void> {
    this.cleanupTimer();
    this.isCropping = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.recordedChunks = [];
    this.cleanupStreams();
  }

  public async dispose(): Promise<void> {
    await this.cancel();
    this.audioMixer.dispose();
    this.activeSession = null;
  }

  private cleanupTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.hiddenTimerId) {
      clearInterval(this.hiddenTimerId);
      this.hiddenTimerId = null;
    }
  }

  private cleanupStreams(): void {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop());
      this.displayStream = null;
    }
    if (this.hiddenVideo) {
      this.hiddenVideo.pause();
      this.hiddenVideo.srcObject = null;
      this.hiddenVideo = null;
    }
    if (this.streamToRecord) {
      this.streamToRecord.getTracks().forEach((t) => t.stop());
      this.streamToRecord = null;
    }
    this.audioMixer.dispose();
  }
}
