import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Disc3,
  ChevronDown,
  ArrowRight,
  Headphones,
  Mic,
  Sliders,
  Activity,
  Layers,
  UploadCloud,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
const Landing3DScene = React.lazy(() =>
  import('./Landing3DScene').then((m) => ({ default: m.Landing3DScene }))
);
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
  const { setHasStarted } = usePlayerStore();
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();

  const [activeStage, setActiveStage] = useState(0);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const activeStageRef = useRef<number>(0);

  const section0Ref = useRef<HTMLElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section3Ref = useRef<HTMLElement>(null);

  const handleStartExperience = useCallback(async () => {
    setIsTransitioningOut(true);
    await unlockAudio();
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  }, [unlockAudio, setHasStarted]);

  const handleMicStart = useCallback(async () => {
    setIsTransitioningOut(true);
    await toggleMicrophone();
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  }, [toggleMicrophone, setHasStarted]);

  const handleFileLoaded = (file: File) => {
    setIsTransitioningOut(true);
    loadFile(file);
    setTimeout(() => {
      setHasStarted(true);
    }, 450);
  };

  // Keyboard shortcut listener: Space to launch, M for mic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleStartExperience();
      } else if (e.key === 'm' || e.key === 'M') {
        handleMicStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartExperience, handleMicStart]);

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
      <React.Suspense fallback={null}>
        <Landing3DScene scrollProgressRef={scrollProgressRef} isTransitioningOut={isTransitioningOut} />
      </React.Suspense>

      {/* ── Floating Right Navigation Channel Strip ── */}
      <nav
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-2.5 font-mono text-[10px]"
        aria-label="Canales de navegación"
      >
        {[
          { ch: 'CH 01', label: 'CONSOLA' },
          { ch: 'CH 02', label: 'DSP EQ' },
          { ch: 'CH 03', label: 'TORNAMESA' },
          { ch: 'CH 04', label: 'ACCESO' },
        ].map((stage, idx) => {
          const isActive = activeStage === idx;
          return (
            <button
              key={idx}
              onClick={() => scrollToStage(idx)}
              className="flex items-center gap-2 group transition-all cursor-pointer"
            >
              <span
                className={`transition-all duration-200 tracking-wider ${
                  isActive
                    ? 'text-[#f0f4fc] font-semibold'
                    : 'text-[#556075] group-hover:text-[#8b95a5]'
                }`}
              >
                <span className="text-[9px] text-[#00e5ff] mr-1.5">{stage.ch}</span>
                {stage.label}
              </span>
              <span
                className={`h-2 rounded transition-all duration-200 ${
                  isActive
                    ? 'w-5 bg-[#00e5ff]'
                    : 'w-1.5 bg-white/20 group-hover:bg-white/40'
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
      <header className="fixed top-0 left-0 right-0 z-30 px-6 sm:px-12 py-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-[#070a14]/90 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg">
            <Disc3 className="w-4 h-4 text-cyan-400 animate-[spin_12s_linear_infinite]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#f0f4fc]">
            Aura3D <span className="text-cyan-400 font-semibold">Studio</span>
          </span>
        </div>

        {/* Live Studio Hardware Telemetry Ribbon */}
        <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-[#8b95a5] px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse" />
            <span className="text-[#f0f4fc]">48.0 kHz</span> // 32-BIT FLOAT
          </span>
          <span className="text-white/20">|</span>
          <span>DSP LATENCY &lt; 8ms</span>
          <span className="text-white/20">|</span>
          <span className="text-[#00e5ff]">WEB AUDIO NODE</span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={handleStartExperience}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono tracking-wider uppercase text-white transition-all shadow-sm active:scale-95 cursor-pointer"
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
          className={`max-w-2xl w-full flex flex-col items-center text-center space-y-4 transition-[transform,opacity] duration-500 ease-out will-change-[transform,opacity] ${
            activeStage === 0
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Architectural Solid Title (High Contrast & Studio Typography) */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-studio-tight text-white font-heading text-scrim-3d">
            AURA<span className="font-extrabold text-[#00e5ff] ml-1 drop-shadow-[0_0_25px_rgba(0,229,255,0.6)]">3D</span>
          </h1>

          <p className="max-w-md mx-auto text-slate-300 font-medium text-xs sm:text-sm leading-relaxed tracking-normal font-display text-scrim-3d">
            Estación de audio espacial en tiempo real con shaders WebGL y micro-física acústica.
          </p>

          {/* Real-time Oscilloscope with Interactive Wave Mode */}
          <div className="w-full max-w-md pt-1">
            <StudioOscilloscope color="#00e5ff" />
          </div>

          {/* Quick Audio Dropzone in Hero */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingHero(true);
            }}
            onDragLeave={() => setIsDraggingHero(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingHero(false);
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                handleFileLoaded(e.dataTransfer.files[0]);
              }
            }}
            className={`w-full max-w-md p-3.5 rounded-[12px] border transition-all cursor-pointer ${
              isDraggingHero
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01] shadow-md'
                : 'border-white/[0.08] bg-[#0c101a]/90 backdrop-blur-2xl hover:border-white/[0.15] hover:bg-[#0c101a]/95 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold text-white text-scrim-3d">
                  Arrastra cualquier audio aquí o examinar
                </div>
                <div className="text-[10px] text-white/50 font-mono mt-0.5">
                  FLAC, WAV, MP3, OGG // Inicio instantáneo
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded-[6px] bg-white/[0.08] border border-white/[0.12] text-white flex-shrink-0 btn-spring">
                Cargar
              </span>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.ogg"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileLoaded(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 w-full justify-center">
            <button
              onClick={handleStartExperience}
              className="w-full sm:w-auto px-7 py-3 rounded-[10px] bg-white text-black font-semibold text-xs sm:text-sm tracking-wide uppercase btn-spring flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <Headphones className="w-4 h-4 text-black" />
              <span>Iniciar Motor 3D</span>
              <ArrowRight className="w-4 h-4 text-black/60" />
            </button>

            <button
              onClick={handleMicStart}
              className="w-full sm:w-auto px-5 py-3 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm font-mono font-medium tracking-wide uppercase text-white btn-spring flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Micrófono Directo</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            onClick={() => scrollToStage(1)}
            className="flex flex-col items-center gap-1.5 text-[#8b95a5] hover:text-[#00e5ff] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase">
              Explorar Consola DSP ↓
            </span>
            <ChevronDown className="w-4 h-4 text-[#00e5ff] group-hover:translate-y-1 transition-transform duration-300 ease-out" />
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

        {/* System Studio Footer with Keyboard Shortcuts Ribbon */}
        <footer className="w-full max-w-4xl pt-4 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] font-mono text-[#8b95a5]">
          <div className="flex items-center gap-3">
            <span className="text-[#f0f4fc] font-medium">Aura3D Workstation</span>
            <span className="text-white/20">|</span>
            <span className="text-[#556075]">REV 2026.4</span>
          </div>

          {/* Serigraphed Studio Keyboard Shortcuts */}
          <div className="flex items-center gap-3 text-[9px] text-[#8b95a5]">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[#f0f4fc]">ESPACIO</kbd> Iniciar</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[#f0f4fc]">M</kbd> Micrófono</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[#f0f4fc]">SCROLL</kbd> Canales</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[#f0f4fc]">G</kbd> Modo Galería</span>
          </div>

          <div className="flex items-center gap-4 text-[#8b95a5]">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00e5ff]" /> 48 kHz DSP
            </span>
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#00ff9d]" /> 10-Band EQ
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#ff007f]" /> WebGL Shaders
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingScreen;
