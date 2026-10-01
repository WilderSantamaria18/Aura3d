/**
 * Avisa cuando se pierde la conexión mientras suena algo que depende de la red.
 * Sin esto la reproducción simplemente se corta sin explicación.
 */
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

export const OFFLINE_MESSAGE = 'Sin conexión: la reproducción por streaming puede interrumpirse.';

/** ¿Esta pista necesita red? Archivos locales, mic y captura no. */
export function needsNetwork(track: Track | null): boolean {
  if (!track) return false;
  if (track.sourceType === 'local' || track.sourceType === 'mic' || track.sourceType === 'system') return false;
  if (typeof track.url === 'string' && track.url.startsWith('blob:')) return false;
  return true;
}

let installed = false;

export function installConnectivityNotice(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('offline', () => {
    const { currentTrack, isPlaying } = usePlayerStore.getState();
    if (isPlaying && needsNetwork(currentTrack)) usePlayerStore.getState().setAudioError(OFFLINE_MESSAGE);
  });

  // Al volver la red se retira el aviso, pero solo si sigue siendo este y no otro error posterior
  window.addEventListener('online', () => {
    if (usePlayerStore.getState().audioError === OFFLINE_MESSAGE) usePlayerStore.getState().setAudioError(null);
  });
}
