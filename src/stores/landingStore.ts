import { create } from 'zustand';

interface LandingState {
  // Navegación
  activeSection: number; // 0-6
  setActiveSection: (n: number) => void;

  // Progreso
  scrollProgress: number; // 0-1 global
  setScrollProgress: (p: number) => void;

  // Secciones visitadas (para animaciones one-shot)
  visitedSections: Set<number>;
  markSectionVisited: (n: number) => void;

  // Preferencias
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;

  // Modo de entrada
  enterMode: 'scroll' | 'button';
  setEnterMode: (m: 'scroll' | 'button') => void;
}

const getStoredEnterMode = (): 'scroll' | 'button' => {
  try {
    const val = localStorage.getItem('aura3d_landing_enter_mode');
    return val === 'button' ? 'button' : 'scroll';
  } catch {
    return 'scroll';
  }
};

export const useLandingStore = create<LandingState>((set) => ({
  activeSection: 0,
  setActiveSection: (activeSection) => set({ activeSection }),

  scrollProgress: 0,
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),

  visitedSections: new Set([0]),
  markSectionVisited: (n) =>
    set((state) => {
      if (state.visitedSections.has(n)) return state;
      const next = new Set(state.visitedSections);
      next.add(n);
      return { visitedSections: next };
    }),

  reduceMotion:
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),

  enterMode: getStoredEnterMode(),
  setEnterMode: (enterMode) => {
    try {
      localStorage.setItem('aura3d_landing_enter_mode', enterMode);
    } catch {
      // ignore
    }
    set({ enterMode });
  },
}));
