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
  Minimize2,
  Maximize2,
  Trash2,
  Moon,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayer, type YouTubeSearchResult } from '../../hooks/useAudioPlayer';
import { GlobalYouTubePlayer } from './GlobalYouTubePlayer';
import { audioEngine } from '../../services/audioEngine';
import { StorageService } from '../../services/storageService';

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

// ── Mini Waveform Real-Time Spectrum Canvas ──────────────────────────────────
const MiniWaveform: React.FC<{
  progress: number;
  activeColor: string;
  isPlaying: boolean;
}> = ({ progress, activeColor, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const barCount = 36;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const raw = freqData.raw;
      const step = raw.length > 0 ? Math.floor(raw.length / barCount) : 1;
      const barWidth = width / barCount - 1.5;

      for (let i = 0; i < barCount; i++) {
        const rawVal = isPlaying && raw.length > 0 ? raw[i * step] / 255 : 0.12 + Math.sin(i * 0.35) * 0.06;
        const barHeight = Math.max(3, rawVal * (height - 4));
        const x = i * (barWidth + 1.5);
        const y = (height - barHeight) / 2;

        const isPlayed = (x / width) * 100 <= progress;
        ctx.fillStyle = isPlayed ? activeColor : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, Math.max(1, barWidth), barHeight, 2);
        } else {
          ctx.rect(x, y, Math.max(1, barWidth), barHeight);
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [progress, activeColor, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={26}
      className="w-full h-full pointer-events-none rounded-lg"
    />
  );
};

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
  const threeBandEQ = usePlayerStore((s) => s.threeBandEQ);
  const setThreeBandGain = usePlayerStore((s) => s.setThreeBandGain);
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const sleepTimerRemainingSec = usePlayerStore((s) => s.sleepTimerRemainingSec);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);

  // ── Local Component State ──────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'favorites'>('player');
  const [showVideoView, setShowVideoView] = useState(true);
  const [showQuickEQ, setShowQuickEQ] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'video' | 'playlist'>('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const handleClearFavorites = () => {
    if (favorites.length === 0) return;
    if (window.confirm('¿Deseas vaciar todas tus canciones favoritas de la lista?')) {
      usePlayerStore.setState({ favorites: [] });
      StorageService.saveFavorites([]);
    }
  };

  const handleExportJSON = () => {
    try {
      const data = {
        version: 'aura3d_v1',
        exportedAt: new Date().toISOString(),
        favorites,
        playlists: StorageService.getPlaylists(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Aura3D_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup', err);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.favorites)) {
          usePlayerStore.setState({ favorites: parsed.favorites });
          StorageService.saveFavorites(parsed.favorites);
        }
        if (Array.isArray(parsed.playlists)) {
          StorageService.savePlaylists(parsed.playlists);
        }
        alert('¡Copia de seguridad importada exitosamente!');
      } catch {
        alert('Archivo de copia de seguridad no válido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isCurrentFav = currentTrack
    ? favorites.some(
        (t) => t.id === currentTrack.id || (Boolean(currentTrack.youtubeId) && t.youtubeId === currentTrack.youtubeId)
      )
    : false;

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 4.5;
    const rotY = (x / (rect.width / 2)) * 4.5;
    setTilt({ rotateX: rotX, rotateY: rotY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-sans font-medium tracking-tight bg-red-500/15 text-red-400 border border-red-500/20">
            <YouTubeIcon className="w-3 h-3 text-red-500" />
            YouTube
          </span>
        );
      case 'spotify':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-sans font-medium tracking-tight bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <Music className="w-3 h-3 text-emerald-400" />
            Spotify
          </span>
        );
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-sans font-medium tracking-tight bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
            <Disc3 className="w-3 h-3 text-cyan-400 animate-spin-slow" />
            Local
          </span>
        );
      case 'mic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-sans font-medium tracking-tight bg-purple-500/15 text-purple-300 border border-purple-500/20">
            <Radio className="w-3 h-3 text-purple-400" />
            Mic
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-sans font-medium tracking-tight bg-white/10 text-white/70 border border-white/[0.08]">
            <Music className="w-3 h-3" />
            Audio
          </span>
        );
    }
  }, [sourceType]);

  const themeGlowStyle = isLucid
    ? {
        borderColor: lucidTheme.borderColor,
        boxShadow: `0 24px 60px rgba(0,0,0,0.95), 0 0 16px ${lucidTheme.glow}`,
        backgroundColor: 'rgba(5, 9, 24, 0.97)',
      }
    : {
        borderColor: 'rgba(255, 255, 255, 0.10)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.95), 0 0 12px var(--color-glow, rgba(0, 242, 254, 0.15))',
        backgroundColor: 'rgba(6, 8, 20, 0.96)',
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

      {/* ── Zen Mode Ultra-Compact Floating Micro-Pill ─────────────────────── */}
      {isZenMode && !isExpanded && (
        <div className="fixed bottom-6 left-4 z-50 pointer-events-auto transition-all duration-300 hidden sm:flex lg:hidden">
          <div
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-pill select-none material-regular border"
            style={themeGlowStyle}
          >
            {/* 3 dancing audio bars */}
            <div className="flex items-end gap-0.5 h-3.5 w-3.5 flex-shrink-0">
              <span
                className={`w-1 rounded-pill bg-cyan-400 transition-all duration-150 ${
                  isPlaying ? 'h-3' : 'h-1 opacity-40'
                }`}
              />
              <span
                className={`w-1 rounded-pill bg-cyan-300 transition-all duration-150 ${
                  isPlaying ? 'h-3.5' : 'h-1.5 opacity-40'
                }`}
              />
              <span
                className={`w-1 rounded-pill bg-cyan-400 transition-all duration-150 ${
                  isPlaying ? 'h-2' : 'h-1 opacity-40'
                }`}
              />
            </div>

            {/* Truncated track title */}
            <span className="text-subheadline font-bold font-display text-white truncate max-w-[120px] sm:max-w-[160px] text-scrim-3d">
              {title}
            </span>

            {/* Play / Pause Mini */}
            <button
              onClick={togglePlay}
              className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-pill bg-white text-black hover:bg-white/90 btn-spring transition-all shadow text-caption cursor-pointer"
              style={
                isLucid
                  ? { backgroundColor: lucidTheme.primary, color: 'black' }
                  : { backgroundColor: 'var(--color-primary)', color: 'black' }
              }
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
            </button>

            {/* Exit Zen Mode Button */}
            <button
              onClick={() => setIsZenMode(false)}
              className="min-w-11 min-h-11 p-2 text-white/60 hover:text-white rounded-control hover:bg-white/[0.06] btn-spring transition-colors flex items-center justify-center cursor-pointer"
              title="Restaurar Mini-Player estándar"
              aria-label="Restaurar Mini-Player estándar"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Collapsed Dock Pill (Docked on Left: bottom-6 left-4) ──────────── */}
      {!isExpanded && !isZenMode && (
        <div
          className="fixed bottom-6 left-4 z-50 pointer-events-auto transition-all duration-300 transform"
        >
          <div
            className="group relative flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-dock border material-regular transition-all cursor-pointer max-w-[290px] sm:max-w-[340px]"
            style={themeGlowStyle}
            onClick={() => setIsExpanded(true)}
          >
            {/* Subtle Progress Background Fill */}
            <div
              className="absolute left-0 bottom-0 top-0 rounded-dock bg-white/[0.06] pointer-events-none transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />

            {/* Left: Thumbnail & Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
              <div className="relative w-10 h-10 rounded-control overflow-hidden bg-white/[0.06] border border-white/[0.08] flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src={coverUrl}
                  alt={title}
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isPlaying ? 'scale-110' : 'scale-100 opacity-80'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                  }}
                />
                {isPlaying ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center material-thin">
                    <div className="w-4 h-4 rounded-pill border border-cyan-400/60 border-t-transparent animate-spin flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-pill bg-cyan-400" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/10" />
                )}
              </div>

              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-subheadline font-bold font-display text-white truncate max-w-[140px] sm:max-w-[190px] tracking-studio-tight text-scrim-3d">
                    {title}
                  </span>
                  {sourceBadge}
                </div>
                <span className="text-caption text-slate-300 font-medium truncate font-display font-tabular tracking-wide mt-0.5">
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
                  className={`min-w-11 min-h-11 p-2 rounded-control transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
                    isCurrentFav ? 'text-rose-400 bg-rose-500/10' : 'text-white/40 hover:text-rose-300 hover:bg-white/5'
                  }`}
                  title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  aria-label={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                >
                  <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('search');
                  setIsExpanded(true);
                }}
                className="min-w-11 min-h-11 p-2 text-white/50 hover:text-white rounded-control hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
                title="Buscar canciones (YouTube/Spotify)"
                aria-label="Buscar canciones (YouTube/Spotify)"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-pill bg-white text-black hover:bg-white/90 active:scale-[0.97] transition-all shadow-sm btn-spring cursor-pointer"
                style={
                  isLucid
                    ? { backgroundColor: lucidTheme.primary, color: 'black' }
                    : { backgroundColor: 'var(--color-primary)', color: 'black' }
                }
                title={isPlaying ? 'Pausar' : 'Reproducir'}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
              </button>

              {/* Botón Zen Mode */}
              <button
                onClick={() => setIsZenMode(true)}
                className="min-w-11 min-h-11 p-2 text-white/40 hover:text-cyan-300 rounded-control hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
                title="Activar Modo Zen (píldora ultracompacta)"
                aria-label="Activar Modo Zen"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className="min-h-11 min-w-11 p-2 text-white/40 hover:text-white rounded-control hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
                title="Expandir Mini-Player"
                aria-label="Expandir Mini-Player"
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
            className="flex flex-col rounded-modal material-thick bg-[var(--surface-overlay)] border border-[var(--border-medium)] shadow-modal overflow-hidden animate-aura-modal"
            style={{
              ...themeGlowStyle,
              transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transition: tilt.rotateX === 0 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.08s ease-out',
            }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            {/* Header: Title, Source & Collapse/Close */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-pill bg-cyan-400" />
                <span className="text-xs font-sans font-semibold tracking-tight text-white text-scrim-3d">
                  MiniPlayer
                </span>
                {sourceBadge}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="min-w-11 min-h-11 p-2 text-white/60 hover:text-white rounded-control hover:bg-white/[0.06] btn-spring transition-colors flex items-center justify-center cursor-pointer"
                  title="Minimizar a píldora"
                  aria-label="Minimizar a píldora"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation Strip */}
            <div className="flex p-1 gap-1 border-b border-white/[0.08] bg-white/[0.02]">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 min-h-11 py-2 px-2 rounded-control flex items-center justify-center gap-1.5 text-caption font-sans tracking-tight transition-colors cursor-pointer ${
                  activeTab === 'player'
                    ? 'text-white font-semibold bg-white/[0.12] shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
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
                className={`flex-1 min-h-11 py-2 px-2 rounded-control flex items-center justify-center gap-1.5 text-caption font-sans tracking-tight transition-colors cursor-pointer ${
                  activeTab === 'search'
                    ? 'text-white font-semibold bg-white/[0.12] shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
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
                className={`flex-1 min-h-11 py-2 px-2 rounded-control flex items-center justify-center gap-1.5 text-caption font-sans tracking-tight transition-colors cursor-pointer ${
                  activeTab === 'queue'
                    ? 'text-white font-semibold bg-white/[0.12] shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
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
                className={`flex-1 min-h-11 py-2 px-2 rounded-control flex items-center justify-center gap-1.5 text-caption font-sans tracking-tight transition-colors cursor-pointer ${
                  activeTab === 'favorites'
                    ? 'text-rose-400 font-semibold bg-rose-500/[0.15] shadow-sm'
                    : 'text-white/50 hover:text-rose-300 hover:bg-white/[0.04]'
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
                    <GlobalYouTubePlayer showVideoInPlayer={isExpanded && activeTab === 'player' && showVideoView} />
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight text-scrim-3d">
                          {title}
                        </h3>
                        <p className="text-xs text-slate-300 font-mono truncate mt-0.5 font-medium">
                          {artist}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite(currentTrack)}
                            className={`min-h-11 min-w-11 p-2 rounded-control border transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
                              isCurrentFav
                                ? 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                : 'text-white/40 hover:text-rose-300 hover:bg-rose-500/10 border-white/10'
                            }`}
                            title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                            aria-label={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}
                        {sourceBadge}
                        <button
                          onClick={() => setShowVideoView(false)}
                          className="min-h-11 px-3 py-2 rounded-control text-caption text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 font-mono transition-colors flex items-center justify-center cursor-pointer"
                          title="Ver portada del tema"
                          aria-label="Ver portada del tema"
                        >
                          Portada
                        </button>
                        {currentTrack?.youtubeId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-11 px-3 py-2 rounded-control text-caption text-white/40 hover:text-white flex items-center gap-1 font-mono bg-white/5 border border-white/10"
                            title="Abrir en YouTube"
                            aria-label="Abrir en YouTube"
                          >
                            YT <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                ) : (
                  /* Artwork & Track Information estándar con Vinilo 3D */
                  <div className="flex items-center gap-3.5">
                    {/* Vinyl Slide-out Container */}
                    <div className="relative flex-shrink-0">
                      {/* Realistic Grooved Vinyl Disc */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 w-16 h-16 sm:w-20 sm:h-20 rounded-pill shadow-2xl transition-all duration-700 ease-out pointer-events-none flex items-center justify-center ${
                          isPlaying
                            ? 'translate-x-5 sm:translate-x-7 opacity-100'
                            : 'translate-x-0 opacity-0'
                        }`}
                        style={{
                          background: 'repeating-radial-gradient(circle, rgba(14,14,18,1) 0px, rgba(20,20,26,1) 2px, rgba(10,10,13,1) 3px, rgba(24,24,34,1) 5px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.9)',
                          zIndex: 0,
                        }}
                      >
                        {/* Center Vinyl Label (Spinning at 33 RPM) */}
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-pill overflow-hidden border border-white/30 shadow-inner flex items-center justify-center ${
                            isPlaying ? 'animate-spin' : ''
                          }`}
                          style={{ animationDuration: '2.4s' }}
                        >
                          <img
                            src={coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute w-1.5 h-1.5 rounded-pill bg-black border border-white/50" />
                        </div>
                      </div>

                      {/* Foreground Album Cover Sleeve */}
                      <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-card overflow-hidden bg-white/5 border border-white/10 shadow-lg">
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
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight text-scrim-3d">
                        {title}
                      </h3>
                      <p className="text-xs text-slate-300 font-mono truncate mt-0.5 font-medium">
                        {artist}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {currentTrack && (
                          <button
                            onClick={() => toggleFavorite(currentTrack)}
                            className={`min-h-11 min-w-11 p-2 rounded-control border btn-spring transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
                              isCurrentFav
                                ? 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                : 'text-white/60 hover:text-rose-300 hover:bg-rose-500/10 border-white/15'
                            }`}
                            title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                            aria-label={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          >
                            <Heart className={`w-4 h-4 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}
                        {sourceBadge}
                        {sourceType === 'youtube' && (
                          <button
                            onClick={() => setShowVideoView(true)}
                            className="min-h-11 px-3 py-2 rounded-control text-caption text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/25 font-mono btn-spring transition-colors flex items-center gap-1 font-medium cursor-pointer"
                            title="Ver Video de YouTube"
                            aria-label="Ver Video de YouTube"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Video
                          </button>
                        )}
                        {sourceType === 'youtube' && currentTrack?.youtubeId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-11 px-3 py-2 rounded-control text-caption text-slate-300 hover:text-white flex items-center gap-1 font-mono bg-white/5 border border-white/10"
                            title="Abrir en YouTube"
                            aria-label="Abrir en YouTube"
                          >
                            Abrir en YT <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                  {/* Real-time Spectrum MiniWaveform Scrubber */}
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between text-caption font-mono text-slate-300 px-0.5">
                      <span className="text-white font-semibold">{formatTime(displayCurrentTime)}</span>
                      <span className="text-caption text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> Onda en Vivo
                      </span>
                      <span className="text-slate-200 font-medium">{formatTime(duration)}</span>
                    </div>

                    <div
                      className="relative w-full min-h-11 h-11 bg-black/40 rounded-card overflow-hidden border border-white/10 group px-2 flex items-center shadow-inner cursor-pointer"
                      onMouseDown={handleSeekMouseDown}
                      onTouchStart={handleSeekMouseDown}
                    >
                      <MiniWaveform
                        progress={progressPercent}
                        activeColor={isLucid ? lucidTheme.primary : 'var(--ios-cyan)'}
                        isPlaying={isPlaying}
                      />
                      <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 100}
                        step={0.1}
                        value={displayCurrentTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        onTouchEnd={handleSeekMouseUp}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full min-h-11 z-20"
                        title="Arrastra para avanzar o retroceder"
                        aria-label="Arrastra para avanzar o retroceder"
                      />
                    </div>
                  </div>

                  {/* Primary Transport Controls */}
                  <div className="flex items-center justify-between pt-2 px-1">
                    {/* Shuffle & Prev */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleShuffle}
                        className={`min-h-11 min-w-11 p-2.5 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
                          isShuffled ? 'text-cyan-400 bg-cyan-500/15' : 'text-white/40 hover:text-white'
                        }`}
                        title="Modo aleatorio"
                        aria-label="Modo aleatorio"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={playPrevious}
                        className="min-h-11 min-w-11 p-2.5 text-white/60 hover:text-white rounded-control hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
                        title="Pista anterior"
                        aria-label="Pista anterior"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Big Center Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="min-h-11 min-w-11 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-pill bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                      style={
                        isLucid
                          ? { backgroundColor: lucidTheme.primary, color: 'black' }
                          : { backgroundColor: 'var(--color-primary)', color: 'black' }
                      }
                      title={isPlaying ? 'Pausar' : 'Reproducir'}
                      aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current translate-x-0.5" />
                      )}
                    </button>

                    {/* Next & Repeat */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={playNext}
                        className="min-h-11 min-w-11 p-2.5 text-white/60 hover:text-white rounded-control hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
                        title="Siguiente pista"
                        aria-label="Siguiente pista"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cycleRepeat}
                        className={`min-h-11 min-w-11 p-2.5 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
                          repeatMode !== 'off' ? 'text-cyan-400 bg-cyan-500/15' : 'text-white/40 hover:text-white'
                        }`}
                        title={`Repetir: ${repeatMode}`}
                        aria-label={`Repetir: ${repeatMode}`}
                      >
                        {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 px-1 pt-1 border-t border-white/[0.04] min-h-11">
                    <button
                      onClick={toggleMute}
                      className="min-h-11 min-w-11 p-2 text-white/40 hover:text-white transition-colors rounded-control flex items-center justify-center cursor-pointer"
                      title={isMuted ? 'Activar sonido' : 'Silenciar'}
                      aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="flex-1 min-h-11 h-11 bg-white/10 rounded-pill appearance-none accent-white cursor-pointer transition-all hover:bg-white/20"
                      title={`Volumen: ${Math.round(volume * 100)}%`}
                      aria-label={`Volumen: ${Math.round(volume * 100)}%`}
                    />
                    <span className="text-caption font-mono text-white/40 w-8 text-right font-tabular">
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>

                  {/* ── Utilities Bar: EQ 3-Band, Sleep Timer, Backup JSON ── */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between gap-1 text-caption font-mono flex-wrap">
                      {/* EQ Toggle */}
                      <button
                        onClick={() => setShowQuickEQ(!showQuickEQ)}
                        className={`min-h-11 px-3 py-2 rounded-control border flex items-center gap-1.5 transition-all cursor-pointer ${
                          showQuickEQ || threeBandEQ.bass !== 0 || threeBandEQ.mids !== 0 || threeBandEQ.treble !== 0
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/60 border-white/10'
                        }`}
                        title="Ecualizador rápido de 3 bandas (Bajos, Medios, Agudos)"
                        aria-label="Ecualizador rápido de 3 bandas"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>EQ 3-Band</span>
                      </button>

                      {/* Sleep Timer Selector */}
                      <div className="flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-control border border-white/10 min-h-11">
                        <Moon className={`w-3.5 h-3.5 ${sleepTimerMinutes > 0 ? 'text-amber-300 animate-pulse' : 'text-white/40'}`} />
                        {sleepTimerMinutes > 0 ? (
                          <button
                            onClick={() => setSleepTimer(0)}
                            className="min-h-11 px-2 text-caption text-amber-300 font-bold hover:underline rounded-control flex items-center cursor-pointer"
                            title="Haz clic para cancelar temporizador"
                            aria-label="Cancelar temporizador"
                          >
                            {formatTime(sleepTimerRemainingSec)}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            {[15, 30, 60].map((m) => (
                              <button
                                key={m}
                                onClick={() => setSleepTimer(m)}
                                className="min-h-11 px-3 text-caption text-white/50 hover:text-white rounded-control hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
                                title={`Temporizador ${m} minutos`}
                                aria-label={`Temporizador ${m} minutos`}
                              >
                                {m}m
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Backup Export / Import */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleExportJSON}
                          className="min-h-11 min-w-11 p-2 rounded-control bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
                          title="Exportar respaldo de favoritos y listas (JSON)"
                          aria-label="Exportar respaldo de favoritos y listas (JSON)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => jsonImportInputRef.current?.click()}
                          className="min-h-11 min-w-11 p-2 rounded-control bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
                          title="Restaurar copia de respaldo (JSON)"
                          aria-label="Restaurar copia de respaldo (JSON)"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <input
                          ref={jsonImportInputRef}
                          type="file"
                          accept=".json"
                          className="hidden"
                          aria-label="Subir archivo de respaldo JSON"
                          onChange={handleImportJSON}
                        />
                      </div>
                    </div>

                    {/* Collapsible Quick 3-Band Equalizer */}
                    {showQuickEQ && (
                      <div className="p-3 rounded-card bg-[var(--surface-overlay)] material-thick border border-white/[0.06] border-t-white/[0.12] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between text-caption font-mono text-white/60">
                          <span className="tracking-[0.14em] uppercase text-caption font-bold">AJUSTES TONALES DSP</span>
                          <button
                            onClick={() => {
                              setThreeBandGain('bass', 0);
                              setThreeBandGain('mids', 0);
                              setThreeBandGain('treble', 0);
                            }}
                            className="min-h-11 px-2.5 rounded-control text-white/60 hover:text-white hover:underline transition-colors text-caption flex items-center justify-center cursor-pointer"
                            title="Restablecer ecualizador a 0 dB"
                            aria-label="Restablecer ecualizador a 0 dB"
                          >
                            Restablecer (0 dB)
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Bass */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-caption text-white/70 font-mono">Bajos</span>
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={1}
                              value={threeBandEQ.bass}
                              onChange={(e) => setThreeBandGain('bass', parseFloat(e.target.value))}
                              className="w-full min-h-11 h-11 bg-white/10 rounded-pill appearance-none accent-white cursor-pointer transition-all hover:bg-white/25"
                              title={`Bajos: ${threeBandEQ.bass} dB`}
                              aria-label={`Bajos: ${threeBandEQ.bass} dB`}
                            />
                            <span className="text-caption font-mono text-white/80 font-tabular">
                              {threeBandEQ.bass > 0 ? `+${threeBandEQ.bass}` : threeBandEQ.bass} dB
                            </span>
                          </div>

                          {/* Mids */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-caption text-white/70 font-mono">Medios</span>
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={1}
                              value={threeBandEQ.mids}
                              onChange={(e) => setThreeBandGain('mids', parseFloat(e.target.value))}
                              className="w-full min-h-11 h-11 bg-white/10 rounded-pill appearance-none accent-white cursor-pointer transition-all hover:bg-white/25"
                              title={`Medios: ${threeBandEQ.mids} dB`}
                              aria-label={`Medios: ${threeBandEQ.mids} dB`}
                            />
                            <span className="text-caption font-mono text-white/80 font-tabular">
                              {threeBandEQ.mids > 0 ? `+${threeBandEQ.mids}` : threeBandEQ.mids} dB
                            </span>
                          </div>

                          {/* Treble */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-caption text-white/70 font-mono">Agudos</span>
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={1}
                              value={threeBandEQ.treble}
                              onChange={(e) => setThreeBandGain('treble', parseFloat(e.target.value))}
                              className="w-full min-h-11 h-11 bg-white/10 rounded-pill appearance-none accent-white cursor-pointer transition-all hover:bg-white/25"
                              title={`Agudos: ${threeBandEQ.treble} dB`}
                              aria-label={`Agudos: ${threeBandEQ.treble} dB`}
                            />
                            <span className="text-caption font-mono text-white/80 font-tabular">
                              {threeBandEQ.treble > 0 ? `+${threeBandEQ.treble}` : threeBandEQ.treble} dB
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              {/* ── 2. SEARCH TAB (Filtro Canciones / Playlists del Artista) ──── */}
              <div className={activeTab === 'search' ? 'flex flex-col gap-2.5' : 'hidden'}>
                {/* Selector de Filtro: Canciones vs Playlists */}
                <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-card border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('video');
                      if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'video');
                    }}
                    className={`flex-1 min-h-11 py-2 px-3 rounded-control text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      searchFilter === 'video'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" /> Canciones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('playlist');
                      if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'playlist');
                    }}
                    className={`flex-1 min-h-11 py-2 px-3 rounded-control text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      searchFilter === 'playlist'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ListMusic className="w-3.5 h-3.5" /> Playlists del Artista
                  </button>
                </div>

                {/* YouTube Search Bar */}
                <div className="flex flex-col gap-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
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
                      className="w-full min-h-11 pl-9 pr-11 py-2 bg-white/[0.05] border border-white/10 rounded-control text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all font-mono"
                      aria-label="Buscar música en YouTube"
                    />
                    {isSearching ? (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin pointer-events-none" />
                    ) : searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="min-h-11 min-w-11 absolute right-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white rounded-control flex items-center justify-center cursor-pointer"
                        title="Limpiar búsqueda"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="w-4 h-4" />
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
                          className="group min-h-11 flex items-center justify-between p-2 rounded-card bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/15 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative w-10 h-10 rounded-control overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
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
                                <span className="text-caption font-semibold text-white truncate group-hover:text-cyan-300 transition-colors text-scrim-3d">
                                  {item.title}
                                </span>
                                {isPlaylist && (
                                  <span className="text-caption font-mono px-1 py-0.5 rounded-badge bg-cyan-500/20 text-cyan-300 shrink-0 font-bold">
                                    PLAYLIST
                                  </span>
                                )}
                              </div>
                              <span className="text-caption text-slate-300 font-mono truncate font-medium">
                                {item.artist}
                              </span>
                            </div>
                          </div>

                          <span className="text-caption font-mono text-slate-400 font-medium group-hover:text-white/70 flex-shrink-0 ml-2 font-tabular">
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
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06] min-h-11">
                  <span className="text-caption font-mono text-rose-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> Canciones Favoritas ({favorites.length})
                  </span>
                  {favorites.length > 0 && (
                    <button
                      onClick={handleClearFavorites}
                      className="min-h-11 px-3 py-1.5 rounded-control flex items-center gap-1 text-caption font-mono text-rose-400/80 hover:text-rose-300 transition-colors hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                      title="Eliminar todas las canciones favoritas guardadas"
                      aria-label="Vaciar canciones favoritas"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Vaciar
                    </button>
                  )}
                </div>

                {favorites.length === 0 ? (
                  <div className="py-8 text-center text-caption font-mono text-white/40 flex flex-col items-center gap-2">
                    <Heart className="w-8 h-8 text-white/15" />
                    <span>No tienes canciones guardadas aún</span>
                    <span className="text-caption text-white/30">Toca el corazón en cualquier tema para guardarlo</span>
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
                        className="group min-h-11 flex items-center justify-between p-2 rounded-card bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/15 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-10 h-10 rounded-control overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
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
                            <span className="text-caption text-white font-semibold truncate group-hover:text-rose-300 transition-colors text-scrim-3d">
                              {fav.title}
                            </span>
                            <span className="text-caption text-slate-300 font-mono truncate font-medium">
                              {fav.artist}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-caption font-mono text-white/40 font-tabular">
                            {formatTime(fav.duration)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(fav);
                            }}
                            className="min-h-11 min-w-11 p-2 text-rose-500 hover:text-rose-400 rounded-control hover:bg-rose-500/10 transition-colors flex items-center justify-center cursor-pointer"
                            title="Quitar de favoritos"
                            aria-label="Quitar de favoritos"
                          >
                            <Heart className="w-4 h-4 fill-rose-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 3. QUEUE TAB (Dynamic 50+ Infinite Queue & History) ───── */}
              <div className={activeTab === 'queue' ? 'flex flex-col gap-2' : 'hidden'}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06] min-h-11">
                    <div className="flex items-center gap-1.5">
                      <span className="text-caption font-mono text-white/80 font-bold">
                        Cola de reproducción ({queue.length})
                      </span>
                      <span className="text-caption font-mono px-1.5 py-0.5 rounded-badge bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> 50+ Auto
                      </span>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-11 px-3 py-1.5 rounded-control flex items-center gap-1 text-caption font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                      title="Subir archivo de audio local"
                      aria-label="Subir archivo de audio local"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir archivo
                    </button>
                  </div>

                  {queue.length === 0 ? (
                    <div className="py-10 text-center text-caption font-mono text-white/30 flex flex-col items-center gap-2">
                      <Music className="w-6 h-6 text-white/20" />
                      <span>No hay pistas en la cola actual</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-11 mt-1 px-4 py-2 rounded-control bg-white/10 hover:bg-white/15 text-white text-caption font-mono transition-colors flex items-center justify-center cursor-pointer"
                        title="Cargar archivo local"
                        aria-label="Cargar archivo local"
                      >
                        Cargar archivo local
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                      {/* Recientes antes de la actual */}
                      {queueIndex > 0 && (
                        <div className="text-caption font-mono text-white/40 uppercase tracking-wider px-1 pt-1 pb-0.5 flex items-center justify-between">
                          <span>Historial Reciente ({queueIndex})</span>
                          <span className="text-caption text-white/30">Escuchadas</span>
                        </div>
                      )}

                      {queue.map((track, idx) => {
                        const isCurrent = idx === queueIndex;
                        const isPast = idx < queueIndex;
                        return (
                          <React.Fragment key={track.id || `${idx}_${track.title}`}>
                            {isCurrent && (
                              <div className="text-caption font-mono text-cyan-400 uppercase tracking-wider px-1 pt-1.5 pb-0.5 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Sonando Ahora
                                </span>
                              </div>
                            )}

                            {idx === queueIndex + 1 && (
                              <div className="text-caption font-mono text-white/40 uppercase tracking-wider px-1 pt-2 pb-0.5 flex items-center justify-between">
                                <span>A Continuación ({queue.length - queueIndex - 1})</span>
                                <span className="text-caption text-cyan-400/70 flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5" /> Radio Infinita
                                </span>
                              </div>
                            )}

                            <div
                              onClick={async () => {
                                usePlayerStore.setState({ queueIndex: idx });
                                await playTrack(track);
                              }}
                              className={`min-h-11 flex items-center justify-between p-2 rounded-card transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-white font-medium shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                                  : isPast
                                  ? 'bg-white/[0.015] hover:bg-white/[0.05] text-white/40 hover:text-white/70 border border-transparent'
                                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.03] hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative w-8 h-8 rounded-control overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
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
                                      <div className="w-2.5 h-2.5 rounded-pill bg-cyan-400 animate-ping" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col min-w-0 pr-1">
                                  <span className={`text-caption truncate text-scrim-3d ${isCurrent ? 'text-cyan-300 font-bold' : 'text-white font-semibold'}`}>
                                    {track.title}
                                  </span>
                                  <span className="text-caption text-slate-300 font-mono truncate font-medium">
                                    {track.artist}
                                  </span>
                                </div>
                              </div>

                              <span className="text-caption font-mono text-slate-300 font-medium ml-2 flex-shrink-0 font-tabular">
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
                <div className="p-2.5 rounded-card bg-rose-500/15 border border-rose-500/30 text-caption font-mono text-rose-300">
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
