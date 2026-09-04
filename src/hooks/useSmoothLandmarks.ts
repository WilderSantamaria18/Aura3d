import { useRef, useCallback } from 'react';
import type { HandLandmark, PoseLandmark } from '../stores/playerStore';

export const MOVEMENT_SENSITIVITY = 1.2;
export const POSITION_LERP_FACTOR = 0.15;
export const ROTATION_LERP_FACTOR = 0.10;
export const OUTLIER_DISTANCE_THRESHOLD = 2.0;

export interface WorldVector3 {
  x: number;
  y: number;
  z: number;
}

export interface RotationVector2 {
  x: number;
  y: number;
}

/**
 * Screen (0..1) to Three.js World Coordinate Mapping with selfie camera mirroring
 * x: (1 - x_raw) * 10 - 5 (inverted for mirror effect)
 * y: (1 - y_raw) * 6 - 3
 * z: (1 - z_raw) * 4
 */
export const mapScreenToWorld = (
  normX: number,
  normY: number,
  normZ: number = 0,
  sensitivity: number = MOVEMENT_SENSITIVITY
): WorldVector3 => {
  return {
    x: ((1 - normX) * 10 - 5) * sensitivity,
    y: ((1 - normY) * 6 - 3) * sensitivity,
    z: ((1 - normZ) * 4) * sensitivity,
  };
};

/**
 * Euclidean distance calculation between two 3D points
 */
export const calcWorldDistance = (a: WorldVector3, b: WorldVector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Linear interpolation helper for 3D coordinates
 */
export const lerpWorldVector = (
  current: WorldVector3,
  target: WorldVector3,
  factor: number = POSITION_LERP_FACTOR
): WorldVector3 => {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
    z: current.z + (target.z - current.z) * factor,
  };
};

/**
 * Linear interpolation helper for 2D rotation angles
 */
export const lerpRotation = (
  current: RotationVector2,
  target: RotationVector2,
  factor: number = ROTATION_LERP_FACTOR
): RotationVector2 => {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
};

/**
 * Hook providing anti-jitter lerp smoothing, coordinate mapping, and outlier rejection
 */
