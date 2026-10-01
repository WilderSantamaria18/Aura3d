import { useState, useCallback, useEffect } from 'react';
import { audioEngine } from '../services/audioEngine';
import { startSystemCapture, stopSystemCapture } from '../services/liveInputs';

export interface UseSystemAudioReturn {
  isCapturing: boolean;
  error: string | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  toggleCapture: () => Promise<void>;
}

export const useSystemAudio = (): UseSystemAudioReturn => {
  const [isCapturing, setIsCapturing] = useState<boolean>(() => audioEngine.isSystemCaptureActive());
  const [error, setError] = useState<string | null>(null);

  // El motor cierra la captura al cambiar de fuente o cuando el usuario deja de compartir
  useEffect(() => {
    return audioEngine.onCaptureEnd((kind) => {
      if (kind === 'system') setIsCapturing(false);
    });
  }, []);

  const startCapture = useCallback(async () => {
    setError(null);
    const result = await startSystemCapture();
    if (result.ok) {
      setIsCapturing(true);
    } else if (!result.cancelled) {
      setError(result.error);
    }
  }, []);

  const stopCapture = useCallback(() => {
    stopSystemCapture();
    setIsCapturing(false);
  }, []);

  const toggleCapture = useCallback(async () => {
    if (isCapturing) {
      stopCapture();
    } else {
      await startCapture();
    }
  }, [isCapturing, stopCapture, startCapture]);

  return { isCapturing, error, startCapture, stopCapture, toggleCapture };
};
