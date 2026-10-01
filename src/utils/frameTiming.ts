/**
 * Utilidades de tiempo para bucles de animación independientes de la tasa de refresco.
 *
 * El código de los visualizadores se calibró a 60 FPS con factores "por frame"
 * (p. ej. `x += (target - x) * 0.28`). Esos factores hacen que a 144 Hz todo vaya ~2.4× más
 * rápido y a 30 Hz la mitad. Estas funciones convierten un factor calibrado a 60 FPS en el
 * equivalente exacto para el `dt` real, de modo que a 60 FPS el resultado es idéntico al anterior.
 */

/** Tasa a la que se calibraron los factores por frame originales */
export const REFERENCE_FPS = 60;

/** Tope de `dt`: tras ocultar la pestaña o un tirón, un salto grande no debe teletransportar la animación */
export const MAX_FRAME_DT = 1 / 20;

/** Suelo de `dt`: evita divisiones por ~0 si dos frames caen en el mismo milisegundo */
export const MIN_FRAME_DT = 1 / 480;

/** Acota un intervalo entre frames (en segundos). Valores no finitos se tratan como un frame a 60 FPS. */
export function clampDelta(dtSec: number): number {
  if (!Number.isFinite(dtSec)) return 1 / REFERENCE_FPS;
  return Math.min(MAX_FRAME_DT, Math.max(MIN_FRAME_DT, dtSec));
}

/** Número de "frames de referencia (60 FPS)" que representa `dt`. Multiplica incrementos por frame por esto. */
export function frameScale(dt: number): number {
  return dt * REFERENCE_FPS;
}

/**
 * Factor de suavizado por frame (0..1, calibrado a 60 FPS) → factor equivalente para `dt`.
 * f' = 1 − (1 − f)^(dt·60). A 60 FPS devuelve f; a 30 FPS devuelve el doble de recorrido por frame.
 */
export function rateForDt(frameFactor: number, dt: number): number {
  if (frameFactor <= 0) return 0;
  if (frameFactor >= 1) return 1;
  return 1 - Math.pow(1 - frameFactor, frameScale(dt));
}

/** Multiplicador de decaimiento por frame (p. ej. 0.9) → multiplicador equivalente para `dt`. */
export function decayForDt(frameDecay: number, dt: number): number {
  if (frameDecay <= 0) return 0;
  return Math.pow(frameDecay, frameScale(dt));
}

/** Acerca `current` a `target` con un factor por frame calibrado a 60 FPS, independiente de la tasa real. */
export function smoothToward(current: number, target: number, frameFactor: number, dt: number): number {
  return current + (target - current) * rateForDt(frameFactor, dt);
}
