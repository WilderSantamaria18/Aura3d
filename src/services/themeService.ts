import { useState, useEffect } from 'react';

export type ThemeMode = 'auto' | 'dark' | 'light';
export type AccentColor = 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';

export interface AccentDefinition {
  id: AccentColor;
  label: string;
  hex: string;
  glow: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentDefinition> = {
  cyan: {
    id: 'cyan',
    label: 'Cyan Eléctrico',
    hex: '#00e5ff',
    glow: 'rgba(0, 229, 255, 0.25)',
  },
  violet: {
    id: 'violet',
    label: 'Violeta Astral',
    hex: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  amber: {
    id: 'amber',
    label: 'Ámbar Cálido',
    hex: '#ff9500',
    glow: 'rgba(255, 149, 0, 0.25)',
  },
  rose: {
    id: 'rose',
    label: 'Rosa Neón',
    hex: '#ff2d55',
    glow: 'rgba(255, 45, 85, 0.25)',
  },
  emerald: {
    id: 'emerald',
    label: 'Esmeralda Aurora',
    hex: '#34c759',
    glow: 'rgba(52, 199, 89, 0.25)',
  },
};

const THEME_KEY = 'aura3d_theme_mode';
const ACCENT_KEY = 'aura3d_accent_color';

class ThemeService {
  private static instance: ThemeService;
  private mode: ThemeMode = 'auto';
  private accent: AccentColor = 'cyan';
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.initFromStorage();
    this.initSystemThemeWatcher();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private initFromStorage() {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (savedMode === 'auto' || savedMode === 'dark' || savedMode === 'light') {
        this.mode = savedMode;
      }

      const savedAccent = localStorage.getItem(ACCENT_KEY) as AccentColor | null;
      if (savedAccent && ACCENT_PALETTES[savedAccent]) {
        this.accent = savedAccent;
      }

      this.applyToDOM();
    }
  }

  private initSystemThemeWatcher() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener('change', () => {
        if (this.mode === 'auto') {
          this.applyToDOM();
          this.notify();
        }
      });
    }
  }

  public getEffectiveTheme(): 'dark' | 'light' {
    if (this.mode === 'dark') return 'dark';
    if (this.mode === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  public applyToDOM() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const effective = this.getEffectiveTheme();

    root.setAttribute('data-theme', effective);

    const palette = ACCENT_PALETTES[this.accent];
    if (palette) {
      root.style.setProperty('--accent-active', palette.hex);
      root.style.setProperty('--color-primary', palette.hex);
      root.style.setProperty('--color-glow', palette.glow);
      root.style.setProperty('--border-focus', palette.hex);
    }
  }

  public setMode(newMode: ThemeMode) {
    this.mode = newMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, newMode);
    }
    this.applyToDOM();
    this.notify();
  }

  public setAccent(newAccent: AccentColor) {
    if (!ACCENT_PALETTES[newAccent]) return;
    this.accent = newAccent;
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCENT_KEY, newAccent);
    }
    this.applyToDOM();
    this.notify();
  }

  public getMode(): ThemeMode {
    return this.mode;
  }

  public getAccent(): AccentColor {
    return this.accent;
  }

  public getAccentPalette(): AccentDefinition {
    return ACCENT_PALETTES[this.accent];
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}

export const themeService = ThemeService.getInstance();

export function useThemeManager() {
  const [mode, setModeState] = useState<ThemeMode>(() => themeService.getMode());
  const [accent, setAccentState] = useState<AccentColor>(() => themeService.getAccent());
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() => themeService.getEffectiveTheme());

  useEffect(() => {
    return themeService.subscribe(() => {
      setModeState(themeService.getMode());
      setAccentState(themeService.getAccent());
      setEffectiveTheme(themeService.getEffectiveTheme());
    });
  }, []);

  return {
    mode,
    accent,
    effectiveTheme,
    accentPalette: ACCENT_PALETTES[accent],
    setThemeMode: (m: ThemeMode) => themeService.setMode(m),
    setAccentColor: (a: AccentColor) => themeService.setAccent(a),
    availableAccents: Object.values(ACCENT_PALETTES),
  };
}
