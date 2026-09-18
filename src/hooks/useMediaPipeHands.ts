import { useState, useEffect } from 'react';
import {
  SpatialVisionService,
  type HandTrackingResult,
} from '../services/spatialVisionService';

export function useMediaPipeHands() {
  const [hands, setHands] = useState<HandTrackingResult[]>([]);
  const [primaryGesture, setPrimaryGesture] = useState<string>('unknown');

  useEffect(() => {
    const vision = SpatialVisionService.getInstance();
    const unsubscribe = vision.subscribeHands((detectedHands) => {
      setHands(detectedHands);
      if (detectedHands.length > 0) {
        setPrimaryGesture(detectedHands[0].gesture);
      } else {
        setPrimaryGesture('unknown');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    hands,
    primaryGesture,
    isHandDetected: hands.length > 0,
    leftHand: hands.find((h) => h.handedness === 'Left') || null,
    rightHand: hands.find((h) => h.handedness === 'Right') || null,
  };
}
