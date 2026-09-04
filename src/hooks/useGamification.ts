import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useVisualizer } from './useVisualizer';
import { GamificationEngine, type GamificationState, DANCER_RANKS } from '../services/gamificationEngine';
import { GenreClassifier, type GenrePrediction } from '../services/genreClassifier';
import { StorageService } from '../services/storageService';

export const useGamification = () => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const poseVelocity = usePlayerStore((s) => s.poseVelocity);
  const vrMode = usePlayerStore((s) => s.vrMode);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const setIsLucid = usePlayerStore((s) => s.setIsLucid);
  const setIntensityScore = usePlayerStore((s) => s.setIntensityScore);
  const intensityScore = usePlayerStore((s) => s.intensityScore);
  const sessionHighScore = usePlayerStore((s) => s.sessionHighScore);
  const setSessionHighScore = usePlayerStore((s) => s.setSessionHighScore);
  const totalListeningTime = usePlayerStore((s) => s.totalListeningTime);
  const setTotalListeningTime = usePlayerStore((s) => s.setTotalListeningTime);
  const sessionDuration = usePlayerStore((s) => s.sessionDuration);
  const setSessionDuration = usePlayerStore((s) => s.setSessionDuration);
  const setDetectedGenre = usePlayerStore((s) => s.setDetectedGenre);

  const { getSmoothedData } = useVisualizer(0.25);
  const engineRef = useRef<GamificationEngine>(new GamificationEngine());

  const [gameState, setGameState] = useState<GamificationState>({
    score: 0,
    smoothedScore: 0,
    highScore: sessionHighScore || 0,
    allTimeHighScore: StorageService.getHighScore(),
    combo: 1.0,
    rank: DANCER_RANKS['D'],
    estimatedCalories: 0,
    isHyperActive: false,
    isIdle: true,
  });

  const [genrePrediction, setGenrePrediction] = useState<GenrePrediction>({
    genre: 'Detectando...',
    confidence: 0.85,
    energyLevel: 'medium',
    dominantBand: 'mids',
    color: '#00f2fe',
  });

  const lastLucidTriggerRef = useRef<number>(0);
  const lastScoreEmittedRef = useRef<number>(0);
  const lastGenreClassifyRef = useRef<number>(0);

  // ── 1. Session Duration & Total Time Counter ──────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setSessionDuration(usePlayerStore.getState().sessionDuration + 1);
      const newTotal = usePlayerStore.getState().totalListeningTime + 1;
      setTotalListeningTime(newTotal);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, setSessionDuration, setTotalListeningTime]);

  // ── 2. Real-Time Gamification & ML Genre Computation Loop ────────────────
  useEffect(() => {
    let animId: number;
    let lastFrameTime = performance.now();

    const updateLoop = () => {
      const now = performance.now();
      // Run calculations at ~10Hz (100ms) for high efficiency
      if (now - lastFrameTime >= 100) {
        lastFrameTime = now;

        const { bass, mids, highs, energy, raw } = getSmoothedData();
        const currentSessionSeconds = usePlayerStore.getState().sessionDuration;
        const allTimeHigh = StorageService.getHighScore();

        // 1. Calculate Intensity Score
        const effectiveVelocity = vrMode
          ? Math.max(0.08, poseVelocity || 0)
          : isPlaying
          ? 0.35 + energy * 0.45
          : 0;

        const currentGameState = engineRef.current.computeScore(
          effectiveVelocity,
          energy,
          allTimeHigh,
          currentSessionSeconds
        );

        if (Math.abs(currentGameState.score - lastScoreEmittedRef.current) >= 1) {
          lastScoreEmittedRef.current = currentGameState.score;
          setGameState(currentGameState);
          setIntensityScore(currentGameState.score);
        }

        if (currentGameState.highScore > usePlayerStore.getState().sessionHighScore) {
          setSessionHighScore(currentGameState.highScore);
        }

        // 2. Visual Trigger: Score > 70 activates Lucid Hyper-Glow
        if (currentGameState.isHyperActive && !isLucid && now - lastLucidTriggerRef.current > 6000) {
          setIsLucid(true);
          lastLucidTriggerRef.current = now;
        }

        // 3. Classify Genre every 1500ms via DSP/ML (not every frame)
        if (isPlaying && now - lastGenreClassifyRef.current >= 1500) {
          lastGenreClassifyRef.current = now;
          const prediction = GenreClassifier.classify(bass, mids, highs, energy, raw);
          setGenrePrediction(prediction);
          setDetectedGenre(prediction.genre, prediction.confidence);
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    isPlaying,
    vrMode,
    poseVelocity,
    isLucid,
    getSmoothedData,
    setIsLucid,
    setIntensityScore,
    setSessionHighScore,
    setDetectedGenre,
  ]);

  const resetGamification = useCallback(() => {
    engineRef.current.resetSession();
    setSessionDuration(0);
    setIntensityScore(0);
  }, [setSessionDuration, setIntensityScore]);

  return {
    gameState,
    genrePrediction,
    intensityScore,
    sessionHighScore,
    totalListeningTime,
    sessionDuration,
    resetGamification,
  };
};

