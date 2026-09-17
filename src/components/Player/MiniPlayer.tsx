/**
 * MiniPlayer — Apple Liquid Glass Floating Dock (Aura3D / Auralis Studio)
 *
 * Design System:
 *  - Apple Human Interface Guidelines / visionOS Liquid Glass aesthetic
 *  - Dynamic backdrop-blur-3xl with frosted glass materials and specular highlights
 *  - iOS Segmented Control with Framer Motion spring layout animations
 *  - Hero tactile controls with active:scale-95 feedback
 *  - Progressive disclosure: Studio tools (3-Band EQ, Sleep Timer, Backup) tucked inside an elegant drawer
 *  - Single Source of Truth: useAudioPlayer + Zustand playerStore + Web Audio API
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Mic,
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
const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// ── Live Liquid Audio Equalizer Dancing Bars ──────────────────────────────────
const LiquidLiveBars: React.FC<{ isPlaying: boolean; color?: string }> = ({
  isPlaying,
  color = '#00e5ff',
}) => {
  return (
    <div className="flex items-end gap-[2px] h-3.5 w-3.5 flex-shrink-0" aria-hidden="true">
      <span
        className={`w-[2.5px] rounded-full transition-all duration-200 ${
          isPlaying ? 'animate-pulse h-3' : 'h-1 opacity-30'
        }`}
        style={{ backgroundColor: color, animationDuration: '600ms' }}
      />
      <span
        className={`w-[2.5px] rounded-full transition-all duration-200 ${
          isPlaying ? 'animate-pulse h-3.5' : 'h-1.5 opacity-30'
        }`}
        style={{ backgroundColor: color, animationDuration: '420ms' }}
      />
      <span
        className={`w-[2.5px] rounded-full transition-all duration-200 ${
          isPlaying ? 'animate-pulse h-2' : 'h-1 opacity-30'
        }`}
        style={{ backgroundColor: color, animationDuration: '780ms' }}
      />
    </div>
  );
};

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
    const barCount = 32;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const raw = freqData?.raw || [];
      const step = raw.length > 0 ? Math.floor(raw.length / barCount) : 1;
      const barWidth = width / barCount - 1.5;

      for (let i = 0; i < barCount; i++) {
        const rawVal =
          isPlaying && raw.length > 0
            ? raw[i * step] / 255
            : 0.12 + Math.sin(i * 0.35) * 0.05;
        const barHeight = Math.max(2.5, rawVal * (height - 3));
        const x = i * (barWidth + 1.5);
        const y = (height - barHeight) / 2;

        const isPlayed = (x / width) * 100 <= progress;
        ctx.fillStyle = isPlayed ? activeColor : 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, Math.max(1, barWidth), barHeight, 1.5);
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
      width={260}
      height={18}
      className="w-full h-full pointer-events-none rounded-full"
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

  // ── Selective Theme & Global UI state ───────────────────────────────────────
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const favorites = usePlayerStore((s) => s.favorites);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const threeBandEQ = usePlayerStore((s) => s.threeBandEQ);
  const setThreeBandGain = usePlayerStore((s) => s.setThreeBandGain);
  const isMiniPlayerOpen = usePlayerStore((s) => s.isMiniPlayerOpen);
  const setMiniPlayerOpen = usePlayerStore((s) => s.setMiniPlayerOpen);
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const sleepTimerRemainingSec = usePlayerStore((s) => s.sleepTimerRemainingSec);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);
  const isBlobPanelOpen = usePlayerStore((s) => s.isBlobPanelOpen);
  const setBlobPanelOpen = usePlayerStore((s) => s.setBlobPanelOpen);

  const handleToggleLyrics = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = !isLyricsOpen;
    setLyricsOpen(next);
    if (next) {
      if (isBlobPanelOpen) {
        setBlobPanelOpen(false);
      }
      if (window.innerWidth < 768 && isExpanded) {
        setIsExpanded(false);
      }
    }
  };

  // ── Local Component State ──────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'favorites'>('player');
  const [showVideoView, setShowVideoView] = useState(true);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'video' | 'playlist'>('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Clear Favorites ────────────────────────────────────────────────────────
  const handleClearFavorites = () => {
    if (favorites.length === 0) return;
    if (window.confirm('¿Deseas vaciar todas tus canciones favoritas de la lista?')) {
      usePlayerStore.setState({ favorites: [] });
      StorageService.saveFavorites([]);
    }
  };

  // ── Backup JSON Handlers ───────────────────────────────────────────────────
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
        (t) =>
          t.id === currentTrack.id ||
          (Boolean(currentTrack.youtubeId) && t.youtubeId === currentTrack.youtubeId)
      )
    : false;

  // ── Debounce Search Effect (300ms) ──────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'search') {
      searchYouTube(searchQuery, false, searchFilter);
    }
  }, [searchQuery, activeTab, searchFilter, searchYouTube]);

  // ── Interactive Seek Handlers ───────────────────────────────────────────────
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleSeekMouseUp = (
    e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>
  ) => {
    setIsScrubbing(false);
    const val = parseFloat((e.currentTarget as HTMLInputElement).value);
    seek(val);
  };

  // ── Volume Handler ─────────────────────────────────────────────────────────
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  // ── YouTube Track Selection ────────────────────────────────────────────────
  const handleSelectYouTubeTrack = async (item: YouTubeSearchResult) => {
    setLoadingTrackId(item.id);
    try {
      if (item.type === 'playlist') {
        setActiveTab('player');
        await loadYouTubePlaylist(item.id, item.title, item.artist);
        return;
      }

      const track = await loadYouTubeTrack(item.id, {
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
      });
      setActiveTab('player');

      const currentQueue = usePlayerStore.getState().queue;
      const currentIndex = usePlayerStore.getState().queueIndex;
      const recentHistory = currentQueue.slice(Math.max(0, currentIndex - 25), currentIndex + 1);

      const baseQueue =
        recentHistory.length > 0 && recentHistory[recentHistory.length - 1].id === track.id
          ? recentHistory
          : [...recentHistory.filter((t) => t.id !== track.id), track];
      const newIndex = baseQueue.length - 1;
      setQueue(baseQueue, newIndex);

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
  const isVideoTrack = Boolean(
    currentTrack &&
      (sourceType === 'youtube' ||
        Boolean(currentTrack.youtubeId) ||
        currentTrack.id?.startsWith('yt_'))
  );

  useEffect(() => {
    if (isVideoTrack) {
      setShowVideoView(true);
    }
  }, [currentTrack?.id, isVideoTrack]);

  // ── Effective Time for Scrubber ────────────────────────────────────────────
  const displayCurrentTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (displayCurrentTime / duration) * 100 : 0;

  // ── Accent Color Resolution ────────────────────────────────────────────────
  const accentColor = isLucid ? lucidTheme.primary : '#00e5ff';

  // ── Source Badge (Ultra-Clean Liquid Glass Micro-Pill) ──────────────────────
  const sourceBadge = useMemo(() => {
    switch (sourceType) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-red-500/15 text-red-300 border border-red-500/20 backdrop-blur-md">
            <YouTubeIcon className="w-2.5 h-2.5 text-red-400" />
            YouTube
          </span>
        );
      case 'spotify':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 backdrop-blur-md">
            <Music className="w-2.5 h-2.5 text-emerald-400" />
            Spotify
          </span>
        );
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 backdrop-blur-md">
            <Disc3 className="w-2.5 h-2.5 text-cyan-400" />
            Local
          </span>
        );
      case 'mic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-purple-500/15 text-purple-300 border border-purple-500/20 backdrop-blur-md">
            <Radio className="w-2.5 h-2.5 text-purple-400" />
            Mic
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-tight bg-white/10 text-white/70 border border-white/[0.08] backdrop-blur-md">
            <Music className="w-2.5 h-2.5" />
            Audio
          </span>
        );
    }
  }, [sourceType]);

  // ── Common Liquid Glass Panel CSS Styles ───────────────────────────────────
  const liquidGlassClass = 'liquid-glass';

  if (!isMiniPlayerOpen) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. MODO ZEN: Píldora Flotante Ultra-Minimalista (Apple Micro-Pill)      */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isZenMode && !isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-6 left-5 z-50 pointer-events-auto select-none"
          >
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full liquid-glass liquid-glass-micro`}
              style={{
                borderColor: isLucid ? `${lucidTheme.borderColor}` : undefined,
                boxShadow: isLucid
                  ? `0 16px 40px rgba(0,0,0,0.8), 0 0 16px ${lucidTheme.glow}`
                  : undefined,
              }}
            >
              <LiquidLiveBars isPlaying={isPlaying} color={accentColor} />

              <span className="text-xs font-bold text-white tracking-tight truncate max-w-[130px]">
                {title}
              </span>

              <button
                onClick={togglePlay}
                className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-transform shadow-md"
                style={isLucid ? { backgroundColor: lucidTheme.primary } : undefined}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => setIsZenMode(false)}
                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Expandir a dock estándar"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. MODO COLAPSADO: Dock Flotante de Cristal Líquido (Liquid Glass Dock)  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isExpanded && !isZenMode && (
          <motion.div
            initial={{ opacity: 0, x: -25, scale: 0.94, filter: 'blur(12px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, scale: 0.95, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-6 left-5 z-50 pointer-events-auto select-none"
          >
            <div
              onClick={() => setIsExpanded(true)}
              className={`group relative flex items-center justify-between gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] cursor-pointer liquid-glass ${
                isVideoTrack
                  ? 'rounded-2xl max-w-[335px] sm:max-w-[365px] liquid-glass-card shadow-2xl px-3 py-2 border border-white/20 border-t-white/35'
                  : 'rounded-full max-w-[270px] sm:max-w-[280px] liquid-glass-pill px-2.5 py-1.5'
              }`}
              style={{
                borderColor: isLucid ? lucidTheme.borderColor : undefined,
                boxShadow: isLucid
                  ? `0 20px 50px rgba(0,0,0,0.85), 0 0 16px ${lucidTheme.glow}`
                  : undefined,
              }}
            >
              {/* Ultra-subtle bottom progress line */}
              <div
                className="absolute left-3 right-3 bottom-0.5 h-[1.5px] rounded-full overflow-hidden bg-white/[0.08]"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                    backgroundColor: accentColor,
                    boxShadow: `0 0 6px ${accentColor}`,
                  }}
                />
              </div>

              {/* Left: Video Preview Window (when video track) or Album Vinyl Artwork (when audio) */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
                {isVideoTrack ? (
                  /* 16:9 Squircle Video Preview Window */
                  <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 shadow-xl ring-1 ring-white/25 bg-black group/video">
                    <GlobalYouTubePlayer
                      showVideoInPlayer={!isExpanded && !isZenMode && isVideoTrack}
                      className="w-full h-full object-cover"
                      borderRadius="12px"
                    />
                    {/* Live Video Indicator Badge */}
                    <div className="absolute bottom-1 left-1 z-[9005] flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
                      <span className="text-[8px] font-mono text-white/90 font-bold tracking-tight">VIDEO</span>
                    </div>
                    {/* Expand Video PiP hover button */}
                    <div className="absolute top-1 right-1 z-[9005] opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(true);
                        }}
                        className="p-1 rounded-md bg-black/70 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/25 active:scale-95 transition-all shadow"
                        title="Expandir reproductor completo"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Audio-only: Album Artwork with Spinning Vinyl Illusion */
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md ring-1 ring-white/20 bg-slate-900 group-hover:ring-white/40 transition-all">
                    <img
                      src={coverUrl}
                      alt={title}
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isPlaying ? 'scale-105' : 'scale-100 opacity-90'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                      }}
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-[0.5px]">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-bold text-white tracking-tight truncate ${isVideoTrack ? 'max-w-[100px] sm:max-w-[125px]' : 'max-w-[95px] sm:max-w-[110px]'}`}>
                      {title}
                    </span>
                    {sourceBadge}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-white/50 font-medium tracking-tight truncate">
                      {artist}
                    </span>
                    {isVideoTrack && <LiquidLiveBars isPlaying={isPlaying} color={accentColor} />}
                  </div>
                </div>
              </div>

              {/* Right: Tactile Quick Controls */}
              <div
                className="flex items-center gap-1 relative z-10 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Favorite toggle */}
                {currentTrack && (
                  <button
                    onClick={() => toggleFavorite(currentTrack)}
                    className={`p-1.5 rounded-full transition-all active:scale-90 ${
                      isCurrentFav
                        ? 'text-rose-400 bg-rose-500/15'
                        : 'text-white/40 hover:text-rose-300 hover:bg-white/10'
                    }`}
                    title={isCurrentFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                )}

                {/* Hero Play Button */}
                <button
                  onClick={togglePlay}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-transform shadow-md"
                  style={isLucid ? { backgroundColor: lucidTheme.primary } : undefined}
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <Pause className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <Play className="w-2.5 h-2.5 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Zen Mode Button */}
                <button
                  onClick={() => setIsZenMode(true)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Activar Modo Zen"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>

                {/* Lyrics Button */}
                <button
                  onClick={handleToggleLyrics}
                  className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 border ${
                    isLyricsOpen
                      ? 'text-cyan-300 bg-cyan-500/25 border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                      : 'text-white/40 hover:text-white hover:bg-white/10 border-transparent'
                  }`}
                  style={
                    isLucid && isLyricsOpen
                      ? {
                          color: lucidTheme.primary,
                          backgroundColor: `${lucidTheme.primary}25`,
                          borderColor: `${lucidTheme.primary}50`,
                          boxShadow: `0 0 10px ${lucidTheme.glow}`,
                        }
                      : undefined
                  }
                  title={isLyricsOpen ? 'Cerrar letras sincronizadas' : 'Ver letras sincronizadas'}
                  aria-label="Letras sincronizadas"
                >
                  <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Expand Chevron */}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Abrir reproductor completo"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 3. MODO EXPANDIDO: Consola Flotante Apple Liquid Glass (visionOS Deck)  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -30, y: 15, scale: 0.92, filter: 'blur(16px)' }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, y: 15, scale: 0.92, filter: 'blur(12px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-6 left-5 z-50 w-[92vw] max-w-[290px] sm:max-w-[300px] pointer-events-auto select-none"
          >
            <div
              className={`flex flex-col rounded-[20px] overflow-hidden liquid-glass liquid-glass-card`}
              style={{
                borderColor: isLucid ? lucidTheme.borderColor : undefined,
                boxShadow: isLucid
                  ? `0 28px 70px rgba(0,0,0,0.9), 0 0 20px ${lucidTheme.glow}`
                  : undefined,
              }}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="text-[11px] font-bold tracking-wider uppercase text-white/80">
                    Aura Player
                  </span>
                  {sourceBadge}
                </div>

                <div className="flex items-center gap-1">
                  {/* Lyrics Toggle Button */}
                  <button
                    onClick={() => handleToggleLyrics()}
                    className={`p-1.5 rounded-full transition-all active:scale-95 border ${
                      isLyricsOpen
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                        : 'text-white/50 hover:text-white hover:bg-white/10 border-transparent'
                    }`}
                    style={
                      isLucid && isLyricsOpen
                        ? {
                            color: lucidTheme.primary,
                            backgroundColor: `${lucidTheme.primary}25`,
                            borderColor: `${lucidTheme.primary}50`,
                            boxShadow: `0 0 10px ${lucidTheme.glow}`,
                          }
                        : undefined
                    }
                    title={isLyricsOpen ? 'Cerrar letras sincronizadas' : 'Ver letras sincronizadas'}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>

                  {/* Studio Tools Drawer Toggle */}
                  <button
                    onClick={() => setShowToolsDrawer(!showToolsDrawer)}
                    className={`p-1.5 rounded-full transition-colors ${
                      showToolsDrawer
                        ? 'bg-white/20 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                    title="Ajustes de estudio (EQ, Temporizador, Respaldo)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Collapse Button */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title="Minimizar a píldora"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Close MiniPlayer Button */}
                  <button
                    onClick={() => setMiniPlayerOpen(false)}
                    className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title="Cerrar consola MiniPlayer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* iOS Segmented Control (Tabs) */}
              <div className="px-4 py-1">
                <div className="relative flex items-center p-1 rounded-full bg-black/40 border border-white/[0.08] backdrop-blur-xl">
                  {(
                    [
                      { id: 'player', label: 'PISTA', icon: Disc3 },
                      { id: 'search', label: 'BUSCADOR', icon: Search },
                      { id: 'queue', label: `COLA (${queue.length})`, icon: ListMusic },
                      { id: 'favorites', label: `FAVS (${favorites.length})`, icon: Heart },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.id === 'search') {
                            setTimeout(() => searchInputRef.current?.focus(), 120);
                          }
                        }}
                        className={`relative flex-1 py-1.5 text-[10px] font-semibold tracking-tight transition-colors flex items-center justify-center gap-1 rounded-full z-10 ${
                          isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeSegmentedPill"
                            className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-md border border-white/25 shadow-sm"
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                          />
                        )}
                        <Icon className="w-3 h-3 relative z-10" />
                        <span className="relative z-10 truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progressive Disclosure: Studio Tools Collapsible Drawer */}
              <AnimatePresence>
                {showToolsDrawer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    className="overflow-hidden px-4 pt-2 border-b border-white/[0.08] bg-black/30"
                  >
                    <div className="pb-3 flex flex-col gap-2.5">
                      {/* Section Title & Reset */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                        <span className="uppercase tracking-widest text-[9px] font-bold text-cyan-300/80">
                          Ajustes Tonales DSP (3-Band EQ)
                        </span>
                        <button
                          onClick={() => {
                            setThreeBandGain('bass', 0);
                            setThreeBandGain('mids', 0);
                            setThreeBandGain('treble', 0);
                          }}
                          className="hover:text-white underline transition-colors"
                        >
                          Reset (0 dB)
                        </button>
                      </div>

                      {/* 3-Band Sliders */}
                      <div className="grid grid-cols-3 gap-2 py-1">
                        {(['bass', 'mids', 'treble'] as const).map((band) => (
                          <div key={band} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-white/70 font-medium capitalize">
                              {band === 'bass' ? 'Bajos' : band === 'mids' ? 'Medios' : 'Agudos'}
                            </span>
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={1}
                              value={threeBandEQ[band]}
                              onChange={(e) => setThreeBandGain(band, parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/15 rounded-full appearance-none accent-white cursor-pointer"
                            />
                            <span className="text-[9px] font-mono text-white/60">
                              {threeBandEQ[band] > 0 ? `+${threeBandEQ[band]}` : threeBandEQ[band]} dB
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Sleep Timer & Backup Tools Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                        {/* Sleep timer */}
                        <div className="flex items-center gap-1.5">
                          <Moon className="w-3 h-3 text-amber-300/80" />
                          <span className="text-[10px] text-white/60">Sleep:</span>
                          {sleepTimerMinutes > 0 ? (
                            <button
                              onClick={() => setSleepTimer(0)}
                              className="text-[10px] text-amber-300 font-bold hover:underline font-mono"
                              title="Cancelar temporizador"
                            >
                              {formatTime(sleepTimerRemainingSec)}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              {[15, 30, 60].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => setSleepTimer(m)}
                                  className="text-[10px] text-white/60 hover:text-white px-1.5 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/15 transition-colors font-mono"
                                >
                                  {m}m
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Backup JSON */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleExportJSON}
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                            title="Exportar respaldo JSON"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => jsonImportInputRef.current?.click()}
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                            title="Restaurar respaldo JSON"
                          >
                            <Upload className="w-3 h-3" />
                          </button>
                          <input
                            ref={jsonImportInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportJSON}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Body Container */}
              <div className="p-4 flex flex-col gap-3 max-h-[62vh] overflow-y-auto custom-scrollbar">
                {/* ─────────────────────────────────────────────────────────────────────── */}
                {/* TAB 1: PISTA (Hero Apple-Style Player)                                 */}
                {/* ─────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'player' && (
                  <div className="flex flex-col gap-3.5">
                    {/* Video Mode View */}
                    {isVideoTrack && showVideoView ? (
                      <div className="flex flex-col gap-2.5">
                        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black">
                          <GlobalYouTubePlayer
                            showVideoInPlayer={isExpanded && activeTab === 'player' && showVideoView}
                            borderRadius="16px"
                          />
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <button
                            onClick={() => setShowVideoView(false)}
                            className="text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 transition-colors"
                          >
                            Ver Carátula
                          </button>
                          {currentTrack?.youtubeId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-white/50 hover:text-white flex items-center gap-1"
                            >
                              YouTube <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Apple Liquid Glass Artwork & Rotating Vinyl */
                      <div className="flex flex-col items-center gap-3 pt-1">
                        <div className="relative flex items-center justify-center">
                          {/* Ambient Glow */}
                          <div
                            className="absolute -inset-2 rounded-3xl opacity-60 blur-xl pointer-events-none transition-opacity duration-700"
                            style={{
                              background: `radial-gradient(circle, ${accentColor} 0%, rgba(168,85,247,0.2) 70%, transparent 100%)`,
                            }}
                          />

                          {/* Grooved Vinyl Slide-Out */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-700 ease-out pointer-events-none flex items-center justify-center ${
                              isPlaying
                                ? 'translate-x-8 sm:translate-x-10 opacity-100'
                                : 'translate-x-0 opacity-0'
                            }`}
                            style={{
                              background:
                                'repeating-radial-gradient(circle, #0a0a0f 0px, #14141c 2px, #08080c 3px, #1a1a26 5px)',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.9)',
                              zIndex: 0,
                            }}
                          >
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden border border-white/20 flex items-center justify-center ${
                                isPlaying ? 'animate-spin' : ''
                              }`}
                              style={{ animationDuration: '2.5s' }}
                            >
                              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute w-2 h-2 rounded-full bg-black border border-white/60" />
                            </div>
                          </div>

                          {/* Main Rounded Album Sleeve */}
                          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 group">
                            <img
                              src={coverUrl}
                              alt={title}
                              className={`w-full h-full object-cover transition-transform duration-700 ${
                                isPlaying ? 'scale-105' : 'scale-100 opacity-90'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                              }}
                            />
                            {isVideoTrack && (
                              <button
                                onClick={() => setShowVideoView(true)}
                                className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Ver video"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Track Info */}
                        <div className="flex flex-col items-center text-center w-full px-2 mt-1">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate w-full">
                            {title}
                          </h3>
                          <p className="text-xs font-medium text-white/60 tracking-tight truncate w-full mt-0.5">
                            {artist}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar & Real-time Live Spectrum Waveform */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="relative w-full h-5 rounded-full bg-black/40 border border-white/10 px-2 flex items-center shadow-inner cursor-pointer group">
                        <MiniWaveform
                          progress={progressPercent}
                          activeColor={accentColor}
                          isPlaying={isPlaying}
                        />
                        <input
                          type="range"
                          min={0}
                          max={duration > 0 ? duration : 100}
                          step={0.1}
                          value={displayCurrentTime}
                          onChange={handleSeekChange}
                          onMouseDown={handleSeekMouseDown}
                          onTouchStart={handleSeekMouseDown}
                          onMouseUp={handleSeekMouseUp}
                          onTouchEnd={handleSeekMouseUp}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                          title="Arrastra para avanzar o retroceder"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 px-1">
                        <span>{formatTime(displayCurrentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Primary Hero Transport Controls */}
                    <div className="flex items-center justify-between px-2 pt-1">
                      {/* Shuffle */}
                      <button
                        onClick={toggleShuffle}
                        className={`p-2 rounded-full transition-colors ${
                          isShuffled ? 'text-cyan-400 bg-cyan-500/15' : 'text-white/40 hover:text-white'
                        }`}
                        title="Modo aleatorio"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>

                      {/* Prev */}
                      <button
                        onClick={playPrevious}
                        className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all"
                        title="Pista anterior"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>

                      {/* Hero Central Play Button */}
                      <button
                        onClick={togglePlay}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_24px_rgba(255,255,255,0.4)]"
                        style={isLucid ? { backgroundColor: lucidTheme.primary } : undefined}
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
                        className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all"
                        title="Siguiente pista"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>

                      {/* Repeat */}
                      <button
                        onClick={cycleRepeat}
                        className={`p-2 rounded-full transition-colors ${
                          repeatMode !== 'off'
                            ? 'text-cyan-400 bg-cyan-500/15'
                            : 'text-white/40 hover:text-white'
                        }`}
                        title={`Repetir: ${repeatMode}`}
                      >
                        {repeatMode === 'one' ? (
                          <Repeat1 className="w-4 h-4" />
                        ) : (
                          <Repeat className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Volume Slider (iOS Style) */}
                    <div className="flex items-center gap-2.5 px-2 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={toggleMute}
                        className="text-white/50 hover:text-white transition-colors"
                        title={isMuted ? 'Activar sonido' : 'Silenciar'}
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
                        className="flex-1 h-1 hover:h-1.5 bg-white/15 rounded-full appearance-none accent-white cursor-pointer transition-all"
                        title={`Volumen: ${Math.round(volume * 100)}%`}
                      />
                      <span className="text-[10px] font-mono text-white/50 w-7 text-right">
                        {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                      </span>
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────────────── */}
                {/* TAB 2: BUSCADOR (Spotlight Search)                                     */}
                {/* ─────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'search' && (
                  <div className="flex flex-col gap-2.5">
                    {/* Search Filter: Canciones vs Playlists */}
                    <div className="flex items-center gap-1 p-1 bg-black/40 rounded-full border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchFilter('video');
                          if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'video');
                        }}
                        className={`flex-1 py-1 rounded-full text-[10px] font-semibold transition-all ${
                          searchFilter === 'video'
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-white/40 hover:text-white'
                        }`}
                      >
                        Canciones
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchFilter('playlist');
                          if (searchQuery.trim().length >= 2) searchYouTube(searchQuery, true, 'playlist');
                        }}
                        className={`flex-1 py-1 rounded-full text-[10px] font-semibold transition-all ${
                          searchFilter === 'playlist'
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-white/40 hover:text-white'
                        }`}
                      >
                        Playlists
                      </button>
                    </div>

                    {/* Spotlight-Style Search Bar */}
                    <div className="relative flex items-center">
                      <Search className="absolute left-3.5 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar en YouTube Music..."
                        className="w-full pl-9 pr-8 py-2 rounded-full bg-white/[0.07] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/[0.12] transition-all"
                      />
                      {isSearching ? (
                        <Loader2 className="absolute right-3.5 w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      ) : searchQuery ? (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 text-white/40 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {/* Results List */}
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {isSearching && searchResults.length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/40 text-xs font-mono">
                          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                          <span>Buscando resultados...</span>
                        </div>
                      )}

                      {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div className="py-8 text-center text-xs text-white/40 font-mono">
                          No se encontraron resultados para "{searchQuery}"
                        </div>
                      )}

                      {!searchQuery && (
                        <div className="py-8 text-center text-xs text-white/30 flex flex-col items-center gap-1">
                          <Sparkles className="w-5 h-5 text-white/20" />
                          <span>Escribe para buscar música o playlists</span>
                        </div>
                      )}

                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectYouTubeTrack(item)}
                          className="group flex items-center justify-between p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/15 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
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
                                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Play className="w-3 h-3 text-white fill-current" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-white/50 truncate">
                                {item.artist}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-white/40 group-hover:text-white/70 ml-2">
                            {item.type === 'playlist' ? item.videoCount || 'Lista' : formatTime(item.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────────────────── */}
                {/* TAB 3: COLA (Queue & 50+ Infinite Radio)                                */}
                {/* ─────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'queue' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                        <ListMusic className="w-3.5 h-3.5 text-cyan-400" /> Cola ({queue.length})
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-[10px] font-medium text-cyan-300 hover:text-white transition-colors"
                      >
                        <Upload className="w-3 h-3" /> Subir archivo
                      </button>
                    </div>

                    {queue.length === 0 ? (
                      <div className="py-8 text-center text-xs text-white/40 flex flex-col items-center gap-2">
                        <Music className="w-6 h-6 text-white/20" />
                        <span>No hay canciones en la cola</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                        {queue.map((track, idx) => {
                          const isCurrent = idx === queueIndex;
                          return (
                            <div
                              key={track.id || `${idx}_${track.title}`}
                              onClick={async () => {
                                usePlayerStore.setState({ queueIndex: idx });
                                await playTrack(track);
                              }}
                              className={`flex items-center justify-between p-2 rounded-2xl transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-white shadow-sm'
                                  : 'bg-white/[0.02] hover:bg-white/[0.07] text-white/70 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                                  <img
                                    src={track.coverUrl || `https://img.youtube.com/vi/${track.youtubeId}/hqdefault.jpg`}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&q=80';
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col min-w-0 pr-1">
                                  <span className={`text-xs truncate ${isCurrent ? 'font-bold text-cyan-300' : 'font-medium text-white'}`}>
                                    {track.title}
                                  </span>
                                  <span className="text-[10px] text-white/50 truncate">
                                    {track.artist}
                                  </span>
                                </div>
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

                {/* ─────────────────────────────────────────────────────────────────────── */}
                {/* TAB 4: FAVORITOS (Favorites Saved Tracks)                             */}
                {/* ─────────────────────────────────────────────────────────────────────── */}
                {activeTab === 'favorites' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> Favoritos ({favorites.length})
                      </span>
                      {favorites.length > 0 && (
                        <button
                          onClick={handleClearFavorites}
                          className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Vaciar
                        </button>
                      )}
                    </div>

                    {favorites.length === 0 ? (
                      <div className="py-8 text-center text-xs text-white/40 flex flex-col items-center gap-2">
                        <Heart className="w-7 h-7 text-white/15" />
                        <span>No tienes favoritos guardados</span>
                        <span className="text-[10px] text-white/30">Toca el corazón en cualquier tema</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                        {favorites.map((fav) => (
                          <div
                            key={fav.id}
                            onClick={async () => {
                              const q = usePlayerStore.getState().queue;
                              const existingIdx = q.findIndex(
                                (t) =>
                                  t.id === fav.id ||
                                  (Boolean(fav.youtubeId) && t.youtubeId === fav.youtubeId)
                              );
                              if (existingIdx >= 0) {
                                usePlayerStore.setState({ queueIndex: existingIdx });
                              } else {
                                usePlayerStore.setState({ queue: [fav, ...q], queueIndex: 0 });
                              }
                              await playTrack(fav);
                            }}
                            className="group flex items-center justify-between p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                                <img
                                  src={fav.coverUrl || (fav.youtubeId ? `https://img.youtube.com/vi/${fav.youtubeId}/hqdefault.jpg` : '')}
                                  alt={fav.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&q=80';
                                  }}
                                />
                              </div>
                              <div className="flex flex-col min-w-0 pr-1">
                                <span className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                                  {fav.title}
                                </span>
                                <span className="text-[10px] text-white/50 truncate">
                                  {fav.artist}
                                </span>
                              </div>
                            </div>

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
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {audioError && (
                  <div className="p-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono text-rose-300">
                    {audioError}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MiniPlayer;
