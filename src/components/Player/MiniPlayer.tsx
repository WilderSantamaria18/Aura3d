/**
 * MiniPlayer — Floating Glassmorphic Audio Player & Search Dock
 *
 * Technical DSP & Architecture Highlights:
 *  - Single Source of Truth: Driven by useAudioPlayer & Zustand (usePlayerStore).
 *  - ZERO Double Audio: Audio streams exclusively via Web Audio API (/api/youtube/stream & audioEngine).
 *    No unmuted iframe playback. YouTube/Spotify iframes are completely silenced or avoided.
 *  - Fully Responsive Floating Placement: bottom-4 left-1/2 -translate-x-1/2 (w-[90vw] max-w-md).
 *  - Debounced 300ms YouTube/Spotify search with scrollable results.
 *  - Interactive seek bar, independent Web Audio GainNode volume slider, transport buttons,
 *    and live source badge.
 *  - Optimized: Fine-grained selectors isolate re-renders from the 3D/Canvas visualizers.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Search,
  ListMusic,
  Disc3,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  ExternalLink,
  Music,
  Radio,
  Upload,
  Sparkles,
  Eye,
  Heart,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayer, type YouTubeSearchResult } from '../../hooks/useAudioPlayer';
import type { Track } from '../../types/audio';
import { GlobalYouTubePlayer } from './GlobalYouTubePlayer';

// ── Time formatter helper ─────────────────────────────────────────────────────
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Custom Platform Icons ─────────────────────────────────────────────────────
const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const MiniPlayer: React.FC = () => {
  // ── Hook Audio Controls (Single Source of Truth) ───────────────────────────
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    queue,
    queueIndex,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    toggleShuffle,
    setRepeatMode,
    loadYouTubeTrack,
    loadAudioFile,
    playTrack,
    searchYouTube,
    loadYouTubePlaylist,
    fetchRelatedTracks,
    isSearching,
    searchResults,
    error: audioError,
  } = useAudioPlayer();

  // ── Selective Theme & UI state ─────────────────────────────────────────────
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const favorites = usePlayerStore((s) => s.favorites);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);

  // ── Local Component State ──────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'favorites'>('player');
  const [showVideoView, setShowVideoView] = useState(true);
  const [searchFilter, setSearchFilter] = useState<'video' | 'playlist'>('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const isCurrentFav = currentTrack
    ? favorites.some(
        (t) => t.id === currentTrack.id || (Boolean(currentTrack.youtubeId) && t.youtubeId === currentTrack.youtubeId)
      )
    : false;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Debounce Search Effect (300ms) ──────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'search') {
      searchYouTube(searchQuery, false, searchFilter);
    }
  }, [searchQuery, activeTab, searchFilter, searchYouTube]);

  // ── Interactive Seek Handler ────────────────────────────────────────────────
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
  };

  const handleSeekMouseDown = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsScrubbing(false);
    const target = e.currentTarget as HTMLInputElement;
    const val = parseFloat(target.value);
    seek(val);
  };

  // ── Volume Slider Handler ───────────────────────────────────────────────────
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  // ── Track Click from YouTube Search ─────────────────────────────────────────
  const handleSelectYouTubeTrack = async (item: YouTubeSearchResult) => {
    setLoadingTrackId(item.id);
    try {
      if (item.type === 'playlist') {
        setActiveTab('player');
        await loadYouTubePlaylist(item.id, item.title, item.artist);
        return;
      }

      // 1. Reproducir inmediatamente la canción seleccionada
      const track = await loadYouTubeTrack(item.id, {
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
      });
      setActiveTab('player');

      // 2. Preservar el historial de canciones previamente escuchadas (hasta 25 recientes)
      const currentQueue = usePlayerStore.getState().queue;
      const currentIndex = usePlayerStore.getState().queueIndex;
      const recentHistory = currentQueue.slice(Math.max(0, currentIndex - 25), currentIndex + 1);

      // Colocar el historial previo y la nueva pista
      const baseQueue =
        recentHistory.length > 0 && recentHistory[recentHistory.length - 1].id === track.id
          ? recentHistory
          : [...recentHistory.filter((t) => t.id !== track.id), track];
      const newIndex = baseQueue.length - 1;
      setQueue(baseQueue, newIndex);

      // 3. Obtener 50+ canciones relacionadas / similares del nuevo cantante o género
      fetchRelatedTracks(item.id, item.title, item.artist, item.duration).then((related) => {
        if (related && related.length > 0) {
          const existingIds = new Set(baseQueue.map((t) => t.id || t.youtubeId));
          const filtered = related.filter((r) => !existingIds.has(r.id || r.youtubeId));
          if (filtered.length > 0) {
            setQueue([...baseQueue, ...filtered], newIndex);
          }
        }
      });
    } catch (err) {
      console.error('[MiniPlayer] Error playing search result:', err);
    } finally {
      setLoadingTrackId(null);
    }
  };

  // ── Repeat Mode Cycle ───────────────────────────────────────────────────────
  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  // ── Local File Ingestion ───────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await loadAudioFile(file);
      setActiveTab('player');
    }
  };

  // ── Current Track Metadata ─────────────────────────────────────────────────
  const title = currentTrack?.title || 'Sin reproducción';
  const artist = currentTrack?.artist || 'Aura3D Audio Visualizer';
  const coverUrl =
    currentTrack?.coverUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
  const sourceType = currentTrack?.sourceType || 'local';

  // ── Effective Time for Scrubber ────────────────────────────────────────────
  const displayCurrentTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayCurrentTime / duration) * 100 : 0;

  // ── Source Badge Helper ────────────────────────────────────────────────────
  const sourceBadge = useMemo(() => {
    switch (sourceType) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-red-500/15 text-red-400 border border-red-500/30">
            <YouTubeIcon className="w-3 h-3 text-red-500" />
            YouTube
          </span>
        );
      case 'spotify':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Music className="w-3 h-3 text-emerald-400" />
            Spotify
          </span>
        );
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Disc3 className="w-3 h-3 text-cyan-400 animate-spin-slow" />
            Local
          </span>
        );
      case 'mic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Radio className="w-3 h-3 text-purple-400" />
            Mic
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-white/10 text-white/70 border border-white/15">
            <Music className="w-3 h-3" />
            Audio
          </span>
        );
    }
  }, [sourceType]);

  // Dynamic Glow Theme Style (Lucid Theme or AI Dynamic Color)
  const themeGlowStyle = isLucid
    ? {
        borderColor: lucidTheme.borderColor,
        boxShadow: `0 20px 50px rgba(0,0,0,0.85), 0 0 30px ${lucidTheme.glow}`,
      }
    : {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.85), 0 0 25px var(--color-glow, rgba(0, 242, 254, 0.2))',
      };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── Collapsed Dock Pill (Docked on Left: bottom-6 left-4) ──────────── */}
      {!isExpanded && (
        <div
          className="fixed bottom-6 left-4 z-50 pointer-events-auto transition-all duration-300 transform"
        >
          <div
            className="group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-2xl bg-[#070913]/90 border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.85)] hover:border-cyan-400/30 transition-all cursor-pointer max-w-[280px] sm:max-w-[320px]"
            style={themeGlowStyle}
            onClick={() => setIsExpanded(true)}
          >
            {/* Subtle Progress Background Fill */}
            <div
              className="absolute left-0 bottom-0 top-0 rounded-2xl bg-white/[0.04] pointer-events-none transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />

            {/* Left: Thumbnail & Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                <img
                  src={coverUrl}
                  alt={title}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isPlaying ? 'scale-105' : 'scale-100 opacity-80'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                  }}
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {title}
                  </span>
                  {sourceBadge}
                </div>
                <span className="text-[10px] text-white/50 truncate font-mono">
                  {artist} • {formatTime(displayCurrentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div
              className="flex items-center gap-1 relative z-10 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {currentTrack && (
                <button
                  onClick={() => toggleFavorite(currentTrack)}
                  className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                    isCurrentFav ? 'text-rose-400 bg-rose-500/10' : 'text-white/40 hover:text-rose-300 hover:bg-white/5'
                  }`}
                  title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('search');
                  setIsExpanded(true);
                }}
                className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Buscar canciones (YouTube/Spotify)"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-md"
                style={
                  isLucid
                    ? { backgroundColor: lucidTheme.primary, color: '#000' }
                    : { backgroundColor: 'var(--color-primary, #ffffff)', color: '#000' }
                }
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Expandir Mini-Player"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded Full Floating Mini-Player (Docked Left: bottom-6 left-4) ─── */}
      <div
        className={`fixed bottom-6 left-4 z-50 w-[92vw] max-w-sm sm:max-w-md transition-all duration-300 origin-bottom-left ${
          isExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
          <div
            className="flex flex-col rounded-2xl backdrop-blur-3xl bg-[#080b16]/95 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-left-4 slide-in-from-bottom-4 duration-300"
            style={themeGlowStyle}
          >
            {/* Header: Title, Source & Collapse/Close */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest text-white/90">
                  MiniPlayer
                </span>
                {sourceBadge}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Minimizar a píldora"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation Strip */}
            <div className="flex border-b border-white/[0.06] bg-white/[0.01]">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-wider transition-colors ${
                  activeTab === 'player'
                    ? 'text-white border-b-2 border-white font-medium bg-white/[0.03]'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={
                  activeTab === 'player' && isLucid
                    ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
                    : undefined
                }
              >
                <Disc3 className="w-3.5 h-3.5" />
                PISTA
              </button>

              <button
                onClick={() => {
                  setActiveTab('search');
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-wider transition-colors ${
                  activeTab === 'search'
                    ? 'text-white border-b-2 border-white font-medium bg-white/[0.03]'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={
                  activeTab === 'search' && isLucid
                    ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
                    : undefined
                }
              >
                <Search className="w-3.5 h-3.5" />
                BUSCADOR
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-wider transition-colors ${
                  activeTab === 'queue'
                    ? 'text-white border-b-2 border-white font-medium bg-white/[0.03]'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={
                  activeTab === 'queue' && isLucid
                    ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
                    : undefined
                }
              >
                <ListMusic className="w-3.5 h-3.5" />
                COLA ({queue.length})
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-wider transition-colors ${
                  activeTab === 'favorites'
                    ? 'text-rose-400 border-b-2 border-rose-400 font-medium bg-rose-500/[0.05]'
                    : 'text-white/40 hover:text-rose-300'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                FAVS ({favorites.length})
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              {/* ── 1. PLAYER TAB (Video y Título Limpio sin reproductor inferior) ─── */}
              <div className={activeTab === 'player' ? 'flex flex-col gap-3' : 'hidden'}>
                {/* Si es pista de YouTube y la vista de video está activa */}
                {sourceType === 'youtube' && currentTrack?.youtubeId && showVideoView ? (
                  <div className="flex flex-col gap-3">
                    <GlobalYouTubePlayer
                      inMiniPlayer={true}
                      isMiniPlayerExpanded={isExpanded}
                      activeTab={activeTab}
                      showVideoInPlayer={showVideoView}
                      onToggleVideoView={() => setShowVideoView(false)}
                      onExpandMiniPlayer={() => setIsExpanded(true)}
                    />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                          {title}
                        </h3>
                        <p className="text-xs text-white/60 font-mono truncate mt-0.5">
                          {artist}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite(currentTrack)}
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center ${
                              isCurrentFav
                                ? 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                : 'text-white/40 hover:text-rose-300 hover:bg-rose-500/10 border-white/10'
                            }`}
                            title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}
                        {sourceBadge}
                        <button
                          onClick={() => setShowVideoView(false)}
                          className="text-[10px] text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-1 rounded-lg border border-cyan-500/20 font-mono transition-colors"
                          title="Ver portada del tema"
                        >
                          Portada
                        </button>
                        {currentTrack?.youtubeId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-white/40 hover:text-white flex items-center gap-0.5 font-mono px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                          >
                            YT <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Artwork & Track Information estándar */
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 shadow-lg">
                      <img
                        src={coverUrl}
                        alt={title}
                        className={`w-full h-full object-cover transition-transform duration-700 ${
                          isPlaying ? 'scale-105' : 'scale-100'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                        }}
                      />
                      {isPlaying && (
                        <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                        {title}
                      </h3>
                      <p className="text-xs text-white/60 font-mono truncate mt-0.5">
                        {artist}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite(currentTrack)}
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center ${
                              isCurrentFav
                                ? 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                : 'text-white/40 hover:text-rose-300 hover:bg-rose-500/10 border-white/10'
                            }`}
                            title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}
                        {sourceBadge}
                        {sourceType === 'youtube' && (
                          <button
                            onClick={() => setShowVideoView(true)}
                            className="text-[10px] text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Ver Video
                          </button>
                        )}
                        {sourceType === 'youtube' && currentTrack?.youtubeId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-white/40 hover:text-white flex items-center gap-0.5 font-mono"
                          >
                            Abrir en YT <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 2. SEARCH TAB (Filtro Canciones / Playlists del Artista) ──── */}
              <div className={activeTab === 'search' ? 'flex flex-col gap-2.5' : 'hidden'}>
                {/* Selector de Filtro: Canciones vs Playlists */}
                <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('video');
                      if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'video');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                      searchFilter === 'video'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Music className="w-3 h-3" /> Canciones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('playlist');
                      if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'playlist');
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 ${
                      searchFilter === 'playlist'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ListMusic className="w-3 h-3" /> Playlists del Artista
                  </button>
                </div>

                {/* YouTube Search Bar */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchFilter === 'playlist'
                          ? 'Buscar playlists del artista en YouTube...'
                          : 'Buscar canciones del artista en YouTube...'
                      }
                      className="w-full pl-9 pr-8 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all font-mono"
                    />
                    {isSearching ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {/* Scrollable Results List */}
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {isSearching && searchResults.length === 0 && (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/40 font-mono text-xs">
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                        <span>Buscando en YouTube...</span>
                      </div>
                    )}

                    {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <div className="py-8 text-center text-xs font-mono text-white/40">
                        No se encontraron resultados para "{searchQuery}"
                      </div>
                    )}

                    {!searchQuery && (
                      <div className="py-6 text-center text-xs font-mono text-white/30 flex flex-col items-center gap-1">
                        <Sparkles className="w-4 h-4 text-white/20" />
                        <span>
                          {searchFilter === 'playlist'
                            ? 'Escribe el nombre del artista para explorar sus playlists'
                            : 'Escribe para buscar música de alta fidelidad'}
                        </span>
                      </div>
                    )}

                    {searchResults.map((item) => {
                      const isPlaylist = item.type === 'playlist';
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectYouTubeTrack(item)}
                          className="group flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/15 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`;
                                }}
                              />
                              {loadingTrackId === item.id ? (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  {isPlaylist ? (
                                    <ListMusic className="w-4 h-4 text-cyan-300" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 text-white fill-current" />
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-white font-medium truncate group-hover:text-cyan-300 transition-colors">
                                  {item.title}
                                </span>
                                {isPlaylist && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                                    PLAYLIST
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/50 font-mono truncate">
                                {item.artist}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-white/40 group-hover:text-white/70 flex-shrink-0 ml-2">
                            {isPlaylist ? (item.videoCount || 'Playlist') : formatTime(item.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── 4. FAVORITES TAB (Lista de temas favoritos usable) ─────── */}
              <div className={activeTab === 'favorites' ? 'flex flex-col gap-2' : 'hidden'}>
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <span className="text-xs font-mono text-rose-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> Canciones Favoritas ({favorites.length})
                  </span>
                </div>

                {favorites.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-white/40 flex flex-col items-center gap-2">
                    <Heart className="w-8 h-8 text-white/15" />
                    <span>No tienes canciones guardadas aún</span>
                    <span className="text-[10px] text-white/30">Toca el corazón en cualquier tema para guardarlo</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {favorites.map((fav) => (
                      <div
                        key={fav.id}
                        onClick={async () => {
                          const q = usePlayerStore.getState().queue;
                          const existingIdx = q.findIndex(
                            (t) => t.id === fav.id || (Boolean(fav.youtubeId) && t.youtubeId === fav.youtubeId)
                          );
                          if (existingIdx >= 0) {
                            usePlayerStore.setState({ queueIndex: existingIdx });
                          } else {
                            usePlayerStore.setState({ queue: [fav, ...q], queueIndex: 0 });
                          }
                          await playTrack(fav);
                        }}
                        className="group flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/15 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                            <img
                              src={fav.coverUrl || (fav.youtubeId ? `https://img.youtube.com/vi/${fav.youtubeId}/hqdefault.jpg` : '')}
                              alt={fav.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-3.5 h-3.5 text-white fill-current" />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs text-white font-medium truncate group-hover:text-rose-300 transition-colors">
                              {fav.title}
                            </span>
                            <span className="text-[10px] text-white/50 font-mono truncate">
                              {fav.artist}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-white/40">
                            {formatTime(fav.duration)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(fav);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-400 transition-colors"
                            title="Quitar de favoritos"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 3. QUEUE TAB (Dynamic 50+ Infinite Queue & History) ───── */}
              <div className={activeTab === 'queue' ? 'flex flex-col gap-2' : 'hidden'}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-white/80 font-bold">
                        Cola de reproducción ({queue.length})
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> 50+ Auto
                      </span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      Subir archivo
                    </button>
                  </div>

                  {queue.length === 0 ? (
                    <div className="py-10 text-center text-xs font-mono text-white/30 flex flex-col items-center gap-2">
                      <Music className="w-6 h-6 text-white/20" />
                      <span>No hay pistas en la cola actual</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors"
                      >
                        Cargar archivo local
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                      {/* Recientes antes de la actual */}
                      {queueIndex > 0 && (
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider px-1 pt-1 pb-0.5 flex items-center justify-between">
                          <span>Historial Reciente ({queueIndex})</span>
                          <span className="text-[9px] text-white/30">Escuchadas</span>
                        </div>
                      )}

                      {queue.map((track, idx) => {
                        const isCurrent = idx === queueIndex;
                        const isPast = idx < queueIndex;
                        return (
                          <React.Fragment key={track.id || `${idx}_${track.title}`}>
                            {isCurrent && (
                              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-1 pt-1.5 pb-0.5 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Sonando Ahora
                                </span>
                              </div>
                            )}

                            {idx === queueIndex + 1 && (
                              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider px-1 pt-2 pb-0.5 flex items-center justify-between">
                                <span>A Continuación ({queue.length - queueIndex - 1})</span>
                                <span className="text-[9px] text-cyan-400/70">♾️ Radio Infinita</span>
                              </div>
                            )}

                            <div
                              onClick={async () => {
                                usePlayerStore.setState({ queueIndex: idx });
                                await playTrack(track);
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-white font-medium shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                                  : isPast
                                  ? 'bg-white/[0.015] hover:bg-white/[0.05] text-white/40 hover:text-white/70 border border-transparent'
                                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.03] hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                                  <img
                                    src={track.coverUrl || `https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`}
                                    alt={track.title}
                                    className={`w-full h-full object-cover ${isPast ? 'grayscale opacity-60' : ''}`}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&q=80';
                                    }}
                                  />
                                  {isCurrent && isPlaying && (
                                    <div className="absolute inset-0 bg-cyan-950/60 flex items-center justify-center">
                                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col min-w-0 pr-1">
                                  <span className={`text-xs truncate ${isCurrent ? 'text-cyan-300 font-bold' : ''}`}>
                                    {track.title}
                                  </span>
                                  <span className="text-[10px] text-white/40 font-mono truncate">
                                    {track.artist}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[10px] font-mono text-white/40 ml-2 flex-shrink-0">
                                {formatTime(track.duration)}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* Error Toast if applicable */}
              {audioError && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] font-mono text-rose-300">
                  {audioError}
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
};

export default MiniPlayer;
