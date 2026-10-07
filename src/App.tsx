import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { LandingMinimal } from './components/Landing/LandingMinimal';
import { FEATURES } from './constants/features';
import { LiquidPlaybackDock } from './components/Player/LiquidPlaybackDock';
import { AutoThemeProvider } from './components/Theme/AutoThemeProvider';
import { AutoModeToast } from './components/UI/AutoModeToast';
import { useAudioPlayerActions } from './hooks/useAudioPlayer';
import { useAnalytics } from './hooks/useAnalytics';
import { useIdleTimer } from './hooks/useIdleTimer';
import { AnimatePresence, motion } from 'framer-motion';
import { useAutoPalette } from './hooks/useAutoPalette';
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer';
import { usePlayerStore } from './stores/playerStore';
import { useRecorderStore } from './store/recorderStore';
import { useCaptureStore } from './capture/store/captureStore';
import { hexToRgba } from './types/audio';
import { AlertCircle, Play, Pause } from 'lucide-react';
import { MiniSpectrumBars } from './components/UI/MiniSpectrumBars';
import { UniversalDropZone } from './components/UI/UniversalDropZone';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMediaSession } from './hooks/useMediaSession';
import { useChameleonPalette } from './hooks/useChameleonPalette';
import { installAdaptiveQuality } from './services/adaptiveQualityService';
import { AirInstrumentControls } from './components/UI/AirInstrumentControls';
import { WebGLContextHandler } from './components/3D/WebGLContextHandler';
import { RgbGlitchOverlay } from './components/Visualizers/RgbGlitchOverlay';
import { RetroCrtOverlay } from './components/UI/RetroCrtOverlay';
import { AmbientGlow } from './components/UI/AmbientGlow';
import { AmbientGlowLayer } from './components/Effects/AmbientGlowLayer';
import { CausticsOverlay } from './components/Effects/CausticsOverlay';
import { CameraPresetBar } from './components/UI/CameraPresetBar';
import { GlobalYouTubeController } from './components/Player/GlobalYouTubePlayer';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { Sliders } from 'lucide-react';
import { WallpaperBackground } from './components/Wallpapers/WallpaperBackground';
import { CinematicStagePostFx } from './components/Visualizers/CinematicStagePostFx';
import { VisualFeedbackRippleRoot } from './components/UI/VisualFeedbackRipple';
import { Ambilight360Layer } from './components/Effects/Ambilight360Layer';

// Solo se muestran tras pulsar "empezar" (o al abrir su panel): no hace falta descargarlos para pintar la
// landing. Los cargadores se reutilizan abajo para precargarlos cuando el navegador está ocioso.
const loadHeaderBar = () => import('./components/UI/HeaderBar').then((m) => ({ default: m.HeaderBar }));
const loadMiniPlayer = () => import('./components/Player/MiniPlayer').then((m) => ({ default: m.MiniPlayer }));
/** Inactividad (ms) antes de que el Modo Cinema oculte la interfaz */
const CINEMA_IDLE_MS = 4000;

const loadAtmosphereBackground = () =>
  import('./components/Visualizers/AtmosphereBackground').then((m) => ({ default: m.AtmosphereBackground }));
const loadWallpaperPanel = () => import('./components/Wallpapers/WallpaperPanel').then((m) => ({ default: m.WallpaperPanel }));
const loadAudioAnnouncer = () => import('./components/UI/AudioAnnouncer').then((m) => ({ default: m.AudioAnnouncer }));
const HeaderBar = lazy(loadHeaderBar);
const AudioAnnouncer = lazy(loadAudioAnnouncer);
const MiniPlayer = lazy(loadMiniPlayer);
const AtmosphereBackground = lazy(loadAtmosphereBackground);
const WallpaperPanel = lazy(loadWallpaperPanel);

// Lazy-loaded visualizers & heavy modals for code-splitting (reduces initial bundle size)
// Landings alternativas (feature flags): solo se descargan si se activan; arrastran Three.js
const LandingScreen = lazy(() => import('./components/Landing/LandingScreen').then((m) => ({ default: m.LandingScreen })));
const LandingScreenV2 = lazy(() => import('./components/Landing/LandingScreenV2').then((m) => ({ default: m.LandingScreenV2 })));
const LandingScreenV3 = lazy(() => import('./components/Landing/LandingScreenV3').then((m) => ({ default: m.LandingScreenV3 })));
const RainbowBlobVisualizer = lazy(() => import('./components/Visualizers/RainbowBlobVisualizer'));
const SynthwaveGridVisualizer = lazy(() => import('./components/Visualizers/SynthwaveGridVisualizer'));
const TerrainVisualizer = lazy(() => import('./components/Visualizers/TerrainVisualizer'));
const VisualizerPanel = lazy(() => import('./components/UI/VisualizerPanel'));
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
const CaptureStudio = lazy(() => import('./capture/components/CaptureStudio'));
// Estudio social (grabar, tarjetas para historias y exportar): solo se descarga al abrirlo
const RecorderPanel = lazy(() => import('./components/Recorder/RecorderPanel').then((m) => ({ default: m.RecorderPanel })));
const SpatialOverlay = lazy(() => import('./spatial/SpatialOverlay'));
const SpatialHUD = lazy(() =>
  import('./spatial/ui/SpatialHUD').then((m) => ({ default: m.SpatialHUD }))
);
const VideoTheaterModal = lazy(() => import('./components/Player/VideoTheaterModal'));

