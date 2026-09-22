/**
 * LandingScreenV2 — Apple visionOS Liquid Experience (Aura3D Studio)
 *
 * Architecture:
 * - Fluid continuous narrative scroll with Lenis (no snap)
 * - 7 continuous narrative sections with scroll-reveal observers
 * - Top gradient progress bar + Lateral interactive ProgressRail
 * - Floating Dynamic Island header
 * - Deep QuantumCoreShader WebGL background
 * - Elastic curtain transition with Kawarp backdrop on engine launch
 */

import React, { useRef, useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Volume2, AudioWaveform } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useLenis } from '../../hooks/useLenis';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { SectionWrapper } from './shared/SectionWrapper';
import { ProgressRail, type ProgressRailSection } from './shared/ProgressRail';
import { QuantumCoreShader } from './QuantumCoreShader';
import { KawarpBackground } from '../Lyrics/KawarpBackground';

// Direct load for initial viewport (Section 1-3)
import { HeroSection } from './sections/HeroSection';
import { VisualizerShowcase } from './sections/VisualizerShowcase';
import { PlayerShowcase } from './sections/PlayerShowcase';

// Lazy load for sections 4-7 to optimize initial bundle and GPU memory
const LyricsShowcase = lazy(() =>
  import('./sections/LyricsShowcase').then((m) => ({ default: m.LyricsShowcase }))
);
const CameraShowcase = lazy(() =>
  import('./sections/CameraShowcase').then((m) => ({ default: m.CameraShowcase }))
);
const LibraryShowcase = lazy(() =>
  import('./sections/LibraryShowcase').then((m) => ({ default: m.LibraryShowcase }))
);
const FinalCTA = lazy(() =>
  import('./sections/FinalCTA').then((m) => ({ default: m.FinalCTA }))
);

const SECTIONS: ProgressRailSection[] = [
  { id: 'hero', label: 'Inicio', number: '01' },
  { id: 'visualizer', label: 'Rainbow Void', number: '02' },
  { id: 'player', label: 'MiniPlayer', number: '03' },
  { id: 'lyrics', label: 'Letras Modo Cine', number: '04' },
  { id: 'camera', label: 'MediaPipe 3D', number: '05' },
  { id: 'library', label: 'Biblioteca', number: '06' },
  { id: 'final', label: 'Iniciar Motor', number: '07' },
];

export const LandingScreenV2: React.FC = () => {
  const setHasStarted = usePlayerStore((s) => s.setHasStarted);
  const setIsTransitioning = usePlayerStore((s) => s.setIsTransitioning);
  const { unlockAudio } = useAudioEngine();

  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // 1. Lenis smooth scroll hook (destroyed cleanly when entering 3D engine)
  const lenisRef = useLenis(!isTransitioningOut);

  // 2. Global scroll progress tracking
  const { progress } = useScrollProgress(SECTIONS.length);

  // 3. Ambient glow mouse follower
  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setMousePos({
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 4. Transition to 3D engine with elastic curtain
  const handleStartExperience = useCallback(() => {
    if (isTransitioningOut) return;
    setIsTransitioningOut(true);
    setIsTransitioning(true);
    unlockAudio();

    // Destroy Lenis immediately
    if (lenisRef.current) {
      lenisRef.current.destroy();
      lenisRef.current = null;
    }

    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 900);
  }, [isTransitioningOut, setIsTransitioning, unlockAudio, lenisRef, setHasStarted]);

  // 5. Scroll smoothly to target section
  const handleScrollToSection = useCallback(
    (index: number) => {
      const sec = SECTIONS[index];
      if (!sec) return;
      const el = document.getElementById(sec.id);
      if (el) {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(el, { offset: -60, duration: 1.4 });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    [lenisRef]
  );

  // Keyboard shortcut listener (Enter to launch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleStartExperience();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartExperience]);

  return (
    <div className="landing-v2-root select-none">
      {/* 0. Top Gradient Progress Bar */}
      <div
        className="landing-v2-progress-bar"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* 0.1 Fixed Dynamic Island Header */}
      <header className="landing-v2-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/20 flex items-center justify-center">
            <AudioWaveform className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight text-white block">
              AURA3D
            </span>
            <span className="font-mono text-[9px] text-white/40 block">
              SPATIAL AUDIO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartExperience}
            className="py-1.5 px-4 rounded-full bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Entrar</span>
          </button>
        </div>
      </header>

      {/* 0.2 Fixed Lateral Navigation Progress Rail */}
      <ProgressRail
        sections={SECTIONS}
        onSelectSection={handleScrollToSection}
      />

      {/* 0.3 Deep Abyssal Shader Background (Fixed) */}
      <div className="fixed inset-0 pointer-events-none -z-20">
        <QuantumCoreShader />
      </div>

      {/* 0.4 Dynamic Cursor Ambient Glow */}
      <div
        className="landing-v2-ambient-glow"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${
            mousePos.y * 100
          }%, rgba(0, 229, 255, 0.08), transparent 80%)`,
        }}
      />

      {/* ──────────────── 7 CONTINUOUS NARRATIVE SECTIONS ──────────────── */}
      <main className="relative z-10 w-full flex flex-col">
        {/* Section 1: Hero */}
        <div id="hero">
          <HeroSection
            onStartExperience={handleStartExperience}
            onExploreClick={() => handleScrollToSection(1)}
          />
        </div>

        {/* Section 2: Visualizer */}
        <SectionWrapper id="visualizer" index={1}>
          <VisualizerShowcase onStartExperience={handleStartExperience} />
        </SectionWrapper>

        {/* Section 3: Player */}
        <SectionWrapper id="player" index={2}>
          <PlayerShowcase onStartExperience={handleStartExperience} />
        </SectionWrapper>

        {/* Section 4: Lyrics (Lazy Loaded) */}
        <SectionWrapper id="lyrics" index={3}>
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <LyricsShowcase onStartExperience={handleStartExperience} />
          </Suspense>
        </SectionWrapper>

        {/* Section 5: Camera (Lazy Loaded) */}
        <SectionWrapper id="camera" index={4}>
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <CameraShowcase onStartExperience={handleStartExperience} />
          </Suspense>
        </SectionWrapper>

        {/* Section 6: Library (Lazy Loaded) */}
        <SectionWrapper id="library" index={5}>
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <LibraryShowcase onStartExperience={handleStartExperience} />
          </Suspense>
        </SectionWrapper>

        {/* Section 7: Final CTA (Lazy Loaded) */}
        <SectionWrapper id="final" index={6}>
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <FinalCTA onStartExperience={handleStartExperience} />
          </Suspense>
        </SectionWrapper>
      </main>

      {/* ──────────────── TRANSITION ELASTIC CURTAIN ──────────────── */}
      <AnimatePresence>
        {isTransitioningOut && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="landing-v2-curtain"
          >
            {/* Kawarp background dynamic wave */}
            <div className="absolute inset-0 opacity-60">
              <KawarpBackground
                primaryColor="#00e5ff"
                secondaryColor="#8c38ff"
                opacity={0.65}
              />
            </div>

            {/* Launching feedback HUD */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                <p className="text-white font-mono text-xs tracking-widest uppercase">
                  Iniciando Motor 3D Aura3D
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
