import { useSyncExternalStore, useEffect } from 'react';
import { aiAudioAnalysis } from '../services/aiAudioAnalysisService';

export const useAIAudioEngine = () => {
  useEffect(() => {
    aiAudioAnalysis.start();
  }, []);

  const data = useSyncExternalStore(
    aiAudioAnalysis.subscribe,
    aiAudioAnalysis.getSnapshot,
    aiAudioAnalysis.getSnapshot
  );

  return {
    features: data.features,
    palette: data.palette,
    mood: data.features.mood,
    dominantPitch: data.features.dominantPitch,
    isBeat: data.features.isBeat,
    beatPulse: data.palette.beatPulse,
    bloomModulation: data.features.bloomModulation,
    primaryColor: data.palette.primary,
    secondaryColor: data.palette.secondary,
    accentColor: data.palette.accent,
    glowColor: data.palette.glow,
  };
};

export default useAIAudioEngine;
