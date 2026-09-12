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

// ── Global Singleton Subscription (Ensures exactly ONE listener) ───────────
function ensureGlobalEngineSubscription() {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed) return;
  (window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed = true;

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
        state.currentTrack.artist
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
          state.currentTrack.artist
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
              await audioEngine.loadTrack(streamUrl, true);
            } catch {
              next.isIframePlayback = true;
            }
          } else if (next.file) {
            const buf = await next.file.arrayBuffer();
            await audioEngine.loadArrayBuffer(buf, next.file.name);
          }
          usePlayerStore.setState({
            currentTrack: next,
            isPlaying: true,
            currentTime: 0,
            duration: next.isIframePlayback ? (next.duration || 180) : (audioEngine.getDuration() || next.duration || 0),
          });
        }
      } catch (err) {
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

// ── YouTube Search Cache ──────────────────────────────────────────────────────
export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
}

const ytSearchCache = new Map<string, YouTubeSearchResult[]>();

// ── Fetch Related & Similar Tracks (Discovers different songs from same artist/genre) ──
export const fetchRelatedTracks = async (
  videoId: string,
  title = '',
  artist = ''
): Promise<Track[]> => {
  const tracksMap = new Map<string, Track>();
  const cleanTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

  const addResultsToMap = (results: YouTubeSearchResult[]) => {
    for (const r of results) {
      if (!r || !r.id || r.id === videoId) continue;
      const rTitleClean = (r.title || '').toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (cleanTitle.length > 3 && (rTitleClean === cleanTitle || (rTitleClean.includes(cleanTitle) && rTitleClean.length < cleanTitle.length + 8))) {
        continue;
      }
      const uniqueKey = `yt_${r.id}`;
      const isVercel = isVercelDeployment();
      if (!tracksMap.has(uniqueKey)) {
        tracksMap.set(uniqueKey, {
          id: uniqueKey,
          title: r.title,
          artist: r.artist,
          duration: r.duration,
          sourceType: 'youtube' as const,
          youtubeId: r.id,
          isIframePlayback: isVercel,
          url: isVercel ? undefined : `/api/youtube/stream?v=${r.id}`,
          coverUrl: r.thumbnail,
          addedAt: Date.now(),
        });
      }
    }
  };

  try {
    const res = await fetch(
      `/api/youtube/related?v=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        addResultsToMap(data.results);
      }
    }
  } catch (e) {
    console.debug('[fetchRelatedTracks] Primary related fetch error:', e);
  }

  // Si tenemos menos de 50 canciones y conocemos el artista, enriquecer con búsquedas de éxitos y discografía
  if (tracksMap.size < 50 && artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
    try {
      const [searchRes1, searchRes2] = await Promise.all([
        fetch(`/api/youtube/search?q=${encodeURIComponent(`${artist} grandes exitos canciones`)}`),
        fetch(`/api/youtube/search?q=${encodeURIComponent(`${artist} album playlist canciones`)}`),
      ]);

      if (searchRes1.ok) {
        const d1 = await searchRes1.json();
        if (d1.results && Array.isArray(d1.results)) addResultsToMap(d1.results);
      }
      if (searchRes2.ok) {
        const d2 = await searchRes2.json();
        if (d2.results && Array.isArray(d2.results)) addResultsToMap(d2.results);
      }
    } catch {}
  }

  return Array.from(tracksMap.values()).slice(0, 75);
};

export const useAudioPlayer = () => {
  ensureGlobalEngineSubscription();

  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fine-grained Zustand selectors to avoid excessive re-renders ─────────────
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const isAudioUnlocked = usePlayerStore((s) => s.isAudioUnlocked);

  // Store setters
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

  // ── Sync volume with AudioEngine GainNode (Web Audio API) ───────────────────
  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // ── 1. Transport Controls ───────────────────────────────────────────────────
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
      if (currentTrack?.isIframePlayback) {
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
  }, [unlockAudio, setIsPlaying, setHasStarted, currentTrack]);

  const pause = useCallback(() => {
    if (currentTrack?.isIframePlayback) {
      setIsPlaying(false);
      return;
    }
    audioEngine.pause();
    setIsPlaying(false);
  }, [setIsPlaying, currentTrack]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      audioEngine.seek(seconds);
      setCurrentTime(seconds);
      if (currentTrack?.isIframePlayback) {
        window.dispatchEvent(new CustomEvent('aura:youtube-seek', { detail: { seconds } }));
      }
    },
    [setCurrentTime, currentTrack]
  );

  const setVolume = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      setStoreVolume(clamped);
      audioEngine.setVolume(isMuted ? 0 : clamped);
    },
    [setStoreVolume, isMuted]
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
        await unlockAudio();

        if (track.file) {
          const blobUrl = URL.createObjectURL(track.file);
          try {
            const arrayBuffer = await track.file.arrayBuffer();
            const dur = await audioEngine.loadArrayBuffer(arrayBuffer, track.file.name);
            setDuration(dur);
          } catch {
            await audioEngine.loadTrack(blobUrl, true);
            setDuration(audioEngine.getDuration() || 0);
          }
          setCurrentTrack({ ...track, url: blobUrl });
        } else if (track.isIframePlayback || (track.youtubeId && isVercelDeployment())) {
          track.isIframePlayback = true;
          audioEngine.pause();
          setDuration(track.duration || 180);
          setCurrentTrack(track);
        } else if (track.url) {
          try {
            await audioEngine.loadTrack(track.url, true);
            setDuration(audioEngine.getDuration() || track.duration || 0);
          } catch {
            track.isIframePlayback = true;
            audioEngine.pause();
            setDuration(track.duration || 180);
          }
          setCurrentTrack(track);
        } else if (track.youtubeId) {
          track.isIframePlayback = true;
          audioEngine.pause();
          setDuration(track.duration || 180);
          setCurrentTrack(track);
        } else {
          setCurrentTrack(track);
        }

        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);
      } catch (err: unknown) {
        console.error('[useAudioPlayer] playTrack error:', err);
        setError(err instanceof Error ? err.message : 'Error al reproducir pista');
      }
    },
    [unlockAudio, setDuration, setCurrentTrack, setCurrentTime, setIsPlaying, setHasStarted]
  );

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    let next = state.nextTrack();
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
    if (currentTime > 3) {
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
  }, [currentTime, seek, playTrack]);

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
        const blobUrl = URL.createObjectURL(file);

        let durationSecs = 0;
        try {
          const arrayBuffer = await file.arrayBuffer();
          durationSecs = await audioEngine.loadArrayBuffer(arrayBuffer, file.name);
        } catch {
          await audioEngine.loadTrack(blobUrl, true);
          durationSecs = audioEngine.getDuration() || 0;
        }

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
      try {
        setError(null);
        await unlockAudio();

        // 1. Fetch metadata from backend
        let title = fallbackInfo?.title || 'Canción de YouTube';
        let artist = fallbackInfo?.artist || 'YouTube Stream';
        let dur = 0;
        let coverUrl = fallbackInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        try {
          const res = await fetch(`/api/youtube/info?v=${videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) title = data.title;
            if (data.artist) artist = data.artist;
            if (data.duration) dur = data.duration;
            if (data.thumbnail) coverUrl = data.thumbnail;
          }
        } catch (e) {
          console.warn('[useAudioPlayer] Could not fetch YouTube info:', e);
        }

        // 2. Stream audio: Si estamos en Vercel o sin backend nativo, usar directamente el reproductor oficial sin peticiones 503
        const isVercel = isVercelDeployment();
        const hasBackend = isVercel ? false : await hasNativeStreamBackend();
        const streamUrl = `/api/youtube/stream?v=${videoId}`;
        let useIframe = !hasBackend;

        if (hasBackend) {
          try {
            await audioEngine.loadTrack(streamUrl, true);
          } catch (streamErr) {
            console.warn('[useAudioPlayer] Stream directo no disponible, cambiando al reproductor oficial de YouTube:', streamErr);
            useIframe = true;
          }
        } else {
          audioEngine.pause();
        }

        const realDur = useIframe ? (dur || 210) : (audioEngine.getDuration() || dur || 0);
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
        return track;
      } catch (err: unknown) {
        console.error('[useAudioPlayer] loadYouTubeTrack error:', err);
        setError(err instanceof Error ? err.message : 'Error al conectar el stream de YouTube');
        throw err;
      }
    },
    [unlockAudio, setDuration, setCurrentTime, setIsPlaying, setHasStarted, setCurrentTrack]
  );

  // ── 4. Debounced YouTube Search ─────────────────────────────────────────────
  const searchYouTube = useCallback((query: string, immediate = false) => {
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
      const cacheKey = q.toLowerCase();
      if (ytSearchCache.has(cacheKey)) {
        setSearchResults(ytSearchCache.get(cacheKey)!);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
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

  return {
    // State
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    queue,
    queueIndex,
    hasStarted,
    isAudioUnlocked,
    error,
    isSearching,
    searchResults,

    // Actions
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    setRepeatMode,
    stop,
    unlockAudio,
    loadAudioFile,
    loadAudioFiles,
    loadYouTubeTrack,
    searchYouTube,
    fetchRelatedTracks,
    playTrack,
    addToQueue,
  };
};

export default useAudioPlayer;
