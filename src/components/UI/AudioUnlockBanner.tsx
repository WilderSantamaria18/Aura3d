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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl pointer-events-auto animate-aura-backdrop">
      <div className="max-w-md w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-[var(--radius-modal)] p-8 text-center shadow-[var(--shadow-modal)] space-y-6 animate-aura-modal">
        <div className="w-16 h-16 mx-auto rounded-[var(--radius-card)] bg-white/[0.06] border border-[var(--border-medium)] flex items-center justify-center">
          <Volume2 className="w-8 h-8 text-cyan-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight font-heading">
            AURALIS <span className="text-cyan-400">3D</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Experiencia sonora espacial e inmersiva. Pulsa el botón para inicializar el motor de audio Web Audio API y el visualizador de partículas FFT.
          </p>
        </div>

        <button
          onClick={handleActivate}
          className="w-full py-3.5 px-6 rounded-[var(--radius-control)] bg-white text-black font-semibold text-sm tracking-tight shadow-[var(--shadow-card)] hover:bg-white/90 active:scale-[0.97] transition-all flex items-center justify-center gap-2 btn-spring"
        >
          <Sparkles className="w-4 h-4" />
          Activar Audio y Entrar
        </button>

        <p className="text-[11px] text-[var(--text-tertiary)]">
          Puedes arrastrar tus archivos MP3/WAV o conectar Spotify en la biblioteca.
        </p>
      </div>
    </div>
  );
};

