import { create } from 'zustand';
import type { LogoAppearance } from '../types/audio';

/**
 * Logo personalizado por canción. Solo guarda lo que el usuario cambió:
 *  - src: imagen propia (canciones locales) ya reducida a ~384 px
 *  - appearance: encuadre y filtros propios de esa canción
 * Lo que no esté aquí cae al estilo global y a la carátula de la propia canción.
 */
export interface TrackLogoOverride {
  src?: string;
  appearance?: LogoAppearance;
  updatedAt: number;
}

const STORAGE_KEY = 'aura3d_track_logos_v1';
const MAX_ENTRIES = 60;

function load(): Record<string, TrackLogoOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Guarda y, si la cuota se agota, descarta las entradas más antiguas y reintenta. */
function persist(overrides: Record<string, TrackLogoOverride>): Record<string, TrackLogoOverride> {
  const capped = Object.entries(overrides)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, MAX_ENTRIES);

  // La memoria conserva todo lo permitido; solo la copia en disco se recorta si la cuota se agota
  // (o no se guarda nada si localStorage no está disponible, p. ej. modo privado).
  let toStore = capped;
  for (let attempt = 0; attempt < 6 && toStore.length > 0; attempt++) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(toStore)));
      break;
    } catch {
      toStore = toStore.slice(0, Math.floor(toStore.length / 2));
    }
  }
  return Object.fromEntries(capped);
}

interface TrackLogoState {
  overrides: Record<string, TrackLogoOverride>;
  setOverride: (key: string, patch: { src?: string; appearance?: LogoAppearance }) => void;
  /** Quita partes concretas del logo de una canción; sin `parts` borra todo */
  clearOverride: (key: string, parts?: Array<'src' | 'appearance'>) => void;
}

export const useTrackLogoStore = create<TrackLogoState>((set) => ({
  overrides: load(),

  setOverride: (key, patch) =>
    set((state) => {
      const prev = state.overrides[key];
      const merged: TrackLogoOverride = { ...prev, ...patch, updatedAt: Date.now() };
      return { overrides: persist({ ...state.overrides, [key]: merged }) };
    }),

  clearOverride: (key, parts) =>
    set((state) => {
      const prev = state.overrides[key];
      if (!prev) return state;
      const next = { ...state.overrides };
      if (!parts) {
        delete next[key];
      } else {
        const cleaned: TrackLogoOverride = { ...prev };
        parts.forEach((part) => delete cleaned[part]);
        if (!cleaned.src && !cleaned.appearance) delete next[key];
        else next[key] = { ...cleaned, updatedAt: Date.now() };
      }
      return { overrides: persist(next) };
    }),
}));
