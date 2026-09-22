import React, { useState, useEffect } from 'react';
import { Mic, Waves, Type, Sparkles, ArrowRight } from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface LyricsShowcaseProps {
  onStartExperience: () => void;
}

const DEMO_LYRICS = [
  { text: 'Through the neon rain of Tokyo nights', time: '0:12' },
  { text: 'A thousand echoes calling out your name', time: '0:16' },
  { text: 'We drift in liquid glass and spatial waves', time: '0:21', active: true },
  { text: 'And lose ourselves in harmonic resonance', time: '0:25' },
  { text: 'Until the morning light reveals the stars', time: '0:30' },
];

export const LyricsShowcase: React.FC<LyricsShowcaseProps> = ({
  onStartExperience,
}) => {
  const [activeIndex, setActiveIndex] = useState(2);

  // Auto-advance lyrics for demo effect
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % DEMO_LYRICS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
      <GlassBadge label="04 • MODO CINE & SINCRONIZACIÓN" ledColor="magenta" />

      <div>
        <h2 className="landing-v2-section-title">
          Letras Sincronizadas
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-400">
            Palabra por palabra con desenfoque dinámico.
          </span>
        </h2>
        <p className="landing-v2-section-description max-w-2xl mx-auto">
          Inspirado en Apple Music y Liquid-Lyrics: motor de sincronización LRCLIB,
          karaoke palabra por palabra, fondo reactivo Kawarp y transiciones fluidas.
        </p>
      </div>

      {/* Showcase Card: Floating Lyrics Demo */}
      <div className="w-full max-w-xl p-6 sm:p-8 rounded-[32px] liquid-glass liquid-glass-card border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.85)] relative overflow-hidden text-left">
        {/* Breathing backdrop glow inside the card */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white/90">
              LRCLIB • Sincronización 100% Precisa
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
            KARAOKE LIVE
          </span>
        </div>

        {/* Lines */}
        <div className="flex flex-col gap-4 py-6 relative z-10">
          {DEMO_LYRICS.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`transition-all duration-500 cursor-pointer flex items-center justify-between gap-4 p-2 rounded-xl ${
                  isActive
                    ? 'scale-105 origin-left text-white font-extrabold text-lg sm:text-xl drop-shadow-[0_0_24px_rgba(0,229,255,0.7)] bg-white/[0.04]'
                    : isPast
                    ? 'text-white/40 blur-[1px] text-sm sm:text-base font-medium hover:text-white/70 hover:blur-0'
                    : 'text-white/50 blur-[1.5px] text-sm sm:text-base font-medium hover:text-white/80 hover:blur-0'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive && (
                    <span className="w-1.5 h-6 rounded-full bg-cyan-400 shadow-[0_0_12px_#00e5ff] animate-pulse" />
                  )}
                  <span>{line.text}</span>
                </div>
                <span className="text-[10px] font-mono opacity-50 flex-shrink-0">
                  {line.time}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/50 relative z-10">
          <span>Toca una línea para saltar de inmediato</span>
          <button
            type="button"
            onClick={onStartExperience}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <span>Ver Modo Cine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
