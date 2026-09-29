/**
 * Reloj de reproducción interpolado.
 *
 * Los reproductores entregan el tiempo a saltos (audio local ≈ 4 Hz, YouTube cada
 * 100–300 ms). Para animar letras a 60 fps hace falta un reloj continuo: se avanza con
 * performance.now() entre muestras y, cuando llega una nueva, se corrige el error de
 * forma suave (sin saltos hacia atrás). No usa React ni el store: leerlo es gratis.
 */
import { usePlayerStore } from '../stores/playerStore';

interface ClockState {
  t0: number; // tiempo de reproducción en `stamp`
  stamp: number; // performance.now() de la última muestra
  corr: number; // error pendiente de corregir (s)
  playing: boolean;
  directUntil: number; // mientras > now, se ignoran las muestras lentas del store
}

const clock: ClockState = { t0: 0, stamp: 0, corr: 0, playing: false, directUntil: 0 };

const CORRECTION_S = 0.2; // en cuánto tiempo se absorbe el error de una muestra
const MAX_EXTRAPOLATE_S = 1.5; // si dejan de llegar muestras, no se sigue avanzando

export function getPlaybackTime(now: number = performance.now()): number {
  const dt = (now - clock.stamp) / 1000;
  const correction = clock.corr * Math.min(1, dt / CORRECTION_S);
  if (!clock.playing) return clock.t0 + correction;
  return clock.t0 + Math.min(dt, MAX_EXTRAPOLATE_S) + correction;
}

/**
 * Alimenta el reloj con una muestra real.
 * `direct` = la muestra viene de una fuente rápida (p. ej. el sondeo de YouTube a 100 ms);
 * durante un momento se descartan las muestras del store, que llegan más tarde.
 */
export function feedPlaybackClock(sample: number, playing: boolean, direct = false): void {
  const now = performance.now();
  if (!direct && now < clock.directUntil) {
    // Solo se acepta un cambio de estado (play/pausa), no el tiempo
    if (playing !== clock.playing) {
      clock.t0 = getPlaybackTime(now);
      clock.corr = 0;
      clock.stamp = now;
      clock.playing = playing;
    }
    return;
  }
  const predicted = getPlaybackTime(now);
  const err = sample - predicted;
  if (!playing || !clock.playing || Math.abs(err) > 0.4) {
    // pausa, arranque o salto (seek): se toma la muestra tal cual
    clock.t0 = sample;
    clock.corr = 0;
  } else {
    // continuidad: se parte de lo predicho y se absorbe el error poco a poco
    clock.t0 = predicted;
    clock.corr = err;
  }
  clock.stamp = now;
  clock.playing = playing;
  if (direct) clock.directUntil = now + 600;
}

// El store alimenta el reloj para todas las fuentes (audio local, Spotify…)
let lastTime = Number.NaN;
let lastPlaying = false;
usePlayerStore.subscribe((s) => {
  if (s.currentTime !== lastTime || s.isPlaying !== lastPlaying) {
    lastTime = s.currentTime;
    lastPlaying = s.isPlaying;
    feedPlaybackClock(s.currentTime, s.isPlaying, false);
  }
});
