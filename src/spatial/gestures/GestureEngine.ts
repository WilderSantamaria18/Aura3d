import * as THREE from 'three';
import { projectLandmarkToWorld } from '../../services/spatialVisionService';
import type { HandTrackingResult } from '../../services/spatialVisionService';
import { SpatialState } from '../state/SpatialState';
import type { HandInteractionData, SpatialInteractionEvents } from '../types';
import { HandGestureStateMachine } from './HandGestureStateMachine';

/**
 * GestureEngine — Motor de gestos desacoplado para Aura Spatial.
 *
 * Principio Fundamental:
 * MediaPipe NUNCA interactúa directamente con Three.js ni con Audio.
 * Flujo:
 * MediaPipe / Tracker ──► GestureEngine ──► SpatialState (mutable) ──► Three.js / Instrumentos
 */
export class GestureEngine {
  private static instance: GestureEngine | null = null;

  private state = SpatialState.getInstance();
  private leftStateMachine = new HandGestureStateMachine('Left');
  private rightStateMachine = new HandGestureStateMachine('Right');

  private eventListeners: Set<SpatialInteractionEvents> = new Set();
  private perspectiveCamera: THREE.PerspectiveCamera | null = null;

  // Seguimiento de tiempo para velocidad
  private lastTimestamp = 0;
  private prevWorldIndexLeft = new THREE.Vector3();
  private prevWorldIndexRight = new THREE.Vector3();

  // Vectores temporales (Zero GC)
  private static _tempVec = new THREE.Vector3();
  private static _tempPalm = new THREE.Vector3();

  private constructor() {}

  public static getInstance(): GestureEngine {
    if (!GestureEngine.instance) {
      GestureEngine.instance = new GestureEngine();
    }
    return GestureEngine.instance;
  }

