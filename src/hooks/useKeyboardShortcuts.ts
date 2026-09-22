import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useRecorderStore } from '../store/recorderStore';
import { useAudioEngine } from './useAudioEngine';
import { useSpotifyPlayer } from './useSpotifyPlayer';
import { KEYBOARD_SHORTCUTS } from '../config/keyboardShortcuts';

export const useKeyboardShortcuts = () => {
  const {
    visualizerMode,
    setVisualizerMode,
    isEqualizerOpen,
    setEqualizerOpen,
    isLyricsOpen,
    setLyricsOpen,
    isSidebarOpen,
    setSidebarOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    setCommandPaletteOpen,
    isLucid,
    setIsLucid,
    autoMode,
    setAutoMode,
    toggleMute,
    currentTime,
    duration,
    setCurrentTime,
    isSpotifyConnected,
  } = usePlayerStore();

  const { togglePlayPause: engineTogglePlayPause, seek: engineSeek, playNext: engineNext, playPrevious: enginePrev } = useAudioEngine();
  const { togglePlayPause: spotifyTogglePlayPause, seek: spotifySeek, playNext: spotifyNext, playPrevious: spotifyPrev } = useSpotifyPlayer();

  const dispatchAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'TOGGLE_PLAY':
          if (isSpotifyConnected) spotifyTogglePlayPause();
          else engineTogglePlayPause();
          break;

        case 'NEXT_TRACK':
          if (isSpotifyConnected) spotifyNext();
          else engineNext();
          break;

        case 'PREV_TRACK':
          if (isSpotifyConnected) spotifyPrev();
          else enginePrev();
          break;

        case 'SEEK_FORWARD': {
          const nextTime = Math.min(duration || 0, currentTime + 5);
          if (isSpotifyConnected) spotifySeek(nextTime);
          else {
            engineSeek(nextTime);
            setCurrentTime(nextTime);
          }
          break;
        }

        case 'SEEK_BACKWARD': {
          const prevTime = Math.max(0, currentTime - 5);
          if (isSpotifyConnected) spotifySeek(prevTime);
          else {
            engineSeek(prevTime);
            setCurrentTime(prevTime);
          }
          break;
        }

        case 'TOGGLE_MUTE':
          toggleMute();
          break;

        case 'CYCLE_VISUALIZER': {
          const modes = ['blob', 'synthwave', 'warp', 'terrain'] as const;
          const currentIdx = modes.indexOf(visualizerMode as any);
          const nextMode = modes[(currentIdx + 1) % modes.length];
          setVisualizerMode(nextMode);
          break;
        }

        case 'TOGGLE_FULLSCREEN':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
          break;

        case 'TOGGLE_LYRICS':
          setLyricsOpen(!isLyricsOpen);
          break;

        case 'OPEN_COMMAND_PALETTE':
          setCommandPaletteOpen(true);
          break;

        case 'TOGGLE_SIDEBAR':
          setSidebarOpen(!isSidebarOpen);
          break;

        case 'OPEN_HELP':
          toggleShortcutsModal();
          break;

        case 'CLOSE_MODAL':
          setShortcutsModalOpen(false);
          useRecorderStore.getState().closeModal();
          setEqualizerOpen(false);
          setCommandPaletteOpen(false);
          break;

        case 'OPEN_RECORDER':
          useRecorderStore.getState().openModal('record');
          break;

        case 'OPEN_CARD_EDITOR':
          useRecorderStore.getState().openModal('cards');
          break;

        case 'TOGGLE_EQUALIZER':
          setEqualizerOpen(!isEqualizerOpen);
          break;

        case 'TOGGLE_AI_MODE':
          setAutoMode(!autoMode);
          break;

        case 'TOGGLE_LUCID':
          setIsLucid(!isLucid);
          break;

        default:
          break;
      }
    },
    [
      isSpotifyConnected,
      spotifyTogglePlayPause,
      engineTogglePlayPause,
      spotifyNext,
      engineNext,
      spotifyPrev,
      enginePrev,
      duration,
      currentTime,
      spotifySeek,
      engineSeek,
      setCurrentTime,
      toggleMute,
      visualizerMode,
      setVisualizerMode,
      isLyricsOpen,
      setLyricsOpen,
      setCommandPaletteOpen,
      isSidebarOpen,
      setSidebarOpen,
      toggleShortcutsModal,
      setShortcutsModalOpen,
      setEqualizerOpen,
      isEqualizerOpen,
      autoMode,
      setAutoMode,
      isLucid,
      setIsLucid,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Strict guard: never trigger shortcuts while focused on inputs or text fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 2. Special single-key shortcuts
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        dispatchAction('OPEN_HELP');
        return;
      }

      if (e.key === 'Escape') {
        dispatchAction('CLOSE_MODAL');
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        dispatchAction('TOGGLE_PLAY');
        return;
      }

      // 3. Modifier combinations
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatchAction('OPEN_COMMAND_PALETTE');
        return;
      }

      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        dispatchAction('OPEN_CARD_EDITOR');
        return;
      }

      if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        dispatchAction('TOGGLE_AI_MODE');
        return;
      }

      if (isCmdOrCtrl && e.key === 'ArrowRight') {
        e.preventDefault();
        dispatchAction('NEXT_TRACK');
        return;
      }

      if (isCmdOrCtrl && e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatchAction('PREV_TRACK');
        return;
      }

      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        dispatchAction('SEEK_FORWARD');
        return;
      }

      if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatchAction('SEEK_BACKWARD');
        return;
      }

      // 4. Single letter hotkeys (without modifiers)
      if (!isCmdOrCtrl && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            dispatchAction('TOGGLE_SIDEBAR');
            break;
          case 'v':
            e.preventDefault();
            dispatchAction('CYCLE_VISUALIZER');
            break;
          case 'f':
            e.preventDefault();
            dispatchAction('TOGGLE_FULLSCREEN');
            break;
          case 'l':
            e.preventDefault();
            dispatchAction('TOGGLE_LYRICS');
            break;
          case 'm':
            e.preventDefault();
            dispatchAction('TOGGLE_MUTE');
            break;
          case 'r':
            e.preventDefault();
            dispatchAction('OPEN_RECORDER');
            break;
          case 'e':
            e.preventDefault();
            dispatchAction('TOGGLE_EQUALIZER');
            break;
          case 'u':
            e.preventDefault();
            dispatchAction('TOGGLE_LUCID');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchAction]);
};
