import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, AudioWaveform, Cpu, Terminal, Shield } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface FinalCTAProps {
  onStartExperience: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onStartExperience }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center gap-8 py-16 relative">
      {/* Background Breathing Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-cyan-500/20 via-violet-600/20 to-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      <GlassBadge label="07 • EXPERIENCIA TOTAL" ledColor="cyan" />

      <div className="max-w-2xl flex flex-col items-center gap-4">
        <h2 className="landing-v2-hero-title text-4xl sm:text-6xl lg:text-7xl">
          ¿Listo para la experiencia?
        </h2>
        <p className="landing-v2-section-description max-w-xl">
          Ingresa al motor de audio espacial 3D de Aura3D. Sin tiempos de espera,
          con aceleración por hardware completa y arquitectura Apple Liquid Glass.
        </p>
      </div>

      {/* Main Big CTA Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={onStartExperience}
        className="mt-4 px-10 py-5 rounded-full bg-white text-black font-extrabold text-lg sm:text-xl tracking-tight shadow-[0_12px_40px_rgba(255,255,255,0.4),0_0_80px_rgba(0,229,255,0.5)] flex items-center gap-3 cursor-pointer group transition-all"
      >
        <Play className="w-6 h-6 fill-current transition-transform group-hover:scale-110" />
        <span>INICIAR AURA3D</span>
      </motion.button>

      {/* Micro-copy shortcuts */}
      <div className="flex items-center gap-2 text-xs font-mono text-white/40">
        <span>Presiona</span>
        <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80 font-mono text-[10px]">
          ENTER
        </kbd>
        <span>o haz clic en el botón</span>
      </div>

      {/* Footer Specs and Architecture */}
      <div className="mt-16 pt-8 border-t border-white/[0.08] w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-white/40">
        <div className="flex items-center gap-2">
          <AudioWaveform className="w-4 h-4 text-cyan-400" />
          <span>AURA3D STUDIO • v2.0 LIQUID SCROLL</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> Web Audio API 96kHz
          </span>
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Three.js + R3F
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> MediaPipe Vision
          </span>
        </div>
      </div>
    </div>
  );
};
