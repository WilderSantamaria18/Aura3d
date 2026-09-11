import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Radio } from 'lucide-react';
import type { Track } from '../../types/audio';

interface YouTubeIframeFallbackProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  onEnded: () => void;
  onTimeUpdate: (current: number) => void;
  onDurationChange: (duration: number) => void;
  onStateChange: (isPlaying: boolean) => void;
}

export const YouTubeIframeFallback: React.FC<YouTubeIframeFallbackProps> = ({
  currentTrack,
  isPlaying,
  volume,
  onEnded,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const isReadyRef = useRef(false);

  const videoId = currentTrack?.youtubeId;
  const isIframeMode = currentTrack?.sourceType === 'youtube' && currentTrack?.isIframePlayback;

  // Enviar comando al iframe de YouTube
  const sendCommand = (command: string, args: unknown[] = []) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: command,
          args,
        }),
        '*'
      );
    } catch {
      // Ignorar errores de postMessage cross-domain si el iframe no está listo
    }
  };

  // Sincronizar Play / Pause
  useEffect(() => {
    if (!isIframeMode || !videoId) return;
    if (isPlaying) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [isPlaying, isIframeMode, videoId]);

  // Sincronizar Volumen
  useEffect(() => {
    if (!isIframeMode || !videoId) return;
    sendCommand('setVolume', [Math.round(volume * 100)]);
  }, [volume, isIframeMode, videoId]);

  // Escuchar eventos globales de búsqueda / seek
  useEffect(() => {
    const handleSeekEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      if (typeof customEvent.detail?.seconds === 'number') {
        sendCommand('seekTo', [customEvent.detail.seconds, true]);
      }
    };

    window.addEventListener('aura:youtube-seek', handleSeekEvent);
    return () => {
      window.removeEventListener('aura:youtube-seek', handleSeekEvent);
    };
  }, []);

  // Escuchar mensajes provenientes del reproductor de YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.origin === 'string' && !event.origin.includes('youtube.com')) {
        return;
      }

      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }

        if (!payload) return;

        // Estado de preparación inicial
        if (payload.event === 'onReady') {
          isReadyRef.current = true;
          sendCommand('setVolume', [Math.round(volume * 100)]);
          if (isPlaying) {
            sendCommand('playVideo');
          }
        }

        // Cambio de estado de reproducción
        if (payload.event === 'onStateChange') {
          // Estados de YouTube: -1 no iniciado, 0 terminado, 1 reproduciendo, 2 pausado, 3 cargando
          if (payload.info === 0) {
            onEnded();
          } else if (payload.info === 1) {
            onStateChange(true);
          } else if (payload.info === 2) {
            onStateChange(false);
          }
        }

        // Entrega de información periódica (tiempo y duración)
        if (payload.event === 'infoDelivery' && payload.info) {
          if (typeof payload.info.currentTime === 'number') {
            onTimeUpdate(payload.info.currentTime);
          }
          if (typeof payload.info.duration === 'number' && payload.info.duration > 0) {
            onDurationChange(payload.info.duration);
          }
        }
      } catch {
        // Ignorar mensajes no formateados en JSON
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onEnded, onTimeUpdate, onDurationChange, onStateChange, volume, isPlaying]);

  if (!isIframeMode || !videoId) {
    return null;
  }

  const embedOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&origin=${encodeURIComponent(embedOrigin)}&playsinline=1&rel=0`;

  return (
    <div className="relative">
      {/* Botón flotante para alternar vista de video si el usuario lo desea */}
      <div className="flex items-center justify-between gap-2 px-1 py-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 rounded-lg">
        <div className="flex items-center gap-1.5 truncate">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span className="truncate">YouTube Player Oficial</span>
        </div>
        <button
          onClick={() => setShowVideo((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors text-[10px]"
        >
          {showVideo ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Ocultar</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Ver Video</span>
            </>
          )}
        </button>
      </div>

      {/* Contenedor del Iframe: Cuando showVideo está activo se muestra en el reproductor, cuando no, mantiene 1px activo para que el navegador no pause el audio */}
      <div
        className={
          showVideo
            ? 'w-full aspect-video mt-2 rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black'
            : 'absolute w-[1px] h-[1px] opacity-0 pointer-events-none -top-9999px left-0'
        }
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Aura3D YouTube Audio Stream"
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      </div>
    </div>
  );
};
