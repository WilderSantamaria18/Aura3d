import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { LandingScreen } from './components/Landing/LandingScreen';
import { LandingScreenV2 } from './components/Landing/LandingScreenV2';
import { LandingScreenV3 } from './components/Landing/LandingScreenV3';
import { LandingMinimal } from './components/Landing/LandingMinimal';
import { FEATURES } from './constants/features';
import { HeaderBar } from './components/UI/HeaderBar';
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
import { hexToRgba } from './types/audio';
import { AlertCircle, Play, Pause } from 'lucide-react';
import { MiniSpectrumBars } from './components/UI/MiniSpectrumBars';
import { UniversalDropZone } from './components/UI/UniversalDropZone';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AirInstrumentControls } from './components/UI/AirInstrumentControls';
import { WebGLContextHandler } from './components/3D/WebGLContextHandler';
import { AtmosphereBackground } from './components/Visualizers/AtmosphereBackground';
import { RgbGlitchOverlay } from './components/Visualizers/RgbGlitchOverlay';
import { RetroCrtOverlay } from './components/UI/RetroCrtOverlay';
import { AmbientGlow } from './components/UI/AmbientGlow';
import { AmbientGlowLayer } from './components/Effects/AmbientGlowLayer';
import { CausticsOverlay } from './components/Effects/CausticsOverlay';
import { CameraPresetBar } from './components/UI/CameraPresetBar';
import { GlobalYouTubeController } from './components/Player/GlobalYouTubePlayer';
import { AudioAnnouncer } from './components/UI/AudioAnnouncer';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { Sliders } from 'lucide-react';
import { WallpaperBackground } from './components/Wallpapers/WallpaperBackground';
import { WallpaperPanel } from './components/Wallpapers/WallpaperPanel';

// Lazy-loaded visualizers & heavy modals for code-splitting (reduces initial bundle size)
const RainbowBlobVisualizer = lazy(() => import('./components/Visualizers/RainbowBlobVisualizer'));
const SynthwaveGridVisualizer = lazy(() => import('./components/Visualizers/SynthwaveGridVisualizer'));
const WarpTunnelVisualizer = lazy(() => import('./components/Visualizers/WarpTunnelVisualizer'));
const TerrainVisualizer = lazy(() => import('./components/Visualizers/TerrainVisualizer'));
// BlackHoleVisualizer removed from UI
const AuralisStoryCardModal = lazy(() => import('./components/UI/AuralisStoryCardModal'));
const PoseTracker = lazy(() => import('./components/VR/PoseTracker'));
const AdminModal = lazy(() => import('./components/Admin/AdminModal'));
const EqualizerModal = lazy(() => import('./components/UI/EqualizerModal'));
const PlaylistSidebar = lazy(() => import('./components/UI/PlaylistSidebar'));
const LyricsOverlay = lazy(() => import('./components/Lyrics/LyricsOverlay'));
const KeyboardShortcutsModal = lazy(() => import('./components/UI/KeyboardShortcutsModal'));
const QuickstartStudioModal = lazy(() => import('./components/UI/QuickstartStudioModal'));
const UserProfileModal = lazy(() => import('./components/UI/UserProfileModal'));
const SystemRequirementsModal = lazy(() => import('./components/UI/SystemRequirementsModal'));
const UniversalCommandPalette = lazy(() => import('./components/UI/UniversalCommandPalette'));
const SessionStatsModal = lazy(() => import('./components/UI/SessionStatsModal'));
const CameraStudioPanel = lazy(() => import('./components/VR/CameraStudioPanel'));
const CaptureFramingOverlay = lazy(() => import('./components/UI/CaptureFramingOverlay'));
const StudioCaptureCard = lazy(() => import('./components/UI/StudioCaptureCard'));
const RecorderPanel = lazy(() =>
  import('./components/Recorder/RecorderPanel').then((m) => ({ default: m.RecorderPanel }))
);
const SpatialHUD = lazy(() =>
  import('./spatial/ui/SpatialHUD').then((m) => ({ default: m.SpatialHUD }))
);

