import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useAudioEngine } from './useAudioEngine';
import { useSpotifyPlayer } from './useSpotifyPlayer';
import type { VisualizerMode, VisualizerShape } from '../types/audio';

const SPHERE_SHAPES: VisualizerShape[] = [
  'sphere',
  'rings',
  'torus',
  'cloud',
  'spikes',
  'wave',
];

const VISUALIZER_MODES: VisualizerMode[] = ['sphere', 'blob', 'party', 'synthwave'];

/**
 * useStudioKeyboardShortcuts
 * Hook global de atajos de teclado para Aura3D.
 * Proporciona control táctil de nivel de estudio sin competir con entradas de texto.
 */
export const useStudioKeyboardShortcuts = () => {
  const {
    visualizerMode,
    setVisualizerMode,
    setSphereShape,
    isEqualizerOpen,
    setEqualizerOpen,
    isLyricsOpen,
    setLyricsOpen,
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    isBlobPanelOpen,
    setBlobPanelOpen,
    isAdminModalOpen,
    setAdminModalOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    isPresetsModalOpen,
    setPresetsModalOpen,
    togglePresetsModal,
    volume,
    setVolume,
    toggleMute,
    currentTime,
    duration,
    setCurrentTime,
    isSpotifyConnected,
    isAirInstrumentsActive,
    setAirInstrumentsActive,
    vrMode,
    setVrMode,
    setVrTrackingMode,
  } = usePlayerStore();

  const { togglePlayPause: engineTogglePlayPause, seek: engineSeek } = useAudioEngine();
  const { togglePlayPause: spotifyTogglePlayPause, seek: spotifySeek } = useSpotifyPlayer();

  const handlePlayPause = useCallback(() => {
    if (isSpotifyConnected) {
      spotifyTogglePlayPause();
    } else {
      engineTogglePlayPause();
    }
  }, [isSpotifyConnected, spotifyTogglePlayPause, engineTogglePlayPause]);

  const handleSeekDelta = useCallback(
    (deltaSec: number) => {
      const targetTime = Math.max(0, Math.min(duration || 300, currentTime + deltaSec));
      if (isSpotifyConnected) {
        spotifySeek(targetTime * 1000);
      } else {
        engineSeek(targetTime);
      }
      setCurrentTime(targetTime);
    },
    [currentTime, duration, isSpotifyConnected, spotifySeek, engineSeek, setCurrentTime]
  );

  const handleVolumeDelta = useCallback(
    (delta: number) => {
      const newVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
      setVolume(newVol);
    },
    [volume, setVolume]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen policy errors
    }
  }, []);

  const cycleVisualizerMode = useCallback(() => {
    const currentIndex = VISUALIZER_MODES.indexOf(visualizerMode);
    const nextIndex = (currentIndex + 1) % VISUALIZER_MODES.length;
    setVisualizerMode(VISUALIZER_MODES[nextIndex]);
  }, [visualizerMode, setVisualizerMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Never intercept when user is typing in form controls
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        // Only allow Escape to blur
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // 2. Escape: Close any open modal in order of depth
      if (e.key === 'Escape') {
        if (isPresetsModalOpen) {
          e.preventDefault();
          setPresetsModalOpen(false);
          return;
        }
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
        if (isVisualizerSettingsOpen) {
          e.preventDefault();
          setVisualizerSettingsOpen(false);
          return;
        }
        if (isEqualizerOpen) {
          e.preventDefault();
          setEqualizerOpen(false);
          return;
        }
        if (isBlobPanelOpen) {
          e.preventDefault();
          setBlobPanelOpen(false);
          return;
        }
        if (isAdminModalOpen) {
          e.preventDefault();
          setAdminModalOpen(false);
          return;
        }
        if (isLyricsOpen) {
          e.preventDefault();
          setLyricsOpen(false);
          return;
        }
        return;
      }

      // 3. Modifiers check: Ignore combinations with Alt / Meta / Ctrl (except Shift + ? / H)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 4. Studio Hotkeys Mapping
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;

        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;

        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'KeyE':
          e.preventDefault();
          setEqualizerOpen(!isEqualizerOpen);
          break;

        case 'KeyL':
          e.preventDefault();
          setLyricsOpen(!isLyricsOpen);
          break;

        case 'KeyV':
          e.preventDefault();
          cycleVisualizerMode();
          break;

        case 'KeyH':
          e.preventDefault();
          toggleShortcutsModal();
          break;

        case 'KeyP':
          e.preventDefault();
          togglePresetsModal();
          break;

        case 'KeyI': {
          e.preventDefault();
          const next = !isAirInstrumentsActive;
          setAirInstrumentsActive(next);
          if (next && !vrMode) {
            setVrTrackingMode('hands');
            setVrMode(true);
          }
          break;
        }

        case 'Slash':
          // '?' key is Shift + Slash on standard keyboards
          if (e.shiftKey || e.key === '?') {
            e.preventDefault();
            toggleShortcutsModal();
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          handleSeekDelta(-5);
          break;

        case 'ArrowRight':
          e.preventDefault();
          handleSeekDelta(5);
          break;

        case 'ArrowUp':
          e.preventDefault();
          handleVolumeDelta(0.05);
          break;

        case 'ArrowDown':
          e.preventDefault();
          handleVolumeDelta(-0.05);
          break;

        // Numeric keys 1-6: Direct 3D geometry selection
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6': {
          e.preventDefault();
          const shapeIndex = parseInt(e.key, 10) - 1;
          if (shapeIndex >= 0 && shapeIndex < SPHERE_SHAPES.length) {
            setSphereShape(SPHERE_SHAPES[shapeIndex]);
            if (visualizerMode !== 'sphere') {
              setVisualizerMode('sphere');
            }
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    toggleMute,
    toggleFullscreen,
    handleSeekDelta,
    handleVolumeDelta,
    cycleVisualizerMode,
    isEqualizerOpen,
    setEqualizerOpen,
    isLyricsOpen,
    setLyricsOpen,
    isVisualizerSettingsOpen,
    setVisualizerSettingsOpen,
    isBlobPanelOpen,
    setBlobPanelOpen,
    isAdminModalOpen,
    setAdminModalOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    setSphereShape,
    visualizerMode,
    setVisualizerMode,
    isAirInstrumentsActive,
    setAirInstrumentsActive,
    vrMode,
    setVrMode,
    setVrTrackingMode,
  ]);
};
