import React from 'react';
import { Sparkles, Volume2 } from 'lucide-react';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';

export const AudioUnlockBanner: React.FC = () => {
  const { unlockAudio } = useAudioEngine();
  const { isAudioUnlocked, togglePlay } = usePlayerStore();

  if (isAudioUnlocked) return null;

  const handleActivate = async () => {
    await unlockAudio();
    togglePlay();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl pointer-events-auto">
      <div className="max-w-md w-full bg-gradient-to-b from-[#111728] to-[#070913] border border-cyan-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-cyan-950/80 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-400 to-pink-500 p-[1px] shadow-[0_0_25px_rgba(0,242,254,0.5)]">
          <div className="w-full h-full bg-[#090d1a] rounded-[15px] flex items-center justify-center">
            <Volume2 className="w-8 h-8 text-cyan-300 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">
            AURALIS <span className="text-pink-400">3D</span>
          </h2>
          <p className="text-cyan-200/70 text-sm leading-relaxed">
            Experiencia sonora espacial e inmersiva. Pulsa el botón para inicializar el motor de audio Web Audio API y el visualizador de partículas FFT.
          </p>
        </div>

        <button
          onClick={handleActivate}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 text-slate-950 font-bold text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(0,242,254,0.6)] hover:shadow-[0_0_35px_rgba(255,8,138,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          Activar Audio y Entrar
        </button>

        <p className="text-[11px] text-white/40">
          Puedes arrastrar tus archivos MP3/WAV o conectar Spotify en la biblioteca.
        </p>
      </div>
    </div>
  );
};

