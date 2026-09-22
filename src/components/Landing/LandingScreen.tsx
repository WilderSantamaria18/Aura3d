/**
 * LandingScreen — Apple visionOS Liquid Glass Index & Welcome Experience (Aura3D Studio)
 *
 * Architecture:
 * - Vertical scroll-snap between 4 hardware channels
 * - Dynamic Island floating header with live audio DSP telemetry
 * - Floating lateral channel dock with active cyan LED indicators
 * - Superior gradient progress bar (Cyan -> Violet -> Magenta)
 * - Cosmic Starfield reactive particle engine with meteor bursts
 * - Elastic curtain transition to 3D engine with cubic-bezier(0.16, 1, 0.3, 1)
 * - Full responsive layout: 320px, 768px, 1024px, 1440px, 2560px and 80%-150% zoom
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Disc3,
  Upload,
  Mic,
  ArrowRight,
  ChevronDown,
  Headphones,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useLandingScroll } from '../../hooks/useLandingScroll';
import { CosmicStarfield } from './CosmicStarfield';
import { StudioOscilloscope } from './StudioOscilloscope';
import { StudioMixerDeck } from './StudioMixerDeck';
import { StudioTurntableDeck } from './StudioTurntableDeck';
import { StudioLaunchDeck } from './StudioLaunchDeck';
import { FEATURES } from '../../constants/features';

export const LandingScreen: React.FC = () => {
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setIsTransitioning = usePlayerStore((s) => s.setIsTransitioning);
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();

  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);
  const [isDraggingHero, setIsDraggingHero] = useState<boolean>(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputHeroRef = useRef<HTMLInputElement>(null);

  // High-performance reactive scroll tracking
  const { scrollProgress, activeChannel, scrollToChannel } = useLandingScroll(viewportRef);

  // Transition to 3D engine with elastic curtain
  const handleStartExperience = useCallback(async () => {
    if (isTransitioningOut) return;
    setIsTransitioningOut(true);
    setIsTransitioning(true);
    unlockAudio();
    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 900);
  }, [unlockAudio, setHasStarted, setIsTransitioning, isTransitioningOut]);

  const handleMicStart = useCallback(async () => {
    if (isTransitioningOut) return;
    setIsTransitioningOut(true);
    setIsTransitioning(true);
    toggleMicrophone();
    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 900);
  }, [toggleMicrophone, setHasStarted, setIsTransitioning, isTransitioningOut]);

  const handleFileLoaded = useCallback(
    (file: File) => {
      if (isTransitioningOut) return;
      setIsTransitioningOut(true);
      setIsTransitioning(true);
      loadFile(file);
      setTimeout(() => {
        setHasStarted(true);
        setIsTransitioning(false);
      }, 900);
    },
    [loadFile, setHasStarted, setIsTransitioning, isTransitioningOut]
  );

  // Keyboard shortcut listener: Enter / Space to launch, M for mic, G to enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (activeChannel === 3 && e.code === 'Space') {
          // Channel 4 handles space for kick test
        } else {
          handleStartExperience();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleMicStart();
      } else if (e.key === 'g' || e.key === 'G') {
        handleStartExperience();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartExperience, handleMicStart, activeChannel]);

  const handleHeroDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingHero(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileLoaded(e.dataTransfer.files[0]);
    }
  };

  const channels = [
    { id: 0, label: 'CH 01 // HERO' },
    { id: 1, label: 'CH 02 // MIXER' },
    { id: 2, label: 'CH 03 // TURNTABLE' },
    { id: 3, label: 'CH 04 // LAUNCH' },
  ];

  return (
    <div className="relative w-full h-screen bg-[#03050c] text-white select-none overflow-hidden font-sans pointer-events-auto">
      {/* ── 1. Cosmic Particle Field (Web Audio & Motion reactive) ── */}
      <CosmicStarfield isTransitioning={isTransitioningOut} />

      {/* ── 2. Superior Dynamic Gradient Progress Bar ── */}
      <div
        className="landing-progress-bar"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      {/* ── 3. Floating Dynamic Island Header (Apple visionOS Pill) ── */}
      <header className="landing-header">
        {/* Left: Logo & Studio Identity */}
        <div
          onClick={() => scrollToChannel(0)}
          className="flex items-center gap-2.5 pr-3 border-r border-white/10 cursor-pointer group select-none"
        >
          <div className="w-7 h-7 rounded-full border border-cyan-400/40 bg-white/[0.06] flex items-center justify-center animate-[spin_8s_linear_infinite] shadow-[0_0_10px_rgba(0,229,255,0.3)] group-hover:border-cyan-400 transition-colors">
            <Disc3 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-bold tracking-tight text-xs sm:text-sm group-hover:text-cyan-200 transition-colors">
              AURA3D
            </span>
            <span className="font-mono text-[9px] text-white/40 tracking-widest uppercase hidden sm:inline">
              STUDIO
            </span>
          </div>
        </div>

        {/* Center: Live DSP Hardware Telemetry (Hidden on small mobile) */}
        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] text-white/60 tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            48.0 kHz
          </span>
          <span className="text-white/20">|</span>
          <span>32-BIT FLOAT</span>
          <span className="text-white/20">|</span>
          <span className="text-cyan-300">DSP &lt;8ms</span>
          <span className="text-white/20">|</span>
          <span className="hidden lg:inline">BUFFER 128</span>
        </div>

        {/* Right: Enter Quick Action Button */}
        <button
          type="button"
          onClick={handleStartExperience}
          className="liquid-glass-pill px-4 py-1.5 text-xs font-semibold hover:bg-white/15 active:scale-95 transition-all text-white border border-white/20 flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <span>Entrar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ── 4. Floating Lateral Channel Dock (Desktop / Tablet Large) ── */}
      <aside className="landing-channel-dock hidden lg:flex">
        {channels.map((ch) => {
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => scrollToChannel(ch.id)}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive ? 'bg-white/15 shadow-sm' : 'hover:bg-white/5'
              }`}
              title={ch.label}
            >
              {/* Cyan Active LED */}
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.9)] scale-125'
                    : 'bg-white/20 group-hover:bg-white/50'
                }`}
              />
              {/* Channel Label */}
              <span
                className={`font-mono text-[10px] tracking-wider transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-white/50 group-hover:text-white/80'
                }`}
              >
                {ch.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* ── 5. Master Vertical Scroll-Snap Container ── */}
      <div
        ref={viewportRef}
        id="studio-viewport"
        className="landing-scroll-container"
      >
        {/* =============================================================== */}
        {/* CANAL 01: HERO CONSOLE & CRT OSCILLOSCOPE                       */}
        {/* =============================================================== */}
        <section id="canal-0" className="landing-channel">
          {/* Subtle Ambient Halo */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none -top-20 -left-20" />

          <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
            {/* Left: Textual Authority & Dropzone */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill border border-white/10 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">
                  Canal Primario // Inmersión Óptica
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight font-sans">
                AURA
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400">
                  3D
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
                Estación de audio espacial en tiempo real con shaders WebGL y micro-física acústica. Procesa transitorios con latencia ultrabaja en un lienzo háptico estilo visionOS.
              </p>

              {/* Dropzone Card (Liquid Glass) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingHero(true);
                }}
                onDragLeave={() => setIsDraggingHero(false)}
                onDrop={handleHeroDrop}
                onClick={() => fileInputHeroRef.current?.click()}
                className={`w-full max-w-lg mt-1 p-4 sm:p-5 liquid-glass-card border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isDraggingHero
                    ? 'border-cyan-400 bg-cyan-500/20 scale-[1.01] shadow-[0_0_24px_rgba(0,229,255,0.4)]'
                    : 'border-white/15 border-t-white/30 hover:border-white/25 hover:bg-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl liquid-glass-pill border border-white/20 flex items-center justify-center shrink-0 text-cyan-400 shadow-sm">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm text-white font-semibold truncate">
                      Arrastra master multicanal
                    </span>
                    <span className="font-mono text-[11px] text-white/50 truncate">
                      FLAC, WAV 96kHz, MP3 o Stems
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full liquid-glass-pill hover:bg-white/20 text-white font-mono text-xs tracking-wide shrink-0 transition-colors cursor-pointer border border-white/20"
                >
                  Cargar Audio
                </button>

                <input
                  ref={fileInputHeroRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileLoaded(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Dual Tactile CTAs */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                <button
                  type="button"
                  onClick={handleStartExperience}
                  className="group px-6 sm:px-7 py-3 rounded-full bg-white text-black font-mono text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-black" />
                  <span>INICIAR MOTOR 3D</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleMicStart}
                  className="px-5 sm:px-6 py-3 rounded-full liquid-glass-pill hover:bg-white/15 text-white border border-white/20 font-mono text-xs sm:text-sm flex items-center gap-2 active:scale-[0.97] transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Micrófono Directo</span>
                </button>
              </div>
            </div>

            {/* Right: Studio Oscilloscope (CRT Phosphor in Liquid Glass) */}
            <div className="lg:col-span-5 flex justify-center">
              <StudioOscilloscope />
            </div>
          </div>

          {/* Bottom Bouncing Guidance Indicator */}
          <div
            onClick={() => scrollToChannel(1)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer opacity-70 hover:opacity-100 transition-opacity z-20"
          >
            <span className="font-mono text-[10px] tracking-widest text-cyan-300 uppercase">
              Explorar Consola DSP
            </span>
            <ChevronDown className="w-4 h-4 text-white animate-bounce" />
          </div>
        </section>

        {/* =============================================================== */}
        {/* CANAL 02: HARDWARE MASTER MIXER & ANALOG VU METERS              */}
        {/* =============================================================== */}
        <section id="canal-1" className="landing-channel">
          <StudioMixerDeck onStartExperience={handleStartExperience} />
        </section>

        {/* =============================================================== */}
        {/* CANAL 03: RAINBOW VOID VIRTUAL TURNTABLE                        */}
        {/* =============================================================== */}
        <section id="canal-2" className="landing-channel">
          <StudioTurntableDeck onStartExperience={handleStartExperience} />
        </section>

        {/* =============================================================== */}
        {/* CANAL 04: LAUNCH PLATFORM & LIQUID VOID VISUALIZER              */}
        {/* =============================================================== */}
        <section id="canal-3" className="landing-channel">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-500/10 blur-[140px] pointer-events-none -top-10 right-1/4" />
          <StudioLaunchDeck
            onStartExperience={handleStartExperience}
            onMicStart={handleMicStart}
            onFileLoaded={handleFileLoaded}
          />
        </section>
      </div>

      {/* ── 6. Elastic Transition Curtain to 3D Engine ── */}
      <AnimatePresence>
        {isTransitioningOut && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="landing-curtain"
          >
            {/* Specular Edge Glow on Curtain */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(0,229,255,0.9)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingScreen;
