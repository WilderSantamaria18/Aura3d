import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '../stores/playerStore';

const SERVER_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname || 'localhost'}:4000`
    : 'http://localhost:4000';

let guestTokenPromise: Promise<string> | null = null;
let hasCheckedInitialStatus = false;
let isCheckingInitialStatus = false;

/**
 * Helper to get or acquire an authenticated JWT token from the server
 */
async function getAuthToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    localStorage.removeItem('auralis_jwt_token');
    guestTokenPromise = null;
  }
  const token =
    localStorage.getItem('auralis_jwt_token') ||
    localStorage.getItem('auralis_admin_jwt_token');

  if (token && !forceRefresh) return token;
  if (guestTokenPromise) return guestTokenPromise;

  // Request an instant guest session token with in-flight deduplication
  guestTokenPromise = (async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/session`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('auralis_jwt_token', data.token);
          return data.token;
        }
      }
    } catch {
      console.warn(
        `[useSpotifyPlayer] Servidor backend no disponible en ${SERVER_URL}. Inícialo con "npm run server".`
      );
    } finally {
      guestTokenPromise = null;
    }
    return '';
  })();

  return guestTokenPromise;
}

// Module-level singleton polling state (shared across all components)
let isPollingInFlight = false;
let sharedPollTimer: ReturnType<typeof setInterval> | null = null;
let lastPollTimestamp = 0;

/**
 * useSpotifyPlayer
 * Hook principal para la integración de Spotify:
 * - Inicia el flujo OAuth 2.0 PKCE en el backend
 * - Detección y sondeo en tiempo real cada 2s
 * - Control de transporte (Play, Pause, Next, Previous, Seek)
 * - Zero-token: Ningún token de Spotify se almacena en el cliente
 */
