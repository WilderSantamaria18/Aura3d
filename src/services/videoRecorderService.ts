import { AudioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import { findVisualizerCanvas } from '../utils/visualizerCanvas';

export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3';
export type VideoQuality = '1080p' | '4k';
export type VideoSourceMode = 'direct_canvas' | 'screen_tab';

export interface RecorderOptions {
  durationLimitSec?: number; // Optional auto-stop duration (e.g. 15s, 30s, 60s)
  aspectRatio?: VideoAspectRatio;
  quality?: VideoQuality;
  sourceMode?: VideoSourceMode;
  includeTrackCard?: boolean; // Overlay song card & Aura3D branding for TikTok / Reels / Shorts
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
   * Determine target dimensions based on requested aspect ratio & quality
   */
  public getTargetDimensions(
    ratio: VideoAspectRatio = '16:9',
    quality: VideoQuality = '1080p'
  ): { targetW: number; targetH: number } {
    const is4k = quality === '4k';

    switch (ratio) {
      case '9:16':
        return is4k ? { targetW: 2160, targetH: 3840 } : { targetW: 1080, targetH: 1920 };
      case '1:1':
        return is4k ? { targetW: 2160, targetH: 2160 } : { targetW: 1080, targetH: 1080 };
      case '4:5':
        return is4k ? { targetW: 1728, targetH: 2160 } : { targetW: 1080, targetH: 1350 };
      case '4:3':
        return is4k ? { targetW: 2880, targetH: 2160 } : { targetW: 1440, targetH: 1080 };
      case '16:9':
      default:
        return is4k ? { targetW: 3840, targetH: 2160 } : { targetW: 1920, targetH: 1080 };
    }
  }

  /**
   * Finds the active visualizer canvas currently on screen
   */
  public findActiveCanvas(): HTMLCanvasElement | null {
    return findVisualizerCanvas();
  }

  /**
   * Start recording with chosen aspect ratio, resolution and source mode.
   */
  public async startRecording(options: RecorderOptions = {}): Promise<boolean> {
    if (this.isCurrentlyRecording) {
      console.warn('[VideoRecorder] Ya hay una grabación activa.');
      return false;
    }

    const selectedRatio: VideoAspectRatio = options.aspectRatio || '16:9';
    const selectedQuality: VideoQuality = options.quality || '1080p';
    const sourceMode: VideoSourceMode = options.sourceMode || 'direct_canvas';
    const { targetW, targetH } = this.getTargetDimensions(selectedRatio, selectedQuality);

    let displayStream: MediaStream | null = null;
    let videoStreamToRecord: MediaStream | null = null;

    try {
      // MODE A: Direct WebGL Canvas Capture (Zero permission prompts, pristine 60 FPS)
      if (sourceMode === 'direct_canvas') {
        const canvas = this.findActiveCanvas();
        if (!canvas) {
          throw new Error('No se detectó un lienzo visualizador activo para grabar directamente.');
        }

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = targetW;
        cropCanvas.height = targetH;
        const cropCtx = cropCanvas.getContext('2d', { alpha: false, desynchronized: true });

        if (cropCtx) {
          cropCtx.imageSmoothingEnabled = true;
          cropCtx.imageSmoothingQuality = 'high';

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
            if (options.includeTrackCard) {
              this.drawTrackWatermark(cropCtx, targetW, targetH, selectedRatio);
            }
            requestAnimationFrame(drawCanvasFrame);
          };

          requestAnimationFrame(drawCanvasFrame);
          this.cropLoopStopper = () => {
            isCropping = false;
          };

          // Capture stream at 60 FPS
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          videoStreamToRecord = (cropCanvas as any).captureStream(60);
        }
      }

      // MODE B: Full Tab / Screen Media Capture (with fallback)
      if (!videoStreamToRecord && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
              frameRate: { ideal: 60, max: 60 },
            },
            audio: true,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            systemAudio: 'include',
            surfaceSwitching: 'include',
          } as unknown as DisplayMediaStreamOptions);
          this.activeDisplayStream = displayStream;
        } catch (captureErr) {
          const cErr = captureErr as Error;
          if (cErr.name === 'NotAllowedError' || cErr.message?.includes('Permission denied')) {
            console.info('[VideoRecorder] El usuario canceló la selección de pantalla.');
            return false;
          }
          console.warn('[VideoRecorder] Falló captura de pestaña, intentando canvas fallback:', cErr);
        }

        if (displayStream && displayStream.getVideoTracks().length > 0) {
          const videoTrack = displayStream.getVideoTracks()[0];
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
            cropCtx.imageSmoothingEnabled = true;
            cropCtx.imageSmoothingQuality = 'high';

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
                cropW = srcH * targetAspect;
                startX = (srcW - cropW) / 2;
              } else {
                cropH = srcW / targetAspect;
                startY = (srcH - cropH) / 2;
              }

              cropCtx.drawImage(hiddenVideo, startX, startY, cropW, cropH, 0, 0, targetW, targetH);
              if (options.includeTrackCard) {
                this.drawTrackWatermark(cropCtx, targetW, targetH, selectedRatio);
              }
              requestAnimationFrame(drawCropFrame);
            };

            requestAnimationFrame(drawCropFrame);
            this.cropLoopStopper = () => {
              isCropping = false;
              hiddenVideo.pause();
              hiddenVideo.srcObject = null;
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            videoStreamToRecord = (cropCanvas as any).captureStream(60);
          }
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

      // Audio mixing
      if (internalAudioTracks.length > 0 && tabAudioTracks.length > 0) {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const mixCtx = new AudioContextClass();
          this.activeAudioContext = mixCtx;

          const dest = mixCtx.createMediaStreamDestination();
          const internalSource = mixCtx.createMediaStreamSource(new MediaStream(internalAudioTracks));
          const tabSource = mixCtx.createMediaStreamSource(new MediaStream(tabAudioTracks));

          internalSource.connect(dest);
          tabSource.connect(dest);

          dest.stream.getAudioTracks().forEach((track) => combinedTracks.push(track));
        } catch {
          combinedTracks.push(internalAudioTracks[0]);
        }
      } else if (internalAudioTracks.length > 0) {
        combinedTracks.push(internalAudioTracks[0]);
      } else if (tabAudioTracks.length > 0) {
        combinedTracks.push(tabAudioTracks[0]);
      }

      const combinedStream = new MediaStream(combinedTracks);

      // 3. Supported MIME types: prioritize MP4
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

      const videoBitrate = selectedQuality === '4k' ? 28_000_000 : 16_000_000;

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitrate, // 16 Mbps for 1080p60, 28 Mbps for 4K
        audioBitsPerSecond: 320_000,     // 320 kbps studio sound
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

  /**
   * Draw cinematic track info watermark card onto recorded video frame
   */
  private drawTrackWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    ratio: VideoAspectRatio
  ): void {
    const currentTrack = usePlayerStore.getState().currentTrack;
    const title = currentTrack?.title || 'Aura3D Soundscape';
    const artist = currentTrack?.artist || 'DAW Studio Visualizer';

    ctx.save();
    const isVertical = ratio === '9:16' || ratio === '4:5';
    const cardW = isVertical ? Math.min(width * 0.88, 720) : Math.min(width * 0.46, 540);
    const cardH = isVertical ? 120 : 82;
    const cardX = (width - cardW) / 2;
    const cardY = isVertical ? height - cardH - 140 : height - cardH - 50;

    // Outer subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    // Background Glass Pill
    ctx.fillStyle = 'rgba(7, 10, 20, 0.84)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Aura 3D Accent Tag
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('● AURA 3D STUDIO', cardX + 22, cardY + (isVertical ? 32 : 25));

    // Song Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    const maxTitleLen = isVertical ? 26 : 30;
    const displayTitle = title.length > maxTitleLen ? title.substring(0, maxTitleLen - 2) + '...' : title;
    ctx.fillText(displayTitle, cardX + 22, cardY + (isVertical ? 64 : 50));

    // Artist Name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '13px monospace';
    const maxArtistLen = isVertical ? 30 : 36;
    const displayArtist = artist.length > maxArtistLen ? artist.substring(0, maxArtistLen - 2) + '...' : artist;
    ctx.fillText(displayArtist, cardX + 22, cardY + (isVertical ? 94 : 70));

    // Animated Mini Spectrum Indicator Bars
    const barsX = cardX + cardW - 70;
    const barsY = cardY + cardH / 2;
    const t = performance.now() * 0.007;
    ctx.fillStyle = '#00e5ff';
    for (let i = 0; i < 5; i++) {
      const barH = 10 + Math.sin(t + i * 1.3) * 9;
      ctx.fillRect(barsX + i * 8, barsY - barH / 2, 4, barH);
    }

    ctx.restore();
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
