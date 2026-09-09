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
    favorites,
    toggleFavorite,
    isNowPlayingExpanded,
    setNowPlayingExpanded,
    isSpotifyConnected,
  } = usePlayerStore();

  const isFav = currentTrack ? favorites.some((t) => t.id === currentTrack.id) : false;

  return (
    <div
      className="fixed top-14 sm:top-16 left-2 sm:left-6 z-30 transition-all duration-300 pointer-events-auto select-none"
    >
      <div
        className={`flex items-center gap-2.5 transition-all duration-300 ${
          isNowPlayingExpanded
            ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl max-w-[calc(100vw-4rem)] sm:max-w-[280px]'
            : 'p-1 rounded-xl'
        } ${
          isLucid
            ? 'backdrop-blur-2xl border'
            : 'bg-[#070a14]/92 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: lucidTheme.glassColor || 'rgba(7, 10, 20, 0.92)',
                borderColor: `${lucidTheme.primary}40`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.7), 0 0 20px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Album Artwork / Disc (Tap to expand if collapsed) */}
        <button
          type="button"
          onClick={() => !isNowPlayingExpanded && setNowPlayingExpanded(true)}
          className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/[0.08] transition-transform ${
            !isNowPlayingExpanded ? 'hover:scale-105 cursor-pointer' : ''
          }`}
          title={!isNowPlayingExpanded ? 'Expandir información de pista' : undefined}
        >
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${
                isPlaying ? 'animate-[spin_16s_linear_infinite]' : ''
              }`}
            />
          ) : isMicActive ? (
            <Radio className="w-4 h-4 text-emerald-400" />
          ) : (
            <Disc
              className={`w-4 h-4 text-white/50 ${
                isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''
              }`}
            />
          )}

          {/* Center spindle dot */}
          <div className="absolute w-2 h-2 rounded-full bg-black/80 border border-white/30" />
        </button>

        {/* Track details (visible when expanded) */}
        {isNowPlayingExpanded && (
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpotifyConnected
                    ? 'bg-[#1DB954] animate-pulse'
                    : isPlaying || isMicActive
                    ? 'bg-emerald-400'
                    : 'bg-white/30'
                }`}
              />
              <span
                className={`text-[9px] uppercase font-mono tracking-widest font-medium ${
                  isSpotifyConnected ? 'text-[#1DB954]' : 'text-emerald-400/90'
                }`}
              >
                {isSpotifyConnected
                  ? isPlaying
                    ? 'SPOTIFY SYNC'
                    : 'SPOTIFY PAUSADO'
                  : isMicActive
                  ? 'LIVE MIC'
                  : isPlaying
                  ? 'REPRODUCIENDO'
                  : 'PAUSADO'}
              </span>
            </div>

            <h4 className="text-white font-medium text-xs truncate max-w-[130px] sm:max-w-[170px] leading-tight">
              {isMicActive ? 'Micrófono en vivo' : currentTrack?.title || 'Sin pista'}
            </h4>
            <p className="text-white/40 text-[10px] truncate font-mono mt-0.5 max-w-[130px] sm:max-w-[170px]">
              {isMicActive ? 'Captura activa' : currentTrack?.artist || 'Aura3D Engine'}
            </p>
          </div>
        )}

        {/* Action buttons: Like & Collapse Toggle */}
        <div className="flex items-center gap-0.5">
          {isNowPlayingExpanded && currentTrack && !isMicActive && (
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={`p-1.5 rounded-md transition-colors ${
                isFav
                  ? 'text-rose-500'
                  : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setNowPlayingExpanded(!isNowPlayingExpanded)}
            className="p-1 text-white/30 hover:text-white rounded-md hover:bg-white/[0.04] transition-colors"
            title={isNowPlayingExpanded ? 'Contraer' : 'Expandir'}
          >
            {isNowPlayingExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingPanel;

