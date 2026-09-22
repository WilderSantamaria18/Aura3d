/**
 * useWordSync — Word-by-word karaoke synchronization hook
 *
 * Uses binary search O(log n) for activeLineIndex, then linear scan within the
 * active line for activeWordIndex (lines have <= ~20 words — O(1) in practice).
 */

import { useMemo, useRef } from 'react';
import type { EnhancedLyricLine } from '../types/lyrics';

export interface UseWordSyncReturn {
  activeLineIndex: number;
  activeWordIndex: number;
  activeWordProgress: number;
  activeLineProgress: number;
}

function binarySearchActiveLine(lines: EnhancedLyricLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export const useWordSync = (
  lines: EnhancedLyricLine[],
  currentTime: number,
  isPlaying: boolean
): UseWordSyncReturn => {
  const lastResultRef = useRef<UseWordSyncReturn>({
    activeLineIndex: -1,
    activeWordIndex: -1,
    activeWordProgress: 0,
    activeLineProgress: 0,
  });

  const result = useMemo<UseWordSyncReturn>(() => {
    if (!lines || lines.length === 0) {
      return { activeLineIndex: -1, activeWordIndex: -1, activeWordProgress: 0, activeLineProgress: 0 };
    }

    const activeLineIndex = binarySearchActiveLine(lines, currentTime);

    if (activeLineIndex < 0) {
      return { activeLineIndex: -1, activeWordIndex: -1, activeWordProgress: 0, activeLineProgress: 0 };
    }

    const activeLine = lines[activeLineIndex];
    const nextLine = lines[activeLineIndex + 1];

    const lineDuration = nextLine ? Math.max(0.1, nextLine.time - activeLine.time) : 4.5;
    const lineElapsed = currentTime - activeLine.time;
    const activeLineProgress = Math.min(1, Math.max(0, lineElapsed / lineDuration));

    const words = activeLine.words;
    if (!words || words.length === 0) {
      return { activeLineIndex, activeWordIndex: -1, activeWordProgress: 0, activeLineProgress };
    }

    let activeWordIndex = -1;
    for (let i = 0; i < words.length; i++) {
      if (currentTime >= words[i].startTime) {
        activeWordIndex = i;
      } else {
        break;
      }
    }

    let activeWordProgress = 0;
    if (activeWordIndex >= 0) {
      const word = words[activeWordIndex];
      const wordDuration = Math.max(0.05, word.endTime - word.startTime);
      const wordElapsed = currentTime - word.startTime;
      activeWordProgress = Math.min(1, Math.max(0, wordElapsed / wordDuration));
    }

    const newResult: UseWordSyncReturn = { activeLineIndex, activeWordIndex, activeWordProgress, activeLineProgress };
    lastResultRef.current = newResult;
    return newResult;
  }, [lines, currentTime]);

  return result;
};
