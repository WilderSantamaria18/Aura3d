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
            ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-card max-w-[calc(100vw-4rem)] sm:max-w-[280px]'
            : 'p-1 rounded-card'
        } ${
          isLucid
            ? 'material-thick border'
            : 'bg-surface-overlay material-regular border border-border-subtle shadow-modal'
        }`}
        style={
          isLucid
            ? {
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
          className={`relative min-w-11 min-h-11 w-11 h-11 rounded-control overflow-hidden flex items-center justify-center flex-shrink-0 bg-surface-subtle border border-border-subtle transition-transform ${
            !isNowPlayingExpanded ? 'hover:scale-105 cursor-pointer' : ''
          }`}
          title={!isNowPlayingExpanded ? 'Expandir información de pista' : undefined}
          aria-label={isNowPlayingExpanded ? 'Pista actual' : 'Expandir información de pista'}
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
            <Radio className="w-4 h-4 text-status-success" />
          ) : (
            <Disc
              className={`w-4 h-4 text-text-secondary ${
                isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''
              }`}
            />
          )}

          {/* Center spindle dot */}
          <div className="absolute w-2 h-2 rounded-pill bg-black/80 border border-white/30" />
        </button>

        {/* Track details (visible when expanded) */}
        {isNowPlayingExpanded && (
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-pill ${
                  isSpotifyConnected
                    ? 'bg-status-success animate-pulse'
                    : isPlaying || isMicActive
                    ? 'bg-status-success'
                    : 'bg-text-tertiary'
                }`}
              />
              <span
                className={`text-caption uppercase font-mono tracking-widest font-medium ${
                  isSpotifyConnected ? 'text-status-success' : 'text-status-success'
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

            <h4 className="text-text-primary font-medium text-caption truncate max-w-[130px] sm:max-w-[170px] leading-tight">
              {isMicActive ? 'Micrófono en vivo' : currentTrack?.title || 'Sin pista'}
            </h4>
            <p className="text-text-tertiary text-caption truncate font-mono mt-0.5 max-w-[130px] sm:max-w-[170px]">
              {isMicActive ? 'Captura activa' : currentTrack?.artist || 'Aura3D Engine'}
            </p>
          </div>
        )}

        {/* Action buttons: Like & Collapse Toggle */}
        <div className="flex items-center gap-0.5">
          {isNowPlayingExpanded && currentTrack && !isMicActive && (
            <button
              type="button"
              onClick={() => toggleFavorite(currentTrack)}
              className={`min-w-11 min-h-11 p-2 rounded-control transition-colors flex items-center justify-center cursor-pointer ${
                isFav
                  ? 'text-status-error'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface-subtle'
              }`}
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setNowPlayingExpanded(!isNowPlayingExpanded)}
            className="min-w-11 min-h-11 p-2 text-text-tertiary hover:text-text-primary rounded-control hover:bg-surface-subtle transition-colors flex items-center justify-center cursor-pointer"
            title={isNowPlayingExpanded ? 'Contraer' : 'Expandir'}
            aria-label={isNowPlayingExpanded ? 'Contraer información de pista' : 'Expandir información de pista'}
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

