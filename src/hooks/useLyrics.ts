import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LyricsData, LyricLine } from '../types/lyrics';
import { parseLRC } from '../utils/parseLRC';
import { LyricsService } from '../services/lyricsService';
import { usePlayerStore } from '../stores/playerStore';

export const useLyrics = () => {
  const { currentTrack, currentTime } = usePlayerStore();
  const [lyricsData, setLyricsData] = useState<LyricsData>({
    synced: false,
    lines: [],
    source: 'none',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData({ synced: false, lines: [], source: 'none' });
      return;
    }

    // 1. If track already contains custom LRC text
    if (currentTrack.lrcContent) {
      const parsedLines = parseLRC(currentTrack.lrcContent);
      setLyricsData({
        synced: parsedLines.length > 0,
        lines: parsedLines.map((l, i) => ({ id: i, time: l.time, text: l.text })),
        source: 'lrc',
      });
      return;
    }

    // 2. Otherwise fetch from public lyrics API
    if (currentTrack.artist && currentTrack.title && currentTrack.sourceType !== 'demo') {
      setIsLoading(true);
      LyricsService.fetchFromLyricsOvh(currentTrack.artist, currentTrack.title)
        .then((res) => {
          setLyricsData(res);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setLyricsData({ synced: false, lines: [], source: 'none' });
    }
  }, [currentTrack]);

  // Determine current active line index
  const activeLineIndex = useMemo(() => {
    if (!lyricsData.lines.length) return -1;

    let active = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (currentTime >= lyricsData.lines[i].time) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [lyricsData.lines, currentTime]);

  const activeLine: LyricLine | null = useMemo(() => {
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
        const parsedLines = parseLRC(text);
        setLyricsData({
          synced: parsedLines.length > 0,
          lines: parsedLines.map((l, i) => ({ id: i, time: l.time, text: l.text })),
          source: 'lrc',
        });
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
