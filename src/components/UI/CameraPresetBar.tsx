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
    <div className="fixed top-[72px] sm:top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 p-0.5 px-1.5 liquid-glass liquid-glass--pill animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto select-none font-sans max-w-[calc(100vw-1.5rem)] overflow-x-auto scrollbar-none">
      <span className="text-[8px] font-mono tracking-wider text-white/40 uppercase px-2 font-semibold hidden min-[480px]:inline">
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
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono transition-all ${
                isActive
                  ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.15] shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
              title={`Perspectiva: ${p.label}`}
              aria-label={`Perspectiva de cámara: ${p.label}`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-cyan-400' : 'text-white/50'}`} />
              <span className="text-[8.5px] hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
