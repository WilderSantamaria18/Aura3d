import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { LandingScreen } from './components/Landing/LandingScreen';
import { HeaderBar } from './components/UI/HeaderBar';
import { VisualizerQuickControls } from './components/UI/VisualizerQuickControls';
import { Controls } from './components/Player/Controls';
import { ProgressBar } from './components/Player/ProgressBar';
import { MiniPlayer } from './components/Player/MiniPlayer';
import { AutoThemeProvider } from './components/Theme/AutoThemeProvider';
import { AutoModeToast } from './components/UI/AutoModeToast';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useAnalytics } from './hooks/useAnalytics';
import { useAutoPalette } from './hooks/useAutoPalette';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import { usePlayerStore } from './stores/playerStore';
import { DEFAULT_DARK_THEME } from './types/audio';
import { AlertCircle } from 'lucide-react';
import { UniversalDropZone } from './components/UI/UniversalDropZone';
import { useStudioKeyboardShortcuts } from './hooks/useStudioKeyboardShortcuts';
import { KeyboardShortcutsModal } from './components/UI/KeyboardShortcutsModal';
import { AirInstrumentControls } from './components/UI/AirInstrumentControls';
import { WebGLContextHandler } from './components/3D/WebGLContextHandler';
import { QuickstartStudioModal } from './components/UI/QuickstartStudioModal';
import { UserProfileModal } from './components/UI/UserProfileModal';
import { SystemRequirementsModal } from './components/UI/SystemRequirementsModal';


import { AtmosphereBackground } from './components/Visualizers/AtmosphereBackground';
import { Sliders } from 'lucide-react';

// Lazy-loaded visualizers & heavy modals for code-splitting (reduces initial bundle size)
const SceneContainer = lazy(() => import('./components/3D/SceneContainer'));
const RainbowBlobVisualizer = lazy(() => import('./components/Visualizers/RainbowBlobVisualizer'));
const SynthwaveGridVisualizer = lazy(() => import('./components/Visualizers/SynthwaveGridVisualizer'));
const PoseTracker = lazy(() => import('./components/VR/PoseTracker'));
const AdminModal = lazy(() => import('./components/Admin/AdminModal'));
const EqualizerModal = lazy(() => import('./components/UI/EqualizerModal'));
const PlaylistSidebar = lazy(() => import('./components/UI/PlaylistSidebar'));
const LyricsOverlay = lazy(() => import('./components/Lyrics/LyricsOverlay'));
const PresetsModal = lazy(() => import('./components/UI/PresetsModal'));

