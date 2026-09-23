import * as THREE from 'three';
import { SpatialState } from '../state/SpatialState';
import type { SpatialCalibration } from '../types';
import { SpatialAudioEngine } from '../audio/SpatialAudioEngine';

export type CalibrationStep =
  | 'FACE_PRESENCE'
  | 'HANDS_RAISE'
  | 'PINCH_CONFIRM'
  | 'BOUNDS_TOUCH'
  | 'COMPLETE';

export interface CalibrationTarget {
  id: number;
  label: string;
  position: THREE.Vector3;
  isConfirmed: boolean;
}

/**
 * CalibrationEngine — Motor de calibración espacial en 5 pasos.
 *
 * Especificación de Sección 7 de DESING_CAMARA_IMPORTANT.md:
 * - STEP 1: Mira a la cámara
 * - STEP 2: Levanta ambas manos
 * - STEP 3: Acerca índice + pulgar
 * - STEP 4: Toca los puntos de calibración
 * - STEP 5: ¡Listo!
 */
export class CalibrationEngine {
  private static instance: CalibrationEngine | null = null;

  private currentStep: CalibrationStep = 'FACE_PRESENCE';
  private stepStartTime = 0;
  private isCalibrating = false;

  // Datos acumulados
  private recordedHandScale = 1.0;
  private recordedDepth = 2.8;
  private recordedBounds = {
    minX: -1.4,
    maxX: 1.4,
    minY: -0.8,
    maxY: 0.9,
    minZ: 1.6,
    maxZ: 3.8,
  };
  private dominantHand: 'Left' | 'Right' = 'Right';

  // 4 Puntos de referencia para las esquinas del área de interacción
  public targets: CalibrationTarget[] = [
    { id: 0, label: 'Superior Izquierda', position: new THREE.Vector3(-1.1, 0.75, -2.6), isConfirmed: false },
    { id: 1, label: 'Superior Derecha', position: new THREE.Vector3(1.1, 0.75, -2.6), isConfirmed: false },
    { id: 2, label: 'Inferior Izquierda', position: new THREE.Vector3(-1.1, -0.35, -2.6), isConfirmed: false },
    { id: 3, label: 'Inferior Derecha', position: new THREE.Vector3(1.1, -0.35, -2.6), isConfirmed: false },
  ];

  private listeners: Set<(step: CalibrationStep, progress: number) => void> = new Set();

  private constructor() {
    this.loadSavedCalibration();
  }

  public static getInstance(): CalibrationEngine {
    if (!CalibrationEngine.instance) {
      CalibrationEngine.instance = new CalibrationEngine();
    }
    return CalibrationEngine.instance;
  }

  public start(): void {
    this.isCalibrating = true;
    this.currentStep = 'FACE_PRESENCE';
    this.stepStartTime = performance.now();
    this.targets.forEach((t) => (t.isConfirmed = false));
    this.notify();
  }

  public cancel(): void {
    this.isCalibrating = false;
    this.currentStep = 'FACE_PRESENCE';
    this.notify();
  }

  public getStep(): CalibrationStep {
    return this.currentStep;
  }

  public isActive(): boolean {
    return this.isCalibrating;
  }

  /**
   * Bucle de actualización llamado en cada frame de tracking
   */
  public update(nowMs: number): void {
    if (!this.isCalibrating) return;

    const spatialState = SpatialState.getInstance();
    const domHand = spatialState.getDominantHand();
    const secHand = spatialState.getSecondaryHand();

    switch (this.currentStep) {
      case 'FACE_PRESENCE': {
        // En ausencia de tracker facial dedicado, verifica presencia de cámara activa durante 1.2s
        if (spatialState.isCameraRunning) {
          if (nowMs - this.stepStartTime > 1200) {
            SpatialAudioEngine.getInstance().getFxBus()?.playTouchFeedback(880);
            this.transitionTo('HANDS_RAISE', nowMs);
          }
        }
        break;
      }

      case 'HANDS_RAISE': {
        // Verifica que ambas manos estén en cuadro con confianza suficiente
        if (domHand.isPresent && secHand.isPresent) {
          // Medir tamaño aparente de la mano (distancia muñeca a punta de dedo medio)
          const wrist = domHand.landmarks[0];
          const middleTip = domHand.landmarks[12];
          const handSpan = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);

          if (handSpan > 0.15) {
            this.recordedHandScale = Math.max(0.6, Math.min(1.6, handSpan / 0.28));
            SpatialAudioEngine.getInstance().getFxBus()?.playTouchFeedback(960);
            this.transitionTo('PINCH_CONFIRM', nowMs);
          }
        }
        break;
      }

      case 'PINCH_CONFIRM': {
        // Verifica que el usuario complete un pellizco con la mano
        if (domHand.pinchState === 'PINCH_HOLD' || domHand.pinchState === 'PINCH_MOVE') {
          SpatialAudioEngine.getInstance().getFxBus()?.playGrabSound();
          this.transitionTo('BOUNDS_TOUCH', nowMs);
        }
        break;
      }

      case 'BOUNDS_TOUCH': {
        // El usuario debe tocar los 4 puntos de referencia en el espacio
        if (domHand.isPresent) {
          const tip = domHand.worldIndexTip;

          for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (!target.isConfirmed) {
              const dist = tip.distanceTo(target.position);
              if (dist < 0.28) {
                target.isConfirmed = true;
                SpatialAudioEngine.getInstance().getFxBus()?.playTouchFeedback(1100 + i * 140);
                break;
              }
            }
          }

          const allDone = this.targets.every((t) => t.isConfirmed);
          if (allDone) {
            this.completeCalibration();
          }
        }
        break;
      }

      case 'COMPLETE':
        break;
    }
  }

  private transitionTo(step: CalibrationStep, nowMs: number): void {
    this.currentStep = step;
    this.stepStartTime = nowMs;
    this.notify();
  }

  private completeCalibration(): void {
    this.currentStep = 'COMPLETE';
    this.isCalibrating = false;

    const calibration: SpatialCalibration = {
      handScale: this.recordedHandScale,
      interactionDepth: this.recordedDepth,
      workspaceBounds: this.recordedBounds,
      dominantHand: this.dominantHand,
      trackingConfidence: 0.95,
      isCalibrated: true,
    };

    // Aplicar al estado central mutable
    SpatialState.getInstance().calibration = calibration;

    // Guardar en localStorage para recuperación instantánea
    try {
      localStorage.setItem('aura_spatial_calibration_v1', JSON.stringify(calibration));
    } catch {
      // Ignorar quota
    }

    SpatialAudioEngine.getInstance().getFxBus()?.playTouchFeedback(1320);
    this.notify();
  }

  private loadSavedCalibration(): void {
    try {
      const saved = localStorage.getItem('aura_spatial_calibration_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as SpatialCalibration;
        SpatialState.getInstance().calibration = parsed;
      }
    } catch {
      // Usar calibración predeterminada
    }
  }

  public subscribe(listener: (step: CalibrationStep, progress: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    let progress = 0;
    if (this.currentStep === 'FACE_PRESENCE') progress = 0.2;
    else if (this.currentStep === 'HANDS_RAISE') progress = 0.4;
    else if (this.currentStep === 'PINCH_CONFIRM') progress = 0.6;
    else if (this.currentStep === 'BOUNDS_TOUCH') {
      const confirmed = this.targets.filter((t) => t.isConfirmed).length;
      progress = 0.6 + (confirmed / 4) * 0.35;
    } else if (this.currentStep === 'COMPLETE') progress = 1.0;

    this.listeners.forEach((fn) => fn(this.currentStep, progress));
  }
}
