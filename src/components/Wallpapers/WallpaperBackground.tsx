import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallpaperStore } from '../../stores/wallpaperStore';

/**
 * WallpaperBackground
 * Componente de fondo de pantalla cinematográfico de alta resolución montado en z-0.
 * Cuenta con filtros dinámicos (blur, brightness, contrast, blendMode) y viñeta suave.
 * Se sitúa con pointer-events: none garantizando 0 impacto en el motor 3D y los controles.
 */
export const WallpaperBackground: React.FC = () => {
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const backgroundMode = useWallpaperStore((s) => s.backgroundMode);
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);

  if (backgroundMode !== 'wallpaper' || !currentWallpaper) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key={currentWallpaper.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: applicationSettings.opacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-300 will-change-transform"
          style={{
            backgroundImage: `url(${currentWallpaper.url})`,
            filter: `
              blur(${applicationSettings.blur}px)
              brightness(${applicationSettings.brightness})
              saturate(${applicationSettings.saturation})
            `,
            mixBlendMode: applicationSettings.blendMode,
            transform: applicationSettings.blur > 0 ? 'scale(1.05)' : 'scale(1)',
          }}
        />

        {/* Cinematographic Vignette Layer */}
        {applicationSettings.vignette && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(3, 5, 12, 0.75) 100%)',
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
