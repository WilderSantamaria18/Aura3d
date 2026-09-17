import React, { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { audioEngine } from "../../services/audioEngine";

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
   Singleton portal management
   The iframe div lives once in document.body and is NEVER
   removed/re-created; only CSS controls its position & size.
   This eliminates the duplicate-ID postMessage cross-origin bug.
────────────────────────────────────────────────────────────── */
const PORTAL_ID = "aura-yt-singleton-portal";
const MOUNT_ID = "aura-global-youtube-player-mount";

function getOrCreatePortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    // Invisible placeholder position until placed by a consumer
    Object.assign(portal.style, {
      position: "fixed",
      left: "-9999px",
      top: "-9999px",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      zIndex: "9000",
      borderRadius: "12px",
      background: "#000",
      transition: "left 0ms, top 0ms, width 200ms, height 200ms",
    });

    const mount = document.createElement("div");
    mount.id = MOUNT_ID;
    mount.style.cssText = "width:100%;height:100%;";
    portal.appendChild(mount);
    document.body.appendChild(portal);
  }
  return portal;
}

function placePortal(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
}) {
  const portal = getOrCreatePortal();
  Object.assign(portal.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    overflow: "hidden",
    borderRadius: rect.borderRadius || "12px",
  });
}

function hidePortal() {
  const portal = document.getElementById(PORTAL_ID);
  if (portal) {
    Object.assign(portal.style, {
      left: "-9999px",
      top: "-9999px",
      width: "1px",
      height: "1px",
      overflow: "hidden",
    });
  }
}

let activeHolderId: string | null = null;

/* ──────────────────────────────────────────────────────────────
   Singleton YT.Player instance (module-level)
────────────────────────────────────────────────────────────── */
let ytPlayer: any = null;
let ytPlayerReady = false;
let ytCurrentVideoId = "";

/* ──────────────────────────────────────────────────────────────
   GlobalYouTubeController
   Manages the YT.Player API lifecycle. Can be mounted anywhere
   in the tree without affecting the iframe's DOM node.
────────────────────────────────────────────────────────────── */
export const GlobalYouTubeController: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);

  const isApiLoaded = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const videoId =
    currentTrack?.youtubeId ||
    (currentTrack?.id?.startsWith("yt_") ? currentTrack.id.replace(/^yt_/, "") : undefined);

  const isYT = Boolean(
    currentTrack &&
      (currentTrack.sourceType === "youtube" || Boolean(videoId)) &&
      videoId
  );

  /* ── Handle track ended → advance queue ────────────────────── */
  const handleEnded = useCallback(() => {
    const store = usePlayerStore.getState();
    const next = store.nextTrack();
    if (next) {
      store.playTrack(next);
    } else if (store.queue.length > 0) {
      usePlayerStore.setState({ queueIndex: 0, currentTrack: store.queue[0], isPlaying: true });
    }
  }, []);

  /* ── 1. Load YT IFrame API once ────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__auraYtApiReady || (window.YT && window.YT.Player)) {
      isApiLoaded.current = true;
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      window.__auraYtApiReady = true;
      isApiLoaded.current = true;
      // Trigger re-initialization
      initOrUpdatePlayer();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
    // Also check if already loaded
    if (window.YT && window.YT.Player) {
      isApiLoaded.current = true;
      window.__auraYtApiReady = true;
    }
  }, []);

  /* ── 2. Init or update YT.Player when videoId changes ──────── */
  function initOrUpdatePlayer() {
    if (!window.YT || !window.YT.Player) return;
    if (!videoId) return;

    // Ensure portal exists
    getOrCreatePortal();

    if (!ytPlayer) {
      // Fresh instantiation
      try {
        ytPlayer = new window.YT.Player(MOUNT_ID, {
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
            onReady: (e: { target: any }) => {
              ytPlayerReady = true;
              ytCurrentVideoId = videoId!;
              const store = usePlayerStore.getState();
              e.target.setVolume(store.isMuted ? 0 : Math.round(store.volume * 100));
              if (store.isPlaying) e.target.playVideo();
            },
            onStateChange: (e: { data: number; target: any }) => {
              const YTS = window.YT?.PlayerState;
              if (!YTS) return;
              if (e.data === YTS.PLAYING) {
                setIsPlaying(true);
                const dur = e.target.getDuration?.();
                if (dur && dur > 0) setDuration(dur);
              } else if (e.data === YTS.PAUSED) {
                setIsPlaying(false);
              } else if (e.data === YTS.ENDED) {
                handleEnded();
              } else if (e.data === YTS.CUED) {
                if (usePlayerStore.getState().isPlaying) e.target.playVideo();
              }
            },
            onError: (e: { data: number }) => {
              if (e.data === 101 || e.data === 150) {
                setTimeout(handleEnded, 1500);
              }
            },
          },
        });
        ytCurrentVideoId = videoId;
      } catch (err) {
        console.error("[YT] Error creating player:", err);
      }
    } else {
      // Swap video if needed
      try {
        if (ytCurrentVideoId !== videoId) {
          ytCurrentVideoId = videoId;
          ytPlayer.loadVideoById(videoId);
          const store = usePlayerStore.getState();
          if (store.isPlaying) setTimeout(() => ytPlayer?.playVideo?.(), 200);
        }
      } catch {}
    }
  }

  useEffect(() => {
    if (!isYT || !videoId) {
      // Not a YT track: pause and hide portal
      if (ytPlayer && ytPlayerReady) {
        try { ytPlayer.pauseVideo(); } catch {}
      }
      hidePortal();
      audioEngine.setIframeMode(false);
      return;
    }
    initOrUpdatePlayer();
  }, [isYT, videoId]);

  /* ── 3. Play / Pause sync ───────────────────────────────────── */
  useEffect(() => {
    if (!ytPlayer || !ytPlayerReady || !isYT) return;
    try {
      if (isPlaying) ytPlayer.playVideo();
      else ytPlayer.pauseVideo();
    } catch {}
  }, [isPlaying, isYT]);

  /* ── 4. Volume sync ─────────────────────────────────────────── */
  useEffect(() => {
    if (!ytPlayer || !ytPlayerReady || !isYT) return;
    try {
      ytPlayer.setVolume(isMuted ? 0 : Math.round(volume * 100));
    } catch {}
  }, [volume, isMuted, isYT]);

  /* ── 5. Seek listener ───────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: Event) => {
      const sec = (e as CustomEvent<{ seconds: number }>).detail?.seconds;
      if (typeof sec === "number" && ytPlayer && ytPlayerReady) {
        try { ytPlayer.seekTo(sec, true); } catch {}
      }
    };
    window.addEventListener("aura:youtube-seek", handler);
    return () => window.removeEventListener("aura:youtube-seek", handler);
  }, []);

  /* ── 6. Time polling ────────────────────────────────────────── */
  useEffect(() => {
    if (!isYT || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      if (!ytPlayer || !ytPlayerReady) return;
      try {
        const t = ytPlayer.getCurrentTime?.();
        const d = ytPlayer.getDuration?.();
        if (typeof t === "number" && !isNaN(t)) setCurrentTime(t);
        if (typeof d === "number" && d > 0 && !isNaN(d)) setDuration(d);
      } catch {}
    }, 300);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isYT, isPlaying, setCurrentTime, setDuration]);

  /* ── 7. iframeMode for visualizer ──────────────────────────── */
  useEffect(() => {
    audioEngine.setIframeMode(Boolean(isYT && isPlaying));
    return () => audioEngine.setIframeMode(false);
  }, [isYT, isPlaying]);

  return null; // No DOM output — portal is managed imperatively
};

