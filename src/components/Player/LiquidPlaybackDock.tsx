import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { ZenTrackCapsule } from './ZenTrackCapsule';
import { usePlayerStore } from '../../stores/playerStore';
import { useChameleonPalette } from '../../hooks/useChameleonPalette';

interface LiquidPlaybackDockProps {
  shouldHideUI: boolean;
  isZenGhostMode: boolean;
  isDockHovered: boolean;
  setIsDockHovered: (hovered: boolean) => void;
}

/**
 * LiquidPlaybackDock — visionOS Liquid Glass Dynamic Island for Playback
 *
 * Master adaptive playback dock that smoothly morphs between the full transport dock
 * and the ultra-compact Zen floating capsule when entering/exiting Cinema mode.
 * Features Chameleon Mesh ambient coloring dynamically extracted from album artwork.
 */
export const LiquidPlaybackDock: React.FC<LiquidPlaybackDockProps> = ({
  shouldHideUI,
  isZenGhostMode,
  setIsDockHovered,
}) => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const setIsUiIdle = usePlayerStore((s) => s.setIsUiIdle);
  const palette = useChameleonPalette();

  const isZenActive = shouldHideUI || isZenGhostMode;

  const handleExpand = () => {
    setIsUiIdle(false);
    setIsDockHovered(true);
  };

  return (
    <AnimatePresence mode="wait">
      {isZenActive ? (
        <ZenTrackCapsule key="zen-capsule" onExpand={handleExpand} />
      ) : (
        <motion.div
          key="full-dock"
          layoutId="unified-playback-capsule"
          initial={{ opacity: 0, y: 28, scale: 0.94, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 28, scale: 0.94, filter: 'blur(8px)' }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 28,
            mass: 0.9,
          }}
          className="fixed bottom-3 sm:bottom-6 left-0 right-0 z-50 p-1.5 sm:p-2 pointer-events-none flex flex-col items-center"
          onMouseEnter={() => setIsDockHovered(true)}
          onMouseLeave={() => setIsDockHovered(false)}
        >
          <div
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              e.currentTarget.style.setProperty('--dock-specular-x', `${x.toFixed(1)}%`);
            }}
            className="w-[clamp(300px,78vw,640px)] px-3.5 py-2.5 flex flex-col gap-1.5 pointer-events-auto visionos-window group/capsule select-none relative overflow-hidden"
            style={{
              background: `linear-gradient(160deg, rgba(255, 255, 255, 0.09) 0%, rgba(14, 18, 30, 0.88) 100%), ${palette.meshGradient}`,
              borderColor: isLucid ? lucidTheme.borderColor : palette.border,
              boxShadow: `0 24px 64px -14px rgba(0, 0, 0, 0.85), 0 0 28px ${
                isLucid ? lucidTheme.glow : palette.glow
              }, inset 0 1px 1.5px rgba(255, 255, 255, 0.32), inset 0 -1px 1px rgba(0, 0, 0, 0.4)`,
            }}
          >
            {/* Borde especular activo visionOS que sigue al cursor */}
            <div
              className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none opacity-70 transition-opacity duration-300 group-hover/capsule:opacity-100"
              style={{
                background: `radial-gradient(180px circle at var(--dock-specular-x, 50%) 0%, rgba(255, 255, 255, 0.9) 0%, rgba(0, 229, 255, 0.4) 40%, transparent 100%)`,
              }}
            />
            {/* Main Player Transport & Progress */}
            <Controls />
            <ProgressBar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LiquidPlaybackDock;
