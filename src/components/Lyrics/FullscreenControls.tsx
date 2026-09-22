/**
 * FullscreenControls — Floating media control pill for Fullscreen Lyrics Mode
 *
 * Implements Apple Liquid Glass aesthetics with smooth auto-hide transitions,
 * backdrop blur, specular top highlight, and responsive spring interactions.
 */

import React from 'react';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';

export interface FullscreenControlsProps {
  isPlaying: boolean;
  isUiVisible: boolean;
  activeColor?: string;
  onPlayPause?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

export const FullscreenControls: React.FC<FullscreenControlsProps> = ({
  isPlaying,
  isUiVisible,
  activeColor = '#00f0ff',
  onPlayPause,
  onSkipBack,
  onSkipForward,
}) => {
  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 liquid-glass--pill z-40 px-4 py-2 flex items-center gap-3 transition-all duration-300 ${
        isUiVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderTop: '1px solid rgba(255, 255, 255, 0.30)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.18)',
      }}
      role="toolbar"
      aria-label="Controles de reproducción en pantalla completa"
    >
      {onSkipBack && (
        <button
          onClick={onSkipBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          title="Pista anterior"
          aria-label="Pista anterior"
        >
          <SkipBack size={16} />
        </button>
      )}

      {onPlayPause && (
        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold transition-all active:scale-90 shadow-lg"
          style={{ backgroundColor: activeColor }}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      )}

      {onSkipForward && (
        <button
          onClick={onSkipForward}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          title="Siguiente pista"
          aria-label="Siguiente pista"
        >
          <SkipForward size={16} />
        </button>
      )}
    </div>
  );
};

export default FullscreenControls;
