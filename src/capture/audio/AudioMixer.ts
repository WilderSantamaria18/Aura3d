import { AudioEngine } from '../../services/audioEngine';

export class AudioMixer {
  private activeContext: AudioContext | null = null;

  public getMixedAudioStream(externalAudioTracks: MediaStreamTrack[] = []): MediaStreamTrack[] {
    const audioEngine = AudioEngine.getInstance();
    const audioDest = audioEngine.getAudioStreamDestination();
    // Clones: el destino de audio es compartido; si se detuviera la pista original,
    // la siguiente grabación saldría sin sonido.
    const internalTracks = audioDest?.stream ? audioDest.stream.getAudioTracks().map((t) => t.clone()) : [];

    // If only internal audio is present
    if (externalAudioTracks.length === 0) {
      return internalTracks;
    }

    // If only external audio is present
    if (internalTracks.length === 0) {
      return externalAudioTracks;
    }

    // Mix both via AudioContext
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const mixCtx = new AudioCtx();
      this.activeContext = mixCtx;

      const destination = mixCtx.createMediaStreamDestination();
      const internalSource = mixCtx.createMediaStreamSource(new MediaStream(internalTracks));
      const externalSource = mixCtx.createMediaStreamSource(new MediaStream(externalAudioTracks));

      internalSource.connect(destination);
      externalSource.connect(destination);

      return destination.stream.getAudioTracks();
    } catch (e) {
      console.warn('[AudioMixer] Fallback to internal audio tracks due to mix error:', e);
      return internalTracks;
    }
  }

  public dispose(): void {
    if (this.activeContext) {
      this.activeContext.close().catch(() => {});
      this.activeContext = null;
    }
  }
}
