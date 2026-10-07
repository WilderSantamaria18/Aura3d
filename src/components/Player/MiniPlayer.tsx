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
  ChevronDown,
  Loader2,
  ExternalLink,
  Music,
  Radio,
  Upload,
  Sparkles,
  Eye,
  Heart,
  Maximize2,
  Trash2,
  Moon,
  Download,
  SlidersHorizontal,
  RotateCw,
  Image as ImageIcon,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayer, type YouTubeSearchResult } from '../../hooks/useAudioPlayer';
import { usePlaybackLoop, formatClock } from '../../hooks/usePlaybackLoop';
import { GlobalYouTubePlayer } from './GlobalYouTubePlayer';
import { audioEngine } from '../../services/audioEngine';
import { StorageService } from '../../services/storageService';
import { StereoVuMeter } from './StereoVuMeter';
import { useChameleonPalette } from '../../hooks/useChameleonPalette';
import { HolographicAlbumSleeve } from './HolographicAlbumSleeve';

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


// ── Mini Waveform: espectro en vivo ──────────────────────────────────────────
// Rendimiento: el progreso llega por un bucle fuera de React (sin reiniciar nada en cada
// muestra de tiempo), el canvas tiene resolución real de pantalla y solo se anima mientras
// suena y la pestaña está visible; en pausa se dibuja una vez.
const MiniWaveform: React.FC<{
  activeColor: string;
  isPlaying: boolean;
}> = React.memo(({ activeColor, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const barCount = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  usePlaybackLoop(
    (time, duration) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { w, h, dpr } = sizeRef.current;
      if (w === 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const progress = duration > 0 ? (time / duration) * 100 : 0;
      const raw = isPlaying ? audioEngine.getFrequencyData()?.raw : undefined;
      const step = raw && raw.length > 0 ? Math.floor(raw.length / barCount) : 1;
      const gap = 1.5;
      const barWidth = Math.max(1, w / barCount - gap);

      // Dos pasadas (reproducido / pendiente) = dos fill en vez de 32
      for (const played of [false, true]) {
        ctx.fillStyle = played ? activeColor : 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap);
          if (((x / w) * 100 <= progress) !== played) continue;
          const rawVal = raw && raw.length > 0 ? raw[i * step] / 255 : 0.12 + Math.sin(i * 0.35) * 0.05;
          const bh = Math.max(2.5, rawVal * (h - 3));
          const y = (h - bh) / 2;
          if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, barWidth, bh, 1.5);
          else ctx.rect(x, y, barWidth, bh);
        }
        ctx.fill();
      }
    },
    isPlaying,
    30
  );

  return <canvas ref={canvasRef} className="w-full h-full pointer-events-none rounded-full" />;
});
MiniWaveform.displayName = 'MiniWaveform';

