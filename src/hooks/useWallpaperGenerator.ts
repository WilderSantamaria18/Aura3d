import { useState, useCallback } from 'react';
import { useWallpaperStore } from '../stores/wallpaperStore';
import { WallpaperGeneratorService } from '../services/wallpaperGeneratorService';
import type {
  WallpaperStyle,
  WallpaperAspectRatio,
  WallpaperPalette,
  WallpaperGenerationResult,
} from '../types/wallpaper';

export const useWallpaperGenerator = () => {
  const isGenerating = useWallpaperStore((s) => s.isGenerating);
  const setIsGenerating = useWallpaperStore((s) => s.setIsGenerating);
  const generationProgress = useWallpaperStore((s) => s.generationProgress);
  const setGenerationProgress = useWallpaperStore((s) => s.setGenerationProgress);
  const generationError = useWallpaperStore((s) => s.generationError);
  const setGenerationError = useWallpaperStore((s) => s.setGenerationError);
  const addToHistory = useWallpaperStore((s) => s.addToHistory);
  const setLastRequest = useWallpaperStore((s) => s.setLastRequest);
  const setPreviewWallpaper = useWallpaperStore((s) => s.setPreviewWallpaper);

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<WallpaperStyle>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<WallpaperAspectRatio>('16:9');
  const [palette, setPalette] = useState<WallpaperPalette>('warm-sunset');

  const generate = useCallback(async (): Promise<WallpaperGenerationResult | null> => {
    if (!prompt.trim() || isGenerating) return null;

    setIsGenerating(true);
    setGenerationProgress(10);
    setGenerationError(null);

    const request = {
      prompt: prompt.trim(),
      style,
      aspectRatio,
      palette,
    };
    setLastRequest(request);

    try {
      const result = await WallpaperGeneratorService.generate(request, (p) => {
        setGenerationProgress(p);
      });

      addToHistory({
        id: result.id,
        thumbnail: result.thumbnail,
        url: result.url,
        prompt: result.prompt,
        style: result.style,
        aspectRatio: result.aspectRatio,
        timestamp: result.createdAt,
        isFavorite: false,
      });

      setPreviewWallpaper(result);
      setIsGenerating(false);
      setGenerationProgress(0);
      return result;
    } catch (err: any) {
      console.error('[useWallpaperGenerator] Error:', err);
      setGenerationError(err?.message || 'Error al generar wallpaper con IA');
      setIsGenerating(false);
      setGenerationProgress(0);
      return null;
    }
  }, [
    prompt,
    style,
    aspectRatio,
    palette,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
    setGenerationError,
    setLastRequest,
    addToHistory,
    setPreviewWallpaper,
  ]);

  return {
    prompt,
    setPrompt,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    palette,
    setPalette,
    generate,
    isGenerating,
    generationProgress,
    generationError,
  };
};
