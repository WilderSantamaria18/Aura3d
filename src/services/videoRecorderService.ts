import { AudioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';

export interface RecorderOptions {
  durationLimitSec?: number; // Optional auto-stop duration (e.g. 15s or 30s)
  onProgress?: (elapsedSec: number) => void;
  onFinish?: (blobUrl: string, fileName: string) => void;
  onError?: (err: Error) => void;
}

class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds = 0;
  private activeBlobUrl: string | null = null;
  private isCurrentlyRecording = false;

  private stateListeners: ((isRecording: boolean, elapsedSec: number) => void)[] = [];

  public subscribeState(listener: (isRecording: boolean, elapsedSec: number) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.isCurrentlyRecording, this.elapsedSeconds);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private notifyState() {
    this.stateListeners.forEach((l) => l(this.isCurrentlyRecording, this.elapsedSeconds));
  }

  public isRecording(): boolean {
    return this.isCurrentlyRecording;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  /**
   * Finds the best active canvas currently on screen
   */
  private findActiveCanvas(): HTMLCanvasElement | null {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (canvases.length === 0) return null;

    let bestCanvas: HTMLCanvasElement | null = null;
    let maxArea = 0;

    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      const area = rect.width * rect.height;
      // Must be visible and have reasonable dimensions
      if (area > maxArea && rect.width > 120 && rect.height > 120) {
        maxArea = area;
        bestCanvas = canvas;
      }
    }

    return bestCanvas;
  }

  /**
   * Start recording the visualizer canvas and audio stream
   */
  public async startRecording(options: RecorderOptions = {}): Promise<boolean> {
    if (this.isCurrentlyRecording) {
      console.warn('[VideoRecorder] Ya hay una grabación activa.');
      return false;
    }

    const canvas = this.findActiveCanvas();
    if (!canvas) {
      const err = new Error('No se detectó un lienzo visualizador activo para grabar.');
      options.onError?.(err);
      return false;
    }

    try {
      // 1. Capture 60 FPS video stream from canvas
      const canvasStream = (canvas as any).captureStream ? canvas.captureStream(60) : null;
      if (!canvasStream) {
        throw new Error('Tu navegador no soporta captura directa de canvas (captureStream).');
      }

      // 2. Fetch live audio stream from AudioEngine
      const audioEngine = AudioEngine.getInstance();
      const audioDestination = audioEngine.getAudioStreamDestination();
      const audioStream = audioDestination?.stream;

      // 3. Combine video and audio tracks into a unified stream
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      // 4. Select best supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = 'video/webm';
      }

      this.recordedChunks = [];
      this.elapsedSeconds = 0;

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8_000_000, // 8 Mbps for sharp 1080p graphics
        audioBitsPerSecond: 256_000,  // 256 kbps studio audio
      });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishRecording(selectedMimeType, options);
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('[VideoRecorder] Error durante la grabación:', e);
        this.stopRecording();
      };

      // Request data every 1 second
      this.mediaRecorder.start(1000);
      this.isCurrentlyRecording = true;
      this.notifyState();

      // Progress timer
      this.recordingTimer = setInterval(() => {
        this.elapsedSeconds += 1;
        options.onProgress?.(this.elapsedSeconds);
        this.notifyState();

        if (options.durationLimitSec && this.elapsedSeconds >= options.durationLimitSec) {
          this.stopRecording();
        }
      }, 1000);

      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[VideoRecorder] Fallo al iniciar grabación:', error);
      options.onError?.(error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Stop active recording and trigger download
   */
  public stopRecording(): void {
    if (!this.isCurrentlyRecording || !this.mediaRecorder) return;

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Finalize blob and trigger file download
   */
  private finishRecording(mimeType: string, options: RecorderOptions): void {
    this.isCurrentlyRecording = false;
    this.cleanupTimer();

    const track = usePlayerStore.getState().currentTrack;
    const sanitizedTitle = track?.title
      ? track.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
      : 'Visualizer';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `Aura3D_${sanitizedTitle}_${timestamp}.${extension}`;

    const blob = new Blob(this.recordedChunks, { type: mimeType });

    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
    }
    this.activeBlobUrl = URL.createObjectURL(blob);

    // Auto-trigger browser download
    const link = document.createElement('a');
    link.href = this.activeBlobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    options.onFinish?.(this.activeBlobUrl, fileName);
    this.notifyState();
  }

  private cleanupTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private cleanup() {
    this.cleanupTimer();
    this.isCurrentlyRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.notifyState();
  }
}

export const videoRecorder = new VideoRecorderService();
