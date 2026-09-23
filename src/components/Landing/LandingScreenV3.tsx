import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Disc3,
  Eye,
  Music2,
  Hand,
  Mic2,
  Sliders,
  Check,
  Play,
  ChevronRight,
  Sparkles,
  Volume2,
  AudioWaveform,
  Zap,
  Activity,
  Waves,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useLandingProgress } from '../../hooks/useLandingProgress';
import { RevealWrapper } from './shared/RevealWrapper';
import { Aura3DSphere } from './sections/Aura3DSphere';
import { RainbowVoidMiniPreview } from './sections/RainbowVoidMiniPreview';
import { CameraLandmarksPreview } from './sections/CameraLandmarksPreview';

const TOTAL_ACTS = 7;

const ACT_NAMES = [
  '01 / APERTURA',
  '02 / MANIFIESTO',
  '03 / VISUALIZADOR',
  '04 / AUDIO',
  '05 / LETRAS',
  '06 / CÁMARA 3D',
  '07 / INVITACIÓN',
];

const MANIFESTO_FEATURES = [
  { id: 'vis', label: 'VISUALIZADORES', icon: Eye },
  { id: 'lib', label: 'BIBLIOTECA', icon: Music2 },
  { id: 'cam', label: 'CÁMARA 3D', icon: Hand },
  { id: 'lyr', label: 'LETRAS SYNC', icon: Mic2 },
  { id: 'ply', label: 'MINI PLAYER', icon: Disc3 },
  { id: 'fx', label: 'EFECTOS PRO', icon: Sliders },
];

const DEMO_TRACKS = [
  { title: 'Cybernetic Flow', artist: 'Aura Core', duration: '3:45', format: 'FLAC 24-bit', bpm: 128 },
  { title: 'Midnight Horizon', artist: 'Hyperion', duration: '4:12', format: 'WAV 48kHz', bpm: 124 },
  { title: 'Liquid Echoes', artist: 'Subtle Wave', duration: '3:20', format: 'ALAC Hi-Res', bpm: 130 },
];

const LYRICS_LINES = [
  'Respirando la luz entre las sombras del cristal',
  'Un pulso sagrado que despierta el infinito',
  'La frecuencia perfecta que transforma tu espacio',
  'Sintiendo el sonido vibrar en cada frecuencia',
  'Donde la música y la luz convergen en armonía',
];

