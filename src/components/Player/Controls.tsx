import React, { useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Music,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { VolumeControl } from './VolumeControl';

const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
  </svg>
);

export const Controls: React.FC = React.memo(() => {
  const {
    currentTrack,
    isPlaying,
    repeatMode,
    isShuffled,
    favorites,
    toggleShuffle,
    setRepeatMode,
    toggleFavorite,
    autoMode,
    autoPalette,
    isLucid,
    lucidTheme,
    isSpotifyConnected,
  } = usePlayerStore();

  const { togglePlayPause: engineTogglePlayPause, playNext: enginePlayNext, playPrevious: enginePlayPrevious } = useAudioEngine();
  const {
    connectSpotify,
    disconnectSpotify,
    togglePlayPause: spotifyTogglePlayPause,
    playNext: spotifyPlayNext,
    playPrevious: spotifyPlayPrevious,
  } = useSpotifyPlayer();

  const handlePlayPause = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyTogglePlayPause();
    } else {
      engineTogglePlayPause();
    }
  }, [isSpotifyConnected, spotifyTogglePlayPause, engineTogglePlayPause]);

  const handleNext = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyPlayNext();
    } else {
      enginePlayNext();
    }
  }, [isSpotifyConnected, spotifyPlayNext, enginePlayNext]);

  const handlePrevious = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyPlayPrevious();
    } else {
      enginePlayPrevious();
    }
  }, [isSpotifyConnected, spotifyPlayPrevious, enginePlayPrevious]);

  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  const cycleRepeat = useCallback(() => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  }, [repeatMode, setRepeatMode]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 w-full px-1 sm:px-2 select-none">
      {/* Track Info */}
      <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0 justify-between sm:justify-start">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-4 h-4 text-white/40" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium text-xs sm:text-sm truncate tracking-tight">
              {currentTrack ? currentTrack.title : 'Sin pista seleccionada'}
            </h4>
            {currentTrack?.sourceType === 'system' && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                LIVE
              </span>
            )}
            {isSpotifyConnected && (
              <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 flex items-center gap-1 flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                SPOTIFY SYNC
              </span>
            )}
          </div>
          <p className="text-white/40 text-[11px] sm:text-xs truncate font-mono mt-0.5">
            {currentTrack ? currentTrack.artist : 'Aura3D Engine'}
          </p>
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
              isFav
                ? 'text-rose-500 hover:text-rose-400'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>
        )}

        {/* Mobile Volume & Spotify Toggle */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            onClick={isSpotifyConnected ? disconnectSpotify : connectSpotify}
            className={`p-1.5 rounded-md transition-colors ${
              isSpotifyConnected
                ? 'text-[#1DB954] bg-[#1DB954]/10 border border-[#1DB954]/20'
                : 'text-white/40 hover:text-white/80'
            }`}
            title={isSpotifyConnected ? 'Spotify Conectado (Tocar para desconectar)' : 'Conectar Spotify'}
          >
            <SpotifyIcon className="w-3.5 h-3.5" />
          </button>
          <VolumeControl />
        </div>
      </div>

      {/* Main Playback Buttons */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto">
        <button
          onClick={toggleShuffle}
          className={`p-2 rounded-md transition-colors ${
            isShuffled ? 'text-white bg-white/10' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
          title={isShuffled ? 'Aleatorio activado' : 'Activar aleatorio'}
        >
          <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          onClick={handlePrevious}
          className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/[0.04] transition-transform active:scale-95"
          title="Canción Anterior"
        >
          <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </button>

        <button
          onClick={handlePlayPause}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-white/20 flex-shrink-0 hover:scale-105"
          style={
            autoMode
              ? {
                  backgroundColor: autoPalette.primary,
                  color: '#000000',
                }
              : isLucid
              ? {
                  backgroundColor: lucidTheme.primary,
                  color: '#000000',
                }
              : {
                  backgroundColor: '#ffffff',
                  color: '#000000',
                }
          }
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={handleNext}
          className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/[0.04] transition-transform active:scale-95"
          title="Siguiente Canción"
        >
          <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`p-2 rounded-md transition-colors ${
            repeatMode !== 'off'
              ? isLucid
                ? 'text-white bg-white/15'
                : 'text-white bg-white/10'
              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
          title={`Repetición: ${repeatMode}`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>
      </div>

      {/* Volume & Integrations (Desktop & Tablet) */}
      <div className="hidden sm:flex w-1/3 justify-end items-center gap-3">
        {isSpotifyConnected ? (
          <button
            onClick={disconnectSpotify}
            className="px-2.5 py-1.5 rounded-lg bg-[#1DB954]/10 hover:bg-rose-500/15 border border-[#1DB954]/30 hover:border-rose-500/30 text-[#1DB954] hover:text-rose-400 text-[10px] font-mono tracking-wider transition-all flex items-center gap-1.5 group"
            title="Spotify Conectado — Clic para desconectar"
          >
            <SpotifyIcon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline group-hover:hidden">SPOTIFY SYNC</span>
            <span className="hidden group-hover:inline">DESCONECTAR</span>
          </button>
        ) : (
          <button
            onClick={connectSpotify}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-[#1DB954]/15 border border-white/[0.08] hover:border-[#1DB954]/40 text-white/70 hover:text-[#1DB954] text-[10px] font-mono tracking-wider transition-all flex items-center gap-1.5"
            title="Conectar cuenta de Spotify para control de reproducción y letras sincronizadas"
          >
            <SpotifyIcon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">SPOTIFY</span>
          </button>
        )}
        <VolumeControl />
      </div>
    </div>
  );
});

