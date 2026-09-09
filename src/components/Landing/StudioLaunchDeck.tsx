import React, { useState } from 'react';
import { Play, UploadCloud, Mic, ArrowRight, ShieldCheck, Cpu, Sparkles } from 'lucide-react';

interface StudioLaunchDeckProps {
  onStartExperience: () => void;
  onMicStart: () => void;
  onFileLoaded: (file: File) => void;
}

/**
 * StudioLaunchDeck
 * Consola central de lanzamiento interactiva con dropzone de audio y lanzador de experiencia 3D.
 */
export const StudioLaunchDeck: React.FC<StudioLaunchDeckProps> = ({
  onStartExperience,
  onMicStart,
  onFileLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onFileLoaded(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-[#070b16]/95 border border-white/[0.10] shadow-[0_35px_80px_rgba(0,0,0,0.9)] p-6 sm:p-8 backdrop-blur-2xl text-white font-mono select-none text-center">
      {/* ── Eyebrow Header ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] uppercase tracking-[0.2em] mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        <span>SISTEMA LISTO PARA INMERSIÓN</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-2">
        Inicializar Espacio Acústico 3D
      </h2>
      <p className="text-xs text-white/50 font-light max-w-md mx-auto mb-6 leading-relaxed">
        Elige tu método de entrada para sincronizar el motor de audio y sumergirte en el visualizador.
      </p>

      {/* ── Input Action Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 text-left">
        {/* Dropzone Local Files */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/40 scale-[1.02]'
              : 'border-white/[0.08] bg-black/30 hover:border-white/20 hover:bg-white/[0.03]'
          }`}
        >
          <label className="flex flex-col gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white">Archivos Locales</div>
              <div className="text-[10px] text-white/40 font-light mt-0.5">
                MP3, WAV, FLAC o examinar
              </div>
            </div>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Live Microphone Input */}
        <div
          onClick={onMicStart}
          className="p-4 rounded-2xl border border-white/[0.08] bg-black/30 hover:border-pink-500/40 hover:bg-pink-950/10 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-white">Micrófono Directo</div>
              <div className="text-[10px] text-white/40 font-light mt-0.5">
                Captura de voz o instrumentos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Big Primary Launch CTA ── */}
      <button
        onClick={onStartExperience}
        className="w-full py-4 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm tracking-wider uppercase hover:bg-cyan-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_12px_35px_rgba(255,255,255,0.2)] group"
      >
        <Play className="w-4 h-4 fill-current text-black group-hover:scale-110 transition-transform" />
        <span>Entrar al Visualizador Aura3D</span>
        <ArrowRight className="w-4 h-4 text-black/70 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* System Specs Footer Badges */}
      <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-center gap-4 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" /> GPU Shaders
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> 24-Bit / 48kHz
        </span>
        <span>•</span>
        <span>0 Latencia</span>
      </div>
    </div>
  );
};

export default StudioLaunchDeck;
