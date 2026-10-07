/**
 * Gestos de mano para controlar el reproductor: swipe horizontal (pista siguiente/anterior),
 * pellizco vertical (volumen) y palma fija (reproducir/pausar).
 *
 * Lógica pura y sin dependencias de React ni de cámara: recibe una muestra de la mano por frame y devuelve
 * a lo sumo una acción. Las coordenadas son las de «selfie» (x espejada): mover la mano hacia la derecha
 * del usuario aumenta x.
 */

export type PlayerGestureAction =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'toggle' }
  /** Cambio relativo de volumen (-1..1); positivo = subir */
  | { type: 'volume'; delta: number };

export type HandPose = 'open' | 'pinch' | 'fist' | 'pointing' | 'peace' | 'unknown';

export interface HandSample {
  /** Centro de la palma, 0..1, x espejada */
  x: number;
  y: number;
  pose: HandPose;
}

export interface GestureFrame {
  action: PlayerGestureAction | null;
  /** 0..1: avance de la palma fija hacia el play/pausa (para el anillo del HUD) */
  palmProgress: number;
}

export const GESTURE_CONFIG = {
  /** Ventana (ms) en la que se mide el recorrido del swipe */
  swipeWindowMs: 320,
  /** Recorrido horizontal mínimo dentro de la ventana (fracción del ancho de imagen) */
  swipeMinDistance: 0.26,
  /** El movimiento debe ser sobre todo horizontal: |dy| < |dx| * este factor */
  swipeMaxVerticalRatio: 0.55,
  swipeCooldownMs: 900,
  /** Zona muerta del pellizco vertical por frame, para ignorar el temblor */
  pinchDeadZone: 0.003,
  /** Cuánto volumen cambia al recorrer toda la altura de la imagen con el pellizco */
  pinchVolumeRange: 1.6,
  /** La palma cuenta como «fija» si se mueve menos que esto (altura de imagen por segundo) */
  palmStillSpeed: 0.12,
  palmHoldMs: 900,
  palmCooldownMs: 1500,
} as const;

interface TimedPoint {
  x: number;
  y: number;
  t: number;
}

export class PlayerGestureDetector {
  private trail: TimedPoint[] = [];
  private lastSwipeAt = -Infinity;
  private lastToggleAt = -Infinity;
  private palmStillSince = -1;
  private palmArmed = true;
  private prevPinchY: number | null = null;

  /** Llamar una vez por frame; `null` cuando no hay mano visible. */
  update(sample: HandSample | null, nowMs: number): GestureFrame {
    const cfg = GESTURE_CONFIG;
    if (!sample) {
      this.resetHand();
      return { action: null, palmProgress: 0 };
    }

    // ── Pellizco vertical: volumen ───────────────────────────────────────────
    if (sample.pose === 'pinch') {
      this.trail.length = 0;
      this.palmStillSince = -1;
      let action: PlayerGestureAction | null = null;
      if (this.prevPinchY !== null) {
        const dy = this.prevPinchY - sample.y; // subir la mano (y disminuye) sube el volumen
        if (Math.abs(dy) > cfg.pinchDeadZone) {
          action = { type: 'volume', delta: dy * cfg.pinchVolumeRange };
        }
      }
      this.prevPinchY = sample.y;
      return { action, palmProgress: 0 };
    }
    this.prevPinchY = null;

    // ── Rastro reciente para swipe y palma fija ──────────────────────────────
    this.trail.push({ x: sample.x, y: sample.y, t: nowMs });
    while (this.trail.length > 1 && nowMs - this.trail[0].t > cfg.swipeWindowMs) this.trail.shift();

    // ── Swipe horizontal (mano abierta) ──────────────────────────────────────
    if (sample.pose === 'open' && nowMs - this.lastSwipeAt >= cfg.swipeCooldownMs && this.trail.length >= 3) {
      const first = this.trail[0];
      const dx = sample.x - first.x;
      const dy = sample.y - first.y;
      if (Math.abs(dx) >= cfg.swipeMinDistance && Math.abs(dy) < Math.abs(dx) * cfg.swipeMaxVerticalRatio) {
        this.lastSwipeAt = nowMs;
        this.trail.length = 0;
        this.palmStillSince = -1;
        this.palmArmed = false; // tras un swipe hay que soltar la palma antes de armar el play/pausa
        return { action: { type: dx > 0 ? 'next' : 'previous' }, palmProgress: 0 };
      }
    }

    // ── Palma fija: reproducir / pausar ──────────────────────────────────────
    if (sample.pose !== 'open') {
      this.palmStillSince = -1;
      this.palmArmed = true;
      return { action: null, palmProgress: 0 };
    }
    if (!this.palmArmed || nowMs - this.lastToggleAt < cfg.palmCooldownMs) {
      this.palmStillSince = -1;
      return { action: null, palmProgress: 0 };
    }

    const first = this.trail[0];
    const span = (nowMs - first.t) / 1000;
    const speed = span > 0.05 ? Math.hypot(sample.x - first.x, sample.y - first.y) / span : 0;
    if (speed > cfg.palmStillSpeed) {
      this.palmStillSince = -1;
      return { action: null, palmProgress: 0 };
    }

    if (this.palmStillSince < 0) this.palmStillSince = nowMs;
    const progress = Math.min(1, (nowMs - this.palmStillSince) / cfg.palmHoldMs);
    if (progress >= 1) {
      this.lastToggleAt = nowMs;
      this.palmStillSince = -1;
      this.palmArmed = false; // exige bajar o cerrar la mano antes de volver a disparar
      return { action: { type: 'toggle' }, palmProgress: 0 };
    }
    return { action: null, palmProgress: progress };
  }

  reset(): void {
    this.resetHand();
    this.lastSwipeAt = -Infinity;
    this.lastToggleAt = -Infinity;
  }

  private resetHand(): void {
    this.trail.length = 0;
    this.palmStillSince = -1;
    this.palmArmed = true;
    this.prevPinchY = null;
  }
}
