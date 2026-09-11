import { AudioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';

export type VideoAspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

export interface RecorderOptions {
  durationLimitSec?: number; // Optional auto-stop duration (e.g. 15s or 30s)
  aspectRatio?: VideoAspectRatio;
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
  private cropLoopStopper: (() => void) | null = null;
  private activeDisplayStream: MediaStream | null = null;
  private activeAudioContext: AudioContext | null = null;

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
   * Determine target dimensions based on requested aspect ratio for pristine HD recording
   */
  private getTargetDimensions(ratio: VideoAspectRatio = '16:9'): { targetW: number; targetH: number } {
    switch (ratio) {
      case '4:3':
        return { targetW: 1440, targetH: 1080 };
      case '1:1':
        return { targetW: 1080, targetH: 1080 };
      case '9:16':
        return { targetW: 720, targetH: 1280 };
      case '16:9':
      default:
        return { targetW: 1920, targetH: 1080 };
    }
  }

  /**
   * Finds the best active canvas currently on screen as fallback
   */
  private findActiveCanvas(): HTMLCanvasElement | null {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (canvases.length === 0) return null;

    let bestCanvas: HTMLCanvasElement | null = null;
    let maxArea = 0;

    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && rect.width > 120 && rect.height > 120) {
        maxArea = area;
        bestCanvas = canvas;
      }
    }

    return bestCanvas;
  }

  /**
   * Start recording the browser tab, adjusting to aspect ratio (16:9, 4:3, 1:1) without modifying the tab,
   * with high fidelity MP4 container and integrated player audio.
   */
  public async startRecording(options: RecorderOptions = {}): Promise<boolean> {
    if (this.isCurrentlyRecording) {
      console.warn('[VideoRecorder] Ya hay una grabación activa.');
      return false;
    }

    const selectedRatio: VideoAspectRatio = options.aspectRatio || '16:9';
    const { targetW, targetH } = this.getTargetDimensions(selectedRatio);

    let displayStream: MediaStream | null = null;
    let videoStreamToRecord: MediaStream | null = null;

    try {
      // 1. Capture the tab directly using getDisplayMedia
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
              frameRate: { ideal: 60, max: 60 },
            },
            audio: true,
            // Chromium extensions prioritizing current tab
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            systemAudio: 'include',
            surfaceSwitching: 'include',
          } as unknown as DisplayMediaStreamOptions);
          this.activeDisplayStream = displayStream;
        } catch (captureErr) {
          const cErr = captureErr as Error;
          // If user pressed "Cancel" in browser modal, don't crash
          if (cErr.name === 'NotAllowedError' || cErr.message?.includes('Permission denied')) {
            console.info('[VideoRecorder] El usuario canceló la selección de pestaña.');
            return false;
          }
          console.warn('[VideoRecorder] Falló captura de pestaña, intentando fallback de canvas:', cErr);
        }
      }

      // If display stream was acquired, route through crop canvas to match target aspect ratio without touching window
      if (displayStream && displayStream.getVideoTracks().length > 0) {
        const videoTrack = displayStream.getVideoTracks()[0];

        // If user stops sharing from browser banner, stop recording cleanly
        videoTrack.onended = () => {
          if (this.isCurrentlyRecording) {
            this.stopRecording();
          }
        };

        const hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = displayStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play().catch((e) => console.warn('[VideoRecorder] video.play error:', e));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = targetW;
        cropCanvas.height = targetH;
        const cropCtx = cropCanvas.getContext('2d', { alpha: false, desynchronized: true });

        if (cropCtx) {
          let isCropping = true;
          const targetAspect = targetW / targetH;

          const drawCropFrame = () => {
            if (!isCropping) return;

            const srcW = hiddenVideo.videoWidth || window.innerWidth;
            const srcH = hiddenVideo.videoHeight || window.innerHeight;
            const srcAspect = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;
            let startX = 0;
            let startY = 0;

            if (srcAspect > targetAspect) {
              // Video is wider than target ratio: crop sides
              cropW = srcH * targetAspect;
              startX = (srcW - cropW) / 2;
            } else {
              // Video is taller than target ratio: crop top/bottom
              cropH = srcW / targetAspect;
              startY = (srcH - cropH) / 2;
            }

            cropCtx.drawImage(hiddenVideo, startX, startY, cropW, cropH, 0, 0, targetW, targetH);
            requestAnimationFrame(drawCropFrame);
          };

          requestAnimationFrame(drawCropFrame);
          this.cropLoopStopper = () => {
            isCropping = false;
            hiddenVideo.pause();
            hiddenVideo.srcObject = null;
          };

          // Capture 60fps from cropped canvas
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          videoStreamToRecord = (cropCanvas as any).captureStream(60);
        }
      }

      // Fallback: If display media failed or was unavailable, capture active canvas directly
      if (!videoStreamToRecord) {
        const canvas = this.findActiveCanvas();
        if (!canvas) {
          throw new Error('No se detectó la pestaña ni un lienzo visualizador activo para grabar.');
        }

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = targetW;
        cropCanvas.height = targetH;
        const cropCtx = cropCanvas.getContext('2d', { alpha: false, desynchronized: true });

        if (cropCtx) {
          let isCropping = true;
          const targetAspect = targetW / targetH;

          const drawCanvasFrame = () => {
            if (!isCropping) return;
            const srcW = canvas.width;
            const srcH = canvas.height;
            const srcAspect = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;
            let startX = 0;
            let startY = 0;

            if (srcAspect > targetAspect) {
              cropW = srcH * targetAspect;
              startX = (srcW - cropW) / 2;
            } else {
              cropH = srcW / targetAspect;
              startY = (srcH - cropH) / 2;
            }

            cropCtx.drawImage(canvas, startX, startY, cropW, cropH, 0, 0, targetW, targetH);
            requestAnimationFrame(drawCanvasFrame);
          };

          requestAnimationFrame(drawCanvasFrame);
          this.cropLoopStopper = () => {
            isCropping = false;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          videoStreamToRecord = (cropCanvas as any).captureStream(60);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          videoStreamToRecord = (canvas as any).captureStream ? (canvas as any).captureStream(60) : null;
        }
      }

      if (!videoStreamToRecord) {
        throw new Error('No fue posible inicializar el flujo de video para la grabación.');
      }

      // 2. Fetch live audio stream from AudioEngine & tab audio
      const audioEngine = AudioEngine.getInstance();
      const audioDestination = audioEngine.getAudioStreamDestination();
      const internalAudioTracks = audioDestination?.stream ? audioDestination.stream.getAudioTracks() : [];
      const tabAudioTracks = displayStream ? displayStream.getAudioTracks() : [];

      const combinedTracks: MediaStreamTrack[] = [...videoStreamToRecord.getVideoTracks()];

      // Audio mixing: prefer high quality internal AudioEngine stream, mixing with tab audio if needed
      if (internalAudioTracks.length > 0 && tabAudioTracks.length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const mixCtx = new AudioContextClass();
          this.activeAudioContext = mixCtx;

          const dest = mixCtx.createMediaStreamDestination();
          const internalSource = mixCtx.createMediaStreamSource(new MediaStream(internalAudioTracks));
          const tabSource = mixCtx.createMediaStreamSource(new MediaStream(tabAudioTracks));

          internalSource.connect(dest);
          tabSource.connect(dest);

          dest.stream.getAudioTracks().forEach((track) => combinedTracks.push(track));
        } catch {
          // Fallback to internal audio track
          combinedTracks.push(internalAudioTracks[0]);
        }
      } else if (internalAudioTracks.length > 0) {
        combinedTracks.push(internalAudioTracks[0]);
      } else if (tabAudioTracks.length > 0) {
        combinedTracks.push(tabAudioTracks[0]);
      }

      const combinedStream = new MediaStream(combinedTracks);

      // 3. Prioritize MP4 MIME types so the file is exported as MP4
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
        videoBitsPerSecond: 12_000_000, // 12 Mbps for crystal-clear 1080p 60fps
        audioBitsPerSecond: 256_000,   // 256 kbps studio audio
      });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishRecording(selectedMimeType, selectedRatio, options);
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('[VideoRecorder] Error durante la grabación:', e);
        this.stopRecording();
      };

      // Request data every second
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
    if (this.cropLoopStopper) {
      this.cropLoopStopper();
      this.cropLoopStopper = null;
    }

    if (this.activeDisplayStream) {
      this.activeDisplayStream.getTracks().forEach((track) => track.stop());
      this.activeDisplayStream = null;
    }

    if (this.activeAudioContext) {
      this.activeAudioContext.close().catch(() => {});
      this.activeAudioContext = null;
    }

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
  private finishRecording(mimeType: string, ratio: VideoAspectRatio, options: RecorderOptions): void {
    if (this.cropLoopStopper) {
      this.cropLoopStopper();
      this.cropLoopStopper = null;
    }

    if (this.activeDisplayStream) {
      this.activeDisplayStream.getTracks().forEach((track) => track.stop());
      this.activeDisplayStream = null;
    }

    if (this.activeAudioContext) {
      this.activeAudioContext.close().catch(() => {});
      this.activeAudioContext = null;
    }

    this.isCurrentlyRecording = false;
    this.cleanupTimer();

    const track = usePlayerStore.getState().currentTrack;
    const sanitizedTitle = track?.title
      ? track.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
      : 'Visualizer';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const formattedRatio = ratio.replace(':', '-');
    const fileName = `Aura3D_${sanitizedTitle}_${formattedRatio}_${timestamp}.${extension}`;

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
    if (this.cropLoopStopper) {
      this.cropLoopStopper();
      this.cropLoopStopper = null;
    }
    if (this.activeDisplayStream) {
      this.activeDisplayStream.getTracks().forEach((track) => track.stop());
      this.activeDisplayStream = null;
    }
    if (this.activeAudioContext) {
      this.activeAudioContext.close().catch(() => {});
      this.activeAudioContext = null;
    }
    this.isCurrentlyRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.notifyState();
  }
}

export const videoRecorder = new VideoRecorderService();
