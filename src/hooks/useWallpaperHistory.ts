import { useEffect, useState, useCallback } from 'react';
import { useWallpaperStore } from '../stores/wallpaperStore';
import { WallpaperCacheService } from '../services/wallpaperCacheService';
import type { WallpaperGenerationResult } from '../types/wallpaper';

export const useWallpaperHistory = () => {
  const history = useWallpaperStore((s) => s.history);
  const removeFromStore = useWallpaperStore((s) => s.removeFromHistory);
  const clearStoreHistory = useWallpaperStore((s) => s.clearHistory);
  const toggleFavorite = useWallpaperStore((s) => s.toggleFavorite);

  const [cachedWallpapers, setCachedWallpapers] = useState<WallpaperGenerationResult[]>([]);
  const [cacheSizeMb, setCacheSizeMb] = useState(0);

  const refreshCache = useCallback(async () => {
    const all = await WallpaperCacheService.getAll();
    setCachedWallpapers(all);
    const bytes = await WallpaperCacheService.getCacheSize();
    setCacheSizeMb(Math.round((bytes / (1024 * 1024)) * 10) / 10);
  }, []);

  useEffect(() => {
    refreshCache();
  }, [history, refreshCache]);

  const remove = useCallback(
    async (id: string) => {
      removeFromStore(id);
      await WallpaperCacheService.delete(id);
      await refreshCache();
    },
    [removeFromStore, refreshCache]
  );

  const clearAll = useCallback(async () => {
    clearStoreHistory();
    await WallpaperCacheService.clear();
    await refreshCache();
  }, [clearStoreHistory, refreshCache]);

  return {
    history,
    cachedWallpapers,
    cacheSizeMb,
    remove,
    clearAll,
    toggleFavorite,
    refreshCache,
  };
};
