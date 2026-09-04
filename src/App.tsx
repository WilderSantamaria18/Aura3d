import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SceneContainer } from './components/3D/SceneContainer';
import { RainbowBlobVisualizer } from './components/Visualizers/RainbowBlobVisualizer';
import { PartyVisualizer } from './components/Visualizers/PartyVisualizer';
import { LandingScreen } from './components/Landing/LandingScreen';
import { HeaderBar } from './components/UI/HeaderBar';
import { NowPlayingPanel } from './components/Player/NowPlayingPanel';
import { VisualizerQuickControls } from './components/UI/VisualizerQuickControls';
import { Controls } from './components/Player/Controls';
import { ProgressBar } from './components/Player/ProgressBar';
import { LyricsOverlay } from './components/Lyrics/LyricsOverlay';
import { EqualizerModal } from './components/UI/EqualizerModal';
import { PlaylistSidebar } from './components/UI/PlaylistSidebar';
import { MiniPlayer } from './components/Player/MiniPlayer';
import { PoseTracker } from './components/VR/PoseTracker';
import { GamificationHUD } from './components/Gamification/GamificationHUD';
import { AdminModal } from './components/Admin/AdminModal';
import { useAudioEngine } from './hooks/useAudioEngine';
import { usePlayerStore } from './stores/playerStore';
import { DEFAULT_DARK_THEME } from './types/audio';
import { AlertCircle, UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  const { loadFile, error } = useAudioEngine();
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const vrMode = usePlayerStore((s) => s.vrMode);
  const isEqualizerOpen = usePlayerStore((s) => s.isEqualizerOpen);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const isSidebarOpen = usePlayerStore((s) => s.isSidebarOpen);
  const isKaraokeFullscreen = usePlayerStore((s) => s.isKaraokeFullscreen);

  const [isUiIdle, setIsUiIdle] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  // Reset idle timer on any user interaction
  const resetIdleTimer = useCallback(() => {
    setIsUiIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Only auto-hide if in player mode and no modal / menu / VR is active
    if (
      hasStarted &&
      !isEqualizerOpen &&
      !isLyricsOpen &&
      !isSidebarOpen &&
      !isKaraokeFullscreen &&
      !vrMode
    ) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsUiIdle(true);
      }, 4500);
    }
  }, [hasStarted, isEqualizerOpen, isLyricsOpen, isSidebarOpen, isKaraokeFullscreen, vrMode]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    events.forEach((ev) => window.addEventListener(ev, handleActivity));
    resetIdleTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Global Drag and Drop files onto window
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);

      if (e.dataTransfer?.files) {
        const files = Array.from(e.dataTransfer.files).filter(
          (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac)$/i.test(f.name)
        );
        if (files.length > 0) {
          loadFile(files[0]);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadFile]);

  const rootRef = useRef<HTMLDivElement>(null);

  // ResizeObserver on root container to trigger canvas resize on orientation & fullscreen changes
  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    observer.observe(rootRef.current);
    const handleFullscreen = () => {
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, []);

  const activeTheme = isLucid ? lucidTheme : DEFAULT_DARK_THEME;

  return (
    <div
      ref={rootRef}
      className={`relative w-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden select-none font-sans transition-all duration-700 ${
        isLucid ? 'lucid-mode' : ''
      } ${isUiIdle && hasStarted ? 'cursor-none' : ''}`}
      style={{
        '--lucid-primary': activeTheme.primary,
        '--lucid-secondary': activeTheme.secondary,
        '--lucid-glow': activeTheme.glow,
        '--lucid-glass': activeTheme.glassColor,
        '--lucid-border': activeTheme.borderColor,
        '--lucid-text': activeTheme.textColor,
        '--lucid-bg': activeTheme.bgGradient,
        background: isLucid ? activeTheme.bgGradient : '#04060d',
        boxShadow: isLucid ? `inset 0 0 120px ${activeTheme.glow}` : undefined,
      } as React.CSSProperties}
    >
      {/* 1. Initial Landing Screen */}
      <div
        className={`absolute inset-0 z-50 transition-all duration-700 ease-in-out ${
          hasStarted
            ? 'opacity-0 pointer-events-none scale-105 blur-sm'
            : 'opacity-100 pointer-events-auto scale-100 blur-0'
        }`}
      >
        <LandingScreen />
      </div>

      {/* 2. Visualizer in Fullscreen Center (Active when started: Sphere, Blob, or Party) */}
      <div
        className={`absolute inset-0 w-full h-full min-h-[55dvh] transition-opacity duration-700 ${
          hasStarted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {visualizerMode === 'sphere' ? (
          <SceneContainer />
        ) : visualizerMode === 'blob' ? (
          <RainbowBlobVisualizer />
        ) : (
          <PartyVisualizer />
        )}
      </div>

      {/* 3. Floating Header UI */}
      {hasStarted && (
        <div
          className={`transition-all duration-700 pointer-events-none ${
            isUiIdle ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <HeaderBar />
        </div>
      )}

      {/* 4. Now Playing Side Card */}
      {hasStarted && (
        <div
          className={`transition-all duration-700 ${
            isUiIdle ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
          }`}
        >
          <NowPlayingPanel />
        </div>
      )}

      {/* 5. Floating Bottom Player & Quick Visualizer Controls */}
      {hasStarted && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 p-2 sm:p-4 md:p-5 transition-all duration-700 pointer-events-none flex flex-col items-center gap-1.5 sm:gap-2.5 ${
            isUiIdle ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Quick Visualizer Adjustments (Shape, Auto Mode, Radius, Opacity, FFT Bars) */}
          <div className="pointer-events-auto max-w-full overflow-x-auto px-1">
            <VisualizerQuickControls />
          </div>

          {/* Main Glassmorphic Player Bar */}
          <div
            className={`w-[clamp(320px,94vw,900px)] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-2xl flex flex-col gap-2 sm:gap-3 pointer-events-auto transition-all duration-500 ${
              isLucid ? 'lucid-panel' : 'bg-[#090e1c]/85 backdrop-blur-2xl border border-white/10'
            }`}
            style={
              isLucid
                ? {
                    backgroundColor: lucidTheme.glassColor,
                    borderColor: lucidTheme.borderColor,
                    boxShadow: `0 0 35px ${lucidTheme.glow}, 0 20px 50px rgba(0,0,0,0.9)`,
                  }
                : undefined
            }
          >
            <ProgressBar />
            <Controls />
          </div>
        </div>
      )}

      {/* 6. Full-Body VR Dance & Pose Tracker Camera Card */}
      {hasStarted && <PoseTracker />}

      {/* 7. Real-Time Gamification & Intensity Score HUD */}
      {hasStarted && <GamificationHUD />}

      {/* Error Notification */}
      {error && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 shadow-xl backdrop-blur-xl animate-bounce">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overlays & Modals */}
      <LyricsOverlay />
      <EqualizerModal />
      <PlaylistSidebar />
      <AdminModal />

      {/* Mini Player — right-side floating panel for local files */}
      {hasStarted && <MiniPlayer />}


      {/* Global Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none animate-pulse">
          <UploadCloud className="w-16 h-16 text-cyan-300 mb-4 animate-bounce" />
          <h2 className="text-2xl font-light text-white tracking-widest uppercase">
            Suelta tu audio aquí
          </h2>
          <p className="text-cyan-200/60 text-xs tracking-wider uppercase mt-2">
            MP3, WAV, FLAC, OGG
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
