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
  ExternalLink,
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
const parseEmbedUrl = (rawUrl: string): { type: 'youtube' | 'spotify' | null; embedUrl: string | null } => {
  const trimmed = rawUrl.trim();
  // YouTube match (watch?v=, youtu.be/, shorts/, embed/)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
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
  const { loadFile, seek, togglePlayPause, startSystemCapture, isCapturing, playNext: enginePlayNext, playPrevious: enginePlayPrev } = useAudioEngine();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'embed' | 'settings'>('player');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [panelWidth, setPanelWidth] = useState(340);
  const [panelOpacity, setPanelOpacity] = useState(0.90);
  const [isDragOver, setIsDragOver] = useState(false);

  // Embed state (YouTube / Spotify)
  const [embedInput, setEmbedInput] = useState('');
  const [activeEmbed, setActiveEmbed] = useState<{ type: 'youtube' | 'spotify'; url: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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

  // ── Handle Embed submit ───────────────────────────────────────────────────
  const handleLoadEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseEmbedUrl(embedInput);
    if (parsed.type && parsed.embedUrl) {
      setActiveEmbed({ type: parsed.type, url: parsed.embedUrl });
      setActiveIdx(null);
      setActiveTab('player');
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
    seek(ratio * duration);
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
                ['player', Music2],
                ['queue', List],
                ['embed', Radio],
                ['settings', Sliders],
              ] as const
            ).map(([tab, Icon]) => (
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
                {tab}
              </button>
            ))}
          </div>


          {/* ── PLAYER TAB ─────────────────────────────────────────────── */}
          {activeTab === 'player' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Media viewer (Video / Embedded Iframe / Waveform Audio) */}
              <div className="flex-shrink-0 bg-black/50 border-b border-white/6">
                {activeEmbed ? (
                  <div className="w-full h-48 bg-black">
                    <iframe
                      src={activeEmbed.url}
                      className="w-full h-full border-0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
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
                    ? `STREAM: ${activeEmbed.type.toUpperCase()}`
                    : activeFile
                    ? activeFile.name
                    : isSystemSource
                    ? 'Captura de Pestaña / Sistema'
                    : 'Aura3D Engine'}
                </p>
                <p className="text-[10px] font-mono text-white/30 tracking-wider mt-0.5">
                  {activeEmbed
                    ? 'IFRAME EMBED'
                    : isVideo
                    ? 'VIDEO MP4'
                    : isSystemSource
                    ? 'LIVE FFT STREAM'
                    : 'AUDIO'}{' '}
                  &nbsp;·&nbsp; {fmt(duration)}
                </p>
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
                  onClick={togglePlayPause}
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

          {/* ── EMBED / STREAM TAB ────────────────────────────────────────── */}
          {activeTab === 'embed' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
                    YOUTUBE / SPOTIFY EMBED
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/40 leading-relaxed">
                  Pega un enlace de YouTube o Spotify para incrustar su reproductor en la barra lateral.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLoadEmbed} className="space-y-2">
                <input
                  type="text"
                  placeholder="https://youtube.com/watch?v=... o spotify.com/..."
                  value={embedInput}
                  onChange={(e) => setEmbedInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.1] rounded-lg text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/40"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-white text-black text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <ExternalLink className="w-3 h-3" />
                  CARGAR EMBED
                </button>
              </form>

              {/* System capture quick launcher */}
              <div className="border-t border-white/[0.06] pt-4 space-y-2">
                <span className="text-[9px] font-mono tracking-wider text-white/40 uppercase">
                  CAPTURA DIRECTA DE PESTAÑA
                </span>
                <p className="text-[10px] font-mono text-white/30">
                  Captura el audio de cualquier pestaña activa (YouTube, Spotify Web) sin audio duplicado.
                </p>
                <button
                  onClick={startSystemCapture}
                  className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 text-[10px] font-mono tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Radio className="w-3 h-3 text-emerald-400" />
                  CAPTURAR AUDIO DE NAVEGADOR
                </button>
              </div>
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
