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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayer, type YouTubeSearchResult } from '../../hooks/useAudioPlayer';
import type { Track } from '../../types/audio';

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
    fetchRelatedTracks,
    isSearching,
    searchResults,
    error: audioError,
  } = useAudioPlayer();

  // ── Selective Theme & UI state ─────────────────────────────────────────────
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const setQueue = usePlayerStore((s) => s.setQueue);

  // ── Local Component State ──────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue'>('player');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Debounce Search Effect (300ms) ──────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'search') {
      searchYouTube(searchQuery);
    }
  }, [searchQuery, activeTab, searchYouTube]);

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
      // 1. Reproducir inmediatamente la canción seleccionada
      const track = await loadYouTubeTrack(item.id, {
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
      });
      setActiveTab('player');

      // 2. Establecer la canción seleccionada como el inicio de la lista
      setQueue([track], 0);

      // 3. Obtener canciones relacionadas / similares (del mismo artista o género)
      // para que al terminar reproduzca una canción nueva y diferente, no la misma de otro video
      fetchRelatedTracks(item.id, item.title, item.artist).then((related) => {
        if (related && related.length > 0) {
          const filtered = related.filter((r) => r.youtubeId !== item.id);
          if (filtered.length > 0) {
            setQueue([track, ...filtered], 0);
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
      {isExpanded && (
        <div
          className="fixed bottom-6 left-4 z-50 w-[92vw] max-w-sm sm:max-w-md pointer-events-auto transition-all duration-300 origin-bottom-left"
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
            </div>

            {/* Tab Body */}
            <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              {/* ── 1. PLAYER TAB ─────────────────────────────────────────── */}
              {activeTab === 'player' && (
                <div className="flex flex-col gap-4">
                  {/* Artwork & Track Information */}
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
                        {sourceBadge}
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

                  {/* Interactive Seek Bar */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="relative w-full flex items-center">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="0.1"
                        value={displayCurrentTime}
                        onChange={handleSeekChange}
                        onMouseDown={handleSeekMouseDown}
                        onTouchStart={handleSeekMouseDown}
                        onMouseUp={handleSeekMouseUp}
                        onTouchEnd={handleSeekMouseUp}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/20 transition-all"
                        style={
                          isLucid
                            ? { accentColor: lucidTheme.primary }
                            : { accentColor: 'var(--color-primary, #00f2fe)' }
                        }
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/50">
                      <span>{formatTime(displayCurrentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Complete Transport Controls */}
                  <div className="flex items-center justify-between px-2 pt-1">
                    {/* Shuffle */}
                    <button
                      onClick={toggleShuffle}
                      className={`p-2 rounded-xl transition-all ${
                        isShuffled
                          ? 'text-cyan-400 bg-cyan-400/15'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                      title={isShuffled ? 'Aleatorio activado' : 'Activar aleatorio'}
                      style={
                        isShuffled && isLucid
                          ? { color: lucidTheme.primary, backgroundColor: `${lucidTheme.primary}20` }
                          : undefined
                      }
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>

                    {/* Previous */}
                    <button
                      onClick={playPrevious}
                      className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
                      title="Pista anterior"
                    >
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>

                    {/* Play / Pause Main Button */}
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                      style={
                        isLucid
                          ? {
                              backgroundColor: lucidTheme.primary,
                              boxShadow: `0 0 25px ${lucidTheme.glow}`,
                            }
                          : {
                              backgroundColor: 'var(--color-primary, #ffffff)',
                              boxShadow: '0 0 25px var(--color-glow, rgba(0, 242, 254, 0.35))',
                            }
                      }
                      title={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      )}
                    </button>

                    {/* Next */}
                    <button
                      onClick={playNext}
                      className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
                      title="Pista siguiente"
                    >
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>

                    {/* Repeat */}
                    <button
                      onClick={cycleRepeat}
                      className={`p-2 rounded-xl transition-all ${
                        repeatMode !== 'off'
                          ? 'text-cyan-400 bg-cyan-400/15'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                      title={`Repetición: ${repeatMode}`}
                      style={
                        repeatMode !== 'off' && isLucid
                          ? { color: lucidTheme.primary, backgroundColor: `${lucidTheme.primary}20` }
                          : undefined
                      }
                    >
                      {repeatMode === 'one' ? (
                        <Repeat1 className="w-4 h-4" />
                      ) : (
                        <Repeat className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Independent Volume Slider (Web Audio GainNode) */}
                  <div className="flex items-center gap-3 px-1 py-1.5 border-t border-white/[0.06] mt-1">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      title={isMuted ? 'Desmutear' : 'Mutear'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4 text-white/80" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/20 transition-all"
                      style={
                        isLucid
                          ? { accentColor: lucidTheme.primary }
                          : undefined
                      }
                      title="Control de ganancia independiente (DSP GainNode)"
                    />

                    <span className="text-[10px] font-mono text-white/50 w-8 text-right">
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                </div>
              )}

              {/* ── 2. SEARCH TAB (YouTube / Spotify with 300ms Debounce) ──── */}
              {activeTab === 'search' && (
                <div className="flex flex-col gap-3">
                  {/* YouTube Search Bar */}
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar canción o artista en YouTube..."
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
                          <span>Escribe para buscar música de alta fidelidad</span>
                        </div>
                      )}

                      {searchResults.map((item) => (
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
                                  <Play className="w-3.5 h-3.5 text-white fill-current" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="text-xs text-white font-medium truncate group-hover:text-cyan-300 transition-colors">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-white/50 font-mono truncate">
                                {item.artist}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-white/40 group-hover:text-white/70 flex-shrink-0 ml-2">
                            {formatTime(item.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. QUEUE TAB ───────────────────────────────────────────── */}
              {activeTab === 'queue' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                    <span className="text-xs font-mono text-white/60">
                      Cola de reproducción ({queue.length})
                    </span>
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
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                      {queue.map((track, idx) => {
                        const isCurrent = idx === queueIndex;
                        return (
                          <div
                            key={track.id || idx}
                            onClick={() => playTrack(track)}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-cyan-500/15 border border-cyan-500/30 text-white font-medium'
                                : 'bg-white/[0.02] hover:bg-white/[0.06] text-white/70 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[10px] font-mono text-white/40 w-4">
                                {idx + 1}
                              </span>
                              <span className="text-xs truncate">
                                {track.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-white/40 ml-2">
                              {formatTime(track.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Error Toast if applicable */}
              {audioError && (
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] font-mono text-rose-300">
                  {audioError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiniPlayer;
