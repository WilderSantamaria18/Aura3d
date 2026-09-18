import { useEffect } from 'react';
import { SpatialVisionService } from '../services/spatialVisionService';
import { AirInstrumentsAudioEngine } from '../services/airInstrumentsAudioEngine';

export function useCameraCleanup(active: boolean) {
  useEffect(() => {
    return () => {
      // Si el componente se desmonta o la cámara se desactiva, detener streams y audio
      SpatialVisionService.getInstance().stopCamera();
      AirInstrumentsAudioEngine.getInstance().cleanup();
    };
  }, [active]);
}
