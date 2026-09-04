import React from 'react';
import { Heart, Disc, Radio, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export const NowPlayingPanel: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isMicActive,
    isLucid,
    lucidTheme,
    visualizerMode,
    favorites,
    toggleFavorite,
    isNowPlayingExpanded,
    setNowPlayingExpanded,
  } = usePlayerStore();

  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  return (
    <div
      className={`fixed top-16 sm:top-20 left-2 sm:left-6 z-30 transition-all duration-500 pointer-events-auto select-none ${
        isNowPlayingExpanded
          ? 'translate-x-0 opacity-100'
          : '-translate-x-[calc(100%-2.5rem)] opacity-70 hover:opacity-100'
      }`}
    >
      <div
        className={`relative rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 w-[clamp(240px,28vw,380px)] max-w-[calc(100vw-1.5rem)] transition-all duration-400 ${
          isLucid
            ? 'bg-[#080b18]/85 backdrop-blur-2xl border'
            : visualizerMode === 'party'
            ? 'bg-[#150a1d]/85 backdrop-blur-2xl border border-pink-500/40 shadow-[0_0_25px_rgba(255,0,127,0.3)]'
            : 'bg-black/75 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80'
        }`}
        style={
          isLucid
            ? {
                borderColor: `${lucidTheme.primary}60`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 25px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Album Artwork / Disc */}
        <div
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg transition-all ${
            isLucid
              ? 'border'
              : visualizerMode === 'party'
              ? 'bg-gradient-to-tr from-yellow-500/25 to-pink-500/25 border border-pink-500/30'
              : 'bg-gradient-to-tr from-cyan-500/20 to-pink-500/20 border border-white/10'
          }`}
          style={
            isLucid
              ? {
                  backgroundColor: `${lucidTheme.primary}15`,
                  borderColor: `${lucidTheme.primary}45`,
                  boxShadow: `0 0 15px ${lucidTheme.glow}`,
                }
              : undefined
          }
        >
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${
                isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
              }`}
            />
          ) : isMicActive ? (
            <Radio className="w-6 h-6 text-pink-400 animate-pulse" />
          ) : (
            <Disc
              className={`w-7 h-7 ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}`}
              style={{
                color: isLucid
                  ? lucidTheme.primary
                  : visualizerMode === 'party'
                  ? '#ff088a'
                  : '#00f2fe',
              }}
            />
          )}

          {/* Center spindle dot */}
          <div className="absolute w-2.5 h-2.5 rounded-full bg-black border border-white/30" />
        </div>

        {/* Track details (visible when expanded) */}
        {isNowPlayingExpanded && (
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full animate-ping"
                style={{
                  backgroundColor: isLucid
                    ? lucidTheme.primary
                    : visualizerMode === 'party'
                    ? '#ff088a'
                    : '#00f2fe',
                }}
              />
              <span
                className="text-[10px] uppercase font-mono tracking-widest flex items-center gap-1"
                style={{
                  color: isLucid
                    ? lucidTheme.primary
                    : visualizerMode === 'party'
                    ? '#ff69b4'
                    : '#00f2fe',
                }}
              >
                {isMicActive
                  ? '[ LIVE MIC ]'
                  : visualizerMode === 'party'
                  ? '[ 3D STUDIO ]'
                  : isLucid
                  ? `[ ${lucidTheme.name.toUpperCase()} ]`
                  : '[ REPRODUCIENDO ]'}
              </span>
            </div>

            <h4 className="text-white font-medium text-xs sm:text-sm truncate drop-shadow">
              {isMicActive ? 'Audio del Micrófono' : currentTrack?.title || 'Sin pista'}
            </h4>
            <p className="text-white/50 text-[11px] truncate tracking-wide font-mono">
              {isMicActive ? 'Captura en vivo' : currentTrack?.artist || 'Auralis Core'}
            </p>
          </div>
        )}

        {/* Action button: Like & Toggle */}
        <div className="flex items-center gap-1">
          {isNowPlayingExpanded && currentTrack && !isMicActive && (
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-2 rounded-full transition-all ${
                isFav
                  ? 'text-pink-500 scale-110'
                  : 'text-white/40 hover:text-pink-400 hover:scale-105'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setNowPlayingExpanded(!isNowPlayingExpanded)}
            className="p-1.5 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors"
            title={isNowPlayingExpanded ? 'Contraer panel' : 'Expandir panel'}
          >
            {isNowPlayingExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingPanel;
