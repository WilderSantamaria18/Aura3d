/**
 * Suscripción global del motor de audio al store del reproductor.
 * Se registra UNA sola vez por aplicación, se use el hook que se use.
 */
import { audioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import { fetchRelatedTracks } from './youtubeDiscovery';
import { isAbort } from '../utils/isAbort';
import { STREAM_START_TIMEOUT_MS, startWithTimeout } from './youtubeLoad';
import { activeBlobUrl as activeBlobUrlRef } from './playbackBlob';
import { installCrossTabPlayback } from './crossTabPlayback';
import { installConnectivityNotice } from './connectivityNotice';

// ── Global Singleton Subscription (Ensures exactly ONE listener) ───────────
export function ensureGlobalEngineSubscription() {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed) return;
  (window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed = true;

  installCrossTabPlayback();
  installConnectivityNotice();

  // Volumen: una sola suscripción global (antes cada instancia del hook tenía su propio efecto)
  const applyVolume = () => {
    const { volume, isMuted } = usePlayerStore.getState();
    audioEngine.setVolume(isMuted ? 0 : volume);
  };
  applyVolume();
  usePlayerStore.subscribe((state, prev) => {
    if (state.volume !== prev.volume || state.isMuted !== prev.isMuted) applyVolume();
  });

  // Cronómetro de las entradas en vivo (mic / sistema): no tienen duración que reportar.
  // Un único temporizador global; con uno por instancia del hook el tiempo avanzaba doble.
  window.setInterval(() => {
    if (usePlayerStore.getState().isMicActive || audioEngine.isSystemCaptureActive()) {
      const s = usePlayerStore.getState();
      s.setCurrentTime(s.currentTime + 1);
    }
  }, 1000);

  audioEngine.onTimeUpdate((currentTime, duration) => {
    usePlayerStore.setState({
      currentTime,
      duration: duration || usePlayerStore.getState().duration || 0,
    });
  });

  audioEngine.onStateChange((isPlaying) => {
    usePlayerStore.setState((state) => ({
      isPlaying,
      hasStarted: isPlaying ? true : state.hasStarted,
      isAudioUnlocked: isPlaying ? true : state.isAudioUnlocked,
      playbackStatus:
        isPlaying
          ? 'playing'
          : state.playbackStatus === 'error' || state.playbackStatus === 'resolving'
            ? state.playbackStatus
            : 'idle',
    }));
  });

  audioEngine.onEnded(async () => {
    const state = usePlayerStore.getState();

    // 1. Repeat ONE: replay current track from start
    if (state.repeatMode === 'one' && state.currentTrack) {
      audioEngine.seek(0);
      await audioEngine.play();
      usePlayerStore.setState({ isPlaying: true, currentTime: 0 });
      return;
    }

    // 2. Queue navigation: advance to next song in queue
    let next = state.nextTrack();

    // 1. Auto-alimentación continua de cola infinita: si quedan menos de 10 canciones por delante, pre-cargar 50+ más
    const upcomingCount = state.queue.length - (state.queueIndex + 1);
    if (upcomingCount < 10 && state.currentTrack?.youtubeId) {
      fetchRelatedTracks(
        state.currentTrack.youtubeId,
        state.currentTrack.title,
        state.currentTrack.artist,
        state.currentTrack.duration
      )
        .then((more) => {
          if (more && more.length > 0) {
            const currentQ = usePlayerStore.getState().queue;
            const existingIds = new Set(currentQ.map((t) => t.id || t.youtubeId));
            const fresh = more.filter((t) => !existingIds.has(t.id || t.youtubeId));
            if (fresh.length > 0) {
              usePlayerStore.setState({ queue: [...currentQ, ...fresh] });
            }
          }
        })
        .catch(() => {});
    }

    // 2. Si la cola llegó al final y no hay siguiente, buscar 50+ canciones similares de inmediato y continuar reproduciendo
    if (!next && state.currentTrack && state.currentTrack.youtubeId) {
      try {
        const related = await fetchRelatedTracks(
          state.currentTrack.youtubeId,
          state.currentTrack.title,
          state.currentTrack.artist,
          state.currentTrack.duration
        );
        if (related && related.length > 0) {
          const currentQ = state.queue;
          const existingIds = new Set(currentQ.map((t) => t.id || t.youtubeId));
          const fresh = related.filter((t) => !existingIds.has(t.id || t.youtubeId));
          const toAdd = fresh.length > 0 ? fresh : related;
          const nextTrackItem = toAdd[0];
          const newQueue = [...currentQ, ...toAdd];
          usePlayerStore.setState({
            queue: newQueue,
            queueIndex: currentQ.length,
            currentTrack: nextTrackItem,
          });
          next = nextTrackItem;
        }
      } catch (err) {
        console.warn('[useAudioPlayer] Autoplay infinite queue replenishment error:', err);
      }
    }

    if (!next && state.queue.length > 0) {
      // Loop back to the start of the playlist
      const first = state.queue[0];
      usePlayerStore.setState({ queueIndex: 0, currentTrack: first });
      next = first;
    }

    if (next) {
      try {
        if (next.isIframePlayback || (!next.url && next.youtubeId)) {
          next.isIframePlayback = true;
          usePlayerStore.setState({
            currentTrack: next,
            isPlaying: true,
            currentTime: 0,
            duration: next.duration || 180,
          });
        } else {
          const streamUrl =
            next.url || (next.youtubeId ? `/api/youtube/stream?v=${next.youtubeId}` : '');
          if (streamUrl) {
            try {
              await startWithTimeout(() => audioEngine.loadTrack(streamUrl, true), STREAM_START_TIMEOUT_MS, () =>
                audioEngine.releaseSources()
              );
            } catch (loadErr) {
              if (isAbort(loadErr)) return;
              next.isIframePlayback = true;
            }
          } else if (next.file) {
            if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
            activeBlobUrlRef.current = URL.createObjectURL(next.file);
            await audioEngine.loadFile(next.file, activeBlobUrlRef.current);
          }
          usePlayerStore.setState({
            currentTrack: next,
            isPlaying: true,
            currentTime: 0,
            duration: next.isIframePlayback ? (next.duration || 180) : (audioEngine.getDuration() || next.duration || 0),
          });
        }
      } catch (err) {
        if (isAbort(err)) return;
        console.error('[useAudioPlayer] onEnded next track error:', err);
      }
    } else if (state.currentTrack) {
      // Replay current track from beginning if queue only had 1 song
      audioEngine.seek(0);
      await audioEngine.play();
      usePlayerStore.setState({ isPlaying: true, currentTime: 0 });
    }
  });
}
