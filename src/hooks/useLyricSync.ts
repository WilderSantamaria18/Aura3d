/**
 * useLyricSync — sincronía línea/palabra a 60 fps sin re-renderizar por fotograma.
 *
 * Solo el ÍNDICE de línea y de palabra son estado de React (cambian unas pocas veces por
 * segundo). El progreso continuo (barra de línea, subrayado de palabra) se escribe como
 * variables CSS `--line-progress` y `--word-progress` en los contenedores indicados.
 */
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { EnhancedLyricLine } from '../types/lyrics';
import { getPlaybackTime } from '../services/playbackClock';
import { usePlayerStore } from '../stores/playerStore';

export function findActiveLine(lines: ReadonlyArray<{ time: number }>, t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= t) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function useLyricSync(
  lines: EnhancedLyricLine[],
  progressTargets: Array<RefObject<HTMLElement | null>>
): { activeLineIndex: number; activeWordIndex: number } {
  const [state, setState] = useState({ line: -1, word: -1 });

  useEffect(() => {
    if (!lines || lines.length === 0) {
      setState({ line: -1, word: -1 });
      return;
    }
    let raf = 0;
    let curLine = -2;
    let curWord = -2;

    const tick = () => {
      const offset = usePlayerStore.getState().lyricsOffset || 0;
      const t = Math.max(0, getPlaybackTime() + offset);
      const li = findActiveLine(lines, t);
      let wi = -1;
      let lineProgress = 0;
      let wordProgress = 0;

      if (li >= 0) {
        const line = lines[li];
        const next = lines[li + 1];
        const duration = next ? Math.max(0.1, next.time - line.time) : 4.5;
        lineProgress = clamp01((t - line.time) / duration);

        const words = line.words;
        if (words && words.length > 0) {
          for (let i = 0; i < words.length; i++) {
            if (t >= words[i].startTime) wi = i;
            else break;
          }
          if (wi >= 0) {
            const w = words[wi];
            wordProgress = clamp01((t - w.startTime) / Math.max(0.05, w.endTime - w.startTime));
          }
        }
      }

      if (li !== curLine || wi !== curWord) {
        curLine = li;
        curWord = wi;
        setState({ line: li, word: wi });
      }

      const lp = lineProgress.toFixed(4);
      const wp = wordProgress.toFixed(4);
      for (const ref of progressTargets) {
        const el = ref.current;
        if (el) {
          el.style.setProperty('--line-progress', lp);
          el.style.setProperty('--word-progress', wp);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // progressTargets son refs estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  return { activeLineIndex: state.line, activeWordIndex: state.word };
}

export default useLyricSync;
