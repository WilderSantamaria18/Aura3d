import { audioEngine } from './audioEngine';
import type { CaptureSource } from '../store/recorderStore';

export interface StartRecordingOptions {
  source: CaptureSource;
  resolution: { width: number; height: number };
  fps: number;
  durationMode: 'manual' | 'song_end' | 'continuous';
  durationLimitSec?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  includeAudio?: boolean;
  includeMic?: boolean;
  onProgress?: (elapsedSec: number) => void;
  onAutoStop?: () => void;
}

export class ScreenRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private combinedStream: MediaStream | null = null;
  private displayStream: MediaStream | null = null;
  private intermediateCanvas: HTMLCanvasElement | null = null;
  private intermediateCtx: CanvasRenderingContext2D | null = null;
  private renderLoopId: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private elapsedSeconds = 0;
  private isRecording = false;

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getElapsed(): number {
    return this.elapsedSeconds;
  }

  private findTargetCanvas(): HTMLCanvasElement | null {
    // 1. Direct priority to Rainbow Void canvas
    const rainbowCanvas = document.querySelector('#rainbow-void-canvas') as HTMLCanvasElement;
    if (rainbowCanvas && rainbowCanvas.width > 0) return rainbowCanvas;

    // 2. Query all canvases and select the largest active one (WebGL / Three.js)
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (canvases.length === 0) return null;

    let best: HTMLCanvasElement | null = null;
    let maxArea = 0;
    for (const c of canvases) {
      const rect = c.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && rect.width > 120 && rect.height > 120) {
        maxArea = area;
        best = c;
      }
    }
    return best || canvases[0];
  }

  public async start(options: StartRecordingOptions): Promise<void> {
    if (this.isRecording) {
      await this.stop();
    }

    this.recordedChunks = [];
    this.elapsedSeconds = 0;

    let videoStream: MediaStream | null = null;

    // 1. Acquire Video Stream according to source
    if (options.source === 'visualizer') {
      const sourceCanvas = this.findTargetCanvas();
      if (!sourceCanvas) {
        throw new Error('No se encontró el lienzo del visualizador para grabar.');
      }

      // If target resolution has a different aspect ratio than canvas, use an intermediate cropped canvas
      const targetW = options.resolution.width;
      const targetH = options.resolution.height;
      const targetRatio = targetW / targetH;
      const sourceRatio = (sourceCanvas.width || 1) / (sourceCanvas.height || 1);

      if (Math.abs(targetRatio - sourceRatio) > 0.05) {
        // Build intermediate canvas matching target resolution (e.g. 1080x1920 9:16)
        this.intermediateCanvas = document.createElement('canvas');
        this.intermediateCanvas.width = targetW;
        this.intermediateCanvas.height = targetH;
        this.intermediateCtx = this.intermediateCanvas.getContext('2d', { alpha: false });

        const drawLoop = () => {
          if (!this.isRecording || !this.intermediateCtx || !this.intermediateCanvas) return;

          const ctx = this.intermediateCtx;
          const cw = this.intermediateCanvas.width;
          const ch = this.intermediateCanvas.height;

          // Background fill (deep void black)
          ctx.fillStyle = '#03050c';
          ctx.fillRect(0, 0, cw, ch);

          // Center source canvas with aspect fit / cover
          const sW = sourceCanvas.width;
          const sH = sourceCanvas.height;
          const scale = Math.max(cw / sW, ch / sH);
          const scaledW = sW * scale;
          const scaledH = sH * scale;
          const offsetX = (cw - scaledW) / 2;
          const offsetY = (ch - scaledH) / 2;

          try {
            ctx.drawImage(sourceCanvas, offsetX, offsetY, scaledW, scaledH);
          } catch {
            // Context might be in draw cycle
          }

          this.renderLoopId = requestAnimationFrame(drawLoop);
        };

        drawLoop();
        videoStream = (this.intermediateCanvas as any).captureStream(options.fps);
      } else {
        videoStream = (sourceCanvas as any).captureStream(options.fps);
      }
    } else {
      // Screen, window or tab capture via getDisplayMedia
      const displayOptions: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: options.resolution.width },
          height: { ideal: options.resolution.height },
          frameRate: { ideal: options.fps, max: 60 },
        },
        audio: options.includeAudio ?? true,
      };

      this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      videoStream = this.displayStream;

      // Handle user stopping via browser native banner
      this.displayStream.getVideoTracks()[0].onended = () => {
        if (this.isRecording) {
          this.stop();
          if (options.onAutoStop) options.onAutoStop();
        }
      };
    }

    if (!videoStream || videoStream.getVideoTracks().length === 0) {
      throw new Error('No se pudo inicializar la pista de video para la grabación.');
    }

    // 2. Acquire Audio Stream from AudioEngine
    const audioTracks: MediaStreamTrack[] = [];
    if (options.includeAudio !== false) {
      const recStream = audioEngine.getRecordingStream();
      if (recStream) {
        recStream.getAudioTracks().forEach((track) => {
          audioTracks.push(track);
        });
      }

      // If display stream also captured audio, merge it if not already present
      if (this.displayStream && this.displayStream.getAudioTracks().length > 0) {
        this.displayStream.getAudioTracks().forEach((track) => {
          if (!audioTracks.includes(track)) {
            audioTracks.push(track);
          }
        });
      }
    }

    // 3. Merge Video + Audio into combined Stream
    this.combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioTracks,
    ]);

    // 4. Negotiate optimal codec
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
      mimeType = 'video/webm;codecs=h264,opus';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }

    // 5. Initialize MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.combinedStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond || 8_000_000,
      audioBitsPerSecond: options.audioBitsPerSecond || 192_000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(1000); // 1-second chunks for smooth streaming
    this.isRecording = true;

    // 6. Elapsed timer & auto-stop limit
    this.timerId = setInterval(() => {
      this.elapsedSeconds += 1;
      if (options.onProgress) {
        options.onProgress(this.elapsedSeconds);
      }

      if (
        options.durationMode === 'manual' &&
        options.durationLimitSec &&
        this.elapsedSeconds >= options.durationLimitSec
      ) {
        this.stop();
        if (options.onAutoStop) options.onAutoStop();
      }
    }, 1000);
  }

  public stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      if (this.renderLoopId) {
        cancelAnimationFrame(this.renderLoopId);
        this.renderLoopId = null;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isRecording = false;
        this.cleanup();
        const fallbackBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(fallbackBlob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
        this.recordedChunks = [];
        this.isRecording = false;
        this.cleanup();
        resolve(finalBlob);
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        this.isRecording = false;
        this.cleanup();
        resolve(new Blob(this.recordedChunks, { type: 'video/webm' }));
      }
    });
  }

  private cleanup(): void {
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop());
      this.displayStream = null;
    }
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach((t) => t.stop());
      this.combinedStream = null;
    }
    this.intermediateCanvas = null;
    this.intermediateCtx = null;
  }
}

export const screenRecorder = new ScreenRecorderService();
