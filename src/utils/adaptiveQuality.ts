/**
 * Calidad adaptativa: baja el nivel visual cuando los FPS se hunden de forma sostenida y lo
 * recupera cuando el equipo vuelve a ir sobrado. Toda la lógica de decisión es pura (sin DOM,
 * sin store, sin reloj propio) para poder probarla con muestras simuladas.
 */

export type QualityTier = 'high' | 'medium' | 'eco';

const ORDER: QualityTier[] = ['eco', 'medium', 'high'];

export const minTier = (a: QualityTier, b: QualityTier): QualityTier =>
  ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b;

export const lowerTier = (t: QualityTier): QualityTier => ORDER[Math.max(0, ORDER.indexOf(t) - 1)];
export const raiseTier = (t: QualityTier): QualityTier => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(t) + 1)];

/**
 * Nivel que realmente se aplica. La elección del usuario es un techo: el modo automático solo
 * puede bajar de ahí, nunca superarlo. Con el automático apagado manda el usuario.
 */
export const effectiveTier = (user: QualityTier, autoCap: QualityTier, auto: boolean): QualityTier =>
  auto ? minTier(user, autoCap) : user;

/** Umbrales. Son estimaciones razonables, no calibradas con mediciones: ajústalas aquí. */
export const ADAPTIVE = {
  /** Por debajo de esto se considera que el equipo no da abasto */
  DOWN_FPS: 40,
  /** Por encima de esto se considera que va sobrado (margen amplio sobre DOWN_FPS: histéresis) */
  UP_FPS: 56,
  /** Tiempo sostenido por debajo de DOWN_FPS antes de bajar un nivel */
  DOWN_AFTER_MS: 3000,
  /** Tiempo sostenido por encima de UP_FPS antes de subir un nivel (subir es más conservador) */
  UP_AFTER_MS: 20000,
  /** Tras cualquier cambio se espera esto antes de volver a decidir: los FPS tardan en estabilizarse */
  COOLDOWN_MS: 8000,
} as const;

export interface AdaptiveState {
  lowSince: number | null;
  highSince: number | null;
  lastChangeAt: number;
}

export const initialAdaptiveState = (now = 0): AdaptiveState => ({ lowSince: null, highSince: null, lastChangeAt: now });

/**
 * Un paso de decisión. `fps` es la medición suavizada actual; `cap` el tope automático vigente.
 * Devuelve el estado nuevo y el tope nuevo (igual al anterior si no hay cambio).
 */
export function stepAdaptiveQuality(
  state: AdaptiveState,
  fps: number,
  now: number,
  userTier: QualityTier,
  cap: QualityTier
): { state: AdaptiveState; cap: QualityTier } {
  const effective = minTier(userTier, cap);

  // Enfriamiento: no se acumula tiempo mientras los FPS aún reflejan el nivel anterior
  if (now - state.lastChangeAt < ADAPTIVE.COOLDOWN_MS) {
    return { state: { lowSince: null, highSince: null, lastChangeAt: state.lastChangeAt }, cap };
  }

  if (fps < ADAPTIVE.DOWN_FPS) {
    const lowSince = state.lowSince ?? now;
    if (effective !== 'eco' && now - lowSince >= ADAPTIVE.DOWN_AFTER_MS) {
      return { state: { lowSince: null, highSince: null, lastChangeAt: now }, cap: lowerTier(effective) };
    }
    return { state: { lowSince, highSince: null, lastChangeAt: state.lastChangeAt }, cap };
  }

  if (fps >= ADAPTIVE.UP_FPS) {
    const highSince = state.highSince ?? now;
    // Solo hay algo que recuperar si el nivel efectivo está por debajo del que eligió el usuario
    if (effective !== userTier && now - highSince >= ADAPTIVE.UP_AFTER_MS) {
      return { state: { lowSince: null, highSince: null, lastChangeAt: now }, cap: raiseTier(effective) };
    }
    return { state: { lowSince: null, highSince, lastChangeAt: state.lastChangeAt }, cap };
  }

  // Zona intermedia (40–56 FPS): ni baja ni sube, y se reinician los contadores
  return { state: { lowSince: null, highSince: null, lastChangeAt: state.lastChangeAt }, cap };
}

/**
 * Medidor de FPS por media móvil de los intervalos entre fotogramas.
 * Ignora los intervalos enormes (pestaña en segundo plano, pausa del depurador): no son lentitud.
 */
export class FrameRateMeter {
  private deltas: number[] = [];

  private readonly windowSize: number;
  private readonly minSamples: number;
  private readonly maxDeltaMs: number;

  constructor(windowSize = 60, minSamples = 30, maxDeltaMs = 1000) {
    this.windowSize = windowSize;
    this.minSamples = minSamples;
    this.maxDeltaMs = maxDeltaMs;
  }

  push(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > this.maxDeltaMs) return;
    this.deltas.push(deltaMs);
    if (this.deltas.length > this.windowSize) this.deltas.shift();
  }

  /** FPS medios, o null si aún no hay muestras suficientes para fiarse */
  fps(): number | null {
    if (this.deltas.length < this.minSamples) return null;
    const mean = this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length;
    return 1000 / mean;
  }

  reset(): void {
    this.deltas = [];
  }
}
