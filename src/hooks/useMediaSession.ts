import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useAudioPlayerActions } from './useAudioPlayer';
import { useSpotifyPlayer } from './useSpotifyPlayer';
import { isSpotifyActiveSource } from '../utils/spotifyRouting';
import { mediaSessionInfo, mediaSessionKey, mediaSessionPosition } from '../utils/mediaSessionMeta';

const SEEK_STEP_S = 10;

/**
 * Integra el reproductor con el sistema operativo (Media Session API): teclas multimedia,
 * auriculares Bluetooth, pantalla de bloqueo y centro de medios del navegador.
 * No se suscribe al estado con selectores: no provoca renders.
 */
export const useMediaSession = () => {
  const actions = useAudioPlayerActions();
  const spotify = useSpotifyPlayer();

  // Los manejadores se registran una vez y leen siempre las acciones vigentes desde el ref
  const live = useRef({ actions, spotify });
  useEffect(() => {
    live.current = { actions, spotify };
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    const route = () => {
      const { actions: a, spotify: sp } = live.current;
      return isSpotifyActiveSource(usePlayerStore.getState()) ? { sp, a: null } : { sp: null, a };
    };

    const seekTo = (seconds: number) => {
      const { sp, a } = route();
      if (sp) void sp.seek(Math.round(seconds * 1000));
      else a?.seek(seconds);
    };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { const { sp, a } = route(); if (sp) void sp.play(); else void a?.play(); }],
      ['pause', () => { const { sp, a } = route(); if (sp) void sp.pause(); else a?.pause(); }],
      ['stop', () => { const { sp, a } = route(); if (sp) void sp.pause(); else a?.pause(); }],
      ['nexttrack', () => { const { sp, a } = route(); if (sp) void sp.next(); else void a?.playNext(); }],
      ['previoustrack', () => { const { sp, a } = route(); if (sp) void sp.previous(); else void a?.playPrevious(); }],
      ['seekto', (d) => { if (typeof d.seekTime === 'number') seekTo(d.seekTime); }],
      ['seekforward', (d) => seekTo(usePlayerStore.getState().currentTime + (d.seekOffset ?? SEEK_STEP_S))],
      ['seekbackward', (d) => seekTo(Math.max(0, usePlayerStore.getState().currentTime - (d.seekOffset ?? SEEK_STEP_S)))],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* acción no soportada por este navegador */
      }
    }

    let lastKey = '';
    let lastPositionAt = 0;

    const apply = () => {
      const { currentTrack, isPlaying, currentTime, duration } = usePlayerStore.getState();

      const key = mediaSessionKey(currentTrack);
      if (key !== lastKey) {
        lastKey = key;
        const info = mediaSessionInfo(currentTrack);
        try {
          ms.metadata = info ? new MediaMetadata(info) : null;
        } catch {
          /* MediaMetadata rechazó la portada: se deja sin metadatos antes que romper */
        }
      }

      ms.playbackState = !currentTrack ? 'none' : isPlaying ? 'playing' : 'paused';

      // La posición se refresca como mucho una vez por segundo
      const now = performance.now();
      if (now - lastPositionAt >= 1000) {
        lastPositionAt = now;
        const pos = mediaSessionPosition(duration || currentTrack?.duration || 0, currentTime);
        if (pos) {
          try {
            ms.setPositionState(pos);
          } catch {
            /* valores fuera de rango durante un cambio de pista */
          }
        }
      }
    };

    apply();
    const unsubscribe = usePlayerStore.subscribe((state, prev) => {
      // El store cambia decenas de veces por segundo (bpm, pulso, intensidad…): solo importan estos campos
      if (
        state.currentTrack === prev.currentTrack &&
        state.isPlaying === prev.isPlaying &&
        state.currentTime === prev.currentTime &&
        state.duration === prev.duration
      ) {
        return;
      }
      apply();
    });

    return () => {
      unsubscribe();
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignorar */
        }
      }
      ms.metadata = null;
      ms.playbackState = 'none';
    };
  }, []);
};
