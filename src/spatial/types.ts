import * as THREE from 'three';

/**
 * Niveles de Confianza del Tracking (según especificación DESING_CAMARA_IMPORTANT.md)
 */
export type TrackingConfidenceTier = 'untrusted' | 'limited' | 'full';

export type HandPinchState =
  | 'IDLE'
  | 'PINCH_START'
  | 'PINCH_HOLD'
  | 'PINCH_MOVE'
  | 'PINCH_END';

export type SpatialGestureType =
  | 'idle'
  | 'fist'
  | 'pinch'
  | 'open'
  | 'pointing'
  | 'peace'
  | 'unknown';

export interface SpatialCalibration {
  handScale: number;           // Escala física de la mano (m/cm normalizado)
  interactionDepth: number;    // Z plano neutro
  workspaceBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  dominantHand: 'Left' | 'Right';
  trackingConfidence: number;
  isCalibrated: boolean;
}

export interface HandInteractionData {
  handedness: 'Left' | 'Right';
  isPresent: boolean;
  confidence: number;
  confidenceTier: TrackingConfidenceTier;

  // 21 Landmarks suavizados (coordenadas normalizadas [0, 1])
  landmarks: { x: number; y: number; z: number }[];

  // Puntos clave normalizados
  wrist: { x: number; y: number; z: number };
  indexTip: { x: number; y: number; z: number };
  thumbTip: { x: number; y: number; z: number };
  palmCenter: { x: number; y: number; z: number };

  // Posiciones en el Mundo Three.js (Vector3 mutables reutilizados para cero GC)
  worldWrist: THREE.Vector3;
  worldIndexTip: THREE.Vector3;
  worldThumbTip: THREE.Vector3;
  worldPalmCenter: THREE.Vector3;

  // Orientación y Rotación de Palma
  palmNormal: THREE.Vector3;
  palmRotation: THREE.Quaternion;

  // Dinámica y Máquina de Estados de Pellizco (con Histéresis)
  pinchState: HandPinchState;
  pinchDistance: number;       // Distancia euclídea normalizada entre pulgar e índice
  indexVelocity: number;       // Velocidad escalar normalizada (unidades/s)
  worldVelocity: THREE.Vector3;// Velocidad 3D en coordenadas de mundo
  deltaWorld: THREE.Vector3;   // Desplazamiento desde el frame anterior

  // Gestos clasificados
  gesture: SpatialGestureType;
  isPointing: boolean;
  isOpen: boolean;
  isFist: boolean;
}

export interface TwoHandInteractionData {
  areBothHandsPresent: boolean;
  centerPoint: THREE.Vector3;
  distance: number;
  scaleFactor: number;
  rotationDelta: number;
}

export interface SpatialInteractionEvents {
  onGrabIntent?: (hand: HandInteractionData) => void;
  onGrabConfirmed?: (hand: HandInteractionData) => void;
  onDrag?: (hand: HandInteractionData, delta: THREE.Vector3, velocity: THREE.Vector3) => void;
  onRelease?: (hand: HandInteractionData, finalVelocity: THREE.Vector3) => void;
  onTap?: (hand: HandInteractionData, position: THREE.Vector3) => void;
  onHover?: (hand: HandInteractionData, hitPoint: THREE.Vector3) => void;
}
