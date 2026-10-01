import type { Track } from '../types/audio';

interface SourceState {
  isSpotifyConnected: boolean;
  currentTrack: Track | null;
}

/**
 * ¿Los controles (play, siguiente, seek…) deben ir a Spotify?
 * Solo si está conectado Y la pista actual es de Spotify. Estar conectado no basta:
 * con un archivo local, el micrófono o YouTube sonando, los controles son del motor local.
 */
export const isSpotifyActiveSource = (s: SourceState): boolean =>
  s.isSpotifyConnected && s.currentTrack?.sourceType === 'spotify';
