/**
 * usePlaybackLoop — ejecuta un callback con el tiempo de reproducción interpolado,
 * fuera de React. Sirve para mover barras de progreso, contadores y canvas sin
 * re-renderizar componentes.
 *
 *  · Solo corre mientras `active` (normalmente: suena y el componente es visible).
 *  · Se detiene con la pestaña oculta y se reanuda al volver.
 *  · Siempre hace una llamada inmediata para que la vista refleje el estado actual
 *    (al pausar, al cambiar de canción o al montar).
 *  · `maxFps` limita la frecuencia (una barra de 300 px no necesita más de 30 fps).
 */
import { useEffect, useRef } from 'react';
import { getPlaybackTime } from '../services/playbackClock';
import { usePlayerStore } from '../stores/playerStore';

export type PlaybackTick = (time: number, duration: number) => void;

export function usePlaybackLoop(tick: PlaybackTick, active: boolean, maxFps = 60): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    const run = () => tickRef.current(getPlaybackTime(), usePlayerStore.getState().duration);
    run();
    if (!active) {
      // En pausa no hay bucle, pero un seek o una duración nueva deben verse al instante
      return usePlayerStore.subscribe((s, prev) => {
        if (s.currentTime !== prev.currentTime || s.duration !== prev.duration) run();
      });
    }

    const minGap = 1000 / maxFps - 1;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= minGap) {
        last = now;
        run();
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, maxFps]);
}

export const formatClock = (secs: number): string => {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
