import { usePlayerStore } from '../stores/playerStore';
import { useTrackLogoStore } from '../stores/trackLogoStore';
import {
  DEFAULT_LOGO_APPEARANCE,
  isStreamingTrack,
  trackLogoKey,
} from '../utils/logoAppearance';
import type { LogoAppearance, Track } from '../types/audio';

export interface ActiveLogo {
  track: Track | null;
  /** Clave para guardar la personalización de esta canción (null si no hay canción) */
  key: string | null;
  /** Spotify/YouTube: la carátula cambia sola con cada canción */
  streaming: boolean;
  /** Imagen a mostrar: propia de la canción > carátula de la canción > imagen global por defecto */
  src: string | null;
  /** Estilo: propio de la canción > estilo global > sin cambios */
  appearance: LogoAppearance;
  hasTrackImage: boolean;
  hasTrackAppearance: boolean;
}

/**
 * Resuelve el logo del disco central para la canción actual.
 * Cambiar de canción cambia la carátula; la personalización guardada se aplica encima,
 * en lugar de reemplazar la carátula de todas las canciones por una sola imagen.
 */
export function useActiveLogo(): ActiveLogo {
  const track = usePlayerStore((s) => s.currentTrack);
  const globalAppearance = usePlayerStore((s) => s.blobSettings.logoAppearance);
  const fallbackSrc = usePlayerStore((s) => s.blobSettings.customLogoUrl);
  const key = trackLogoKey(track);
  const override = useTrackLogoStore((s) => (key ? s.overrides[key] : undefined));

  return {
    track,
    key,
    streaming: isStreamingTrack(track),
    src: override?.src || track?.coverUrl || fallbackSrc || null,
    appearance: override?.appearance || globalAppearance || DEFAULT_LOGO_APPEARANCE,
    hasTrackImage: !!override?.src,
    hasTrackAppearance: !!override?.appearance,
  };
}

/** Versión sin hooks (capturas de foto/vídeo): misma prioridad de imagen que el visualizador. */
export function getActiveLogoSrc(): string | null {
  const s = usePlayerStore.getState();
  const key = trackLogoKey(s.currentTrack);
  const override = key ? useTrackLogoStore.getState().overrides[key] : undefined;
  return override?.src || s.currentTrack?.coverUrl || s.blobSettings?.customLogoUrl || null;
}

/** Estilo del logo sin hooks (capturas): mismo orden de prioridad que el visualizador. */
export function getActiveLogoAppearance(): LogoAppearance {
  const s = usePlayerStore.getState();
  const key = trackLogoKey(s.currentTrack);
  const override = key ? useTrackLogoStore.getState().overrides[key] : undefined;
  return override?.appearance || s.blobSettings?.logoAppearance || DEFAULT_LOGO_APPEARANCE;
}
