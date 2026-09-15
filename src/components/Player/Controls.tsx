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
  Bookmark,
  BookmarkCheck,
  RotateCcw,
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
    loopA,
    loopB,
    isLoopActive,
    setLoopPointA,
    setLoopPointB,
    clearLoop,
    cuePoints,
    setCuePoint,
    jumpToCuePoint,
  } = usePlayerStore();

  const [isLooperOpen, setIsLooperOpen] = useState(false);

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
            className={`p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
              isFav
                ? 'text-rose-500 hover:text-rose-400'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>
        )}

        {/* Mobile Volume */}
        <div className="flex sm:hidden items-center gap-1.5">
          <VolumeControl />
        </div>
      </div>

      {/* Main Playback Buttons */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-4 w-full sm:w-auto">
        <button
          onClick={toggleShuffle}
          className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            isShuffled
              ? isLucid
                ? 'text-white bg-white/20 shadow-sm'
                : 'text-white bg-white/15 shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={isShuffled ? 'Desactivar Aleatorio (S)' : 'Activar Aleatorio (S)'}
          aria-label={isShuffled ? 'Desactivar modo aleatorio' : 'Activar modo aleatorio'}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <button
          onClick={handlePrevious}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/75 hover:text-white hover:bg-white/[0.06] btn-spring cursor-pointer"
          title="Canción Anterior (Shift+←)"
          aria-label="Canción anterior"
        >
          <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </button>

        <button
          onClick={handlePlayPause}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center btn-spring shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/20 flex-shrink-0 group cursor-pointer"
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
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={handleNext}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white/75 hover:text-white hover:bg-white/[0.06] btn-spring cursor-pointer"
          title="Siguiente Canción (Shift+→)"
          aria-label="Siguiente canción"
        >
          <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
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
            <Repeat1 className="w-4 h-4" />
          ) : (
            <Repeat className="w-4 h-4" />
          )}
        </button>

        {/* Vinyl Tape Stop & Scratch DJ Button */}
        <button
          onClick={handleVinylTapeStop}
          onDoubleClick={(e) => {
            e.stopPropagation();
            AudioEngine.getInstance().triggerDjScratch();
          }}
          className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${
            isPlaying
              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 active:scale-90'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Freno de Vinilo Analógico (Tape Stop) • Doble clic / Shift+Clic: Scratch DJ"
          aria-label="Freno de vinilo analógico"
        >
          <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
        </button>

        {/* DJ Looper A-B & Cues Popover Button */}
        <div className="relative">
          <button
            onClick={() => setIsLooperOpen(!isLooperOpen)}
            className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all gap-1 cursor-pointer ${
              isLoopActive
                ? 'text-amber-400 bg-amber-400/15 border border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Bucle DJ [A-B] & Puntos Cue"
            aria-label="Bucle DJ A-B"
            aria-expanded={isLooperOpen}
          >
            {isLoopActive ? (
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            {isLoopActive && <span className="text-[9px] font-mono font-bold text-amber-400">A-B</span>}
          </button>

          {isLooperOpen && (
            <div className="absolute bottom-full mb-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-64 max-w-[calc(100vw-2rem)] p-3 rounded-[12px] bg-[#0c101a]/95 backdrop-blur-3xl border border-white/[0.1] shadow-[0_16px_40px_rgba(0,0,0,0.7)] z-50 flex flex-col gap-2.5 text-xs font-mono animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-white/65 font-bold flex items-center gap-1.5">
                  <Bookmark className="w-3 h-3 text-amber-400" /> DJ Looper & Cues
                </span>
                {isLoopActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 font-bold border border-amber-400/30">
                    LOOP ON
                  </span>
                )}
              </div>

              {/* Loop A-B triggers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={setLoopPointA}
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold text-[11px] transition-all ${
                    loopA !== null
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                  title="Fijar Punto de Inicio A"
                >
                  Punto [A] {loopA !== null ? `(${Math.floor(loopA)}s)` : ''}
                </button>

                <button
                  onClick={setLoopPointB}
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold text-[11px] transition-all ${
                    loopB !== null
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                  title="Fijar Punto de Fin B y Activar Bucle"
                >
                  Punto [B] {loopB !== null ? `(${Math.floor(loopB)}s)` : ''}
                </button>

                {(loopA !== null || loopB !== null) && (
                  <button
                    onClick={clearLoop}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
                    title="Limpiar Bucle A-B"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick Cue Points */}
              <div className="flex flex-col gap-1 pt-1 border-t border-white/[0.06]">
                <span className="text-[9px] text-white/40 uppercase tracking-wider">Puntos Cue Rápidos</span>
                <div className="grid grid-cols-3 gap-1">
                  {[0, 1, 2].map((idx) => {
                    const hasCue = cuePoints && cuePoints[idx] > 0;
                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            setCuePoint(idx);
                          } else if (hasCue) {
                            jumpToCuePoint(idx);
                          } else {
                            setCuePoint(idx);
                          }
                        }}
                        className={`py-1 px-1 rounded-md text-[10px] font-mono border transition-all truncate ${
                          hasCue
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                            : 'bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/[0.08]'
                        }`}
                        title={hasCue ? `Saltar a Cue ${idx + 1} (${Math.floor(cuePoints[idx])}s) • Shift+Clic para reasignar` : `Fijar Cue ${idx + 1} en tiempo actual`}
                      >
                        Cue {idx + 1} {hasCue ? `· ${Math.floor(cuePoints[idx])}s` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Volume (Desktop & Tablet) */}
      <div className="hidden sm:flex w-1/3 justify-end items-center gap-3">
        <VolumeControl />
      </div>
    </div>
  );
});