export const useSmoothLandmarks = () => {
  const smoothedRightHandRef = useRef<WorldVector3 | null>(null);
  const smoothedLeftHandRef = useRef<WorldVector3 | null>(null);
  const smoothedHeadRef = useRef<WorldVector3 | null>(null);
  const smoothedRotationRef = useRef<RotationVector2>({ x: 0, y: 0 });
  const prevPoseLandmarksRef = useRef<{ x: number; y: number }[]>([]);

  /**
   * Smooth a single 3D point with outlier rejection and lerp
   */
  const smoothPoint = useCallback(
    (
      rawNorm: { x: number; y: number; z?: number } | null | undefined,
      currentSmoothed: React.MutableRefObject<WorldVector3 | null>,
      visibilityThreshold: number = 0.4
    ): WorldVector3 | null => {
      if (!rawNorm) {
        currentSmoothed.current = null;
        return null;
      }

      // Check visibility if available
      const visibility = (rawNorm as PoseLandmark).visibility;
      if (visibility !== undefined && visibility < visibilityThreshold) {
        return currentSmoothed.current;
      }

      const rawWorld = mapScreenToWorld(rawNorm.x, rawNorm.y, rawNorm.z || 0);

      if (!currentSmoothed.current) {
        currentSmoothed.current = rawWorld;
        return rawWorld;
      }

      // Outlier Filter: discard spurious frame jumps (> OUTLIER_DISTANCE_THRESHOLD)
      const jumpDistance = calcWorldDistance(currentSmoothed.current, rawWorld);
      if (jumpDistance > OUTLIER_DISTANCE_THRESHOLD) {
        // Discard sudden jump by returning existing smoothed position without snapping
        return currentSmoothed.current;
      }

      // Apply Anti-Jitter Lerp (0.15 factor)
      const smoothed = lerpWorldVector(currentSmoothed.current, rawWorld, POSITION_LERP_FACTOR);
      currentSmoothed.current = smoothed;
      return smoothed;
    },
    []
  );

  /**
   * Process 33-point Pose landmarks to extract smoothed keypoints and dance velocity
   */
  const processPose = useCallback(
    (landmarks: PoseLandmark[] | null) => {
      if (!landmarks || landmarks.length < 33) {
        smoothedRightHandRef.current = null;
        smoothedLeftHandRef.current = null;
        smoothedHeadRef.current = null;
        prevPoseLandmarksRef.current = [];
        return {
          head: null,
          rightHand: null,
          leftHand: null,
          velocity: 0,
          rotation: { x: 0, y: 0 },
        };
      }

      // Key Landmark Indices in MediaPipe Pose:
      // 0: Nose / Head
      // 15: Left Wrist (Subwoofer / Bass)
      // 16: Right Wrist (Treble / Y-Rotation)
      const headRaw = landmarks[0];
      const leftWristRaw = landmarks[15];
      const rightWristRaw = landmarks[16];

      const head = smoothPoint(headRaw, smoothedHeadRef, 0.45);
      const rightHand = smoothPoint(rightWristRaw, smoothedRightHandRef, 0.35);
      const leftHand = smoothPoint(leftWristRaw, smoothedLeftHandRef, 0.35);

      // Dance Velocity across major limb landmarks
      let totalDisplacement = 0;
      const trackedIndices = [0, 11, 12, 15, 16, 23, 24, 27, 28];

      if (prevPoseLandmarksRef.current.length === 33) {
        trackedIndices.forEach((idx) => {
          const curr = landmarks[idx];
          const prev = prevPoseLandmarksRef.current[idx];
          if (curr && prev) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            totalDisplacement += Math.sqrt(dx * dx + dy * dy);
          }
        });
      }
      prevPoseLandmarksRef.current = landmarks.map((l) => ({ x: l.x, y: l.y }));
      const velocity = Math.min(2.5, totalDisplacement * 18);

      // Rotation derived from Right Hand position (mirrored)
      let targetRotX = 0;
      let targetRotY = 0;
      if (rightWristRaw && (rightWristRaw.visibility === undefined || rightWristRaw.visibility > 0.35)) {
        targetRotY = (0.5 - rightWristRaw.x) * 3.5;
        targetRotX = (rightWristRaw.y - 0.5) * 1.8;
      }
      const smoothedRot = lerpRotation(
        smoothedRotationRef.current,
        { x: targetRotX, y: targetRotY },
        ROTATION_LERP_FACTOR
      );
      smoothedRotationRef.current = smoothedRot;

      return {
        head,
        rightHand,
        leftHand,
        velocity,
        rotation: smoothedRot,
      };
    },
    [smoothPoint]
  );

  /**
   * Process 21-point Hand landmarks for rotation and gesture anti-jitter
   */
  const processHands = useCallback(
    (landmarks: HandLandmark[] | null, sensitivity: number = 1.0) => {
      if (!landmarks || landmarks.length < 21) {
        smoothedRotationRef.current = { x: 0, y: 0 };
        return {
          rotation: { x: 0, y: 0 },
        };
      }

      const wrist = landmarks[0];
      const rawRotY = (wrist.x - 0.5) * Math.PI * 2.5 * sensitivity;
      const rawRotX = (wrist.y - 0.5) * Math.PI * 2.0 * sensitivity;

      const smoothed = lerpRotation(
        smoothedRotationRef.current,
        { x: rawRotX, y: rawRotY },
        ROTATION_LERP_FACTOR
      );
      smoothedRotationRef.current = smoothed;

      return {
        rotation: smoothed,
      };
    },
    []
  );

  /**
   * Reset all internal tracking smoothing state
   */
  const reset = useCallback(() => {
    smoothedRightHandRef.current = null;
    smoothedLeftHandRef.current = null;
    smoothedHeadRef.current = null;
    smoothedRotationRef.current = { x: 0, y: 0 };
    prevPoseLandmarksRef.current = [];
  }, []);

  return {
    smoothPoint,
    processPose,
    processHands,
    reset,
    smoothedRightHandRef,
    smoothedLeftHandRef,
    smoothedHeadRef,
    smoothedRotationRef,
  };
};