  /**
   * Configura la cámara Three.js para la proyección 3D mundo exacta
   */
  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.perspectiveCamera = camera;
  }

  /**
   * Registra oyentes de eventos espaciales (grab, release, drag, tap)
   */
  public addEventListener(listener: SpatialInteractionEvents): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Procesa los datos de tracking crudos de MediaPipe y actualiza el SpatialState
   * Se ejecuta en cada frame de detección (~30-60 Hz).
   */
  public processTracking(rawHands: HandTrackingResult[], timestamp: number): void {
    const dt = this.lastTimestamp > 0 ? Math.max(0.001, (timestamp - this.lastTimestamp) / 1000) : 0.016;
    this.lastTimestamp = timestamp;

    let foundLeft = false;
    let foundRight = false;

    for (let i = 0; i < rawHands.length; i++) {
      const raw = rawHands[i];
      const handedness = raw.handedness === 'Left' ? 'Left' : 'Right';
      const hand = handedness === 'Left' ? this.state.leftHand : this.state.rightHand;
      const stateMachine = handedness === 'Left' ? this.leftStateMachine : this.rightStateMachine;

      if (handedness === 'Left') foundLeft = true;
      if (handedness === 'Right') foundRight = true;

      // 1. Evaluación de Confianza y Calidad
      const confidence = 0.9; // Base de confianza estimada
      const tier = SpatialState.calculateConfidenceTier(confidence);

      hand.isPresent = true;
      hand.confidence = confidence;
      hand.confidenceTier = tier;

      // 2. Copiar 21 Landmarks en memoria pre-asignada (Zero GC)
      for (let j = 0; j < Math.min(21, raw.landmarks.length); j++) {
        const pt = raw.landmarks[j];
        hand.landmarks[j].x = pt.x;
        hand.landmarks[j].y = pt.y;
        hand.landmarks[j].z = pt.z;
      }

      // Puntos de referencia normalizados clave
      hand.wrist.x = raw.landmarks[0].x;
      hand.wrist.y = raw.landmarks[0].y;
      hand.wrist.z = raw.landmarks[0].z;

      hand.thumbTip.x = raw.landmarks[4].x;
      hand.thumbTip.y = raw.landmarks[4].y;
      hand.thumbTip.z = raw.landmarks[4].z;

      hand.indexTip.x = raw.landmarks[8].x;
      hand.indexTip.y = raw.landmarks[8].y;
      hand.indexTip.z = raw.landmarks[8].z;

      // Centro de la palma estimado (punto medio entre muñeca y base de dedo medio)
      const midMcp = raw.landmarks[9];
      hand.palmCenter.x = (hand.wrist.x + midMcp.x) * 0.5;
      hand.palmCenter.y = (hand.wrist.y + midMcp.y) * 0.5;
      hand.palmCenter.z = (hand.wrist.z + midMcp.z) * 0.5;

      // 3. Proyección a Coordenadas de Mundo Three.js
      const targetDist = this.state.calibration.interactionDepth;
      if (this.perspectiveCamera) {
        projectLandmarkToWorld(hand.wrist, this.perspectiveCamera, targetDist, hand.worldWrist);
        projectLandmarkToWorld(hand.indexTip, this.perspectiveCamera, targetDist, hand.worldIndexTip);
        projectLandmarkToWorld(hand.thumbTip, this.perspectiveCamera, targetDist, hand.worldThumbTip);
        projectLandmarkToWorld(hand.palmCenter, this.perspectiveCamera, targetDist, hand.worldPalmCenter);
      }

      // 4. Cálculo de Velocidad 3D en espacio de mundo
      const prevPos = handedness === 'Left' ? this.prevWorldIndexLeft : this.prevWorldIndexRight;
      hand.worldVelocity.subVectors(hand.worldIndexTip, prevPos).divideScalar(dt);
      prevPos.copy(hand.worldIndexTip);

      hand.pinchDistance = raw.pinchDistance;
      hand.indexVelocity = raw.indexVelocity;
      hand.gesture = raw.gesture;
      hand.isPointing = raw.gesture === 'pointing';
      hand.isOpen = raw.gesture === 'open';
      hand.isFist = raw.gesture === 'fist';

      // 5. Orientación de Palma (Normal y Cuaternión)
      HandGestureStateMachine.calculatePalmOrientation(hand, handedness);

      // 6. Actualización de Máquina de Estados con Histéresis
      stateMachine.update(hand, timestamp, {
        onGrabIntent: (h) => this.broadcastEvent('onGrabIntent', h),
        onGrabConfirmed: (h) => this.broadcastEvent('onGrabConfirmed', h),
        onDrag: (h, delta, vel) => this.broadcastDrag(h, delta, vel),
        onRelease: (h, vel) => this.broadcastRelease(h, vel),
      });
    }

    // Limpieza de manos que salieron del campo visual
    if (!foundLeft && this.state.leftHand.isPresent) {
      this.state.leftHand.isPresent = false;
      this.state.leftHand.pinchState = 'IDLE';
    }
    if (!foundRight && this.state.rightHand.isPresent) {
      this.state.rightHand.isPresent = false;
      this.state.rightHand.pinchState = 'IDLE';
    }

    // 7. Interacción a Dos Manos
    const both = this.state.leftHand.isPresent && this.state.rightHand.isPresent;
    this.state.twoHand.areBothHandsPresent = both;
    if (both) {
      const leftTip = this.state.leftHand.worldIndexTip;
      const rightTip = this.state.rightHand.worldIndexTip;

      this.state.twoHand.centerPoint.addVectors(leftTip, rightTip).multiplyScalar(0.5);
      const currentDist = leftTip.distanceTo(rightTip);

      if (this.state.twoHand.distance > 0.001) {
        this.state.twoHand.scaleFactor = currentDist / this.state.twoHand.distance;
      }
      this.state.twoHand.distance = currentDist;
    }

    this.state.frameCount++;
    this.state.lastUpdateTime = timestamp;
  }

  private broadcastEvent(type: 'onGrabIntent' | 'onGrabConfirmed', hand: HandInteractionData): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener[type]?.(hand);
      } catch (err) {
        console.error(`[GestureEngine] Error en listener ${type}:`, err);
      }
    });
  }

  private broadcastDrag(
    hand: HandInteractionData,
    delta: THREE.Vector3,
    velocity: THREE.Vector3
  ): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener.onDrag?.(hand, delta, velocity);
      } catch (err) {
        console.error('[GestureEngine] Error en listener onDrag:', err);
      }
    });
  }

  private broadcastRelease(hand: HandInteractionData, finalVelocity: THREE.Vector3): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener.onRelease?.(hand, finalVelocity);
      } catch (err) {
        console.error('[GestureEngine] Error en listener onRelease:', err);
      }
    });
  }
}
