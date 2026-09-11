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
  Globe2,
  Sparkles,
  Camera,
  Shield,
  Keyboard,
  Piano,
  User,
  Gauge,
  SlidersHorizontal,
  Grid,
  ChevronDown,
  Layers,
  Radio,
  Wrench,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { LucidToggle } from './LucidToggle';
import { BackgroundAtmospherePopover } from './BackgroundAtmospherePopover';
import { VideoRecorderButton } from './VideoRecorderButton';
import { BpmMeter } from './BpmMeter';
import { GamificationHUD } from '../Gamification/GamificationHUD';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';

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
    toggleProfileModal,
    isPresetsModalOpen,
    togglePresetsModal,
  } = usePlayerStore();

  const { toggleMicrophone, startSystemCapture, isCapturing } = useAudioEngine();
  const { connectSpotify, disconnectSpotify } = useSpotifyPlayer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Grouped Dropdown state ('inputs' | 'experiences' | 'tools' | null)
  const [activeMenu, setActiveMenu] = useState<'inputs' | 'experiences' | 'tools' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 pointer-events-auto select-none gap-2 font-sans max-w-full">
      {/* ── Cluster 1 (Left): Brand identity & Current Track info ── */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
        >
          <Disc3
            className="w-4 h-4"
            style={{ color: activeAccent }}
          />
        </div>

        <div className="hidden min-[380px]:flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-[0.15em] text-xs uppercase text-white/90">
              Auralis
            </span>
            <span className="text-[8px] tracking-wider uppercase font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-white/50 bg-white/[0.02]">
              Studio
            </span>
          </div>

          {currentTrack && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50 truncate max-w-[200px] lg:max-w-[260px]">
              <span className="truncate text-white/80 font-medium">{currentTrack.title}</span>
              <span className="text-white/30">•</span>
              <span className="truncate text-white/50">{currentTrack.artist}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Cluster 2 (Center): Visualizer Mode Switch & Live AI Mood Badge ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center p-0.5 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)]">
          <button
            onClick={() => setVisualizerMode('sphere')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              visualizerMode === 'sphere'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
            }`}
            title="Modo Esfera 3D WebGL"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden min-[540px]:inline">Esfera 3D</span>
          </button>

          <button
            onClick={() => setVisualizerMode('blob')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              visualizerMode === 'blob'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
            }`}
            title="Modo Rainbow Void 2D Shaders"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden min-[540px]:inline">Rainbow Void</span>
          </button>

          <button
            onClick={() => setVisualizerMode('synthwave')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              visualizerMode === 'synthwave'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
            }`}
            title="Modo Synthwave Grid 3D Highway"
          >
            <Grid className="w-3.5 h-3.5 text-[#ff007f]" />
            <span className="hidden min-[540px]:inline">Synthwave 3D</span>
          </button>
        </div>

        {/* Live AI Audio Intelligence Badge */}
        <div
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] text-xs font-mono transition-colors"
          style={{ borderColor: `${aiColor}40` }}
          title={`IA Audio en Tiempo Real: Estado ${moodLabels[mood]?.label || 'En Vivo'} • Tonalidad ${dominantPitch}`}
        >
          <span
            className="w-2 h-2 rounded-full transition-transform duration-100"
            style={{
              backgroundColor: aiColor,
              boxShadow: `0 0 10px ${aiColor}`,
              transform: `scale(${1.0 + beatPulse * 0.45})`,
            }}
          />
          <span className="text-[11px] text-white/90 font-medium">
            {moodLabels[mood]?.icon} {moodLabels[mood]?.label}
          </span>
          <span className="text-[9px] text-white/40 px-1 py-0.2 rounded bg-white/[0.05] border border-white/[0.06] font-bold">
            {dominantPitch}
          </span>
        </div>
      </div>

      {/* ── Cluster 3 (Right): Organized Action Pods ── */}
      <div ref={menuRef} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Pod 1: Atmósfera y Personalización Lúcida */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)]">
          <LucidToggle />
          <BackgroundAtmospherePopover />
        </div>

        {/* Pod 2: Menús Desplegables de Estudio */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)]">
          {/* Dropdown 1: Entradas */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'inputs' ? null : 'inputs')}
              className={`px-2 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                activeMenu === 'inputs' || isMicActive || isCapturing || isSpotifyConnected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'text-white/60 hover:text-white border-transparent hover:bg-white/[0.04]'
              }`}
              title="Entradas de Audio (Micrófono, Sistema, Spotify)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Entradas</span>
              {(isMicActive || isCapturing || isSpotifyConnected) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

          {activeMenu === 'inputs' && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-mono text-white/40 px-2 pt-1 uppercase tracking-wider">
                Fuentes de Audio
              </span>

              {/* Mic toggle */}
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

              {/* System audio capture */}
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

              {/* Spotify integration */}
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
            </div>
          )}
        </div>

        {/* Pod 3: Experiences & VR (Dropdown Popover) */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'experiences' ? null : 'experiences')}
            className={`px-2 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
              activeMenu === 'experiences' || vrMode || isAirInstrumentsActive || isPresetsModalOpen
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
            title="Experiencias Inmersivas (VR, Air Synth, Presets)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Estudio</span>
            {(vrMode || isAirInstrumentsActive) && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {activeMenu === 'experiences' && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-mono text-white/40 px-2 pt-1 uppercase tracking-wider">
                Experiencias 3D & Sensores
              </span>

              {/* Air Instruments */}
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
                  <span>3D Air Synth</span>
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

              {/* Presets Modal */}
              <button
                onClick={() => {
                  togglePresetsModal();
                  setActiveMenu(null);
                }}
                className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span>Presets de Escena</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Pod 4: Tools & Controls (Dropdown Popover) */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
            className={`px-2 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
              activeMenu === 'tools' || isEqualizerOpen || isLyricsOpen || isSidebarOpen
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
            title="Herramientas de Estudio (Ecualizador, Letras, Biblioteca, Configuración)"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Herramientas</span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {activeMenu === 'tools' && (
            <div className="absolute right-0 top-full mt-2 w-60 p-2 rounded-2xl bg-[#080b16]/95 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-mono text-white/40 px-2 pt-1 uppercase tracking-wider">
                Utilidades & Paneles
              </span>

              {/* Equalizer */}
              <button
                onClick={() => {
                  setEqualizerOpen(!isEqualizerOpen);
                  setActiveMenu(null);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-mono transition-all ${
                  isEqualizerOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Ecualizador 10 Bandas</span>
              </button>

              {/* Lyrics */}
              <button
                onClick={() => {
                  setLyricsOpen(!isLyricsOpen);
                  setActiveMenu(null);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-mono transition-all ${
                  isLyricsOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <AlignLeft className="w-4 h-4 text-emerald-400" />
                <span>Letras Sincronizadas</span>
              </button>

              {/* Sidebar Library */}
              <button
                onClick={() => {
                  setSidebarOpen(!isSidebarOpen);
                  setActiveMenu(null);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-mono transition-all ${
                  isSidebarOpen ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListMusic className="w-4 h-4 text-purple-400" />
                <span>Biblioteca & Playlists</span>
              </button>

              {/* Performance Tier */}
              <button
                onClick={cyclePerformanceTier}
                className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  <span>Rendimiento Gráfico</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-300 px-1.5 py-0.5 bg-amber-500/15 rounded border border-amber-500/30">
                  {performanceTier}
                </span>
              </button>

              {/* Profile */}
              <button
                onClick={() => {
                  toggleProfileModal();
                  setActiveMenu(null);
                }}
                className="flex items-center justify-between p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-rose-400" />
                  <span>Perfil de Usuario</span>
                </div>
                <span className="text-[10px] text-white/50">{userProfile?.username || 'Invitado'}</span>
              </button>

              {/* Keyboard Shortcuts */}
              <button
                onClick={() => {
                  toggleShortcutsModal();
                  setActiveMenu(null);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <Keyboard className="w-4 h-4 text-blue-400" />
                <span>Atajos de Teclado (?)</span>
              </button>

              {/* Admin Modal */}
              <button
                onClick={() => {
                  toggleAdminModal();
                  setActiveMenu(null);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-all"
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Admin & Telemetría</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pod 3: Telemetría & Acciones de Grabación/Pantalla */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)]">
          <BpmMeter />
          <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden sm:block" />
          <VideoRecorderButton />
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors hidden sm:flex"
            title="Compartir sesión"
            aria-label="Compartir"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
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
    </header>
  );
};

export default HeaderBar;
