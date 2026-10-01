import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  AlignLeft,
  ListMusic,
  Maximize,
  Minimize,
  Share2,
  Check,
  Disc3,
  Mic,
  Cast,
  Sparkles,
  Camera,
  Shield,
  Keyboard,
  HelpCircle,
  Piano,
  User,
  Gauge,
  Grid,
  ChevronDown,
  Layers,
  Radio,
  Wrench,
  Zap,
  Mountain,
  Headphones,
  MousePointer,
  Tv,
  Clock,
  SlidersHorizontal,
  Globe,
  Sun,
  Moon,
  Palette,
  Image,
  Orbit,
  Aperture,
  Atom,
  CircleDot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useThemeManager } from '../../services/themeService';
import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { LucidToggle } from './LucidToggle';
import { BackgroundAtmospherePopover } from './BackgroundAtmospherePopover';
import { CaptureStudioButton } from '../../capture/components/CaptureStudioButton';
import { useRecorderStore } from '../../store/recorderStore';
import { BpmMeter } from './BpmMeter';
import { SoundscapesHub } from './SoundscapesHub';
import { MiniSpectrumBars } from './MiniSpectrumBars';
import { RADIO_STATIONS } from '../../config/radioStations';
import { pictureInPictureService } from '../../services/pictureInPictureService';
import { useShallow } from 'zustand/react/shallow';

const VISUALIZERS = [
  { id: 'blob', name: 'Rainbow Void', icon: Sparkles, desc: 'Núcleo 2D Shaders reactivo' },
  { id: 'synthwave', name: 'Synthwave 3D', icon: Grid, desc: 'Carretera neón retrofuturista' },
  { id: 'terrain', name: 'Terreno 3D', icon: Mountain, desc: 'Ondas Cyberpunk en relieve' },
] as const;

