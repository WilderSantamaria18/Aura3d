import React, { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { audioEngine } from "../../services/audioEngine";
import { feedPlaybackClock } from "../../services/playbackClock";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { fetchRelatedTracks } from "../../services/youtubeDiscovery";

/* ──────────────────────────────────────────────────────────────
   YT IFrame API global types
────────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId?: string;
          host?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: any }) => void;
            onStateChange?: (e: { data: number; target: any }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => any;
      PlayerState?: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
    __auraYtApiReady?: boolean;
  }
}

/* ──────────────────────────────────────────────────────────────
   Portal singleton
   El iframe vive una sola vez en document.body y NUNCA se destruye:
   solo cambia su posición/tamaño. Se mueve con transform (compuesto por
   la GPU) y sin animaciones de tamaño; antes se reescribían left/top y
   una transición de 200 ms en cada fotograma, lo que provocaba tirones y
   una proporción desfasada mientras el reproductor se animaba.
────────────────────────────────────────────────────────────── */
const PORTAL_ID = "aura-yt-singleton-portal";
const MOUNT_ID = "aura-global-youtube-player-mount";
const OFFSCREEN = "translate3d(-9999px, -9999px, 0)";

/** Tiempo máximo que se espera a que el reproductor de YouTube empiece antes de avisar del problema */
const YT_START_TIMEOUT_MS = 15000;

let lastPlacedKey = "";
let portalWidth = 0; // ancho actual visible (0 = oculto), para elegir la calidad

function getOrCreatePortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    Object.assign(portal.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      width: "1px",
      height: "1px",
      transform: OFFSCREEN,
      overflow: "hidden",
      zIndex: "51",
      borderRadius: "12px",
      background: "#000",
      willChange: "transform, width, height",
      contain: "layout paint",
    });

    const mount = document.createElement("div");
    mount.id = MOUNT_ID;
    mount.style.cssText = "width:100%;height:100%;position:relative;";
    portal.appendChild(mount);
    document.body.appendChild(portal);

    // Responsive iframe styles: Ensures YouTube video always fills 100% width/height without clipping
    if (!document.getElementById("aura-yt-responsive-style")) {
      const style = document.createElement("style");
      style.id = "aura-yt-responsive-style";
      style.textContent = `
        #${PORTAL_ID} iframe,
        #${PORTAL_ID} object,
        #${PORTAL_ID} embed {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          border-radius: inherit !important;
          object-fit: cover !important;
          display: block !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
  return portal;
}

function placePortal(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  interactive?: boolean;
}) {
  // Medios píxeles para la posición y enteros para el tamaño: evita iframes borrosos
  const x = Math.round(rect.left * 2) / 2;
  const y = Math.round(rect.top * 2) / 2;
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  const radius = rect.borderRadius || "12px";
  const interactive = rect.interactive !== false;
  const key = `${x}|${y}|${w}|${h}|${radius}|${interactive}`;
  if (key === lastPlacedKey) return; // sin cambios: no se toca el DOM
  lastPlacedKey = key;
  portalWidth = w;

  const portal = getOrCreatePortal();
  portal.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  portal.style.width = `${w}px`;
  portal.style.height = `${h}px`;
  portal.style.borderRadius = radius;
  portal.style.pointerEvents = interactive ? "auto" : "none";
  applyQuality();
}

function hidePortal() {
  if (lastPlacedKey === "hidden") return;
  lastPlacedKey = "hidden";
  portalWidth = 0;
  const portal = document.getElementById(PORTAL_ID);
  if (portal) {
    portal.style.transform = OFFSCREEN;
    portal.style.width = "1px";
    portal.style.height = "1px";
    portal.style.pointerEvents = "none";
  }
  applyQuality();
}

let activeHolderId: string | null = null;

/* ──────────────────────────────────────────────────────────────
   Singleton YT.Player (nivel de módulo)
────────────────────────────────────────────────────────────── */
let ytPlayer: any = null;
let ytPlayerReady = false;
let ytCurrentVideoId = "";
let lastQuality = "";
let errorRetries: Record<string, number> = {};

// Último estado deseado. Se actualiza en cada render del controlador: así los callbacks del
// iframe (que pueden dispararse mucho después) nunca usan un videoId o un estado obsoletos.
const latest: { videoId?: string; isPlaying: boolean } = { videoId: undefined, isPlaying: false };

// Manejadores vigentes: los eventos del iframe viven mucho más que un render, así que leen de aquí
// y no de los callbacks capturados al crear el reproductor (que quedarían obsoletos).
const liveHandlers: { onEnded: () => void; onUnavailable?: (videoId: string) => void } = {
  onEnded: () => {},
};

/** Calidad según el tamaño visible: en modo solo-audio se pide la más baja para ahorrar red. */
function applyQuality() {
  if (!ytPlayer || !ytPlayerReady) return;
  const q = portalWidth === 0 ? "small" : portalWidth < 300 ? "small" : portalWidth < 520 ? "medium" : portalWidth < 900 ? "large" : "hd720";
  if (q === lastQuality) return;
  lastQuality = q;
  try {
    ytPlayer.setPlaybackQuality?.(q);
  } catch {
    /* YouTube puede ignorarlo */
  }
}

function playSafe() {
  try {
    ytPlayer?.playVideo?.();
  } catch {
    /* ignorar */
  }
}

/** Crea el reproductor o cambia de video. Siempre usa `latest`, nunca variables capturadas. */
function createOrUpdatePlayer(_handlers: { onEnded: () => void; onUnavailable?: (videoId: string) => void }) {
  const videoId = latest.videoId;
  if (!window.YT || !window.YT.Player || !videoId) return;
  getOrCreatePortal();

  if (!ytPlayer) {
    try {
      ytPlayer = new window.YT.Player(MOUNT_ID, {
        videoId,
        // Modo de privacidad mejorada: sin cookies de seguimiento ni las peticiones de conversión
        // de anuncios a doubleclick.net que ensucian la consola con errores de CORS
        host: "https://www.youtube.com",
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
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
          widget_referrer: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (e: { target: any }) => {
            ytPlayerReady = true;
            const store = usePlayerStore.getState();
            e.target.setVolume(store.isMuted ? 0 : Math.round(store.volume * 100));
            // Si mientras cargaba se eligió otro video, se cambia ahora
            if (latest.videoId && latest.videoId !== ytCurrentVideoId) {
              ytCurrentVideoId = latest.videoId;
              e.target.loadVideoById(latest.videoId);
            }
            applyQuality();
            if (latest.isPlaying) e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: any }) => {
            const YTS = window.YT?.PlayerState;
            if (!YTS) return;
            if (e.data === YTS.PLAYING) {
              const state = usePlayerStore.getState();
              state.setIsPlaying(true);
              state.setPlaybackStatus(
                'playing',
                state.currentTrack ? `Reproduciendo: ${state.currentTrack.title}` : null
              );
              const dur = e.target.getDuration?.();
              if (dur && dur > 0) usePlayerStore.getState().setDuration(dur);
            } else if (e.data === YTS.BUFFERING) {
              const state = usePlayerStore.getState();
              state.setPlaybackStatus(
                'buffering',
                state.currentTrack ? `Cargando desde YouTube: ${state.currentTrack.title}` : 'Cargando desde YouTube…'
              );
            } else if (e.data === YTS.PAUSED) {
              // Un video cargándose puede reportar PAUSED brevemente: solo se refleja si el usuario pausó
              if (!latest.isPlaying) usePlayerStore.getState().setIsPlaying(false);
              else setTimeout(playSafe, 250);
            } else if (e.data === YTS.ENDED) {
              liveHandlers.onEnded();
            } else if (e.data === YTS.CUED || e.data === YTS.UNSTARTED) {
              if (latest.isPlaying) setTimeout(playSafe, 300);
            }
          },
          onError: (e: { data: number }) => {
            const id = latest.videoId || "";
            // 5 = error del reproductor HTML5: se reintenta una vez desde el mismo punto
            if (e.data === 5 && id && (errorRetries[id] ?? 0) < 1) {
              errorRetries[id] = (errorRetries[id] ?? 0) + 1;
              try {
                const t = ytPlayer?.getCurrentTime?.() || 0;
                ytPlayer?.loadVideoById?.({ videoId: id, startSeconds: t });
              } catch {
                /* ignorar */
              }
              return;
            }
            // 2, 100, 101, 150: no se puede reproducir → resolver inmediatamente
            const state = usePlayerStore.getState();
            state.setPlaybackStatus('resolving', 'Buscando versión alternativa disponible en YouTube…');
            if (id && liveHandlers.onUnavailable) {
              liveHandlers.onUnavailable(id);
            } else {
              setTimeout(() => liveHandlers.onEnded(), 800);
            }
          },
        },
      });
      ytCurrentVideoId = videoId;
    } catch (err) {
      console.error("[YT] Error creating player:", err);
    }
  } else if (ytPlayerReady && ytCurrentVideoId !== videoId) {
    try {
      ytCurrentVideoId = videoId;
      lastQuality = "";
      ytPlayer.loadVideoById(videoId);
      if (latest.isPlaying) setTimeout(playSafe, 200);
    } catch {
      /* ignorar */
    }
  }
}

/** Carga la API una sola vez y, cuando esté lista, crea el reproductor con el video MÁS RECIENTE. */
function ensureYtApi(handlers: { onEnded: () => void; onUnavailable?: (videoId: string) => void }) {
  if (typeof window === "undefined") return;
  if (window.YT && window.YT.Player) {
    window.__auraYtApiReady = true;
    createOrUpdatePlayer(handlers);
    return;
  }
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev();
    window.__auraYtApiReady = true;
    createOrUpdatePlayer(handlers);
  };
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  }
}

/* ──────────────────────────────────────────────────────────────
   GlobalYouTubeController
   Gestiona el ciclo de vida de la YT.Player API. Se monta una vez en la app.
────────────────────────────────────────────────────────────── */
export const GlobalYouTubeController: React.FC = () => {
  const { playSavedTrack } = useAudioPlayer();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);

  const intervalRef = useRef<number | null>(null);

  const videoId =
    currentTrack?.youtubeId ||
    (currentTrack?.id?.startsWith("yt_") ? currentTrack.id.replace(/^yt_/, "") : undefined);

  const isYT = Boolean(currentTrack && (currentTrack.sourceType === "youtube" || Boolean(videoId)) && videoId);

  // Siempre el último valor, aunque el callback del iframe se dispare tarde
  latest.videoId = isYT ? videoId : undefined;
  latest.isPlaying = isPlaying;

  /* ── Pista terminada → siguiente en la cola (con Radio Infinita) ── */
  const handleEnded = useCallback(async () => {
    const store = usePlayerStore.getState();
    let next = store.nextTrack();

    if (!next && store.isInfiniteRadioActive && store.currentTrack) {
      const vid =
        store.currentTrack.youtubeId ||
        (store.currentTrack.id?.startsWith("yt_")
          ? store.currentTrack.id.replace(/^yt_/, "")
          : "");
      try {
        const related = await fetchRelatedTracks(
          vid,
          store.currentTrack.title,
          store.currentTrack.artist,
          store.currentTrack.duration
        );
        if (related && related.length > 0) {
          const currentQ = usePlayerStore.getState().queue;
          const existingIds = new Set(currentQ.map((t) => t.id || t.youtubeId));
          const fresh = related.filter((t) => !existingIds.has(t.id || t.youtubeId));
          const toAdd = fresh.length > 0 ? fresh : related;
          const nextTrackItem = toAdd[0];
          usePlayerStore.setState({
            queue: [...currentQ, ...toAdd],
            queueIndex: currentQ.length,
            currentTrack: nextTrackItem,
          });
          next = nextTrackItem;
        }
      } catch (err) {
        console.warn("[GlobalYouTubePlayer] Infinite radio replenishment error:", err);
      }
    }

    if (next) {
      void playSavedTrack(next).catch((error) => {
        console.error('[GlobalYouTubePlayer] No se pudo reproducir la siguiente pista:', error);
      });
    } else if (store.queue.length > 0) {
      const first = store.queue[0];
      usePlayerStore.setState({ queueIndex: 0 });
      void playSavedTrack(first).catch((error) => {
        console.error('[GlobalYouTubePlayer] No se pudo reiniciar la cola:', error);
      });
    }
  }, [playSavedTrack]);

  const handleUnavailable = useCallback(
    (unavailableVideoId: string) => {
      const track = usePlayerStore.getState().currentTrack;
      if (!track) return;
      void playSavedTrack(track, {
        forceYouTubeSearch: true,
        excludedIds: [unavailableVideoId],
      }).catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[GlobalYouTubePlayer] No se encontró una versión alternativa:', error);
      });
    },
    [playSavedTrack]
  );

  // Los eventos del iframe leen siempre los manejadores vigentes (se actualizan tras cada render)
  useEffect(() => {
    liveHandlers.onEnded = handleEnded;
    liveHandlers.onUnavailable = handleUnavailable;
  });

  /* ── 1. Cargar la API una vez ───────────────────────────────── */
  useEffect(() => {
    ensureYtApi({ onEnded: handleEnded, onUnavailable: handleUnavailable });
  }, [handleEnded, handleUnavailable]);

  /* ── 2. Crear/actualizar el reproductor al cambiar el video ─── */
  useEffect(() => {
    if (!isYT || !videoId) {
      if (ytPlayer && ytPlayerReady) {
        try {
          ytPlayer.pauseVideo();
        } catch {
          /* ignorar */
        }
      }
      hidePortal();
      audioEngine.setIframeMode(false);
      return;
    }
    errorRetries = {};
    createOrUpdatePlayer({ onEnded: handleEnded, onUnavailable: handleUnavailable });
  }, [isYT, videoId, handleEnded, handleUnavailable]);

  /* ── 3. Play / Pausa ────────────────────────────────────────── */
  useEffect(() => {
    if (!ytPlayer || !ytPlayerReady || !isYT) return;
    try {
      const st = ytPlayer.getPlayerState?.();
      const YTS = window.YT?.PlayerState;
      if (isPlaying) {
        if (st !== YTS?.PLAYING && st !== YTS?.BUFFERING) ytPlayer.playVideo();
      } else if (st === YTS?.PLAYING || st === YTS?.BUFFERING) {
        ytPlayer.pauseVideo();
      }
    } catch {
      /* ignorar */
    }
  }, [isPlaying, isYT]);

  /* ── 4. Volumen ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!ytPlayer || !ytPlayerReady || !isYT) return;
    try {
      ytPlayer.setVolume(isMuted ? 0 : Math.round(volume * 100));
    } catch {
      /* ignorar */
    }
  }, [volume, isMuted, isYT]);

  /* ── 5. Seek Throttling (evita saturar el iframe y congelar el buffer) ── */
  useEffect(() => {
    let lastSeek = 0;
    let pendingSec: number | null = null;
    let seekTimer: ReturnType<typeof setTimeout> | null = null;

    const doSeek = (sec: number) => {
      if (ytPlayer && ytPlayerReady) {
        try {
          ytPlayer.seekTo(sec, true);
          feedPlaybackClock(sec, latest.isPlaying, true);
        } catch {
          /* ignorar */
        }
      }
    };

    const handler = (e: Event) => {
      const sec = (e as CustomEvent<{ seconds: number }>).detail?.seconds;
      if (typeof sec !== "number") return;
      const now = performance.now();
      feedPlaybackClock(sec, latest.isPlaying, true);

      if (now - lastSeek > 100) {
        lastSeek = now;
        doSeek(sec);
      } else {
        pendingSec = sec;
        if (seekTimer) clearTimeout(seekTimer);
        seekTimer = setTimeout(() => {
          if (pendingSec !== null) {
            doSeek(pendingSec);
            pendingSec = null;
          }
        }, 100);
      }
    };

    window.addEventListener("aura:youtube-seek", handler);
    return () => {
      window.removeEventListener("aura:youtube-seek", handler);
      if (seekTimer) clearTimeout(seekTimer);
    };
  }, []);

  /* ── 5b. Recarga Forzada (evento manual o automático de desatasco) ── */
  useEffect(() => {
    const handleReload = () => {
      if (!ytPlayer || !ytPlayerReady || !latest.videoId) return;
      try {
        const t = ytPlayer.getCurrentTime?.() || 0;
        lastQuality = "";
        ytPlayer.loadVideoById({ videoId: latest.videoId, startSeconds: t });
        if (latest.isPlaying) setTimeout(playSafe, 250);
      } catch {
        /* ignorar */
      }
    };
    window.addEventListener("aura:youtube-reload", handleReload);
    return () => window.removeEventListener("aura:youtube-reload", handleReload);
  }, []);

  /* ── 6. Sondeo de tiempo (100 ms) + vigilancia inteligente de atascos ───── */
  useEffect(() => {
    if (!isYT || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    let lastStoreUpdate = 0;
    let lastTime = -1;
    let lastAdvance = performance.now();
    let bufferingSince: number | null = null;
    let recoverStep = 0;

    const recover = () => {
      if (!ytPlayer || !ytPlayerReady) return;
      const id = latest.videoId;
      if (!id) return;
      try {
        const t = ytPlayer.getCurrentTime?.() || 0;
        if (recoverStep === 0) {
          ytPlayer.playVideo();
        } else if (recoverStep === 1) {
          ytPlayer.seekTo(t, true);
          ytPlayer.playVideo();
        } else if (recoverStep >= 2) {
          // Recargar video desde el mismo punto temporal
          lastQuality = "";
          ytPlayer.loadVideoById({ videoId: id, startSeconds: t });
        }
      } catch {
        /* ignorar */
      }
      recoverStep++;
      lastAdvance = performance.now();
    };

    intervalRef.current = window.setInterval(() => {
      if (!ytPlayer || !ytPlayerReady) return;
      try {
        const now = performance.now();
        const t = ytPlayer.getCurrentTime?.();
        const d = ytPlayer.getDuration?.();
        const state = ytPlayer.getPlayerState?.();
        const YTS = window.YT?.PlayerState;

        // Vigilancia de buffering infinito (> 4.5 segundos en estado BUFFERING)
        if (state === YTS?.BUFFERING) {
          if (!bufferingSince) bufferingSince = now;
          else if (now - bufferingSince > 4500) {
            bufferingSince = now;
            recover();
          }
        } else {
          bufferingSince = null;
        }

        if (typeof t === "number" && !isNaN(t)) {
          // Reloj rápido para las letras (a 60 fps se interpola entre muestras)
          feedPlaybackClock(t, state === YTS?.PLAYING, true);
          if (Math.abs(t - lastTime) > 0.05) {
            lastAdvance = now;
            lastTime = t;
            recoverStep = 0;
          }
          // El store (y con él la interfaz) se actualiza más despacio
          if (now - lastStoreUpdate >= 250) {
            lastStoreUpdate = now;
            setCurrentTime(t);
          }
        }
        if (typeof d === "number" && d > 0 && !isNaN(d)) setDuration(d);

        // Vigilancia: debería avanzar y lleva 5 s sin hacerlo → recuperar
        const shouldAdvance = state !== YTS?.PAUSED && state !== YTS?.ENDED;
        if (shouldAdvance && now - lastAdvance > 5000) {
          if (recoverStep < 3) {
            recover();
          } else if (now - lastAdvance > 9500 && latest.videoId && liveHandlers.onUnavailable) {
            // Se congeló completamente tras varios intentos → resolver versión alternativa
            recoverStep = 0;
            liveHandlers.onUnavailable(latest.videoId);
          }
        }
      } catch {
        /* ignorar */
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isYT, isPlaying, setCurrentTime, setDuration]);

  /* ── 7. Al volver a la pestaña o recuperar la red, reanudar ─── */
  useEffect(() => {
    const resume = () => {
      if (!latest.isPlaying || !ytPlayer || !ytPlayerReady) return;
      try {
        const st = ytPlayer.getPlayerState?.();
        if (st !== window.YT?.PlayerState?.PLAYING) ytPlayer.playVideo();
      } catch {
        /* ignorar */
      }
    };
    const onVisible = () => {
      if (!document.hidden) resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resume);
    };
  }, []);

  /* ── 8. Modo iframe para el visualizador ────────────────────── */
  useEffect(() => {
    audioEngine.setIframeMode(Boolean(isYT && isPlaying));
    return () => audioEngine.setIframeMode(false);
  }, [isYT, isPlaying]);

  /* ── 9. Vigilancia: si no llega a reproducir, no se queda «cargando» para siempre ──
     El estado pasa a 'buffering' al pedir la canción y solo el propio reproductor lo pone en 'playing'.
     Si el vídeo no se puede incrustar, la API no responde o la red falla, se quedaba así indefinidamente. */
  const playbackStatus = usePlayerStore((s) => s.playbackStatus);
  useEffect(() => {
    if (!isYT || !isPlaying || playbackStatus !== "buffering") return;
    const timer = window.setTimeout(() => {
      const state = usePlayerStore.getState();
      if (state.playbackStatus === "buffering") {
        state.setPlaybackStatus(
          "error",
          "YouTube no responde. Comprueba tu conexión o prueba con otra canción."
        );
      }
    }, YT_START_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isYT, isPlaying, playbackStatus, videoId]);

  return null; // sin DOM propio: el portal se gestiona de forma imperativa
};

/* ──────────────────────────────────────────────────────────────
   GlobalYouTubePlayer
   Carcasa visual: coloca el portal singleton dentro de su hueco.
────────────────────────────────────────────────────────────── */
export interface GlobalYouTubePlayerProps {
  inMiniPlayer?: boolean;
  isMiniPlayerExpanded?: boolean;
  activeTab?: string;
  showVideoInPlayer?: boolean;
  interactive?: boolean;
  onToggleVideoView?: () => void;
  onExpandMiniPlayer?: () => void;
  className?: string;
  borderRadius?: string;
}

export const GlobalYouTubePlayer: React.FC<GlobalYouTubePlayerProps> = ({
  showVideoInPlayer = true,
  interactive = true,
  className = "w-full aspect-video rounded-2xl bg-black overflow-hidden",
  borderRadius = "12px",
}) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const instanceId = useRef<string>(Math.random().toString(36).substring(2, 9));

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const videoId =
    currentTrack?.youtubeId ||
    (currentTrack?.id?.startsWith("yt_") ? currentTrack.id.replace(/^yt_/, "") : undefined);
  const isYT = Boolean(currentTrack && videoId);

  const sync = useCallback(() => {
    const slot = slotRef.current;
    if (slot && !document.hidden) {
      const r = slot.getBoundingClientRect();
      if (r.width > 10 && r.height > 10) {
        activeHolderId = instanceId.current;
        placePortal({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          borderRadius,
          interactive,
        });
      } else if (activeHolderId === instanceId.current) {
        hidePortal();
      }
    } else if (!slot && activeHolderId === instanceId.current) {
      hidePortal();
    }
  }, [borderRadius, interactive]);

  /* Mantiene el portal alineado con el hueco usando ResizeObserver + ventana de tracking de 600ms para animaciones */
  useEffect(() => {
    if (!isYT || !showVideoInPlayer) {
      if (activeHolderId === instanceId.current) {
        activeHolderId = null;
        hidePortal();
      }
      return;
    }

    activeHolderId = instanceId.current;

    // 1. Sincronización inmediata
    sync();

    // 2. Tracking activo a 60fps durante la transición física de Framer Motion (600 ms)
    // Luego se apaga el rAF para evitar "layout thrashing" y congelamientos en reposo
    const startTime = performance.now();
    const trackTransition = () => {
      sync();
      if (performance.now() - startTime < 600) {
        rafRef.current = requestAnimationFrame(trackTransition);
      }
    };
    rafRef.current = requestAnimationFrame(trackTransition);

    // 3. ResizeObserver para cambios de tamaño responsivos sin coste en CPU
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && slotRef.current) {
      ro = new ResizeObserver(() => {
        sync();
      });
      ro.observe(slotRef.current);
    }

    // 4. Escuchadores de ventana
    const onResize = () => sync();
    const onScroll = () => sync();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("aura:sync-yt-slot", sync);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("aura:sync-yt-slot", sync);
      if (activeHolderId === instanceId.current) {
        activeHolderId = null;
        hidePortal();
      }
    };
  }, [isYT, showVideoInPlayer, sync]);

  if (!isYT) return null;

  return <div ref={slotRef} className={className} aria-label="Reproductor de YouTube" />;
};

export default GlobalYouTubePlayer;

