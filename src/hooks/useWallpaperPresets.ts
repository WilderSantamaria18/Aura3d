import { useMemo, useState } from 'react';
import { CURATED_PRESETS } from '../services/wallpaperPresetsService';
import type { WallpaperPreset, WallpaperStyle } from '../types/wallpaper';

export const useWallpaperPresets = () => {
  const [selectedStyle, setSelectedStyle] = useState<WallpaperStyle | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = useMemo(() => {
    return CURATED_PRESETS.filter((preset) => {
      const matchStyle = selectedStyle === 'all' || preset.style === selectedStyle;
      const matchSearch =
        !searchQuery.trim() ||
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchStyle && matchSearch;
    });
  }, [selectedStyle, searchQuery]);

  return {
    presets: filteredPresets,
    totalCount: CURATED_PRESETS.length,
    selectedStyle,
    setSelectedStyle,
    searchQuery,
    setSearchQuery,
  };
};
