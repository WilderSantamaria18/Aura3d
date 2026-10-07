/**
 * useAudioPlayer — Central Audio Player Hook (Single Source of Truth)
 *
 * Enforces:
 *  1. Exactly ONE AudioContext and ONE <audio> element via AudioEngine singleton.
 *  2. Strict Web Audio DSP routing: Element -> Source -> Analyser -> Gain -> Destination.
 *  3. Clean node disconnection and stream teardown on track change.
 *  4. No duplicate iframe audio: YouTube streaming happens strictly via Web Audio API.
 *  5. Direct synchronization with Zustand usePlayerStore.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';
import { hasNativeStreamBackend, isVercelDeployment } from '../utils/backendCapabilities';
import { StorageService } from '../services/storageService';
import type { RadioStation } from '../config/radioStations';
import {
  startSystemCapture as liveStartSystemCapture,
  startMicrophone as liveStartMicrophone,
  stopMicrophone as liveStopMicrophone,
} from '../services/liveInputs';
import {
  canPlaySavedTrackDirectly,
  createTrackFromYouTubeCandidate,
  replaceResolvedFavorite,
  resolveSavedTrackCandidate,
  invalidateCachedYouTubeCandidate,
} from '../utils/savedTrackPlayback';

import { ensureGlobalEngineSubscription } from '../services/playbackSubscription';
import { activeBlobUrl as activeBlobUrlRef } from '../services/playbackBlob';
import { fetchRelatedTracks, ytSearchCache, type YouTubeSearchResult } from '../services/youtubeDiscovery';
import { isAbort } from '../utils/isAbort';
import { STREAM_START_TIMEOUT_MS, fetchYouTubeInfo, startWithTimeout } from '../services/youtubeLoad';

// Se siguen exportando desde aquí para no romper a quien ya los importa de este hook
export { fetchRelatedTracks };
export type { YouTubeSearchResult };

function extractYouTubeId(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : undefined;
}

// Estado de la reproducción activa, compartido por TODAS las instancias del hook.
// Antes vivía en refs por instancia y se limpiaba al desmontar: desmontar cualquier componente
// que usara el hook revocaba el blob de la canción en curso y abortaba búsquedas ajenas.
const savedTrackRequestRef: { current: AbortController | null } = { current: null };

const setError = (message: string | null) => usePlayerStore.getState().setAudioError(message);

/** Cada carga de YouTube lleva un número: si llega otra mientras tanto, la anterior se descarta */
let youtubeLoadSeq = 0;

/** Duración mostrada hasta conocer la real (el reproductor de YouTube la corrige al arrancar) */
const FALLBACK_YOUTUBE_DURATION = 210;

/**
 * Arranca un stream propio con tiempo máximo. Si no empieza a sonar a tiempo se cancela la carga
 * pendiente (para que no suene a la vez que el reproductor de reserva) y se lanza un error: quien
 * llama usa entonces el reproductor oficial de YouTube en vez de dejar la interfaz esperando.
 */
const startStream = (url: string): Promise<void> =>
  startWithTimeout(() => audioEngine.loadTrack(url, true), STREAM_START_TIMEOUT_MS, () => audioEngine.releaseSources());

/**
 * Acciones de reproducción SIN suscribirse al estado del reproductor: el componente que lo usa
 * no se vuelve a renderizar cuando cambia la canción, la cola, el volumen, etc.
 * (Todo lo que necesita leer lo toma del store en el momento de actuar.)
 * Úsalo en componentes que solo disparan acciones (atajos, botones, landings).
 */
