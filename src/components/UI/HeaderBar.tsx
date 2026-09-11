import React, { useState, useEffect } from 'react';
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
  PartyPopper,
  Camera,
  Shield,
  Keyboard,
  Piano,
  User,
  Zap,
  Gauge,
  SlidersHorizontal,
  Grid,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { LucidToggle } from './LucidToggle';
import { VideoRecorderButton } from './VideoRecorderButton';
import { BpmMeter } from './BpmMeter';
import { GamificationHUD } from '../Gamification/GamificationHUD';

export const HeaderBar: React.FC = () => {
  const {
    visualizerMode,
    setVisualizerMode,
    isMicActive,
    vrMode,
    toggleVrMode,
    vrTrackingMode,
    isAdminModalOpen,
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-1.5 sm:px-4 md:px-6 py-1.5 sm:py-2.5 pointer-events-auto select-none gap-1 sm:gap-2 font-sans max-w-full overflow-x-auto scrollbar-none">
      {/* ── Cluster 1 (Left): Brand identity & Current Track info ── */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink-0">
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
        >
          <Disc3
            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50 truncate max-w-[220px]">
              <span className="truncate text-white/80 font-medium">{currentTrack.title}</span>
              <span className="text-white/30">•</span>
              <span className="truncate text-white/50">{currentTrack.artist}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Cluster 2 (Center): Visualizer Mode Segmented Switch ── */}
      <div className="flex items-center p-0.5 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] flex-shrink-0">
        <button
          onClick={() => setVisualizerMode('sphere')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'sphere'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
          }`}
          title="Modo Esfera 3D"
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span className="hidden min-[540px]:inline">Esfera 3D</span>
        </button>

        <button
          onClick={() => setVisualizerMode('blob')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'blob'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
          }`}
          title="Modo Rainbow Void 2D"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden min-[540px]:inline">Rainbow Void</span>
        </button>

        <button
          onClick={() => setVisualizerMode('party')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'party'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
          }`}
          title="Modo Fiesta 3D"
        >
          <PartyPopper className="w-3.5 h-3.5" />
          <span className="hidden min-[540px]:inline">Fiesta 3D</span>
        </button>

        <button
          onClick={() => setVisualizerMode('synthwave')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'synthwave'
              ? 'bg-white/10 text-white border border-white/20 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent hover:bg-white/[0.03]'
          }`}
          title="Modo Synthwave Grid 3D"
        >
          <Grid className="w-3.5 h-3.5 text-[#ff007f]" />
          <span className="hidden min-[540px]:inline">Synthwave</span>
        </button>
      </div>

      {/* ── Cluster 3 (Right): Studio Action Rack Sub-divided by Function ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090d18]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] flex-shrink-0">
        {/* Group A: Live Telemetry & Lucid */}
        <div className="flex items-center gap-1">
          <GamificationHUD />
          <BpmMeter />
          <LucidToggle />
        </div>

        <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden sm:block" />

        {/* Group B: Audio Source Inputs */}
        <div className="flex items-center gap-0.5">
          {/* Live Microphone Input */}
          <button
            onClick={toggleMicrophone}
            className={`p-1.5 rounded-lg transition-colors relative border ${
              isMicActive
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title={isMicActive ? 'Desactivar micrófono' : 'Capturar audio del micrófono'}
            aria-label="Micrófono"
          >
            <Mic className="w-3.5 h-3.5" />
            {isMicActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* System Audio Screen Capture */}
          <button
            onClick={startSystemCapture}
            className={`p-1.5 rounded-lg transition-colors border ${
              isCapturing
                ? 'bg-white/10 text-white border-white/20'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Capturar audio del sistema o pestaña"
            aria-label="Capturar audio"
          >
            <Cast className="w-3.5 h-3.5" />
          </button>

          {/* Spotify Integration Toggle */}
          <button
            onClick={isSpotifyConnected ? disconnectSpotify : connectSpotify}
            className={`p-1.5 rounded-lg transition-colors relative border ${
              isSpotifyConnected
                ? 'bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/30'
                : 'text-white/50 hover:text-[#1DB954] border-transparent hover:bg-white/[0.04]'
            }`}
            title={isSpotifyConnected ? 'Spotify Sincronizado (Clic para desconectar)' : 'Conectar Spotify para letras en tiempo real'}
            aria-label="Spotify"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
            </svg>
            {isSpotifyConnected && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
            )}
          </button>
        </div>

        <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden md:block" />

        {/* Group C: Interactive Hand / VR */}
        <div className="flex items-center gap-0.5">
          {/* VR Tracking Toggle */}
          <button
            onClick={toggleVrMode}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono tracking-wider uppercase transition-colors flex items-center gap-1.5 border ${
              vrMode
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title={vrMode ? `VR Activo (${vrTrackingMode === 'body' ? 'Cuerpo' : 'Manos'})` : 'Activar Interacción VR'}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {vrMode ? (vrTrackingMode === 'body' ? 'VR CUERPO' : 'VR MANOS') : 'VR'}
            </span>
          </button>

          {/* 3D Air Virtual Instruments Button */}
          <button
            onClick={() => {
              const next = !isAirInstrumentsActive;
              setAirInstrumentsActive(next);
              if (next && !vrMode) {
                setVrTrackingMode('hands');
                setVrMode(true);
              }
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono tracking-wider uppercase transition-colors flex items-center gap-1.5 border ${
              isAirInstrumentsActive
                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
                : 'bg-transparent text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title={isAirInstrumentsActive ? 'Instrumentos 3D Activos (Tecla I)' : 'Tocar Instrumentos 3D en el Aire (Tecla I)'}
          >
            <Piano className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="hidden xl:inline">
              {isAirInstrumentsActive ? 'AIR 3D' : 'AIR'}
            </span>
          </button>
        </div>

        <div className="w-px h-3.5 bg-white/[0.08] mx-0.5" />

        {/* Group D: Studio Tools (EQ, Lyrics, Library, Video) */}
        <div className="flex items-center gap-0.5">
          {/* Equalizer Modal Toggle */}
          <button
            onClick={() => setEqualizerOpen(!isEqualizerOpen)}
            className={`p-1.5 rounded-lg transition-colors border ${
              isEqualizerOpen
                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Ecualizador de Estudio"
            aria-label="Ecualizador"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Presets Modal Toggle */}
          <button
            onClick={togglePresetsModal}
            className={`p-1.5 rounded-lg transition-colors border ${
              isPresetsModalOpen
                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Presets de Escena & Atmósferas"
            aria-label="Presets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Lyrics Toggle */}
          <button
            onClick={() => setLyricsOpen(!isLyricsOpen)}
            className={`p-1.5 rounded-lg transition-colors border ${
              isLyricsOpen
                ? 'bg-white/10 text-white border-white/20'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Letras Sincronizadas"
            aria-label="Letras"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Sidebar / Library */}
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg transition-colors border ${
              isSidebarOpen
                ? 'bg-white/10 text-white border-white/20'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Biblioteca y Cola de Reproducción"
            aria-label="Biblioteca"
          >
            <ListMusic className="w-3.5 h-3.5" />
          </button>

          {/* Video & Clip Recorder */}
          <VideoRecorderButton />
        </div>

        <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden lg:block" />

        {/* Group E: Meta Utilities (Admin, Shortcuts, Share, Fullscreen) */}
        <div className="flex items-center gap-0.5">
          {/* Admin Dashboard Toggle */}
          <button
            onClick={toggleAdminModal}
            className={`p-1.5 rounded-lg transition-colors border hidden xl:flex ${
              isAdminModalOpen
                ? 'bg-white/10 text-white border-white/20'
                : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
            }`}
            title="Panel de Telemetría y ML"
            aria-label="Admin"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors hidden sm:flex"
            title="Compartir"
            aria-label="Compartir"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Keyboard Shortcuts Guide */}
          <button
            onClick={toggleShortcutsModal}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors hidden md:flex"
            title="Atajos de teclado de estudio (?)"
            aria-label="Atajos de teclado"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Dynamic Visual Performance Tier Badge (Reflejado en pantalla) */}
          <button
            onClick={cyclePerformanceTier}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono tracking-wider font-semibold uppercase transition-all flex items-center gap-1.5 border select-none cursor-pointer active:scale-95 ${
              performanceTier === 'eco'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : performanceTier === 'medium'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-purple-500/15 text-purple-300 border-purple-500/35 hover:bg-purple-500/25'
            }`}
            title={`Calidad Gráfica: ${
              performanceTier === 'eco'
                ? 'Rendimiento Alto (60 FPS / Modo Fluido)'
                : performanceTier === 'medium'
                ? 'Gráficos Medios (Balanceado)'
                : 'Gráficos Altos (Ultra Calidad WebGL2)'
            } — Clic para alternar`}
          >
            {performanceTier === 'eco' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">REND. ALTO</span>
                <span className="sm:hidden">ALTO</span>
              </>
            ) : performanceTier === 'medium' ? (
              <>
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">GRÁFICOS MEDIOS</span>
                <span className="sm:hidden">MEDIO</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">GRÁFICOS ALTOS</span>
                <span className="sm:hidden">ULTRA</span>
              </>
            )}
          </button>

          {/* User Profile & Performance Settings Button */}
          <button
            onClick={toggleProfileModal}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5 border ${
              !userProfile?.isGuest
                ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
                : 'text-white/60 hover:text-white border-transparent hover:bg-white/[0.04]'
            }`}
            title={`Perfil: ${userProfile?.username || 'Invitado'} — Rendimiento: ${performanceTier === 'eco' ? 'Medio (Eco)' : 'Alta Calidad'}`}
            aria-label="Perfil de usuario"
          >
            <div className="relative">
              <User className="w-3.5 h-3.5" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                  performanceTier === 'eco' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider hidden lg:inline truncate max-w-[80px]">
              {userProfile?.username || 'Invitado'}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
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