export const App: React.FC = () => {
  const { loadAudioFiles, error } = useAudioEngine();
  useSpotifyPlayer();
  useAnalytics();
  useAutoPalette();
  useKeyboardShortcuts();
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidSecondaryColor = usePlayerStore((s) => s.lucidSecondaryColor);
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
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const decrementSleepTimer = usePlayerStore((s) => s.decrementSleepTimer);
  const setCommandPaletteOpen = usePlayerStore((s) => s.setCommandPaletteOpen);
  const isCameraStudioOpen = usePlayerStore((s) => s.isCameraStudioOpen);
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const isCaptureStudioOpen = usePlayerStore((s) => s.isCaptureStudioOpen);

  // Global Universal Command Palette Shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setCommandPaletteOpen]);

  // Sleep Timer 1-second countdown effect
  useEffect(() => {
    if (sleepTimerMinutes <= 0) return;
    const timer = window.setInterval(() => {
      decrementSleepTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerMinutes, decrementSleepTimer]);

  const userInteracting = usePlayerStore((s) => s.userInteracting);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isSpotifyConnected = usePlayerStore((s) => s.isSpotifyConnected);
  const { togglePlayPause: engineTogglePlayPause } = useAudioEngine();
  const { togglePlayPause: spotifyTogglePlayPause } = useSpotifyPlayer();

  const [isDockHovered, setIsDockHovered] = useState(false);
  const isUiIdle = usePlayerStore((s) => s.isUiIdle);
  const setIsUiIdle = usePlayerStore((s) => s.setIsUiIdle);
  const isUiHidden = blobSettings?.isUiHidden || false;

  // Zen Ghost mode: Auto-collapses the bottom dock to a micro-pill with LED spectrum
  // when orbiting the 3D scene (userInteracting) or idle, giving 100% unobstructed screen to the 3D scene
  const isZenGhostMode = hasStarted && (userInteracting || isUiIdle) && !isDockHovered && !isUiHidden;
  const shouldHideUI = isUiHidden;

  const [showLanding, setShowLanding] = useState(!hasStarted);
  const isTransitioning = usePlayerStore((s) => s.isTransitioning);
  const idleTimerRef = useRef<number | null>(null);

  // Toggle in-player mode class on html/body and hide landing after exit transition
  useEffect(() => {
    document.body.classList.toggle('in-player', hasStarted);
    document.documentElement.classList.toggle('in-player', hasStarted);
    if (hasStarted) {
      const timer = window.setTimeout(() => setShowLanding(false), 950);
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
      !isCameraStudioOpen &&
      !isCaptureStudioOpen &&
      !vrMode
    ) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsUiIdle(true);
      }, 4500);
    }
  }, [setIsUiIdle, hasStarted, isEqualizerOpen, isLyricsOpen, isSidebarOpen, isKaraokeFullscreen, isCameraStudioOpen, isCaptureStudioOpen, vrMode]);

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

  // Garantizar que Modo Lucid siempre esté activo como el ecosistema base de diseño de Aura3D
  useEffect(() => {
    if (!isLucid) {
      usePlayerStore.getState().setIsLucid(true);
    }
  }, [isLucid]);

  // Global shortcut 'G' to toggle Gallery Mode (pure 3D immersion)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        updateBlobSettings({ isUiHidden: !isUiHidden });
      } else if (e.key === 'Escape' && isUiHidden) {
        e.preventDefault();
        updateBlobSettings({ isUiHidden: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUiHidden, updateBlobSettings]);

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

  const activePrimary = isLucid ? (lucidPrimaryColor || lucidTheme?.primary || '#00e5ff') : '#00e5ff';
  const activeSecondary = isLucid ? (lucidSecondaryColor || lucidTheme?.secondary || '#ff007f') : '#ff007f';
  const activeGlow = isLucid ? hexToRgba(activePrimary, 0.40) : 'rgba(0, 229, 255, 0.35)';
  const activeGlass = isLucid ? hexToRgba(activePrimary, 0.08) : 'rgba(8, 12, 22, 0.90)';
  const activeBorder = isLucid ? hexToRgba(activePrimary, 0.35) : 'rgba(255, 255, 255, 0.08)';
  const activeBg = isLucid
    ? `radial-gradient(ellipse at 30% 30%, ${hexToRgba(activePrimary, 0.14)} 0%, ${hexToRgba(activeSecondary, 0.06)} 50%, #03050c 85%, #000000 100%)`
    : autoMode
    ? autoPalette.bg
    : '#04060d';

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${
        hasStarted ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      } select-none font-sans transition-colors duration-700 ${
        isLucid ? `lucid-${lucidTheme.id}` : ''
      }`}
      style={{
        '--lucid-primary': activePrimary,
        '--lucid-secondary': activeSecondary,
        '--lucid-glow': activeGlow,
        '--lucid-glass': activeGlass,
        '--lucid-border': activeBorder,
        '--lucid-text': activePrimary,
        '--lucid-bg': activeBg,
        background: activeBg,
        boxShadow: isLucid
          ? `inset 0 0 120px ${activeGlow}`
          : autoMode
          ? `inset 0 0 120px ${autoPalette.glow}`
          : undefined,
      } as React.CSSProperties}
    >
      {/* 0. Aura Wallpapers AI & Full-Screen Atmosphere Canvas Background */}
      <WallpaperBackground />
      {hasStarted && <AtmosphereBackground />}

      {/* 0.05 Apple Liquid Glass Master Overlays: Ambient Glow & Caustics */}
      <AmbientGlowLayer />
      <CausticsOverlay />

      {/* 0.1 Botón flotante para restaurar interfaz cuando está oculta en Modo Puro / Galería */}
      {isUiHidden && hasStarted && (
        <button
          type="button"
          onClick={() => updateBlobSettings({ isUiHidden: false })}
          className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-[var(--radius-card)] bg-[var(--surface-dock)] hover:bg-[var(--surface-overlay)] text-white/80 hover:text-white border border-[var(--border-subtle)] backdrop-blur-3xl shadow-[var(--shadow-card)] transition-all hover:scale-105 active:scale-[0.97] flex items-center gap-2 text-xs font-sans select-none pointer-events-auto group btn-spring"
          title="Restaurar interfaz y controles (o presiona 'G' o Esc)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <Sliders className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
          <span className="text-[11px] font-medium">Modo Galería (G / Esc)</span>
        </button>
      )}

      {/* 1. Initial Landing Screen (Smooth vertical scroll curtain transition) */}
      {showLanding && (
        <div
          className={`w-full z-50 transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hasStarted
              ? 'fixed inset-0 -translate-y-full opacity-0 pointer-events-none'
              : 'relative min-h-[100dvh] translate-y-0 opacity-100 pointer-events-auto'
          }`}
          style={{ display: hasStarted && !isTransitioning ? 'none' : 'block' }}
        >
          {FEATURES.LANDING_MINIMAL ? (
            <LandingMinimal />
          ) : FEATURES.LANDING_V3 ? (
            <LandingScreenV3 />
          ) : FEATURES.LANDING_V2 ? (
            <LandingScreenV2 />
          ) : (
            <LandingScreen />
          )}
        </div>
      )}

      {/* 2. Visualizer in Fullscreen Center (Mounts smoothly when user enters) */}
      <div
        className={`fixed inset-0 w-full h-full min-h-[55dvh] z-10 pointer-events-none transition-opacity duration-700 ease-out ${
          hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {hasStarted && (
          <Suspense fallback={<div className="w-full h-full" />}>
            {visualizerMode === 'synthwave' ? (
              <SynthwaveGridVisualizer />
            ) : visualizerMode === 'warp' ? (
              <WarpTunnelVisualizer />
            ) : visualizerMode === 'terrain' ? (
              <TerrainVisualizer />
            ) : (
              <RainbowBlobVisualizer />
            )}
          </Suspense>
        )}
      </div>

      {/* Reactive Post-Processing RGB Glitch & Shockwave Overlay */}
      {hasStarted && <RgbGlitchOverlay />}
      {hasStarted && <RetroCrtOverlay />}

      {/* Reactive Ambient Glow Backdrop & Space Dust */}
      {hasStarted && <AmbientGlow />}

      {/* 3D Cinematic Camera Presets Toolbar */}
      {hasStarted && !shouldHideUI && <CameraPresetBar />}

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



      {/* 5. Unified Bottom Playback Capsule & "Zen Ghost" Island */}
      {hasStarted && (
        <div
          className={`fixed bottom-3 sm:bottom-6 left-0 right-0 z-50 p-1.5 sm:p-2 transition-all duration-500 pointer-events-none flex flex-col items-center ${
            shouldHideUI || isZenGhostMode
              ? 'opacity-0 translate-y-28 pointer-events-none scale-95'
              : 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          }`}
          onMouseEnter={() => setIsDockHovered(true)}
          onMouseLeave={() => setIsDockHovered(false)}
        >
          <div
            className={`w-[clamp(280px,72vw,530px)] rounded-[var(--radius-dock)] px-2.5 py-1.5 flex flex-col gap-0.5 sm:gap-1 pointer-events-auto transition-all duration-300 group/capsule ${
              isLucid
                ? 'lucid-panel opacity-90 hover:opacity-100'
                : 'liquid-glass liquid-glass-dock opacity-95 hover:opacity-100'
            }`}
            style={
              isLucid
                ? {
                    backgroundColor: lucidTheme.glassColor,
                    borderColor: lucidTheme.borderColor,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.12) inset',
                  }
                : undefined
            }
          >
            {/* Main Player Transport & Progress */}
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
        <div className="fixed top-20 right-6 z-50 p-4 rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-rose-500/20 text-rose-200 text-xs flex items-center gap-2 shadow-[var(--shadow-card)] backdrop-blur-xl animate-aura-popover">
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
      {isCameraStudioOpen && (
        <Suspense fallback={null}>
          <CameraStudioPanel />
        </Suspense>
      )}

      {/* Floating Spatial HUD (Mode Selector, Zen Mode, WakeLock & Tier) - Apartado exclusivo AURA Spatial */}
      {hasStarted && (isCameraStudioOpen || isAirInstrumentsActive) && (
        <Suspense fallback={null}>
          <SpatialHUD />
        </Suspense>
      )}

      {/* Studio Capture Suite & On-Screen Framing Overlay */}
      <Suspense fallback={null}>
        <CaptureFramingOverlay />
        {isCaptureStudioOpen && <StudioCaptureCard />}
      </Suspense>

      {/* Mini Player — panel flotante con visualización de video de YouTube integrada */}
      {hasStarted && <MiniPlayer />}

      {/* Studio Modals — Lazy Loaded via Suspense for optimal bundle size */}
      <Suspense fallback={null}>
        <KeyboardShortcutsModal />
        <QuickstartStudioModal />
        <UserProfileModal />
        <SystemRequirementsModal
          isOpen={isSysReqModalOpen}
          onClose={() => setSysReqModalOpen(false)}
        />
        <UniversalCommandPalette />
        <SessionStatsModal />
      </Suspense>

      {/* WebGL Context Loss Auto-Recovery Toast */}
      <WebGLContextHandler />

      {/* Auralis Story Card 9:16 Social Export Modal */}
      <Suspense fallback={null}>
        <AuralisStoryCardModal />
        <RecorderPanel />
      </Suspense>

      {/* 3D Air Virtual Instruments Controls HUD */}
      {hasStarted && <AirInstrumentControls />}

      {/* Aura Wallpapers AI (4K Minimalist & Ghibli) Modal Panel */}
      <WallpaperPanel />


      {/* Global YouTube Player Controller — singleton, no DOM output here */}
      <GlobalYouTubeController />

      {/* Global Universal Drag & Drop Ingestion Zone */}
      <UniversalDropZone onFilesDropped={loadAudioFiles} />

      {/* Auto Color Dynamic Feedback Toast */}
      <AutoModeToast />

      {/* Screen Reader ARIA Live Region Audio Announcer */}
      <AudioAnnouncer />
    </div>
  );
};

export const AppWithProviders: React.FC = () => (
  <ErrorBoundary>
    <AutoThemeProvider>
      <App />
    </AutoThemeProvider>
  </ErrorBoundary>
);

export default AppWithProviders;