// ── Barra de búsqueda líquida + tooltip flotante de tiempo estilo píldora visionOS ──
const MiniSeekBar: React.FC<{
  accentColor: string;
  isPlaying: boolean;
  seek: (t: number) => void;
}> = React.memo(({ accentColor, isPlaying, seek }) => {
  const duration = usePlayerStore((s) => s.duration);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const barContainerRef = useRef<HTMLDivElement>(null);
  const liquidFillRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<{ x: number; time: number } | null>(null);

  const paint = (t: number) => {
    if (inputRef.current) inputRef.current.value = String(t);
    if (currentRef.current) currentRef.current.textContent = formatClock(t);
    const pct = duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0;
    if (liquidFillRef.current) {
      liquidFillRef.current.style.width = `${pct}%`;
    }
    if (playheadRef.current) {
      playheadRef.current.style.left = `${pct}%`;
    }
  };

  usePlaybackLoop(
    (t) => {
      if (!scrubbing.current) paint(t);
    },
    isPlaying,
    10
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barContainerRef.current || duration <= 0) return;
    const rect = barContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const time = (x / rect.width) * duration;
    setHoverInfo({ x, time });
  };

  const handlePointerLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div
        ref={barContainerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative w-full h-5 rounded-full bg-black/50 border border-white/10 px-2 flex items-center shadow-inner cursor-pointer group select-none transition-all duration-200 hover:border-white/25"
      >
        {/* Volumetric Liquid Glow Fill Bar */}
        <div
          ref={liquidFillRef}
          className="absolute left-0 top-0 bottom-0 rounded-full pointer-events-none transition-[width] duration-75 overflow-hidden"
          style={{
            width: '0%',
            background: `linear-gradient(90deg, ${accentColor}18 0%, ${accentColor}40 100%)`,
            boxShadow: `inset 0 1px 1px rgba(255,255,255,0.25), 0 0 14px ${accentColor}25`,
          }}
        >
          {/* Specular glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Live FFT Spectrum Waveform */}
        <MiniWaveform activeColor={accentColor} isPlaying={isPlaying} />

        {/* Luminous Playhead Pip */}
        <div
          ref={playheadRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border border-black/40 pointer-events-none z-10 transition-transform duration-150 group-hover:scale-125"
          style={{
            left: '0%',
            boxShadow: `0 0 10px ${accentColor}, 0 2px 4px rgba(0,0,0,0.6)`,
          }}
        />

        {/* Hover Laser Line Indicator */}
        {hoverInfo && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-white/80 pointer-events-none z-20 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
            style={{ left: `${hoverInfo.x}px` }}
          />
        )}

        {/* Floating Time Capsule Tooltip (visionOS Liquid Glass Pill with Mini Waveform) */}
        {hoverInfo && (
          <div
            className="absolute -top-9 -translate-x-1/2 pointer-events-none z-30 transition-transform duration-75 ease-out animate-in fade-in zoom-in-95"
            style={{ left: `${hoverInfo.x}px` }}
          >
            <div className="px-2.5 py-1 rounded-full bg-slate-950/90 backdrop-blur-xl border border-white/25 text-[10.5px] font-mono font-bold text-white flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
              {/* Mini audio spectrum preview bars */}
              <div className="flex items-end gap-[1.5px] h-3" aria-hidden="true">
                <span className="w-[1.5px] h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor, animationDuration: '400ms' }} />
                <span className="w-[1.5px] h-3 rounded-full animate-pulse" style={{ backgroundColor: accentColor, animationDuration: '600ms' }} />
                <span className="w-[1.5px] h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor, animationDuration: '500ms' }} />
              </div>
              <span>{formatClock(hoverInfo.time)}</span>
            </div>
            {/* Micro chevron arrow tip */}
            <div className="w-1.5 h-1.5 bg-slate-950/90 border-r border-b border-white/25 mx-auto rotate-45 -mt-1 backdrop-blur-md" />
          </div>
        )}

        <input
          ref={inputRef}
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.1}
          defaultValue={0}
          onInput={(e) => {
            scrubbing.current = true;
            const v = parseFloat((e.target as HTMLInputElement).value);
            if (currentRef.current) currentRef.current.textContent = formatClock(v);
            const pct = duration > 0 ? (v / duration) * 100 : 0;
            if (liquidFillRef.current) liquidFillRef.current.style.width = `${pct}%`;
            if (playheadRef.current) playheadRef.current.style.left = `${pct}%`;
          }}
          onPointerUp={(e) => {
            scrubbing.current = false;
            seek(parseFloat((e.currentTarget as HTMLInputElement).value));
          }}
          onKeyUp={(e) => {
            if (e.key.startsWith('Arrow')) seek(parseFloat((e.currentTarget as HTMLInputElement).value));
          }}
          aria-label="Posición de reproducción"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
          title="Arrastra para avanzar o retroceder"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 px-1">
        <span ref={currentRef}>0:00</span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  );
});
MiniSeekBar.displayName = 'MiniSeekBar';

// ── Línea de progreso interactiva del mini dock colapsado (con scrub, seek y hover tooltip) ──
interface MiniProgressLineProps {
  accentColor: string;
  isPlaying: boolean;
  seek: (time: number) => void;
}

const MiniProgressLine: React.FC<MiniProgressLineProps> = React.memo(({ accentColor, isPlaying, seek }) => {
  const duration = usePlayerStore((s) => s.duration);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);

  usePlaybackLoop(
    (t, d) => {
      if (!isScrubbing.current && fillRef.current) {
        const ratio = d > 0 ? Math.min(1, Math.max(0, t / d)) : 0;
        fillRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }
    },
    isPlaying,
    10
  );

  const calculateTarget = (clientX: number) => {
    if (!barRef.current || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (duration <= 0) return;
    isScrubbing.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    const targetTime = calculateTarget(e.clientX);
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${(targetTime / duration).toFixed(4)})`;
    }
    seek(targetTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!barRef.current || duration <= 0 || !isScrubbing.current) return;
    const targetTime = calculateTarget(e.clientX);
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${(targetTime / duration).toFixed(4)})`;
    }
    seek(targetTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isScrubbing.current) {
      isScrubbing.current = false;
      const targetTime = calculateTarget(e.clientX);
      seek(targetTime);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-x-0 bottom-0 h-1.5 flex items-end cursor-pointer pointer-events-auto z-20 group/bar"
      title="Progreso de reproducción"
    >
      <div className="w-full h-[2px] bg-white/[0.08] transition-all duration-150 group-hover/bar:h-[3px] origin-bottom overflow-hidden">
        <div
          ref={fillRef}
          className="h-full w-full origin-left transition-transform duration-75"
          style={{
            background: accentColor,
            transform: 'scaleX(0)',
          }}
        />
      </div>
    </div>
  );
});
MiniProgressLine.displayName = 'MiniProgressLine';

