import React from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronDown, Sparkles, AudioWaveform } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';
import { ParallaxLayer } from '../shared/ParallaxLayer';

interface HeroSectionProps {
  onStartExperience: () => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartExperience,
  onExploreClick,
}) => {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 overflow-hidden select-none">
      {/* Radial soft glow backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-gradient-to-tr from-cyan-500/10 via-violet-600/10 to-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <ParallaxLayer speed={0.3} className="w-full flex flex-col items-center">
        {/* Release Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <GlassBadge
            label="AURA3D STUDIO • APPLE LIQUID GLASS"
            ledColor="cyan"
            icon={<Sparkles className="w-3 h-3 text-cyan-300" />}
          />
        </motion.div>

        {/* 3D Kinetic Floating Icon / Orb */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 mb-8 flex items-center justify-center cursor-pointer group"
          onClick={onStartExperience}
          title="Toca para iniciar Aura3D"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/40 via-purple-500/30 to-pink-500/40 blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
          <div className="relative w-full h-full rounded-full border border-white/30 bg-white/[0.06] backdrop-blur-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform duration-300">
            <AudioWaveform className="w-10 h-10 text-cyan-300 group-hover:text-white transition-colors" />
            <div className="absolute inset-1 rounded-full border border-cyan-400/20 animate-spin" style={{ animationDuration: '14s' }} />
          </div>
        </motion.div>

        {/* Monumental Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: 'blur(20px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="landing-v2-hero-title text-center"
        >
          AURA3D
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="landing-v2-hero-subtitle text-center px-4"
        >
          Estación de audio espacial cinematográfica con visualizadores 3D
          reactivos, letras sincronizadas palabra por palabra y control gestual en el aire.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
        >
          <button
            type="button"
            onClick={onStartExperience}
            className="landing-v2-cta-primary group"
          >
            <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
            <span>Iniciar Motor 3D</span>
          </button>

          <button
            type="button"
            onClick={onExploreClick}
            className="landing-v2-cta-secondary group"
          >
            <span>Explorar experiencia</span>
            <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* Micro-copy footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
            Desliza para descubrir el recorrido
          </span>
          <div className="w-5 h-8 rounded-full border border-white/20 p-1 flex justify-center">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            />
          </div>
        </motion.div>
      </ParallaxLayer>
    </section>
  );
};