export const useSpotifyPlayer = () => {
  const {
    isSpotifyConnected,
    setSpotifyConnected,
    updateFromSpotify,
    isPlaying,
  } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevUriRef = useRef<string>('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Helper for authenticated requests to Spotify endpoints
   */
  const spotifyFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      let token = await getAuthToken();
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      let res = await fetch(`${SERVER_URL}/api/spotify${endpoint}`, {
        ...options,
        headers,
      });

      // If 401 (token expired or invalidated by server restart), refresh guest token and retry once
      if (res.status === 401 && endpoint !== '/disconnect') {
        token = await getAuthToken(true);
        if (token) {
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${token}`);
          res = await fetch(`${SERVER_URL}/api/spotify${endpoint}`, {
            ...options,
            headers: retryHeaders,
          });
        }
      }

      return res;
    },
    []
  );

  /**
   * Start Spotify OAuth 2.0 PKCE Authorization flow
   */
  const connectSpotify = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await spotifyFetch('/auth', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const rawMsg = errData.error || '';
        if (rawMsg.includes('SPOTIFY_CLIENT_ID')) {
          alert('Configuración de Spotify requerida:\n\nPara vincular tu cuenta de Spotify, define SPOTIFY_CLIENT_ID en el archivo .env de tu servidor (o usa YouTube para reproducción directa sin credenciales).');
          setIsLoading(false);
          return;
        }
        throw new Error(rawMsg || `Error del servidor HTTP ${res.status}`);
      }

      const { authUrl, state } = await res.json();
      if (state) {
        sessionStorage.setItem('spotify_auth_state', state);
      }
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        alert('El servidor no devolvió una URL de autenticación válida para Spotify.');
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Error al conectar con Spotify';
      if (msg === 'Failed to fetch') {
        msg = `El servidor backend no está encendido en ${SERVER_URL}. Inícialo con: npm run server`;
      }
      console.error('[Spotify Connect]', err);
      setError(msg);
      setIsLoading(false);
      alert(`No se pudo conectar con Spotify:\n\n${msg}`);
    }
  }, [spotifyFetch]);

  /**
   * Disconnect Spotify session on server
   */
  const disconnectSpotify = useCallback(async () => {
    setIsLoading(true);
    try {
      await spotifyFetch('/disconnect', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    } finally {
      setSpotifyConnected(false);
      setIsLoading(false);
    }
  }, [spotifyFetch, setSpotifyConnected]);

  /**
   * Poll currently playing track from Spotify (singleton in-flight protected)
   */
  const pollCurrentTrack = useCallback(async () => {
    if (!isSpotifyConnected || isPollingInFlight) return;
    const now = Date.now();
    if (now - lastPollTimestamp < 1800) return; // Strict throttle
    lastPollTimestamp = now;
    isPollingInFlight = true;

    try {
      const res = await spotifyFetch('/current');

      if (res.status === 401) {
        // Session expired or revoked
        setSpotifyConnected(false);
        return;
      }

      if (res.status === 204) {
        // No content playing currently; keep previous track metadata
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (!data || !data.spotifyUri) return;

        prevUriRef.current = data.spotifyUri;

        updateFromSpotify({
          title: data.title,
          artist: data.artist || data.artists,
          album: typeof data.album === 'string' ? data.album : data.album?.name || '',
          duration: data.duration,
          coverUrl: data.coverUrl || '',
          spotifyUri: data.spotifyUri,
          currentTime: Math.round((data.progressMs || data.progress_ms || 0) / 1000),
          isPlaying: !!(data.isPlaying ?? data.is_playing),
          progressMs: data.progressMs || data.progress_ms || 0,
          tempo: data.tempo || data.bpm,
          bpm: data.bpm || data.tempo,
          energy: data.energy,
          danceability: data.danceability,
        });
      }
    } catch (err) {
      console.debug('[Spotify Polling]', err);
    } finally {
      isPollingInFlight = false;
    }
  }, [isSpotifyConnected, spotifyFetch, setSpotifyConnected, updateFromSpotify]);

  /**
   * Check connection status and handle OAuth callback on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify') === 'connected') {
      setSpotifyConnected(true);
      usePlayerStore.getState().setHasStarted(true);
      // Clean query params from address bar smoothly
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (urlParams.get('spotify_error')) {
      const errReason = urlParams.get('spotify_error');
      setError(`Error de autenticación Spotify: ${errReason}`);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Check server status once across mounted components
    if (!hasCheckedInitialStatus && !isCheckingInitialStatus) {
      isCheckingInitialStatus = true;
      spotifyFetch('/status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          hasCheckedInitialStatus = true;
          isCheckingInitialStatus = false;
          if (data?.isConnected) {
            setSpotifyConnected(true);
          }
        })
        .catch(() => {
          hasCheckedInitialStatus = true;
          isCheckingInitialStatus = false;
        });
    }
  }, [setSpotifyConnected, spotifyFetch]);

  /**
   * Shared singleton 2000ms polling loop when Spotify is connected
   */
  useEffect(() => {
    if (!isSpotifyConnected) {
      if (sharedPollTimer) {
        clearInterval(sharedPollTimer);
        sharedPollTimer = null;
      }
      return;
    }

    if (!sharedPollTimer) {
      pollCurrentTrack();
      sharedPollTimer = setInterval(pollCurrentTrack, 2000);
    }
  }, [isSpotifyConnected, pollCurrentTrack]);

  // ── Transport Control Actions ──────────────────────────────────────────────

  const play = useCallback(async () => {
    try {
      await spotifyFetch('/play', { method: 'POST' });
      setTimeout(pollCurrentTrack, 300);
    } catch (err) {
      console.error('[Spotify Play Error]', err);
    }
  }, [spotifyFetch, pollCurrentTrack]);

  const pause = useCallback(async () => {
    try {
      await spotifyFetch('/pause', { method: 'POST' });
      setTimeout(pollCurrentTrack, 300);
    } catch (err) {
      console.error('[Spotify Pause Error]', err);
    }
  }, [spotifyFetch, pollCurrentTrack]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const next = useCallback(async () => {
    try {
      await spotifyFetch('/next', { method: 'POST' });
      setTimeout(pollCurrentTrack, 400);
    } catch (err) {
      console.error('[Spotify Next Error]', err);
    }
  }, [spotifyFetch, pollCurrentTrack]);

  const previous = useCallback(async () => {
    try {
      await spotifyFetch('/previous', { method: 'POST' });
      setTimeout(pollCurrentTrack, 400);
    } catch (err) {
      console.error('[Spotify Previous Error]', err);
    }
  }, [spotifyFetch, pollCurrentTrack]);

  const seek = useCallback(
    async (positionMs: number) => {
      try {
        await spotifyFetch('/seek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position_ms: Math.round(positionMs) }),
        });
        setTimeout(pollCurrentTrack, 300);
      } catch (err) {
        console.error('[Spotify Seek Error]', err);
      }
    },
    [spotifyFetch, pollCurrentTrack]
  );

  return {
    isSpotifyConnected,
    isLoading,
    error,
    connectSpotify,
    disconnectSpotify,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    playNext: next,
    playPrevious: previous,
    seek,
  };
};
