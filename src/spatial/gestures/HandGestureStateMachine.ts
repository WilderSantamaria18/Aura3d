import * as THREE from 'three';
import type { HandInteractionData, HandPinchState, SpatialInteractionEvents } from '../types';

/**
 * HandGestureStateMachine — Máquina de estados finita por mano con histéresis estricta.
 *
 * Transiciones temporizadas:
 * IDLE
 *   │ (< 3 cm durante 50 ms)
 *   ▼
 * PINCH_START  ──► emite "grab-intent"
 *   │ (mantiene < 5 cm durante 80 ms)
 *   ▼
 * PINCH_HOLD   ──► emite "grab-confirmed"
 *   │ (movimiento > 0.5 cm)
 *   ▼
 * PINCH_MOVE   ──► emite "drag" con delta y velocidad
 *   │ (> 5.5 cm durante 60 ms)
 *   ▼
 * PINCH_END    ──► emite "release" con velocidad de lanzamiento
 *   │
 *   ▼
 * IDLE (cooldown de 200 ms)
 */
export class HandGestureStateMachine {
  private currentState: HandPinchState = 'IDLE';

  // Temporizadores y marcas de tiempo
  private stateEnterTime = 0;
  private conditionStartTime = 0;
  private cooldownUntil = 0;

  // Seguimiento de posición y movimiento para arrastre e inercia
  private lastPosition = new THREE.Vector3();
  private dragDelta = new THREE.Vector3();
  private releaseVelocity = new THREE.Vector3();

  // Vectores temporales para cálculos de orientación (Zero GC)
  private static _vecA = new THREE.Vector3();
  private static _vecB = new THREE.Vector3();
  private static _palmNormal = new THREE.Vector3();
  private static _palmRight = new THREE.Vector3();
  private static _rotMatrix = new THREE.Matrix4();

  // Parámetros de histéresis normalizados (espacio de tracking [0, 1])
  private static readonly PINCH_ENTER_DIST = 0.035; // ~3 cm
  private static readonly PINCH_HOLD_MAX_DIST = 0.052; // ~5 cm
  private static readonly PINCH_EXIT_DIST = 0.058; // > 5.5 cm

  private static readonly TIME_ENTER_MS = 50;
  private static readonly TIME_HOLD_MS = 80;
  private static readonly TIME_EXIT_MS = 60;
  private static readonly COOLDOWN_MS = 200;
  private handedness: 'Left' | 'Right';

  constructor(handedness: 'Left' | 'Right') {
    this.handedness = handedness;
  }

  public getState(): HandPinchState {
    return this.currentState;
  }

  /**
   * Actualiza el estado de la mano para el frame actual con histéresis
   */
  public update(
    hand: HandInteractionData,
    timestampMs: number,
    events?: SpatialInteractionEvents
  ): void {
    if (!hand.isPresent || hand.confidenceTier === 'untrusted') {
      this.resetToIdle(timestampMs);
      hand.pinchState = 'IDLE';
      return;
    }

    const dist = hand.pinchDistance;
    const currentPos = hand.worldIndexTip;

    // Calcular desplazamiento delta respecto al frame anterior
    this.dragDelta.subVectors(currentPos, this.lastPosition);

    switch (this.currentState) {
      case 'IDLE': {
        // Respetar tiempo de enfriamiento para evitar re-triggers espurios
        if (timestampMs < this.cooldownUntil) {
          break;
        }

        if (dist < HandGestureStateMachine.PINCH_ENTER_DIST) {
          if (this.conditionStartTime === 0) {
            this.conditionStartTime = timestampMs;
          } else if (timestampMs - this.conditionStartTime >= HandGestureStateMachine.TIME_ENTER_MS) {
            this.transitionTo('PINCH_START', timestampMs);
            events?.onGrabIntent?.(hand);
          }
        } else {
          this.conditionStartTime = 0;
        }
        break;
      }

      case 'PINCH_START': {
        if (dist > HandGestureStateMachine.PINCH_HOLD_MAX_DIST) {
          // Si soltó inmediatamente antes de confirmar
          this.transitionTo('PINCH_END', timestampMs);
        } else {
          if (timestampMs - this.stateEnterTime >= HandGestureStateMachine.TIME_HOLD_MS) {
            this.transitionTo('PINCH_HOLD', timestampMs);
            events?.onGrabConfirmed?.(hand);
          }
        }
        break;
      }

      case 'PINCH_HOLD': {
        if (dist > HandGestureStateMachine.PINCH_EXIT_DIST) {
          this.handleExitPinch(timestampMs, events, hand);
        } else {
          // Detectar inicio de arrastre si el movimiento supera el umbral
          if (this.dragDelta.length() > 0.004) {
            this.transitionTo('PINCH_MOVE', timestampMs);
            events?.onDrag?.(hand, this.dragDelta, hand.worldVelocity);
          }
        }
        break;
      }

      case 'PINCH_MOVE': {
        if (dist > HandGestureStateMachine.PINCH_EXIT_DIST) {
          this.handleExitPinch(timestampMs, events, hand);
        } else {
          // Emitir arrastre continuo
          events?.onDrag?.(hand, this.dragDelta, hand.worldVelocity);
        }
        break;
      }

      case 'PINCH_END': {
        // Transición inmediata a IDLE con enfriamiento
        this.cooldownUntil = timestampMs + HandGestureStateMachine.COOLDOWN_MS;
        this.transitionTo('IDLE', timestampMs);
        break;
      }
    }

    this.lastPosition.copy(currentPos);
    hand.pinchState = this.currentState;
    hand.deltaWorld.copy(this.dragDelta);
  }

