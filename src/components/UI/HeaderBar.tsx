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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { LucidToggle } from './LucidToggle';
import { VideoRecorderButton } from './VideoRecorderButton';
import { BpmMeter } from './BpmMeter';

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
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 pointer-events-auto select-none gap-2 font-sans">
      {/* ── Left: Brand identity & Current Track info ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#0A0A0F]/90 backdrop-blur-md border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          style={{ borderColor: isLucid ? `${activeAccent}40` : undefined }}
        >
          <Disc3
            className="w-4 h-4"
            style={{ color: activeAccent }}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium tracking-[0.14em] text-xs uppercase text-white/90">
              Auralis
            </span>
            <span className="text-[8px] tracking-wider uppercase font-mono px-1 py-0.2 rounded border border-white/[0.1] text-white/40 bg-white/[0.03]">
              Studio
            </span>
          </div>

          {currentTrack && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50 truncate max-w-[220px]">
              <span className="truncate text-white/80 font-medium">{currentTrack.title}</span>
              <span className="text-white/30">•</span>
              <span className="truncate">{currentTrack.artist}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Visualizer Mode Segmented Switch ── */}
      <div className="flex items-center p-0.5 rounded-xl bg-[#0A0A0F]/90 backdrop-blur-md border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex-shrink-0">
        <button
          onClick={() => setVisualizerMode('sphere')}
          className={`flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'sphere'
              ? 'bg-white/10 text-white border border-white/15 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent'
          }`}
          title="Modo Esfera 3D"
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span className="hidden min-[480px]:inline">Esfera 3D</span>
        </button>

        <button
          onClick={() => setVisualizerMode('blob')}
          className={`flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'blob'
              ? 'bg-white/10 text-white border border-white/15 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent'
          }`}
          title="Modo Rainbow Void 2D"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden min-[480px]:inline">Rainbow Void</span>
        </button>

        <button
          onClick={() => setVisualizerMode('party')}
          className={`flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            visualizerMode === 'party'
              ? 'bg-white/10 text-white border border-white/15 shadow-sm'
              : 'text-white/50 hover:text-white/80 border border-transparent'
          }`}
          title="Modo Fiesta 3D"
        >
          <PartyPopper className="w-3.5 h-3.5" />
          <span className="hidden min-[480px]:inline">Fiesta 3D</span>
        </button>
      </div>

      {/* ── Right: Studio Action Rack Cluster ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0A0F]/90 backdrop-blur-md border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex-shrink-0">
        {/* Real-time BPM & Beat Pulse Meter */}
        <BpmMeter />

        {/* Lucid Mode Toggle */}
        <LucidToggle />

        {/* VR Tracking Toggle */}
        <button
          onClick={toggleVrMode}
          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium tracking-wide uppercase transition-colors flex items-center gap-1.5 border ${
            vrMode
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-transparent text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
          }`}
          title={vrMode ? `VR Activo (${vrTrackingMode === 'body' ? 'Cuerpo' : 'Manos'})` : 'Activar Interacción VR'}
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-[10px]">
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
          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium tracking-wide uppercase transition-colors flex items-center gap-1.5 border ${
            isAirInstrumentsActive
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
              : 'bg-transparent text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
          }`}
          title={isAirInstrumentsActive ? 'Instrumentos 3D Activos (Tecla I)' : 'Tocar Instrumentos 3D en el Aire (Tecla I)'}
        >
          <Piano className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline text-[10px]">
            {isAirInstrumentsActive ? 'AIR 3D' : 'AIR'}
          </span>
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

        {/* Live Microphone Input */}
        <button
          onClick={toggleMicrophone}
          className={`p-1.5 rounded-lg transition-colors relative border ${
            isMicActive
              ? 'bg-white/10 text-white border-white/20'
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

        {/* Spotify Integration Toggle */}
        <button
          onClick={isSpotifyConnected ? disconnectSpotify : connectSpotify}
          className={`p-1.5 rounded-lg transition-colors relative border ${
            isSpotifyConnected
              ? 'bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/40 shadow-[0_0_10px_rgba(29,185,84,0.3)]'
              : 'text-white/50 hover:text-[#1DB954] border-transparent hover:bg-white/[0.04]'
          }`}
          title={isSpotifyConnected ? 'Spotify Sincronizado (Clic para desconectar)' : 'Conectar Spotify para letras en tiempo real'}
          aria-label="Spotify"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
          </svg>
          {isSpotifyConnected && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping" />
          )}
        </button>

        <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 hidden sm:block" />

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

        {/* Equalizer Modal Toggle */}
        <button
          onClick={() => setEqualizerOpen(!isEqualizerOpen)}
          className={`p-1.5 rounded-lg transition-colors border ${
            isEqualizerOpen
              ? 'bg-white/10 text-white border-white/20'
              : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.04]'
          }`}
          title="Ecualizador de Estudio"
          aria-label="Ecualizador"
        >
          <Sliders className="w-3.5 h-3.5" />
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

        {/* Admin Dashboard Toggle */}
        <button
          onClick={toggleAdminModal}
          className={`p-1.5 rounded-lg transition-colors border ${
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
          className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          title="Compartir"
          aria-label="Compartir"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
        </button>

        {/* Video & Clip Recorder */}
        <VideoRecorderButton />

        {/* Keyboard Shortcuts Guide */}
        <button
          onClick={toggleShortcutsModal}
          className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
          title="Atajos de teclado de estudio (?)"
          aria-label="Atajos de teclado"
        >
          <Keyboard className="w-3.5 h-3.5" />
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
    </header>
  );
};

export default HeaderBar;