export const LandingScreenV3: React.FC = () => {
  const { progress, activeSection, lenisRef } = useLandingProgress(TOTAL_ACTS);
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setIsTransitioning = usePlayerStore((s) => s.setIsTransitioning);
  const { unlockAudio } = useAudioEngine();

  const [isTransitioningLocal, setIsTransitioningLocal] = useState(false);
  const [activeLyricsIndex, setActiveLyricsIndex] = useState(1);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);

  // Auto-cycle lyrics demo lines every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLyricsIndex((prev) => (prev + 1) % LYRICS_LINES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Smooth scroll to target act
  const scrollToAct = useCallback(
    (index: number) => {
      const el = document.getElementById(`act-${index + 1}`);
      if (!el) return;
      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, { duration: 1.4 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [lenisRef]
  );

  // Launch experience with elastic transition curtain and destroy Lenis
  const handleEnter = useCallback(() => {
    if (isTransitioningLocal) return;
    setIsTransitioningLocal(true);
    setIsTransitioning(true);
    unlockAudio();

    if (lenisRef.current) {
      lenisRef.current.destroy();
      lenisRef.current = null;
    }

    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 900);
  }, [isTransitioningLocal, setIsTransitioning, unlockAudio, lenisRef, setHasStarted]);

  // Keyboard shortcut listener (Enter to launch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  return (
    <div className="landing-root select-none">
      {/* 0. Top Progress Bar */}
      <div
        className="landing-progress-bar"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* 0.1 Header Dynamic Island */}
      <header className="landing-header">
        <div className="flex items-center gap-3">
          <Disc3 className="w-4 h-4 text-cyan-400 animate-[spin_8s_linear_infinite]" />
          <span className="text-xs font-bold tracking-tight text-white">AURA3D</span>
          <span className="text-[9px] font-mono tracking-widest text-white/40 border-l border-white/10 pl-2">
            STUDIO
          </span>
        </div>
        <button
          type="button"
          onClick={handleEnter}
          className="landing-cta-secondary !py-1.5 !px-4 !text-xs cursor-pointer"
        >
          <span>Entrar</span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </header>

      {/* 0.2 Lateral Progress Rail */}
      <aside className="landing-progress-rail hidden lg:flex">
        {Array.from({ length: TOTAL_ACTS }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToAct(i)}
            className={`landing-rail-dot ${activeSection === i ? 'is-active' : ''}`}
            aria-label={`Navegar a ${ACT_NAMES[i]}`}
            title={ACT_NAMES[i]}
          />
        ))}
      </aside>

      {/* Wrapper of 7 Acts */}
      <div className="landing-scroll-wrapper">
        {/* ──────────────── ACTO 01: APERTURA ──────────────── */}
        <section id="act-1" className="landing-section" data-act="1">
          <div className="landing-act-number">{ACT_NAMES[0]}</div>
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
            <RevealWrapper variant="scale">
              <Suspense fallback={<div className="w-[300px] h-[300px]" />}>
                <Aura3DSphere />
              </Suspense>
            </RevealWrapper>

            <RevealWrapper>
              <h1 className="landing-hero-title">AURA3D</h1>
            </RevealWrapper>

            <RevealWrapper delay={200}>
              <p className="landing-description mx-auto">
                Estudio de audio espacial con visualizadores 3D reactivos.
              </p>
            </RevealWrapper>

            <RevealWrapper delay={350}>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleEnter}
                  className="landing-cta-primary"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Aura3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToAct(1)}
                  className="landing-cta-secondary"
                >
                  <span>Explorar características</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </RevealWrapper>

            <div className="landing-scroll-hint pt-12">
              · Desliza para explorar ↓ ·
            </div>
          </div>
        </section>

        {/* ──────────────── ACTO 02: MANIFIESTO ──────────────── */}
        <section id="act-2" className="landing-section" data-act="2">
          <div className="landing-act-number">{ACT_NAMES[1]}</div>
          <div className="w-full max-w-4xl mx-auto space-y-12">
            <RevealWrapper>
              <p className="landing-manifesto">
                Una estación de audio que se siente, se ve y se toca.
              </p>
            </RevealWrapper>

            <RevealWrapper delay={200}>
              <p className="landing-description">
                Aura3D combina visualizadores 3D reactivos, control gestual y audio
                espacial en una sola experiencia de alta fidelidad.
              </p>
            </RevealWrapper>

            <RevealWrapper delay={350}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                {MANIFESTO_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.id} className="landing-feature-chip justify-between p-3.5">
                      <span className="flex items-center gap-2 text-white/90">
                        <Icon size={14} className="text-cyan-400" />
                        {f.label}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
                    </div>
                  );
                })}
              </div>
            </RevealWrapper>
          </div>
        </section>

        {/* ──────────────── ACTO 03: VISUALIZADOR ──────────────── */}
        <section id="act-3" className="landing-section" data-act="3">
          <div className="landing-act-number">{ACT_NAMES[2]}</div>
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <RevealWrapper variant="from-left" className="lg:col-span-7">
              <RainbowVoidMiniPreview />
            </RevealWrapper>

            <div className="lg:col-span-5 space-y-6">
              <RevealWrapper variant="from-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  MOTOR QUANTUM 3D
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Rainbow Void
                </h2>
                <div className="w-12 h-1 bg-cyan-400 rounded-full my-3" />
              </RevealWrapper>

              <RevealWrapper variant="from-right" delay={150}>
                <ul className="space-y-3.5 text-sm text-white/80">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>8 formas geométricas sagradas reactivas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>10 efectos Pro de post-procesamiento óptico</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>6 paletas cromáticas sagradas de alta energía</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Física de resorte iOS ultra suave a 60 FPS</span>
                  </li>
                </ul>
              </RevealWrapper>

              <RevealWrapper variant="from-right" delay={300}>
                <button
                  type="button"
                  onClick={handleEnter}
                  className="landing-cta-secondary !text-xs !py-2.5 !px-5"
                >
                  <span>Ver todos los efectos</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </RevealWrapper>
            </div>
          </div>
        </section>

        {/* ──────────────── ACTO 04: AUDIO ──────────────── */}
        <section id="act-4" className="landing-section" data-act="4">
          <div className="landing-act-number">{ACT_NAMES[3]}</div>
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: MiniPlayer Demo */}
            <RevealWrapper variant="from-left">
              <div className="p-6 sm:p-8 rounded-[32px] bg-gradient-to-b from-white/[0.06] to-black/60 border border-white/12 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono text-[10px] tracking-widest text-white/50 uppercase">
                      AURA PLAYER CORE
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    HI-RES LOSSLESS
                  </span>
                </div>

                <div className="flex items-center gap-5">
                  {/* Spinning Vinyl Cover */}
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/40 via-purple-600/30 to-pink-500/40 flex items-center justify-center p-1 border border-white/20 shadow-lg">
                    <Disc3 className="w-12 h-12 text-white animate-[spin_6s_linear_infinite]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-white">Cybernetic Flow</h3>
                    <p className="text-xs text-white/50">Aura Core • Spatial Edition</p>
                    <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-white/40">
                      <span>01:24</span>
                      <span>/</span>
                      <span>03:45</span>
                    </div>
                  </div>
                </div>

                {/* Animated Waveform Bars */}
                <div className="flex items-end justify-between gap-1 h-12 px-2 py-1 rounded-xl bg-black/40 border border-white/5">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-cyan-500 to-purple-400 rounded-full"
                      style={{
                        height: `${25 + Math.sin(i * 0.4 + 1) * 20 + Math.cos(i * 0.7) * 20}%`,
                        opacity: 0.4 + (i % 3) * 0.2,
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-white/40 tracking-wider">
                    32-BIT DSP / 48 KHZ
                  </span>
                </div>
              </div>
            </RevealWrapper>

            {/* Right: Library Showcase */}
            <RevealWrapper variant="from-right">
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">
                    Biblioteca de Audio
                  </h2>
                  <p className="text-sm text-white/60">
                    Control total sobre tus archivos locales y transmisiones con metadatos
                    completos, ecualización paramétrica y análisis armónico.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {DEMO_TRACKS.map((t, idx) => (
                    <div
                      key={t.title}
                      onClick={() => setActiveTrackIndex(idx)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activeTrackIndex === idx
                          ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(0,229,255,0.15)]'
                          : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-white/30 w-5">
                          0{idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.title}</p>
                          <p className="text-xs text-white/40">{t.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px] text-white/50">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                          {t.format}
                        </span>
                        <span>{t.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealWrapper>
          </div>
        </section>

        {/* ──────────────── ACTO 05: LETRAS ──────────────── */}
        <section id="act-5" className="landing-section" data-act="5">
          <div className="landing-act-number">{ACT_NAMES[4]}</div>
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
            <RevealWrapper>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                <Mic2 className="w-3.5 h-3.5" />
                MODO CINE & SINCRONIZACIÓN PALABRA POR PALABRA
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3">
                Letras que respiran
              </h2>
              <p className="landing-description mx-auto mt-2">
                Motor de letras sincronizadas con precisión temporal, resplandor dinámico y
                soporte para transliteración fonética.
              </p>
            </RevealWrapper>

            {/* Centered Floating Lyrics Glass Card */}
            <RevealWrapper variant="scale" className="w-full">
              <div className="relative p-6 sm:p-10 rounded-[36px] bg-gradient-to-b from-white/[0.06] to-black/70 border border-white/12 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl max-w-2xl mx-auto space-y-4">
                {LYRICS_LINES.map((line, idx) => {
                  const isActive = idx === activeLyricsIndex;
                  const distance = Math.abs(idx - activeLyricsIndex);
                  return (
                    <div
                      key={line}
                      className="transition-all duration-700 ease-out cursor-default py-1"
                      style={{
                        transform: isActive ? 'scale(1.04)' : 'scale(0.97)',
                        filter: isActive
                          ? 'blur(0px)'
                          : `blur(${Math.min(4, distance * 1.5)}px)`,
                        opacity: isActive ? 1 : Math.max(0.2, 0.6 - distance * 0.18),
                      }}
                    >
                      <p
                        className={`text-base sm:text-lg transition-colors ${
                          isActive
                            ? 'font-bold text-cyan-300 drop-shadow-[0_0_24px_rgba(0,229,255,0.7)]'
                            : 'font-medium text-white/50'
                        }`}
                      >
                        {line}
                      </p>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>LRCLIB SYNC ENGINE</span>
                  <span>AUTO-DEMO ACTIVE</span>
                </div>
              </div>
            </RevealWrapper>
          </div>
        </section>

        {/* ──────────────── ACTO 06: CÁMARA 3D ──────────────── */}
        <section id="act-6" className="landing-section" data-act="6">
          <div className="landing-act-number">{ACT_NAMES[5]}</div>
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <RevealWrapper variant="from-left" className="lg:col-span-7">
              <CameraLandmarksPreview />
            </RevealWrapper>

            <div className="lg:col-span-5 space-y-6">
              <RevealWrapper variant="from-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-2">
                  <Hand className="w-3.5 h-3.5" />
                  CONTROL GESTUAL MEDIAPIPE
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Convierte tu espacio en música
                </h2>
                <div className="w-12 h-1 bg-cyan-400 rounded-full my-3" />
                <p className="landing-description">
                  Controla filtros de audio, scratch aéreo y modulación tridimensional
                  únicamente moviendo las manos frente a la cámara.
                </p>
              </RevealWrapper>

              <RevealWrapper variant="from-right" delay={200}>
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                    <Zap className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Air Scratch & Pinch</p>
                      <p className="text-[11px] text-white/50">
                        Pellizca el aire para fijar bucles y desplazar el cabezal de audio.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                    <Waves className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Filtro Cutoff Espacial</p>
                      <p className="text-[11px] text-white/50">
                        La elevación vertical modula la frecuencia de corte en tiempo real.
                      </p>
                    </div>
                  </div>
                </div>
              </RevealWrapper>
            </div>
          </div>
        </section>

        {/* ──────────────── ACTO 07: INVITACIÓN ──────────────── */}
        <section id="act-7" className="landing-section" data-act="7">
          <div className="landing-act-number">{ACT_NAMES[6]}</div>
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-10">
            <RevealWrapper>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-2">
                <Activity className="w-3.5 h-3.5" />
                ESTUDIO DE AUDIO ESPACIAL
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                ¿Listo para el estudio?
              </h2>
            </RevealWrapper>

            <RevealWrapper delay={150}>
              <p className="landing-description mx-auto max-w-xl">
                Entra ahora a la experiencia completa con procesamiento de audio
                multicanal, física de partículas reactiva y fondos atmosféricos 4K.
              </p>
            </RevealWrapper>

            <RevealWrapper delay={300}>
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={handleEnter}
                  className="landing-cta-primary !py-5 !px-10 !text-base shadow-[0_12px_40px_rgba(0,229,255,0.4)] hover:shadow-[0_16px_50px_rgba(0,229,255,0.6)]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>INICIAR AURA3D →</span>
                </button>
                <span className="font-mono text-[10px] tracking-widest text-white/35">
                  Presiona Enter para entrar
                </span>
              </div>
            </RevealWrapper>

            {/* Technical Telemetry Badges */}
            <RevealWrapper delay={450}>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                <div className="landing-feature-chip">48 KHZ AUDIO ENGINE</div>
                <div className="landing-feature-chip">32-BIT FLOAT PIPELINE</div>
                <div className="landing-feature-chip">WEBGL 2.0 ZERO LATENCY</div>
                <div className="landing-feature-chip">MEDIAPIPE GESTURE ENGINE</div>
              </div>
            </RevealWrapper>
          </div>
        </section>
      </div>

      {/* ──────────────── TRANSITION ELASTIC CURTAIN ──────────────── */}
      <AnimatePresence>
        {isTransitioningLocal && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="landing-curtain"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
