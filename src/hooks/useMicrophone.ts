import { useState, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import { startMicrophone as startMic, stopMicrophone as stopMic } from '../services/liveInputs';

export interface UseMicrophoneReturn {
  isMicActive: boolean;
  error: string | null;
  startMicrophone: () => Promise<void>;
  stopMicrophone: () => void;
  toggleMicrophone: () => Promise<void>;
  setMicGain: (gain: number) => void;
}

export const useMicrophone = (): UseMicrophoneReturn => {
  const isMicActive = usePlayerStore((s) => s.isMicActive);
  const [error, setError] = useState<string | null>(null);

  const startMicrophone = useCallback(async () => {
    setError(null);
    const result = await startMic();
    if (!result.ok && !result.cancelled) setError(result.error);
  }, []);

  const stopMicrophone = useCallback(() => stopMic(), []);

  const toggleMicrophone = useCallback(async () => {
    if (audioEngine.isMicrophoneActive() || isMicActive) {
      stopMic();
    } else {
      await startMicrophone();
    }
  }, [isMicActive, startMicrophone]);

  const setMicGain = useCallback((gain: number) => {
    audioEngine.setMicGain(gain);
  }, []);

  return {
    isMicActive,
    error,
    startMicrophone,
    stopMicrophone,
    toggleMicrophone,
    setMicGain,
  };
};
