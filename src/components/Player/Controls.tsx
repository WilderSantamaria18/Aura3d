import React from 'react';
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
import { VolumeControl } from './VolumeControl';

export const Controls: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    repeatMode,
    isShuffled,
    favorites,
    toggleShuffle,
    setRepeatMode,
    toggleFavorite,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { togglePlayPause, playNext, playPrevious } = useAudioEngine();

  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 w-full px-1 sm:px-4">
      {/* Track Info */}
      <div className="flex items-center gap-2.5 w-full sm:w-1/3 min-w-0 justify-between sm:justify-start">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-md overflow-hidden shadow-lg shadow-cyan-950/40">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-white font-medium text-xs sm:text-sm truncate drop-shadow">
              {currentTrack ? currentTrack.title : 'Sin pista seleccionada'}
            </h4>
            {currentTrack?.sourceType === 'system' && (
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex-shrink-0">
                LIVE
              </span>
            )}
          </div>
          <p className="text-cyan-200/60 text-[11px] sm:text-xs truncate">
            {currentTrack ? currentTrack.artist : 'Auralis Core'}
          </p>
        </div>

        {currentTrack && (
          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-1.5 rounded-full transition-all flex-shrink-0 ${
              isFav
                ? 'text-pink-500 hover:text-pink-400 scale-110'
                : 'text-white/40 hover:text-pink-400 hover:scale-105'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-pink-500' : ''}`} />
          </button>
        )}

        {/* Mobile Volume Control Toggle */}
        <div className="flex sm:hidden items-center">
          <VolumeControl />
        </div>
      </div>

      {/* Main Playback Buttons */}
      <div className="flex items-center justify-center gap-3 sm:gap-5 w-full sm:w-auto">
        <button
          onClick={toggleShuffle}
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${
            isShuffled ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/40 hover:text-white/80'
          }`}
          title={isShuffled ? 'Aleatorio activado' : 'Activar aleatorio'}
        >
          <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          onClick={playPrevious}
          className="p-1.5 sm:p-2 text-white/80 hover:text-cyan-300 transition-transform active:scale-95"
          title="Canción Anterior"
        >
          <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        </button>

        <button
          onClick={togglePlayPause}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full text-slate-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg flex-shrink-0"
          style={
            isLucid
              ? {
                  background: `linear-gradient(135deg, ${lucidTheme.primary}, ${lucidTheme.secondary})`,
                  boxShadow: `0 0 25px ${lucidTheme.glow}`,
                }
              : {
                  background: 'linear-gradient(to top right, #00f2fe, #ff088a)',
                  boxShadow: '0 0 20px rgba(0,242,254,0.6)',
                }
          }
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={playNext}
          className="p-1.5 sm:p-2 text-white/80 hover:text-cyan-300 transition-transform active:scale-95"
          title="Siguiente Canción"
        >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        </button>

        <button
          onClick={cycleRepeat}
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${
            repeatMode !== 'off'
              ? isLucid
                ? 'text-white'
                : 'text-pink-400 bg-pink-400/10'
              : 'text-white/40 hover:text-white/80'
          }`}
          style={
            isLucid && repeatMode !== 'off'
              ? { color: lucidTheme.secondary, backgroundColor: `${lucidTheme.secondary}25` }
              : undefined
          }
          title={`Repetición: ${repeatMode}`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>
      </div>

      {/* Volume (Desktop & Tablet) */}
      <div className="hidden sm:flex w-1/3 justify-end">
        <VolumeControl />
      </div>
    </div>
  );
};