export const MiniPlayer: React.FC = () => {
  // ── Hook Audio Controls (Single Source of Truth) ───────────────────────────
  const {
    currentTrack,
    isPlaying,
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
    playSavedTrack,
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
  const isVideoTheaterOpen = usePlayerStore((s) => s.isVideoTheaterOpen);
  const setVideoTheaterOpen = usePlayerStore((s) => s.setVideoTheaterOpen);
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const sleepTimerRemainingSec = usePlayerStore((s) => s.sleepTimerRemainingSec);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const isUiIdle = usePlayerStore((s) => s.isUiIdle);
  const isUiHidden = usePlayerStore((s) => s.blobSettings?.isUiHidden ?? false);
  const playbackStatus = usePlayerStore((s) => s.playbackStatus);
  const playbackMessage = usePlayerStore((s) => s.playbackMessage);
  const isZenMode = usePlayerStore((s) => s.isZenMode);
  const setIsZenMode = usePlayerStore((s) => s.setIsZenMode);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const isCinemaAutoHidden = isUiIdle && isPlaying && !isZenMode;
  const isEffectivelyHidden = isUiHidden || isCinemaAutoHidden;
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue' | 'favorites'>('player');
  const [prefersArtwork, setPrefersArtwork] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'video' | 'playlist'>('video');
  const [searchQuery, setSearchQuery] = useState('');
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
      if (err instanceof DOMException && err.name === 'AbortError') return; // la reemplazó otra selección
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
  const showVideoView = isVideoTrack && !prefersArtwork;

  // ── Accent Color Resolution (Chameleon Artwork Adaptive) ───────────────────
  const palette = useChameleonPalette();
  const accentColor = isLucid ? (lucidTheme?.primary || palette.primary) : palette.primary;

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
            className="fixed bottom-6 left-5 z-50 pointer-events-auto select-none font-sans"
          >
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 h-10 rounded-full border shadow-xl backdrop-blur-2xl transition-all"
              style={{
                background: 'rgba(11, 14, 24, 0.85)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
                boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.7)',
              }}
            >
              {isPlaying && (
                <div className="flex items-end gap-[1.5px] h-2.5 shrink-0 opacity-70" aria-hidden="true">
                  <span className="w-[1.5px] h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="w-[1.5px] h-2.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
                  <span className="w-[1.5px] h-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
                </div>
              )}

              <span className="text-xs font-medium text-white/90 tracking-tight truncate max-w-[130px]">
                {title}
              </span>

              <button
                type="button"
                onClick={togglePlay}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center hover:scale-105 active:scale-90 transition-transform border border-white/10"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsZenMode(false)}
                className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Expandir a dock estándar"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. MODO COLAPSADO: Cápsula Flotante de Cristal Líquido (visionOS Capsule)*/}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isExpanded && !isZenMode && !isEffectivelyHidden && (
          <motion.div
            layout
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, y: 16, scale: 0.96, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(8px)' }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 320,
              layout: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
            }}
            className="fixed bottom-6 left-5 z-50 pointer-events-auto select-none font-sans"
          >
            <div
              onClick={() => setIsExpanded(true)}
              className="group relative flex items-center gap-3 px-3 py-1.5 h-12 rounded-full overflow-hidden border transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
              style={{
                width: 'min(310px, calc(100vw - 32px))',
                background: 'rgba(11, 14, 24, 0.85)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
                boxShadow: '0 18px 40px -8px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              }}
              title="Click para expandir reproductor completo"
            >
              {/* Reflejo especular superior tenue */}
              <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* Barra de progreso integrada al ras del borde inferior curvo */}
              <MiniProgressLine accentColor={accentColor} isPlaying={isPlaying} seek={seek} />

              {/* ── Izquierda: Carátula nítida con giro de mini-vinilo ── */}
              <div
                className={`relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-black/60 shadow-md flex items-center justify-center transition-all ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{
                  animationDuration: '3s',
                  boxShadow: `0 2px 8px rgba(0,0,0,0.7), 0 0 6px ${palette.glow}`,
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={title}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <Music className="w-3.5 h-3.5 text-white/50" />
                )}
                {/* Center Spindle point */}
                <div className="absolute w-2 h-2 rounded-full bg-slate-950 border border-white/70 shadow-sm" />
              </div>

              {/* ── Centro: Tipografía con jerarquía impecable ── */}
              <div className="flex flex-col min-w-0 flex-1 justify-center leading-none">
                <span className="text-[12px] font-semibold text-white/95 truncate tracking-tight group-hover:text-white transition-colors">
                  {title}
                </span>
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  <span className="text-[10px] font-medium text-white/45 truncate font-sans">
                    {artist}
                  </span>
                  {isPlaying && (
                    <div className="flex items-end gap-[1.5px] h-2.5 shrink-0 opacity-70" aria-hidden="true">
                      <span className="w-[1.5px] h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="w-[1.5px] h-2.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-[1.5px] h-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Derecha: Controles armoniosos de perfil suave ── */}
              <div
                className="flex items-center gap-1 shrink-0 relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-90 transition-all border border-white/10 shadow-sm"
                  title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Botón Siguiente */}
                <button
                  type="button"
                  onClick={playNext}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  title="Siguiente pista (Shift + N)"
                >
                  <SkipForward className="w-3.5 h-3.5 fill-current/40" />
                </button>

                {/* Botón Expandir a dock completo */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  title="Expandir reproductor completo"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
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
        {isExpanded && !isEffectivelyHidden && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, x: -30, y: 15, scale: 0.92, filter: 'blur(16px)' }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, y: 15, scale: 0.92, filter: 'blur(12px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-6 left-5 z-50 w-[92vw] max-w-[340px] sm:max-w-[352px] pointer-events-auto select-none"
          >
            <div
              className={`flex flex-col rounded-[20px] overflow-hidden liquid-glass liquid-glass-card border`}
              style={{
                background: `linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 12, 20, 0.92) 100%), ${palette.meshGradient}`,
                borderColor: isLucid ? lucidTheme.borderColor : palette.border,
                boxShadow: `0 28px 70px rgba(0,0,0,0.9), 0 0 28px ${isLucid ? lucidTheme.glow : palette.glow}`,
              }}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-1.5 px-3.5 pt-4 pb-2">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="text-[11.5px] font-bold tracking-normal uppercase text-white/85 whitespace-nowrap">
                    Aura Player
                  </span>
                  {sourceBadge}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Favorite Toggle in Header */}
                  {currentTrack && (
                    <button
                      onClick={() => toggleFavorite(currentTrack)}
                      className={`glass-btn w-7 h-7 flex items-center justify-center transition-colors ${
                        isCurrentFav ? 'text-rose-400' : 'text-white/70 hover:text-white'
                      }`}
                      aria-label={isCurrentFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      title={isCurrentFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isCurrentFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  )}

                  {/* 3-Band Quick EQ Drawer Toggle */}
                  <button
                    onClick={() => setShowToolsDrawer((prev) => !prev)}
                    className={`glass-btn w-7 h-7 flex items-center justify-center ${
                      showToolsDrawer ? 'is-active text-cyan-300' : 'text-white/70 hover:text-white'
                    }`}
                    aria-label="Ajustes Tonales Rápidos"
                    title="Ajustes Tonales Rápidos (3-Band EQ)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Collapse Button */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="glass-btn w-7 h-7 flex items-center justify-center text-white/70 hover:text-white"
                    title="Minimizar a píldora"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Close MiniPlayer Button */}
                  <button
                    onClick={() => setMiniPlayerOpen(false)}
                    className="glass-btn w-7 h-7 flex items-center justify-center text-white/70 hover:text-white"
                    title="Cerrar consola MiniPlayer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* iOS Segmented Control (Tabs) */}
              <div className="px-4 py-2">
                <div className="glass-input relative flex items-center p-1 focus-within:!shadow-[var(--glass-shadow)] focus-within:!border-white/[0.14] focus-within:!border-t-white/40">
                  {(
                    [
                      { id: 'player', label: 'Reproductor', icon: Disc3, badge: 0 },
                      { id: 'search', label: 'Buscar canciones', icon: Search, badge: 0 },
                      { id: 'queue', label: `Cola (${queue.length})`, icon: ListMusic, badge: queue.length },
                      { id: 'favorites', label: `Favoritos (${favorites.length})`, icon: Heart, badge: favorites.length },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-label={tab.label}
                        title={tab.label}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.id === 'search') {
                            setTimeout(() => searchInputRef.current?.focus(), 120);
                          }
                        }}
                        className={`relative flex-1 py-2.5 min-h-[40px] transition-colors flex items-center justify-center rounded-full z-10 group ${
                          isActive
                            ? 'text-white'
                            : 'text-white/45 hover:text-white/85'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="miniplayer-tab"
                            className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-white/10 border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <div className="relative flex items-center justify-center">
                          <Icon
                            className={`w-[18px] h-[18px] relative z-10 transition-transform duration-200 ${
                              isActive ? 'scale-110 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : 'group-hover:scale-105'
                            }`}
                          />
                          {tab.badge > 0 && (
                            <span
                              className={`absolute -top-1 -right-2 min-w-[13px] h-[13px] px-0.5 rounded-full text-[8.5px] font-mono font-bold flex items-center justify-center border z-20 pointer-events-none transition-colors ${
                                isActive
                                  ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_6px_rgba(0,229,255,0.6)]'
                                  : 'bg-white/20 text-white/90 border-white/30'
                              }`}
                            >
                              {tab.badge > 99 ? '99+' : tab.badge}
                            </span>
                          )}
                        </div>
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

                      {/* Quick 1-Click Acoustic Preset Pills */}
                      <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto scrollbar-none">
                        {[
                          { name: 'Flat', bass: 0, mids: 0, treble: 0 },
                          { name: 'Bass Boost', bass: 5, mids: -1, treble: 1 },
                          { name: 'Vocal Clarity', bass: -2, mids: 4, treble: 3 },
                          { name: 'Club / EDN', bass: 6, mids: 1, treble: 4 },
                        ].map((p) => {
                          const isActive =
                            threeBandEQ.bass === p.bass &&
                            threeBandEQ.mids === p.mids &&
                            threeBandEQ.treble === p.treble;
                          return (
                            <button
                              key={p.name}
                              onClick={() => {
                                setThreeBandGain('bass', p.bass);
                                setThreeBandGain('mids', p.mids);
                                setThreeBandGain('treble', p.treble);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-medium transition-all duration-200 btn-spring whitespace-nowrap ${
                                isActive
                                  ? 'bg-cyan-400/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(0,229,255,0.3)] font-bold'
                                  : 'bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/12 border border-white/10'
                              }`}
                            >
                              {p.name}
                            </button>
                          );
                        })}
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
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black aspect-video">
                          <GlobalYouTubePlayer
                            showVideoInPlayer={isExpanded && activeTab === 'player' && showVideoView && !isVideoTheaterOpen}
                            borderRadius="16px"
                            interactive={true}
                          />
                        </div>

                        {/* Liquid Glass Video Action Bar */}
                        <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPrefersArtwork(true)}
                              className="flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-white px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all active:scale-95"
                              title="Cambiar a vista de carátula y vinilo"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Carátula</span>
                            </button>

                            {/* Cinema / Theater Mode Button */}
                            <button
                              onClick={() => setVideoTheaterOpen(true)}
                              className="flex items-center gap-1 text-[11px] font-medium text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 transition-all active:scale-95"
                              title="Modo Teatro Panorámico con Ambilight (T)"
                            >
                              <Maximize2 className="w-3 h-3 text-purple-300" />
                              <span>Teatro</span>
                            </button>

                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[9px] font-mono font-bold text-white/75">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              HD
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Reload / Recover video button */}
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent('aura:youtube-reload'))}
                              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                              title="Recargar reproducción si se congela"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>

                            {/* External YouTube link */}
                            {currentTrack?.youtubeId && (
                              <a
                                href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] font-medium text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
                                title="Abrir en YouTube externo"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Track Info in Video Mode */}
                        <div className="flex flex-col items-center text-center w-full px-2 mt-0.5">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate w-full">
                            {title}
                          </h3>
                          <p className="text-xs font-medium text-white/60 tracking-tight truncate w-full mt-0.5">
                            {artist}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Apple Holographic 3D Album Sleeve & Conic Glare Vinyl Disc */
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <HolographicAlbumSleeve
                          coverUrl={coverUrl}
                          title={title}
                          artist={artist}
                          isPlaying={isPlaying}
                          accentColor={accentColor}
                          palette={palette}
                          isVideoTrack={isVideoTrack}
                          onShowVideo={() => setPrefersArtwork(false)}
                        />

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
                    <MiniSeekBar accentColor={accentColor} isPlaying={isPlaying} seek={seek} />

                    {/* Dual-Channel Stereo Studio VU Meter */}
                    <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-inner">
                      <StereoVuMeter orientation="horizontal" segments={14} label="Nivel Estéreo (L / R)" showLabels={true} />
                    </div>

                    {/* Primary Hero Transport Controls */}
                    <div className="flex items-center justify-between px-2 pt-1">
                      {/* Shuffle */}
                      <button
                        onClick={toggleShuffle}
                        className={`p-2 rounded-full transition-colors btn-spring ${
                          isShuffled ? 'text-cyan-400 bg-cyan-500/15' : 'text-white/40 hover:text-white'
                        }`}
                        title="Modo aleatorio"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>

                      {/* Prev */}
                      <button
                        onClick={playPrevious}
                        className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 btn-spring"
                        title="Pista anterior"
                      >
                        <SkipBack className="w-5 h-5 fill-current" />
                      </button>

                      {/* Hero Central Play Button */}
                      <button
                        onClick={togglePlay}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-black flex items-center justify-center btn-hero-play shadow-[0_4px_24px_rgba(255,255,255,0.4)]"
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
                        className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 btn-spring"
                        title="Siguiente pista"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>

                      {/* Repeat */}
                      <button
                        onClick={cycleRepeat}
                        className={`p-2 rounded-full transition-colors btn-spring ${
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

                    {/* Volume Control Capsule (Apple Liquid Glass) */}
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-xl group/volume">
                      <button
                        onClick={toggleMute}
                        className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex-shrink-0"
                        title={isMuted ? 'Activar sonido (Desmutear)' : 'Silenciar'}
                        aria-label={isMuted ? 'Desmutear' : 'Silenciar'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-4 h-4 text-white/80" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <div className="flex-1 flex items-center relative py-1">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-full h-1.5 group-hover/volume:h-2 rounded-full appearance-none cursor-pointer transition-all bg-white/15 accent-white"
                          style={{
                            background: `linear-gradient(to right, ${accentColor} ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255,255,255,0.14) ${Math.round((isMuted ? 0 : volume) * 100)}%)`,
                          }}
                          title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-medium tabular-nums text-white/60 w-8 text-right flex-shrink-0 select-none">
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
                              if (loadingTrackId === fav.id) return;
                              setLoadingTrackId(fav.id);
                              try {
                                await playSavedTrack(fav);
                                setActiveTab('player');
                              } catch (err) {
                                if (err instanceof DOMException && err.name === 'AbortError') return;
                                console.error('[MiniPlayer] Error playing favorite:', err);
                              } finally {
                                setLoadingTrackId(null);
                              }
                            }}
                            className="group flex items-center justify-between p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] transition-all cursor-pointer"
                            role="button"
                            tabIndex={0}
                            aria-busy={loadingTrackId === fav.id}
                            aria-label={`Buscar y reproducir ${fav.title} de ${fav.artist}`}
                            onKeyDown={(event) => {
                              if ((event.key === 'Enter' || event.key === ' ') && loadingTrackId !== fav.id) {
                                event.preventDefault();
                                event.currentTarget.click();
                              }
                            }}
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
                                {loadingTrackId === fav.id && (
                                  <span className="absolute inset-0 grid place-items-center bg-black/70" aria-hidden="true">
                                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-rose-300" />
                                  </span>
                                )}
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

                {(playbackStatus === 'resolving' ||
                  playbackStatus === 'buffering' ||
                  playbackMessage?.startsWith('Versión encontrada')) &&
                  playbackMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-2 rounded-xl bg-cyan-400/[0.08] px-3 py-2 text-[11px] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    {(playbackStatus === 'resolving' || playbackStatus === 'buffering') && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    <span className="min-w-0 truncate">{playbackMessage}</span>
                  </div>
                )}

                {(audioError || playbackStatus === 'error') && (
                  <div role="alert" className="p-2 rounded-xl bg-rose-500/15 text-[11px] text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {audioError || playbackMessage || 'No se pudo reproducir la canción. Inténtalo otra vez.'}
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
