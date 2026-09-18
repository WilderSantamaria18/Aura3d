import { useState, useEffect } from 'react';
import {
  SpatialVisionService,
  type SpatialLandmark,
} from '../services/spatialVisionService';

export function useMediaPipePose() {
  const [poseLandmarks, setPoseLandmarks] = useState<SpatialLandmark[] | null>(null);
  const [kineticEnergy, setKineticEnergy] = useState<number>(0);

  useEffect(() => {
    const vision = SpatialVisionService.getInstance();
    const unsubscribe = vision.subscribePose((landmarks, energy) => {
      setPoseLandmarks(landmarks);
      setKineticEnergy(energy);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    poseLandmarks,
    kineticEnergy,
    isPoseDetected: poseLandmarks !== null,
  };
}
