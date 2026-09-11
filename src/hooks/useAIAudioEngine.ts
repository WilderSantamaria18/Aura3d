import { useState, useEffect } from 'react';
import { aiAudioAnalysis } from '../services/aiAudioAnalysisService';
import type { AIAudioFeatures, AIDynamicPalette } from '../services/aiAudioAnalysisService';

export const useAIAudioEngine = () => {
  const [features, setFeatures] = useState<AIAudioFeatures>(() => aiAudioAnalysis.getFeatures());
  const [palette, setPalette] = useState<AIDynamicPalette>(() => aiAudioAnalysis.getPalette());

  useEffect(() => {
    aiAudioAnalysis.start();
    const unsubscribe = aiAudioAnalysis.subscribe((newFeatures, newPalette) => {
      setFeatures(newFeatures);
      setPalette(newPalette);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    features,
    palette,
    mood: features.mood,
    dominantPitch: features.dominantPitch,
    isBeat: features.isBeat,
    beatPulse: palette.beatPulse,
    bloomModulation: features.bloomModulation,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    glowColor: palette.glow,
  };
};

export default useAIAudioEngine;
