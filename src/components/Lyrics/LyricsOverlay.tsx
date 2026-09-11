import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  } = usePlayerStore();

  const { lyricsData } = useLyrics();
  const { seek } = useAudioEngine();
  const { seek: spotifySeek } = useSpotifyPlayer();

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

      const newX = Math.max(16, Math.min(window.innerWidth - 320, dragStartRef.current.elemX + dx));
      const newY = Math.max(16, Math.min(window.innerHeight - 200, dragStartRef.current.elemY + dy));

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

  // Resolve layout classes and inline styles
  let containerClasses = 'fixed z-40 pointer-events-auto transition-[box-shadow,border-color,background] duration-300';
  let containerStyle: React.CSSProperties = {};

  if (isFullscreenActive) {
    containerClasses = 'fixed inset-0 z-50 p-4 sm:p-8 md:p-12 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl pointer-events-auto';
  } else if (position === 'custom' && coords) {
    containerStyle = {
      left: `${coords.x}px`,
      top: `${coords.y}px`,
      width: size === 'compact' ? '320px' : size === 'lateral' ? '440px' : '390px',
      height: size === 'compact' ? '400px' : size === 'lateral' ? 'calc(100vh - 8rem)' : '520px',
      maxWidth: 'calc(100vw - 2rem)',
      maxHeight: 'calc(100vh - 4rem)',
    };
  } else {
    // Preset docking positions
    switch (position) {
      case 'dock-left':
        containerClasses += ' top-14 left-4 sm:left-6';
        containerStyle = {
          width: size === 'compact' ? '320px' : size === 'lateral' ? '440px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 8.5rem)' : size === 'compact' ? '400px' : '520px',
          maxWidth: 'calc(100vw - 2rem)',
        };
        break;
      case 'dock-right':
        containerClasses += ' top-14 right-4 sm:right-6';
        containerStyle = {
          width: size === 'compact' ? '320px' : size === 'lateral' ? '440px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 8.5rem)' : size === 'compact' ? '400px' : '520px',
          maxWidth: 'calc(100vw - 2rem)',
        };
        break;
      case 'center':
        containerClasses += ' top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        containerStyle = {
          width: size === 'compact' ? '320px' : size === 'lateral' ? '460px' : '420px',
          height: size === 'compact' ? '420px' : size === 'lateral' ? 'calc(100vh - 8rem)' : '540px',
          maxWidth: 'calc(100vw - 2rem)',
        };
        break;
      case 'bottom-right':
      default:
        containerClasses += ' bottom-28 right-4 sm:right-6';
        containerStyle = {
          width: size === 'compact' ? '320px' : size === 'lateral' ? '440px' : '390px',
          height: size === 'lateral' ? 'calc(100vh - 11rem)' : size === 'compact' ? '400px' : '520px',
          maxWidth: 'calc(100vw - 2rem)',
        };
        break;
    }
  }

  return (
    <div
      ref={panelRef}
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
      />
    </div>
  );
};

export default LyricsOverlay;
