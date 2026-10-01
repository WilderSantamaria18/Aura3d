import React, { useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, Music, Disc3, Maximize2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { AudioEngine } from '../../services/audioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { isSpotifyActiveSource } from '../../utils/spotifyRouting';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { VolumeControl } from './VolumeControl';

/**
 * Controles de la cápsula inferior.
 * Rendimiento: selectores acotados (antes se suscribía al store entero y se re-renderizaba
 * con cualquier cambio) y estilos sin `backdrop-filter` propio por botón.
 */
export const Controls: React.FC = React.memo(() => {
  const {
    currentTrack,
    isPlaying,
    repeatMode,
    isShuffled,
    toggleShuffle,
    setRepeatMode,
    toggleFavorite,
    autoMode,
    autoPrimary,
    isLucid,
    lucidPrimary,
    isSpotifyConnected,
    isMiniPlayerOpen,
    toggleMiniPlayer,
  } = usePlayerStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      repeatMode: s.repeatMode,
      isShuffled: s.isShuffled,
      toggleShuffle: s.toggleShuffle,
      setRepeatMode: s.setRepeatMode,
      toggleFavorite: s.toggleFavorite,
      autoMode: s.autoMode,
      autoPrimary: s.autoPalette.primary,
      isLucid: s.isLucid,
      lucidPrimary: s.lucidTheme.primary,
      isSpotifyConnected: s.isSpotifyConnected,
      isMiniPlayerOpen: s.isMiniPlayerOpen,
      toggleMiniPlayer: s.toggleMiniPlayer,
    }))
  );
  const spotifyActive = isSpotifyActiveSource({ isSpotifyConnected, currentTrack });
  // Booleano: no depende de la identidad de la lista de favoritos
  const isFav = usePlayerStore((s) => (s.currentTrack ? s.favorites.some((t) => t.id === s.currentTrack!.id) : false));

  const { togglePlayPause: engineTogglePlayPause, playNext: enginePlayNext, playPrevious: enginePlayPrevious } = useAudioPlayerActions();
  const {
    togglePlayPause: spotifyTogglePlayPause,
    playNext: spotifyPlayNext,
    playPrevious: spotifyPlayPrevious,
  } = useSpotifyPlayer();

  const handlePlayPause = useCallback(() => {
    if (spotifyActive) spotifyTogglePlayPause();
    else engineTogglePlayPause();
  }, [spotifyActive, spotifyTogglePlayPause, engineTogglePlayPause]);

  const handleNext = useCallback(() => {
    if (spotifyActive) spotifyPlayNext();
    else enginePlayNext();
  }, [spotifyActive, spotifyPlayNext, enginePlayNext]);

  const handlePrevious = useCallback(() => {
    if (spotifyActive) spotifyPlayPrevious();
    else enginePlayPrevious();
  }, [spotifyActive, spotifyPlayPrevious, enginePlayPrevious]);

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
      if (isPlaying) engine.triggerTapeStop(0.85);
      else engine.triggerTapeStart(0.55);
    },
    [isPlaying]
  );

  const accent = autoMode ? autoPrimary : isLucid ? lucidPrimary : '#ffffff';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 w-full select-none">
      {/* Pista actual */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="dock-cover w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              decoding="async"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <Music className="w-4 h-4 text-white/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-white font-semibold text-[12px] sm:text-[12.5px] truncate tracking-tight leading-tight">
              {currentTrack ? currentTrack.title : 'Sin pista seleccionada'}
            </h4>
            {currentTrack?.sourceType === 'system' && (
              <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                LIVE
              </span>
            )}
            {isSpotifyConnected && (
              <span className="text-[8px] font-mono tracking-wider px-1.5 rounded bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30 flex items-center gap-1 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#1DB954]" />
                SYNC
              </span>
            )}
          </div>
          <p className="text-white/50 text-[10.5px] truncate mt-0.5 leading-tight">
            {currentTrack ? currentTrack.artist : 'Aura3D Engine'}
          </p>
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`dock-btn w-8 h-8 flex-shrink-0 ${isFav ? 'text-rose-400' : 'text-white/55 hover:text-white'}`}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-pressed={isFav}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
          </button>
        )}

        {/* Móvil: volumen y consola */}
        <div className="flex sm:hidden items-center gap-1">
          <VolumeControl />
          <button
            onClick={toggleMiniPlayer}
            className={`dock-btn w-8 h-8 ${isMiniPlayerOpen ? 'is-active' : 'text-white/55'}`}
            aria-label="Consola MiniPlayer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transporte */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <button
          onClick={toggleShuffle}
          className={`dock-btn w-8 h-8 ${isShuffled ? 'is-active' : 'text-white/60 hover:text-white'}`}
          title={isShuffled ? 'Desactivar Aleatorio (S)' : 'Activar Aleatorio (S)'}
          aria-label={isShuffled ? 'Desactivar modo aleatorio' : 'Activar modo aleatorio'}
          aria-pressed={isShuffled}
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handlePrevious}
          className="dock-btn w-9 h-9 text-white/85 hover:text-white"
          title="Canción Anterior (Shift+←)"
          aria-label="Canción anterior"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={handlePlayPause}
          className="dock-play w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{ backgroundColor: accent, ['--dock-play-glow' as string]: accent }}
          title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current text-black" /> : <Play className="w-5 h-5 fill-current text-black translate-x-0.5" />}
        </button>

        <button
          onClick={handleNext}
          className="dock-btn w-9 h-9 text-white/85 hover:text-white"
          title="Siguiente Canción (Shift+→)"
          aria-label="Siguiente canción"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`dock-btn w-8 h-8 ${repeatMode !== 'off' ? 'is-active' : 'text-white/60 hover:text-white'}`}
          title={`Repetición: ${repeatMode} (R)`}
          aria-label={`Modo de repetición actual: ${repeatMode}. Clic para cambiar.`}
          aria-pressed={repeatMode !== 'off'}
        >
          {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Volumen, freno de vinilo y consola */}
      <div className="hidden sm:flex justify-end items-center gap-2">
        <button
          onClick={handleVinylTapeStop}
          onDoubleClick={(e) => {
            e.stopPropagation();
            AudioEngine.getInstance().triggerDjScratch();
          }}
          className={`dock-btn w-8 h-8 ${isPlaying ? 'text-amber-400' : 'text-white/55 hover:text-white'}`}
          title="Freno de Vinilo (Tape Stop) • Doble clic / Shift+Clic: Scratch DJ"
          aria-label="Freno de vinilo analógico"
        >
          <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
        </button>
        <VolumeControl compact />
        <button
          onClick={toggleMiniPlayer}
          className={`dock-btn w-8 h-8 ${isMiniPlayerOpen ? 'is-active' : 'text-white/55 hover:text-white'}`}
          title={isMiniPlayerOpen ? 'Cerrar consola MiniPlayer' : 'Abrir consola MiniPlayer (YouTube, Cola y EQ)'}
          aria-label="Consola MiniPlayer"
          aria-pressed={isMiniPlayerOpen}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

Controls.displayName = 'Controls';
