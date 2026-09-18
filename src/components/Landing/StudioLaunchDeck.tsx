import React, { useState, useRef } from 'react';
import { Zap, Upload, Mic, ArrowRight, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface StudioLaunchDeckProps {
  onStartExperience: () => void;
  onMicStart: () => void;
  onFileLoaded: (file: File) => void;
}

type PaletteId = 'neon' | 'gold' | 'crystal';

const PALETTES: { id: PaletteId; label: string }[] = [
  { id: 'neon', label: 'Neón Líquido' },
  { id: 'gold', label: 'Oro Monocromo' },
  { id: 'crystal', label: 'Platino Puro' },
];

/**
 * StudioLaunchDeck
 * Plataforma de Lanzamiento con Núcleo Esférico Liquid Void reactivo al kick (Canal 04).
 * Rediseñada con la auténtica fórmula Apple visionOS Liquid Glass:
 * - Esfera central de cristal líquido interactiva con feedback al kick
 * - Dropzone de audio en vidrio esmerilado con bisel de luz superior
 * - Botones CTA en cápsulas liquid glass con física táctil elástica
 */
export const StudioLaunchDeck: React.FC<StudioLaunchDeckProps> = ({
  onStartExperience,
  onMicStart,
  onFileLoaded,
}) => {
  const { blobSettings, updateBlobSettings } = usePlayerStore();
  const [kickIntensity, setKickIntensity] = useState<number>(
    blobSettings?.kickIntensity ? Math.round(blobSettings.kickIntensity * 100) : 75
  );
  const [isKicking, setIsKicking] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePalette = (blobSettings?.sacredPalette as PaletteId) || 'neon';

  const triggerKickPulse = () => {
    setIsKicking(true);
    setTimeout(() => {
      setIsKicking(false);
    }, 140);
  };

  const handleIntensityChange = (val: number) => {
    setKickIntensity(val);
    updateBlobSettings({ kickIntensity: val / 100 });
  };

  const handlePaletteSelect = (palId: PaletteId) => {
    updateBlobSettings({ sacredPalette: palId });
  };

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

  const scaleFactor = 1 + (kickIntensity / 100) * 0.35;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 select-none font-sans">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <span className="font-mono text-[10px] sm:text-[11px] text-cyan-400 tracking-widest uppercase">
          [ 04 // PLATAFORMA DE LANZAMIENTO ]
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
          Liquid Void Interactive Engine
        </h2>
        <p className="font-sans text-xs sm:text-sm text-white/70 mt-1">
          Prueba la respuesta háptica de graves sobre el núcleo óptico reactivo.
        </p>
      </div>

      {/* Main Visualizer Arena (Liquid Glass Card) */}
      <div className="w-full p-6 sm:p-8 liquid-glass-card border border-white/10 border-t-white/30 shadow-[0_28px_80px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.22)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Central Interactive Liquid Void Sphere */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Outer Specular Rim Bezel */}
            <div className="absolute inset-0 rounded-full border border-white/20 shadow-[0_0_40px_rgba(0,229,255,0.2)]" />

            {/* Rotating Conic Multi-Chromatic Gradient Hairline */}
            <div className="absolute inset-2 rounded-full bg-[conic-gradient(from_0deg,#00e5ff,#8c38ff,#ff088a,#00e5ff)] p-[1.5px] animate-[spin_6s_linear_infinite]">
              <div className="w-full h-full rounded-full bg-black/90" />
            </div>

            {/* Dynamic Kick-Reactive Void Orb */}
            <div
              onClick={triggerKickPulse}
              className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-black/90 via-slate-900/80 to-black/90 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all duration-100 ease-out will-change-transform border border-white/10"
              style={{
                transform: isKicking ? `scale(${scaleFactor})` : 'scale(1)',
                boxShadow: isKicking
                  ? 'inset 0 0 35px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.7)'
                  : 'inset 0 0 30px rgba(0,229,255,0.25), 0 0 30px rgba(140,56,255,0.25)',
              }}
              title="Clic o presiona ESPACIO para probar el golpe"
            >
              <Zap className="w-8 h-8 text-cyan-400 mb-1" />
              <span className="font-mono text-[10px] text-cyan-300 tracking-wider uppercase">
                PULSO VOID
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-emerald-400">
                {kickIntensity}% INT
              </span>
            </div>
          </div>

          {/* Manual Kick Trigger Button */}
          <button
            type="button"
            onClick={triggerKickPulse}
            className="mt-4 px-6 py-2.5 liquid-glass-pill hover:bg-white/15 text-white border border-white/20 font-mono text-xs tracking-wider transition-all active:scale-[0.97] shadow-md cursor-pointer flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRIGGER KICK (SPACEBAR)</span>
          </button>
        </div>

        {/* Right Configuration & Action Launchpad */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Kick Intensity Slider */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl liquid-glass border border-white/10 shadow-sm">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white/70">SENSIBILIDAD TRANSIENTES</span>
              <span className="text-cyan-400 font-bold">{kickIntensity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              value={kickIntensity}
              onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Sacred Palette Optical Selector */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider">
              PALETA ÓPTICA DEL VACÍO
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handlePaletteSelect(pal.id)}
                  className={`py-2 px-3 rounded-xl font-mono text-xs transition-all cursor-pointer border active:scale-[0.97] text-center ${
                    activePalette === pal.id
                      ? 'liquid-glass bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                      : 'liquid-glass text-white/70 hover:text-white border-white/10 hover:border-white/20'
                  }`}
                >
                  {pal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Dropzone for Launch */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/20 scale-[1.01] shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                : 'liquid-glass border-white/10 hover:border-white/20 hover:bg-white/[0.08] shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl liquid-glass-pill border border-white/20 flex items-center justify-center shrink-0 text-cyan-400">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs sm:text-sm text-white font-semibold">
                  Arrastra archivo de audio
                </span>
                <span className="font-mono text-[10px] text-white/50">
                  Carga inmediata al motor 3D
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-cyan-300 underline underline-offset-2">
              Explorar
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Master Entry Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onStartExperience}
              className="flex-1 min-w-[200px] py-3.5 px-6 rounded-full bg-white text-black hover:bg-white/90 font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-[0.97] transition-all cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>INICIAR MOTOR 3D</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onMicStart}
              className="py-3.5 px-5 rounded-full liquid-glass-pill hover:bg-white/15 text-white border border-white/20 font-mono text-xs sm:text-sm flex items-center gap-2 active:scale-[0.97] transition-all cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Micrófono</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioLaunchDeck;
