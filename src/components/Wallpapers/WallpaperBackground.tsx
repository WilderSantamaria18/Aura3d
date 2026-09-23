import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { usePlayerStore } from '../../stores/playerStore';
import { hexToRgba } from '../../types/audio';

/**
 * WallpaperBackground
 * Fondo cinematográfico de ultra-alta definición con proporción perfecta (object-cover / contain),
 * aceleración GPU nativa, sin bloqueos de hotlinking (referrerPolicy) y fusión armónica con Modo Lucid.
 */
export const WallpaperBackground: React.FC = () => {
  const storeWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);

  const customBg = usePlayerStore((s) => s.blobSettings?.customBackgroundImage);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme?.primary || '#00f5d4');
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme?.secondary || '#ffd166');

  // URL activa unificada (preset seleccionado o imagen subida por el usuario)
  const effectiveUrl = storeWallpaper?.url || customBg || null;
  const [loadError, setLoadError] = useState(false);

  // Reiniciar estado de error cuando cambia la URL
  useEffect(() => {
    setLoadError(false);
  }, [effectiveUrl]);

  if (!effectiveUrl || loadError) {
    return null;
  }

  // Ajustes combinados de tienda y blob
  const opacity = applicationSettings?.opacity ?? blobSettings?.backgroundOpacity ?? 0.85;
  const blur = applicationSettings?.blur ?? blobSettings?.backgroundBlur ?? 0;
  const brightness = applicationSettings?.brightness ?? 1.0;
  const saturation = applicationSettings?.saturation ?? 1.0;
  const fit = blobSettings?.backgroundFit || 'cover';
  const scale = blobSettings?.backgroundScale || 1.0;
  const contrastMode = blobSettings?.backgroundContrastMode || 'text_clarity';
  const textScrim = blobSettings?.backgroundTextScrim ?? 0.65;
  const themeTint = blobSettings?.backgroundThemeTint ?? 0.35;

  const hasCustomFilters = blur > 0 || brightness !== 1.0 || saturation !== 1.0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={storeWallpaper?.id || effectiveUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden"
      >
        {/* Hardware-accelerated 4K Image Layer with perfect proportions & no-referrer */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={effectiveUrl}
            alt={storeWallpaper?.prompt || 'Fondo Aura3D'}
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => {
              console.warn('[WallpaperBackground] Failed to load wallpaper URL:', effectiveUrl);
              setLoadError(true);
            }}
            className="w-full h-full select-none pointer-events-none will-change-transform transform-gpu transition-all duration-300"
            style={{
              objectFit: fit,
              transform: `scale(${scale * (blur > 0 ? 1.04 : 1.0)})`,
              filter: hasCustomFilters
                ? `blur(${blur}px) brightness(${brightness}) saturate(${saturation})`
                : undefined,
            }}
          />
        </div>

        {/* Capa de Protección de Contraste y Legibilidad para el Texto de la UI */}
        {contrastMode !== 'none' && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-300"
            style={{
              background:
                contrastMode === 'deep_cinema'
                  ? `radial-gradient(ellipse at 50% 50%, rgba(3, 5, 12, ${textScrim * 0.75}) 0%, rgba(1, 2, 6, ${Math.min(1, textScrim * 1.15)}) 100%)`
                  : contrastMode === 'lucid_tint'
                  ? `radial-gradient(ellipse at 50% 40%, ${hexToRgba(lucidPrimary, themeTint * 0.35)} 0%, rgba(4, 6, 14, ${textScrim}) 85%), linear-gradient(180deg, rgba(3, 5, 12, ${textScrim * 0.8}) 0%, ${hexToRgba(lucidSecondary, themeTint * 0.25)} 50%, rgba(1, 2, 6, ${textScrim * 1.05}) 100%)`
                  : /* text_clarity (default) */
                    `radial-gradient(ellipse at 50% 50%, rgba(3, 6, 14, ${textScrim * 0.65}) 0%, rgba(1, 3, 8, ${Math.min(0.98, textScrim * 1.1)}) 100%), linear-gradient(180deg, rgba(2, 4, 10, ${textScrim * 0.7}) 0%, transparent 40%, transparent 60%, rgba(2, 4, 10, ${textScrim * 0.85}) 100%)`,
            }}
          />
        )}

        {/* Modo Lucid Master Fusion Layer: Unifica el fondo con el ecosistema de Aura3D */}
        {isLucid && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at 50% 35%, ${hexToRgba(lucidPrimary, 0.12)} 0%, ${hexToRgba(lucidSecondary, 0.06)} 50%, rgba(2, 4, 10, 0.45) 100%)`,
            }}
          />
        )}

        {/* Cinematographic Vignette Layer */}
        {applicationSettings?.vignette && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(1, 2, 6, 0.70) 100%)',
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default WallpaperBackground;
