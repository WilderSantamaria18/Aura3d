import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { EnhancedLyricsData, EnhancedLyricLine } from '../types/lyrics';
import { lyricsPipeline, type LyricsStatus } from '../services/lyrics/lyricsPipeline';
import { normalizeMusicMetadata, type NormalizedMusicMetadata } from '../utils/musicMetadata';
import { parseEnhancedLRC } from '../services/lyrics/lyricsParsing';
import { usePlayerStore } from '../stores/playerStore';
import { getPlaybackTime } from '../services/playbackClock';
import { findActiveLine } from './useLyricSync';
import { isAbort } from '../utils/isAbort';

const EMPTY_LYRICS: EnhancedLyricsData = { synced: false, lines: [], source: 'none', isWordSynced: false };

/** Cadencia del cálculo de línea activa. La línea cambia unas pocas veces por segundo:
 *  200 ms bastan y evitan un bucle de 60 fps por cada instancia del hook. */
const ACTIVE_LINE_INTERVAL_MS = 200;

export interface UseLyricsResult {
  lyricsData: EnhancedLyricsData;
  status: LyricsStatus;
  statusMessage: string | null;
  isLoading: boolean;
  activeLineIndex: number;
  activeLine: EnhancedLyricLine | null;
  /** Metadatos ya normalizados (título limpio y artista fiable). */
  metadata: NormalizedMusicMetadata | null;
  loadLrcFile: (file: File) => void;
  setLyricsData: (data: EnhancedLyricsData) => void;
  /** Vuelve a consultar ignorando la caché (y el estado negativo). */
  retry: () => void;
}

export const useLyrics = (): UseLyricsResult => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [lyricsData, setLyricsData] = useState<EnhancedLyricsData>(EMPTY_LYRICS);
  const [status, setStatus] = useState<LyricsStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  // Metadatos normalizados: título sin decoradores de YouTube y artista fiable.
  // La clave se calcula sobre los datos normalizados, de modo que el parche de
  // metadatos del vídeo (título/artista del servidor) NO repite la búsqueda.
  const metadata = useMemo(() => {
    if (!currentTrack) return null;
    return normalizeMusicMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      duration: currentTrack.duration,
      uploader: currentTrack.uploader,
    });
  }, [
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.album,
    currentTrack?.duration,
    currentTrack?.uploader,
  ]);

  const lrcContent = currentTrack?.lrcContent;
  const lookupKey = metadata ? `${metadata.cacheKey}::${lrcContent ? 'lrc' : 'api'}` : '';

  useEffect(() => {
    if (!currentTrack || !metadata) {
      setLyricsData(EMPTY_LYRICS);
      setStatus('idle');
      setStatusMessage(null);
      return;
    }

    // 1. Letra propia de la pista (LRC incrustado): no hay red ni estados de carga.
    if (lrcContent) {
      setLyricsData(parseEnhancedLRC(lrcContent));
      setStatus('loaded');
      setStatusMessage(null);
      return;
    }

    if (!metadata.title) {
      setLyricsData(EMPTY_LYRICS);
      setStatus('idle');
      setStatusMessage(null);
      return;
    }

    // 2. Caché en memoria: la misma canción no vuelve a consultar LRCLIB en la sesión.
    const cached = lyricsPipeline.cached(metadata);
    if (cached && reloadToken === 0) {
      setLyricsData(cached);
      setStatus('loaded');
      setStatusMessage(null);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const isStale = () => controller.signal.aborted || requestId !== requestIdRef.current;

    setStatus('loading');
    setStatusMessage(null);

    lyricsPipeline
      .lookup(metadata, { signal: controller.signal, force: reloadToken > 0 })
      .then((result) => {
        if (isStale()) return; // respuesta de una canción anterior: se descarta
        setLyricsData(result.data);
        setStatus(result.status);
        setStatusMessage(result.message ?? null);
      })
      .catch((error: unknown) => {
        if (isAbort(error) || isStale()) return; // cancelada por cambio de canción
        setLyricsData(EMPTY_LYRICS);
        setStatus('error');
        setStatusMessage('No se pudo consultar el servicio de letras.');
      });

    return () => {
      controller.abort();
    };
  }, [lookupKey, reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps -- `lookupKey` resume track+metadatos

  const retry = useCallback(() => {
    // `reloadToken > 0` fuerza la consulta en el efecto (ignora caché positiva y negativa).
    setReloadToken((token) => token + 1);
  }, []);

  // Línea activa: sólo se recalcula unas pocas veces por segundo y sólo si hay letra.
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  useEffect(() => {
    const lines = lyricsData.lines;
    if (!lines || lines.length === 0) {
      setActiveLineIndex(-1);
      return;
    }
    let last = -2;
    const tick = () => {
      const idx = findActiveLine(lines, getPlaybackTime());
      if (idx !== last) {
        last = idx;
        setActiveLineIndex(idx);
      }
    };
    tick();
    const timer = window.setInterval(tick, ACTIVE_LINE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [lyricsData.lines]);

  const activeLine: EnhancedLyricLine | null = useMemo(() => {
    if (activeLineIndex >= 0 && activeLineIndex < lyricsData.lines.length) {
      return lyricsData.lines[activeLineIndex];
    }
    return null;
  }, [activeLineIndex, lyricsData.lines]);

  const loadLrcFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setLyricsData(parseEnhancedLRC(text));
        setStatus('loaded');
        setStatusMessage(null);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    lyricsData,
    status,
    statusMessage,
    isLoading: status === 'loading',
    activeLineIndex,
    activeLine,
    metadata,
    loadLrcFile,
    setLyricsData,
    retry,
  };
};

export default useLyrics;
