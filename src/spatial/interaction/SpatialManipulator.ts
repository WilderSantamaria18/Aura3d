import * as THREE from 'three';
import { SpatialState } from '../state/SpatialState';
import { GestureEngine } from '../gestures/GestureEngine';
import { SpatialAudioEngine } from '../audio/SpatialAudioEngine';

/**
 * SpatialManipulator — Motor de físicas e inercia para objetos 3D manipulables con gestos.
 *
 * Especificaciones de DESING_DECAMARA.md:
 * - Agarrar: máquina de estados PINCH_*
 * - Mover: seguimiento de mano con amortiguación
 * - Rotar: quaternion slerp con orientación de palma
 * - Escalar: interacción a dos manos (twoHand.scaleFactor)
 * - Soltar: inercia natural con factor de amortiguamiento (damping = 0.92)
 */
export class SpatialManipulator {
  // Transformadas físicas
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public quaternion: THREE.Quaternion = new THREE.Quaternion();
  public scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Estados de interacción
  public isHovered = false;
  public isGrabbed = false;
  public hoverAmount = 0; // 0 a 1 suave para shaders
  public grabEnergy = 0;  // 0 a 1 para feedback de tensión

  // Desplazamiento de agarre relativo a la mano
  private grabOffset = new THREE.Vector3();
  private baseScale = 1.0;
  private targetScale = 1.0;

  // Parámetros de física de inercia
  private readonly damping = 0.92;
  private readonly slerpFactor = 0.14;
  private readonly maxSpeed = 12.0;

  // Vectores temporales (Zero GC)
  private static _tempVec = new THREE.Vector3();
  private static _tempQuat = new THREE.Quaternion();

  constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0.4, -2.5)) {
    this.position = initialPosition.clone();
    this.setupGestureListeners();
  }

  private setupGestureListeners(): void {
    const gestureEngine = GestureEngine.getInstance();

    gestureEngine.addEventListener({
      onGrabIntent: (hand) => {
        // Si el cursor está en el radio de agarre del objeto
        if (this.isHovered && !this.isGrabbed) {
          this.isGrabbed = true;
          this.velocity.set(0, 0, 0);
          this.grabOffset.subVectors(this.position, hand.worldIndexTip);
          this.baseScale = this.scale.x;

          // Feedback de audio por FxBus
          SpatialAudioEngine.getInstance().getFxBus()?.playGrabSound();
        }
      },
      onDrag: (hand, delta, vel) => {
        if (this.isGrabbed) {
          // Seguir el dedo con el offset inicial
          SpatialManipulator._tempVec.addVectors(hand.worldIndexTip, this.grabOffset);
          this.position.lerp(SpatialManipulator._tempVec, 0.45);

          // Rotación con orientación de palma (slerp)
          this.quaternion.slerp(hand.palmRotation, this.slerpFactor);

          // Guardar velocidad de lanzamiento
          this.velocity.copy(vel).clampLength(0, this.maxSpeed);

          // Escalar si hay dos manos activas
          const spatialState = SpatialState.getInstance();
          if (spatialState.twoHand.areBothHandsPresent && spatialState.twoHand.scaleFactor > 0.01) {
            this.targetScale = Math.max(0.4, Math.min(2.8, this.baseScale * spatialState.twoHand.scaleFactor));
          }
        }
      },
      onRelease: (hand, finalVelocity) => {
        if (this.isGrabbed) {
          this.isGrabbed = false;
          this.velocity.copy(finalVelocity).clampLength(0, this.maxSpeed);

          // Feedback de audio por FxBus
          SpatialAudioEngine.getInstance().getFxBus()?.playReleaseSound();
        }
      },
    });
  }

  /**
   * Actualización por frame (llamado dentro del render loop de Three.js a 60 FPS)
   */
  public update(delta: number, cursorPoint: THREE.Vector3 | null): void {
    const spatialState = SpatialState.getInstance();
    const bounds = spatialState.calibration.workspaceBounds;

    // 1. Detección de Hover mediante distancia al cursor
    if (cursorPoint && !this.isGrabbed) {
      const dist = this.position.distanceTo(cursorPoint);
      const isNowHovered = dist < 0.45;
      if (isNowHovered && !this.isHovered) {
        SpatialAudioEngine.getInstance().getFxBus()?.playHoverTick();
      }
      this.isHovered = isNowHovered;
    } else if (!this.isGrabbed) {
      this.isHovered = false;
    }

    // Suavizado de métricas de feedback visual (hover y grab)
    const hoverTarget = this.isHovered ? 1.0 : 0.0;
    this.hoverAmount += (hoverTarget - this.hoverAmount) * Math.min(1.0, delta * 12);

    const grabTarget = this.isGrabbed ? 1.0 : 0.0;
    this.grabEnergy += (grabTarget - this.grabEnergy) * Math.min(1.0, delta * 15);

    // 2. Físicas de Inercia al soltar
    if (!this.isGrabbed) {
      if (this.velocity.lengthSq() > 0.00001) {
        // Desplazamiento por velocidad
        this.position.addScaledVector(this.velocity, delta);
        // Factor de amortiguamiento exacto (0.92 por frame)
        this.velocity.multiplyScalar(Math.pow(this.damping, delta * 60));
      } else {
        this.velocity.set(0, 0, 0);
        // Flotación armónica leve en reposo (efecto gravedad cero)
        this.position.y += Math.sin(performance.now() * 0.0018) * 0.0008;
      }
    }

    // 3. Suavizado de escala
    this.scale.x += (this.targetScale - this.scale.x) * 0.15;
    this.scale.y = this.scale.x;
    this.scale.z = this.scale.x;

    // 4. Confinamiento en los límites de espacio de trabajo calibrado (workspaceBounds)
    this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
    this.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.position.y));
    this.position.z = Math.max(-bounds.maxZ, Math.min(-bounds.minZ, this.position.z));
  }
}
