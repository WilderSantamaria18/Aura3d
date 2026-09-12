/**
 * useAudioEngine
 *
 * This hook is the SINGLE entry point for all audio operations.
 * It routes ALL audio through the shared `audioEngine` singleton so that
 * the AudioEngine's Analyser node always receives live data – and therefore
 * `useVisualizer` (which also reads from the singleton) correctly drives the 3D sphere.
 *
 * Previous bug: this hook created its OWN AudioContext / AnalyserNode that had NO
 * connection to the singleton, meaning the visualizer's analyser was always silent.
 */
import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';
import { hasNativeStreamBackend, isVercelDeployment } from '../utils/backendCapabilities';
import type { RadioStation } from '../config/radioStations';

// ─── Stream label parser to extract Title & Artist from Tab/System Capture ──────
function parseStreamLabel(rawLabel?: string): { title: string; artist: string } {
  if (!rawLabel) return { title: 'Pestaña del Navegador', artist: 'Captura en Vivo' };

  let clean = rawLabel
    .replace(/^screen:\d+:\d+/i, '')
    .replace(/^window:\d+:\d+/i, '')
    .replace(/\s*-\s*YouTube\s*/gi, '')
    .replace(/\s*-\s*Spotify\s*/gi, '')
    .replace(/\s*-\s*SoundCloud\s*/gi, '')
    .replace(/YouTube\s*-\s*/gi, '')
    .replace(/Spotify\s*-\s*/gi, '')
    .replace(/\(Official (Music )?Video\)/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\[Official (Music )?Video\]/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .trim();

  if (!clean || clean.length < 2) {
    return { title: 'Pestaña de Audio', artist: 'Captura en Vivo' };
  }

  // Check if formatted as "Artist - Title"
  const parts = clean.split(/\s+[-–—|:]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return {
      title: title || clean,
      artist: artist || 'Captura en Vivo',
    };
  }

  return {
    title: clean,
    artist: 'Pestaña en Vivo',
  };
}

function ensureAudioEngineStoreSubscription() {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed) return;
  (window as unknown as { __aura_audio_subscribed?: boolean }).__aura_audio_subscribed = true;

  audioEngine.onTimeUpdate((currentTime, duration) => {
    usePlayerStore.setState({ currentTime, duration });
  });

  audioEngine.onStateChange((playing) => {
    usePlayerStore.setState((state) => ({
      isPlaying: playing,
      hasStarted: playing ? true : state.hasStarted,
      isAudioUnlocked: playing ? true : state.isAudioUnlocked,
    }));
  });

  audioEngine.onEnded(async () => {
    const state = usePlayerStore.getState();
    const next = state.nextTrack();
    if (!next) {
      usePlayerStore.setState({ isPlaying: false });
    } else if (next.url) {
      try {
        await audioEngine.loadTrack(next.url, true);
        usePlayerStore.setState({
          currentTrack: next,
          isPlaying: true,
          currentTime: 0,
          duration: audioEngine.getDuration() || next.duration || 0,
        });
      } catch (e) {
        console.error('[audioEngine] onEnded play next error:', e);
      }
    }
  });
}