export const useAudioPlayerActions = () => {
  ensureGlobalEngineSubscription();

  // Error global (store): lo muestra App aunque la acción la haya lanzado otra pantalla
  const error = usePlayerStore((st) => st.audioError);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(() => audioEngine.isSystemCaptureActive());

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Error listener from native audio pipeline ──────────────────────────────
  useEffect(() => {
    const unsub = audioEngine.onError((msg) => {
      setError(msg);
      usePlayerStore.setState({ isPlaying: false });
    });
    return unsub;
  }, []);

  // ── Captura de sistema cerrada desde el motor → reset del flag local ───────
  useEffect(() => {
    return audioEngine.onCaptureEnd((kind) => {
      if (kind === 'system') setIsCapturing(false);
    });
  }, []);

  // Store setters (referencias estables: no provocan renders)
  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setStoreVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setAudioUnlocked = usePlayerStore((s) => s.setAudioUnlocked);
  const setPlaybackStatus = usePlayerStore((s) => s.setPlaybackStatus);

  // ── 1. Transport Controls ───────────────────────────────────────────────────
  // (El volumen se sincroniza con el motor una sola vez, en ensureGlobalEngineSubscription)
  const unlockAudio = useCallback(async () => {
    await audioEngine.init();
    if (audioEngine.audioContext?.state === 'suspended') {
      await audioEngine.audioContext.resume();
    }
    setAudioUnlocked(true);
  }, [setAudioUnlocked]);

  const play = useCallback(async () => {
    try {
      await unlockAudio();
      if (usePlayerStore.getState().currentTrack?.isIframePlayback) {
        setIsPlaying(true);
        setHasStarted(true);
        return;
      }
      await audioEngine.play();
      setIsPlaying(true);
      setHasStarted(true);
    } catch (err) {
      console.warn('[useAudioPlayer] play error:', err);
    }
  }, [unlockAudio, setIsPlaying, setHasStarted]);

  const pause = useCallback(() => {
    if (usePlayerStore.getState().currentTrack?.isIframePlayback) {
      setIsPlaying(false);
      return;
    }
    audioEngine.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const togglePlay = useCallback(async () => {
    if (usePlayerStore.getState().isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      audioEngine.seek(seconds);
      setCurrentTime(seconds);
      if (usePlayerStore.getState().currentTrack?.isIframePlayback) {
        window.dispatchEvent(new CustomEvent('aura:youtube-seek', { detail: { seconds } }));
      }
    },
    [setCurrentTime]
  );

  const setVolume = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      setStoreVolume(clamped);
      audioEngine.setVolume(usePlayerStore.getState().isMuted ? 0 : clamped);
    },
    [setStoreVolume]
  );

  const stop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [setIsPlaying, setCurrentTime]);

  const playTrack = useCallback(
    async (track: Track) => {
      try {
        setError(null);
        setPlaybackStatus('buffering', `Preparando ${track.title}…`);
        await unlockAudio();

        const state = usePlayerStore.getState();
        if (state.isPlaying && state.currentTrack && state.currentTrack.id !== track.id) {
          if (state.isHarmonicSyncActive) {
            void audioEngine.harmonicCrossfade(2.2);
          } else if (state.isCrossfadeActive) {
            void audioEngine.crossfade(state.crossfadeDuration || 1.8);
          }
        }

        const ytId =
          track.youtubeId ||
          (track.id?.startsWith('yt_') ? track.id.replace(/^yt_/, '') : undefined) ||
          (track.url ? extractYouTubeId(track.url) : undefined);

        const isYouTube =
          track.sourceType === 'youtube' ||
          Boolean(ytId) ||
          (typeof track.url === 'string' && (track.url.includes('youtube.com') || track.url.includes('youtu.be')));

        if (track.file) {
          if (activeBlobUrlRef.current) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(track.file);
          activeBlobUrlRef.current = blobUrl;
          setDuration(await audioEngine.loadFile(track.file, blobUrl));
          setCurrentTrack({ ...track, url: blobUrl });
        } else if (isYouTube) {
          if (activeBlobUrlRef.current) {
            URL.revokeObjectURL(activeBlobUrlRef.current);
            activeBlobUrlRef.current = null;
          }
          const isVercel = isVercelDeployment();
          const hasBackend = isVercel ? false : await hasNativeStreamBackend();
          const useIframe = !hasBackend || track.isIframePlayback || (Boolean(track.url) && track.url!.includes('youtube.com'));

          const cleanTrack: Track = {
            ...track,
            sourceType: 'youtube',
            youtubeId: ytId || track.youtubeId,
            isIframePlayback: useIframe,
            url: useIframe ? undefined : track.url,
            duration: track.duration || 210,
          };

          if (useIframe) {
            audioEngine.releaseSources();
            setDuration(cleanTrack.duration || 210);
            setCurrentTrack(cleanTrack);
          } else if (cleanTrack.url) {
            try {
              await startStream(cleanTrack.url);
              setDuration(audioEngine.getDuration() || cleanTrack.duration || 210);
              setCurrentTrack(cleanTrack);
            } catch (loadErr) {
              if (isAbort(loadErr)) return;
              cleanTrack.isIframePlayback = true;
              cleanTrack.url = undefined;
              audioEngine.releaseSources();
              setDuration(cleanTrack.duration || 210);
              setCurrentTrack(cleanTrack);
            }
          } else {
            cleanTrack.isIframePlayback = true;
            audioEngine.releaseSources();
            setDuration(cleanTrack.duration || 210);
            setCurrentTrack(cleanTrack);
          }
        } else if (track.url) {
          try {
            await audioEngine.loadTrack(track.url, true);
            setDuration(audioEngine.getDuration() || track.duration || 0);
            setCurrentTrack(track);
          } catch (loadErr) {
            if (isAbort(loadErr)) return;
            audioEngine.releaseSources();
            setCurrentTrack(track);
          }
        } else {
          setCurrentTrack(track);
        }

        // Sincronizar cola de reproducción automáticamente
        const currentQ = usePlayerStore.getState().queue;
        const qIdx = currentQ.findIndex(
          (t) => t.id === track.id || (Boolean(ytId) && (t.youtubeId === ytId || t.id === `yt_${ytId}`))
        );
        if (qIdx >= 0) {
          usePlayerStore.setState({ queueIndex: qIdx });
        } else if (currentQ.length > 0) {
          const curIndex = usePlayerStore.getState().queueIndex;
          const updatedQ = [...currentQ.slice(0, curIndex + 1), track, ...currentQ.slice(curIndex + 1)];
          usePlayerStore.setState({ queue: updatedQ, queueIndex: curIndex + 1 });
        } else {
          usePlayerStore.setState({ queue: [track], queueIndex: 0 });
        }

        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);
        const activeTrack = usePlayerStore.getState().currentTrack;
        setPlaybackStatus(
          activeTrack?.isIframePlayback ? 'buffering' : 'playing',
          activeTrack?.isIframePlayback
            ? `Conectando con YouTube: ${activeTrack.title}`
            : `Reproduciendo: ${activeTrack?.title || track.title}`
        );
      } catch (err: unknown) {
        if (isAbort(err)) return; // reemplazada por una fuente más nueva
        console.error('[useAudioPlayer] playTrack error:', err);
        const message = err instanceof Error ? err.message : 'Error al reproducir pista';
        setError(message);
        setIsPlaying(false);
        setPlaybackStatus('error', message);
        throw err;
      }
    },
    [unlockAudio, setDuration, setCurrentTrack, setCurrentTime, setIsPlaying, setHasStarted, setPlaybackStatus]
  );

  const playSavedTrack = useCallback(
    async (
      track: Track,
      options: { forceYouTubeSearch?: boolean; excludedIds?: string[] } = {}
    ): Promise<Track> => {
      savedTrackRequestRef.current?.abort();
      const controller = new AbortController();
      savedTrackRequestRef.current = controller;
      let didTimeout = false;
      let timeoutId: number | undefined;

      const queueFavoriteSequence = (playedTrack: Track) => {
        const state = usePlayerStore.getState();
        const favorites = state.favorites;
        const index = favorites.findIndex(
          (favorite) =>
            favorite.id === track.id ||
            favorite.id === playedTrack.id ||
            (Boolean(playedTrack.youtubeId) && favorite.youtubeId === playedTrack.youtubeId)
        );
        if (index < 0) return;
        const sequence = [...favorites.slice(index), ...favorites.slice(0, index)];
        const activeTrack = state.currentTrack || playedTrack;
        sequence[0] = activeTrack;
        usePlayerStore.setState({ queue: sequence, queueIndex: 0, currentTrack: activeTrack });
      };

      try {
        if (canPlaySavedTrackDirectly(track) && !options.forceYouTubeSearch) {
          await playTrack(track);
          if (savedTrackRequestRef.current !== controller) return track; // otra petición la reemplazó
          queueFavoriteSequence(track);
          return usePlayerStore.getState().currentTrack || track;
        }

        setError(null);
        setPlaybackStatus('resolving', `Buscando la mejor versión de ${track.title}…`);
        if (options.forceYouTubeSearch) invalidateCachedYouTubeCandidate(track);
        timeoutId = window.setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, 10000);
        const candidate = await resolveSavedTrackCandidate(track, {
          signal: controller.signal,
          excludedIds: options.excludedIds,
          forceRefresh: options.forceYouTubeSearch,
        });

        const resolvedTrack = createTrackFromYouTubeCandidate(candidate, track);
        await playTrack(resolvedTrack);
        if (savedTrackRequestRef.current !== controller) return resolvedTrack;
        setPlaybackStatus(
          usePlayerStore.getState().currentTrack?.isIframePlayback ? 'buffering' : 'playing',
          `Versión encontrada en YouTube: ${resolvedTrack.title}`
        );

        const currentFavorites = usePlayerStore.getState().favorites;
        const wasFavorite = currentFavorites.some(
          (favorite) =>
            favorite.id === track.id ||
            (Boolean(track.youtubeId) && favorite.youtubeId === track.youtubeId)
        );
        if (wasFavorite) {
          const updatedFavorites = replaceResolvedFavorite(currentFavorites, track, resolvedTrack);
          StorageService.saveFavorites(updatedFavorites);
          usePlayerStore.setState({ favorites: updatedFavorites });
        }
        queueFavoriteSequence(resolvedTrack);

        return resolvedTrack;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (didTimeout) {
            const message = 'La búsqueda tardó demasiado. Comprueba tu conexión e inténtalo otra vez.';
            setError(message);
            setPlaybackStatus('error', message);
          } else if (savedTrackRequestRef.current === controller) {
            setPlaybackStatus('idle', null);
          }
          throw err;
        }
        const message = err instanceof Error ? err.message : 'No se pudo buscar esta canción en YouTube.';
        setError(message);
        setPlaybackStatus('error', message);
        throw err;
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        if (savedTrackRequestRef.current === controller) savedTrackRequestRef.current = null;
      }
    },
    [playTrack, setPlaybackStatus]
  );

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.isHarmonicSyncActive) {
      audioEngine.harmonicCrossfade(2.5);
    } else if (state.isCrossfadeActive) {
      audioEngine.crossfade(state.crossfadeDuration || 2);
    }

    let next = state.nextTrack();

    // Auto Infinite Radio: if queue is ending, auto-fetch recommendations
    if (!next || state.queueIndex >= state.queue.length - 2) {
      const current = state.currentTrack;
      if (current) {
        fetchRelatedTracks(
          current.youtubeId || current.id,
          current.title,
          current.artist,
          current.duration
        )
          .then((newTracks) => {
            if (newTracks && newTracks.length > 0) {
              const currentQ = usePlayerStore.getState().queue;
              const existingIds = new Set(currentQ.map((t) => t.id || t.youtubeId));
              const fresh = newTracks.filter((t) => !existingIds.has(t.id) && !existingIds.has(t.youtubeId));
              if (fresh.length > 0) {
                usePlayerStore.setState({
                  queue: [...currentQ, ...fresh],
                });
              }
            }
          })
          .catch((err) => console.warn('[playNext] Infinite radio fetch failed', err));
      }
    }

    if (!next && state.queue.length > 0) {
      next = state.queue[0];
      usePlayerStore.setState({ queueIndex: 0, currentTrack: next });
    }
    if (next) {
      await playTrack(next);
    } else if (state.currentTrack) {
      await playTrack(state.currentTrack);
    }
  }, [playTrack]);

  const playPrevious = useCallback(async () => {
    // If more than 3 seconds in, restart current track
    // Se lee al momento: suscribirse a currentTime re-renderizaba a todos los consumidores cada 250 ms
    if (usePlayerStore.getState().currentTime > 3) {
      seek(0);
      return;
    }
    const state = usePlayerStore.getState();
    let prev = state.previousTrack();
    if (!prev && state.queue.length > 0) {
      prev = state.queue[state.queue.length - 1];
      usePlayerStore.setState({ queueIndex: state.queue.length - 1, currentTrack: prev });
    }
    if (prev) {
      await playTrack(prev);
    } else {
      seek(0);
    }
  }, [seek, playTrack]);

  // ── 2. Local File Ingestion ─────────────────────────────────────────────────
  const loadAudioFile = useCallback(
    async (file: File) => {
      try {
        setError(null);
        await unlockAudio();

        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const parts = nameWithoutExt.split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : 'Archivo local';
        const title = parts.length > 1 ? parts[1].trim() : nameWithoutExt.trim();
        
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(file);
        activeBlobUrlRef.current = blobUrl;

        const durationSecs = await audioEngine.loadFile(file, blobUrl);

        setDuration(durationSecs);
        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);

        const track: Track = {
          id: `local_${Date.now()}_${file.size}`,
          title,
          artist,
          duration: durationSecs,
          sourceType: 'local',
          url: blobUrl,
          file,
          addedAt: Date.now(),
        };
        setCurrentTrack(track);
        return track;
      } catch (err: unknown) {
        if (isAbort(err)) throw err; // reemplazada por otra fuente: sin mensaje de error
        console.error('[useAudioPlayer] loadAudioFile error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar archivo local');
        throw err;
      }
    },
    [unlockAudio, setDuration, setCurrentTime, setIsPlaying, setHasStarted, setCurrentTrack]
  );

  const loadAudioFiles = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) return;
      await loadAudioFile(files[0]);

      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          const file = files[i];
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const parts = nameWithoutExt.split(' - ');
          const artist = parts.length > 1 ? parts[0].trim() : 'Archivo local';
          const title = parts.length > 1 ? parts[1].trim() : nameWithoutExt.trim();
          const blobUrl = URL.createObjectURL(file);

          const queuedTrack: Track = {
            id: `local_${Date.now()}_${i}`,
            title,
            artist,
            duration: 0,
            sourceType: 'local',
            url: blobUrl,
            file,
            addedAt: Date.now() + i,
          };
          addToQueue(queuedTrack);
        }
      }
    },
    [loadAudioFile, addToQueue]
  );

  // ── 3. YouTube Stream Loading (Single Web Audio API routing) ─────────────────
  const loadYouTubeTrack = useCallback(
    async (videoId: string, fallbackInfo?: { title?: string; artist?: string; thumbnail?: string }) => {
      const seq = ++youtubeLoadSeq;
      try {
        setError(null);
        setPlaybackStatus('buffering', 'Conectando con YouTube…');
        await unlockAudio();

        // La canción se muestra YA con lo que se conoce (el resultado de la búsqueda trae título,
        // artista y portada). Los metadatos del servidor son un extra: se piden en segundo plano más
        // abajo. Antes se esperaban sin límite de tiempo (7 s medidos) y la interfaz se quedaba cargando.
        const title = fallbackInfo?.title || 'Canción de YouTube';
        const artist = fallbackInfo?.artist || 'YouTube Stream';
        const coverUrl = fallbackInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // Si estamos en Vercel o sin backend nativo, se usa directamente el reproductor oficial
        const isVercel = isVercelDeployment();
        const hasBackend = isVercel ? false : await hasNativeStreamBackend();
        const streamUrl = `/api/youtube/stream?v=${videoId}`;
        let useIframe = !hasBackend;

        if (hasBackend) {
          try {
            await startStream(streamUrl);
          } catch (streamErr) {
            if (isAbort(streamErr)) throw streamErr;
            console.warn('[useAudioPlayer] Stream directo no disponible, cambiando al reproductor oficial de YouTube:', streamErr);
            useIframe = true;
          }
        } else {
          audioEngine.releaseSources();
        }

        if (useIframe && hasBackend) audioEngine.releaseSources();

        // Se pidió otra canción mientras esta cargaba: esta ya no corresponde, no debe pisar a la nueva
        if (seq !== youtubeLoadSeq) throw new DOMException('Carga reemplazada por otra canción', 'AbortError');

        const realDur = useIframe ? FALLBACK_YOUTUBE_DURATION : audioEngine.getDuration() || FALLBACK_YOUTUBE_DURATION;
        setDuration(realDur);
        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);

        const track: Track = {
          id: `yt_${videoId}`,
          title,
          artist,
          duration: realDur,
          sourceType: 'youtube',
          youtubeId: videoId,
          isIframePlayback: useIframe,
          url: useIframe ? undefined : streamUrl,
          coverUrl,
          addedAt: Date.now(),
        };

        setCurrentTrack(track);
        setPlaybackStatus(
          useIframe ? 'buffering' : 'playing',
          useIframe ? `Conectando con YouTube: ${track.title}` : `Reproduciendo: ${track.title}`
        );

        // Metadatos en segundo plano: se aplican solo si la canción sigue siendo esta
        void fetchYouTubeInfo(videoId).then((info) => {
          if (!info || seq !== youtubeLoadSeq) return;
          const state = usePlayerStore.getState();
          const current = state.currentTrack;
          if (!current || current.id !== track.id) return;
          const patch: Partial<Track> = {};
          if (info.title) patch.title = info.title;
          if (info.artist) patch.artist = info.artist;
          if (info.duration && info.duration > 0) patch.duration = info.duration;
          if (Object.keys(patch).length === 0) return;
          usePlayerStore.setState({ currentTrack: { ...current, ...patch } });
          // Mientras el reproductor de YouTube no informe de la duración real, se usa la del servidor
          if (patch.duration && current.isIframePlayback && state.duration === FALLBACK_YOUTUBE_DURATION) {
            usePlayerStore.setState({ duration: patch.duration });
          }
        });

        return track;
      } catch (err: unknown) {
        if (isAbort(err)) throw err;
        console.error('[useAudioPlayer] loadYouTubeTrack error:', err);
        const message = err instanceof Error ? err.message : 'Error al conectar el stream de YouTube';
        setError(message);
        setPlaybackStatus('error', message);
        throw err;
      }
    },
    [unlockAudio, setDuration, setCurrentTime, setIsPlaying, setHasStarted, setCurrentTrack, setPlaybackStatus]
  );

  // ── 4. Debounced YouTube Search ─────────────────────────────────────────────
  const searchYouTube = useCallback((query: string, immediate = false, type: 'video' | 'playlist' = 'video') => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const executeSearch = async () => {
      const cacheKey = `${type}_${q.toLowerCase()}`;
      if (ytSearchCache.has(cacheKey)) {
        setSearchResults(ytSearchCache.get(cacheKey)!);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&type=${type}`);
        if (res.ok) {
          const data = await res.json();
          const items: YouTubeSearchResult[] = data.results || [];
          ytSearchCache.set(cacheKey, items);
          setSearchResults(items);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('[useAudioPlayer] YouTube search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    if (immediate) {
      executeSearch();
    } else {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(executeSearch, 300);
    }
  }, []);

  const loadYouTubePlaylist = useCallback(
    async (playlistId: string, fallbackTitle?: string, fallbackArtist?: string) => {
      try {
        setIsSearching(true);
        setError(null);
        const res = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
        if (res.ok) {
          const data = await res.json();
          const rawTracks = data.tracks || [];
          if (rawTracks.length > 0) {
            const artistName = fallbackArtist || data.artist || 'Artista';
            const albumName = fallbackTitle || data.title || 'Colección de Canciones';

            const formattedTracks: Track[] = rawTracks.map((t: any, idx: number) => {
              const vid = t.youtubeId || (t.id ? t.id.replace(/^yt_/, '') : '');
              return {
                id: `yt_${vid || idx}_${Date.now()}_${idx}`,
                title: t.title || `Pista ${idx + 1}`,
                artist: t.artist && t.artist !== 'Artista de YouTube' ? t.artist : artistName,
                album: albumName,
                duration: t.duration || 210,
                sourceType: 'youtube' as const,
                youtubeId: vid,
                thumbnail: t.thumbnail || t.coverUrl || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
                coverUrl: t.coverUrl || t.thumbnail || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
                isIframePlayback: true,
                addedAt: Date.now() + idx,
              };
            });

            // 1. Establecer la colección entera del artista en la cola ordenada de inicio a fin (en fila o cola)
            usePlayerStore.getState().setQueue(formattedTracks, 0);

            // 2. Iniciar la reproducción desde el primer tema de la lista
            await playTrack(formattedTracks[0]);
          } else {
            console.warn('[useAudioPlayer] La playlist no devolvió canciones disponibles');
          }
        }
      } catch (e) {
        console.warn('Error loading playlist:', e);
      } finally {
        setIsSearching(false);
      }
    },
    [playTrack]
  );

  // ── 5. Radio y entradas en vivo (mic / sistema) ─────────────────────────────
  const playRadioStation = useCallback(
    async (station: RadioStation) => {
      await playTrack({
        id: station.id,
        title: station.name,
        artist: `${station.genre} • Live Stream`,
        duration: 0,
        sourceType: 'radio',
        url: station.streamUrl,
        addedAt: Date.now(),
      });
    },
    [playTrack]
  );

  const startSystemCapture = useCallback(async () => {
    setError(null);
    const result = await liveStartSystemCapture();
    if (result.ok) {
      setIsCapturing(true);
    } else if (!result.cancelled) {
      setError(result.error);
    }
  }, []);

  const startMicrophoneCapture = useCallback(async () => {
    setError(null);
    const result = await liveStartMicrophone();
    if (!result.ok && !result.cancelled) setError(result.error);
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (usePlayerStore.getState().isMicActive) {
      liveStopMicrophone();
    } else {
      await startMicrophoneCapture();
    }
  }, [startMicrophoneCapture]);

  /** Detiene todo: reproducción, micrófono y captura de sistema */
  const stopCapture = useCallback(() => {
    audioEngine.stop();
    audioEngine.disableSystemCapture();
    audioEngine.disableMicrophone();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [setIsPlaying, setCurrentTime, setDuration]);

  return {
    error,
    isSearching,
    searchResults,
    isCapturing: isCapturing || audioEngine.isSystemCaptureActive(),

    // Actions
    play,
    pause,
    togglePlay,
    togglePlayPause: togglePlay, // alias
    seek,
    seekTo: seek, // alias
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    setRepeatMode,
    stop,
    stopCapture,
    unlockAudio,
    loadAudioFile,
    loadAudioFiles,
    loadFile: loadAudioFile, // alias
    loadYouTubeTrack,
    searchYouTube,
    loadYouTubePlaylist,
    fetchRelatedTracks,
    playTrack,
    playSavedTrack,
    playRadioStation,
    startSystemCapture,
    startMicrophoneCapture,
    toggleMicrophone,
    addToQueue,
  };
};

/**
 * Acciones + estado del reproductor. Se suscribe a varias partes del store: úsalo solo en
 * componentes que muestran ese estado; para el resto, `useAudioPlayerActions`.
 */
export const useAudioPlayer = () => {
  const actions = useAudioPlayerActions();

  // ── Fine-grained Zustand selectors to avoid excessive re-renders ─────────────
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const isAudioUnlocked = usePlayerStore((s) => s.isAudioUnlocked);
  const isMicActive = usePlayerStore((s) => s.isMicActive);

  return {
    currentTrack,
    isPlaying,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    queue,
    queueIndex,
    hasStarted,
    isAudioUnlocked,
    isMicActive,
    ...actions,
  };
};

export default useAudioPlayer;
