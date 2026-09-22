import React, { useCallback, useState } from 'react';
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
  Disc3,
  Maximize2,
} from 'lucide-react';
import { AudioEngine } from '../../services/audioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { VolumeControl } from './VolumeControl';

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
    isMiniPlayerOpen,
    toggleMiniPlayer,
  } = usePlayerStore();

  const { togglePlayPause: engineTogglePlayPause, playNext: enginePlayNext, playPrevious: enginePlayPrevious } = useAudioEngine();
  const {
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

  const handleVinylTapeStop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const engine = AudioEngine.getInstance();
      if (e.shiftKey) {
        engine.triggerDjScratch();
        return;
      }
      if (isPlaying) {
        engine.triggerTapeStop(0.85);
      } else {
        engine.triggerTapeStart(0.55);
      }
    },
    [isPlaying]
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 w-full px-0.5 select-none">
      {/* Track Info */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-1/3 min-w-0 justify-between sm:justify-start">
        <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-3 h-3 text-white/40" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1">
            <h4 className="text-white font-medium text-[10px] sm:text-[11px] truncate tracking-tight">
              {currentTrack ? currentTrack.title : 'Sin pista seleccionada'}
            </h4>
            {currentTrack?.sourceType === 'system' && (
              <span className="text-[7.5px] font-mono uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                LIVE
              </span>
            )}
            {isSpotifyConnected && (
              <span className="text-[7.5px] font-mono tracking-wider px-1 py-0.2 rounded bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 flex items-center gap-1 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#1DB954]" />
                SYNC
              </span>
            )}
          </div>
          <p className="text-white/40 text-[8.5px] sm:text-[9px] truncate font-mono mt-0.2">
            {currentTrack ? currentTrack.artist : 'Aura3D Engine'}
          </p>
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-1 h-6 w-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0 cursor-pointer ${
              isFav
                ? 'text-rose-500 hover:text-rose-400'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={`w-3 h-3 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>
        )}

        {/* Mobile Actions (Volume & MiniPlayer) */}
        <div className="flex sm:hidden items-center gap-1">
          <VolumeControl />
          <button
            onClick={toggleMiniPlayer}
            className={`p-1 h-6.5 w-6.5 rounded-md transition-all flex items-center justify-center cursor-pointer border ${
              isMiniPlayerOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                : 'text-white/40 hover:text-white border-transparent hover:bg-white/[0.06]'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Playback Buttons */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full sm:w-auto">
        <button
          onClick={toggleShuffle}
          className={`p-1 h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            isShuffled
              ? isLucid
                ? 'text-white bg-white/20 shadow-sm'
                : 'text-white bg-white/15 shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={isShuffled ? 'Desactivar Aleatorio (S)' : 'Activar Aleatorio (S)'}
          aria-label={isShuffled ? 'Desactivar modo aleatorio' : 'Activar modo aleatorio'}
        >
          <Shuffle className="w-3 h-3" />
        </button>

        <button
          onClick={handlePrevious}
          className="p-1 h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/[0.06] btn-spring cursor-pointer"
          title="Canción Anterior (Shift+←)"
          aria-label="Canción anterior"
        >
          <SkipBack className="w-3 h-3 fill-current" />
        </button>

        <button
          onClick={handlePlayPause}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center btn-spring shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-white/25 flex-shrink-0 group cursor-pointer hover:scale-105 active:scale-95 transition-transform"
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
          title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={handleNext}
          className="p-1 h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/[0.06] btn-spring cursor-pointer"
          title="Siguiente Canción (Shift+→)"
          aria-label="Siguiente canción"
        >
          <SkipForward className="w-3.5 h-3.5 fill-current" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`p-1 h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            repeatMode !== 'off'
              ? isLucid
                ? 'text-white bg-white/20 shadow-sm'
                : 'text-white bg-white/15 shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={`Repetición: ${repeatMode} (R)`}
          aria-label={`Modo de repetición actual: ${repeatMode}. Clic para cambiar.`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-3 h-3" />
          ) : (
            <Repeat className="w-3 h-3" />
          )}
        </button>

        {/* Vinyl Tape Stop & Scratch DJ Button */}
        <button
          onClick={handleVinylTapeStop}
          onDoubleClick={(e) => {
            e.stopPropagation();
            AudioEngine.getInstance().triggerDjScratch();
          }}
          className={`p-1 h-6.5 w-6.5 sm:h-7 sm:w-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
            isPlaying
              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 active:scale-90'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Freno de Vinilo Analógico (Tape Stop) • Doble clic / Shift+Clic: Scratch DJ"
          aria-label="Freno de vinilo analógico"
        >
          <Disc3 className={`w-3 h-3 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
        </button>

      </div>

      {/* Volume & MiniPlayer Launcher (Desktop & Tablet) */}
      <div className="hidden sm:flex w-1/3 justify-end items-center gap-2">
        <VolumeControl />
        <button
          onClick={toggleMiniPlayer}
          className={`p-1 h-6.5 w-6.5 rounded-md transition-all flex items-center justify-center cursor-pointer border ${
            isMiniPlayerOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              : 'text-white/40 hover:text-white border-transparent hover:bg-white/[0.06]'
          }`}
          title={isMiniPlayerOpen ? 'Cerrar consola MiniPlayer' : 'Abrir consola MiniPlayer (YouTube, Cola y EQ)'}
          aria-label="Consola MiniPlayer"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

