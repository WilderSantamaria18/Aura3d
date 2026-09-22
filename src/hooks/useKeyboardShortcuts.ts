import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';
import { useRecorderStore } from '../store/recorderStore';
import { useAudioEngine } from './useAudioEngine';
import { useSpotifyPlayer } from './useSpotifyPlayer';

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
          const nextTime = Math.min(duration || 300, currentTime + 5);
          if (isSpotifyConnected) {
            spotifySeek(nextTime * 1000);
          } else {
            engineSeek(nextTime);
            setCurrentTime(nextTime);
          }
          break;
        }

        case 'SEEK_BACKWARD': {
          const prevTime = Math.max(0, currentTime - 5);
          if (isSpotifyConnected) {
            spotifySeek(prevTime * 1000);
          } else {
            engineSeek(prevTime);
            setCurrentTime(prevTime);
          }
          break;
        }

        case 'VOLUME_UP': {
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.max(0, Math.min(1, Math.round((currentVol + 0.05) * 100) / 100));
          usePlayerStore.getState().setVolume(newVol);
          break;
        }

        case 'VOLUME_DOWN': {
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.max(0, Math.min(1, Math.round((currentVol - 0.05) * 100) / 100));
          usePlayerStore.getState().setVolume(newVol);
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

        case 'TOGGLE_AIR_INSTRUMENTS': {
          const store = usePlayerStore.getState();
          const next = !store.isAirInstrumentsActive;
          store.setAirInstrumentsActive(next);
          if (next && !store.vrMode) {
            store.setVrTrackingMode('hands');
            store.setVrMode(true);
          }
          break;
        }

        case 'CLOSE_MODAL':
          setShortcutsModalOpen(false);
          useRecorderStore.getState().closeModal();
          setEqualizerOpen(false);
          setCommandPaletteOpen(false);
          setLyricsOpen(false);
          usePlayerStore.getState().setVisualizerSettingsOpen?.(false);
          usePlayerStore.getState().setBlobPanelOpen?.(false);
          usePlayerStore.getState().setAdminModalOpen?.(false);
          usePlayerStore.getState().setSidebarOpen?.(false);
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
      // 0. Avoid responding if another event handler already consumed it
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. Escape: MUST close active modal even if focus is currently in an input (e.g. Help search)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isInput) {
          target.blur();
        }
        dispatchAction('CLOSE_MODAL');
        return;
      }

      // 2. Strict input guard: NEVER trigger studio shortcuts when typing in inputs/textareas
      if (isInput) {
        return;
      }

      // 3. Special single-key shortcuts
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        dispatchAction('OPEN_HELP');
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        dispatchAction('TOGGLE_PLAY');
        return;
      }

      // 4. Modifier combinations
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

      // 5. Arrow navigation & volume without Cmd/Ctrl
      if (!isCmdOrCtrl && !e.altKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          dispatchAction('SEEK_FORWARD');
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          dispatchAction('SEEK_BACKWARD');
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          dispatchAction('VOLUME_UP');
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          dispatchAction('VOLUME_DOWN');
          return;
        }
      }

      // 6. Single letter hotkeys (without modifiers)
      if (!isCmdOrCtrl && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            dispatchAction('OPEN_HELP');
            break;
          case 'i':
            e.preventDefault();
            dispatchAction('TOGGLE_AIR_INSTRUMENTS');
            break;
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
