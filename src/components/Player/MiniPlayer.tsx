/**
 * MiniPlayer — Cyberpunk floating side panel for local files & YouTube/Spotify embeds.
 *
 * Features:
 *  - Local file queue (MP3, WAV, FLAC, OGG, MP4, WEBM) with video/audio preview
 *  - YouTube & Spotify embedded iframe player with URL parser
 *  - System capture live signal detection
 *  - Interactive progress scrubber synced with audio engine
 *  - Opacity and width customization sliders
 *  - Collapsible to ultra-thin rail
 *  - Full cyberpunk monospace HUD aesthetic
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Trash2,
  Upload,
  Video,
  Music2,
  Sliders,
  List,
  Radio,
  Loader2,
  AlertCircle,
  Sparkles,
  Search,
  Globe,
  ExternalLink,
  Headphones,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';

// ─── Local file entry ─────────────────────────────────────────────────────────
interface LocalFile {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
  duration?: number;
}

// ─── Format helper ────────────────────────────────────────────────────────────
const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── YouTube / Spotify URL helper ─────────────────────────────────────────────
const parseEmbedUrl = (rawUrl: string): { type: 'youtube' | 'spotify' | null; embedUrl: string | null; videoId?: string } => {
  const trimmed = rawUrl.trim();
  // YouTube match (watch?v=, youtu.be/, shorts/, embed/)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
    };
  }

  // Spotify match (track, album, playlist)
  const spotMatch = trimmed.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
  if (spotMatch) {
    return {
      type: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${spotMatch[1]}/${spotMatch[2]}?utm_source=generator&theme=0`,
    };
  }

  return { type: null, embedUrl: null };
};

export const MiniPlayer: React.FC = () => {
  const { isPlaying, currentTime, duration, isMicActive, currentTrack, queue, isLucid, lucidTheme } = usePlayerStore();
  const {
    loadFile,
    seek,
    togglePlayPause,
    loadYouTubeTrack,
    startSystemCapture,
    isCapturing,
    playNext: enginePlayNext,
    playPrevious: enginePlayPrev,
  } = useAudioEngine();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'embed' | 'settings'>('player');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [panelWidth, setPanelWidth] = useState(340);
  const [panelOpacity, setPanelOpacity] = useState(0.90);
  const [isDragOver, setIsDragOver] = useState(false);

  // Embed & Stream state (YouTube / Spotify)
  const [streamPlatform, setStreamPlatform] = useState<'youtube' | 'spotify'>('youtube');
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytSearchResults, setYtSearchResults] = useState<Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    url: string;
  }>>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [activeEmbed, setActiveEmbed] = useState<{ type: 'youtube' | 'spotify'; url: string; videoId?: string } | null>(null);
  const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);

  // Load YouTube IFrame API script once
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Mount official YouTube Player when activeEmbed is a YouTube video
  React.useEffect(() => {
    if (!activeEmbed || activeEmbed.type !== 'youtube' || !activeEmbed.videoId) return;

    let isMounted = true;

    const setupPlayer = () => {
      if (!isMounted) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        setTimeout(setupPlayer, 120);
        return;
      }

      try {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
        }
      } catch {}

      try {
        ytPlayerRef.current = new YT.Player('yt-miniplayer-frame', {
          videoId: activeEmbed.videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            mute: 1, // Video muteado en el iframe: el audio real fluye por el Web Audio API audioEngine
          },
          events: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReady: (event: any) => {
              if (!isMounted) return;
              try {
                event.target.mute();
                event.target.playVideo();
              } catch {}
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1 && !usePlayerStore.getState().isPlaying) {
                togglePlayPause();
              } else if (event.data === 2 && usePlayerStore.getState().isPlaying) {
                togglePlayPause();
              }
            },
          },
        });
      } catch (err) {
        console.warn('[MiniPlayer] YouTube Player init error:', err);
      }
    };

    setupPlayer();

    return () => {
      isMounted = false;
      try {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
        }
      } catch {}
    };
  }, [activeEmbed?.videoId, togglePlayPause]);

  // Synchronize YouTube video playback currentTime with audioEngine master time
  React.useEffect(() => {
    if (!activeEmbed || activeEmbed.type !== 'youtube') return;
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      try {
        const ytCur = ytPlayerRef.current.getCurrentTime() || 0;
        if (Math.abs(ytCur - currentTime) > 0.6) {
          ytPlayerRef.current.seekTo(currentTime, true);
        }
      } catch {}
    }
  }, [currentTime, activeEmbed]);

  // Synchronize video element playback state with playerStore
  React.useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Synchronize video currentTime if drifted > 0.4s
  React.useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // ── File management ────────────────────────────────────────────────────────
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter(
        (f) =>
          f.type.startsWith('audio/') ||
          f.type.startsWith('video/') ||
          /\.(mp3|wav|ogg|flac|m4a|aac|mp4|webm|mkv)$/i.test(f.name)
      );
      if (!arr.length) return;

      const newEntries: LocalFile[] = arr.map((f) => ({
        id: `${f.name}_${f.size}_${Date.now()}`,
        name: f.name.replace(/\.[^/.]+$/, ''),
        type: f.type || 'audio/mpeg',
        url: URL.createObjectURL(f),
        file: f,
      }));

      setFiles((prev) => {
        const merged = [...prev, ...newEntries];
        if (activeIdx === null) {
          loadFile(newEntries[0].file);
          setActiveIdx(prev.length);
        }
        return merged;
      });
    },
    [activeIdx, loadFile]
  );

  const playFile = useCallback(
    (idx: number) => {
      const entry = files[idx];
      if (!entry) return;
      setActiveIdx(idx);
      setActiveEmbed(null); // Switch off embed if local file is played
      loadFile(entry.file);
      if (videoRef.current && entry.type.startsWith('video/')) {
        videoRef.current.src = entry.url;
        videoRef.current.play().catch(() => {});
      }
    },
    [files, loadFile]
  );

  const removeFile = useCallback(
    (idx: number) => {
      setFiles((prev) => {
        const next = [...prev];
        URL.revokeObjectURL(next[idx].url);
        next.splice(idx, 1);
        return next;
      });
      if (activeIdx === idx) setActiveIdx(null);
      else if (activeIdx !== null && activeIdx > idx) setActiveIdx(activeIdx - 1);
    },
    [activeIdx]
  );

  const playPrev = () => {
    if (files.length > 0 && activeIdx !== null) {
      const next = (activeIdx - 1 + files.length) % files.length;
      playFile(next);
    } else {
      enginePlayPrev();
    }
  };

  const playNext = () => {
    if (files.length > 0 && activeIdx !== null) {
      const next = (activeIdx + 1) % files.length;
      playFile(next);
    } else {
      enginePlayNext();
    }
  };

  // ── YouTube & Spotify Stream Handlers ──────────────────────────────────────
  const handlePlayYouTubeVideo = async (videoId: string, fallbackTitle?: string, fallbackArtist?: string) => {
    setIsLoadingEmbed(true);
    setEmbedError(null);
    setActiveEmbed({
      type: 'youtube',
      url: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
      videoId,
    });
    setActiveIdx(null);
    setActiveTab('player');

    try {
      await loadYouTubeTrack(videoId, { title: fallbackTitle, artist: fallbackArtist });
    } catch (err: unknown) {
      console.error('[MiniPlayer] Error conectando audio de YouTube:', err);
      setEmbedError(err instanceof Error ? err.message : 'Error al conectar el audio de YouTube');
    } finally {
      setIsLoadingEmbed(false);
    }
  };

  const handleSearchYouTube = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : ytSearchQuery).trim();
    if (!q) return;

    // Si el usuario pega una URL de YouTube directamente en el buscador
    const parsed = parseEmbedUrl(q);
    if (parsed.type === 'youtube' && parsed.videoId) {
      await handlePlayYouTubeVideo(parsed.videoId);
      return;
    }

    setIsSearchingYt(true);
    setEmbedError(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Error al buscar en YouTube');
      const data = await res.json();
      setYtSearchResults(data.results || []);
    } catch (err) {
      console.warn('[MiniPlayer] Error en búsqueda de YouTube:', err);
      setEmbedError('No se pudo completar la búsqueda en YouTube.');
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleLoadSpotify = (uriOrId: string, type: 'track' | 'playlist' | 'album' = 'playlist') => {
    setEmbedError(null);
    const clean = uriOrId.trim();
    let embedUrl = '';

    if (clean.includes('open.spotify.com/')) {
      const parsed = parseEmbedUrl(clean);
      if (parsed.embedUrl) embedUrl = parsed.embedUrl;
    } else if (clean.startsWith('spotify:')) {
      const parts = clean.split(':');
      if (parts.length >= 3) {
        embedUrl = `https://open.spotify.com/embed/${parts[1]}/${parts[2]}?utm_source=generator&theme=0`;
      }
    } else {
      embedUrl = `https://open.spotify.com/embed/${type}/${clean}?utm_source=generator&theme=0`;
    }

    if (embedUrl) {
      setActiveEmbed({ type: 'spotify', url: embedUrl });
      setActiveIdx(null);
      setActiveTab('player');
      usePlayerStore.setState({
        isPlaying: true,
        hasStarted: true,
        currentTrack: {
          id: `spot_${Date.now()}`,
          title: 'Spotify Stream',
          artist: 'Spotify Web Player',
          duration: 0,
          sourceType: 'spotify',
          addedAt: Date.now(),
        },
      });
    } else {
      setEmbedError('Enlace o ID de Spotify inválido');
    }
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // ── Progress scrub ─────────────────────────────────────────────────────────
  const scrubProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = ratio * duration;

    seek(targetSeconds);
    if (activeEmbed?.type === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(targetSeconds, true);
      } catch {}
    }
  };

  const handlePlayPause = () => {
    togglePlayPause();
    if (activeEmbed?.type === 'youtube' && ytPlayerRef.current) {
      try {
        const state = ytPlayerRef.current.getPlayerState?.();
        if (state === 1) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activeFile = activeIdx !== null ? files[activeIdx] : null;
  const isVideo = activeFile?.type.startsWith('video/');
  const isSystemSource = currentTrack?.id.startsWith('sys_') || isCapturing;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 px-2 sm:px-2.5 py-3 rounded-l-xl border-r-0 border border-white/[0.08] bg-[#070a14]/95 transition-all backdrop-blur-2xl flex flex-col items-center gap-2 shadow-xl hover:translate-x-[-2px] active:scale-95 group text-white/60 hover:text-white"
        style={
          isLucid
            ? {
                borderColor: `${lucidTheme.primary}45`,
                color: lucidTheme.primary,
                boxShadow: `-6px 0 25px ${lucidTheme.glow}`,
              }
            : undefined
        }
        title="Abrir Mini Reproductor Lateral"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-white/30'}`}
        />
        <Music2 className="w-3.5 h-3.5" />
        <span
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          className="text-[9px] font-mono tracking-[0.25em] uppercase rotate-180 text-white/40 group-hover:text-white/80"
        >
          MINI PLAYER
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 max-w-full"
      style={{
        width: isCollapsed ? 48 : `clamp(280px, 30vw, min(${panelWidth}px, 100vw))`,
        background: `rgba(7, 10, 20, ${panelOpacity})`,
        backdropFilter: 'blur(24px)',
        borderLeft: isLucid
          ? `1px solid ${lucidTheme.primary}45`
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isLucid
          ? `-12px 0 48px rgba(0,0,0,0.8), 0 0 35px ${lucidTheme.glow}`
          : '-12px 0 48px rgba(0,0,0,0.85)',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-white/5 border-2 border-dashed border-white/40 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/90 uppercase">
            SOLTAR ARCHIVOS AQUI
          </span>
        </div>
      )}

      {/* Collapsed rail */}
      {isCollapsed ? (
        <div className="flex flex-col items-center h-full py-4 gap-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <span
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            className="text-[9px] font-mono tracking-[0.25em] text-white/30 uppercase rotate-180"
          >
            MINI PLAYER
          </span>
        </div>
      ) : (
        <>
          {/* Header bar */}
          <div className="flex items-center justify-between px-3.5 h-10 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
                MINI PLAYER
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
                title="Minimizar"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/40 hover:text-rose-400 rounded-md hover:bg-white/[0.05] transition-colors"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex border-b border-white/[0.06] flex-shrink-0">
            {(
              [
                ['player', Music2, 'PLAYER'],
                ['queue', List, 'COLA'],
                ['embed', Globe, 'STREAM'],
                ['settings', Sliders, 'AJUSTES'],
              ] as const
            ).map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[9px] font-mono tracking-wider uppercase transition-all ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-white -mb-px font-medium'
                    : 'text-white/40 hover:text-white/70 border-b-2 border-transparent'
                }`}
                style={
                  activeTab === tab && isLucid
                    ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
                    : undefined
                }
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>


          {/* ── PLAYER TAB ─────────────────────────────────────────────── */}
          {activeTab === 'player' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Media viewer (Video / Embedded Iframe / Waveform Audio) */}
              <div className="flex-shrink-0 bg-black/50 border-b border-white/6 relative">
                {activeEmbed ? (
                  <div className="w-full h-48 bg-black relative flex items-center justify-center overflow-hidden">
                    {activeEmbed.type === 'youtube' ? (
                      <div id="yt-miniplayer-frame" className="w-full h-full" />
                    ) : (
                      <iframe
                        src={activeEmbed.url}
                        className="w-full h-full border-0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    )}
                    {isLoadingEmbed && (
                      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4 text-center z-10">
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        <span className="text-[10px] font-mono tracking-wider text-cyan-300 uppercase">
                          Sincronizando con Aura3D...
                        </span>
                      </div>
                    )}
                  </div>
                ) : isVideo && activeFile ? (
                  <video
                    ref={videoRef}
                    src={activeFile.url}
                    className="w-full max-h-44 object-contain bg-black"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center gap-2">
                    {isSystemSource ? (
                      <>
                        <Radio className="w-6 h-6 text-emerald-400" />
                        <p className="text-[10px] font-mono text-white/70 tracking-wider px-4 text-center">
                          AUDIO DEL SISTEMA (CAPTURA EN VIVO)
                        </p>
                      </>
                    ) : activeFile ? (
                      <>
                        <Music2 className="w-6 h-6 text-white/50" />
                        <p className="text-[10px] font-mono text-white/70 tracking-wider px-4 text-center truncate w-full">
                          {activeFile.name}
                        </p>
                      </>
                    ) : (
                      <p className="text-[9px] font-mono tracking-[0.2em] text-white/30 uppercase">
                        SIN ARCHIVO CARGADO
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Track / Stream Info */}
              <div className="px-4 pt-3 pb-1 flex-shrink-0">
                <p className="text-xs font-medium text-white truncate">
                  {activeEmbed
                    ? currentTrack?.title || `STREAM: ${activeEmbed.type.toUpperCase()}`
                    : activeFile
                    ? activeFile.name
                    : isSystemSource
                    ? 'Captura de Pestaña / Sistema'
                    : 'Aura3D Engine'}
                </p>
                <p className="text-[10px] font-mono text-white/30 tracking-wider mt-0.5">
                  {activeEmbed
                    ? (activeEmbed.type === 'youtube' ? 'YOUTUBE AUDIO STREAM' : 'IFRAME EMBED')
                    : isVideo
                    ? 'VIDEO MP4'
                    : isSystemSource
                    ? 'LIVE FFT STREAM'
                    : 'AUDIO'}{' '}
                  &nbsp;·&nbsp; {fmt(duration)}
                </p>

                {/* Direct Visualizer Audio Sync & Quick Search Trigger */}
                {activeEmbed && (
                  <div className="mt-2.5 space-y-2">
                    {activeEmbed.type === 'youtube' && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                          <span className="tracking-wider font-bold">AUDIO NATIVO 3D CONECTADO (60 FPS)</span>
                        </div>
                        <span className="text-[9px] text-cyan-400/80 font-semibold bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">AURA ENGINE</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('embed')}
                      className="w-full py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-white/80 hover:text-white text-[10px] font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-cyan-400" />
                      <span>BUSCAR OTRA CANCIÓN (YOUTUBE / SPOTIFY)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Progress scrubber (Local audio/video) */}
              <div className="px-4 pt-2 pb-1 flex-shrink-0">
                <div
                  ref={progressRef}
                  onClick={scrubProgress}
                  className="relative h-1 bg-white/[0.08] cursor-pointer group rounded-full overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-white/40 mt-1 tabular-nums">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-5 pb-4 flex-shrink-0 mt-1 select-none">
                <button
                  onClick={playPrev}
                  disabled={files.length < 2 && queue.length < 2}
                  className="text-white/40 hover:text-white disabled:opacity-20 transition-colors p-1"
                  title="Canción Anterior"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 shadow-sm transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                </button>

                <button
                  onClick={playNext}
                  disabled={files.length < 2 && queue.length < 2}
                  className="text-white/40 hover:text-white disabled:opacity-20 transition-colors p-1"
                  title="Siguiente Canción"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Fast Upload CTA */}
              <div className="px-4 pb-4 flex-shrink-0 border-t border-white/[0.06] pt-3">
                <label className="w-full flex items-center justify-center gap-2 py-2 text-[9px] font-mono tracking-wider uppercase text-white/40 border border-dashed border-white/[0.1] hover:border-white/30 hover:text-white rounded-lg cursor-pointer transition-all active:scale-98">
                  <Upload className="w-3 h-3" />
                  SUBIR MP3 / MP4
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.m4a,.mp4,.webm"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── QUEUE TAB ──────────────────────────────────────────────── */}
          {activeTab === 'queue' && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-white/[0.06]">
                <label className="w-full flex items-center justify-center gap-2 py-2 text-[9px] font-mono tracking-wider uppercase text-white/40 border border-dashed border-white/[0.1] hover:border-white/30 hover:text-white rounded-lg cursor-pointer transition-all active:scale-98">
                  <Upload className="w-3 h-3" />
                  AGREGAR A LA COLA
                  <input
                    type="file"
                    accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.m4a,.mp4,.webm"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <List className="w-5 h-5 text-white/20" />
                  <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase">
                    COLA VACÍA
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {files.map((f, idx) => (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group ${
                        idx === activeIdx
                          ? 'bg-white/[0.06] border-l-2 border-white'
                          : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                      }`}
                      onClick={() => playFile(idx)}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {f.type.startsWith('video/') ? (
                          <Video className="w-3.5 h-3.5 text-white/50" />
                        ) : (
                          <Music2
                            className={`w-3.5 h-3.5 ${
                              idx === activeIdx ? 'text-white' : 'text-white/30'
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            idx === activeIdx ? 'text-white' : 'text-white/70'
                          }`}
                        >
                          {f.name}
                        </p>
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5">
                          {f.type.startsWith('video/') ? 'VIDEO' : 'AUDIO'}
                        </p>
                      </div>

                      {idx === activeIdx && isPlaying && (
                        <div className="flex gap-px items-end h-3 flex-shrink-0">
                          {[1, 0.6, 0.8].map((h, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-white animate-pulse"
                              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar de la cola"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ONLINE / STREAM TAB (YOUTUBE BUSCADOR & SPOTIFY PLAYER) ────────────────────────────────────────── */}
          {(activeTab === 'embed' || (activeTab as string) === 'stream') && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Header / Sub-selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${streamPlatform === 'youtube' ? 'bg-red-500 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                    <span className="text-[11px] font-mono font-bold tracking-widest text-white uppercase">
                      CENTRO ONLINE: {streamPlatform.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                    60 FPS 3D SYNC
                  </span>
                </div>

                {/* Platform Switcher Buttons */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setStreamPlatform('youtube')}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      streamPlatform === 'youtube'
                        ? 'bg-red-600/90 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/50'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>YOUTUBE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamPlatform('spotify')}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      streamPlatform === 'spotify'
                        ? 'bg-emerald-600/90 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>SPOTIFY</span>
                  </button>
                </div>
              </div>

              {/* ── YOUTUBE MODE ── */}
              {streamPlatform === 'youtube' && (
                <div className="space-y-4">
                  {/* YouTube Search Form */}
                  <form onSubmit={handleSearchYouTube} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar canción, artista o pegar enlace de YouTube..."
                        value={ytSearchQuery}
                        disabled={isSearchingYt}
                        onChange={(e) => setYtSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 disabled:opacity-50"
                      />
                      <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSearchingYt || !ytSearchQuery.trim()}
                        className="flex-1 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                      >
                        {isSearchingYt ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            BUSCANDO EN YOUTUBE...
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5 text-white" />
                            BUSCAR EN YOUTUBE
                          </>
                        )}
                      </button>

                      <a
                        href="https://www.youtube.com"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-white/60 hover:text-white transition-colors flex items-center justify-center"
                        title="Abrir YouTube oficial en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Chips de búsqueda rápida */}
                    <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] font-mono text-white/40 uppercase mr-0.5">Top:</span>
                      {['Paulo Londra', 'Synthwave 80s', 'Cyberpunk Bass', 'Coldplay', 'Lofi Chill'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setYtSearchQuery(tag);
                            handleSearchYouTube(undefined, tag);
                          }}
                          className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[9px] font-mono text-white/70 hover:text-white transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </form>

                  {/* YouTube Search Results List */}
                  {ytSearchResults.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-1">
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                          RESULTADOS DE BÚSQUEDA ({ytSearchResults.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setYtSearchResults([])}
                          className="text-[9px] font-mono text-white/40 hover:text-white"
                        >
                          Limpiar
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {ytSearchResults.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-red-500/40 flex items-center gap-2.5 transition-all group cursor-pointer"
                            onClick={() => handlePlayYouTubeVideo(item.id, item.title, item.artist)}
                          >
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-12 h-9 object-cover rounded-md flex-shrink-0 bg-black/40"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-medium text-white truncate group-hover:text-red-400 transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[10px] font-mono text-white/40 truncate">
                                {item.artist} {item.duration > 0 ? `· ${fmt(item.duration)}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-full bg-red-500/20 group-hover:bg-red-500 text-red-400 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all shadow-sm"
                              title="Reproducir y conectar visualizador 3D"
                            >
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {embedError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                      <span className="leading-tight">{embedError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SPOTIFY MODE ── */}
              {streamPlatform === 'spotify' && (
                <div className="space-y-4">
                  {/* Spotify Search / URL Form */}
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pegar URL de Spotify (canción, playlist o álbum)..."
                        value={spotifyInput}
                        onChange={(e) => setSpotifyInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/60"
                      />
                      <Headphones className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!spotifyInput.trim()}
                        onClick={() => handleLoadSpotify(spotifyInput)}
                        className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current text-black" />
                        CARGAR EN MINIPLAYER
                      </button>

                      <a
                        href="https://open.spotify.com"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-white/60 hover:text-white transition-colors flex items-center justify-center"
                        title="Abrir Spotify Web oficial"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Curated Spotify Playlists */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider block border-b border-white/[0.06] pb-1">
                      PLAYLISTS RECOMENDADAS SPOTIFY
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { title: 'Top Global Hits', id: '37i9dQZF1DXcBWIGoYBM5M', tag: 'POP / TOP' },
                        { title: 'Cyberpunk Synth', id: '37i9dQZF1DXdLEN7aqioXM', tag: 'SYNTHWAVE' },
                        { title: 'Lofi Chill Beats', id: '37i9dQZF1DX4t95PaoR1zy', tag: 'CHILL' },
                        { title: 'Electronic Bass', id: '37i9dQZF1DX4dLK3J3jFq0', tag: 'BASS / EDM' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleLoadSpotify(item.id, 'playlist')}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-left transition-all group cursor-pointer flex flex-col justify-between"
                        >
                          <span className="text-[9px] font-mono text-emerald-400/80 font-semibold uppercase tracking-wider">
                            {item.tag}
                          </span>
                          <span className="text-xs font-mono font-bold text-white group-hover:text-emerald-300 transition-colors mt-1 truncate w-full">
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spotify 3D Sound Sync Banner */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.15)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        SINCRONIZAR AUDIO DE SPOTIFY AL VISUALIZADOR 3D
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                        60 FPS
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-white/60 leading-tight">
                      Para que la Esfera 3D y Rainbow Void bailen con tu música de Spotify Web en tiempo real:
                    </p>
                    <button
                      type="button"
                      onClick={startSystemCapture}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-mono text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-md cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-black animate-pulse" />
                      <span>SINCRONIZAR AUDIO SPOTIFY (1 CLIC)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ───────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
                  AJUSTES / PANEL
                </span>
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-wider text-white/40 uppercase">
                    OPACIDAD DEL PANEL
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-white/70">
                    {(panelOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-white"
                    style={{ width: `${((panelOpacity - 0.3) / 0.7) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.01"
                    value={panelOpacity}
                    onChange={(e) => setPanelOpacity(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2"
                  />
                </div>
              </div>

              {/* Width */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-wider text-white/40 uppercase">
                    ANCHO DEL PANEL
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-white/70">
                    {panelWidth}px
                  </span>
                </div>
                <div className="relative h-1 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-white"
                    style={{ width: `${((panelWidth - 240) / 260) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="240"
                    max="500"
                    step="10"
                    value={panelWidth}
                    onChange={(e) => setPanelWidth(parseInt(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2"
                  />
                </div>
              </div>

              {/* Status Readout */}
              <div className="border-t border-white/[0.06] pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-wider text-white/30 uppercase">
                    ARCHIVOS EN COLA
                  </span>
                  <span className="text-[9px] font-mono tabular-nums text-white/60">{files.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-wider text-white/30 uppercase">
                    MODO ACTIVO
                  </span>
                  <span className="text-[9px] font-mono text-white/60">
                    {activeEmbed ? 'EMBED' : activeFile ? 'LOCAL FILE' : 'AWAITING'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono tracking-wider text-white/30 uppercase">
                    ESTADO
                  </span>
                  <span
                    className={`text-[9px] font-mono tracking-wider ${
                      isPlaying || isMicActive ? 'text-emerald-400' : 'text-white/30'
                    }`}
                  >
                    {isPlaying ? 'PLAYING' : 'PAUSED'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MiniPlayer;
