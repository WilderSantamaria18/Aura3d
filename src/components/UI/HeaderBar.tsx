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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { LucidToggle } from './LucidToggle';

export const HeaderBar: React.FC = () => {
  const {
    visualizerMode,
    setVisualizerMode,
    isMicActive,
    vrMode,
    toggleVrMode,
    vrTrackingMode,
    isEqualizerOpen,
    setEqualizerOpen,
    isLyricsOpen,
    setLyricsOpen,
    isSidebarOpen,
    setSidebarOpen,
    currentTrack,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { toggleMicrophone, startSystemCapture, isCapturing } = useAudioEngine();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Force instant resize event to trigger Three.js camera & Canvas re-projections
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
      ? `Escuchando "${currentTrack.title}" por ${currentTrack.artist} en Auralis 🎧✨`
      : 'Disfrutando de Auralis - Reproductor Inmersivo Web 🎧✨';

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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-2.5 sm:px-6 py-2.5 sm:py-4 pointer-events-auto select-none gap-2">
      {/* Brand logo & Studio badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/60 border border-white/15 flex items-center justify-center backdrop-blur-md shadow-sm">
          <Disc3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 animate-[spin_12s_linear_infinite]" />
        </div>
        <div className="hidden min-[480px]:flex items-center gap-1.5">
          <h1 className="text-white font-medium tracking-[0.18em] text-xs sm:text-sm uppercase">
            Auralis
          </h1>
          <span className="text-[8px] sm:text-[9px] tracking-widest text-cyan-300/60 uppercase font-mono px-1 py-0.5 rounded border border-cyan-400/20 bg-cyan-400/5">
            PRO
          </span>
        </div>
      </div>

      {/* Visualizer Mode Switcher Tabs (Esfera 3D, Rainbow Void, Modo Fiesta) */}
      <div
        className="flex items-center bg-black/60 backdrop-blur-xl border border-white/10 p-0.5 sm:p-1 rounded-full shadow-lg transition-all flex-shrink-0"
        style={
          isLucid
            ? {
                borderColor: `${lucidTheme.primary}45`,
                boxShadow: `0 0 20px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Tab 1: Esfera 3D */}
        <button
          onClick={() => setVisualizerMode('sphere')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide transition-all ${
            visualizerMode === 'sphere'
              ? isLucid
                ? 'text-white border shadow-md'
                : 'bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 text-cyan-200 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,242,254,0.25)]'
              : 'text-white/60 hover:text-white/90'
          }`}
          style={
            visualizerMode === 'sphere' && isLucid
              ? {
                  background: `linear-gradient(90deg, ${lucidTheme.primary}35, ${lucidTheme.secondary}35)`,
                  borderColor: `${lucidTheme.primary}80`,
                  color: lucidTheme.primary,
                  boxShadow: `0 0 12px ${lucidTheme.glow}`,
                }
              : undefined
          }
        >
          <Globe2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden min-[420px]:inline">Esfera</span>
          <span className="inline min-[420px]:hidden">3D</span>
        </button>

        {/* Tab 2: Rainbow Void */}
        <button
          onClick={() => setVisualizerMode('blob')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide transition-all ${
            visualizerMode === 'blob'
              ? isLucid
                ? 'text-white border shadow-md'
                : 'bg-gradient-to-r from-pink-500/30 to-yellow-500/30 text-pink-200 border border-pink-400/40 shadow-[0_0_12px_rgba(255,8,138,0.25)]'
              : 'text-white/60 hover:text-white/90'
          }`}
          style={
            visualizerMode === 'blob' && isLucid
              ? {
                  background: `linear-gradient(90deg, ${lucidTheme.secondary}35, ${lucidTheme.primary}35)`,
                  borderColor: `${lucidTheme.secondary}80`,
                  color: lucidTheme.secondary,
                  boxShadow: `0 0 12px ${lucidTheme.glow}`,
                }
              : undefined
          }
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden min-[420px]:inline">Rainbow</span>
          <span className="inline min-[420px]:hidden">Void</span>
        </button>

        {/* Tab 3: Modo Fiesta */}
        <button
          onClick={() => setVisualizerMode('party')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide transition-all ${
            visualizerMode === 'party'
              ? 'bg-gradient-to-r from-yellow-500/30 via-pink-500/30 to-purple-500/30 text-yellow-200 border border-pink-500/50 shadow-[0_0_15px_rgba(255,0,127,0.35)] animate-pulse'
              : 'text-white/60 hover:text-white/90'
          }`}
        >
          <PartyPopper className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400" />
          <span className="hidden min-[420px]:inline">Fiesta</span>
          <span className="inline min-[420px]:hidden">3D</span>
        </button>
      </div>

      {/* Right Controls & Utilities */}
      <div
        className="flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-lg flex-wrap transition-all"
        style={
          isLucid
            ? {
                borderColor: `${lucidTheme.primary}45`,
                boxShadow: `0 0 20px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Lucid Mode Toggle */}
        <LucidToggle />

        {/* Dual VR Tracking Mode Toggle (Body / Hands) */}
        <button
          onClick={toggleVrMode}
          className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-1.5 ${
            vrMode
              ? vrTrackingMode === 'body'
                ? 'bg-pink-500/25 text-pink-300 border border-pink-400/50 shadow-[0_0_15px_rgba(255,8,138,0.4)] animate-pulse'
                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(0,255,179,0.4)] animate-pulse'
              : 'text-white/60 hover:text-emerald-300 hover:bg-white/5'
          }`}
          title={
            vrMode
              ? `VR Activo (${vrTrackingMode === 'body' ? 'Cuerpo 33P' : '2 Manos 21P'}). Clic para desactivar.`
              : 'Activar Interacción VR (Cuerpo 33P / 2 Manos 21P)'
          }
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {vrMode ? (vrTrackingMode === 'body' ? 'VR CUERPO' : 'VR MANOS') : 'VR CAM'}
          </span>
        </button>

        {/* System Audio Screen / Tab Capture */}
        <button
          onClick={startSystemCapture}
          className={`p-2 rounded-full transition-all text-xs flex items-center gap-1 ${
            isCapturing
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(0,255,179,0.3)]'
              : 'text-white/60 hover:text-emerald-300 hover:bg-white/5'
          }`}
          title="Capturar audio del sistema o pestaña del navegador"
        >
          <Cast className="w-4 h-4" />
        </button>

        {/* Live Microphone Input Toggle */}
        <button
          onClick={toggleMicrophone}
          className={`p-2 rounded-full transition-all relative ${
            isMicActive
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_12px_rgba(255,8,138,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title={isMicActive ? 'Desactivar micrófono en vivo' : 'Capturar audio del micrófono en vivo'}
        >
          <Mic className={`w-4 h-4 ${isMicActive ? 'animate-pulse' : ''}`} />
          {isMicActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
          )}
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* Library / Queue */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`p-2 rounded-full transition-all ${
            isSidebarOpen
              ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Biblioteca y Cola"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Equalizer */}
        <button
          onClick={() => setEqualizerOpen(!isEqualizerOpen)}
          className={`p-2 rounded-full transition-all ${
            isEqualizerOpen
              ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Ecualizador"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Lyrics */}
        <button
          onClick={() => setLyricsOpen(!isLyricsOpen)}
          className={`p-2 rounded-full transition-all ${
            isLyricsOpen
              ? 'bg-pink-500/20 text-pink-400 shadow-[0_0_10px_rgba(255,8,138,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Letras Karaoke"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all"
          title="Compartir"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
