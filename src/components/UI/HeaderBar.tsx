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
} from 'lucide-react';
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
  { id: 'blackhole', name: 'Agujero Negro', icon: Disc3, desc: 'Singularidad cuántica & plasma 3D' },
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
  emoji: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
}> = [
  {
    type: 'rain',
    title: 'Lluvia en Ventana',
    subtitle: 'Ruido rosa 750Hz y gotas suaves',
    emoji: '🌧️',
    icon: CloudRain,
    accentColor: 'text-sky-400',
  },
  {
    type: 'fire',
    title: 'Crepitar de Fogata',
    subtitle: 'Retumbe 140Hz y chispas Poisson',
    emoji: '🔥',
    icon: Flame,
    accentColor: 'text-orange-400',
  },
  {
    type: 'cafe',
    title: 'Cafetería de Noche',
    subtitle: 'Formantes 520Hz/1350Hz acústicos',
    emoji: '☕',
    icon: Coffee,
    accentColor: 'text-amber-400',
  },
  {
    type: 'ocean',
    title: 'Olas del Mar',
    subtitle: 'Oleaje sinusoidal continuo de 8.5s',
    emoji: '🌊',
    icon: Waves,
    accentColor: 'text-teal-400',
  },
];

export const HeaderBar: React.FC = () => {
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
      ? `Escuchando "${currentTrack.title}" por ${currentTrack.artist} en Auralis 🎧`
      : 'Disfrutando de Auralis - Reproductor Inmersivo Web 🎧';

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

  const { mood, dominantPitch, beatPulse, primaryColor: aiColor } = useAIAudioEngine();
  const moodLabels: Record<string, { label: string; icon: string }> = {
    energetic: { label: 'Energético', icon: '⚡' },
    happy: { label: 'Alegre', icon: '✨' },
    chill: { label: 'Relajado', icon: '🌙' },
    melancholic: { label: 'Melancólico', icon: '🌊' },
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
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
        >
          <Disc3 className="w-4 h-4" style={{ color: activeAccent }} />
        </div>

        <div className="hidden min-[380px]:flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-[0.15em] text-xs uppercase text-white/90">
              Auralis
            </span>
            <span className="text-[8px] tracking-wider uppercase font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-white/50 bg-white/[0.02]">
              Studio
            </span>
            <MiniSpectrumBars />
          </div>

          {currentTrack && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50 truncate max-w-[180px] lg:max-w-[240px]">
              <span className="truncate text-white/80 font-medium">{currentTrack.title}</span>
              <span className="text-white/30">•</span>
              <span className="truncate text-white/50">{currentTrack.artist}</span>
            </div>
          )}
        </div>

        {/* Global Command Palette Chip */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-white/50 hover:text-white transition-all shadow-sm pointer-events-auto ml-1"
          title="Abrir Paleta Universal de Comandos (Ctrl+K / ⌘K)"
        >
          <Keyboard className="w-3 h-3 text-cyan-400" />
          <span>Comandos</span>
          <kbd className="px-1 py-0.2 rounded bg-white/10 text-[9px] text-white/70">⌘K</kbd>
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
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#070913]/70 backdrop-blur-3xl border border-white/[0.06] border-t-white/[0.12] text-xs font-mono transition-all shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
                  activeMenu === 'visualizers'
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.04]'
                }`}
                title="Seleccionar Modo de Visualización (Rainbow Void, Synthwave 3D, Warp, Terreno)"
              >
                <VizIcon className={`w-3.5 h-3.5 ${activeMenu === 'visualizers' ? 'text-cyan-400' : 'text-cyan-400/90'}`} />
                <span className="font-medium text-[11px] sm:text-xs">{currentViz.name}</span>
                <ChevronDown className="w-3 h-3 text-white/30" />
              </button>
            );
          })()}

          {activeMenu === 'visualizers' && (
            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-64 p-2 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-mono text-white/40 px-2 pt-1 uppercase tracking-wider">
                Visualizadores Interactivos
              </span>
              {VISUALIZERS.map((viz) => {
                const Icon = viz.icon;
                const isActive = visualizerMode === viz.id;
                return (
                  <button
                    key={viz.id}
                    onClick={() => {
                      setVisualizerMode(viz.id as any);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/20 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-white/40'}`} />
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-xs text-white/90">{viz.name}</span>
                        <span className="text-[9px] text-white/40 tracking-wider font-mono">{viz.desc}</span>
                      </div>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
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
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#070913]/70 backdrop-blur-3xl border border-white/[0.06] border-t-white/[0.12] text-xs font-mono transition-all shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
              activeMenu === 'dsp' || isAnyDspActive
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Efectos de Audio y DSP de Estudio: Masterización, Audio 8D, Reverb, Pitch y Modulación"
          >
            <Headphones className={`w-3.5 h-3.5 ${isAnyDspActive ? 'text-cyan-400' : 'text-white/60'}`} />
            <span className="hidden sm:inline text-[11px]">Efectos & DSP</span>
            <span className="sm:hidden text-[11px]">DSP</span>
            {isAnyDspActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {activeMenu === 'dsp' && (
            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-[350px] sm:w-[390px] max-h-[75vh] overflow-y-auto custom-scrollbar p-3 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 text-xs font-mono">
              {/* Selector de 3 Pestañas Claras */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono">
                <button
                  onClick={() => setDspTab('master')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    dspTab === 'master'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Mastering Limiter y Mezcla Armónica DJ"
                >
                  <Gauge className="w-3 h-3" />
                  <span>Master & DJ</span>
                </button>
                <button
                  onClick={() => setDspTab('spatial')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    dspTab === 'spatial'
                      ? 'bg-cyan-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Audio 8D Orbital, Reverb y Frecuencias Binaurales"
                >
                  <Headphones className="w-3 h-3" />
                  <span>Espacial (8D)</span>
                </button>
                <button
                  onClick={() => setDspTab('modulation')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    dspTab === 'modulation'
                      ? 'bg-fuchsia-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Velocidad, Pitch DJ, Grano CRT y Cintas de Luz"
                >
                  <Tv className="w-3 h-3" />
                  <span>Modulación</span>
                </button>
              </div>

              {/* ── PESTAÑA 1: MASTER & DINÁMICA DE ESTUDIO ── */}
              {dspTab === 'master' && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  {/* Mastering Limiter Studio */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <Gauge className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-semibold text-[11px]">Mastering Limiter Studio</div>
                          <div className="text-[9px] text-white/40 font-sans">Compresor multibanda analógico</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-amber-300 uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {masteringPreset === 'off' ? 'Bypass' : masteringPreset.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {[
                        { id: 'off', label: 'Bypass Directo', desc: 'Sonido sin procesar' },
                        { id: 'punchy_club', label: 'Club Punch', desc: 'Pegada profunda en kicks' },
                        { id: 'warm_tape', label: 'Tape Glue', desc: 'Calidez analógica cinta' },
                        { id: 'vocal_clarity', label: 'Vocal Clarity', desc: 'Claridad en voces' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setMasteringPreset(p.id as any)}
                          className={`p-1.5 rounded-lg text-left transition-all border ${
                            masteringPreset === p.id
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-[10px] font-semibold">{p.label}</div>
                          <div className="text-[8px] text-white/40 font-sans leading-tight">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vocal Remover & Karaoke / Instrumental DSP */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="font-semibold text-[11px]">Vocal Remover & Karaoke DSP</div>
                          <div className="text-[9px] text-white/40 font-sans">Procesamiento Mid-Side estéreo</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-rose-300 uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        {vocalMode === 'off' ? 'Normal' : vocalMode === 'karaoke' ? 'Instrumental' : 'A Capela'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[
                        { id: 'off', label: 'Estéreo', desc: 'Mezcla original' },
                        { id: 'karaoke', label: 'Instrumental', desc: 'Atenúa voz central' },
                        { id: 'acappella', label: 'A Capela', desc: 'Aísla voz humana' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVocalMode(v.id as any)}
                          className={`p-1.5 rounded-lg text-left transition-all border ${
                            vocalMode === v.id
                              ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 font-bold shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-[10px] font-semibold">{v.label}</div>
                          <div className="text-[8px] text-white/40 font-sans leading-tight">{v.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Harmonic DJ Sync & Smart Crossfade */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Disc3 className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="font-semibold text-[11px] text-white/90">Harmonic DJ Sync</div>
                          <div className="text-[9px] text-white/40 font-sans">Crossfade sincronizado en Camelot</div>
                        </div>
                      </div>
                      <button
                        onClick={toggleHarmonicSync}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                          isHarmonicSyncActive
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white/10 text-white/50 hover:text-white'
                        }`}
                      >
                        {isHarmonicSyncActive ? 'Activo' : 'Off'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                      <div>
                        <div className="font-semibold text-[11px] text-white/90">Smart Crossfade (2s)</div>
                        <div className="text-[9px] text-white/40 font-sans">Fundido suave entre pistas</div>
                      </div>
                      <button
                        onClick={toggleCrossfade}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                          isCrossfadeActive
                            ? 'bg-cyan-500 text-black shadow-sm'
                            : 'bg-white/10 text-white/50 hover:text-white'
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
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  {/* Audio 8D Orbital */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="font-semibold text-[11px]">Audio 8D Orbital 360°</div>
                          <div className="text-[9px] text-white/40 font-sans">Efecto biaural envolvente dinámico</div>
                        </div>
                      </div>
                      <button
                        onClick={toggle8DAudio}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                          is8DAudioActive
                            ? 'bg-cyan-500 text-black shadow-sm'
                            : 'bg-white/10 text-white/50 hover:text-white'
                        }`}
                      >
                        {is8DAudioActive ? 'Activo' : 'Off'}
                      </button>
                    </div>
                    {is8DAudioActive && (
                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                        <span className="text-[9px] text-white/50">Giro:</span>
                        <input
                          type="range"
                          min={0.05}
                          max={0.5}
                          step={0.02}
                          value={eightDSpeed}
                          onChange={(e) => set8DSpeed(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-white/20 rounded appearance-none accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-[9px] text-cyan-300 w-8 text-right font-mono">
                          {(eightDSpeed * 10).toFixed(1)}x
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Club Sumergido */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Waves className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-[11px] text-white/90">Club Sumergido</div>
                        <div className="text-[9px] text-white/40 font-sans">Low-Pass 450Hz (fiesta sala de al lado)</div>
                      </div>
                    </div>
                    <button
                      onClick={toggleUnderwater}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                        isUnderwaterActive
                          ? 'bg-sky-400 text-black shadow-sm'
                          : 'bg-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      {isUnderwaterActive ? 'Activo' : 'Off'}
                    </button>
                  </div>

                  {/* Frecuencias Binaurales & 432Hz */}
                  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between text-white/90">
                      <div>
                        <div className="font-semibold text-[11px]">Binaurales & 432Hz</div>
                        <div className="text-[9px] text-white/40 font-sans">Afinación armónica y neuro-ondas</div>
                      </div>
                      <span className="text-[9px] text-emerald-400 uppercase font-bold">{binauralMode}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {[
                        { id: 'off', label: 'Desactivado' },
                        { id: 'alpha', label: 'Alpha 10Hz (Foco)' },
                        { id: 'theta', label: 'Theta 6Hz (Calma)' },
                        { id: 'solfeggio432', label: 'Tono 432Hz Armónico' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBinauralMode(b.id as any)}
                          className={`py-1 px-1.5 rounded-lg text-[9px] font-mono text-center transition-all ${
                            binauralMode === b.id
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reverb Acústico */}
                  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between text-white/90">
                      <div>
                        <div className="font-semibold text-[11px]">Reverb Acústico</div>
                        <div className="text-[9px] text-white/40 font-sans">Simulación de espacio acústico 3D</div>
                      </div>
                      <span className="text-[9px] text-cyan-400 uppercase font-bold">{reverbPreset}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-0.5 pt-1">
                      {(['off', 'studio', 'club', 'concert', 'cathedral'] as const).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setReverbPreset(preset)}
                          className={`py-1 px-1 rounded-md text-[9px] font-mono capitalize transition-all text-center ${
                            reverbPreset === preset
                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
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
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  {/* Pitch & Velocidad en Vivo */}
                  <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between text-white/90">
                      <div>
                        <div className="font-semibold text-[11px]">Pitch & Velocidad DJ</div>
                        <div className="text-[9px] text-white/40 font-sans">Modificación de tiempo analógica</div>
                      </div>
                      <span className="text-[10px] text-cyan-400 uppercase font-bold">{dspSpeedMode}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[
                        { id: 'normal', label: '1.0x Normal' },
                        { id: 'slowed', label: '0.85x Slowed' },
                        { id: 'nightcore', label: '1.2x Nightcore' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setDspSpeedMode(m.id as any)}
                          className={`py-1 px-1 rounded-lg text-[9px] font-mono text-center transition-all ${
                            dspSpeedMode === m.id
                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro Retro CRT */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-white/90">
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-[11px]">Retro CRT & Cinta 35mm</span>
                      </div>
                      <span className="text-[9px] text-white/40 font-sans">Scanlines, viñeta y grano analógico</span>
                    </div>
                    <button
                      onClick={toggleRetroCrt}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                        isRetroCrtActive
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'bg-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      {isRetroCrtActive ? 'Activo' : 'Off'}
                    </button>
                  </div>

                  {/* Cintas de Luz 3D */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white/90 text-[11px]">Cintas de Luz 3D</span>
                      <span className="text-[9px] text-white/40 font-sans">Estelas de neón reactivas en el espacio</span>
                    </div>
                    <button
                      onClick={toggleAudioRibbons}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                        showAudioRibbons
                          ? 'bg-fuchsia-400 text-black shadow-sm'
                          : 'bg-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      {showAudioRibbons ? 'Visible' : 'Oculto'}
                    </button>
                  </div>

                  {/* RGB Glitch */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white/90 text-[11px]">RGB Glitch en Kicks</span>
                      <span className="text-[9px] text-white/40 font-sans">Desplazamiento cromático reactivo a bajos</span>
                    </div>
                    <button
                      onClick={toggleRgbGlitch}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                        isRgbGlitchActive
                          ? 'bg-fuchsia-500 text-black shadow-sm'
                          : 'bg-white/10 text-white/50 hover:text-white'
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
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-xs font-mono transition-all hover:bg-white/[0.05] cursor-pointer ${
              activeMenu === 'intel_hub' || soundscapeActiveCount > 0
                ? 'border-purple-500/60 bg-purple-500/15 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                : 'border-white/[0.08] hover:border-purple-500/40 text-white/90'
            }`}
            title="Hub de Inteligencia Musical: Tonalidad Camelot DJ, Ambientes Relajantes Lo-Fi y Radar AuraMind"
          >
            {/* Camelot Badge */}
            <span className="text-[9px] text-purple-300 font-bold bg-purple-500/20 px-1 py-0.2 rounded border border-purple-500/30">
              {harmonicKey.camelot}
            </span>
            <span className="hidden md:inline text-[11px] font-medium text-white/80">
              {harmonicKey.shortKey !== '--' ? harmonicKey.shortKey : 'Tonalidad'}
            </span>

            <span className="text-white/20 hidden sm:inline">|</span>

            {/* Soundscapes indicator */}
            <span className="text-[11px] flex items-center gap-1 text-cyan-300">
              <span>🌧️</span>
              {soundscapeActiveCount > 0 && (
                <span className="text-[9px] px-1 bg-cyan-400 text-black font-bold rounded-full">
                  {soundscapeActiveCount}
                </span>
              )}
            </span>

            <span className="text-white/20 hidden lg:inline">|</span>

            {/* Mood indicator */}
            <span className="hidden lg:flex items-center gap-1 text-[11px] text-amber-300">
              <span>{moodLabels[mood]?.icon}</span>
              <span className="text-white/80">{moodLabels[mood]?.label}</span>
            </span>

            <ChevronDown className="w-2.5 h-2.5 text-white/40 ml-0.5" />
          </button>

          {/* Popover Unificado del Hub de Inteligencia */}
          {activeMenu === 'intel_hub' && (
            <div className="fixed inset-x-3 top-14 max-w-[400px] mx-auto sm:mx-0 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-full sm:mt-2 sm:w-[390px] max-h-[75vh] overflow-y-auto custom-scrollbar p-3.5 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 text-white font-mono">
              {/* Selector de Pestañas del Hub */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono">
                <button
                  onClick={() => setIntelTab('harmonic')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    intelTab === 'harmonic'
                      ? 'bg-purple-500 text-white font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Tonalidad & DJ</span>
                </button>
                <button
                  onClick={() => setIntelTab('soundscapes')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    intelTab === 'soundscapes'
                      ? 'bg-cyan-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <CloudRain className="w-3 h-3" />
                  <span>Ambientes Lo-Fi</span>
                </button>
                <button
                  onClick={() => setIntelTab('auramind')}
                  className={`flex-1 py-1 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    intelTab === 'auramind'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AuraMind AI</span>
                </button>
              </div>

              {/* ── SUB-TAB 1: TONALIDAD & CAMELOT DJ ── */}
              {intelTab === 'harmonic' && (
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                  {/* Banner Tonalidad Detectada */}
                  {/* Banner Tonalidad Detectada */}
                  {(() => {
                    const compatibleCamelots = getCompatibleCamelots(harmonicKey.camelot);
                    return (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/25">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg font-bold text-purple-300">
                              {harmonicKey.camelot}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">
                                {harmonicKey.rootNote} {harmonicKey.mode === 'minor' ? 'Menor (Minor)' : 'Mayor (Major)'}
                              </div>
                              <div className="text-[9px] text-purple-300/80 font-sans">
                                {harmonicKey.key || 'Rueda de Quintas Armónica DJ'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-bold">
                              {Math.round(harmonicKey.confidence * 100)}% certeza
                            </span>
                          </div>
                        </div>

                        {/* Mezclas Armónicas Compatibles */}
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="text-[10px] text-white/70 font-semibold mb-1 flex items-center gap-1">
                            <Music2 className="w-3 h-3 text-purple-400" />
                            <span>Transiciones Armónicas Compatibles:</span>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {compatibleCamelots.map((cam) => (
                              <span
                                key={cam}
                                className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-bold"
                              >
                                {cam}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Rueda de Quintas Interactiva */}
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <div className="text-[10px] text-white/50 mb-1.5 uppercase tracking-wider">
                            Círculo de Quintas
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-[10px]">
                            {CIRCLE_OF_FIFTHS.map((sector) => {
                              const isCurrent =
                                harmonicKey.camelot === sector.camelotMin || harmonicKey.camelot === sector.camelotMaj;
                              const isCompatible =
                                compatibleCamelots.includes(sector.camelotMin) ||
                                compatibleCamelots.includes(sector.camelotMaj);

                              return (
                                <div
                                  key={sector.major}
                                  className={`p-1.5 rounded-lg border text-center transition-all ${
                                    isCurrent
                                      ? 'bg-purple-500 text-white border-purple-400 font-bold shadow-sm'
                                      : isCompatible
                                      ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                                      : 'bg-white/[0.02] text-white/40 border-white/[0.04]'
                                  }`}
                                >
                                  <div className="font-bold text-[10px]">{sector.major} / {sector.minor}</div>
                                  <div className="text-[8px] opacity-70">{sector.camelotMaj} • {sector.camelotMin}</div>
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
                <div className="flex flex-col gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Mezclador de Fondos Relajantes
                    </span>
                    <button
                      onClick={() => soundscapeEngine.toggleMasterMute()}
                      className={`p-1 px-2 rounded-lg text-[9px] border transition-all flex items-center gap-1 ${
                        soundscapeConfig.masterMuted
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {soundscapeConfig.masterMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      <span>{soundscapeConfig.masterMuted ? 'Muteado' : 'Mute Todo'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {SOUNDSCAPE_CHANNELS.map((ch) => {
                      const state = soundscapeConfig[ch.type];
                      const Icon = ch.icon;

                      return (
                        <div
                          key={ch.type}
                          className={`p-2 rounded-xl border transition-all ${
                            state.enabled
                              ? 'bg-white/[0.05] border-cyan-500/30 shadow-sm'
                              : 'bg-white/[0.02] border-white/[0.05] opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{ch.emoji}</span>
                              <div>
                                <div className="text-xs font-semibold text-white/90">{ch.title}</div>
                                <div className="text-[8px] text-white/40 font-sans">{ch.subtitle}</div>
                              </div>
                            </div>

                            <button
                              onClick={() => soundscapeEngine.toggleChannel(ch.type)}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all ${
                                state.enabled
                                  ? 'bg-cyan-500 text-black shadow-sm'
                                  : 'bg-white/10 text-white/50 hover:text-white'
                              }`}
                            >
                              {state.enabled ? 'ON' : 'OFF'}
                            </button>
                          </div>

                          {state.enabled && (
                            <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-white/[0.04]">
                              <Volume2 className="w-3 h-3 text-cyan-400/80" />
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.02}
                                value={state.volume}
                                onChange={(e) => soundscapeEngine.setVolume(ch.type, parseFloat(e.target.value))}
                                className="flex-1 h-1 bg-white/20 rounded appearance-none accent-cyan-400 cursor-pointer"
                              />
                              <span className="text-[9px] text-cyan-300 w-7 text-right font-mono">
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
                <div className="flex flex-col gap-2.5 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full transition-transform"
                        style={{
                          backgroundColor: aiColor,
                          boxShadow: `0 0 12px ${aiColor}`,
                          transform: `scale(${1.0 + beatPulse * 0.5})`,
                        }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {moodLabels[mood]?.icon} Estado: {moodLabels[mood]?.label}
                        </div>
                        <div className="text-[9px] text-amber-300/80 font-sans">
                          Tono dominante: {dominantPitch} • Pulso: {Math.round(beatPulse * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-white/70 space-y-1.5 font-sans leading-relaxed">
                    <p>
                      El motor de Inteligencia Artificial analiza el espectro FFT en tiempo real para clasificar la valencia emocional, la tonalidad y sincronizar el campo de energía visual.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAuraMindOpen(true);
                      setActiveMenu(null);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Abrir Radar 3D AuraMind Completo</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
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
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)]">
          <BpmMeter />
          <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden sm:block" />
          <VideoRecorderButton />

          {/* 4K Snapshot Wallpaper */}
          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturingSnapshot}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
              snapshotSuccess
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold'
                : isCapturingSnapshot
                ? 'text-cyan-400 animate-pulse bg-cyan-500/15'
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Captura Fondo 4K (Sin interfaz para wallpaper de escritorio)"
            aria-label="Captura Fondo 4K"
          >
            {snapshotSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Camera className="w-3.5 h-3.5" />}
            <span className="text-[9px] font-mono hidden xl:inline">4K</span>
          </button>

          {/* Auralis Story Card 9:16 Social Export */}
          <button
            onClick={() => setStoryCardOpen(true)}
            className="p-1.5 rounded-lg transition-all flex items-center gap-1 text-purple-300 hover:text-purple-200 hover:bg-purple-500/15"
            title="Crear Tarjeta Estética para Historias (9:16 para Instagram Stories y TikTok)"
            aria-label="Tarjeta 9:16 para Historias"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[9px] font-mono hidden xl:inline">9:16</span>
          </button>
        </div>

        {/* 2. Menú Unificado: Estudio & Entradas (Mic, Sistema, Spotify, Radio, VR, Air Synth, PiP) */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'studio' ? null : 'studio')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
              activeMenu === 'studio' || isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                : 'bg-[#070913]/70 backdrop-blur-3xl text-white/70 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Estudio: Entradas de audio, Radios 24/7, Experiencias 3D y Picture-in-Picture"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline text-[11px]">Estudio</span>
            {(isMicActive || isCapturing || isSpotifyConnected || vrMode || isAirInstrumentsActive || isPipActive) && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {activeMenu === 'studio' && (
            <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 text-xs font-mono">
              {/* Sección Fuentes */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Fuentes de Audio
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  {/* Micrófono */}
                  <button
                    onClick={() => {
                      toggleMicrophone();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isMicActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      <span>Micrófono en vivo</span>
                    </div>
                    {isMicActive && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>

                  {/* Audio de Pantalla / Tab */}
                  <button
                    onClick={() => {
                      startSystemCapture();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isCapturing
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Cast className="w-4 h-4" />
                      <span>Audio de Pantalla/Tab</span>
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
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isSpotifyConnected
                        ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
                      </svg>
                      <span>{isSpotifyConnected ? 'Spotify Conectado' : 'Conectar Spotify'}</span>
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
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-fuchsia-400" />
                      <span>Radio Synthwave 24/7</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-fuchsia-500/20 text-fuchsia-300 rounded font-bold uppercase">LIVE</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-0.5" />

              {/* Sección Experiencias Inmersivas */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Experiencias Inmersivas
                </span>
                <div className="flex flex-col gap-1 mt-1">
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
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isAirInstrumentsActive
                        ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Piano className="w-4 h-4 text-[#00e5ff]" />
                      <span>3D Air Synth (Manos)</span>
                    </div>
                    {isAirInstrumentsActive && <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />}
                  </button>

                  {/* VR Pose & Dance */}
                  <button
                    onClick={() => {
                      toggleVrMode();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      vrMode
                        ? 'bg-white/15 text-white border border-white/25 font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>VR Dance & Tracker</span>
                    </div>
                    {vrMode && <span className="text-[9px] px-1 bg-white/20 rounded font-bold uppercase">{vrTrackingMode}</span>}
                  </button>

                  {/* Picture-in-Picture (PiP) */}
                  <button
                    onClick={async () => {
                      await pictureInPictureService.togglePictureInPicture();
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isPipActive ? 'bg-cyan-500/15 text-cyan-300 font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-cyan-400" />
                      <span>Ventana Flotante (PiP)</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 font-bold">
                      {isPipActive ? 'ON' : 'POP'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Menú Unificado: Ajustes & Sistema (Biblioteca, Letras, EQ, Estadísticas, Rendimiento, Mouse, Sleep Timer) */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
              activeMenu === 'settings' || isEqualizerOpen || isLyricsOpen || isSidebarOpen || sleepTimerMinutes > 0
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                : 'bg-[#070913]/70 backdrop-blur-3xl text-white/70 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Ajustes de Sistema: Biblioteca, Letras, Ecualizador, Temporizador, Rendimiento y Atajos"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline text-[11px]">Ajustes</span>
            {sleepTimerMinutes > 0 && (
              <span className="text-[9px] font-mono font-bold text-amber-300">
                {Math.floor(sleepTimerRemainingSec / 60)}m
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {activeMenu === 'settings' && (
            <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 text-xs font-mono">
              {/* Sección Vistas & Utilidades */}
              <div>
                <span className="text-[10px] font-mono text-white/40 px-2 uppercase tracking-wider">
                  Vistas & Utilidades
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  {/* Biblioteca */}
                  <button
                    onClick={() => {
                      setSidebarOpen(!isSidebarOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isSidebarOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-purple-400" />
                      <span>Biblioteca de Pistas</span>
                    </div>
                    {isSidebarOpen && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                  </button>

                  {/* Letras */}
                  <button
                    onClick={() => {
                      setLyricsOpen(!isLyricsOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isLyricsOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-emerald-400" />
                      <span>Letras Sincronizadas</span>
                    </div>
                    {isLyricsOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>

                  {/* Ecualizador Pro-Q */}
                  <button
                    onClick={() => {
                      setEqualizerOpen(!isEqualizerOpen);
                      setActiveMenu(null);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-all ${
                      isEqualizerOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>Ecualizador 10 Bandas</span>
                    </div>
                    {isEqualizerOpen && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>

                  {/* Estadísticas de Sesión */}
                  <button
                    onClick={() => {
                      setSessionStatsOpen(true);
                      setActiveMenu(null);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Estadísticas de Sesión</span>
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
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <span>Rendimiento Gráfico</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold text-amber-300 px-1.5 py-0.5 bg-amber-500/15 rounded border border-amber-500/30">
                      {performanceTier}
                    </span>
                  </button>

                  {/* Efectos de Mouse */}
                  <button
                    onClick={toggleMouseEffects}
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MousePointer className={`w-4 h-4 ${mouseEffectsEnabled ? 'text-cyan-400' : 'text-white/40'}`} />
                      <span>Efectos de Cursor</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border text-white/50 border-white/10">
                      {mouseEffectsEnabled ? 'Activo' : 'Eco'}
                    </span>
                  </button>

                  {/* Sleep Timer Preset Rápido */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Sleep Timer</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setSleepTimer(mins)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
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
                    className="flex items-center gap-2 p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Keyboard className="w-4 h-4 text-blue-400" />
                    <span>Atajos de Teclado (?)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Pod: Estilo Lúcido & Fondo */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070913]/70 backdrop-blur-3xl border border-white/[0.06] border-t-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <LucidToggle />
          <BackgroundAtmospherePopover />
        </div>

        {/* 5. Acciones Rápidas: Compartir, Modo Inmersivo & Pantalla Completa */}
        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#070913]/70 backdrop-blur-3xl border border-white/[0.06] border-t-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors hidden sm:flex"
            title="Compartir sesión de música"
            aria-label="Compartir"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => updateBlobSettings({ isUiHidden: true })}
            className="p-1.5 rounded-lg text-white/50 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors hidden min-[440px]:flex"
            title="Modo Galería / Inmersión Pura (Atajo: G)"
            aria-label="Modo Galería"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors"
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
