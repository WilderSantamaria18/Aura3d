import React, { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { audioEngine } from "../../services/audioEngine";
import { feedPlaybackClock } from "../../services/playbackClock";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { fetchRelatedTracks } from "../../services/youtubeDiscovery";
import {
  awaitYouTubePlayback,
  getActiveYouTubeSession,
  notifyYouTubeEvent,
} from "../../services/youtubePlayerBridge";
import {
  classifyYouTubeErrorCode,
  YouTubePlaybackError,
  YT_ATTEMPT_TIMEOUT_MS,
  type YouTubeFailureReason,
} from "../../services/youtubeFallback";

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

/** Tiempo máximo para que la API del reproductor esté lista antes de recrearla. */
const YT_READY_TIMEOUT_MS = 8000;

/** Margen extra del vigilante para no competir con el presupuesto del pipeline. */
const YT_WATCHDOG_GRACE_MS = 2500;

/** Sin datos nuevos del buffer durante este tiempo se considera que hay un atasco real. */
const YT_STALL_MS = 12000;

/** Atasco sostenido antes de recargar el vídeo (último recurso, una sola vez). */
const YT_RELOAD_AFTER_MS = 30000;

/** Atasco sostenido tras la recarga antes de pasar al siguiente candidato. */
const YT_GIVE_UP_AFTER_MS = 15000;

/** Muestreo del hueco del vídeo: barato (sólo lee y compara) y sigue animaciones y scroll. */
const SLOT_SAMPLE_INTERVAL_MS = 50;

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
  zIndex?: number;
}) {
  // Medios píxeles para la posición y enteros para el tamaño: evita iframes borrosos
  const x = Math.round(rect.left * 2) / 2;
  const y = Math.round(rect.top * 2) / 2;
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  const radius = rect.borderRadius || "12px";
  const interactive = rect.interactive !== false;
  const z = rect.zIndex ?? 51;
  const key = `${x}|${y}|${w}|${h}|${radius}|${interactive}|${z}`;
  if (key === lastPlacedKey) return; // sin cambios: no se toca el DOM
  lastPlacedKey = key;
  portalWidth = w;

  const portal = getOrCreatePortal();
  portal.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  portal.style.width = `${w}px`;
  portal.style.height = `${h}px`;
  portal.style.borderRadius = radius;
  portal.style.pointerEvents = interactive ? "auto" : "none";
  // El z-index lo decide quien aloja el vídeo: el Modo Cine vive en z-[80], así que el
  // portal tiene que quedar por encima o el vídeo se ve detrás del fondo negro con blur.
  portal.style.zIndex = String(z);
  scheduleQualityUpdate();
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
  scheduleQualityUpdate();
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
let readyTimer: ReturnType<typeof setTimeout> | undefined;

/** Destruye el reproductor para poder recrearlo limpio (una inicialización fallida no puede
 *  dejar el singleton inservible: antes, si `onReady` no llegaba, se ignoraban todos los
 *  cambios de vídeo posteriores y la aplicación se quedaba «cargando» para siempre). */
function resetPlayer(reason: string) {
  if (readyTimer) {
    clearTimeout(readyTimer);
    readyTimer = undefined;
  }
  try {
    ytPlayer?.destroy?.();
  } catch {
    /* el iframe puede estar ya desmontado */
  }
  ytPlayer = null;
  ytPlayerReady = false;
  ytCurrentVideoId = "";
  lastQuality = "";
  console.warn("[YT] Reproductor reiniciado:", reason);
}

// Último estado deseado. Se actualiza en cada render del controlador: así los callbacks del
// iframe (que pueden dispararse mucho después) nunca usan un videoId o un estado obsoletos.
const latest: { videoId?: string; isPlaying: boolean } = { videoId: undefined, isPlaying: false };

// Manejadores vigentes: los eventos del iframe viven mucho más que un render, así que leen de aquí
// y no de los callbacks capturados al crear el reproductor (que quedarían obsoletos).
const liveHandlers: {
  onEnded: (videoId?: string) => void;
  onUnavailable?: (videoId: string, reason: YouTubeFailureReason) => void;
} = {
  onEnded: () => {},
};

/** `true` si el evento corresponde al vídeo que el reproductor tiene cargado ahora mismo.
 *  Un callback tardío del vídeo anterior no debe atribuirse a la canción en curso. */
function isCurrentVideoEvent(): boolean {
  return Boolean(ytCurrentVideoId) && ytCurrentVideoId === latest.videoId;
}

/**
 * Calidad del vídeo con histéresis y enfriamiento.
 *
 * `setPlaybackQuality` provoca un re-buffer: al abrir el Modo Cine el ancho visible pasa de
 * ~340 px a ~1040 px en 600 ms, y la versión anterior cambiaba de calidad en cada umbral
 * (small → medium → large → hd720) nada más arrancar. Eso era el «se pone a cargar y va
 * lento». Ahora: se espera a que el tamaño se estabilice, hay un margen del 25 % para no
 * cambiar por unos píxeles y nunca se cambia mientras el vídeo está cargando o recién
 * arrancado.
 */
const QUALITY_COOLDOWN_MS = 6000;
const QUALITY_SETTLE_MS = 900;
const QUALITY_STARTUP_GRACE_MS = 8000;

let qualityTimer: ReturnType<typeof setTimeout> | undefined;
let lastQualityChangeAt = 0;
let playbackStartedAt = 0;

function qualityForWidth(width: number): string {
  if (width === 0) return "small";
  if (width < 320) return "small";
  if (width < 560) return "medium";
  if (width < 940) return "large";
  return "hd720";
}

/** Programa la revisión de calidad cuando el tamaño lleve un momento quieto. */
function scheduleQualityUpdate() {
  if (qualityTimer) clearTimeout(qualityTimer);
  qualityTimer = setTimeout(() => {
    qualityTimer = undefined;
    applyQuality();
  }, QUALITY_SETTLE_MS);
}

function applyQuality() {
  if (!ytPlayer || !ytPlayerReady) return;

  const now = performance.now();
  const YTS = window.YT?.PlayerState;
  let state: number | undefined;
  try {
    state = ytPlayer.getPlayerState?.();
  } catch {
    state = undefined;
  }

  // No tocar la calidad mientras el vídeo se está cargando ni en los primeros segundos:
  // cada cambio reinicia el buffer.
  if (state === YTS?.BUFFERING) return;
  if (playbackStartedAt > 0 && now - playbackStartedAt < QUALITY_STARTUP_GRACE_MS) return;
  if (now - lastQualityChangeAt < QUALITY_COOLDOWN_MS) return;

  const q = qualityForWidth(portalWidth);
  if (q === lastQuality) return;
  lastQuality = q;
  lastQualityChangeAt = now;
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
function createOrUpdatePlayer(_handlers: {
  onEnded: (videoId?: string) => void;
  onUnavailable?: (videoId: string, reason: YouTubeFailureReason) => void;
}) {
  const videoId = latest.videoId;
  if (!window.YT || !window.YT.Player || !videoId) return;
  getOrCreatePortal();

  // El reproductor existente nunca llegó a estar listo y se pide otro vídeo: se recrea en vez
  // de ignorarlo (antes ese caso dejaba el singleton pegado al primer vídeo para siempre).
  if (ytPlayer && !ytPlayerReady && ytCurrentVideoId !== videoId) {
    resetPlayer("la inicialización anterior no completó");
  }

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
            if (readyTimer) {
              clearTimeout(readyTimer);
              readyTimer = undefined;
            }
            ytPlayerReady = true;
            const store = usePlayerStore.getState();
            e.target.setVolume(store.isMuted ? 0 : Math.round(store.volume * 100));
            // Si mientras cargaba se eligió otro video, se cambia ahora
            if (latest.videoId && latest.videoId !== ytCurrentVideoId) {
              ytCurrentVideoId = latest.videoId;
              lastQuality = "";
              lastQualityChangeAt = 0;
              playbackStartedAt = 0;
              e.target.loadVideoById(latest.videoId);
            }
            applyQuality();
            if (latest.isPlaying) e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: any }) => {
            const YTS = window.YT?.PlayerState;
            if (!YTS) return;
            const eventVideoId = ytCurrentVideoId;
            const isCurrent = eventVideoId === latest.videoId;

            if (e.data === YTS.PLAYING) {
              if (!isCurrent) return; // evento tardío de un vídeo ya reemplazado
              if (playbackStartedAt === 0) playbackStartedAt = performance.now();
              const state = usePlayerStore.getState();
              state.setIsPlaying(true);
              state.setPlaybackStatus(
                'playing',
                state.currentTrack ? `Reproduciendo: ${state.currentTrack.title}` : null
              );
              const dur = e.target.getDuration?.();
              if (dur && dur > 0) usePlayerStore.getState().setDuration(dur);
              notifyYouTubeEvent({ type: 'playing', videoId: eventVideoId });
            } else if (e.data === YTS.BUFFERING) {
              if (!isCurrent) return;
              const state = usePlayerStore.getState();
              // El pipeline de fallback ya comunica «retrying/loading» con su propio mensaje.
              if (!getActiveYouTubeSession()) {
                state.setPlaybackStatus(
                  'loading',
                  state.currentTrack ? `Cargando desde YouTube: ${state.currentTrack.title}` : 'Cargando desde YouTube…'
                );
              }
            } else if (e.data === YTS.PAUSED) {
              // Un video cargándose puede reportar PAUSED brevemente: solo se refleja si el usuario pausó
              if (!latest.isPlaying) usePlayerStore.getState().setIsPlaying(false);
              else setTimeout(playSafe, 250);
            } else if (e.data === YTS.ENDED) {
              if (!isCurrent) return;
              notifyYouTubeEvent({ type: 'ended', videoId: eventVideoId });
              liveHandlers.onEnded(eventVideoId);
            } else if (e.data === YTS.CUED || e.data === YTS.UNSTARTED) {
              if (latest.isPlaying) setTimeout(playSafe, 300);
            }
          },
          onError: (e: { data: number }) => {
            const id = ytCurrentVideoId || latest.videoId || '';
            if (!id) return;

            // 5 = error del reproductor HTML5: se reintenta una vez desde el mismo punto
            if (e.data === 5 && (errorRetries[id] ?? 0) < 1) {
              errorRetries[id] = (errorRetries[id] ?? 0) + 1;
              try {
                const t = ytPlayer?.getCurrentTime?.() || 0;
                ytPlayer?.loadVideoById?.({ videoId: id, startSeconds: t });
              } catch {
                /* ignorar */
              }
              return;
            }

            const reason = classifyYouTubeErrorCode(e.data);
            // El intento en curso se entera por el bus (fail-fast, sin esperar al timeout).
            notifyYouTubeEvent({ type: 'error', videoId: id, reason, code: e.data });

            // Si ya estaba sonando (no hay pipeline esperando), se arranca el fallback aquí.
            if (isCurrentVideoEvent() && !getActiveYouTubeSession() && liveHandlers.onUnavailable) {
              liveHandlers.onUnavailable(id, reason);
            }
          },
        },
      });
      ytCurrentVideoId = videoId;

      // Si la API nunca llama a onReady, el reproductor se recrea y el intento falla con
      // PLAYER_NOT_READY en vez de dejar la interfaz cargando de forma indefinida.
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = setTimeout(() => {
        if (ytPlayerReady) return;
        const stuckId = ytCurrentVideoId || latest.videoId;
        resetPlayer("onReady no llegó a tiempo");
        if (stuckId) {
          notifyYouTubeEvent({ type: 'error', videoId: stuckId, reason: 'PLAYER_NOT_READY' });
        }
      }, YT_READY_TIMEOUT_MS);
    } catch (err) {
      console.error("[YT] Error creating player:", err);
      const stuckId = latest.videoId;
      if (stuckId) notifyYouTubeEvent({ type: 'error', videoId: stuckId, reason: 'PLAYER_ERROR' });
    }
  } else if (ytPlayerReady && ytCurrentVideoId !== videoId) {
    try {
      ytCurrentVideoId = videoId;
      // Vídeo nuevo: se reinician los contadores de calidad y de gracia de arranque.
      lastQuality = "";
      lastQualityChangeAt = 0;
      playbackStartedAt = 0;
      ytPlayer.loadVideoById(videoId);
      if (latest.isPlaying) setTimeout(playSafe, 200);
    } catch {
      /* ignorar */
    }
  }
}