export const HeaderBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';
  const { mode: themeMode, accent: currentAccent, setThemeMode, setAccentColor, availableAccents } = useThemeManager();
  const {
    visualizerMode,
    setVisualizerMode,
    toggleVisualizerSettings,
    isVisualizerSettingsOpen,
    isMicActive,
    vrMode,
    toggleVrMode,
    vrTrackingMode,
    toggleAdminModal,
    isEqualizerOpen,
    setEqualizerOpen,
    isLyricsOpen,
    setLyricsOpen,
    isSidebarOpen,
    setSidebarOpen,
    currentTrack,
    queue,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    isSpotifyConnected,
    toggleShortcutsModal,
    isAirInstrumentsActive,
    setAirInstrumentsActive,
    isCameraStudioOpen,
    toggleCameraStudio,
    setVrMode,
    setVrTrackingMode,
    userProfile,
    performanceTier,
    cyclePerformanceTier,
    mouseEffectsEnabled,
    toggleMouseEffects,
    toggleProfileModal,
    is8DAudioActive,
    eightDSpeed,
    toggle8DAudio,
    set8DSpeed,
    reverbPreset,
    setReverbPreset,
    isRgbGlitchActive,
    toggleRgbGlitch,
    isCrossfadeActive,
    toggleCrossfade,
    blobSettings,
    updateBlobSettings,
    isRetroCrtActive,
    toggleRetroCrt,
    showAudioRibbons,
    toggleAudioRibbons,
    isUnderwaterActive,
    toggleUnderwater,
    dspSpeedMode,
    setDspSpeedMode,
    binauralMode,
    setBinauralMode,
    sleepTimerMinutes,
    sleepTimerRemainingSec,
    setSleepTimer,
    masteringPreset,
    setMasteringPreset,
    isHarmonicSyncActive,
    toggleHarmonicSync,
    setCommandPaletteOpen,
    setSessionStatsOpen,
    vocalMode,
    setVocalMode,
    setStoryCardOpen,
    isBlobPanelOpen,
    setBlobPanelOpen,
    isCaptureStudioOpen,
    toggleCaptureStudio,
    captureAspectRatio,
    captureQuality,
  } = usePlayerStore(
    useShallow((s) => ({
      visualizerMode: s.visualizerMode,
      setVisualizerMode: s.setVisualizerMode,
      toggleVisualizerSettings: s.toggleVisualizerSettings,
      isVisualizerSettingsOpen: s.isVisualizerSettingsOpen,
      isMicActive: s.isMicActive,
      vrMode: s.vrMode,
      toggleVrMode: s.toggleVrMode,
      vrTrackingMode: s.vrTrackingMode,
      toggleAdminModal: s.toggleAdminModal,
      isEqualizerOpen: s.isEqualizerOpen,
      setEqualizerOpen: s.setEqualizerOpen,
      isLyricsOpen: s.isLyricsOpen,
      setLyricsOpen: s.setLyricsOpen,
      isSidebarOpen: s.isSidebarOpen,
      setSidebarOpen: s.setSidebarOpen,
      currentTrack: s.currentTrack,
      queue: s.queue,
      isLucid: s.isLucid,
      lucidTheme: s.lucidTheme,
      lucidPrimaryColor: s.lucidPrimaryColor,
      isSpotifyConnected: s.isSpotifyConnected,
      toggleShortcutsModal: s.toggleShortcutsModal,
      isAirInstrumentsActive: s.isAirInstrumentsActive,
      setAirInstrumentsActive: s.setAirInstrumentsActive,
      isCameraStudioOpen: s.isCameraStudioOpen,
      toggleCameraStudio: s.toggleCameraStudio,
      setVrMode: s.setVrMode,
      setVrTrackingMode: s.setVrTrackingMode,
      userProfile: s.userProfile,
      performanceTier: s.performanceTier,
      cyclePerformanceTier: s.cyclePerformanceTier,
      mouseEffectsEnabled: s.mouseEffectsEnabled,
      toggleMouseEffects: s.toggleMouseEffects,
      toggleProfileModal: s.toggleProfileModal,
      is8DAudioActive: s.is8DAudioActive,
      eightDSpeed: s.eightDSpeed,
      toggle8DAudio: s.toggle8DAudio,
      set8DSpeed: s.set8DSpeed,
      reverbPreset: s.reverbPreset,
      setReverbPreset: s.setReverbPreset,
      isRgbGlitchActive: s.isRgbGlitchActive,
      toggleRgbGlitch: s.toggleRgbGlitch,
      isCrossfadeActive: s.isCrossfadeActive,
      toggleCrossfade: s.toggleCrossfade,
      blobSettings: s.blobSettings,
      updateBlobSettings: s.updateBlobSettings,
      isRetroCrtActive: s.isRetroCrtActive,
      toggleRetroCrt: s.toggleRetroCrt,
      showAudioRibbons: s.showAudioRibbons,
      toggleAudioRibbons: s.toggleAudioRibbons,
      isUnderwaterActive: s.isUnderwaterActive,
      toggleUnderwater: s.toggleUnderwater,
      dspSpeedMode: s.dspSpeedMode,
      setDspSpeedMode: s.setDspSpeedMode,
      binauralMode: s.binauralMode,
      setBinauralMode: s.setBinauralMode,
      sleepTimerMinutes: s.sleepTimerMinutes,
      sleepTimerRemainingSec: s.sleepTimerRemainingSec,
      setSleepTimer: s.setSleepTimer,
      masteringPreset: s.masteringPreset,
      setMasteringPreset: s.setMasteringPreset,
      isHarmonicSyncActive: s.isHarmonicSyncActive,
      toggleHarmonicSync: s.toggleHarmonicSync,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      setSessionStatsOpen: s.setSessionStatsOpen,
      vocalMode: s.vocalMode,
      setVocalMode: s.setVocalMode,
      setStoryCardOpen: s.setStoryCardOpen,
      isBlobPanelOpen: s.isBlobPanelOpen,
      setBlobPanelOpen: s.setBlobPanelOpen,
      isCaptureStudioOpen: s.isCaptureStudioOpen,
      toggleCaptureStudio: s.toggleCaptureStudio,
      captureAspectRatio: s.captureAspectRatio,
      captureQuality: s.captureQuality,
    }))
  );

  const { toggleMicrophone, startSystemCapture, isCapturing, playRadioStation } = useAudioPlayerActions();
  const { connectSpotify, disconnectSpotify } = useSpotifyPlayer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAtmosphereOpen, setIsAtmosphereOpen] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);

  const hasActiveBg =
    Boolean(blobSettings?.customBackgroundImage) ||
    (Boolean(blobSettings?.backgroundAtmosphere) && blobSettings.backgroundAtmosphere !== 'none');

  // Consolidated Menu States (Only ONE card can ever be open at a time)
  type HeaderMenuType = 'visualizers' | 'dsp' | 'intel_hub' | 'studio' | 'settings' | 'timer' | 'recorder' | 'lucid' | null;
  const [activeMenu, setActiveMenu] = useState<HeaderMenuType>(null);
  const [dspTab, setDspTab] = useState<'master' | 'spatial' | 'modulation'>('master');

  const menuRef = useRef<HTMLElement>(null);

  // Exclusive single-card policy: opening any card closes any other card
  const handleToggleMenu = (menu: 'visualizers' | 'dsp' | 'intel_hub' | 'studio' | 'settings' | 'timer' | 'recorder' | 'lucid') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
    
    // Si estamos abriendo un nuevo menú, cerramos los paneles de Zustand
    if (activeMenu !== menu) {
      if (isBlobPanelOpen) setBlobPanelOpen(false);
      if (isLyricsOpen) setLyricsOpen(false);
    }
  };

  useEffect(() => {
    if (isBlobPanelOpen) {
      setActiveMenu(null);
      if (isLyricsOpen) setLyricsOpen(false);
    }
  }, [isBlobPanelOpen]);

  useEffect(() => {
    if (isLyricsOpen) {
      setActiveMenu(null);
      if (isBlobPanelOpen) setBlobPanelOpen(false);
    }
  }, [isLyricsOpen]);

  useEffect(() => {
    return pictureInPictureService.subscribe(setIsPipActive);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  const handleShare = async () => {
    const shareText = currentTrack
      ? `Escuchando "${currentTrack.title}" por ${currentTrack.artist} en Auralis`
      : 'Disfrutando de Auralis - Reproductor Inmersivo Web';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Auralis Visualizer',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User dismissed
      }
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const activeAccent = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#ffffff';

  const isAnyDspActive =
    is8DAudioActive ||
    reverbPreset !== 'off' ||
    isRgbGlitchActive ||
    isCrossfadeActive ||
    isUnderwaterActive ||
    dspSpeedMode !== 'normal' ||
    binauralMode !== 'off' ||
    isRetroCrtActive ||
    masteringPreset !== 'off' ||
    isHarmonicSyncActive;

  return (
    <header
      ref={menuRef}
      className="w-full flex items-center justify-start px-3 sm:px-6 md:px-8 pt-2 sm:pt-3 pointer-events-none select-none font-sans"
    >
      <div className="w-full flex flex-wrap items-start justify-between gap-2 sm:gap-3">
      <div className="liquid-glass liquid-glass--pill flex items-center !px-3 !py-1.5 gap-2 max-sm:!px-2 max-sm:gap-1 pointer-events-auto">
        {/* ── CLUSTER 1 (Left): Brand Identity, Track Info & Search ── */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          <div
            className="glass-item !rounded-full w-9 h-9 flex items-center justify-center"
            style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
          >
            <Disc3 className="w-3.5 h-3.5" style={{ color: activeAccent }} />
          </div>

          <div className="hidden min-[380px]:flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold tracking-[0.1em] font-display text-[13px] uppercase text-white/95">
                Auralis
              </span>
              <span className="max-sm:hidden text-[7.5px] tracking-wider uppercase font-mono px-1 py-0.2 rounded border border-white/[0.08] text-white/50 bg-white/[0.03]">
                Studio
              </span>
              <span className="max-sm:hidden"><MiniSpectrumBars /></span>
            </div>

            {currentTrack && (
              <div className="hidden md:flex items-center gap-1 text-[11px] text-white/55 truncate max-w-[150px] lg:max-w-[210px]">
                <span className="truncate text-white/80 font-medium">{currentTrack.title}</span>
                <span className="text-white/30">•</span>
                <span className="truncate text-white/50">{currentTrack.artist}</span>
              </div>
            )}
          </div>

          {/* Global Command Palette Chip */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="glass-btn hidden min-[1700px]:flex items-center gap-1 px-2.5 h-7 text-[8.5px] font-mono text-white/80 hover:text-white pointer-events-auto ml-0.5"
            title="Abrir Paleta Universal de Comandos (Ctrl+K / ⌘K)"
          >
            <Keyboard className="w-2.5 h-2.5 text-cyan-400" />
            <span>Cmd</span>
            <kbd className="px-1.5 py-0.2 rounded-full bg-white/10 text-[7.5px] text-white/80">⌘K</kbd>
          </button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

        {/* Vistas: acceso directo a Biblioteca (lista de reproducción), Letras y Ecualizador */}
        <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label="Vistas">
          {[
            { key: 'lib', label: 'Biblioteca y lista de reproducción (B)', icon: ListMusic, active: isSidebarOpen, badge: queue.length, onClick: () => setSidebarOpen(!isSidebarOpen) },
            { key: 'lyr', label: 'Letras sincronizadas', icon: AlignLeft, active: isLyricsOpen, badge: 0, onClick: () => setLyricsOpen(!isLyricsOpen) },
            { key: 'eq', label: 'Ecualizador (E)', icon: Sliders, active: isEqualizerOpen, badge: 0, onClick: () => setEqualizerOpen(!isEqualizerOpen) },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={v.onClick}
                aria-pressed={v.active}
                aria-label={v.label}
                title={v.label}
                className={`glass-btn relative w-9 h-9 flex items-center justify-center ${v.active ? 'is-active text-white' : 'text-white/75 hover:text-white'}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {v.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-black text-[10px] font-mono font-bold flex items-center justify-center leading-none">
                    {v.badge > 99 ? '99+' : v.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="liquid-glass liquid-glass--pill flex items-center !px-3 !py-1.5 gap-2 max-sm:!px-2 max-sm:gap-1 pointer-events-auto">

        {/* ── CLUSTER 2 (Center): Stage, DSP Studio & Live Harmony Hub ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* 1. Selector de Visualizador 3D / Shaders */}
        <div className="relative">
          {(() => {
            const currentViz = VISUALIZERS.find((v) => v.id === visualizerMode) || VISUALIZERS[0];
            const VizIcon = currentViz.icon;
            return (
              <button
                onClick={() => handleToggleMenu('visualizers')}
                aria-haspopup="true"
                aria-expanded={activeMenu === 'visualizers'}
                aria-label="Seleccionar modo de visualización"
                className={`flex items-center gap-1 sm:gap-1.5 glass-btn px-3 py-1 h-8 text-[12px] font-medium transition-all duration-200 cursor-pointer active:scale-95 border ${
                  activeMenu === 'visualizers'
                    ? 'is-active text-white [--glass-accent:0,229,255]'
                    : 'text-white/90 shadow-sm'
                }`}
                title="Seleccionar Modo de Visualización (Rainbow Void, Synthwave 3D, Warp, Terreno)"
              >
                <VizIcon className={`w-3.5 h-3.5 ${activeMenu === 'visualizers' ? 'text-cyan-400' : 'text-cyan-400/90'}`} />
                <span className="font-medium text-[12px]">{currentViz.name}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'visualizers' ? 'rotate-180' : ''}`} />
              </button>
            );
          })()}

          {activeMenu === 'visualizers' && (
            <div
              role="menu"
              aria-label="Modos de visualización interactivos"
              className="fixed inset-x-3 top-14 max-w-[290px] mx-auto sm:mx-0 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-3 sm:w-80 liquid-glass liquid-glass--card z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 select-none text-white font-sans"
            >
              <div className="flex items-center justify-between px-2 pt-0.5 pb-1.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-semibold text-white tracking-tight">
                    Visualizadores 3D
                  </span>
                </div>
                <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/25">
                  WebGL 2.0
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {VISUALIZERS.map((viz) => {
                  const Icon = viz.icon;
                  const isActive = visualizerMode === viz.id;
                  return (
                    <button
                      key={viz.id}
                      role="menuitem"
                      aria-label={`Activar visualizador ${viz.name}`}
                      onClick={() => {
                        setVisualizerMode(viz.id as any);
                        setActiveMenu(null);
                      }}
                      className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                        isActive
                          ? 'is-active text-white font-semibold'
                          : 'text-white/85 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isActive
                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                              : 'bg-white/[0.05] text-white/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs text-white tracking-tight">{viz.name}</span>
                          <span className="text-[11px] text-white/55 tracking-tight font-sans">{viz.desc}</span>
                        </div>
                      </div>
                      {isActive && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 1b. Ajustes del visualizador activo (Rainbow Void tiene su propio personalizador) */}
        {visualizerMode !== 'blob' && (
          <button
            type="button"
            onClick={() => toggleVisualizerSettings()}
            aria-label="Ajustes del visualizador"
            aria-pressed={isVisualizerSettingsOpen}
            title="Ajustes del visualizador"
            className={`flex items-center justify-center glass-btn w-8 h-8 cursor-pointer active:scale-95 border ${
              isVisualizerSettingsOpen ? 'is-active text-white [--glass-accent:0,229,255]' : 'text-white/80 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 2. Spatial Camera Studio */}
        <div className="relative">
          <button
            onClick={() => toggleCameraStudio()}
            aria-label="Spatial Camera Studio"
            className={`flex items-center gap-1.5 glass-btn px-3 py-1 h-8 text-[12px] font-medium transition-all duration-200 cursor-pointer active:scale-95 border ${
              isCameraStudioOpen
                ? 'is-active text-white [--glass-accent:0,229,255]'
                : 'text-white/80 hover:text-white shadow-sm'
            }`}
            title="Spatial Camera Studio: Sintetizadores, Batería y Theremin 3D con tus Manos"
          >
            <Camera className={`w-3.5 h-3.5 ${isCameraStudioOpen ? 'text-cyan-400' : 'text-white/70'}`} />
            <span className="hidden min-[1700px]:inline text-[12px]">Cámara 3D</span>
            {isCameraStudioOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>

        {/* 3. Ambientes de audio */}
        <SoundscapesHub
          isOpen={activeMenu === 'intel_hub'}
          onToggle={() => handleToggleMenu('intel_hub')}
          onClose={() => setActiveMenu(null)}
        />
      </div>

      </div>
      <div className="liquid-glass liquid-glass--pill flex items-center !px-3 !py-1.5 gap-2 max-sm:!px-2 max-sm:gap-1 pointer-events-auto">

      {/* ── CLUSTER 3 (Right): Grabador, Estudio & Entradas, Ajustes & Lúcido ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 1. Grabador de Clips & Snapshot 4K */}
        <div className="flex items-center gap-1 glass-item !rounded-full !p-0.5 !transform-none">
          <div className="max-sm:hidden"><BpmMeter /></div>
          <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />
          <div className="max-sm:hidden"><CaptureStudioButton /></div>

          {/* Aura Wallpaper & Atmosphere Studio */}
          <button
            onClick={() => useWallpaperStore.getState().togglePanel()}
            className="w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
            title="Aura Wallpaper Studio (Fondos 4K, Subir Foto, IA y Atmósferas - Atajo: W)"
            aria-label="Estudio de Fondos y Atmósfera"
          >
            <Image className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Auralis Story Card 9:16 Social Export & Studio */}
          <button
            onClick={() => useRecorderStore.getState().openModal('cards')}
            className="max-sm:hidden w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20"
            title="Aura3D Social Content Studio (Grabación 9:16 y Story Cards para Instagram/TikTok)"
            aria-label="Aura3D Social Studio"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </button>

          {/* Ayuda & Atajos de Teclado (?) */}
          <button
            onClick={() => toggleShortcutsModal()}
            className="max-sm:hidden w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
            title="Ayuda y Atajos de Teclado (?)"
            aria-label="Ayuda y Atajos de Teclado"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>

        {/* 2. Menú Unificado: Estudio & Entradas (Mic, Sistema, Spotify, Radio, VR, Air Synth, PiP) */}
        <div className="relative">
          <button
            onClick={() => handleToggleMenu('studio')}
            className={`glass-btn px-3 py-1 h-8 text-[12px] font-medium transition-all duration-200 flex items-center gap-1 active:scale-95 border cursor-pointer ${
              activeMenu === 'studio' || isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive
                ? 'is-active text-white [--glass-accent:0,229,255]'
                : 'text-white/80 hover:text-white'
            }`}
            title="Estudio: Entradas de audio, Radios 24/7, Experiencias 3D y Picture-in-Picture"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden min-[1700px]:inline text-[12px]">Estudio</span>
            {(isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive) && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'dsp' ? 'rotate-180' : ''}`} />
          </button>

          {activeMenu === 'studio' && (
            <div className="fixed inset-x-3 top-14 max-w-[290px] ml-auto sm:mx-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 liquid-glass liquid-glass--card z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 select-none text-white font-sans">
              {/* Header */}
              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white tracking-tight">Estudio y Fuentes</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/25">
                  I/O Audio
                </span>
              </div>

              {/* Sección Fuentes */}
              <div>
                <span className="text-[10.5px] font-semibold text-white/55 px-1 uppercase tracking-wider block mb-1">
                  Fuentes de Audio
                </span>
                <div className="flex flex-col gap-1">
                  {/* Micrófono */}
                  <button
                    onClick={() => {
                      toggleMicrophone();
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      isMicActive
                        ? 'is-active text-white font-semibold [--glass-accent:16,185,129]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 flex-shrink-0 shadow-sm">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">Micrófono en vivo</span>
                        <span className="text-[10.5px] text-white/55">Entrada de voz o DAW</span>
                      </div>
                    </div>
                    {isMicActive && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>

                  {/* Audio de Pantalla / Tab */}
                  <button
                    onClick={() => {
                      startSystemCapture();
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      isCapturing
                        ? 'is-active text-white font-semibold [--glass-accent:0,229,255]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30 flex-shrink-0 shadow-sm">
                        <Cast className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">Audio de Pantalla</span>
                        <span className="text-[10.5px] text-white/55">Captura directa de pestaña</span>
                      </div>
                    </div>
                    {isCapturing && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </button>

                  {/* Spotify */}
                  <button
                    onClick={() => {
                      if (isSpotifyConnected) disconnectSpotify();
                      else connectSpotify();
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      isSpotifyConnected
                        ? 'is-active text-white font-semibold [--glass-accent:29,185,84]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/30 flex-shrink-0 shadow-sm">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
                        </svg>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">
                          {isSpotifyConnected ? 'Spotify Conectado' : 'Conectar Spotify'}
                        </span>
                        <span className="text-[10.5px] text-white/55">Sincronización Web API</span>
                      </div>
                    </div>
                    {isSpotifyConnected && <span className="w-2 h-2 rounded-full bg-[#1DB954]" />}
                  </button>

                  {/* Radio Web 24/7 */}
                  <button
                    onClick={() => {
                      const synthwaveStation = RADIO_STATIONS.find((s) => s.id === 'radio_vaporwaves') || RADIO_STATIONS[2];
                      if (synthwaveStation) playRadioStation(synthwaveStation);
                      setActiveMenu(null);
                    }}
                    className="glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer text-white/85 hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center border border-fuchsia-500/30 flex-shrink-0 shadow-sm">
                        <Radio className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">Radio Synthwave</span>
                        <span className="text-[10.5px] text-white/55">Emisión continua 24/7</span>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-fuchsia-500/20 text-fuchsia-300 rounded-full font-bold uppercase border border-fuchsia-500/30">
                      LIVE
                    </span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-0.5" />

              {/* Sección Experiencias Inmersivas */}
              <div>
                <span className="text-[10.5px] font-semibold text-white/55 px-1 uppercase tracking-wider block mb-1">
                  Experiencias Inmersivas
                </span>
                <div className="flex flex-col gap-1">
                  {/* Air Synth */}
                  <button
                    onClick={() => {
                      const next = !isAirInstrumentsActive;
                      setAirInstrumentsActive(next);
                      if (next && !vrMode) {
                        setVrTrackingMode('hands');
                        setVrMode(true);
                      }
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      isAirInstrumentsActive
                        ? 'is-active text-white font-semibold [--glass-accent:0,229,255]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30 flex-shrink-0 shadow-sm">
                        <Piano className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">3D Air Synth</span>
                        <span className="text-[10.5px] text-white/55">Control gestual con manos</span>
                      </div>
                    </div>
                    {isAirInstrumentsActive && <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />}
                  </button>

                  {/* VR Pose & Dance */}
                  <button
                    onClick={() => {
                      toggleVrMode();
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      vrMode
                        ? 'is-active text-white font-semibold'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30 flex-shrink-0 shadow-sm">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">VR Dance & Tracker</span>
                        <span className="text-[10.5px] text-white/55">Captura de movimiento</span>
                      </div>
                    </div>
                    {vrMode && <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded-full font-bold uppercase">{vrTrackingMode}</span>}
                  </button>

                  {/* Picture-in-Picture (PiP) */}
                  <button
                    onClick={async () => {
                      await pictureInPictureService.togglePictureInPicture();
                      setActiveMenu(null);
                    }}
                    className={`glass-item flex items-center justify-between p-2.5 min-h-[46px] cursor-pointer ${
                      isPipActive
                        ? 'is-active text-white font-semibold [--glass-accent:0,229,255]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30 flex-shrink-0 shadow-sm">
                        <Tv className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-white">Ventana Flotante (PiP)</span>
                        <span className="text-[10.5px] text-white/55">Mini pantalla externa</span>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 font-bold border border-white/10">
                      {isPipActive ? 'ON' : 'POP'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Menú Unificado: Ajustes & Sistema */}
        <div className="relative">
          <button
            onClick={() => handleToggleMenu('settings')}
            aria-haspopup="true"
            aria-expanded={activeMenu === 'settings'}
            aria-label="Ajustes de Sistema y Herramientas"
            className={`glass-btn px-3 py-1 h-8 text-[12px] font-medium transition-all duration-200 flex items-center gap-1 active:scale-95 border cursor-pointer ${
              activeMenu === 'settings' || isEqualizerOpen || isLyricsOpen || isSidebarOpen || sleepTimerMinutes > 0
                ? 'is-active text-white [--glass-accent:168,85,247]'
                : 'text-white/80 hover:text-white'
            }`}
            title="Ajustes de Sistema: Biblioteca, Letras, Ecualizador, Temporizador, Rendimiento y Atajos"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden min-[1700px]:inline text-[12px]">Ajustes</span>
            {sleepTimerMinutes > 0 && (
              <span className="text-[8px] font-mono font-bold text-amber-300">
                {Math.floor(sleepTimerRemainingSec / 60)}m
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'settings' ? 'rotate-180' : ''}`} />
          </button>

          {activeMenu === 'settings' && (
            <div
              role="menu"
              aria-label="Ajustes de Sistema"
              className="fixed inset-x-3 top-14 max-w-[300px] ml-auto sm:mx-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 liquid-glass liquid-glass--card z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 select-none text-white font-sans max-h-[85vh] overflow-y-auto liquid-glass-scrollbar"
            >
              {/* Sección Vistas & Utilidades */}
              <div>
                <span className="text-[10px] font-mono text-white/65 px-2 uppercase tracking-wider">
                  Vistas & Utilidades
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  {/* Biblioteca */}
                  <button
                    onClick={() => {
                      setSidebarOpen(!isSidebarOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between glass-item p-2.5 min-h-[40px] text-xs font-mono ${
                      isSidebarOpen ? 'is-active text-white font-medium' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-purple-400" />
                      <span>Biblioteca de Pistas</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-white/10 text-white/60 font-bold">B</span>
                  </button>

                  {/* Ecualizador Pro-Q */}
                  <button
                    onClick={() => {
                      setEqualizerOpen(!isEqualizerOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between glass-item p-2.5 min-h-[40px] text-xs font-mono ${
                      isEqualizerOpen ? 'is-active text-white font-medium' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>Ecualizador 10 Bandas</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-white/10 text-white/60 font-bold">E</span>
                  </button>

                  {/* Estadísticas de Sesión */}
                  <button
                    onClick={() => {
                      setSessionStatsOpen(true);
                      setActiveMenu(null);
                    }}
                    className="glass-item flex items-center gap-2 p-2.5 min-h-[40px] text-xs font-mono text-white/80 hover:text-white"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Estadísticas de Sesión</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-0.5" />

              {/* Sección Tema & Acento Dinámico */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Tema Visual & Acento
                </span>
                <div className="flex flex-col gap-1.5 mt-1 glass-card !p-3 !rounded-2xl">
                  {/* Selector de Modo: Auto / Dark / Light */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Tema</span>
                    <div className="flex gap-1 p-0.5 rounded-[8px] bg-black/40 border border-white/[0.08]">
                      {(['auto', 'dark', 'light'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setThemeMode(m)}
                          className={`px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-medium transition-all ${
                            themeMode === m
                              ? 'bg-white/20 text-white font-bold shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {m === 'auto' ? 'Auto' : m === 'dark' ? 'Oscuro' : 'Claro'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Color de Acento */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <span className="text-[11px] text-white/70">Acento</span>
                    <div className="flex items-center gap-1.5">
                      {availableAccents.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => setAccentColor(acc.id)}
                          title={acc.label}
                          aria-label={`Seleccionar acento ${acc.label}`}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            currentAccent === acc.id
                              ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black'
                              : 'opacity-70 hover:opacity-100 hover:scale-110'
                          }`}
                          style={{ backgroundColor: acc.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-0.5" />

              {/* Sección Fondo & Atmósfera 3D (Acoplada en Ajustes) */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Fondo & Entorno 3D
                </span>
                <div className="mt-1">
                  <button
                    onClick={() => {
                      useWallpaperStore.getState().setPanelOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center justify-between glass-item p-2.5 min-h-[40px] text-xs font-mono text-white/85 hover:text-white cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-[11px] text-white">Fondo & Atmósfera 3D</span>
                        <span className="text-[9px] text-white/40 font-sans">
                          Imágenes, difuminado y shaders de entorno
                        </span>
                      </div>
                    </div>
                    {hasActiveBg && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase border border-cyan-500/30">
                        ACTIVO
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-0.5" />

              {/* Sección Rendimiento & Hardware */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Hardware & Temporizador
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  {/* Rendimiento Gráfico */}
                  <button
                    onClick={cyclePerformanceTier}
                    className="glass-item flex items-center justify-between p-2.5 min-h-[40px] text-xs font-mono text-white/80 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span>Rendimiento Gráfico</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold text-amber-300 px-1.5 py-0.5 bg-amber-500/15 rounded-[4px] border border-amber-500/30">
                      {performanceTier}
                    </span>
                  </button>

                  {/* Efectos de Cursor */}
                  <button
                    onClick={toggleMouseEffects}
                    className="glass-item flex items-center justify-between p-2.5 min-h-[40px] text-xs font-mono text-white/80 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <MousePointer className={`w-4 h-4 ${mouseEffectsEnabled ? 'text-cyan-400' : 'text-white/40'}`} />
                      <span>Efectos de Cursor</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[4px] border text-white/50 border-white/10">
                      {mouseEffectsEnabled ? 'Activo' : 'Eco'}
                    </span>
                  </button>

                  {/* Sleep Timer Preset Rápido */}
                  <div className="flex items-center justify-between glass-item p-2.5">
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Sleep Timer</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setSleepTimer(mins)}
                          className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold transition-all ${
                            sleepTimerMinutes === mins
                              ? 'bg-amber-500 text-black'
                              : 'bg-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          {mins === 0 ? 'Off' : `${mins}m`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Atajos de Teclado */}
                  <button
                    onClick={() => {
                      toggleShortcutsModal();
                      setActiveMenu(null);
                    }}
                    className="glass-item flex items-center gap-2 p-2.5 min-h-[40px] text-xs font-mono text-white/80 hover:text-white"
                  >
                    <Keyboard className="w-4 h-4 text-blue-400" />
                    <span>Atajos de Teclado (?)</span>
                  </button>
                </div>
              </div>

              {/* Pie de Ajustes: Compartir e Idioma acoplados */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-white/60">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-[10px] text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Compartir enlace de sesión"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
                </button>

                <button
                  onClick={() => changeLanguage(currentLang === 'es' ? 'en' : 'es')}
                  className="px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer border border-white/10"
                  title={currentLang === 'es' ? 'Cambiar a English' : 'Switch to Spanish'}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="uppercase">{currentLang === 'es' ? 'Español (ES)' : 'English (EN)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pod Final Compacto: Lúcido & Pantalla Completa */}
        <div className="flex items-center gap-1 glass-item !rounded-full !p-0.5 !transform-none">
          <LucidToggle
            isOpen={activeMenu === 'lucid'}
            onToggle={() => handleToggleMenu('lucid')}
            onClose={() => setActiveMenu(null)}
          />

          <button
            onClick={() => updateBlobSettings({ isUiHidden: true })}
            className="w-8 h-8 rounded-full text-white/60 hover:text-cyan-300 hover:bg-white/[0.1] active:scale-95 transition-all hidden sm:flex items-center justify-center"
            title="Modo Galería / Inmersión Pura (Atajo: G)"
            aria-label="Modo Galería"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label="Pantalla completa"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Popover de Fondo y Atmósfera (Activado desde Ajustes) */}
        <BackgroundAtmospherePopover
          isOpen={isAtmosphereOpen}
          onOpenChange={setIsAtmosphereOpen}
          showTrigger={false}
        />
      </div>
      </div>
      </div>
    </header>
  );
};

export default HeaderBar;