  private handleExitPinch(
    timestampMs: number,
    events?: SpatialInteractionEvents,
    hand?: HandInteractionData
  ): void {
    if (this.conditionStartTime === 0) {
      this.conditionStartTime = timestampMs;
    } else if (timestampMs - this.conditionStartTime >= HandGestureStateMachine.TIME_EXIT_MS) {
      this.releaseVelocity.copy(hand?.worldVelocity || this.dragDelta);
      this.transitionTo('PINCH_END', timestampMs);
      if (hand) {
        events?.onRelease?.(hand, this.releaseVelocity);
      }
    }
  }

  private transitionTo(newState: HandPinchState, timestampMs: number): void {
    this.currentState = newState;
    this.stateEnterTime = timestampMs;
    this.conditionStartTime = 0;
  }

  private resetToIdle(timestampMs: number): void {
    this.currentState = 'IDLE';
    this.stateEnterTime = timestampMs;
    this.conditionStartTime = 0;
  }

  /**
   * Calcula el vector normal de la palma y la rotación en cuaternión a partir de los landmarks
   * [0: muñeca, 5: base índice, 17: base meñique]
   */
  public static calculatePalmOrientation(
    hand: HandInteractionData,
    handedness: 'Left' | 'Right'
  ): void {
    if (hand.landmarks.length < 21) return;

    const lm = hand.landmarks;
    const wrist = lm[0];
    const indexMcp = lm[5];
    const pinkyMcp = lm[17];

    // Vector A: Muñeca a base de índice
    HandGestureStateMachine._vecA.set(
      indexMcp.x - wrist.x,
      indexMcp.y - wrist.y,
      indexMcp.z - wrist.z
    );

    // Vector B: Muñeca a base de meñique
    HandGestureStateMachine._vecB.set(
      pinkyMcp.x - wrist.x,
      pinkyMcp.y - wrist.y,
      pinkyMcp.z - wrist.z
    );

    // Normal = A x B (o B x A según la mano para orientar hacia adelante)
    if (handedness === 'Right') {
      HandGestureStateMachine._palmNormal
        .crossVectors(HandGestureStateMachine._vecA, HandGestureStateMachine._vecB)
        .normalize();
    } else {
      HandGestureStateMachine._palmNormal
        .crossVectors(HandGestureStateMachine._vecB, HandGestureStateMachine._vecA)
        .normalize();
    }

    hand.palmNormal.copy(HandGestureStateMachine._palmNormal);

    // Eje lateral de la palma
    HandGestureStateMachine._palmRight
      .crossVectors(HandGestureStateMachine._vecA, HandGestureStateMachine._palmNormal)
      .normalize();

    // Construir matriz de rotación y extraer cuaternión
    HandGestureStateMachine._rotMatrix.makeBasis(
      HandGestureStateMachine._palmRight,
      HandGestureStateMachine._vecA.normalize(),
      HandGestureStateMachine._palmNormal
    );

    hand.palmRotation.setFromRotationMatrix(HandGestureStateMachine._rotMatrix);
  }
}