export const App: React.FC = () => {
  const { loadAudioFiles } = useAudioPlayerActions();
  const error = usePlayerStore((s) => s.audioError);
  useSpotifyPlayer();
  useAnalytics();
  useAutoPalette();
  useChameleonPalette();
  useKeyboardShortcuts();
  useMediaSession();

  // Calidad automática: baja el nivel visual si los FPS se hunden de forma sostenida (y lo recupera)
  useEffect(() => installAdaptiveQuality(), []);

  // Con la landing ya pintada, se descargan en segundo plano los paneles del reproductor para que
  // aparezcan al instante al pulsar "empezar" (sin esto habría una espera la primera vez).
  useEffect(() => {
    const preload = () => {
      void loadHeaderBar();
      void loadMiniPlayer();
      void loadAtmosphereBackground();
      void loadWallpaperPanel();
      void loadAudioAnnouncer();
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(preload);
    else window.setTimeout(preload, 1500);
  }, []);

  // El aviso de error se retira solo a los 8 s (o al pulsarlo); un error nuevo reinicia la cuenta
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => usePlayerStore.getState().setAudioError(null), 8000);
    return () => window.clearTimeout(t);
  }, [error]);
  const hasStarted = usePlayerStore((s) => s.hasStarted);
  const isSocialStudioOpen = useRecorderStore((s) => s.isModalOpen);
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
  const isVideoTheaterOpen = usePlayerStore((s) => s.isVideoTheaterOpen);
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
  const isCaptureStudioOpen = useCaptureStore((s) => s.isStudioOpen);

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
  const { togglePlayPause: engineTogglePlayPause } = useAudioPlayerActions();
  const { togglePlayPause: spotifyTogglePlayPause } = useSpotifyPlayer();

  const [isDockHovered, setIsDockHovered] = useState(false);
  const isUiIdle = usePlayerStore((s) => s.isUiIdle);
  const setIsUiIdle = usePlayerStore((s) => s.setIsUiIdle);
  const isUiHidden = blobSettings?.isUiHidden || false;

  // Zen Ghost mode: Auto-collapses the bottom dock to a micro-pill with LED spectrum
  // when orbiting the 3D scene (userInteracting) or idle, giving 100% unobstructed screen to the 3D scene
  const isZenGhostMode = hasStarted && (userInteracting || isUiIdle) && !isDockHovered && !isUiHidden;
  // En Modo Cinema (inactivo mientras suena) la UI se oculta igual que con la tecla G, pero reaparece sola
  const isCinemaIdle = isUiIdle && isPlaying && !isDockHovered;
  const shouldHideUI = isUiHidden || isCinemaIdle;

  const [showLanding, setShowLanding] = useState(!hasStarted);
  const isTransitioning = usePlayerStore((s) => s.isTransitioning);

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

  // Modo Cinema: tras 4 s sin actividad, durante la reproducción y sin paneles abiertos, la UI se desvanece
  const cinemaEnabled =
    hasStarted &&
    isPlaying &&
    !isEqualizerOpen &&
    !isLyricsOpen &&
    !isSidebarOpen &&
    !isKaraokeFullscreen &&
    !isCameraStudioOpen &&
    !isCaptureStudioOpen &&
    !vrMode;
  useIdleTimer({ timeout: CINEMA_IDLE_MS, enabled: cinemaEnabled, onIdleChange: setIsUiIdle });

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
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen?.();
        else void document.documentElement.requestFullscreen?.().catch(() => undefined);
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
      {hasStarted && (
        <Suspense fallback={null}>
          <AtmosphereBackground />
        </Suspense>
      )}

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
              : 'relative min-h-[100dvh] opacity-100 pointer-events-auto'
          }`}
          style={{ display: hasStarted && !isTransitioning ? 'none' : 'block' }}
        >
          {FEATURES.LANDING_MINIMAL ? (
            <LandingMinimal />
          ) : (
            <Suspense fallback={null}>
              {FEATURES.LANDING_V3 ? <LandingScreenV3 /> : FEATURES.LANDING_V2 ? <LandingScreenV2 /> : <LandingScreen />}
            </Suspense>
          )}
        </div>
      )}

      {/* 2. Visualizer in Fullscreen Center (Mounts smoothly with ethereal blur crossfade) */}
      <div
        className={`fixed inset-0 w-full h-full min-h-[55dvh] z-10 pointer-events-none transition-opacity duration-700 ease-out ${
          hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {hasStarted && (
          <Suspense fallback={<div className="w-full h-full" />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={visualizerMode}
                className="w-full h-full pointer-events-auto"
                initial={{ opacity: 0, filter: 'blur(14px) brightness(1.2)', scale: 0.98 }}
                animate={{ opacity: 1, filter: 'blur(0px) brightness(1)', scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(14px) brightness(0.85)', scale: 1.02 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                {visualizerMode === 'synthwave' ? (
                  <SynthwaveGridVisualizer />
                ) : visualizerMode === 'terrain' ? (
                  <TerrainVisualizer />
                ) : (
                  <RainbowBlobVisualizer />
                )}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        )}
      </div>

      {/* Ajustes del visualizador activo (no aplica a Rainbow Void, que tiene su propio personalizador) */}
      {hasStarted && visualizerMode !== 'blob' && (
        <Suspense fallback={null}>
          <VisualizerPanel />
        </Suspense>
      )}

      {/* Capa 3D espacial (instrumentos aéreos, cursor, objetos) sobre el visualizador activo */}
      {hasStarted && (isCameraStudioOpen || isAirInstrumentsActive) && (
        <Suspense fallback={null}>
          <SpatialOverlay />
        </Suspense>
      )}

      {/* Reactive Post-Processing RGB Glitch & Shockwave Overlay */}
      {hasStarted && <RgbGlitchOverlay />}
      {hasStarted && <RetroCrtOverlay />}
      {hasStarted && <CinematicStagePostFx />}

      {/* Reactive Ambient Glow Backdrop & Space Dust */}
      {hasStarted && <AmbientGlow />}

      {/* 360-Degree Audio-Reactive Edge Ambilight */}
      {hasStarted && <Ambilight360Layer />}

      {/* 3D Cinematic Camera Presets Toolbar */}
      <AnimatePresence>
        {hasStarted && !shouldHideUI && (
          <motion.div
            key="camera-presets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <CameraPresetBar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Floating Header UI */}
      {hasStarted && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
          initial={false}
          animate={shouldHideUI ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
          transition={{ duration: shouldHideUI ? 0.8 : 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ pointerEvents: 'none' }}
        >
          <Suspense fallback={null}>
            <HeaderBar />
          </Suspense>
        </motion.div>
      )}

      {/* 5. Master Liquid Playback Dock & Zen Morphing Island */}
      {hasStarted && (
        <LiquidPlaybackDock
          shouldHideUI={shouldHideUI}
          isZenGhostMode={isZenGhostMode}
          isDockHovered={isDockHovered}
          setIsDockHovered={setIsDockHovered}
        />
      )}



      {/* 6. Full-Body VR Dance & Pose Tracker Camera Card */}
      {hasStarted && vrMode && (
        <Suspense fallback={null}>
          <PoseTracker />
        </Suspense>
      )}

      {/* Error Notification */}
      {error && (
        <div
          role="alert"
          onClick={() => usePlayerStore.getState().setAudioError(null)}
          title="Pulsa para cerrar"
          className="fixed top-20 right-6 z-50 max-w-sm cursor-pointer p-4 rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-rose-500/20 text-rose-200 text-xs flex items-center gap-2 shadow-[var(--shadow-card)] backdrop-blur-xl animate-aura-popover"
        >
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
      {isVideoTheaterOpen && (
        <Suspense fallback={null}>
          <VideoTheaterModal />
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
      {/* El HUD se oculta mientras la consola del estudio está abierta (ya incluye selección de instrumento y salida) */}
      {hasStarted && !isCameraStudioOpen && isAirInstrumentsActive && (
        <Suspense fallback={null}>
          <SpatialHUD />
        </Suspense>
      )}

      {/* Aura Social Studio: grabación, tarjetas de historia con perfil y exportación */}
      {isSocialStudioOpen && (
        <Suspense fallback={null}>
          <RecorderPanel />
        </Suspense>
      )}

      {/* Unified Capture Studio (Foto 4K, Video REC & Framing Overlay) */}
      <Suspense fallback={null}>
        <CaptureStudio />
      </Suspense>

      {/* Mini Player — panel flotante con visualización de video de YouTube integrada */}
      {hasStarted && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}

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
      </Suspense>

      {/* 3D Air Virtual Instruments Controls HUD */}
      {hasStarted && !isCameraStudioOpen && <AirInstrumentControls />}

      {/* Aura Wallpapers AI (4K Minimalist & Ghibli) Modal Panel */}
      <Suspense fallback={null}>
        <WallpaperPanel />
      </Suspense>


      {/* Global YouTube Player Controller — singleton, no DOM output here */}
      <GlobalYouTubeController />

      {/* Global Universal Drag & Drop Ingestion Zone */}
      <UniversalDropZone onFilesDropped={loadAudioFiles} />

      {/* Auto Color Dynamic Feedback Toast */}
      <AutoModeToast />

      {/* Screen Reader ARIA Live Region Audio Announcer */}
      {hasStarted && (
        <Suspense fallback={null}>
          <AudioAnnouncer />
        </Suspense>
      )}

      {/* Global Visual Success Feedback Ripple Shockwave */}
      <VisualFeedbackRippleRoot />
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

