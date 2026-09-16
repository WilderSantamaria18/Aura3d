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
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          {[
            { num: 1, label: 'Arquitectura' },
            { num: 2, label: 'Visualizador' },
            { num: 3, label: 'Comandos' },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-pill flex items-center justify-center text-caption font-mono font-tabular transition-colors ${
                  step === item.num
                    ? 'bg-accent-teal text-black font-semibold ring-4 ring-accent-teal/20'
                    : step > item.num
                    ? 'bg-status-success/20 text-status-success border border-status-success/40'
                    : 'bg-white/10 text-text-tertiary border border-border-subtle'
                }`}
              >
                {step > item.num ? <Check className="w-4 h-4" /> : item.num}
              </div>
              <span
                className={`text-caption font-mono tracking-wider uppercase ${
                  step === item.num ? 'text-text-primary font-medium' : 'text-text-tertiary'
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
            <div className="p-4 rounded-card bg-accent-teal/10 border border-accent-teal/20 flex gap-3">
              <Sparkles className="w-5 h-5 text-accent-teal shrink-0 mt-0.5" />
              <div className="text-caption text-text-primary leading-relaxed">
                Aura3D transforma tu música en esculturas 3D en tiempo real mediante análisis de transformada rápida de Fourier (FFT) y shaders WebGL de precisión milimétrica.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-caption font-mono">
              <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle space-y-1">
                <div className="text-accent-teal flex items-center gap-1.5 font-medium">
                  <Volume2 className="w-4 h-4" />
                  <span>Audio Local / Spotify</span>
                </div>
                <p className="text-caption text-text-secondary">
                  Arrastra archivos MP3, WAV, FLAC o conecta tu cuenta de Spotify Premium.
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface-base/60 border border-border-subtle space-y-1">
                <div className="text-accent-purple flex items-center gap-1.5 font-medium">
                  <Sliders className="w-4 h-4" />
                  <span>DSP & Ecualizador</span>
                </div>
                <p className="text-caption text-text-secondary">
                  Cadena de ecualización analógica de 5 bandas, limitador y spatial audio 3D.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Visualizer Selection */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-caption text-text-secondary">
              Elige tu motor visual de inicio (puedes alternar en cualquier momento con la tecla <kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 font-mono text-accent-teal">V</kbd>):
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'sphere', name: 'Escultura 3D', desc: 'Mallas geométricas & partículas fluidas' },
                { id: 'synthwave', name: 'Synthwave 3D', desc: 'Carretera retro y atardecer neón' },
                { id: 'blob', name: 'Rainbow Void', desc: 'Orgánico cromático con deformación FFT' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisualizerMode(v.id as any)}
                  aria-pressed={currentVisualizer === v.id}
                  aria-label={`Seleccionar visualizador ${v.name}`}
                  className={`p-3 rounded-card text-left border transition-all flex flex-col justify-between min-h-28 cursor-pointer ${
                    currentVisualizer === v.id
                      ? 'bg-accent-teal/15 border-accent-teal shadow-subtle'
                      : 'bg-surface-base/60 border-border-subtle hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Box className={`w-4 h-4 ${currentVisualizer === v.id ? 'text-accent-teal' : 'text-text-tertiary'}`} />
                    {currentVisualizer === v.id && (
                      <span className="w-2 h-2 rounded-pill bg-accent-teal" />
                    )}
                  </div>
                  <div>
                    <div className="text-caption font-mono font-medium text-text-primary">{v.name}</div>
                    <div className="text-caption text-text-secondary leading-tight mt-0.5">{v.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Key Commands & Ready */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-caption text-text-secondary">
              Comandos de acceso rápido para control de nivel de estudio:
            </div>

            <div className="grid grid-cols-2 gap-2 text-caption font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-control bg-surface-base/60 border border-border-subtle">
                <span className="text-text-secondary">Play / Pausa</span>
                <kbd className="px-2 py-0.5 rounded-badge bg-white/10 text-accent-teal text-caption">Espacio</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-control bg-surface-base/60 border border-border-subtle">
                <span className="text-text-secondary">Ecualizador Rack</span>
                <kbd className="px-2 py-0.5 rounded-badge bg-white/10 text-accent-teal text-caption">E</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-control bg-surface-base/60 border border-border-subtle">
                <span className="text-text-secondary">Cambiar Visualizador</span>
                <kbd className="px-2 py-0.5 rounded-badge bg-white/10 text-accent-teal text-caption">V</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-control bg-surface-base/60 border border-border-subtle">
                <span className="text-text-secondary">Letras Sincronizadas</span>
                <kbd className="px-2 py-0.5 rounded-badge bg-white/10 text-accent-teal text-caption">L</kbd>
              </div>
            </div>

            <div className="p-3 rounded-card bg-status-success/15 border border-status-success/30 text-caption text-status-success flex items-center gap-1.5">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Todo listo. Arrastra una canción o selecciona una pista para comenzar la experiencia.</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <button
            onClick={handleComplete}
            className="min-h-11 px-3 text-caption font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer rounded-control hover:bg-white/10"
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
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep((s) => (s + 1) as any)}
              >
                Siguiente
              </StudioButton>
            ) : (
              <StudioButton
                variant="primary"
                size="sm"
                icon={<Check className="w-4 h-4" />}
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

export default QuickstartStudioModal;
