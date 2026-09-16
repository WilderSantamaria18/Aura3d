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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { setHasStarted, isAudioUnlocked, togglePlay } = usePlayerStore();
  const { unlockAudio, loadFile, toggleMicrophone } = useAudioEngine();

  const [activeStage, setActiveStage] = useState(0);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const activeStageRef = useRef<number>(0);

  const section0Ref = useRef<HTMLElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const section3Ref = useRef<HTMLElement>(null);

  const handleStartExperience = useCallback(() => {
    if (isStarting) return;
    setIsStarting(true);
    setIsTransitioningOut(true);

    // Navegación SIEMPRE primero, sin bloquear la entrada
    setHasStarted(true);

    // Desbloqueo de audio no bloqueante
    void (async () => {
      try {
        await unlockAudio();
        if (!isAudioUnlocked) {
          togglePlay();
        }
      } catch (e) {
        console.warn('[aura] unlockAudio fallo', e);
        setIsStarting(false);
      }
    })();

    setTimeout(() => {
      setIsStarting(false);
    }, 600);
  }, [isStarting, isAudioUnlocked, togglePlay, unlockAudio, setHasStarted]);

  const handleMicStart = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    setIsTransitioningOut(true);
    setHasStarted(true);

    void (async () => {
      try {
        await toggleMicrophone();
      } catch (e) {
        console.warn('[aura] toggleMicrophone fallo', e);
        setIsStarting(false);
      }
    })();

    setTimeout(() => {
      setIsStarting(false);
    }, 600);
  }, [isStarting, toggleMicrophone, setHasStarted]);

  const handleFileLoaded = (file: File) => {
    if (isStarting) return;
    setIsStarting(true);
    setIsTransitioningOut(true);
    setHasStarted(true);

    void (async () => {
      try {
        loadFile(file);
      } catch (e) {
        console.warn('[aura] loadFile fallo', e);
        setIsStarting(false);
      }
    })();

    setTimeout(() => {
      setIsStarting(false);
    }, 600);
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

  // 60 FPS zero-rerender scroll handler
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

  const navStages = [
    { ch: 'CH 01', label: t('landing.ch1') },
    { ch: 'CH 02', label: t('landing.ch2') },
    { ch: 'CH 03', label: t('landing.ch3') },
    { ch: 'CH 04', label: t('landing.ch4') },
  ];

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`fixed inset-0 z-50 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth text-text-primary select-none transition-all duration-slow ease-smooth ${
        isTransitioningOut
          ? '-translate-y-20 opacity-0 blur-md scale-[0.96]'
          : 'translate-y-0 opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(8, 13, 34, 0.40) 0%, rgba(5, 8, 22, 0.70) 50%, var(--surface-base) 100%)',
      }}
    >
      {/* ── 3D Scene Background linked to Scroll Progress via zero-rerender ref ── */}
      <React.Suspense fallback={null}>
        <Landing3DScene scrollProgressRef={scrollProgressRef} isTransitioningOut={isTransitioningOut} />
      </React.Suspense>

      {/* ── Floating Right Navigation Channel Strip ── */}
      <nav
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-1 font-mono text-caption"
        aria-label="Canales de navegación"
      >
        {navStages.map((stage, idx) => {
          const isActive = activeStage === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToStage(idx)}
              aria-label={t('landing.navChannel', { num: `0${idx + 1}`, name: stage.label })}
              className="min-h-[44px] min-w-[44px] flex items-center justify-end gap-2 group transition-all cursor-pointer px-2 py-2 btn-spring active:scale-[0.97]"
            >
              <span
                className={`transition-all duration-fast tracking-wider ${
                  isActive
                    ? 'text-text-primary font-semibold'
                    : 'text-text-tertiary group-hover:text-text-secondary'
                }`}
              >
                <span className="text-caption text-accent-cyan mr-1.5">{stage.ch}</span>
                {stage.label}
              </span>
              <span
                className={`h-2 rounded-pill transition-all duration-fast ${
                  isActive
                    ? 'w-5 bg-accent-cyan'
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
          className="h-full w-full bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-rose origin-left transition-transform duration-fast will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* ── Fixed Studio Brand Header ── */}
      <header className="fixed top-0 left-0 right-0 z-30 px-6 sm:px-12 py-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-8 h-8 rounded-control bg-surface-base/90 border border-border-subtle flex items-center justify-center material-thin shadow-subtle">
            <Disc3 className="w-4 h-4 text-accent-cyan animate-spin-slow" />
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-text-primary">
            Aura3D <span className="text-accent-cyan font-semibold">Studio</span>
          </span>
        </div>

        {/* Live Studio Hardware Telemetry Ribbon */}
        <div className="hidden lg:flex items-center gap-3 font-mono text-caption text-text-tertiary px-3.5 py-1.5 rounded-pill bg-white/[0.03] border border-border-subtle material-thin pointer-events-auto">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            <span className="text-text-primary font-tabular">48.0 kHz</span> // 32-BIT FLOAT
          </span>
          <span className="text-white/20">|</span>
          <span className="font-tabular">{t('landing.dspTelemetry')}</span>
          <span className="text-white/20">|</span>
          <span className="text-accent-cyan">{t('landing.webAudioNode')}</span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={handleStartExperience}
            disabled={isStarting}
            aria-label={t('landing.enter')}
            className="min-h-[44px] px-4 py-2 rounded-control bg-white/10 hover:bg-white/20 border border-border-medium text-caption font-mono tracking-wider uppercase text-text-primary transition-all shadow-subtle active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center btn-spring"
          >
            {isStarting ? t('landing.starting') : t('landing.enter')}
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
          className={`max-w-2xl w-full flex flex-col items-center text-center space-y-4 transition-[transform,opacity] duration-slow ease-smooth will-change-[transform,opacity] ${
            activeStage === 0
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Architectural Solid Title (High Contrast & Studio Typography) */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-studio-tight text-text-primary font-heading text-scrim-3d">
            AURA<span className="font-extrabold text-accent-cyan ml-1">3D</span>
          </h1>

          <p className="max-w-md mx-auto text-text-secondary font-medium text-xs sm:text-sm leading-relaxed tracking-normal font-display text-scrim-3d">
            {t('landing.subtitle')}
          </p>

          {/* Real-time Oscilloscope with Interactive Wave Mode */}
          <div className="w-full max-w-md pt-1">
            <StudioOscilloscope />
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
            className={`w-full max-w-md p-3.5 rounded-card border transition-all cursor-pointer ${
              isDraggingHero
                ? 'border-accent-cyan bg-accent-cyan/20 scale-[1.01] shadow-card'
                : 'border-border-subtle bg-surface-dock material-regular hover:border-border-medium hover:bg-surface-dock/90 shadow-card'
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer w-full min-h-[44px]">
              <div className="w-8 h-8 rounded-control bg-white/10 border border-border-subtle flex items-center justify-center text-accent-cyan flex-shrink-0 shadow-subtle">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold text-text-primary text-scrim-3d">
                  {t('landing.dropzoneTitle')}
                </div>
                <div className="text-caption text-text-tertiary font-mono mt-0.5">
                  {t('landing.dropzoneFormats')}
                </div>
              </div>
              <span className="min-h-[44px] text-caption font-mono font-semibold uppercase px-3 py-2.5 rounded-control bg-white/10 border border-border-medium text-text-primary flex-shrink-0 btn-spring flex items-center justify-center">
                {t('landing.upload')}
              </span>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.ogg"
                aria-label={t('landing.dropzoneTitle')}
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
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 w-full justify-center">
            <button
              type="button"
              onClick={handleStartExperience}
              disabled={isStarting}
              aria-label={t('landing.launch3d')}
              className="w-full sm:w-auto min-h-[44px] px-7 py-3 rounded-control bg-white text-black font-semibold text-xs sm:text-sm tracking-wide uppercase btn-spring flex items-center justify-center gap-2 shadow-card cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              <Headphones className="w-4 h-4 text-black" />
              <span>{isStarting ? t('landing.starting') : t('landing.launch3d')}</span>
              <ArrowRight className="w-4 h-4 text-black/60" />
            </button>

            <button
              type="button"
              onClick={handleMicStart}
              disabled={isStarting}
              aria-label={t('landing.directMic')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-control bg-white/10 hover:bg-white/15 border border-border-medium text-xs sm:text-sm font-mono font-medium tracking-wide uppercase text-text-primary btn-spring flex items-center justify-center gap-2 cursor-pointer shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <Mic className="w-4 h-4 text-status-success" />
              <span>{t('landing.directMic')}</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => scrollToStage(1)}
            aria-label={t('landing.exploreDsp')}
            className="min-h-[44px] min-w-[44px] px-3 py-2 flex flex-col items-center justify-center gap-1.5 text-text-tertiary hover:text-accent-cyan transition-colors group cursor-pointer btn-spring active:scale-[0.97]"
          >
            <span className="text-caption font-mono tracking-[0.2em] uppercase">
              {t('landing.exploreDsp')} ↓
            </span>
            <ChevronDown className="w-4 h-4 text-accent-cyan group-hover:translate-y-1 transition-transform duration-base ease-smooth" />
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
          className={`max-w-3xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-slow ease-smooth will-change-[transform,opacity] ${
            activeStage === 1
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="text-center space-y-1">
            <div className="text-caption font-mono uppercase tracking-[0.25em] text-accent-cyan">
              [ 02 // PROCESAMIENTO DSP & ECUALIZADOR ]
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-text-primary font-mono">
              {t('landing.masterConsole')}
            </h2>
          </div>

          {/* Custom Studio Mixer Deck Component */}
          <StudioMixerDeck />
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => scrollToStage(2)}
            aria-label={t('landing.exploreTurntable')}
            className="min-h-[44px] min-w-[44px] px-3 py-2 flex items-center justify-center gap-1.5 text-caption font-mono text-text-tertiary hover:text-accent-cyan transition-colors cursor-pointer btn-spring active:scale-[0.97]"
          >
            <span>{t('landing.exploreTurntable')}</span>
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
          className={`max-w-2xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-slow ease-smooth will-change-[transform,opacity] ${
            activeStage === 2
              ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto'
              : 'scale-[0.94] opacity-40 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="text-center space-y-1">
            <div className="text-caption font-mono uppercase tracking-[0.25em] text-accent-rose">
              [ 03 // NÚCLEO CINÉTICO DE VINILO ]
            </div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-text-primary font-mono">
              {t('landing.turntableTitle')}
            </h2>
          </div>

          {/* Custom Studio Turntable Deck Component */}
          <StudioTurntableDeck />
        </div>

        {/* Section Navigation Cue */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => scrollToStage(3)}
            aria-label={t('landing.goToAccess')}
            className="min-h-[44px] min-w-[44px] px-3 py-2 flex items-center justify-center gap-1.5 text-caption font-mono text-text-tertiary hover:text-accent-rose transition-colors cursor-pointer btn-spring active:scale-[0.97]"
          >
            <span>{t('landing.goToAccess')}</span>
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
          className={`max-w-xl w-full flex flex-col items-center space-y-4 transition-[transform,opacity] duration-slow ease-smooth will-change-[transform,opacity] ${
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
        <footer className="w-full max-w-4xl pt-4 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-caption font-mono text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="text-text-primary font-medium">Aura3D Workstation</span>
            <span className="text-white/20">|</span>
            <span className="text-text-muted font-tabular">REV 2026.4</span>
          </div>

          {/* Serigraphed Studio Keyboard Shortcuts */}
          <div className="flex items-center gap-3 text-caption text-text-tertiary">
            <span><kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 border border-border-subtle text-text-primary">{t('landing.spaceKey')}</kbd> {t('landing.spaceLabel')}</span>
            <span><kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 border border-border-subtle text-text-primary">{t('landing.mKey')}</kbd> {t('landing.mLabel')}</span>
            <span><kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 border border-border-subtle text-text-primary">{t('landing.scrollKey')}</kbd> {t('landing.scrollLabel')}</span>
            <span><kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 border border-border-subtle text-text-primary">{t('landing.gKey')}</kbd> {t('landing.gLabel')}</span>
          </div>

          <div className="flex items-center gap-4 text-text-tertiary">
            <span className="flex items-center gap-1 font-tabular">
              <Activity className="w-3.5 h-3.5 text-accent-cyan" /> 48 kHz DSP
            </span>
            <span className="flex items-center gap-1 font-tabular">
              <Sliders className="w-3.5 h-3.5 text-status-success" /> 10-Band EQ
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent-rose" /> WebGL Shaders
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingScreen;
