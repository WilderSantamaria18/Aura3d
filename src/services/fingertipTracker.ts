import type { HandLandmark } from '../stores/playerStore';

export interface FingertipPoint {
  id: number; // 4, 8, 12, 16, 20
  name: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
  handIndex: number; // 0 = first hand, 1 = second hand
  x: number; // 0..1
  y: number; // 0..1
  z: number; // relative depth
  x3d: number; // normalized Three.js coordinate (-4 to +4)
  y3d: number; // normalized Three.js coordinate (-3 to +3)
  z3d: number;
  vy: number; // downward velocity
  isStriking: boolean;
  velocity: number; // 0.0 to 1.0 hit intensity
}

export interface KeyZone {
  id: string | number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const FINGERTIP_INDICES: { id: number; name: FingertipPoint['name'] }[] = [
  { id: 4, name: 'thumb' },
  { id: 8, name: 'index' },
  { id: 12, name: 'middle' },
  { id: 16, name: 'ring' },
  { id: 20, name: 'pinky' },
];

const STRIKE_VELOCITY_THRESHOLD = 0.0035; // Downward movement per millisecond
const COOLDOWN_MS = 160; // Minimum time between consecutive strikes for the same finger

class FingertipTrackerService {
  private prevTips: Map<string, { y: number; time: number }> = new Map();
  private lastStrikeTime: Map<string, number> = new Map();

  /**
   * Extract all active fingertips from MediaPipe landmarks
   * Supports single hand (HandLandmark[]) or multi-hands (HandLandmark[][])
   */
  public extractFingertips(
    landmarks: HandLandmark[] | null,
    multiHands?: HandLandmark[][] | null
  ): FingertipPoint[] {
    const handsToProcess: HandLandmark[][] = [];

    if (multiHands && multiHands.length > 0) {
      handsToProcess.push(...multiHands);
    } else if (landmarks && landmarks.length >= 21) {
      handsToProcess.push(landmarks);
    }

    if (handsToProcess.length === 0) {
      this.prevTips.clear();
      return [];
    }

    const now = performance.now();
    const result: FingertipPoint[] = [];

    handsToProcess.forEach((hand, handIdx) => {
      FINGERTIP_INDICES.forEach(({ id, name }) => {
        const lm = hand[id];
        if (!lm) return;

        const key = `${handIdx}_${id}`;
        const prev = this.prevTips.get(key);
        let vy = 0;

        if (prev) {
          const dt = Math.max(1, now - prev.time);
          // In screen coords, positive delta-y means moving DOWNWARD
          vy = (lm.y - prev.y) / dt;
        }
        this.prevTips.set(key, { y: lm.y, time: now });

        // Strike detection: moving downwards rapidly
        const lastStrike = this.lastStrikeTime.get(key) || 0;
        const cooldownPassed = now - lastStrike > COOLDOWN_MS;
        const isDownwardBurst = vy > STRIKE_VELOCITY_THRESHOLD;

        let isStriking = false;
        let strikeVelocity = 0.7;

        if (cooldownPassed && isDownwardBurst) {
          isStriking = true;
          this.lastStrikeTime.set(key, now);
          // Map downward velocity to acoustic strike intensity (0.4 to 1.0)
          strikeVelocity = Math.min(1.0, Math.max(0.4, 0.4 + (vy - STRIKE_VELOCITY_THRESHOLD) * 40));
        }

        // Map to 3D Viewport Coordinates
        // Video is mirrored horizontally so user sees intuitive mirror movement:
        // Left in screen (user's right) maps to positive X
        const x3d = (0.5 - lm.x) * 8.0;
        const y3d = (0.5 - lm.y) * 5.0;
        const z3d = -(lm.z || 0) * 4.0;

        result.push({
          id,
          name,
          handIndex: handIdx,
          x: 1 - lm.x, // Mirrored 0..1 for UI overlays
          y: lm.y,
          z: lm.z || 0,
          x3d,
          y3d,
          z3d,
          vy,
          isStriking,
          velocity: strikeVelocity,
        });
      });
    });

    return result;
  }

  /**
   * Check collision between a fingertip 3D point and a 3D bounding box
   */
  public check3DCollision(
    tip: FingertipPoint,
    box: { x: number; y: number; z: number; width: number; height: number; depth: number }
  ): boolean {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    const halfD = box.depth / 2;

    return (
      tip.x3d >= box.x - halfW &&
      tip.x3d <= box.x + halfW &&
      tip.y3d >= box.y - halfH &&
      tip.y3d <= box.y + halfH &&
      Math.abs(tip.z3d - box.z) <= halfD + 0.8
    );
  }

  /**
   * Reset tracking state
   */
  public reset(): void {
    this.prevTips.clear();
    this.lastStrikeTime.clear();
  }
}

export const fingertipTracker = new FingertipTrackerService();
