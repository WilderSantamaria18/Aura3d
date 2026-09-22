import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WallpaperGenerationResult,
  WallpaperApplicationSettings,
  WallpaperHistoryItem,
  WallpaperGenerationRequest,
} from '../types/wallpaper';

interface WallpaperState {
  // Panel UI
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
  activeTab: 'gallery' | 'generate' | 'history' | 'settings';
  setActiveTab: (tab: 'gallery' | 'generate' | 'history' | 'settings') => void;

  // Wallpaper actual aplicado
  currentWallpaper: WallpaperGenerationResult | null;
  setCurrentWallpaper: (w: WallpaperGenerationResult | null) => void;

  // Configuración de aplicación del wallpaper
  applicationSettings: WallpaperApplicationSettings;
  updateApplicationSettings: (settings: Partial<WallpaperApplicationSettings>) => void;
  resetApplicationSettings: () => void;

  // Modo de fondo general
  backgroundMode: 'wallpaper' | 'atmosphere' | 'void';
  setBackgroundMode: (mode: 'wallpaper' | 'atmosphere' | 'void') => void;

  // Estado del generador
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  generationProgress: number; // 0 - 100
  setGenerationProgress: (progress: number) => void;
  generationError: string | null;
  setGenerationError: (err: string | null) => void;

  // Historial
  history: WallpaperHistoryItem[];
  addToHistory: (item: WallpaperHistoryItem) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  toggleFavorite: (id: string) => void;

  // Última petición (para reintentar o re-generar)
  lastRequest: WallpaperGenerationRequest | null;
  setLastRequest: (req: WallpaperGenerationRequest) => void;

  // Preview temporal (antes de confirmar aplicación)
  previewWallpaper: WallpaperGenerationResult | null;
  setPreviewWallpaper: (w: WallpaperGenerationResult | null) => void;
}

const DEFAULT_SETTINGS: WallpaperApplicationSettings = {
  opacity: 0.85,
  blur: 0,
  brightness: 1.0,
  saturation: 1.0,
  blendMode: 'normal',
  vignette: true,
};

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      isPanelOpen: false,
      setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
      activeTab: 'gallery',
      setActiveTab: (activeTab) => set({ activeTab }),

      currentWallpaper: null,
      setCurrentWallpaper: (currentWallpaper) => {
        set({ currentWallpaper });
        if (currentWallpaper) {
          set({ backgroundMode: 'wallpaper' });
        }
      },

      applicationSettings: DEFAULT_SETTINGS,
      updateApplicationSettings: (settings) =>
        set((state) => ({
          applicationSettings: { ...state.applicationSettings, ...settings },
        })),
      resetApplicationSettings: () => set({ applicationSettings: DEFAULT_SETTINGS }),

      backgroundMode: 'atmosphere',
      setBackgroundMode: (backgroundMode) => set({ backgroundMode }),

      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      generationProgress: 0,
      setGenerationProgress: (generationProgress) => set({ generationProgress }),
      generationError: null,
      setGenerationError: (generationError) => set({ generationError }),

      history: [],
      addToHistory: (item) =>
        set((state) => ({
          history: [item, ...state.history.filter((h) => h.id !== item.id)].slice(0, 30),
        })),
      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),
      clearHistory: () => set({ history: [] }),
      toggleFavorite: (id) =>
        set((state) => ({
          history: state.history.map((h) =>
            h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
          ),
          currentWallpaper:
            state.currentWallpaper?.id === id
              ? { ...state.currentWallpaper, isFavorite: !state.currentWallpaper.isFavorite }
              : state.currentWallpaper,
        })),

      lastRequest: null,
      setLastRequest: (lastRequest) => set({ lastRequest }),

      previewWallpaper: null,
      setPreviewWallpaper: (previewWallpaper) => set({ previewWallpaper }),
    }),
    {
      name: 'aura3d-wallpapers-store',
      partialize: (state) => ({
        applicationSettings: state.applicationSettings,
        backgroundMode: state.backgroundMode,
        history: state.history.slice(0, 20),
        currentWallpaper: state.currentWallpaper,
      }),
    }
  )
);
