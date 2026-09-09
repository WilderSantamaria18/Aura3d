import React, { useRef, useState } from 'react';
import {
  Disc3,
  ChevronDown,
  ArrowRight,
  Headphones,
  Mic,
  Sparkles,
  Sliders,
  Activity,
  Layers,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { Landing3DScene } from './Landing3DScene';
import { StudioOscilloscope } from './StudioOscilloscope';
import { StudioMixerDeck } from './StudioMixerDeck';
import { StudioTurntableDeck } from './StudioTurntableDeck';
import { StudioLaunchDeck } from './StudioLaunchDeck';

/**
 * LandingScreen
 * Experiencia cinematográfica con scroll 3D ordenado por secciones snap.
 * Cada etapa enfoca y hace zoom a un componente de hardware interactivo
 * de forma secuencial, limpia y fluida.
 */
export const LandingScreen: React.FC = () => {
  const { setHasStarted, togglePlay, isAudioUnlocked } = usePlayerStore();
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();

  const [activeStage, setActiveStage] = useState(0);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const activeStageRef = useRef<number>(0);

  const section0Ref = useRef<HTMLElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section3Ref = useRef<HTMLElement>(null);

  // 60 FPS zero-rerender scroll handler:
  // - Updates 3D Three.js camera directly via mutable ref
  // - Updates top progress bar directly via GPU transform
  // - Only triggers React state update when changing section snap index (max 4 times across full scroll)
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;
    const p = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

    // 1. Update 3D Three.js camera position (0 React re-renders)
    scrollProgressRef.current = p;

    // 2. Direct GPU transform on top progress bar (0 React re-renders)
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, p / 100))})`;
    }

    // 3. Update active stage ONLY when crossing section boundary (0 scroll thrash)
    const stageIdx = Math.min(3, Math.max(0, Math.round(scrollTop / clientHeight)));
    if (stageIdx !== activeStageRef.current) {
      activeStageRef.current = stageIdx;
      setActiveStage(stageIdx);
    }
  };

  const scrollToStage = (stageIdx: number) => {
    const refs = [section0Ref, section1Ref, section2Ref, section3Ref];
    refs[stageIdx]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartExperience = async () => {
    setIsTransitioningOut(true);
    await unlockAudio();
    setTimeout(() => {
      setHasStarted(true);
      if (!isAudioUnlocked) {
        togglePlay();
      }
    }, 450);
  };

  const handleMicStart = async () => {
    setIsTransitioningOut(true);
    await toggleMicrophone();
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  };

  const handleFileLoaded = (file: File) => {
    setIsTransitioningOut(true);
    loadFile(file);
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`fixed inset-0 z-50 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth text-white select-none transition-all duration-700 ease-out ${
        isTransitioningOut
          ? '-translate-y-20 opacity-0 blur-md scale-[0.96]'
          : 'translate-y-0 opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(8, 13, 34, 0.40) 0%, rgba(5, 8, 22, 0.70) 50%, #03050c 100%)',
      }}
    >
      {/* ── 3D Scene Background linked to Scroll Progress via zero-rerender ref ── */}
      <Landing3DScene scrollProgressRef={scrollProgressRef} isTransitioningOut={isTransitioningOut} />

      {/* ── Floating Right Navigation Dots ── */}
      <nav
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-3 font-mono text-[10px]"
        aria-label="Etapas de navegación"
      >
        {[
          { label: '01 INTRO & OSC', idx: 0 },
          { label: '02 DSP MIXER', idx: 1 },
          { label: '03 RAINBOW VOID', idx: 2 },
          { label: '04 ENTRAR', idx: 3 },
        ].map((stage) => {
          const isActive = activeStage === stage.idx;
          return (
            <button
              key={stage.idx}
              onClick={() => scrollToStage(stage.idx)}
              className="flex items-center gap-2 group transition-all cursor-pointer"
            >
              <span
                className={`transition-all duration-300 uppercase tracking-widest ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-white/30 group-hover:text-white/70'
                }`}
              >
                {stage.label}
              </span>
              <span
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-6 bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.8)]'
                    : 'w-2 bg-white/20 group-hover:bg-white/50'
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* ── Top Scroll Progress Line (Direct GPU transform, 0 layout reflows) ── */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-white/[0.05] z-50 pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full w-full bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 origin-left transition-transform duration-75 will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* ── Fixed Studio Brand Header ── */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 sm:px-12 py-5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-[#070a14]/90 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg">
            <Disc3 className="w-4 h-4 text-cyan-400 animate-[spin_12s_linear_infinite]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-white/90">
            Aura3D <span className="text-cyan-400 font-semibold">Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-[10px] font-mono text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">60 FPS // 3D Engine</span>
            <span className="sm:hidden">Ready</span>
          </div>

          <button
            onClick={handleStartExperience}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono tracking-wider uppercase text-white transition-all shadow-sm active:scale-95"
          >
            Entrar →
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          STAGE 0: HERO CONSOLE & CRT OSCILLOSCOPE (SNAP SECTION 0)
      ═════════════════════════════════════════════════════════════════ */}
      <section
        ref={section0Ref}
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-between px-6 pt-24 pb-10 snap-start snap-always"
      >
        <div />

        {/* Center Hero Card with Zoom Transform */}
        <div
          className={`max-w-2xl w-full flex flex-col items-center text-center space-y-5 transition-[transform,opacity] duration-500 ease-out will-change-[transform,opacity] ${
            activeStage === 0
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Eyebrow tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] text-white/80 text-[11px] font-mono tracking-wider backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESTUDIO ACÚSTICO ESPACIAL 3D // WEB AUDIO API</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-light tracking-tight text-white font-sans">
            AURA<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-300 to-pink-400">3D</span>
          </h1>

          <p className="max-w-md mx-auto text-white/60 font-light text-xs sm:text-sm leading-relaxed tracking-wide font-mono">
            Arquitectura de audio espacial en tiempo real con shaders GPU y micro-física de ondas.
          </p>

          {/* Real-time Oscilloscope Component */}
          <div className="w-full max-w-md pt-1">
            <StudioOscilloscope color="#00e5ff" />
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full justify-center">
            <button
              onClick={handleStartExperience}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm tracking-wider uppercase hover:bg-cyan-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
            >
              <Headphones className="w-4 h-4 text-black" />
              <span>Iniciar Experiencia</span>
              <ArrowRight className="w-4 h-4 text-black/70" />
            </button>

            <button
              onClick={handleMicStart}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-xs sm:text-sm font-mono tracking-wider uppercase text-white/80 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Micrófono Directo</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            onClick={() => scrollToStage(1)}
            className="flex flex-col items-center gap-1.5 text-white/40 hover:text-cyan-400 transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase">
              Explorar Consola DSP ↓
            </span>
            <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          STAGE 1: HARDWARE MASTER MIXER & ANALOG VU DECK (SNAP SECTION 1)
      ═════════════════════════════════════════════════════════════════ */}
      <section
        ref={section1Ref}
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-between px-6 pt-20 pb-10 snap-start snap-always"
      >
        <div />

        {/* Center Mixer Deck with Focal Zoom Transform */}
        <div
          className={`max-w-3xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-500 ease-out will-change-[transform,opacity] ${
            activeStage === 1
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="text-center space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400">
              [ 02 // PROCESAMIENTO DSP & ECUALIZADOR ]
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white font-mono">
              Consola Masterizadora de 8 Bandas
            </h2>
          </div>

          {/* Custom Studio Mixer Deck Component */}
          <StudioMixerDeck />
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            onClick={() => scrollToStage(2)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-white/40 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <span>Explorar Tornamesa Rainbow Void</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          STAGE 2: RAINBOW VOID TURNTABLE & SPECTRUM ENGINE (SNAP SECTION 2)
      ═════════════════════════════════════════════════════════════════ */}
      <section
        ref={section2Ref}
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-between px-6 pt-20 pb-10 snap-start snap-always"
      >
        <div />

        {/* Center Turntable Deck with Focal Zoom Transform */}
        <div
          className={`max-w-2xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-500 ease-out will-change-[transform,opacity] ${
            activeStage === 2
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="text-center space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-pink-400">
              [ 03 // NÚCLEO CINÉTICO DE VINILO ]
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white font-mono">
              Tornamesa Virtual Rainbow Void
            </h2>
          </div>

          {/* Custom Studio Turntable Deck Component */}
          <StudioTurntableDeck />
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            onClick={() => scrollToStage(3)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-white/40 hover:text-pink-400 transition-colors cursor-pointer"
          >
            <span>Ir a la Plataforma de Entrada</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          STAGE 3: MASTER AUDIO LAUNCHPAD & WARP DIVE (SNAP SECTION 3)
      ═════════════════════════════════════════════════════════════════ */}
      <section
        ref={section3Ref}
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-between px-6 pt-20 pb-10 snap-start snap-always"
      >
        <div />

        {/* Center Launch Deck with Focal Zoom Transform */}
        <div
          className={`max-w-xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-500 ease-out will-change-[transform,opacity] ${
            activeStage === 3
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          <StudioLaunchDeck
            onStartExperience={handleStartExperience}
            onMicStart={handleMicStart}
            onFileLoaded={handleFileLoaded}
          />
        </div>

        {/* System Footer */}
        <footer className="w-full max-w-4xl pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-white/40">
          <div>Aura3D Audio Workstation v2.5</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> Web Audio API
            </span>
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-emerald-400" /> 10-Band EQ
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-pink-400" /> GPU 3D Shaders
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingScreen;
