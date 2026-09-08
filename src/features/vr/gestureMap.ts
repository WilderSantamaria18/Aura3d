import type { GestureType, IGestureLandmark, IGestureEvent } from '../../types';

/**
 * Pure mathematical helper to compute Euclidean distance between two 3D landmarks
 */
export const calcDistance = (a: IGestureLandmark, b: IGestureLandmark): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Classifies raw MediaPipe 21-point hand landmarks into high-level semantic gestures
 */
export const classifyHandGesture = (
  landmarks: IGestureLandmark[],
  sensitivity: number = 1.0
): IGestureEvent => {
  if (!landmarks || landmarks.length < 21) {
    return {
      type: 'none',
      confidence: 0,
      handedness: 'unknown',
      normalizedCenter: { x: 0.5, y: 0.5 },
      delta: { x: 0, y: 0 },
      timestamp: Date.now(),
    };
  }

  // Key landmark indices
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];

  const indexTip = landmarks[8];
  const indexPIP = landmarks[6];
  const indexMCP = landmarks[5];

  const middleTip = landmarks[12];
  const middlePIP = landmarks[10];
  const middleMCP = landmarks[9];

  const ringTip = landmarks[16];
  const ringPIP = landmarks[14];
  const ringMCP = landmarks[13];

  const pinkyTip = landmarks[20];
  const pinkyPIP = landmarks[18];
  const pinkyMCP = landmarks[17];

  // Scale extension and pinch thresholds with sensitivity
  const sens = Math.max(0.6, Math.min(1.8, sensitivity));
  const extWristFactor = 1.04 - (sens - 1.0) * 0.03;
  const extMcpFactor = 1.10 - (sens - 1.0) * 0.05;

  // Robust finger extension checks: combine wrist-distance and MCP-distance (resilient to tilt)
  const isIndexExt =
    calcDistance(indexTip, wrist) > calcDistance(indexPIP, wrist) * extWristFactor ||
    calcDistance(indexTip, indexMCP) > calcDistance(indexPIP, indexMCP) * extMcpFactor;

  const isMiddleExt =
    calcDistance(middleTip, wrist) > calcDistance(middlePIP, wrist) * extWristFactor ||
    calcDistance(middleTip, middleMCP) > calcDistance(middlePIP, middleMCP) * extMcpFactor;

  const isRingExt =
    calcDistance(ringTip, wrist) > calcDistance(ringPIP, wrist) * extWristFactor ||
    calcDistance(ringTip, ringMCP) > calcDistance(ringPIP, ringMCP) * extMcpFactor;

  const isPinkyExt =
    calcDistance(pinkyTip, wrist) > calcDistance(pinkyPIP, wrist) * extWristFactor ||
    calcDistance(pinkyTip, pinkyMCP) > calcDistance(pinkyPIP, pinkyMCP) * extMcpFactor;

  const isThumbExt =
    calcDistance(thumbTip, pinkyMCP) > calcDistance(thumbIP, pinkyMCP) * 1.04 &&
    calcDistance(thumbTip, thumbMCP) > calcDistance(thumbIP, thumbMCP) * 1.04 &&
    calcDistance(thumbTip, indexMCP) > 0.08;

  const pinchDist = calcDistance(thumbTip, indexTip);
  const isPinchCandidate = pinchDist < 0.105 * sens;

  let gesture: GestureType = 'none';
  let confidence = 0.85;

  const allFingersFolded = !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt;

  if (allFingersFolded) {
    if (isThumbExt && thumbTip.y < thumbIP.y - 0.02) {
      gesture = 'thumbs_up';
      confidence = 0.90;
    } else {
      gesture = 'fist';
      confidence = 0.95;
    }
  } else if (isPinchCandidate && (isMiddleExt || isRingExt || isPinkyExt || calcDistance(indexTip, indexMCP) > 0.07)) {
    gesture = 'pinch';
    confidence = Math.max(0.6, 1.0 - pinchDist * 8);
  } else if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
    gesture = 'one';
    confidence = 0.92;
  } else if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
    gesture = 'peace';
    confidence = 0.90;
  } else if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
    gesture = 'open';
    confidence = 0.96;
  } else if (isIndexExt && isMiddleExt && (isRingExt || isPinkyExt)) {
    gesture = 'open';
    confidence = 0.85;
  } else if (isThumbExt && !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
    gesture = 'thumbs_up';
    confidence = 0.88;
  }

  const center = {
    x: (wrist.x + middleTip.x) / 2,
    y: (wrist.y + middleTip.y) / 2,
  };

  return {
    type: gesture,
    confidence,
    handedness: 'unknown',
    normalizedCenter: center,
    delta: { x: 0, y: 0 },
    timestamp: Date.now(),
  };
};

/**
 * Maps semantic gestures to concrete player store actions
 */
export interface IGestureActionHandler {
  onFist?: () => void;
  onOne?: () => void;
  onPeace?: () => void;
  onThumbsUp?: () => void;
  onOpenHandRotation?: (deltaX: number, deltaY: number) => void;
  onPinchZoom?: (pinchRatio: number) => void;
}

export const dispatchGestureAction = (
  gestureEvent: IGestureEvent,
  handlers: IGestureActionHandler
): void => {
  switch (gestureEvent.type) {
    case 'fist':
      handlers.onFist?.();
      break;
    case 'one':
      handlers.onOne?.();
      break;
    case 'peace':
      handlers.onPeace?.();
      break;
    case 'thumbs_up':
      handlers.onThumbsUp?.();
      break;
    case 'open':
      handlers.onOpenHandRotation?.(gestureEvent.delta.x, gestureEvent.delta.y);
      break;
    case 'pinch':
      handlers.onPinchZoom?.(gestureEvent.confidence);
      break;
    default:
      break;
  }
};

