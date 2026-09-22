import { useState, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

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
  const { setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setCurrentTime, setDuration } = usePlayerStore();

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      let stream: MediaStream | null = null;

      // 1. Check for Electron native WASAPI Loopback desktopCapturer
      const electronAPI = (window as unknown as { electron?: { getDesktopSourceStream?: () => Promise<MediaStream> } }).electron;
      if (electronAPI && typeof electronAPI.getDesktopSourceStream === 'function') {
        try {
          stream = await electronAPI.getDesktopSourceStream();
        } catch (e) {
          console.warn('[useSystemAudio] Electron loopback fallback to displayMedia:', e);
        }
      }

      // 2. Standard Web getDisplayMedia Loopback
      if (!stream) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        setError('No se detectó audio del sistema. Asegúrate de marcar "Compartir audio" en el diálogo.');
        return;
      }

      audioTracks[0].enabled = true;
      await audioEngine.enableSystemCapture(stream);
      setIsCapturing(true);

      const track: Track = {
        id: 'sys_' + Date.now(),
        title: 'Audio del Sistema / Loopback',
        artist: 'Captura en Vivo',
        duration: 0,
        sourceType: 'system',
        addedAt: Date.now(),
      };
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);
      setHasStarted(true);
      setAudioUnlocked(true);
      setIsPlaying(true);

      audioTracks[0].onended = () => {
        setIsCapturing(false);
        audioEngine.disableSystemCapture();
      };
    } catch (err: unknown) {
      const isCancel =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (!isCancel) {
        const msg = err instanceof Error ? err.message : 'Error al capturar audio del sistema';
        setError(msg);
        console.warn('[useSystemAudio] Capture error:', err);
      }
    }
  }, [setCurrentTrack, setHasStarted, setAudioUnlocked, setIsPlaying, setCurrentTime, setDuration]);

  const stopCapture = useCallback(() => {
    audioEngine.disableSystemCapture();
    setIsCapturing(false);
  }, []);

  const toggleCapture = useCallback(async () => {
    if (isCapturing) {
      stopCapture();
    } else {
      await startCapture();
    }
  }, [isCapturing, stopCapture, startCapture]);

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
    toggleCapture,
  };
};