export const useAudioEngine = () => {
  ensureAudioEngineStoreSubscription();

  const [error, setError] = useState<string | null>(null);

  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setAudioUnlocked = usePlayerStore((s) => s.setAudioUnlocked);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setIsMicActive = usePlayerStore((s) => s.setIsMicActive);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isMicActive = usePlayerStore((s) => s.isMicActive);

  const [isCapturing, setIsCapturing] = useState(false);

  // ─── Live timer for System / Mic capture duration ─────────────────────────
  useEffect(() => {
    let timer: number;
    if (isCapturing || isMicActive) {
      timer = window.setInterval(() => {
        const state = usePlayerStore.getState();
        state.setCurrentTime(state.currentTime + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCapturing, isMicActive]);

  // ─── Sync playerStore volume changes → audioEngine gain ───────────────────
  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // ─── 1. Capture system / tab audio ────────────────────────────────────────
  const startSystemCapture = useCallback(async () => {
    try {
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any,
        });
      } catch {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }

      stream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setError(
          'No se capturó audio. Asegúrate de marcar "Compartir audio del sistema" en el diálogo.'
        );
        return;
      }

      await audioEngine.enableSystemCapture(stream);
      setIsCapturing(true);

      // Extract Tab Name / Artist from track label
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const rawLabel = videoTrack?.label || audioTrack?.label || '';
      const { title, artist } = parseStreamLabel(rawLabel);

      // Build a track entry for Now Playing
      const track: Track = {
        id: 'sys_' + Date.now(),
        title,
        artist,
        duration: 0,
        sourceType: 'system' as any,
        addedAt: Date.now(),
      };
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);
      setHasStarted(true);
      setAudioUnlocked(true);
      setIsPlaying(true);

      // Auto-stop when user ends the share
      stream.getAudioTracks()[0].onended = () => {
        setIsCapturing(false);
        stopCapture();
      };
    } catch (err: unknown) {
      const isCancel =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (!isCancel) {
        setError(err instanceof Error ? err.message : 'Error al capturar audio del sistema');
        console.warn('[useAudioEngine] system capture error:', err);
      }
    }
  }, [setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setCurrentTime, setDuration]);

  // ─── 2. Microphone ────────────────────────────────────────────────────────
  const startMicrophoneCapture = useCallback(async () => {
    try {
      setError(null);
      await audioEngine.enableMicrophone();
      setIsMicActive(true);
      setIsPlaying(true);
      setHasStarted(true);
      setAudioUnlocked(true);

      const track: Track = {
        id: 'mic_' + Date.now(),
        title: 'Micrófono en vivo',
        artist: 'Entrada exterior',
        duration: 0,
        sourceType: 'mic',
        addedAt: Date.now(),
      };
      setCurrentTrack(track);
    } catch (err: unknown) {
      const isCancel =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (!isCancel) {
        setError(err instanceof Error ? err.message : 'Error al acceder al micrófono');
        console.warn('[useAudioEngine] mic error:', err);
      }
    }
  }, [setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setIsMicActive]);

  const toggleMicrophone = useCallback(async () => {
    if (isMicActive) {
      audioEngine.disableMicrophone();
      setIsMicActive(false);
    } else {
      await startMicrophoneCapture();
    }
  }, [isMicActive, startMicrophoneCapture, setIsMicActive]);

  // ─── 3. Load local file (MP3 / WAV / FLAC / OGG) ─────────────────────────
  //   Critical fix: use audioEngine.loadArrayBuffer() so the decoded audio
  //   routes through the SHARED analyser and drives the 3D visualizer.
  const loadAudioFile = useCallback(
    async (file: File) => {
      try {
        setError(null);
        await audioEngine.init();

        // Parse artist / title from filename "Artist - Title.mp3"
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const parts = nameWithoutExt.split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : 'Archivo local';
        const title = parts.length > 1 ? parts[1].trim() : nameWithoutExt.trim();

        let durationSecs = 0;
        const blobUrl = URL.createObjectURL(file);

        try {
          const arrayBuffer = await file.arrayBuffer();
          durationSecs = await audioEngine.loadArrayBuffer(arrayBuffer, file.name);
        } catch {
          // Fallback to HTMLMediaElement streaming (great for video/MP4 and streaming formats)
          await audioEngine.loadTrack(blobUrl, true);
          durationSecs = audioEngine.getDuration() || 0;
        }

        setDuration(durationSecs);
        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);
        setAudioUnlocked(true);

        const track: Track = {
          id: 'local_' + Date.now(),
          title,
          artist,
          duration: durationSecs,
          sourceType: 'local',
          url: blobUrl,
          addedAt: Date.now(),
        };
        setCurrentTrack(track);
      } catch (err: unknown) {
        console.error('[useAudioEngine] loadAudioFile error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar el archivo de audio');
      }
    },
    [setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setCurrentTime, setDuration]
  );

  const loadAudioFiles = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) return;
      // Ingest and play the first file immediately
      await loadAudioFile(files[0]);

      // If multiple files dropped, queue the rest
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          const file = files[i];
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const parts = nameWithoutExt.split(' - ');
          const artist = parts.length > 1 ? parts[0].trim() : 'Archivo local';
          const title = parts.length > 1 ? parts[1].trim() : nameWithoutExt.trim();
          const blobUrl = URL.createObjectURL(file);

          const queuedTrack: Track = {
            id: 'local_' + (Date.now() + i),
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

  // ─── 4. Playback controls ─────────────────────────────────────────────────
  const playTrack = useCallback(
    async (track: Track) => {
      try {
        setError(null);
        await audioEngine.init();

        if (track.file) {
          await loadAudioFile(track.file);
          return;
        }

        if (track.isIframePlayback || (track.youtubeId && isVercelDeployment())) {
          track.isIframePlayback = true;
          audioEngine.pause();
          setDuration(track.duration || 180);
          setCurrentTime(0);
          setCurrentTrack(track);
          setIsPlaying(true);
          setHasStarted(true);
          setAudioUnlocked(true);
        } else if (track.url) {
          try {
            await audioEngine.loadTrack(track.url, true);
            const dur = audioEngine.getDuration() || track.duration || 0;
            setDuration(dur);
            setCurrentTime(0);
            setCurrentTrack(track);
            setIsPlaying(true);
            setHasStarted(true);
            setAudioUnlocked(true);
          } catch {
            track.isIframePlayback = true;
            audioEngine.pause();
            setDuration(track.duration || 180);
            setCurrentTrack(track);
            setIsPlaying(true);
          }
        } else {
          setCurrentTrack(track);
          setIsPlaying(true);
        }
      } catch (err: unknown) {
        console.error('[useAudioEngine] playTrack error:', err);
        setError(err instanceof Error ? err.message : 'Error al reproducir pista');
      }
    },
    [loadAudioFile, setCurrentTrack, setDuration, setCurrentTime, setIsPlaying, setHasStarted, setAudioUnlocked]
  );

  const playRadioStation = useCallback(
    async (station: RadioStation) => {
      const track: Track = {
        id: station.id,
        title: station.name,
        artist: `${station.genre} • Live Stream`,
        duration: 0,
        sourceType: 'radio',
        url: station.streamUrl,
        addedAt: Date.now(),
      };
      await playTrack(track);
    },
    [playTrack]
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
    const state = usePlayerStore.getState();
    let prev = state.previousTrack();
    if (!prev && state.queue.length > 0) {
      prev = state.queue[state.queue.length - 1];
      usePlayerStore.setState({ queueIndex: state.queue.length - 1, currentTrack: prev });
    }
    if (prev) {
      await playTrack(prev);
    } else {
      audioEngine.seek(0);
      setCurrentTime(0);
    }
  }, [playTrack, setCurrentTime]);

  const togglePlayPause = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.currentTrack?.isIframePlayback) {
      setIsPlaying(!state.isPlaying);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.resume();
      setIsPlaying(true);
    }
  }, [isPlaying, setIsPlaying]);

  const seek = useCallback(
    (seconds: number) => {
      const state = usePlayerStore.getState();
      if (state.currentTrack?.isIframePlayback) {
        setCurrentTime(seconds);
        window.dispatchEvent(new CustomEvent('aura:youtube-seek', { detail: { seconds } }));
        return;
      }
      audioEngine.seek(seconds);
      setCurrentTime(seconds);
    },
    [setCurrentTime]
  );

  const stopCapture = useCallback(() => {
    audioEngine.stop();
    audioEngine.disableSystemCapture();
    audioEngine.disableMicrophone();
    setIsPlaying(false);
    setIsMicActive(false);
    setCurrentTime(0);
    setDuration(0);
  }, [setIsPlaying, setIsMicActive, setCurrentTime, setDuration]);

  const unlockAudio = useCallback(async () => {
    await audioEngine.init();
    if (audioEngine.audioContext?.state === 'suspended') {
      await audioEngine.audioContext.resume();
    }
  }, []);

  const loadYouTubeTrack = useCallback(
    async (videoId: string, fallbackInfo?: { title?: string; artist?: string }) => {
      try {
        setError(null);
        await unlockAudio();

        // 1. Fetch metadata from backend
        let title = fallbackInfo?.title || 'YouTube Audio';
        let artist = fallbackInfo?.artist || 'YouTube Stream';
        let duration = 0;
        let coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        try {
          const res = await fetch(`/api/youtube/info?v=${videoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) title = data.title;
            if (data.artist) artist = data.artist;
            if (data.duration) duration = data.duration;
            if (data.thumbnail) coverUrl = data.thumbnail;
          }
        } catch (e) {
          console.warn('[useAudioEngine] Could not fetch YouTube metadata:', e);
        }

        // 2. Stream audio: Si estamos en Vercel o sin backend nativo, usar reproductor oficial directamente
        const isVercel = isVercelDeployment();
        const hasBackend = isVercel ? false : await hasNativeStreamBackend();
        const streamUrl = `/api/youtube/stream?v=${videoId}`;
        let useIframe = !hasBackend;

        if (hasBackend) {
          try {
            await audioEngine.loadTrack(streamUrl, true);
          } catch {
            useIframe = true;
          }
        } else {
          audioEngine.pause();
        }

        const realDur = useIframe ? (duration || 210) : (audioEngine.getDuration() || duration || 0);
        setDuration(realDur);
        setCurrentTime(0);
        setIsPlaying(true);
        setHasStarted(true);
        setAudioUnlocked(true);

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
        console.error('[useAudioEngine] loadYouTubeTrack error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar el stream de YouTube');
        throw err;
      }
    },
    [unlockAudio, setDuration, setCurrentTime, setIsPlaying, setHasStarted, setAudioUnlocked, setCurrentTrack]
  );

  return {
    // State (read from playerStore for consistency)
    isCapturing: audioEngine.isSystemCaptureActive() || isCapturing,
    error,
    isMicActive,

    // Actions
    startSystemCapture,
    startMicrophoneCapture,
    toggleMicrophone,
    loadAudioFile,
    loadAudioFiles,
    loadFile: loadAudioFile,       // alias
    loadYouTubeTrack,
    playTrack,
    playRadioStation,
    playNext,
    playPrevious,
    togglePlayPause,
    seek,
    seekTo: seek,                  // alias
    stopCapture,
    unlockAudio,
  };
};
