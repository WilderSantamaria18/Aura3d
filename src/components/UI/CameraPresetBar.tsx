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
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-2xl bg-[#070913]/70 backdrop-blur-3xl border border-white/[0.06] border-t-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto">
      <span className="text-[9px] font-mono tracking-[0.18em] text-white/40 uppercase px-2 font-medium hidden min-[480px]:inline">
        Cámara 3D
      </span>
      <div className="flex items-center gap-0.5">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = cameraPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setCameraPreset(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30 shadow-sm'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent'
              }`}
              title={`Perspectiva: ${p.label}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-white/50'}`} />
              <span className="text-[10px] hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
