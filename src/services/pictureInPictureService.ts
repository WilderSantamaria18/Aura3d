/**
 * Picture-in-Picture (PiP) Service for Aura3D
 * Streams the active visualizer canvas into a floating Picture-in-Picture window
 * allowing uninterrupted visualizer experience while multi-tasking across apps.
 */

class PictureInPictureService {
  private static instance: PictureInPictureService | null = null;
  private hiddenVideo: HTMLVideoElement | null = null;
  private isPipActive = false;
  private listeners: ((isActive: boolean) => void)[] = [];

  private constructor() {}

  public static getInstance(): PictureInPictureService {
    if (!PictureInPictureService.instance) {
      PictureInPictureService.instance = new PictureInPictureService();
    }
    return PictureInPictureService.instance;
  }

  public subscribe(cb: (isActive: boolean) => void): () => void {
    this.listeners.push(cb);
    cb(this.isPipActive);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPipActive));
  }

  public getIsActive(): boolean {
    return this.isPipActive;
  }

  public async togglePictureInPicture(): Promise<boolean> {
    if (this.isPipActive && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
        this.isPipActive = false;
        this.notify();
        return false;
      } catch (err) {
        console.warn('[PiP] Error exiting PiP:', err);
      }
    }

    try {
      // 1. Locate the active WebGL canvas
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const activeCanvas =
        canvases.find((c) => {
          const isWebGL = c.getContext('webgl2') || c.getContext('webgl');
          const rect = c.getBoundingClientRect();
          return isWebGL && rect.width > 200 && rect.height > 200;
        }) || canvases[0];

      if (!activeCanvas) {
        console.warn('[PiP] No active visualizer canvas found.');
        return false;
      }

      // 2. Setup or reuse hidden video element
      if (!this.hiddenVideo) {
        this.hiddenVideo = document.createElement('video');
        this.hiddenVideo.muted = true;
        this.hiddenVideo.playsInline = true;
        this.hiddenVideo.autoplay = true;
        this.hiddenVideo.style.position = 'fixed';
        this.hiddenVideo.style.pointerEvents = 'none';
        this.hiddenVideo.style.opacity = '0';
        this.hiddenVideo.style.width = '10px';
        this.hiddenVideo.style.height = '10px';
        this.hiddenVideo.style.bottom = '0';
        this.hiddenVideo.style.right = '0';
        document.body.appendChild(this.hiddenVideo);

        this.hiddenVideo.addEventListener('leavepictureinpicture', () => {
          this.isPipActive = false;
          this.notify();
        });
      }

      // 3. Capture canvas stream at 30 fps
      const stream = (activeCanvas as any).captureStream ? (activeCanvas as any).captureStream(30) : null;
      if (!stream) {
        console.warn('[PiP] captureStream not supported by canvas.');
        return false;
      }

      this.hiddenVideo.srcObject = stream;
      await this.hiddenVideo.play();

      // 4. Request Picture-in-Picture
      if (document.pictureInPictureEnabled && this.hiddenVideo.requestPictureInPicture) {
        await this.hiddenVideo.requestPictureInPicture();
        this.isPipActive = true;
        this.notify();
        return true;
      }
    } catch (err) {
      console.warn('[PiP] Failed to enter Picture-in-Picture:', err);
      this.isPipActive = false;
      this.notify();
    }
    return false;
  }
}

export const pictureInPictureService = PictureInPictureService.getInstance();
