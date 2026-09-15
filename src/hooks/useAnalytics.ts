import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVisualizer } from './useVisualizer';
import { classifyGenre } from '../utils/genreClassifier';
import { socketService } from '../services/socketService';

function getOrCreateUid(): string {
  if (typeof window === 'undefined') return 'usr_guest';
  try {
    let id = localStorage.getItem('auralis_client_uid');
    if (!id) {
      id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('auralis_client_uid', id);
    }
    return id;
  } catch {
    return 'usr_guest';
  }
}

export const useAnalytics = () => {
  const { isPlaying, currentTrack, intensityScore, vrMode, setDetectedGenre, hasStarted } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.2);
  const userIdRef = useRef<string>(getOrCreateUid());

  // 1. Report client presence on studio entry
  useEffect(() => {
    if (!hasStarted) return;
    socketService.registerClient({
      userId: userIdRef.current,
      username: `Usuario_${userIdRef.current.substring(4, 8)}`,
      currentTrack: currentTrack?.title || 'Explorando Visualizador',
      artist: currentTrack?.artist || 'Auralis',
      genre: 'Electrónica / EDM',
      score: intensityScore || 0,
      hasCamera: vrMode,
    });
  }, [hasStarted, currentTrack, intensityScore, vrMode]);

  // 2. Stream live analytical telemetry every 2000ms while playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const data = getSmoothedData();
      const genre = classifyGenre(data.raw);
      setDetectedGenre(genre);

      socketService.reportSession({
        userId: userIdRef.current,
        username: `Usuario_${userIdRef.current.substring(4, 8)}`,
        currentTrack: currentTrack?.title || 'Audio en Vivo',
        artist: currentTrack?.artist || 'Auralis',
        genre,
        score: intensityScore || Math.round(data.energy * 100),
        hasCamera: vrMode,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, intensityScore, vrMode, getSmoothedData, setDetectedGenre]);
};