/** Carga la API una sola vez y, cuando esté lista, crea el reproductor con el video MÁS RECIENTE. */
function ensureYtApi(handlers: {
  onEnded: (videoId?: string) => void;
  onUnavailable?: (videoId: string, reason: YouTubeFailureReason) => void;
}) {
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
  const { playSavedTrack, playYouTubeWithFallback } = useAudioPlayer();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);

  const intervalRef = useRef<number | null>(null);
  // Vídeos que ya fallaron para la pista en curso: se acumulan para que el fallback nunca
  // vuelva a probar uno que ya falló (antes sólo se excluía el último y había ping-pong).
  const failedVideoIdsRef = useRef<{ trackId: string; ids: string[] }>({ trackId: '', ids: [] });

  const videoId =
    currentTrack?.youtubeId ||
    (currentTrack?.id?.startsWith("yt_") ? currentTrack.id.replace(/^yt_/, "") : undefined);

  const isYT = Boolean(currentTrack && (currentTrack.sourceType === "youtube" || Boolean(videoId)) && videoId);

  // Siempre el último valor, aunque el callback del iframe se dispare tarde
  latest.videoId = isYT ? videoId : undefined;
  latest.isPlaying = isPlaying;

  /* ── Pista terminada → siguiente en la cola (con Radio Infinita) ── */
  const handleEnded = useCallback(async (endedVideoId?: string) => {
    // Un «ended» tardío de una pista que ya no suena no debe saltar de canción.
    if (endedVideoId && latest.videoId && endedVideoId !== latest.videoId) return;
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
    (unavailableVideoId: string, reason: YouTubeFailureReason) => {
      const track = usePlayerStore.getState().currentTrack;
      if (!track) return;

      // Acumula los vídeos que ya fallaron para esta pista: nunca se reintenta uno fallido.
      if (failedVideoIdsRef.current.trackId !== track.id) {
        failedVideoIdsRef.current = { trackId: track.id, ids: [] };
      }
      const clean = unavailableVideoId.replace(/^yt_/, '');
      if (clean && !failedVideoIdsRef.current.ids.includes(clean)) {
        failedVideoIdsRef.current.ids.push(clean);
      }

      getActiveYouTubeSession()?.cancel();
      console.info(
        '[GlobalYouTubePlayer] Vídeo no reproducible, se busca una alternativa:',
        clean,
        reason
      );

      void playYouTubeWithFallback(track, { excludedIds: [...failedVideoIdsRef.current.ids] }).catch(
        (error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('[GlobalYouTubePlayer] No se encontró una versión alternativa:', error);
        }
      );
    },
    [playYouTubeWithFallback]
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

  /* ── 2b. Vigilante de arranque: si el vídeo no suena en el presupuesto, se busca
     otra versión. Cubre también la reproducción directa de un vídeo guardado, que no
     pasa por el pipeline: sin esto, un vídeo no incrustable dejaba «cargando» sin fin. */
  useEffect(() => {
    if (!isYT || !videoId || !isPlaying) return;
    const controller = new AbortController();
    const active = getActiveYouTubeSession();
    if (active && active.running && active.trackId === currentTrack?.id) {
      return () => controller.abort(); // el pipeline ya está vigilando este intento
    }

    void awaitYouTubePlayback(videoId, YT_ATTEMPT_TIMEOUT_MS + YT_WATCHDOG_GRACE_MS, controller.signal)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        const reason = error instanceof YouTubePlaybackError ? error.reason : 'PLAYER_TIMEOUT';
        if (!isCurrentVideoEvent() && latest.videoId !== videoId) return; // ya no es esta pista
        liveHandlers.onUnavailable?.(videoId, reason);
      });

    return () => controller.abort();
  }, [isYT, videoId, isPlaying, currentTrack?.id]);

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

  /* ── 6. Sondeo de tiempo (100 ms) + vigilancia de atascos ─────────────────
     Antes, 4,5 s en BUFFERING bastaban para «recuperar» el vídeo, y la escalera terminaba
     en `loadVideoById`: en una conexión lenta el buffer legítimo superaba ese umbral, se
     recargaba el vídeo entero y volvía a buffear desde cero — el «se pone a cargar y va
     lento». Ahora la señal es el **progreso real del buffer** (`getVideoLoadedFraction`):
     si la red sigue trayendo datos no se toca nada; sólo si no llega nada nuevo y el
     tiempo no avanza se dan toques suaves, y la recarga completa es el último recurso. */
  useEffect(() => {
    if (!isYT || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    let lastStoreUpdate = 0;
    let lastTime = -1;
    let lastAdvance = performance.now();
    let lastFraction = -1;
    let fractionChangedAt = performance.now();
    let stalledSince: number | null = null;
    let nudgeStep = 0;
    let nudges = 0;
    let reloads = 0;
    let gaveUp = false;

    const nudge = () => {
      if (!ytPlayer || !ytPlayerReady) return;
      try {
        const t = ytPlayer.getCurrentTime?.() || 0;
        if (nudgeStep === 0) {
          ytPlayer.playVideo?.();
        } else {
          // Un único reposicionamiento para forzar una nueva petición de datos.
          ytPlayer.seekTo?.(t, true);
          ytPlayer.playVideo?.();
        }
        nudgeStep += 1;
      } catch {
        /* ignorar */
      }
    };

    const softReload = () => {
      if (!ytPlayer || !ytPlayerReady) return;
      const id = latest.videoId;
      if (!id) return;
      try {
        const t = ytPlayer.getCurrentTime?.() || 0;
        console.warn('[YT] Atasco persistente: recargando el vídeo una sola vez.');
        lastQuality = "";
        lastQualityChangeAt = 0;
        playbackStartedAt = 0;
        ytPlayer.loadVideoById?.({ videoId: id, startSeconds: Math.max(0, t - 1) });
        if (latest.isPlaying) setTimeout(playSafe, 300);
      } catch {
        /* ignorar */
      }
    };

    intervalRef.current = window.setInterval(() => {
      if (!ytPlayer || !ytPlayerReady) return;
      try {
        const now = performance.now();
        const t = ytPlayer.getCurrentTime?.();
        const d = ytPlayer.getDuration?.();
        const state = ytPlayer.getPlayerState?.();
        const YTS = window.YT?.PlayerState;
        const fraction =
          typeof ytPlayer.getVideoLoadedFraction === 'function'
            ? (ytPlayer.getVideoLoadedFraction() as number)
            : undefined;

        // Progreso real del buffer: mientras suba, la red está trabajando y no hay atasco.
        if (typeof fraction === 'number' && fraction > lastFraction + 0.0005) {
          lastFraction = fraction;
          fractionChangedAt = now;
        }

        if (typeof t === "number" && !isNaN(t)) {
          // Reloj rápido para las letras (a 60 fps se interpola entre muestras)
          feedPlaybackClock(t, state === YTS?.PLAYING, true);
          if (Math.abs(t - lastTime) > 0.05) {
            lastAdvance = now;
            lastTime = t;
            nudgeStep = 0;
            stalledSince = null;
          }
          // El store (y con él la interfaz) se actualiza más despacio
          if (now - lastStoreUpdate >= 250) {
            lastStoreUpdate = now;
            setCurrentTime(t);
          }
        }
        if (typeof d === "number" && d > 0 && !isNaN(d)) setDuration(d);

        const isLive = typeof d === 'number' && d === 0;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        // Toda la carga ya está en memoria: que la fracción no suba no significa atasco.
        const fullyBuffered = typeof fraction === 'number' && fraction >= 0.995;
        const noNewData =
          typeof fraction === 'number'
            ? now - fractionChangedAt > YT_STALL_MS && !fullyBuffered
            : now - lastAdvance > YT_STALL_MS;
        const stuck = state === YTS?.BUFFERING && !isLive && !offline && noNewData;

        if (stuck) {
          if (stalledSince === null) stalledSince = now;
          const stalledFor = now - stalledSince;

          if (stalledFor > YT_STALL_MS + YT_RELOAD_AFTER_MS + YT_GIVE_UP_AFTER_MS && !gaveUp) {
            gaveUp = true;
            if (latest.videoId && liveHandlers.onUnavailable) {
              liveHandlers.onUnavailable(latest.videoId, 'PLAYER_TIMEOUT');
            }
          } else if (stalledFor > YT_STALL_MS + YT_RELOAD_AFTER_MS && reloads === 0) {
            reloads += 1;
            softReload();
          } else if (stalledFor > YT_STALL_MS && nudges < 2) {
            nudges += 1;
            nudge();
          }
        } else {
          stalledSince = null;
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

  /* ── 9. Reinicio del registro de vídeos fallidos al cambiar de pista ──
     La vigilancia de arranque (2b) y el pipeline de fallback se encargan de que ningún
     vídeo deje la interfaz cargando: aquí sólo se limpia la memoria entre canciones. */
  useEffect(() => {
    if (!currentTrack?.id) return;
    if (failedVideoIdsRef.current.trackId !== currentTrack.id) {
      failedVideoIdsRef.current = { trackId: currentTrack.id, ids: [] };
    }
  }, [currentTrack?.id]);

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
  /** Capa donde vive el vídeo. El Modo Cine está en z-[80], así que necesita más que eso. */
  zIndex?: number;
}

export const GlobalYouTubePlayer: React.FC<GlobalYouTubePlayerProps> = ({
  showVideoInPlayer = true,
  interactive = true,
  className = "w-full aspect-video rounded-2xl bg-black overflow-hidden",
  borderRadius = "12px",
  zIndex = 51,
}) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastSampleRef = useRef(0);
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
          zIndex,
        });
      } else if (activeHolderId === instanceId.current) {
        hidePortal();
      }
    } else if (!slot && activeHolderId === instanceId.current) {
      hidePortal();
    }
  }, [borderRadius, interactive, zIndex]);

  /* Mantiene el portal pegado a su hueco: muestreo continuo a ~20 fps (sólo lee y compara;
     escribe en el DOM únicamente cuando la geometría cambia de verdad), ResizeObserver y
     escuchadores de scroll en fase de captura para seguir también los contenedores con
     scroll propio (el panel del MiniPlayer tiene el vídeo dentro de un área desplazable:
     sin captura, el vídeo se quedaba fijo mientras el contenido se movía). */
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

    // 2. Seguimiento continuo pero barato: cubre las animaciones de Framer Motion (que
    //    duran más de los 600 ms que se vigilaban antes), el scroll interno y los cambios
    //    de disposición sin dejar el vídeo descolocado.
    const sample = (now: number) => {
      if (now - lastSampleRef.current >= SLOT_SAMPLE_INTERVAL_MS) {
        lastSampleRef.current = now;
        sync();
      }
      rafRef.current = requestAnimationFrame(sample);
    };
    rafRef.current = requestAnimationFrame(sample);

    // 3. ResizeObserver para cambios de tamaño responsivos sin coste en CPU
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && slotRef.current) {
      ro = new ResizeObserver(() => {
        sync();
      });
      ro.observe(slotRef.current);
    }

    // 4. Escuchadores de ventana (scroll en captura: llega también desde contenedores hijos)
    const onResize = () => sync();
    const onScroll = () => sync();
    const onVisibility = () => {
      if (!document.hidden) sync();
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("aura:sync-yt-slot", sync);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", onVisibility);
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

