/**
 * CollapsedLyricsPill — Minimized pill state for the Lyrics panel
 *
 * Uses Framer Motion layoutId="lyrics-panel" to morph seamlessly
 * with the expanded LyricsPanel card.
 *
 * Positioned fixed bottom-4 right-4. Shows:
 *  - Rotating Disc3 icon (indicates music is playing)
 *  - Truncated track title
 *  - ChevronUp to expand
 *
 * Usage: render when panelState === 'collapsed' instead of LyricsPanel.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Disc3, ChevronUp, Music2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface CollapsedLyricsPillProps {
  title?: string;
  isPlaying?: boolean;
  activeColor?: string;
  onExpand: () => void;
}

export const CollapsedLyricsPill: React.FC<CollapsedLyricsPillProps> = ({
  title = 'Sin título',
  isPlaying = false,
  activeColor = '#00f0ff',
  onExpand,
}) => {
  return (
    <motion.div
      layoutId="lyrics-panel"
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 cursor-pointer select-none"
      style={{
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderTop: '1px solid rgba(255,255,255,0.30)',
        borderRadius: '9999px',
        padding: '8px 16px 8px 10px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.18)',
      }}
      onClick={onExpand}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      title="Expandir letras"
    >
      {/* Rotating disc icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border"
        style={{
          backgroundColor: `${activeColor}22`,
          borderColor: `${activeColor}44`,
          color: activeColor,
        }}
      >
        <Disc3
          className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`}
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* Track title */}
      <span
        className="text-xs font-semibold text-white truncate max-w-[140px] leading-tight tracking-tight"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {title}
      </span>

      {/* Expand button */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </div>
    </motion.div>
  );
};

export default CollapsedLyricsPill;
