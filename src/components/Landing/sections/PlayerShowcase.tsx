import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Disc3,
  Heart,
  Search,
  ListMusic,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { GlassBadge } from '../shared/GlassBadge';

interface PlayerShowcaseProps {
  onStartExperience: () => void;
}

export const PlayerShowcase: React.FC<PlayerShowcaseProps> = ({
  onStartExperience,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFavorite, setIsFavorite] = useState(true);
  const [progress, setProgress] = useState(42);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Columna Izquierda: Información de features */}
      <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col items-start gap-4">
        <GlassBadge label="03 • ESTACIÓN DE CONTROL" ledColor="cyan" />

        <h2 className="landing-v2-section-title">
          MiniPlayer Dock
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
            Control de audio visionOS.
          </span>
        </h2>

        <p className="landing-v2-section-description">
          Diseñado siguiendo la arquitectura de cristal líquido de Apple: dock
          flotante, navegación segmentada por iconos, ecualizador gráfico
          de 3 bandas y compatibilidad directa con YouTube, archivos FLAC/MP3 y Spotify.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <Search className="w-4 h-4 text-cyan-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white">Búsqueda Global</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Canciones y playlists en streaming instantáneo.</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <SlidersHorizontal className="w-4 h-4 text-purple-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white">EQ Paramétrico</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Ajuste de agudos, medios y sub-graves.</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <ListMusic className="w-4 h-4 text-pink-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white">Cola Infinita</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Gestión de pistas arrastrables y ordenadas.</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <Heart className="w-4 h-4 text-red-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white">Favoritos Locales</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Persistencia y exportación JSON.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartExperience}
          className="mt-4 landing-v2-cta-secondary group"
        >
          <span>Abrir consola del reproductor</span>
          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Columna Derecha: MiniPlayer Interactivo Demo */}
      <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center">
        <div className="relative w-full max-w-[320px] p-4 rounded-[26px] liquid-glass liquid-glass-card border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          {/* Header del dock */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
                REPRODUCIENDO AURA3D
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-1 rounded-full transition-colors ${
                isFavorite ? 'text-rose-400' : 'text-white/40 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Album Vinyl Sleeve */}
          <div className="flex flex-col items-center py-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Spinning Vinyl behind */}
              <div
                className={`absolute right-0 w-32 h-32 rounded-full border border-white/20 shadow-2xl flex items-center justify-center transition-all ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{
                  animationDuration: '6s',
                  background: 'repeating-radial-gradient(circle, #0a0a0f 0px, #14141c 2px, #08080c 3px, #1a1a26 5px)',
                }}
              >
                <div className="w-10 h-10 rounded-full border border-white/40 bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
              </div>

              {/* Cover Art */}
              <div className="relative z-10 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-tr from-cyan-900 via-indigo-950 to-slate-900 flex flex-col justify-end p-2.5">
                <div className="text-[10px] font-mono font-bold text-cyan-300">AURA LIQUID</div>
                <div className="text-[8px] text-white/60">Spatial Master 96kHz</div>
              </div>
            </div>

            {/* Track Meta */}
            <div className="text-center mt-3 w-full px-2">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                Midnight Neon Odyssey
              </h3>
              <p className="text-[11px] text-white/50 truncate">
                Auralis Studio • 2026 Remaster
              </p>
            </div>
          </div>

          {/* Interactive Progress Bar */}
          <div className="flex flex-col gap-1 px-1">
            <div
              className="relative w-full h-2 rounded-full bg-white/10 cursor-pointer overflow-hidden group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
                setProgress(pos);
              }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-white/40">
              <span>01:42</span>
              <span>04:08</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between px-2 pt-2">
            <button type="button" className="p-1.5 text-white/40 hover:text-white transition-colors">
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>
            <button type="button" className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button type="button" className="p-1.5 text-white/40 hover:text-white transition-colors">
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
