import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardAssets } from '../../services/storyCard/blocks';
import type { CardConfig, CardFontId, ResolvedCardContent } from '../../services/storyCard/config';
import { captureVisualizerSnapshot, ensureCardFonts, loadImage } from '../../services/storyCard/assets';

export type CoverState = 'none' | 'loading' | 'ready' | 'blocked';

export interface UseCardAssets {
  assets: CardAssets;
  /** Vuelve a copiar el fotograma del visualizador; devuelve false si no hay ninguno visible */
  capture: () => boolean;
  capturedAt: number | null;
  /**
   * none: la canción no tiene portada · loading · ready ·
   * blocked: tiene portada pero el servidor no permite leerla (CORS), así que no se podría exportar
   */
  coverState: CoverState;
}

/** Una imagen ya resuelta para una URL concreta (null = no se pudo cargar) */
interface Loaded {
  src: string;
  img: HTMLImageElement | null;
}

/**
 * Recursos gráficos de la tarjeta: captura del visualizador (al abrir y a demanda), portada de la
 * canción y foto de perfil. Las imágenes se cargan con CORS para que la exportación no falle.
 * El estado se deriva durante el render a partir de la URL pedida: solo se llama a setState cuando
 * termina una carga asíncrona, nunca de forma síncrona dentro de un efecto.
 */
export function useCardAssets(config: CardConfig, content: ResolvedCardContent): UseCardAssets {
  // Fotograma inicial al abrir la pestaña
  const [snapshot, setSnapshot] = useState(() => {
    const canvas = captureVisualizerSnapshot();
    return { canvas, at: canvas ? Date.now() : null };
  });
  const [coverLoaded, setCoverLoaded] = useState<Loaded | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState<Loaded | null>(null);

  const capture = useCallback(() => {
    const canvas = captureVisualizerSnapshot();
    setSnapshot({ canvas, at: canvas ? Date.now() : null });
    return canvas !== null;
  }, []);

  const coverUrl = content.coverUrl;
  useEffect(() => {
    if (!coverUrl) return;
    let cancelled = false;
    loadImage(coverUrl).then((img) => {
      if (!cancelled) setCoverLoaded({ src: coverUrl, img });
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  const avatarSrc = config.profile.avatar;
  useEffect(() => {
    if (!avatarSrc) return;
    let cancelled = false;
    loadImage(avatarSrc).then((img) => {
      if (!cancelled) setAvatarLoaded({ src: avatarSrc, img });
    });
    return () => {
      cancelled = true;
    };
  }, [avatarSrc]);

  // Derivado: solo vale el resultado que corresponde a la URL actual (el de una canción anterior se ignora)
  const cover = coverUrl && coverLoaded?.src === coverUrl ? coverLoaded.img : null;
  const coverState: CoverState = !coverUrl ? 'none' : coverLoaded?.src !== coverUrl ? 'loading' : cover ? 'ready' : 'blocked';
  const avatar = avatarSrc && avatarLoaded?.src === avatarSrc ? avatarLoaded.img : null;

  const visualizer = snapshot.canvas;
  const assets = useMemo<CardAssets>(() => ({ visualizer, cover, avatar }), [visualizer, cover, avatar]);
  return { assets, capture, capturedAt: snapshot.at, coverState };
}

/**
 * Espera a que la tipografía elegida esté cargada y devuelve un contador que cambia cuando lo está,
 * para volver a dibujar la vista previa (el canvas no se actualiza solo al llegar una fuente web).
 */
export function useCardFonts(font: CardFontId): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    ensureCardFonts(font).then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [font]);
  return version;
}
