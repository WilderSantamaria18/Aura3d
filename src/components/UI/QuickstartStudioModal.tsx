import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Box, Volume2, ArrowRight, Check } from 'lucide-react';
import { StudioModal } from './studio/StudioModal';
import { StudioButton } from './studio/StudioButton';
import { usePlayerStore } from '../../stores/playerStore';

export const QuickstartStudioModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const setVisualizerMode = usePlayerStore((s) => s.setVisualizerMode);
  const currentVisualizer = usePlayerStore((s) => s.visualizerMode);

  useEffect(() => {
    // Show only on first launch if not previously dismissed
    const hasSeenOnboarding = localStorage.getItem('aura3d_studio_onboarded_v1');
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('aura3d_studio_onboarded_v1', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={handleComplete}
      title="Bienvenido a Aura3D Studio"
      subtitle="Inicialización de tu entorno de visualización y audio inmersivo"
      badge="ONBOARDING"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Progress Tracker Steps */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          {[
            { num: 1, label: 'Arquitectura' },
            { num: 2, label: 'Visualizador' },
            { num: 3, label: 'Comandos' },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono transition-colors ${
                  step === item.num
                    ? 'bg-cyan-400 text-black font-semibold ring-4 ring-cyan-400/20'
                    : step > item.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {step > item.num ? <Check className="w-3 h-3" /> : item.num}
              </div>
              <span
                className={`text-xs font-mono tracking-wider uppercase ${
                  step === item.num ? 'text-white font-medium' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Core Architecture */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-cyan-400/[0.03] border border-cyan-400/20 flex gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-white/80 leading-relaxed">
                Aura3D transforma tu música en esculturas 3D en tiempo real mediante análisis de transformada rápida de Fourier (FFT) y shaders WebGL de precisión milimétrica.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-cyan-400 flex items-center gap-1.5 font-medium">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audio Local / Spotify</span>
                </div>
                <p className="text-[11px] text-white/60">
                  Arrastra archivos MP3, WAV, FLAC o conecta tu cuenta de Spotify Premium.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-purple-400 flex items-center gap-1.5 font-medium">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>DSP & Ecualizador</span>
                </div>
                <p className="text-[11px] text-white/60">
                  Cadena de ecualización analógica de 5 bandas, limitador y spatial audio 3D.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Visualizer Selection */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-xs text-white/70">
              Elige tu motor visual de inicio (puedes alternar en cualquier momento con la tecla <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-cyan-400">V</kbd>):
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: '3d', name: 'Escultura 3D', desc: 'Mallas geométricas & partículas fluidas' },
                { id: 'party', name: 'Party Engine', desc: 'Luces estroboscópicas & modo club' },
                { id: 'blob', name: 'Fluid Blob', desc: 'Orgánico cromático con deformación FFT' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisualizerMode(v.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between h-28 ${
                    currentVisualizer === v.id
                      ? 'bg-cyan-400/[0.08] border-cyan-400 shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Box className={`w-4 h-4 ${currentVisualizer === v.id ? 'text-cyan-400' : 'text-white/40'}`} />
                    {currentVisualizer === v.id && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-medium text-white">{v.name}</div>
                    <div className="text-[10px] text-white/50 leading-tight mt-0.5">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Key Commands & Ready */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-xs text-white/70">
              Comandos de acceso rápido para control de nivel de estudio:
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-white/60">Play / Pausa</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-400 text-[11px]">Espacio</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-white/60">Ecualizador Rack</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-400 text-[11px]">E</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-white/60">Cambiar Visualizador</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-400 text-[11px]">V</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-white/60">Letras Sincronizadas</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 text-cyan-400 text-[11px]">L</kbd>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              ✓ Todo listo. Arrastra una canción o selecciona una pista para comenzar la experiencia.
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <button
            onClick={handleComplete}
            className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors"
          >
            Omitir introducción
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <StudioButton
                variant="secondary"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as any)}
              >
                Atrás
              </StudioButton>
            )}

            {step < 3 ? (
              <StudioButton
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => setStep((s) => (s + 1) as any)}
              >
                Siguiente
              </StudioButton>
            ) : (
              <StudioButton
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleComplete}
              >
                Iniciar Aura3D
              </StudioButton>
            )}
          </div>
        </div>
      </div>
    </StudioModal>
  );
};
