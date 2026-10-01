/**
 * Una sola pestaña de la app suena a la vez: si empiezas a reproducir en otra pestaña,
 * esta se pausa (como hacen YouTube o Spotify Web). Sin esto, dos pestañas abiertas se pisan.
 */
import { audioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import { isSpotifyActiveSource } from '../utils/spotifyRouting';
import type { Track } from '../types/audio';

const CHANNEL = 'aura-playback';

interface YieldState {
  isPlaying: boolean;
  isMicActive: boolean;
  isSpotifyConnected: boolean;
  currentTrack: Track | null;
}

/** ¿Esta pestaña debe ceder el audio cuando otra empieza a sonar? */
export function shouldYieldToOtherTab(s: YieldState): boolean {
  if (!s.isPlaying) return false; // ya está en pausa
  // El micrófono y la captura de sistema son una sesión de estudio deliberada: no se interrumpen
  if (s.isMicActive || s.currentTrack?.sourceType === 'mic' || s.currentTrack?.sourceType === 'system') return false;
  // Spotify suena en otro dispositivo; pausarlo desde aquí no libera nada de esta pestaña
  if (isSpotifyActiveSource(s)) return false;
  return true;
}

let installed = false;

export function installCrossTabPlayback(): void {
  if (installed || typeof BroadcastChannel === 'undefined') return;
  installed = true;

  const tabId = Math.random().toString(36).slice(2);
  const channel = new BroadcastChannel(CHANNEL);

  // Avisar a las demás pestañas cuando esta empieza a reproducir
  usePlayerStore.subscribe((state, prev) => {
    if (state.isPlaying && !prev.isPlaying) channel.postMessage({ type: 'playing', tabId });
  });

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; tabId?: string } | null;
    if (data?.type !== 'playing' || data.tabId === tabId) return;

    const state = usePlayerStore.getState();
    if (!shouldYieldToOtherTab(state)) return;

    // Las pistas por iframe (YouTube) las gobierna isPlaying; el resto, el motor de audio
    if (!state.currentTrack?.isIframePlayback) audioEngine.pause();
    usePlayerStore.getState().setIsPlaying(false);
  };
}
