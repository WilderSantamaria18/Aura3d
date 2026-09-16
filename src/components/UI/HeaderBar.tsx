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
  Waves,
  Music2,
  CloudRain,
  Flame,
  Coffee,
  Volume2,
  VolumeX,
  Activity,
  SlidersHorizontal,
  ExternalLink,
  Globe,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useThemeManager } from '../../services/themeService';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { LucidToggle } from './LucidToggle';
import { BackgroundAtmospherePopover } from './BackgroundAtmospherePopover';
import { VideoRecorderButton } from './VideoRecorderButton';
import { BpmMeter } from './BpmMeter';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { AuraMindRadar } from './AuraMindRadar';
import { MiniSpectrumBars } from './MiniSpectrumBars';
import { captureVisualizerSnapshot } from '../../utils/snapshotCapture';
import { RADIO_STATIONS } from '../../config/radioStations';
import { soundscapeEngine, type SoundscapeType, type SoundscapesConfig } from '../../services/soundscapeEngine';
import { harmonicAnalysisService, type HarmonicKeyResult } from '../../services/harmonicAnalysisService';
import { pictureInPictureService } from '../../services/pictureInPictureService';

const VISUALIZERS = [
  { id: 'blob', name: 'Rainbow Void', icon: Sparkles, desc: 'Núcleo 2D Shaders reactivo' },
  { id: 'synthwave', name: 'Synthwave 3D', icon: Grid, desc: 'Carretera neón retrofuturista' },
  { id: 'warp', name: 'Túnel Warp', icon: Zap, desc: 'Túnel hipersónico 3D reactivo' },
  { id: 'terrain', name: 'Terreno 3D', icon: Mountain, desc: 'Ondas Cyberpunk en relieve' },
] as const;

const CIRCLE_OF_FIFTHS = [
  { major: 'C', minor: 'Am', camelotMaj: '8B', camelotMin: '8A' },
  { major: 'G', minor: 'Em', camelotMaj: '9B', camelotMin: '9A' },
  { major: 'D', minor: 'Bm', camelotMaj: '10B', camelotMin: '10A' },
  { major: 'A', minor: 'F#m', camelotMaj: '11B', camelotMin: '11A' },
  { major: 'E', minor: 'C#m', camelotMaj: '12B', camelotMin: '12A' },
  { major: 'B', minor: 'G#m', camelotMaj: '1B', camelotMin: '1A' },
  { major: 'F#', minor: 'D#m', camelotMaj: '2B', camelotMin: '2A' },
  { major: 'Db', minor: 'Bbm', camelotMaj: '3B', camelotMin: '3A' },
  { major: 'Ab', minor: 'Fm', camelotMaj: '4B', camelotMin: '4A' },
  { major: 'Eb', minor: 'Cm', camelotMaj: '5B', camelotMin: '5A' },
  { major: 'Bb', minor: 'Gm', camelotMaj: '6B', camelotMin: '6A' },
  { major: 'F', minor: 'Dm', camelotMaj: '7B', camelotMin: '7A' },
];

function getCompatibleCamelots(camelot: string): string[] {
  const match = camelot?.match(/^(\d+)([AB])$/);
  if (!match) return [];
  const num = parseInt(match[1], 10);
  const letter = match[2];
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  const plusOne = num === 12 ? 1 : num + 1;
  const minusOne = num === 1 ? 12 : num - 1;
  return [`${num}${letter}`, `${num}${oppositeLetter}`, `${plusOne}${letter}`, `${minusOne}${letter}`];
}

const SOUNDSCAPE_CHANNELS: Array<{
  type: SoundscapeType;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
}> = [
  {
    type: 'rain',
    title: 'Lluvia en Ventana',
    subtitle: 'Ruido rosa 750Hz y gotas suaves',
    icon: CloudRain,
    accentColor: 'text-sky-400',
  },
  {
    type: 'fire',
    title: 'Crepitar de Fogata',
    subtitle: 'Retumbe 140Hz y chispas Poisson',
    icon: Flame,
    accentColor: 'text-orange-400',
  },
  {
    type: 'cafe',
    title: 'Cafetería de Noche',
    subtitle: 'Formantes 520Hz/1350Hz acústicos',
    icon: Coffee,
    accentColor: 'text-amber-400',
  },
  {
    type: 'ocean',
    title: 'Olas del Mar',
    subtitle: 'Oleaje sinusoidal continuo de 8.5s',
    icon: Waves,
    accentColor: 'text-teal-400',
  },
];

