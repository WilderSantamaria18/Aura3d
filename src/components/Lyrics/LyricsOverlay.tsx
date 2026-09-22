import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LyricsPanel } from './LyricsPanel';
import { useLyrics } from '../../hooks/useLyrics';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { KawarpBackground } from './KawarpBackground';
import { CollapsedLyricsPill } from './CollapsedLyricsPill';
import { extractDominantColor } from '../../services/colorExtractor';

export type LyricsPosition = 'dock-right' | 'dock-left' | 'bottom-right' | 'center' | 'custom';
export type LyricsSize = 'compact' | 'standard' | 'lateral' | 'fullscreen';
export type PanelState = 'hidden' | 'collapsed' | 'expanded';

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
    lyricsPanelState,
    setLyricsPanelState,
  } = usePlayerStore();

  const { lyricsData, loadLrcFile, isLoading } = useLyrics();
  const {
    seek,
    togglePlayPause: engineTogglePlayPause,
    playNext: enginePlayNext,
    playPrevious: enginePlayPrevious,
  } = useAudioEngine();
  const {
    seek: spotifySeek,
    togglePlayPause: spotifyTogglePlayPause,
    playNext: spotifyPlayNext,
    playPrevious: spotifyPlayPrevious,
  } = useSpotifyPlayer();

  const handlePlayPause = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyTogglePlayPause();
    } else {
      engineTogglePlayPause();
    }
  }, [isSpotifyConnected, spotifyTogglePlayPause, engineTogglePlayPause]);

  const handleSkipNext = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyPlayNext();
    } else {
      enginePlayNext();
    }
  }, [isSpotifyConnected, spotifyPlayNext, enginePlayNext]);

  const handleSkipPrev = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyPlayPrevious();
    } else {
      enginePlayPrevious();
    }
  }, [isSpotifyConnected, spotifyPlayPrevious, enginePlayPrevious]);

  const activeColor = isLucid ? (lucidTheme?.primary || '#00f0ff') : '#00f0ff';

  // ── Dynamic accent color from cover art ─────────────────────────────────
  const [kawarpColors, setKawarpColors] = useState({ primary: activeColor, secondary: '#a855f7' });
  const lastCoverRef = useRef<string | null>(null);

  useEffect(() => {
    const cover = currentTrack?.coverUrl;
    if (!cover || cover === lastCoverRef.current) return;
    lastCoverRef.current = cover;
    extractDominantColor(cover).then((colors) => {
      setKawarpColors(colors);
    });
  }, [currentTrack?.coverUrl]);

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

  // Panel state: 'hidden' | 'collapsed' | 'expanded'
  const panelState = lyricsPanelState || (isLyricsOpen ? 'expanded' : 'hidden');
  const setPanelState = setLyricsPanelState;

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

  if (panelState === 'hidden' && !isKaraokeFullscreen && !isLyricsOpen) return null;

  // Resolve layout classes and inline styles
  let containerClasses =
    'fixed z-40 pointer-events-auto transition-[box-shadow,border-color,background] duration-300';
  let containerStyle: React.CSSProperties = {};

  if (isFullscreenActive) {
    containerClasses = 'fixed inset-0 z-50 pointer-events-auto bg-black/25';
    containerStyle = {
      backdropFilter: 'blur(1px)',
      WebkitBackdropFilter: 'blur(1px)',
    };
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
      {/* ── KawarpBackground — dynamic reactive background in fullscreen ── */}
      <AnimatePresence>
        {isFullscreenActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <KawarpBackground
              primaryColor={kawarpColors.primary}
              secondaryColor={kawarpColors.secondary}
              visible={isFullscreenActive}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsed Lyrics Pill (rendered when minimized) ── */}
      <AnimatePresence>
        {panelState === 'collapsed' && !isFullscreenActive && (
          <CollapsedLyricsPill
            title={currentTrack?.title || 'Sin título'}
            isPlaying={isPlaying}
            activeColor={activeColor}
            onExpand={() => setPanelState('expanded')}
          />
        )}
      </AnimatePresence>

      {/* ── Main Floating Liquid Glass Window & Fullscreen Portal ── */}
      <AnimatePresence>
        {(panelState === 'expanded' || isFullscreenActive) && (
          <motion.div
            ref={panelRef}
            layoutId={isFullscreenActive ? undefined : 'lyrics-panel'}
            initial={isFullscreenActive ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: 'blur(16px)' }}
            animate={isFullscreenActive ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={isFullscreenActive ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: 'blur(12px)' }}
            transition={
              isFullscreenActive
                ? { duration: 0.25, ease: 'easeOut' }
                : { type: 'spring', damping: 28, stiffness: 260 }
            }
            className={containerClasses}
            style={containerStyle}
          >
            <LyricsPanel
              lyrics={lyricsData.lines}
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
              onToggleZenMode={() => setPanelState('collapsed')}
              onSeek={(time) => {
                if (isSpotifyConnected) {
                  spotifySeek(Math.round(time * 1000));
                } else {
                  seek(time);
                }
              }}
              onClose={() => {
                setLyricsOpen(false);
                setPanelState('hidden');
                if (isKaraokeFullscreen) toggleKaraokeFullscreen();
              }}
              onUploadLRC={loadLrcFile}
              coverUrl={currentTrack?.coverUrl}
              accentColor={kawarpColors.primary !== '#00f0ff' ? kawarpColors.primary : undefined}
              onPlayPause={handlePlayPause}
              onSkipBack={handleSkipPrev}
              onSkipForward={handleSkipNext}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LyricsOverlay;
