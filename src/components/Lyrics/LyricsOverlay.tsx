import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlignLeft, Maximize2, Mic } from 'lucide-react';
import { LyricsPanel } from './LyricsPanel';
import { useLyrics } from '../../hooks/useLyrics';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';

export type LyricsPosition = 'dock-right' | 'dock-left' | 'bottom-right' | 'center' | 'custom';
export type LyricsSize = 'compact' | 'standard' | 'lateral' | 'fullscreen';

export const LyricsOverlay: React.FC = () => {
  const {
    isLyricsOpen,
    setLyricsOpen,
    isKaraokeFullscreen,
    toggleKaraokeFullscreen,
    currentTrack,
    isPlaying,
    currentTime,
    isSpotifyConnected,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { lyricsData, activeLineIndex, loadLrcFile } = useLyrics();
  const { seek } = useAudioEngine();
  const { seek: spotifySeek } = useSpotifyPlayer();

  const activeColor = isLucid ? (lucidTheme?.primary || '#00f0ff') : '#00f0ff';

  // Position & Size state with localStorage persistence
  const [position, setPosition] = useState<LyricsPosition>(() => {
    try {
      return (localStorage.getItem('aura3d_lyrics_pos') as LyricsPosition) || 'dock-right';
    } catch {
      return 'dock-right';
    }
  });

  const [size, setSize] = useState<LyricsSize>(() => {
    try {
      return (localStorage.getItem('aura3d_lyrics_size') as LyricsSize) || 'standard';
    } catch {
      return 'standard';
    }
  });

  // Zen mode state for lyrics micro-pill
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Custom mouse drag coordinates
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('aura3d_lyrics_coords');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
    mouseX: 0,
    mouseY: 0,
    elemX: 0,
    elemY: 0,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen toggle with size preset
  const isFullscreenActive = isKaraokeFullscreen || size === 'fullscreen';

  const handlePositionChange = (newPos: LyricsPosition) => {
    setPosition(newPos);
    if (newPos !== 'custom') {
      setCoords(null);
      try {
        localStorage.removeItem('aura3d_lyrics_coords');
      } catch {}
    }
    try {
      localStorage.setItem('aura3d_lyrics_pos', newPos);
    } catch {}
  };

  const handleSizeChange = (newSize: LyricsSize) => {
    setSize(newSize);
    if (newSize === 'fullscreen') {
      if (!isKaraokeFullscreen) toggleKaraokeFullscreen();
    } else {
      if (isKaraokeFullscreen) toggleKaraokeFullscreen();
    }
    try {
      localStorage.setItem('aura3d_lyrics_size', newSize);
    } catch {}
  };

  // Mouse Drag Handler
  const handleDragStart = (e: React.MouseEvent) => {
    if (isFullscreenActive) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: rect.left,
      elemY: rect.top,
    };
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(16, Math.min(window.innerWidth - 340, dragStartRef.current.elemX + dx));
      const newY = Math.max(16, Math.min(window.innerHeight - 240, dragStartRef.current.elemY + dy));

      const newCoords = { x: newX, y: newY };
      setCoords(newCoords);
      setPosition('custom');
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (coords) {
        try {
          localStorage.setItem('aura3d_lyrics_coords', JSON.stringify(coords));
          localStorage.setItem('aura3d_lyrics_pos', 'custom');
        } catch {}
      }
    }
  }, [isDragging, coords]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isLyricsOpen && !isKaraokeFullscreen) return null;

  // Active lyric line text snippet for the Zen Micro-Pill
  const currentActiveLyricText =
    activeLineIndex >= 0 && lyricsData.lines[activeLineIndex]
      ? lyricsData.lines[activeLineIndex].text
      : '';

  // Resolve layout classes and inline styles
  let containerClasses =
    'fixed z-40 pointer-events-auto transition-[box-shadow,border-color,background] duration-300';
  let containerStyle: React.CSSProperties = {};

  if (isFullscreenActive) {
    containerClasses = 'fixed inset-0 z-50 pointer-events-auto';
  } else if (position === 'custom' && coords) {
    containerStyle = {
      left: `${coords.x}px`,
      top: `${coords.y}px`,
      width: size === 'compact' ? '330px' : size === 'lateral' ? '460px' : '390px',
      height: size === 'compact' ? '440px' : size === 'lateral' ? 'calc(100vh - 7.5rem)' : '520px',
      maxWidth: 'calc(100vw - 1.5rem)',
      maxHeight: 'calc(100vh - 6rem)',
    };
  } else {
    switch (position) {
      case 'dock-left':
        containerClasses += ' top-16 sm:top-18 left-3 sm:left-6 max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto max-sm:max-w-[390px] max-sm:mx-auto';
        containerStyle = {
          width: size === 'compact' ? '330px' : size === 'lateral' ? '460px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 7.5rem)' : size === 'compact' ? '440px' : '520px',
          maxWidth: 'calc(100vw - 1.5rem)',
          maxHeight: 'calc(100vh - 8.5rem)',
        };
        break;
      case 'dock-right':
      default:
        containerClasses += ' top-16 sm:top-18 right-3 sm:right-6 max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto max-sm:max-w-[390px] max-sm:mx-auto';
        containerStyle = {
          width: size === 'compact' ? '330px' : size === 'lateral' ? '460px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 7.5rem)' : size === 'compact' ? '440px' : '520px',
          maxWidth: 'calc(100vw - 1.5rem)',
          maxHeight: 'calc(100vh - 8.5rem)',
        };
        break;
      case 'center':
        containerClasses += ' top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-sm:inset-x-3 max-sm:top-1/2 max-sm:-translate-y-1/2 max-sm:translate-x-0 max-sm:w-auto max-sm:max-w-[390px] max-sm:mx-auto';
        containerStyle = {
          width: size === 'compact' ? '340px' : size === 'lateral' ? '480px' : '410px',
          height: size === 'compact' ? '450px' : size === 'lateral' ? 'calc(100vh - 7rem)' : '540px',
          maxWidth: 'calc(100vw - 1.5rem)',
          maxHeight: 'calc(100vh - 8.5rem)',
        };
        break;
      case 'bottom-right':
        containerClasses += ' bottom-24 right-3 sm:right-6 max-sm:inset-x-3 max-sm:bottom-24 max-sm:w-auto max-sm:max-w-[390px] max-sm:mx-auto';
        containerStyle = {
          width: size === 'compact' ? '330px' : size === 'lateral' ? '460px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 9rem)' : size === 'compact' ? '440px' : '520px',
          maxWidth: 'calc(100vw - 1.5rem)',
          maxHeight: 'calc(100vh - 10rem)',
        };
        break;
    }
  }

  return (
    <>
      {/* ── Zen Micro-Pill Floating Anchor (Rendered when minimized) ── */}
      <AnimatePresence>
        {isZenMode && !isFullscreenActive && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.9, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none"
          >
            <div
              onClick={() => setIsZenMode(false)}
              className="group flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#090a0f]/85 backdrop-blur-3xl saturate-[190%] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_24px_rgba(0,240,255,0.25)] hover:scale-105 cursor-pointer transition-all"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-[0_0_10px_#00f0ff]"
                style={{
                  backgroundColor: `${activeColor}25`,
                  color: activeColor,
                }}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </div>

              <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[260px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-tight truncate">
                    {currentTrack?.title || 'Resonance Wave'}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-ping"
                    style={{ backgroundColor: activeColor }}
                  />
                </div>
                <span className="text-[11px] font-mono text-cyan-300 truncate">
                  "{currentActiveLyricText || 'Sincronizando letra en vivo...'}"
                </span>
              </div>

              <div className="flex items-center gap-1 pl-2 border-l border-white/15">
                <span className="w-1 h-3 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-1 h-5 rounded-full bg-cyan-300 animate-pulse" />
                <span className="w-1 h-2 rounded-full bg-purple-400 animate-pulse" />
              </div>

              <Maximize2 className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Floating Liquid Glass Window & Fullscreen Portal ── */}
      <AnimatePresence>
        {(!isZenMode || isFullscreenActive) && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.94, filter: 'blur(12px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={containerClasses}
            style={containerStyle}
          >
            <LyricsPanel
              lyrics={lyricsData.lines.map((l) => ({ time: l.time, text: l.text }))}
              currentTime={currentTime}
              isPlaying={isPlaying}
              title={currentTrack?.title || 'Sin título'}
              artist={currentTrack?.artist || 'Artista desconocido'}
              position={position}
              size={size}
              isFullscreen={isFullscreenActive}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onDragStart={handleDragStart}
              onToggleFullscreen={() => {
                if (isFullscreenActive) {
                  handleSizeChange('standard');
                } else {
                  handleSizeChange('fullscreen');
                }
              }}
              onToggleZenMode={() => setIsZenMode(true)}
              onSeek={(time) => {
                if (isSpotifyConnected) {
                  spotifySeek(Math.round(time * 1000));
                } else {
                  seek(time);
                }
              }}
              onClose={() => {
                setLyricsOpen(false);
                if (isKaraokeFullscreen) toggleKaraokeFullscreen();
              }}
              onUploadLRC={loadLrcFile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LyricsOverlay;
