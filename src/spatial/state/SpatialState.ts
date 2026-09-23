import * as THREE from 'three';
import type {
  HandInteractionData,
  SpatialCalibration,
  TwoHandInteractionData,
  TrackingConfidenceTier,
} from '../types';

/**
 * Función auxiliar para inicializar una estructura mutable de mano sin allocations recurrentes.
 */
function createEmptyHand(handedness: 'Left' | 'Right'): HandInteractionData {
  const landmarks: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 21; i++) {
    landmarks.push({ x: 0, y: 0, z: 0 });
  }

  return {
    handedness,
    isPresent: false,
    confidence: 0,
    confidenceTier: 'untrusted',
    landmarks,
    wrist: { x: 0, y: 0, z: 0 },
    indexTip: { x: 0, y: 0, z: 0 },
    thumbTip: { x: 0, y: 0, z: 0 },
    palmCenter: { x: 0, y: 0, z: 0 },

    worldWrist: new THREE.Vector3(),
    worldIndexTip: new THREE.Vector3(),
    worldThumbTip: new THREE.Vector3(),
    worldPalmCenter: new THREE.Vector3(),

    palmNormal: new THREE.Vector3(0, 0, 1),
    palmRotation: new THREE.Quaternion(),

    pinchState: 'IDLE',
    pinchDistance: 1.0,
    indexVelocity: 0,
    worldVelocity: new THREE.Vector3(),
    deltaWorld: new THREE.Vector3(),

    gesture: 'unknown',
    isPointing: false,
    isOpen: false,
    isFist: false,
  };
}

/**
 * SpatialState — Almacén central de estado espacial mutable de alto rendimiento (60 FPS).
 *
 * Principio Arquitectónico Anti-React:
 * ❌ NUNCA pasar datos de posición por React State (provoca 60 reconciliaciones DOM/s).
 * ✅ SIEMPRE actualizar SpatialState directamente y ser consumido por el render loop de Three.js.
 */
export class SpatialState {
  private static instance: SpatialState | null = null;

  // Manos individuales
  public leftHand: HandInteractionData = createEmptyHand('Left');
  public rightHand: HandInteractionData = createEmptyHand('Right');

  // Interacción a dos manos
  public twoHand: TwoHandInteractionData = {
    areBothHandsPresent: false,
    centerPoint: new THREE.Vector3(),
    distance: 0,
    scaleFactor: 1.0,
    rotationDelta: 0,
  };

  // Calibración espacial activa
  public calibration: SpatialCalibration = {
    handScale: 1.0,
    interactionDepth: 2.8,
    workspaceBounds: {
      minX: -1.5,
      maxX: 1.5,
      minY: -1.0,
      maxY: 1.0,
      minZ: 1.5,
      maxZ: 4.0,
    },
    dominantHand: 'Right',
    trackingConfidence: 0.9,
    isCalibrated: false,
  };

  // Modos de interacción global
  public activeMode: 'navigate' | 'synth' | 'drums' | 'theremin' | 'manipulate' = 'synth';
  public isCameraRunning = false;
  public frameCount = 0;
  public lastUpdateTime = 0;

  // Suscriptores a eventos de UI discretos (No de 60fps)
  private discreteListeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): SpatialState {
    if (!SpatialState.instance) {
      SpatialState.instance = new SpatialState();
    }
    return SpatialState.instance;
  }

  /**
   * Obtiene la mano dominante según la configuración de calibración
   */
  public getDominantHand(): HandInteractionData {
    return this.calibration.dominantHand === 'Left' ? this.leftHand : this.rightHand;
  }

  /**
   * Obtiene la mano secundaria
   */
  public getSecondaryHand(): HandInteractionData {
    return this.calibration.dominantHand === 'Left' ? this.rightHand : this.leftHand;
  }

  /**
   * Determina el tier de confianza según las pautas de DESING_CAMARA_IMPORTANT.md
   */
  public static calculateConfidenceTier(confidence: number): TrackingConfidenceTier {
    if (confidence >= 0.8) return 'full';
    if (confidence >= 0.5) return 'limited';
    return 'untrusted';
  }

  /**
   * Actualiza el modo activo y notifica a los oyentes de UI discretos
   */
  public setMode(mode: 'navigate' | 'synth' | 'drums' | 'theremin' | 'manipulate'): void {
    if (this.activeMode !== mode) {
      this.activeMode = mode;
      this.notifyDiscreteChange();
    }
  }

  /**
   * Actualiza el estado de la cámara
   */
  public setCameraRunning(running: boolean): void {
    if (this.isCameraRunning !== running) {
      this.isCameraRunning = running;
      this.notifyDiscreteChange();
    }
  }

  /**
   * Suscribe a cambios discretos de alto nivel (para React)
   */
  public subscribeDiscrete(listener: () => void): () => void {
    this.discreteListeners.add(listener);
    return () => this.discreteListeners.delete(listener);
  }

  private notifyDiscreteChange(): void {
    this.discreteListeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[SpatialState] Error en listener discreto:', err);
      }
    });
  }

  /**
   * Resetea el tracking cuando se pierde la cámara o las manos
   */
  public resetHands(): void {
    this.leftHand.isPresent = false;
    this.leftHand.confidence = 0;
    this.leftHand.confidenceTier = 'untrusted';
    this.leftHand.pinchState = 'IDLE';

    this.rightHand.isPresent = false;
    this.rightHand.confidence = 0;
    this.rightHand.confidenceTier = 'untrusted';
    this.rightHand.pinchState = 'IDLE';

    this.twoHand.areBothHandsPresent = false;
  }
}
