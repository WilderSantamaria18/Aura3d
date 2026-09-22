import { useState, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

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
  const setIsMicActive = usePlayerStore((s) => s.setIsMicActive);
  const { setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying } = usePlayerStore();
  const [error, setError] = useState<string | null>(null);

  const startMicrophone = useCallback(async () => {
    try {
      setError(null);
      await audioEngine.enableMicrophone();
      setIsMicActive(true);
      setIsPlaying(true);
      setHasStarted(true);
      setAudioUnlocked(true);

      const track: Track = {
        id: 'mic_' + Date.now(),
        title: 'Micrófono en vivo',
        artist: 'Entrada acústica externa',
        duration: 0,
        sourceType: 'mic',
        addedAt: Date.now(),
      };
      setCurrentTrack(track);
    } catch (err: unknown) {
      const isCancel =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (!isCancel) {
        const msg = err instanceof Error ? err.message : 'Error al acceder al micrófono';
        setError(msg);
        console.warn('[useMicrophone] Access error:', err);
      }
    }
  }, [setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setIsMicActive]);

  const stopMicrophone = useCallback(() => {
    audioEngine.disableMicrophone();
    setIsMicActive(false);
  }, [setIsMicActive]);

  const toggleMicrophone = useCallback(async () => {
    if (audioEngine.isMicrophoneActive() || isMicActive) {
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  }, [isMicActive, stopMicrophone, startMicrophone]);

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