export const App: React.FC = () => {
  const { loadAudioFiles, error } = useAudioEngine();
  useSpotifyPlayer();
  useAnalytics();
  useAutoPalette();
  useStudioKeyboardShortcuts();
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const autoMode = usePlayerStore((s) => s.autoMode);
  const autoPalette = usePlayerStore((s) => s.autoPalette);
  const vrMode = usePlayerStore((s) => s.vrMode);
  const isEqualizerOpen = usePlayerStore((s) => s.isEqualizerOpen);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const isSidebarOpen = usePlayerStore((s) => s.isSidebarOpen);
  const isKaraokeFullscreen = usePlayerStore((s) => s.isKaraokeFullscreen);
  const isAdminModalOpen = usePlayerStore((s) => s.isAdminModalOpen);
  const isSysReqModalOpen = usePlayerStore((s) => s.isSysReqModalOpen);
  const setSysReqModalOpen = usePlayerStore((s) => s.setSysReqModalOpen);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const updateBlobSettings = usePlayerStore((s) => s.updateBlobSettings);

  const isUiIdle = usePlayerStore((s) => s.isUiIdle);
  const setIsUiIdle = usePlayerStore((s) => s.setIsUiIdle);
  const isUiHidden = blobSettings?.isUiHidden || false;
  const shouldHideUI = isUiIdle || isUiHidden;
  const [showLanding, setShowLanding] = useState(!hasStarted);
  const idleTimerRef = useRef<number | null>(null);

  // Lazy unmount landing screen after exit transition to free GPU memory
  useEffect(() => {
    if (hasStarted) {
      const timer = window.setTimeout(() => setShowLanding(false), 1100);
      return () => clearTimeout(timer);
    } else {
      setShowLanding(true);
    }
  }, [hasStarted]);

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
        background: isLucid
          ? activeTheme.bgGradient
          : autoMode
          ? autoPalette.bg
          : '#04060d',
        boxShadow: isLucid
          ? `inset 0 0 120px ${activeTheme.glow}`
          : autoMode
          ? `inset 0 0 120px ${autoPalette.glow}`
          : undefined,
      } as React.CSSProperties}
    >
      {/* 0. Full-Screen Atmosphere Canvas Background (only for visualizers, not on landing index) */}
      {hasStarted && <AtmosphereBackground />}

      {/* 0.1 Botón flotante para restaurar interfaz cuando está oculta en Modo Puro */}
      {isUiHidden && hasStarted && (
        <button
          type="button"
          onClick={() => updateBlobSettings({ isUiHidden: false })}
          className="fixed top-4 right-4 z-50 px-3 py-2 rounded-xl bg-[#090d18]/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-mono select-none"
          title="Restaurar interfaz y controles"
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Mostrar UI</span>
        </button>
      )}

      {/* 1. Initial Landing Screen (Smooth vertical scroll curtain transition) */}
      {showLanding && (
        <div
          className={`absolute inset-0 z-50 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hasStarted
              ? '-translate-y-full opacity-0 pointer-events-none scale-[0.98] blur-[2px]'
              : 'translate-y-0 opacity-100 pointer-events-auto scale-100 blur-0'
          }`}
        >
          <LandingScreen />
        </div>
      )}

      {/* 2. Visualizer in Fullscreen Center (Mounts only when user enters to preserve 100% GPU for landing) */}
      <div
        className={`absolute inset-0 w-full h-full min-h-[55dvh] z-10 pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasStarted ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {hasStarted && (
          <Suspense fallback={<div className="w-full h-full" />}>
            {visualizerMode === 'sphere' ? (
              <SceneContainer />
            ) : visualizerMode === 'blob' ? (
              <RainbowBlobVisualizer />
            ) : (
              <SynthwaveGridVisualizer />
            )}
          </Suspense>
        )}
      </div>

      {/* 3. Floating Header UI */}
      {hasStarted && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-700 ${
            shouldHideUI ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          <HeaderBar />
        </div>
      )}



      {/* 5. Floating Bottom Player & Quick Visualizer Controls */}
      {hasStarted && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 md:p-5 transition-all duration-700 pointer-events-none flex flex-col items-center gap-1.5 sm:gap-2.5 ${
            shouldHideUI ? 'opacity-0 translate-y-6 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Quick Visualizer Adjustments (Shape, Auto Mode, Radius, Opacity, FFT Bars) */}
          <div className="pointer-events-auto max-w-full overflow-x-auto px-1">
            <VisualizerQuickControls />
          </div>

          {/* Main Glassmorphic Player Bar */}
          <div
            className={`w-[clamp(320px,94vw,840px)] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col gap-2 pointer-events-auto transition-all duration-300 ${
              isLucid ? 'lucid-panel' : 'bg-[#060811]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            }`}
            style={
              isLucid
                ? {
                    backgroundColor: lucidTheme.glassColor,
                    borderColor: lucidTheme.borderColor,
                    boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 35px ${lucidTheme.glow}`,
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
      {hasStarted && vrMode && (
        <Suspense fallback={null}>
          <PoseTracker />
        </Suspense>
      )}



      {/* Error Notification */}
      {error && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 shadow-xl backdrop-blur-xl animate-bounce">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overlays & Modals */}
      {(isLyricsOpen || isKaraokeFullscreen) && (
        <Suspense fallback={null}>
          <LyricsOverlay />
        </Suspense>
      )}
      {isEqualizerOpen && (
        <Suspense fallback={null}>
          <EqualizerModal />
        </Suspense>
      )}
      {isSidebarOpen && (
        <Suspense fallback={null}>
          <PlaylistSidebar />
        </Suspense>
      )}
      {isAdminModalOpen && (
        <Suspense fallback={null}>
          <AdminModal />
        </Suspense>
      )}

      {/* Mini Player — panel flotante con visualización de video de YouTube integrada */}
      {hasStarted && <MiniPlayer />}

      {/* Keyboard Shortcuts Studio HUD */}
      <KeyboardShortcutsModal />

      {/* WebGL Context Loss Auto-Recovery Toast */}
      <WebGLContextHandler />

      {/* Studio First-Run Quickstart Onboarding */}
      <QuickstartStudioModal />

      {/* User Profile & Performance Settings Modal */}
      <UserProfileModal />

      {/* Recommended System Requirements Diagnostics Modal */}
      <SystemRequirementsModal
        isOpen={isSysReqModalOpen}
        onClose={() => setSysReqModalOpen(false)}
      />

      {/* 3D Air Virtual Instruments Controls HUD */}
      {hasStarted && <AirInstrumentControls />}


      {/* Scene Presets & Atmospheres Modal */}
      <Suspense fallback={null}>
        <PresetsModal />
      </Suspense>

      {/* Global Universal Drag & Drop Ingestion Zone */}
      <UniversalDropZone onFilesDropped={loadAudioFiles} />

      {/* Auto Color Dynamic Feedback Toast */}
      <AutoModeToast />
    </div>
  );
};

export const AppWithProviders: React.FC = () => (
  <AutoThemeProvider>
    <App />
  </AutoThemeProvider>
);

export default AppWithProviders;

