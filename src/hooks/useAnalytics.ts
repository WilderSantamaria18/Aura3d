import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVisualizer } from './useVisualizer';
import { classifyGenre } from '../utils/genreClassifier';
import { socketService } from '../services/socketService';

export const useAnalytics = () => {
  const { isPlaying, currentTrack, intensityScore, vrMode, setDetectedGenre } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.2);
  const userIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? localStorage.getItem('auralis_client_uid') ||
        (() => {
          const newId = `usr_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('auralis_client_uid', newId);
          return newId;
        })()
      : 'usr_guest'
  );

  // 1. Report client presence on initial load
  useEffect(() => {
    socketService.registerClient({
      userId: userIdRef.current,
      username: `Usuario_${userIdRef.current.substring(4, 8)}`,
      currentTrack: currentTrack?.title || 'Explorando Visualizador',
      artist: currentTrack?.artist || 'Auralis',
      genre: 'Electrónica / EDM',
      score: intensityScore || 0,
      hasCamera: vrMode,
    });
  }, [currentTrack, intensityScore, vrMode]);

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

