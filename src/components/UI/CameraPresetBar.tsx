import React from 'react';
import { Eye, RotateCw, Compass, Navigation, Video } from 'lucide-react';
import { usePlayerStore, type CameraPreset } from '../../stores/playerStore';

export const CameraPresetBar: React.FC = React.memo(() => {
  const cameraPreset = usePlayerStore((s) => s.cameraPreset);
  const setCameraPreset = usePlayerStore((s) => s.setCameraPreset);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);

  // Only show on 3D visualizers
  if (visualizerMode === 'blob') return null;

  const presets: { id: CameraPreset; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'front', label: 'Frontal', icon: Eye },
    { id: 'orbit', label: 'Órbita', icon: RotateCw },
    { id: 'drone', label: 'Dron IA', icon: Video },
    { id: 'top', label: 'Aérea', icon: Compass },
    { id: 'driver', label: 'Cabina', icon: Navigation },
  ];

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-dock bg-surface-overlay material-regular border border-border-subtle shadow-[var(--shadow-dock)] animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto select-none font-sans max-w-[calc(100vw-1.5rem)] overflow-x-auto scrollbar-none">
      <span className="text-caption font-mono tracking-wider text-text-tertiary uppercase px-2.5 font-semibold hidden min-[480px]:inline">
        Cámara
      </span>
      <div className="flex items-center gap-0.5">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = cameraPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setCameraPreset(p.id)}
              className={`min-h-11 flex items-center gap-1.5 px-3 py-1.5 rounded-control text-caption font-mono transition-all ${
                isActive
                  ? 'bg-surface-active text-text-primary font-semibold border border-border-strong shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle border border-transparent'
              }`}
              title={`Perspectiva: ${p.label}`}
              aria-label={`Perspectiva de cámara: ${p.label}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-ios-teal' : 'text-text-tertiary'}`} />
              <span className="text-caption hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default CameraPresetBar;