/* ──────────────────────────────────────────────────────────────
   GlobalYouTubePlayer
   Visual shell that positions the singleton portal inside itself.
   Place one instance wherever you want the video to appear.
────────────────────────────────────────────────────────────── */
export interface GlobalYouTubePlayerProps {
  inMiniPlayer?: boolean;
  isMiniPlayerExpanded?: boolean;
  activeTab?: string;
  showVideoInPlayer?: boolean;
  onToggleVideoView?: () => void;
  onExpandMiniPlayer?: () => void;
  className?: string;
  borderRadius?: string;
}

export const GlobalYouTubePlayer: React.FC<GlobalYouTubePlayerProps> = ({
  showVideoInPlayer = true,
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

  /* Keep the portal aligned to slotRef every animation frame */
  useEffect(() => {
    if (!isYT || !showVideoInPlayer) {
      if (activeHolderId === instanceId.current) {
        activeHolderId = null;
        hidePortal();
      }
      return;
    }

    activeHolderId = instanceId.current;

    const sync = () => {
      if (!isYT || !showVideoInPlayer) {
        if (activeHolderId === instanceId.current) {
          activeHolderId = null;
          hidePortal();
        }
        return;
      }

      if (slotRef.current) {
        const r = slotRef.current.getBoundingClientRect();
        if (r.width > 10 && r.height > 10) {
          activeHolderId = instanceId.current;
          placePortal({
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            borderRadius,
          });
        } else if (activeHolderId === instanceId.current) {
          hidePortal();
        }
      } else if (activeHolderId === instanceId.current) {
        hidePortal();
      }
      rafRef.current = requestAnimationFrame(sync);
    };
    rafRef.current = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (activeHolderId === instanceId.current) {
        activeHolderId = null;
        hidePortal();
      }
    };
  }, [isYT, showVideoInPlayer, borderRadius]);

  if (!isYT) return null;

  return (
    <div
      ref={slotRef}
      className={className}
      aria-label="Reproductor de YouTube"
    />
  );
};

export default GlobalYouTubePlayer;