export const HeaderBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';
  const { mode: themeMode, accent: currentAccent, setThemeMode, setAccentColor, availableAccents } = useThemeManager();
  const {
    visualizerMode,
    setVisualizerMode,
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
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    isSpotifyConnected,
    toggleShortcutsModal,
    isAirInstrumentsActive,
    setAirInstrumentsActive,
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
  } = usePlayerStore();

  const { toggleMicrophone, startSystemCapture, isCapturing, playRadioStation } = useAudioEngine();
  const { connectSpotify, disconnectSpotify } = useSpotifyPlayer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAuraMindOpen, setIsAuraMindOpen] = useState(false);
  const [soundscapeConfig, setSoundscapeConfig] = useState<SoundscapesConfig>(soundscapeEngine.getConfig());
  const [soundscapeActiveCount, setSoundscapeActiveCount] = useState(0);
  const [harmonicKey, setHarmonicKey] = useState<HarmonicKeyResult>(harmonicAnalysisService.getLastResult());
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);

  // Consolidated Menu States
  const [activeMenu, setActiveMenu] = useState<'visualizers' | 'dsp' | 'intel_hub' | 'studio' | 'settings' | 'timer' | null>(null);
  const [dspTab, setDspTab] = useState<'master' | 'spatial' | 'modulation'>('master');
  const [intelTab, setIntelTab] = useState<'harmonic' | 'soundscapes' | 'auramind'>('harmonic');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return pictureInPictureService.subscribe(setIsPipActive);
  }, []);

  useEffect(() => {
    const unsub = soundscapeEngine.subscribe((cfg) => {
      setSoundscapeConfig(cfg);
      const count = [cfg.rain.enabled, cfg.fire.enabled, cfg.cafe.enabled, cfg.ocean.enabled].filter(Boolean).length;
      setSoundscapeActiveCount(count);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = harmonicAnalysisService.subscribe((res) => {
      setHarmonicKey(res);
    });
    return unsub;
  }, []);

  const handleCaptureSnapshot = async () => {
    if (isCapturingSnapshot) return;
    setIsCapturingSnapshot(true);
    const ok = await captureVisualizerSnapshot({
      resolution: '4k',
      trackTitle: currentTrack?.title || 'Aura3D_Visualizer',
    });
    if (ok) {
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 1800);
    }
    setIsCapturingSnapshot(false);
  };

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

  const activeAccent = isLucid ? (lucidPrimaryColor || lucidTheme.primary || 'var(--ios-teal)') : 'var(--color-text-primary)';

  const { mood, dominantPitch, beatPulse, primaryColor: aiColor } = useAIAudioEngine();
  const moodLabels: Record<string, { label: string }> = {
    energetic: { label: 'Energético' },
    happy: { label: 'Alegre' },
    chill: { label: 'Relajado' },
    melancholic: { label: 'Melancólico' },
  };

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
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 pointer-events-auto select-none gap-2 font-sans max-w-full"
    >
      {/* ── CLUSTER 1 (Left): Brand Identity, Track Info & Search ── */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-control flex items-center justify-center bg-surface-dock/90 material-thin border border-border-subtle shadow-subtle transition-colors"
          style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
        >
          <Disc3 className="w-4 h-4" style={{ color: activeAccent }} />
        </div>

        <div className="hidden min-[380px]:flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-[0.15em] font-display text-caption uppercase text-text-primary">
              Auralis
            </span>
            <span className="text-caption tracking-wider uppercase font-display font-tabular px-1.5 py-0.5 rounded-badge border border-border-subtle text-text-tertiary bg-white/[0.02]">
              Studio
            </span>
            <MiniSpectrumBars />
          </div>

          {currentTrack && (
            <div className="hidden md:flex items-center gap-1.5 text-caption text-text-muted truncate max-w-[180px] lg:max-w-[240px]">
              <span className="truncate text-text-secondary font-medium">{currentTrack.title}</span>
              <span className="text-text-muted">•</span>
              <span className="truncate text-text-tertiary">{currentTrack.artist}</span>
            </div>
          )}
        </div>

        {/* Global Command Palette Chip */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 h-7.5 rounded-control bg-surface-dock/60 hover:bg-surface-dock border border-border-subtle text-caption font-mono text-text-tertiary hover:text-text-primary transition-all shadow-subtle pointer-events-auto ml-1 btn-spring cursor-pointer"
          title="Abrir Paleta Universal de Comandos (Ctrl+K / ⌘K)"
          aria-label="Abrir Paleta de Comandos"
        >
          <Keyboard className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Comandos</span>
          <kbd className="px-1.5 py-0.2 rounded-badge bg-white/10 text-caption font-mono text-text-secondary">⌘K</kbd>
        </button>
      </div>

      {/* ── CLUSTER 2 (Center): Stage, DSP Studio & Live Harmony Hub ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 1. Selector de Visualizador 3D / Shaders */}
        <div className="relative">
          {(() => {
            const currentViz = VISUALIZERS.find((v) => v.id === visualizerMode) || VISUALIZERS[0];
            const VizIcon = currentViz.icon;
            return (
              <button
                onClick={() => setActiveMenu(activeMenu === 'visualizers' ? null : 'visualizers')}
                aria-haspopup="true"
                aria-expanded={activeMenu === 'visualizers'}
                aria-label="Seleccionar modo de visualización"
                className={`flex items-center gap-1.5 px-2.5 py-1 h-7.5 rounded-control material-regular border shadow-subtle text-caption font-display transition-all cursor-pointer btn-spring ${
                  activeMenu === 'visualizers'
                    ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan'
                    : 'bg-surface-dock border-border-subtle text-text-primary hover:bg-surface-hover'
                }`}
                title="Seleccionar Modo de Visualización"
              >
                <VizIcon className={`w-3.5 h-3.5 ${activeMenu === 'visualizers' ? 'text-accent-cyan' : 'text-accent-cyan/90'}`} />
                <span className="font-medium text-caption">{currentViz.name}</span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>
            );
          })()}

          {activeMenu === 'visualizers' && (
            <div
              role="menu"
              aria-label="Modos de visualización interactivos"
              className="fixed inset-x-3 top-14 max-w-[280px] mx-auto sm:mx-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:mt-2 sm:w-64 p-2 rounded-modal bg-surface-overlay material-thick border border-border-medium shadow-modal z-50 flex flex-col gap-1 animate-aura-popover"
            >
              <span className="text-caption font-mono text-text-tertiary px-2 pt-1 uppercase tracking-wider">
                Visualizadores Interactivos
              </span>
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
                    className={`flex items-center justify-between p-1.5 rounded-control text-caption font-mono transition-all cursor-pointer btn-spring ${
                      isActive
                        ? 'bg-white/15 text-text-primary border border-border-medium font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-accent-cyan' : 'text-text-muted'}`} />
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-caption text-text-primary">{viz.name}</span>
                        <span className="text-caption text-text-tertiary tracking-wider font-mono">{viz.desc}</span>
                      </div>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-pill bg-accent-cyan" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Efectos & DSP Organizado en 3 Pestañas */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'dsp' ? null : 'dsp')}
            aria-haspopup="true"
            aria-expanded={activeMenu === 'dsp'}
            aria-label="Efectos de Audio y DSP"
            className={`flex items-center gap-1.5 px-2.5 py-1 h-7.5 rounded-control bg-surface-dock material-regular border text-caption font-mono transition-all shadow-subtle cursor-pointer btn-spring ${
              activeMenu === 'dsp' || isAnyDspActive
                ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan'
                : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            title="Efectos de Audio y DSP de Estudio"
          >
            <Headphones className={`w-3.5 h-3.5 ${isAnyDspActive ? 'text-accent-cyan' : 'text-text-muted'}`} />
            <span className="hidden sm:inline text-caption">Efectos & DSP</span>
            <span className="sm:hidden text-caption">DSP</span>
            {isAnyDspActive && <span className="w-1.5 h-1.5 rounded-pill bg-accent-cyan animate-pulse" />}
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          {activeMenu === 'dsp' && (
            <div
              role="region"
              aria-label="Panel de efectos y DSP de audio"
              className="fixed inset-x-3 top-14 max-w-[390px] mx-auto sm:mx-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:mt-2 sm:w-[390px] max-h-[75vh] overflow-y-auto scrollbar-thin p-3 rounded-modal bg-surface-overlay material-thick border border-border-medium shadow-modal z-50 flex flex-col gap-2.5 animate-aura-popover text-caption font-mono"
            >
              {/* Selector de 3 Pestañas Claras */}
              <div className="flex items-center p-0.5 rounded-control bg-surface-base/60 border border-border-subtle text-caption font-mono">
                <button
                  onClick={() => setDspTab('master')}
                  className={`flex-1 py-1.5 px-2 min-h-11 rounded-control transition-all flex items-center justify-center gap-1.5 btn-spring cursor-pointer ${
                    dspTab === 'master'
                      ? 'bg-status-warning text-black font-bold shadow-subtle'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                  title="Mastering Limiter y Mezcla Armónica DJ"
                  aria-label="Pestaña Master y DJ"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Master & DJ</span>
                </button>
                <button
                  onClick={() => setDspTab('spatial')}
                  className={`flex-1 py-1.5 px-2 min-h-11 rounded-control transition-all flex items-center justify-center gap-1.5 btn-spring cursor-pointer ${
                    dspTab === 'spatial'
                      ? 'bg-accent-cyan text-black font-bold shadow-subtle'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                  title="Audio 8D Orbital, Reverb y Frecuencias Binaurales"
                  aria-label="Pestaña Espacial 8D"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Espacial (8D)</span>
                </button>
                <button
                  onClick={() => setDspTab('modulation')}
                  className={`flex-1 py-1.5 px-2 min-h-11 rounded-control transition-all flex items-center justify-center gap-1.5 btn-spring cursor-pointer ${
                    dspTab === 'modulation'
                      ? 'bg-accent-violet text-white font-bold shadow-subtle'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                  title="Velocidad, Pitch DJ, Grano CRT y Cintas de Luz"
                  aria-label="Pestaña Modulación"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Modulación</span>
                </button>
              </div>

              {/* ── PESTAÑA 1: MASTER & DINÁMICA DE ESTUDIO ── */}
              {dspTab === 'master' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-fast">
                  {/* Mastering Limiter Studio */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-text-primary">
                        <Gauge className="w-4 h-4 text-status-warning" />
                        <div>
                          <div className="font-semibold text-caption">Mastering Limiter Studio</div>
                          <div className="text-caption text-text-tertiary font-sans">Compresor multibanda analógico</div>
                        </div>
                      </div>
                      <span className="text-caption font-mono text-status-warning uppercase font-bold px-2 py-0.5 rounded-badge bg-status-warning/10 border border-status-warning/20">
                        {masteringPreset === 'off' ? 'Bypass' : masteringPreset.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { id: 'off', label: 'Bypass Directo', desc: 'Sonido sin procesar' },
                        { id: 'punchy_club', label: 'Club Punch', desc: 'Pegada profunda en kicks' },
                        { id: 'warm_tape', label: 'Tape Glue', desc: 'Calidez analógica cinta' },
                        { id: 'vocal_clarity', label: 'Vocal Clarity', desc: 'Claridad en voces' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setMasteringPreset(p.id as any)}
                          aria-label={`Preset de masterización ${p.label}`}
                          className={`p-2.5 min-h-11 rounded-control text-left transition-all border cursor-pointer btn-spring ${
                            masteringPreset === p.id
                              ? 'bg-status-warning/20 text-text-primary border-status-warning/40 font-bold shadow-subtle'
                              : 'bg-white/[0.02] border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          <div className="text-caption font-semibold">{p.label}</div>
                          <div className="text-caption text-text-muted font-sans leading-tight">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vocal Remover & Karaoke / Instrumental DSP */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-text-primary">
                        <Mic className="w-4 h-4 text-accent-rose" />
                        <div>
                          <div className="font-semibold text-caption">Vocal Remover & Karaoke DSP</div>
                          <div className="text-caption text-text-tertiary font-sans">Procesamiento Mid-Side estéreo</div>
                        </div>
                      </div>
                      <span className="text-caption font-mono text-accent-rose uppercase font-bold px-2 py-0.5 rounded-badge bg-accent-rose/10 border border-accent-rose/20">
                        {vocalMode === 'off' ? 'Normal' : vocalMode === 'karaoke' ? 'Instrumental' : 'A Capela'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {[
                        { id: 'off', label: 'Estéreo', desc: 'Mezcla original' },
                        { id: 'karaoke', label: 'Instrumental', desc: 'Atenúa voz central' },
                        { id: 'acappella', label: 'A Capela', desc: 'Aísla voz humana' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVocalMode(v.id as any)}
                          aria-label={`Modo vocal ${v.label}`}
                          className={`p-2 min-h-11 rounded-control text-left transition-all border cursor-pointer btn-spring ${
                            vocalMode === v.id
                              ? 'bg-accent-rose/20 text-text-primary border-accent-rose/40 font-bold shadow-subtle'
                              : 'bg-white/[0.02] border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          <div className="text-caption font-semibold">{v.label}</div>
                          <div className="text-caption text-text-muted font-sans leading-tight">{v.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Harmonic DJ Sync & Smart Crossfade */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Disc3 className="w-4 h-4 text-accent-violet" />
                        <div>
                          <div className="font-semibold text-caption text-text-primary">Harmonic DJ Sync</div>
                          <div className="text-caption text-text-tertiary font-sans">Crossfade sincronizado en Camelot</div>
                        </div>
                      </div>
                      <button
                        onClick={toggleHarmonicSync}
                        aria-label="Alternar Harmonic DJ Sync"
                        className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                          isHarmonicSyncActive
                            ? 'bg-accent-violet text-white shadow-subtle'
                            : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        {isHarmonicSyncActive ? 'Activo' : 'Off'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                      <div>
                        <div className="font-semibold text-caption text-text-primary">Smart Crossfade (2s)</div>
                        <div className="text-caption text-text-tertiary font-sans">Fundido suave entre pistas</div>
                      </div>
                      <button
                        onClick={toggleCrossfade}
                        aria-label="Alternar Smart Crossfade"
                        className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                          isCrossfadeActive
                            ? 'bg-accent-cyan text-black shadow-subtle'
                            : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        {isCrossfadeActive ? 'Activo' : 'Off'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PESTAÑA 2: ESPACIAL & ACÚSTICA (8D) ── */}
              {dspTab === 'spatial' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-fast">
                  {/* Audio 8D Orbital */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-text-primary">
                        <Radio className="w-4 h-4 text-accent-cyan" />
                        <div>
                          <div className="font-semibold text-caption">Audio 8D Orbital 360°</div>
                          <div className="text-caption text-text-tertiary font-sans">Efecto biaural envolvente dinámico</div>
                        </div>
                      </div>
                      <button
                        onClick={toggle8DAudio}
                        aria-label="Alternar Audio 8D"
                        className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                          is8DAudioActive
                            ? 'bg-accent-cyan text-black shadow-subtle'
                            : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        {is8DAudioActive ? 'Activo' : 'Off'}
                      </button>
                    </div>
                    {is8DAudioActive && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
                        <span className="text-caption text-text-tertiary">Giro:</span>
                        <input
                          type="range"
                          min={0.05}
                          max={0.5}
                          step={0.02}
                          value={eightDSpeed}
                          aria-label="Velocidad de giro 8D"
                          onChange={(e) => set8DSpeed(parseFloat(e.target.value))}
                          className="flex-1 h-1 rounded-pill cursor-pointer"
                        />
                        <span className="text-caption text-accent-cyan w-8 text-right font-mono font-tabular">
                          {(eightDSpeed * 10).toFixed(1)}x
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Club Sumergido */}
                  <div className="flex items-center justify-between p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center gap-2">
                      <Waves className="w-4 h-4 text-accent-cyan flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-caption text-text-primary">Club Sumergido</div>
                        <div className="text-caption text-text-tertiary font-sans">Low-Pass 450Hz (sala contigua)</div>
                      </div>
                    </div>
                    <button
                      onClick={toggleUnderwater}
                      aria-label="Alternar Club Sumergido"
                      className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                        isUnderwaterActive
                          ? 'bg-accent-cyan text-black shadow-subtle'
                          : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {isUnderwaterActive ? 'Activo' : 'Off'}
                    </button>
                  </div>

                  {/* Frecuencias Binaurales & 432Hz */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between text-text-primary">
                      <div>
                        <div className="font-semibold text-caption">Binaurales & 432Hz</div>
                        <div className="text-caption text-text-tertiary font-sans">Afinación armónica y neuro-ondas</div>
                      </div>
                      <span className="text-caption text-status-success uppercase font-bold">{binauralMode}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {[
                        { id: 'off', label: 'Desactivado' },
                        { id: 'alpha', label: 'Alpha 10Hz (Foco)' },
                        { id: 'theta', label: 'Theta 6Hz (Calma)' },
                        { id: 'solfeggio432', label: 'Tono 432Hz Armónico' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBinauralMode(b.id as any)}
                          aria-label={`Modo binaural ${b.label}`}
                          className={`py-1.5 px-2 min-h-11 rounded-control text-caption font-mono text-center transition-all btn-spring cursor-pointer ${
                            binauralMode === b.id
                              ? 'bg-status-success/25 text-text-primary border border-status-success/40 font-bold'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reverb Acústico */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between text-text-primary">
                      <div>
                        <div className="font-semibold text-caption">Reverb Acústico</div>
                        <div className="text-caption text-text-tertiary font-sans">Simulación de espacio 3D</div>
                      </div>
                      <span className="text-caption text-accent-cyan uppercase font-bold">{reverbPreset}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {(['off', 'studio', 'club', 'concert', 'cathedral'] as const).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setReverbPreset(preset)}
                          aria-label={`Preset de reverb ${preset}`}
                          className={`py-1.5 px-1 min-h-11 rounded-control text-caption font-mono capitalize transition-all text-center btn-spring cursor-pointer ${
                            reverbPreset === preset
                              ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/40 font-bold'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          {preset === 'off' ? 'Seco' : preset.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PESTAÑA 3: TIEMPO & MODULACIÓN ── */}
              {dspTab === 'modulation' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-fast">
                  {/* Pitch & Velocidad en Vivo */}
                  <div className="flex flex-col gap-2 p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center justify-between text-text-primary">
                      <div>
                        <div className="font-semibold text-caption">Pitch & Velocidad DJ</div>
                        <div className="text-caption text-text-tertiary font-sans">Modificación de tiempo analógica</div>
                      </div>
                      <span className="text-caption text-accent-cyan uppercase font-bold">{dspSpeedMode}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {[
                        { id: 'normal', label: '1.0x Normal' },
                        { id: 'slowed', label: '0.85x Slowed' },
                        { id: 'nightcore', label: '1.2x Nightcore' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setDspSpeedMode(m.id as any)}
                          aria-label={`Velocidad ${m.label}`}
                          className={`py-1.5 px-2 min-h-11 rounded-control text-caption font-mono text-center transition-all btn-spring cursor-pointer ${
                            dspSpeedMode === m.id
                              ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/40 font-bold'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro Retro CRT */}
                  <div className="flex items-center justify-between p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-text-primary">
                        <Tv className="w-3.5 h-3.5 text-status-warning" />
                        <span className="font-semibold text-caption">Retro CRT & Cinta 35mm</span>
                      </div>
                      <span className="text-caption text-text-tertiary font-sans">Scanlines y grano analógico</span>
                    </div>
                    <button
                      onClick={toggleRetroCrt}
                      aria-label="Alternar Retro CRT"
                      className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                        isRetroCrtActive
                          ? 'bg-status-warning text-black shadow-subtle'
                          : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {isRetroCrtActive ? 'Activo' : 'Off'}
                    </button>
                  </div>

                  {/* Cintas de Luz 3D */}
                  <div className="flex items-center justify-between p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-caption">Cintas de Luz 3D</span>
                      <span className="text-caption text-text-tertiary font-sans">Estelas de neón reactivas en el espacio</span>
                    </div>
                    <button
                      onClick={toggleAudioRibbons}
                      aria-label="Alternar Cintas de Luz"
                      className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                        showAudioRibbons
                          ? 'bg-accent-violet text-white shadow-subtle'
                          : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {showAudioRibbons ? 'Visible' : 'Oculto'}
                    </button>
                  </div>

                  {/* RGB Glitch */}
                  <div className="flex items-center justify-between p-3 rounded-card bg-surface-base/60 border border-border-subtle">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-caption">RGB Glitch en Kicks</span>
                      <span className="text-caption text-text-tertiary font-sans">Desplazamiento cromático reactivo</span>
                    </div>
                    <button
                      onClick={toggleRgbGlitch}
                      aria-label="Alternar RGB Glitch"
                      className={`px-3 py-1.5 min-h-11 rounded-control text-caption font-bold uppercase transition-all btn-spring cursor-pointer ${
                        isRgbGlitchActive
                          ? 'bg-accent-rose text-white shadow-subtle'
                          : 'bg-white/10 text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {isRgbGlitchActive ? 'Activo' : 'Off'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Hub Unificado de Inteligencia Musical & Armonía */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'intel_hub' ? null : 'intel_hub')}
            aria-expanded={activeMenu === 'intel_hub'}
            aria-label="Hub de Inteligencia Musical"
            className={`flex items-center gap-1.5 px-2.5 py-1 h-7.5 rounded-control material-regular border shadow-subtle text-caption font-mono transition-all hover:bg-white/10 cursor-pointer ${
              activeMenu === 'intel_hub' || soundscapeActiveCount > 0
                ? 'border-accent-purple/50 bg-accent-purple/15 text-white'
                : 'border-border-subtle hover:border-accent-purple/40 text-text-primary'
            }`}
            title="Hub de Inteligencia Musical: Tonalidad Camelot DJ, Ambientes Relajantes Lo-Fi y Radar AuraMind"
          >
            {/* Camelot Badge */}
            <span className="text-caption font-bold text-accent-purple bg-accent-purple/20 px-1 py-0.2 rounded-badge border border-accent-purple/30">
              {harmonicKey.camelot}
            </span>
            <span className="hidden md:inline text-caption font-medium text-text-secondary">
              {harmonicKey.shortKey !== '--' ? harmonicKey.shortKey : 'Tonalidad'}
            </span>

            <span className="text-border-subtle hidden sm:inline">|</span>

            {/* Soundscapes indicator */}
            <span className="text-caption flex items-center gap-1 text-accent-teal">
              <CloudRain className="w-3.5 h-3.5 text-accent-teal" />
              {soundscapeActiveCount > 0 && (
                <span className="text-caption px-1.5 py-0.2 bg-accent-teal text-black font-bold rounded-pill">
                  {soundscapeActiveCount}
                </span>
              )}
            </span>

            <span className="text-border-subtle hidden lg:inline">|</span>

            {/* Mood indicator */}
            <span className="hidden lg:flex items-center gap-1 text-caption text-status-warning">
              <Sparkles className="w-3.5 h-3.5 text-status-warning" />
              <span className="text-text-secondary">{moodLabels[mood]?.label}</span>
            </span>

            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary ml-0.5" />
          </button>

          {/* Popover Unificado del Hub de Inteligencia */}
          {activeMenu === 'intel_hub' && (
            <div className="fixed inset-x-3 top-14 max-w-[400px] mx-auto sm:mx-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:mt-2 sm:w-[390px] max-h-[75vh] overflow-y-auto custom-scrollbar p-3.5 rounded-modal material-thick border border-border-subtle shadow-popover z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 text-text-primary font-mono">
              {/* Selector de Pestañas del Hub */}
              <div className="flex items-center p-1 rounded-card bg-surface-base/80 border border-border-subtle text-caption font-mono">
                <button
                  onClick={() => setIntelTab('harmonic')}
                  className={`flex-1 min-h-11 py-1 px-2 rounded-control transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    intelTab === 'harmonic'
                      ? 'bg-accent-purple text-white font-bold shadow-subtle'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Tonalidad & DJ</span>
                </button>
                <button
                  onClick={() => setIntelTab('soundscapes')}
                  className={`flex-1 min-h-11 py-1 px-2 rounded-control transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    intelTab === 'soundscapes'
                      ? 'bg-accent-teal text-black font-bold shadow-subtle'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <CloudRain className="w-4 h-4" />
                  <span>Ambientes Lo-Fi</span>
                </button>
                <button
                  onClick={() => setIntelTab('auramind')}
                  className={`flex-1 min-h-11 py-1 px-2 rounded-control transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    intelTab === 'auramind'
                      ? 'bg-status-warning text-black font-bold shadow-subtle'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AuraMind AI</span>
                </button>
              </div>

              {/* ── SUB-TAB 1: TONALIDAD & CAMELOT DJ ── */}
              {intelTab === 'harmonic' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-fast">
                  {(() => {
                    const compatibleCamelots = getCompatibleCamelots(harmonicKey.camelot);
                    return (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-card bg-accent-purple/10 border border-accent-purple/25">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-control bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center text-h3 font-bold text-accent-purple">
                              {harmonicKey.camelot}
                            </div>
                            <div>
                              <div className="text-body font-bold text-text-primary">
                                {harmonicKey.rootNote} {harmonicKey.mode === 'minor' ? 'Menor (Minor)' : 'Mayor (Major)'}
                              </div>
                              <div className="text-caption text-accent-purple font-sans">
                                {harmonicKey.key || 'Rueda de Quintas Armónica DJ'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-caption px-2 py-1 rounded-pill bg-white/10 text-text-secondary font-bold">
                              {Math.round(harmonicKey.confidence * 100)}% certeza
                            </span>
                          </div>
                        </div>

                        {/* Mezclas Armónicas Compatibles */}
                        <div className="p-2.5 rounded-card bg-surface-base/60 border border-border-subtle">
                          <div className="text-caption text-text-secondary font-semibold mb-1 flex items-center gap-1.5">
                            <Music2 className="w-4 h-4 text-accent-purple" />
                            <span>Transiciones Armónicas Compatibles:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {compatibleCamelots.map((cam) => (
                              <span
                                key={cam}
                                className="px-2.5 py-1 rounded-badge bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-caption font-bold"
                              >
                                {cam}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Rueda de Quintas Interactiva */}
                        <div className="p-2.5 rounded-card bg-surface-base/60 border border-border-subtle">
                          <div className="text-caption text-text-tertiary mb-1.5 uppercase tracking-wider">
                            Círculo de Quintas
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-caption">
                            {CIRCLE_OF_FIFTHS.map((sector) => {
                              const isCurrent =
                                harmonicKey.camelot === sector.camelotMin || harmonicKey.camelot === sector.camelotMaj;
                              const isCompatible =
                                compatibleCamelots.includes(sector.camelotMin) ||
                                compatibleCamelots.includes(sector.camelotMaj);

                              return (
                                <div
                                  key={sector.major}
                                  className={`p-2 rounded-control border text-center transition-all ${
                                    isCurrent
                                      ? 'bg-accent-purple text-white border-accent-purple font-bold shadow-subtle'
                                      : isCompatible
                                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/40'
                                      : 'bg-surface-base/40 text-text-tertiary border-border-subtle'
                                  }`}
                                >
                                  <div className="font-bold text-caption">{sector.major} / {sector.minor}</div>
                                  <div className="text-caption opacity-70 font-tabular">{sector.camelotMaj} • {sector.camelotMin}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── SUB-TAB 2: AMBIENTES RELAJANTES LO-FI ── */}
              {intelTab === 'soundscapes' && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-fast">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-caption text-text-tertiary uppercase tracking-wider">
                      Mezclador de Fondos Relajantes
                    </span>
                    <button
                      onClick={() => soundscapeEngine.toggleMasterMute()}
                      className={`min-h-11 px-3 rounded-control text-caption border transition-all flex items-center gap-1.5 cursor-pointer ${
                        soundscapeConfig.masterMuted
                          ? 'bg-status-error/20 text-status-error border-status-error/40'
                          : 'bg-surface-base/60 text-text-secondary border-border-subtle hover:text-text-primary'
                      }`}
                    >
                      {soundscapeConfig.masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{soundscapeConfig.masterMuted ? 'Muteado' : 'Mute Todo'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {SOUNDSCAPE_CHANNELS.map((ch) => {
                      const state = soundscapeConfig[ch.type];
                      const Icon = ch.icon;

                      return (
                        <div
                          key={ch.type}
                          className={`p-2.5 rounded-card border transition-all ${
                            state.enabled
                              ? 'bg-surface-base/80 border-accent-teal/30 shadow-subtle'
                              : 'bg-surface-base/40 border-border-subtle opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-control bg-surface-elevated/60 border border-border-subtle flex items-center justify-center text-accent-teal">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-body font-semibold text-text-primary">{ch.title}</div>
                                <div className="text-caption text-text-tertiary font-sans">{ch.subtitle}</div>
                              </div>
                            </div>

                            <button
                              onClick={() => soundscapeEngine.toggleChannel(ch.type)}
                              className={`min-h-11 px-3 rounded-control text-caption font-bold uppercase transition-all cursor-pointer ${
                                state.enabled
                                  ? 'bg-accent-teal text-black shadow-subtle'
                                  : 'bg-white/10 text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              {state.enabled ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          {state.enabled && (
                            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border-subtle">
                              <Volume2 className="w-4 h-4 text-accent-teal" />
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.02}
                                value={state.volume}
                                aria-label={`Volumen de ${ch.title}`}
                                onChange={(e) => soundscapeEngine.setVolume(ch.type, parseFloat(e.target.value))}
                                className="flex-1 min-h-11 bg-transparent accent-accent-teal cursor-pointer"
                              />
                              <span className="text-caption text-accent-teal w-10 text-right font-mono font-tabular">
                                {Math.round(state.volume * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 3: AURAMIND & TELEMETRÍA AI ── */}
              {intelTab === 'auramind' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-fast">
                  <div className="p-3 rounded-card bg-status-warning/10 border border-status-warning/25 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-pill transition-transform"
                        style={{
                          backgroundColor: aiColor,
                          boxShadow: `0 0 12px ${aiColor}`,
                          transform: `scale(${1.0 + beatPulse * 0.5})`,
                        }}
                      />
                      <div>
                        <div className="text-body font-bold text-text-primary flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-status-warning" /> Estado: {moodLabels[mood]?.label}
                        </div>
                        <div className="text-caption text-status-warning font-sans">
                          Tono dominante: {dominantPitch} • Pulso: {Math.round(beatPulse * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle text-caption text-text-secondary space-y-1.5 font-sans leading-relaxed">
                    <p>
                      El motor de Inteligencia Artificial analiza el espectro FFT en tiempo real para clasificar la valencia emocional, la tonalidad y sincronizar el campo de energía visual.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAuraMindOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full min-h-11 py-2 px-3 rounded-control bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal border border-accent-teal/40 text-caption font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-subtle cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Abrir Radar 3D AuraMind Completo</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CLUSTER 3 (Right): Grabador, Estudio & Entradas, Ajustes & Lúcido ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* 1. Grabador de Clips & Snapshot 4K */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-dock material-thick border border-border-subtle shadow-subtle">
          <BpmMeter />
          <div className="w-px h-3.5 bg-border-subtle mx-0.5 hidden sm:block" />
          <VideoRecorderButton />

          {/* 4K Snapshot Wallpaper */}
          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturingSnapshot}
            className={`w-7 h-7 sm:w-7.5 sm:h-7.5 p-1 rounded-control transition-all flex items-center justify-center gap-1 cursor-pointer ${
              snapshotSuccess
                ? 'text-status-success bg-status-success/15 border border-status-success/30 font-bold'
                : isCapturingSnapshot
                ? 'text-accent-teal animate-pulse bg-accent-teal/15'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
            }`}
            title="Captura Fondo 4K (Sin interfaz para wallpaper de escritorio)"
            aria-label="Captura Fondo 4K"
          >
            {snapshotSuccess ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Camera className="w-3.5 h-3.5" />}
            <span className="text-caption font-mono hidden xl:inline font-tabular">4K</span>
          </button>

          {/* Auralis Story Card 9:16 Social Export */}
          <button
            onClick={() => setStoryCardOpen(true)}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 p-1 rounded-control transition-all flex items-center justify-center gap-1 text-accent-purple hover:text-white hover:bg-accent-purple/20 cursor-pointer"
            title="Crear Tarjeta Estética para Historias (9:16 para Instagram Stories y TikTok)"
            aria-label="Tarjeta 9:16 para Historias"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
            <span className="text-caption font-mono hidden xl:inline font-tabular">9:16</span>
          </button>
        </div>

        {/* 2. Menú Unificado: Estudio & Entradas (Mic, Sistema, Spotify, Radio, VR, Air Synth, PiP) */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'studio' ? null : 'studio')}
            aria-expanded={activeMenu === 'studio'}
            aria-label="Menú de Estudio y Entradas"
            className={`px-2.5 py-1 h-7.5 rounded-control text-caption font-mono transition-all flex items-center gap-1.5 border shadow-subtle cursor-pointer ${
              activeMenu === 'studio' || isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive
                ? 'bg-accent-teal/15 text-accent-teal border-accent-teal/40'
                : 'material-thick text-text-secondary border-border-subtle hover:text-text-primary hover:bg-white/10'
            }`}
            title="Estudio: Entradas de audio, Radios 24/7, Experiencias 3D y Picture-in-Picture"
          >
            <Layers className="w-3.5 h-3.5 text-accent-teal" />
            <span className="hidden md:inline text-caption">Estudio</span>
            {(isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive) && (
              <span className="w-1.5 h-1.5 rounded-pill bg-accent-teal animate-pulse" />
            )}
            <ChevronDown className="w-3 h-3 text-text-tertiary" />
          </button>

          {activeMenu === 'studio' && (
            <div className="absolute right-0 top-full mt-2 w-72 p-2.5 rounded-modal material-thick border border-border-subtle shadow-popover z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 text-caption font-mono">
              {/* Sección Fuentes */}
              <div>
                <span className="text-caption font-mono text-text-tertiary px-2 uppercase tracking-wider">
                  Fuentes de Audio
                </span>
                <div className="flex flex-col gap-0.5 mt-1">
                  {/* Micrófono */}
                  <button
                    onClick={() => {
                      toggleMicrophone();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isMicActive
                        ? 'bg-status-success/20 text-status-success border border-status-success/30 font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-3.5 h-3.5" />
                      <span>Micrófono en vivo</span>
                    </div>
                    {isMicActive && <span className="w-1.5 h-1.5 rounded-pill bg-status-success" />}
                  </button>

                  {/* Audio de Pantalla / Tab */}
                  <button
                    onClick={() => {
                      startSystemCapture();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isCapturing
                        ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30 font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Cast className="w-3.5 h-3.5" />
                      <span>Audio de Pantalla/Tab</span>
                    </div>
                    {isCapturing && <span className="w-1.5 h-1.5 rounded-pill bg-accent-teal" />}
                  </button>

                  {/* Spotify */}
                  <button
                    onClick={() => {
                      if (isSpotifyConnected) disconnectSpotify();
                      else connectSpotify();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isSpotifyConnected
                        ? 'bg-status-success/20 text-status-success border border-status-success/30 font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-status-success" />
                      <span>{isSpotifyConnected ? 'Spotify Conectado' : 'Conectar Spotify'}</span>
                    </div>
                    {isSpotifyConnected && <span className="w-1.5 h-1.5 rounded-pill bg-status-success" />}
                  </button>

                  {/* Radio Web 24/7 */}
                  <button
                    onClick={() => {
                      const synthwaveStation = RADIO_STATIONS.find((s) => s.id === 'radio_vaporwaves') || RADIO_STATIONS[2];
                      if (synthwaveStation) playRadioStation(synthwaveStation);
                      setActiveMenu(null);
                    }}
                    className="flex items-center justify-between p-2 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-accent-purple" />
                      <span>Radio Synthwave 24/7</span>
                    </div>
                    <span className="text-caption px-1.5 py-0.2 bg-accent-purple/20 text-accent-purple rounded-badge font-bold uppercase">LIVE</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-border-subtle my-0.5" />

              {/* Sección Experiencias Inmersivas */}
              <div>
                <span className="text-caption font-mono text-text-tertiary px-2 uppercase tracking-wider">
                  Experiencias Inmersivas
                </span>
                <div className="flex flex-col gap-0.5 mt-1">
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
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isAirInstrumentsActive
                        ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30 font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Piano className="w-3.5 h-3.5 text-accent-teal" />
                      <span>3D Air Synth (Manos)</span>
                    </div>
                    {isAirInstrumentsActive && <span className="w-1.5 h-1.5 rounded-pill bg-accent-teal" />}
                  </button>

                  {/* VR Pose & Dance */}
                  <button
                    onClick={() => {
                      toggleVrMode();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      vrMode
                        ? 'bg-white/20 text-white border border-white/30 font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5" />
                      <span>VR Dance & Tracker</span>
                    </div>
                    {vrMode && <span className="text-caption px-1.5 py-0.2 bg-white/20 rounded-badge font-bold uppercase">{vrTrackingMode}</span>}
                  </button>

                  {/* Picture-in-Picture (PiP) */}
                  <button
                    onClick={async () => {
                      await pictureInPictureService.togglePictureInPicture();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isPipActive ? 'bg-accent-teal/15 text-accent-teal font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tv className="w-3.5 h-3.5 text-accent-teal" />
                      <span>Ventana Flotante (PiP)</span>
                    </div>
                    <span className="text-caption px-1.5 py-0.2 rounded-badge bg-white/10 font-bold">
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
            onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
            aria-haspopup="true"
            aria-expanded={activeMenu === 'settings'}
            aria-label="Ajustes de Sistema y Herramientas"
            className={`px-2.5 py-1 h-7.5 rounded-control text-caption font-mono transition-all flex items-center gap-1.5 border shadow-subtle cursor-pointer ${
              activeMenu === 'settings' || isEqualizerOpen || isLyricsOpen || isSidebarOpen || sleepTimerMinutes > 0
                ? 'bg-accent-purple/15 text-accent-purple border-accent-purple/40'
                : 'material-thick text-text-secondary border-border-subtle hover:text-text-primary hover:bg-white/10'
            }`}
            title="Ajustes de Sistema: Biblioteca, Letras, Ecualizador, Temporizador, Rendimiento y Atajos"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent-purple" />
            <span className="hidden md:inline text-caption">Ajustes</span>
            {sleepTimerMinutes > 0 && (
              <span className="text-caption font-mono font-bold text-status-warning font-tabular">
                {Math.floor(sleepTimerRemainingSec / 60)}m
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-text-tertiary" />
          </button>

          {activeMenu === 'settings' && (
            <div
              role="menu"
              aria-label="Ajustes de Sistema"
              className="fixed inset-x-3 top-14 max-w-[280px] ml-auto sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 p-2.5 rounded-modal material-thick border border-border-subtle shadow-popover z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 text-caption font-mono"
            >
              {/* Sección Vistas & Utilidades */}
              <div>
                <span className="text-caption font-mono text-text-tertiary px-2 uppercase tracking-wider">
                  Vistas & Utilidades
                </span>
                <div className="flex flex-col gap-0.5 mt-1">
                  {/* Biblioteca */}
                  <button
                    onClick={() => {
                      setSidebarOpen(!isSidebarOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isSidebarOpen ? 'bg-white/15 text-white font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListMusic className="w-3.5 h-3.5 text-accent-purple" />
                      <span>Biblioteca de Pistas</span>
                    </div>
                    <span className="text-caption px-1.5 py-0.2 rounded-badge bg-white/10 text-text-secondary font-bold">B</span>
                  </button>

                  {/* Letras */}
                  <button
                    onClick={() => {
                      setLyricsOpen(!isLyricsOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isLyricsOpen ? 'bg-white/15 text-white font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlignLeft className="w-3.5 h-3.5 text-status-success" />
                      <span>Letras Sincronizadas</span>
                    </div>
                    <span className="text-caption px-1.5 py-0.2 rounded-badge bg-white/10 text-text-secondary font-bold">L</span>
                  </button>

                  {/* Ecualizador Pro-Q */}
                  <button
                    onClick={() => {
                      setEqualizerOpen(!isEqualizerOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-control text-caption font-mono transition-all cursor-pointer ${
                      isEqualizerOpen ? 'bg-white/15 text-white font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-accent-teal" />
                      <span>Ecualizador 10 Bandas</span>
                    </div>
                    <span className="text-caption px-1.5 py-0.2 rounded-badge bg-white/10 text-text-secondary font-bold">E</span>
                  </button>

                  {/* Estadísticas de Sesión */}
                  <button
                    onClick={() => {
                      setSessionStatsOpen(true);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-status-warning" />
                    <span>Estadísticas de Sesión</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-border-subtle my-0.5" />

              {/* Sección Tema & Acento Dinámico */}
              <div>
                <span className="text-caption font-mono text-text-tertiary px-2 uppercase tracking-wider">
                  Tema Visual & Acento
                </span>
                <div className="flex flex-col gap-1.5 mt-1 p-2 rounded-card bg-surface-base/60 border border-border-subtle">
                  {/* Selector de Modo: Auto / Dark / Light */}
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-text-secondary">Tema</span>
                    <div className="flex gap-0.5 p-0.5 rounded-control bg-surface-base/80 border border-border-subtle">
                      {(['auto', 'dark', 'light'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setThemeMode(m)}
                          className={`px-2 py-0.5 rounded-control text-caption font-mono font-medium transition-all cursor-pointer ${
                            themeMode === m
                              ? 'bg-white/20 text-white font-bold shadow-subtle'
                              : 'text-text-tertiary hover:text-text-primary'
                          }`}
                        >
                          {m === 'auto' ? 'Auto' : m === 'dark' ? 'Oscuro' : 'Claro'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Color de Acento */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle">
                    <span className="text-caption text-text-secondary">Acento</span>
                    <div className="flex items-center gap-1.5">
                      {availableAccents.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => setAccentColor(acc.id)}
                          title={acc.label}
                          aria-label={`Seleccionar acento ${acc.label}`}
                          className={`w-5 h-5 rounded-pill transition-transform cursor-pointer ${
                            currentAccent === acc.id
                              ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black'
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: acc.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border-subtle my-0.5" />

              {/* Sección Rendimiento & Hardware */}
              <div>
                <span className="text-caption font-mono text-text-tertiary px-2 uppercase tracking-wider">
                  Hardware & Temporizador
                </span>
                <div className="flex flex-col gap-0.5 mt-1">
                  {/* Rendimiento Gráfico */}
                  <button
                    onClick={cyclePerformanceTier}
                    className="flex items-center justify-between p-2 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-status-warning" />
                      <span>Rendimiento Gráfico</span>
                    </div>
                    <span className="text-caption uppercase font-bold text-status-warning px-1.5 py-0.2 bg-status-warning/15 rounded-badge border border-status-warning/30">
                      {performanceTier}
                    </span>
                  </button>

                  {/* Efectos de Cursor */}
                  <button
                    onClick={toggleMouseEffects}
                    className="flex items-center justify-between p-2 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MousePointer className={`w-3.5 h-3.5 ${mouseEffectsEnabled ? 'text-accent-teal' : 'text-text-tertiary'}`} />
                      <span>Efectos de Cursor</span>
                    </div>
                    <span className="text-caption uppercase font-bold px-1.5 py-0.2 rounded-badge border text-text-tertiary border-border-subtle">
                      {mouseEffectsEnabled ? 'Activo' : 'Eco'}
                    </span>
                  </button>

                  {/* Sleep Timer Preset Rápido */}
                  <div className="flex items-center justify-between p-2 rounded-control bg-surface-base/60 border border-border-subtle">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Clock className="w-3.5 h-3.5 text-status-warning" />
                      <span>Sleep Timer</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setSleepTimer(mins)}
                          className={`px-2 py-0.5 rounded-control text-caption font-mono font-bold transition-all cursor-pointer ${
                            sleepTimerMinutes === mins
                              ? 'bg-status-warning text-black'
                              : 'bg-white/10 text-text-secondary hover:text-text-primary'
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
                    className="flex items-center gap-2 p-2 rounded-control text-caption font-mono text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-accent-blue" />
                    <span>Atajos de Teclado (?)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pod: Estilo Lúcido & Fondo & Idioma */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-dock material-thick border border-border-subtle shadow-subtle">
          <button
            onClick={() => changeLanguage(currentLang === 'es' ? 'en' : 'es')}
            className="h-7 sm:h-7.5 px-2.5 rounded-control text-caption font-mono font-bold text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            title={currentLang === 'es' ? 'Cambiar a English' : 'Switch to Spanish'}
            aria-label={currentLang === 'es' ? 'Cambiar a English' : 'Switch to Spanish'}
          >
            <Globe className="w-3.5 h-3.5 text-accent-teal" />
            <span className="uppercase">{currentLang}</span>
          </button>
          <LucidToggle />
          <BackgroundAtmospherePopover />
        </div>

        {/* 5. Acciones Rápidas: Compartir, Modo Inmersivo & Pantalla Completa */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-dock material-thick border border-border-subtle shadow-subtle">
          <button
            onClick={handleShare}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors hidden sm:flex items-center justify-center cursor-pointer"
            title="Compartir sesión de música"
            aria-label="Compartir"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => updateBlobSettings({ isUiHidden: true })}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-control text-text-secondary hover:text-accent-teal hover:bg-white/10 transition-colors hidden min-[440px]:flex items-center justify-center cursor-pointer"
            title="Modo Galería / Inmersión Pura (Atajo: G)"
            aria-label="Modo Galería"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-teal" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label="Pantalla completa"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Modal AuraMind Radar si se abre */}
      <AuraMindRadar isOpen={isAuraMindOpen} onClose={() => setIsAuraMindOpen(false)} />
    </header>
  );
};

export default HeaderBar;
