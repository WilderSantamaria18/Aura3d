import type { CaptureEngine } from './CaptureEngine';
import type { CaptureResult, CaptureSession } from '../types';
import { findVisualizerCanvas } from '../../utils/visualizerCanvas';
import { getCaptureDimensions, calculateCenterCrop } from '../utils/captureGeometry';
import { drawTrackWatermark } from '../utils/watermark';
import { AudioMixer } from '../audio/AudioMixer';
import {
  loadActiveWallpaperImage,
  loadActiveCoverImage,
  findAtmosphereCanvas,
  drawSceneComposite,
} from '../utils/compositor';
import { AudioEngine } from '../../services/audioEngine';
import { usePlayerStore } from '../../stores/playerStore';

export class CanvasRecordingEngine implements CaptureEngine {
  private activeSession: CaptureSession | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
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
    // Garantiza que el motor de audio exista y esté activo (si no, el video saldría mudo)
    if (session.includeAudio) {
      try {
        await AudioEngine.getInstance().init();
      } catch (err) {
        console.warn('[CanvasRecordingEngine] No se pudo iniciar el audio:', err);
      }
    }
  }

  public async start(onProgress?: (elapsedSec: number) => void, _onEnded?: () => void): Promise<void> {
    if (!this.activeSession) {
      throw new Error('Sesión no configurada.');
    }

    const canvas = findVisualizerCanvas();
    if (!canvas) {
      throw new Error('No se detectó un lienzo visualizador activo para grabar.');
    }

    this.onProgressCallback = onProgress;
    this.recordedChunks = [];
    this.elapsedSeconds = 0;

    const { width: targetW, height: targetH } = getCaptureDimensions(
      this.activeSession.aspectRatio,
      this.activeSession.resolution
    );

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = targetW;
    cropCanvas.height = targetH;
    const cropCtx = cropCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (!cropCtx) {
      throw new Error('No se pudo inicializar el contexto de renderizado de video.');
    }

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    this.isCropping = true;
    this.framesDrawn = 0;
    const session = this.activeSession;

    const [wallpaperImg, coverImg] = await Promise.all([loadActiveWallpaperImage(), loadActiveCoverImage()]);
    const atmosphereCanvas = findAtmosphereCanvas();
    const isRainbowVoid = canvas.id === 'rainbow-void-canvas';

    const drawOnce = () => {
      this.framesDrawn++;
      drawSceneComposite(cropCtx, targetW, targetH, {
        wallpaperImg,
        atmosphereCanvas,
        visualizerCanvas: canvas,
        isRainbowVoid,
        coverImg,
      });

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

    // Con la pestaña oculta el navegador detiene requestAnimationFrame: un temporizador
    // mantiene vivo el video (a baja frecuencia) en lugar de dejarlo vacío.
    this.hiddenTimerId = setInterval(() => {
      if (this.isCropping && document.hidden) drawOnce();
    }, 200);

    // Capture stream at selected FPS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoStream = (cropCanvas as any).captureStream(session.fps || 60);

    // Audio stream
    const audioTracks = session.includeAudio ? this.audioMixer.getMixedAudioStream([]) : [];
    const combinedTracks = [...videoStream.getVideoTracks(), ...audioTracks];
    this.streamToRecord = new MediaStream(combinedTracks);

    // MIME negotiation
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

    this.mediaRecorder.start(1000);

    // Cronómetro basado en reloj real (setInterval acumula deriva)
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
        const fileName = `Aura3D_${cleanTitle}_${ratioTag}_${timestamp}.${ext}`;
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
    if (this.streamToRecord) {
      this.streamToRecord.getTracks().forEach((t) => t.stop());
      this.streamToRecord = null;
    }
    this.audioMixer.dispose();
  }
}
