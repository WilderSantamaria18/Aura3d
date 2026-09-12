import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Volume2, Maximize2, Minimize2, Eye, EyeOff, Play, AlertCircle, ExternalLink } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { audioEngine } from '../../services/audioEngine';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number; target: any }) => void;
            onError?: (event: { data: number; target: any }) => void;
          };
        }
      ) => any;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface GlobalYouTubePlayerProps {
  inMiniPlayer?: boolean;
  isMiniPlayerExpanded?: boolean;
  activeTab?: 'player' | 'search' | 'queue';
  showVideoInPlayer?: boolean;
  onToggleVideoView?: () => void;
  onExpandMiniPlayer?: () => void;
}

export const GlobalYouTubePlayer: React.FC<GlobalYouTubePlayerProps> = ({
  inMiniPlayer = false,
  isMiniPlayerExpanded = false,
  activeTab = 'player',
  showVideoInPlayer = true,
  onToggleVideoView,
  onExpandMiniPlayer,
}) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(true);
  const [isMinimizedDock, setIsMinimizedDock] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const videoId = currentTrack?.youtubeId;
  const isYouTubeIframe = Boolean(
    currentTrack &&
      currentTrack.sourceType === 'youtube' &&
      (currentTrack.isIframePlayback || !currentTrack.url) &&
      videoId
  );

  // 1. Cargar dinámicamente la API oficial de YouTube Iframe
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      setIsApiLoaded(true);
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  }, []);

  // 2. Control para pasar a la siguiente pista al terminar
  const handleTrackEnded = useCallback(() => {
    const store = usePlayerStore.getState();
    const next = store.nextTrack();
    if (next) {
      store.playTrack(next);
    } else if (store.queue.length > 0) {
      const first = store.queue[0];
      usePlayerStore.setState({ queueIndex: 0, currentTrack: first, isPlaying: true });
    }
  }, []);

  // 3. Inicializar o recargar YT.Player cuando la API esté lista y haya videoId
  useEffect(() => {
    if (!isApiLoaded || !isYouTubeIframe || !videoId) {
      return;
    }

    const targetDivId = 'aura-global-youtube-player-mount';

    if (!playerRef.current) {
      try {
        const player = new window.YT!.Player(targetDivId, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            disablekb: 0,
            enablejsapi: 1,
            fs: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: { target: any }) => {
              playerRef.current = event.target;
              setIsPlayerReady(true);
              setPlaybackError(null);

              const currentVol = usePlayerStore.getState().isMuted
                ? 0
                : Math.round(usePlayerStore.getState().volume * 100);
              event.target.setVolume(currentVol);

              if (usePlayerStore.getState().isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: { data: number; target: any }) => {
              const state = event.data;
              const YTState = window.YT?.PlayerState;

              if (!YTState) return;

              if (state === YTState.PLAYING) {
                setNeedsUserGesture(false);
                setPlaybackError(null);
                setIsPlaying(true);
                const dur = event.target.getDuration();
                if (dur && dur > 0) {
                  setDuration(dur);
                }
              } else if (state === YTState.PAUSED) {
                setIsPlaying(false);
              } else if (state === YTState.ENDED) {
                handleTrackEnded();
              } else if (state === YTState.CUED) {
                if (usePlayerStore.getState().isPlaying) {
                  event.target.playVideo();
                }
              }
            },
            onError: (event: { data: number }) => {
              console.warn('[GlobalYouTubePlayer] Error en YouTube Embed:', event.data);
              // Códigos 101/150: Restricción de embedding del creador
              if (event.data === 101 || event.data === 150) {
                setPlaybackError('Esta pista no permite reproducción externa. Saltando...');
                setTimeout(() => handleTrackEnded(), 1500);
              } else {
                setPlaybackError('Aviso: Reproducción limitada por YouTube');
              }
            },
          },
        });
      } catch (err) {
        console.error('[GlobalYouTubePlayer] Error instanciando YT.Player:', err);
      }
    } else {
      // Si el reproductor ya existe y el video cambia
      try {
        const currentLoadedId = playerRef.current.getVideoData?.()?.video_id;
        if (currentLoadedId !== videoId) {
          setIsPlayerReady(false);
          playerRef.current.loadVideoById(videoId);
          setIsPlayerReady(true);
        }
      } catch {
        // En caso de reciclado
      }
    }
  }, [isApiLoaded, isYouTubeIframe, videoId, handleTrackEnded, setIsPlaying, setDuration]);

  // 4. Sincronizar Play / Pause con el estado de Zustand
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !isYouTubeIframe) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      console.debug('[GlobalYouTubePlayer] play/pause error:', e);
    }
  }, [isPlaying, isPlayerReady, isYouTubeIframe]);

  // 5. Sincronizar Volumen
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !isYouTubeIframe) return;

    try {
      const vol = isMuted ? 0 : Math.round(volume * 100);
      playerRef.current.setVolume(vol);
    } catch {}
  }, [volume, isMuted, isPlayerReady, isYouTubeIframe]);

  // 6. Escuchar eventos de Seek (ej. al mover la barra de progreso)
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      if (typeof customEvent.detail?.seconds === 'number' && playerRef.current && isPlayerReady) {
        try {
          playerRef.current.seekTo(customEvent.detail.seconds, true);
        } catch {}
      }
    };

    window.addEventListener('aura:youtube-seek', handleSeek);
    return () => window.removeEventListener('aura:youtube-seek', handleSeek);
  }, [isPlayerReady]);

  // 6.1 Sincronizar reactividad visual 3D cuando suena YouTube por iframe
  useEffect(() => {
    audioEngine.setIframeMode(Boolean(isYouTubeIframe && isPlaying));
    return () => {
      audioEngine.setIframeMode(false);
    };
  }, [isYouTubeIframe, isPlaying]);

  // 7. Timer periódico para sincronizar tiempo de reproducción
  useEffect(() => {
    if (!isYouTubeIframe || !isPlaying || !playerRef.current || !isPlayerReady) return;

    const interval = setInterval(() => {
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const current = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (typeof current === 'number' && !isNaN(current)) {
            setCurrentTime(current);
          }
          if (typeof dur === 'number' && dur > 0 && !isNaN(dur)) {
            setDuration(dur);
          }
        }
      } catch {}
    }, 300);

    return () => clearInterval(interval);
  }, [isYouTubeIframe, isPlaying, isPlayerReady, setCurrentTime, setDuration]);

  // 8. Detección de bloqueo de autoplay del navegador
  useEffect(() => {
    if (!isYouTubeIframe || !isPlaying || !isPlayerReady) return;

    const timeout = setTimeout(() => {
      if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
        const state = playerRef.current.getPlayerState();
        if (state !== 1 && state !== 3) {
          setNeedsUserGesture(true);
        }
      }
    }, 1800);

    return () => clearTimeout(timeout);
  }, [isYouTubeIframe, isPlaying, isPlayerReady, videoId]);

  // Acción de desbloqueo explícito por el usuario
  const handleUnlockAudioGesture = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        playerRef.current.playVideo();
        setNeedsUserGesture(false);
      } catch {}
    }
  };

  if (!isYouTubeIframe) {
    return null;
  }

  // ── MODO 1: Integrado dentro del MiniPlayer ────────────────────────────────────
  if (inMiniPlayer) {
    const isPlayerTab = activeTab === 'player';

    // A) Cuando el MiniPlayer está colapsado a píldora:
    // El video se muestra como un mini visor PiP flotante arriba de la píldora para no perder la reproducción
    if (!isMiniPlayerExpanded) {
      return (
        <aside
          aria-label="Reproductor de YouTube en miniatura"
          className="fixed bottom-20 left-4 z-50 w-56 sm:w-64 rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#080b16]/95 backdrop-blur-2xl p-2 shadow-[0_15px_40px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-1 mb-1 px-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-mono font-bold text-cyan-300 truncate">
                YouTube Player
              </span>
            </div>
            {onExpandMiniPlayer && (
              <button
                onClick={onExpandMiniPlayer}
                className="text-[10px] font-mono text-white/60 hover:text-white px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-0.5"
                title="Abrir MiniPlayer completo"
              >
                <span>Expandir</span>
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {needsUserGesture && (
            <button
              onClick={handleUnlockAudioGesture}
              className="w-full mb-1.5 py-1 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] font-mono flex items-center justify-center gap-1 transition-all animate-bounce"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Tocar para Activar Sonido</span>
            </button>
          )}

          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
            <div id="aura-global-youtube-player-mount" className="w-full h-full" />
          </div>
        </aside>
      );
    }

    // B) Cuando el MiniPlayer está expandido:
    return (
      <div className="w-full flex flex-col gap-2">
        {/* Encabezado del visor de video en el MiniPlayer */}
        <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-mono text-cyan-300">
          <div className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="font-semibold truncate">
              {isPlayerTab ? 'Video de YouTube Oficial' : 'Reproduciendo en Segundo Plano'}
            </span>
          </div>

          {isPlayerTab && onToggleVideoView && (
            <button
              onClick={onToggleVideoView}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[10px] transition-colors border border-cyan-500/20"
              title={showVideoInPlayer ? 'Alternar a portada' : 'Ver video'}
            >
              {showVideoInPlayer ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Ver Portada</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Ver Video</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Alerta de bloqueo de autoplay */}
        {needsUserGesture && (
          <button
            onClick={handleUnlockAudioGesture}
            className="w-full py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all animate-bounce shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Tocar para Activar Audio de YouTube</span>
          </button>
        )}

        {/* Alerta de embedding */}
        {playbackError && (
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{playbackError}</span>
          </div>
        )}

        {/* Contenedor del Iframe dentro del MiniPlayer */}
        <div
          className={`w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-black shadow-2xl transition-all duration-300 ${
            isPlayerTab
              ? showVideoInPlayer
                ? 'aspect-video'
                : 'h-14 opacity-50 hover:opacity-100'
              : 'h-24 opacity-80 hover:opacity-100'
          }`}
        >
          <div id="aura-global-youtube-player-mount" className="w-full h-full" />
        </div>
      </div>
    );
  }

  // ── MODO 2: Standalone Floating Dock (si no está montado en MiniPlayer) ─────────
  return (
    <aside
      aria-label="Reproductor de YouTube"
      ref={containerRef}
      className={`fixed z-50 transition-all duration-300 pointer-events-auto ${
        showVideoPreview
          ? 'bottom-20 right-4 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 bg-black/90 backdrop-blur-md'
          : isMinimizedDock
          ? 'bottom-20 right-4 w-44 rounded-xl border border-white/10 bg-black/80 backdrop-blur-md p-2 shadow-lg'
          : 'bottom-20 right-4 w-64 rounded-xl border border-cyan-500/20 bg-neutral-950/85 backdrop-blur-md p-2.5 shadow-xl'
      }`}
      style={
        isLucid
          ? {
              borderColor: `${lucidTheme.primary}40`,
              boxShadow: `0 8px 32px ${lucidTheme.primary}20`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPlaying ? 'bg-cyan-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isPlaying ? 'bg-cyan-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[10px] font-mono tracking-wider font-semibold text-cyan-300 truncate">
            STREAM OFICIAL YT
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVideoPreview((prev) => !prev)}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title={showVideoPreview ? 'Ocultar video' : 'Ver video'}
          >
            {showVideoPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {needsUserGesture && (
        <button
          onClick={handleUnlockAudioGesture}
          className="w-full mb-2 py-1.5 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all animate-bounce shadow-lg"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Tocar para Activar Sonido</span>
        </button>
      )}

      <div
        className={`w-full overflow-hidden transition-all duration-300 rounded-lg bg-black ${
          showVideoPreview ? 'aspect-video shadow-inner' : 'h-16 opacity-40 hover:opacity-100'
        }`}
      >
        <div id="aura-global-youtube-player-mount" className="w-full h-full" />
      </div>
    </aside>
  );
};
