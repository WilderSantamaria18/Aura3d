/**
 * VideoTheaterModal — Widescreen Cinema Stage with Reactive Ambilight
 *
 * visionOS / Apple Cinema Aesthetic:
 *  - Floating 16:9 Cinema Canvas with deep black glass framing
 *  - Dynamic Reactive Ambilight: Multi-stage glowing aura synced with real-time audio bass & beat
 *  - Auto-hiding VisionOS glass transport deck
 *  - Instant zero-reload transition from MiniPlayer via GlobalYouTubePlayer singleton
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { GlobalYouTubePlayer } from './GlobalYouTubePlayer';
import { audioEngine } from '../../services/audioEngine';
import { formatClock } from '../../hooks/usePlaybackLoop';

type AmbilightMode = 'reactive' | 'static' | 'off';

export const VideoTheaterModal: React.FC = () => {
  const isVideoTheaterOpen = usePlayerStore((s) => s.isVideoTheaterOpen);
  const setVideoTheaterOpen = usePlayerStore((s) => s.setVideoTheaterOpen);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const lucidPrimaryColor = usePlayerStore((s) => s.lucidPrimaryColor);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);

  const { togglePlay, playNext, playPrevious, setVolume, toggleMute, seek } = useAudioPlayer();

  const [ambilightMode, setAmbilightMode] = useState<AmbilightMode>('reactive');
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio-reactive ambilight glow scale
  const [ambScale, setAmbScale] = useState(1);
  const [ambOpacity, setAmbOpacity] = useState(0.7);
  const animFrameRef = useRef<number>(0);

  const accentColor = lucidPrimaryColor || lucidTheme?.primary || '#00f0ff';
  const title = currentTrack?.title || 'Video en reproducción';
  const artist = currentTrack?.artist || 'YouTube';

  // ── Auto-hide controls on mouse idle ──────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetControlsTimer]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVideoTheaterOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVideoTheaterOpen(false);
      } else if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlay();
      } else if ((e.key === 't' || e.key === 'T') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setVideoTheaterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoTheaterOpen, setVideoTheaterOpen, togglePlay]);

  // ── Real-time audio reactive ambilight loop ───────────────────────────────
  useEffect(() => {
    if (!isVideoTheaterOpen || ambilightMode !== 'reactive') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setAmbScale(1);
      setAmbOpacity(ambilightMode === 'static' ? 0.65 : 0);
      return;
    }

    let isMounted = true;
    const updateGlow = () => {
      if (!isMounted) return;
      try {
        const visualData = audioEngine.getRealtimeVisualData();
        const bassEnergy = visualData.bass || 0;
        const targetScale = 1 + bassEnergy * 0.22;
        const targetOpacity = 0.55 + bassEnergy * 0.4;
        setAmbScale((prev) => prev * 0.85 + targetScale * 0.15);
        setAmbOpacity((prev) => prev * 0.85 + targetOpacity * 0.15);
      } catch {
        /* fallback */
      }
      animFrameRef.current = requestAnimationFrame(updateGlow);
    };
    animFrameRef.current = requestAnimationFrame(updateGlow);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVideoTheaterOpen, ambilightMode]);

  // ── Cycle Ambilight Mode ──────────────────────────────────────────────────
  const cycleAmbilight = () => {
    setAmbilightMode((prev) => {
      if (prev === 'reactive') return 'static';
      if (prev === 'static') return 'off';
      return 'reactive';
    });
  };

  if (!isVideoTheaterOpen) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        onMouseMove={resetControlsTimer}
        className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl select-none"
      >
        {/* Backdrop click to close */}
        <div
          className="absolute inset-0"
          onClick={() => setVideoTheaterOpen(false)}
          aria-hidden="true"
        />

        {/* ── Reactive Ambilight Halo Layer ── */}
        {ambilightMode !== 'off' && (
          <div
            className="absolute inset-0 m-auto w-[min(94vw,1040px)] aspect-video pointer-events-none transition-transform duration-75"
            style={{
              transform: `scale(${ambScale})`,
              opacity: ambOpacity,
            }}
          >
            {/* Primary diffuse chromatic aura */}
            <div
              className="absolute -inset-10 sm:-inset-16 rounded-[48px] blur-3xl opacity-75"
              style={{
                background: `radial-gradient(circle, ${accentColor} 0%, rgba(168,85,247,0.3) 60%, transparent 80%)`,
              }}
            />
            {/* Secondary perimeter edge light */}
            <div
              className="absolute -inset-4 sm:-inset-8 rounded-[36px] blur-xl opacity-60"
              style={{
                background: `conic-gradient(from 180deg at 50% 50%, ${accentColor} 0deg, #a855f7 120deg, #3b82f6 240deg, ${accentColor} 360deg)`,
              }}
            />
          </div>
        )}

        {/* ── Main Cinema Stage Chassis ── */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-[min(94vw,1040px)] aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)] border border-white/20 bg-black flex flex-col group/stage"
          onClick={(e) => e.stopPropagation()}
        >
          {/* YouTube Video Slot */}
          <div className="absolute inset-0 w-full h-full bg-black">
            <GlobalYouTubePlayer
              showVideoInPlayer={isVideoTheaterOpen}
              interactive={true}
              className="w-full h-full object-cover"
              borderRadius="24px"
            />
          </div>

          {/* ── Top Cinema Glass Header ── */}
          <div
            className={`absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Left Info Badge */}
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/25 border border-red-500/40 text-[10px] font-mono font-bold text-red-200 backdrop-blur-md shadow">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                CINEMA STAGE
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[280px] sm:max-w-[480px]">
                  {title}
                </h2>
                <p className="text-[10px] sm:text-xs text-white/60 font-medium truncate">
                  {artist}
                </p>
              </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Ambilight Mode Selector */}
              <button
                onClick={cycleAmbilight}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-all active:scale-95 ${
                  ambilightMode === 'reactive'
                    ? 'text-cyan-300 bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : ambilightMode === 'static'
                    ? 'text-amber-200 bg-amber-500/20 border-amber-400/40'
                    : 'text-white/40 hover:text-white bg-black/50 border-white/10'
                }`}
                title={`Modo Ambilight: ${ambilightMode.toUpperCase()} (Clic para alternar)`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono hidden sm:inline capitalize">
                  {ambilightMode}
                </span>
              </button>

              {/* Force Reload if Frozen */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('aura:youtube-reload'))}
                className="p-1.5 rounded-full text-white/70 hover:text-white bg-black/50 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all active:scale-95"
                title="Recargar reproducción si se congela"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* External YouTube link */}
              {currentTrack?.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-white/70 hover:text-white bg-black/50 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all active:scale-95"
                  title="Abrir en YouTube externo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Exit Cinema Mode */}
              <button
                onClick={() => setVideoTheaterOpen(false)}
                className="p-1.5 rounded-full text-white/80 hover:text-white bg-black/60 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all active:scale-95"
                title="Salir del Modo Cine (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Bottom Cinema Floating Transport Deck ── */}
          <div
            className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-5 flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Timeline Bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-white/70 min-w-[38px] text-right">
                {formatClock(currentTime)}
              </span>

              {/* Custom Scrub Bar */}
              <div
                className="relative flex-1 h-1.5 hover:h-2.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all group/bar"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  if (duration > 0) seek(pct * duration);
                }}
              >
                <div
                  className="h-full rounded-full transition-all relative"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: accentColor,
                    boxShadow: `0 0 10px ${accentColor}`,
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                </div>
              </div>

              <span className="text-[11px] font-mono text-white/50 min-w-[38px]">
                {formatClock(duration)}
              </span>
            </div>

            {/* Transport Button Cluster */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                {/* Prev */}
                <button
                  onClick={playPrevious}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors btn-spring"
                  title="Anterior"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                {/* Hero Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={playNext}
                  className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors btn-spring"
                  title="Siguiente"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Volume Slider Capsule */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md">
                <button
                  onClick={toggleMute}
                  className="text-white/70 hover:text-white transition-colors"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 accent-cyan-400 h-1 bg-white/20 rounded-full cursor-pointer"
                  title={`Volumen: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoTheaterModal;
