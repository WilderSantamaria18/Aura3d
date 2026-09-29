import { useState, useEffect, useMemo, useCallback } from 'react';
import type { EnhancedLyricsData, EnhancedLyricLine } from '../types/lyrics';
import { LyricsService } from '../services/lyricsService';
import { usePlayerStore } from '../stores/playerStore';
import { getPlaybackTime } from '../services/playbackClock';
import { findActiveLine } from './useLyricSync';

export const useLyrics = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [lyricsData, setLyricsData] = useState<EnhancedLyricsData>({
    synced: false,
    lines: [],
    source: 'none',
    isWordSynced: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Key tracking to prevent re-fetching on non-track state updates
  const trackKey = currentTrack
    ? `${currentTrack.id || ''}::${currentTrack.artist || ''}::${currentTrack.title || ''}::${currentTrack.lrcContent ? 'lrc' : 'api'}`
    : '';

  // Load lyrics when track identity genuinely changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData({ synced: false, lines: [], source: 'none', isWordSynced: false });
      return;
    }

    // 1. If track already contains custom LRC text
    if (currentTrack.lrcContent) {
      const parsed = LyricsService.parseEnhancedLRC(currentTrack.lrcContent);
      setLyricsData(parsed);
      return;
    }

    // 2. Otherwise fetch from LRCLIB synchronized lyrics API (with smart fallback & caching)
    if (currentTrack.artist && currentTrack.title) {
      let isCancelled = false;
      setIsLoading(true);
      LyricsService.fetchFromLRCLIB(
        currentTrack.artist,
        currentTrack.title,
        currentTrack.album,
        currentTrack.duration
      )
        .then((res) => {
          if (!isCancelled) {
            setLyricsData(res);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setLyricsData({ synced: false, lines: [], source: 'none', isWordSynced: false });
    }
  }, [trackKey]);

  // Línea activa: se calcula con el reloj interpolado y solo cambia el estado cuando cambia
  // la línea (unas pocas veces por segundo), en vez de re-renderizar en cada muestra de tiempo.
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  useEffect(() => {
    const lines = lyricsData.lines;
    if (!lines || lines.length === 0) {
      setActiveLineIndex(-1);
      return;
    }
    let raf = 0;
    let last = -2;
    const tick = () => {
      const idx = findActiveLine(lines, getPlaybackTime());
      if (idx !== last) {
        last = idx;
        setActiveLineIndex(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
        const parsed = LyricsService.parseEnhancedLRC(text);
        setLyricsData(parsed);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    lyricsData,
    activeLineIndex,
    activeLine,
    isLoading,
    loadLrcFile,
    setLyricsData,
  };
};

export default useLyrics;
