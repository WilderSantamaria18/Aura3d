import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { usePlayerStore } from '../../stores/playerStore';
import { hexToRgba } from '../../types/audio';

/**
 * WallpaperBackground
 * Fondo cinematográfico de alta resolución con proporción perfecta (object-cover)
 * y aceleración GPU nativa. Se fusiona directamente con el ecosistema de Modo Lucid.
 */
export const WallpaperBackground: React.FC = () => {
  const storeWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const backgroundMode = useWallpaperStore((s) => s.backgroundMode);
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);

  const customBg = usePlayerStore((s) => s.blobSettings.customBackgroundImage);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme?.primary || '#00f5d4');
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme?.secondary || '#ffd166');

  const effectiveUrl = (backgroundMode === 'wallpaper' && storeWallpaper?.url) || customBg;

  if (!effectiveUrl) {
    return null;
  }

  const hasCustomFilters =
    applicationSettings.blur > 0 ||
    applicationSettings.brightness !== 1.0 ||
    applicationSettings.saturation !== 1.0;

  return (
    <AnimatePresence>
      <motion.div
        key={storeWallpaper?.id || effectiveUrl}
        initial={{ opacity: 0 }}
        animate={{ opacity: applicationSettings.opacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden"
      >
        {/* Hardware-accelerated 4K Image Layer with perfect proportions */}
        <img
          src={effectiveUrl}
          alt={storeWallpaper?.prompt || 'Fondo Aura3D'}
          decoding="async"
          className="w-full h-full object-cover object-center select-none pointer-events-none will-change-transform transform-gpu transition-all duration-300"
          style={{
            filter: hasCustomFilters
              ? `blur(${applicationSettings.blur}px) brightness(${applicationSettings.brightness}) saturate(${applicationSettings.saturation})`
              : undefined,
            transform: applicationSettings.blur > 0 ? 'scale(1.04)' : 'scale(1)',
          }}
        />

        {/* Modo Lucid Master Fusion Layer: Unifica el fondo con el ecosistema de Aura3D */}
        {isLucid && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at 50% 35%, ${hexToRgba(lucidPrimary, 0.14)} 0%, ${hexToRgba(lucidSecondary, 0.08)} 50%, rgba(2, 4, 10, 0.50) 100%)`,
            }}
          />
        )}

        {/* Cinematographic Vignette Layer */}
        {applicationSettings.vignette && (
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
