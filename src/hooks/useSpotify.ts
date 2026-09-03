import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

// Extend window for Spotify Web Playback SDK
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify: any;
  }
}

export interface SpotifyAuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  deviceId: string | null;
  isReady: boolean;
  error: string | null;
}

export const useSpotify = () => {
  const [authState, setAuthState] = useState<SpotifyAuthState>({
    accessToken: localStorage.getItem('auralis_spotify_token'),
    isAuthenticated: !!localStorage.getItem('auralis_spotify_token'),
    deviceId: null,
    isReady: false,
    error: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [player, setPlayer] = useState<any>(null);
  const { setCurrentTrack, setIsPlaying } = usePlayerStore();

  const setToken = useCallback((token: string) => {
    localStorage.setItem('auralis_spotify_token', token);
    setAuthState((prev) => ({
      ...prev,
      accessToken: token,
      isAuthenticated: true,
    }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auralis_spotify_token');
    if (player) {
      player.disconnect();
    }
    setAuthState({
      accessToken: null,
      isAuthenticated: false,
      deviceId: null,
      isReady: false,
      error: null,
    });
  }, [player]);

  // Load Spotify SDK Script
  useEffect(() => {
    if (!authState.accessToken) return;

    if (!document.getElementById('spotify-player-script')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-script';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Auralis 3D Immersive Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(authState.accessToken || '');
        },
        volume: 0.8,
      });

      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        setAuthState((prev) => ({ ...prev, deviceId: device_id, isReady: true }));
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.warn('Spotify device offline:', device_id);
        setAuthState((prev) => ({ ...prev, isReady: false }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spotifyPlayer.addListener('initialization_error', ({ message }: any) => {
        setAuthState((prev) => ({ ...prev, error: message }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spotifyPlayer.addListener('authentication_error', ({ message }: any) => {
        setAuthState((prev) => ({ ...prev, error: message, isAuthenticated: false }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        const current = state.track_window.current_track;
        if (current) {
          const track: Track = {
            id: current.id,
            title: current.name,
            artist: current.artists.map((a: { name: string }) => a.name).join(', '),
            album: current.album.name,
            duration: state.duration / 1000,
            sourceType: 'spotify',
            spotifyUri: current.uri,
            coverUrl: current.album.images[0]?.url,
            addedAt: Date.now(),
          };
          setCurrentTrack(track);
          setIsPlaying(!state.paused);
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [authState.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const playSpotifyUri = useCallback(
    async (spotifyUri: string) => {
      if (!authState.accessToken || !authState.deviceId) {
        throw new Error('Spotify player not ready or unauthorized');
      }

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${authState.deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [spotifyUri] }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.accessToken}`,
        },
      });
    },
    [authState.accessToken, authState.deviceId]
  );

  return {
    authState,
    setToken,
    logout,
    playSpotifyUri,
  };
};

