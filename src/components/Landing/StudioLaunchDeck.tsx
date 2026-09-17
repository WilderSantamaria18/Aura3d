import React, { useState, useRef } from 'react';
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
 * Prueba de resorte háptico de graves, selector de paleta óptica y puntos de entrada
 * directos (Stems locales / Micrófono en vivo).
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
        <span className="font-mono text-[10px] sm:text-[11px] text-[#7df4ff] tracking-widest uppercase">
          [ 04 // PLATAFORMA DE LANZAMIENTO ]
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e3e1e9] mt-0.5">
          Liquid Void Interactive Engine
        </h2>
        <p className="font-sans text-xs sm:text-sm text-[#b9cacb] mt-1">
          Prueba la respuesta háptica de graves sobre el núcleo óptico reactivo.
        </p>
      </div>

      {/* Main Visualizer Arena */}
      <div className="w-full p-6 sm:p-8 rounded-3xl bg-[#1a1b21]/80 border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Central Interactive Liquid Void Sphere */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Outer Titanium Bezel */}
            <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_40px_rgba(0,229,255,0.15)]" />

            {/* Rotating Conic Multi-Chromatic Gradient Hairline */}
            <div className="absolute inset-2 rounded-full bg-[conic-gradient(from_0deg,#00e5ff,#8c38ff,#ff088a,#00e5ff)] p-[1.5px] animate-[spin_6s_linear_infinite]">
              <div className="w-full h-full rounded-full bg-[#05070e]" />
            </div>

            {/* Dynamic Kick-Reactive Void Orb */}
            <div
              onClick={triggerKickPulse}
              className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-[#05070e] via-[#0b0f1d] to-[#05070e] flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all duration-100 ease-out will-change-transform"
              style={{
                transform: isKicking ? `scale(${scaleFactor})` : 'scale(1)',
                boxShadow: isKicking
                  ? 'inset 0 0 35px rgba(0,229,255,0.6), 0 0 50px rgba(0,229,255,0.7)'
                  : 'inset 0 0 30px rgba(0,229,255,0.25), 0 0 30px rgba(140,56,255,0.2)',
              }}
              title="Clic o presiona ESPACIO para probar el golpe"
            >
              {/* Lightning Pulse SVG */}
              <svg
                className="w-8 h-8 text-[#00f0ff] mb-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono text-[10px] text-[#00f0ff] tracking-wider uppercase">
                PULSO VOID
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-[#00ff9d]">
                {kickIntensity}% INT
              </span>
            </div>
          </div>

          {/* Manual Kick Trigger Button */}
          <button
            type="button"
            onClick={triggerKickPulse}
            className="mt-4 px-6 py-2 rounded-full bg-[#292a2f] hover:bg-[#34343a] text-[#dbfcff] border border-white/[0.08] font-mono text-xs tracking-wider transition-all active:scale-95 shadow-md cursor-pointer"
          >
            TRIGGER KICK (SPACEBAR)
          </button>
        </div>

        {/* Controls & Stems Launch Cards (Right) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Kick Intensity Control Card */}
          <div className="p-4 rounded-2xl bg-[#1e1f25]/70 border border-white/[0.06] backdrop-blur-md flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#e3e1e9]">Intensidad del Golpe (Kick Spring)</span>
              <span className="text-[#00f0ff] font-bold">{kickIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={kickIntensity}
              onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
              className="w-full accent-[#00f0ff] bg-[#34343a] h-1.5 rounded-full cursor-pointer"
            />
          </div>

          {/* Optical Color Palette Pills */}
          <div className="p-4 rounded-2xl bg-[#1e1f25]/70 border border-white/[0.06] backdrop-blur-md flex flex-col gap-2">
            <span className="font-mono text-[10px] text-[#849495] uppercase">
              Paleta Óptica Activa
            </span>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((pal) => {
                const isSelected = activePalette === pal.id;

                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handlePaletteSelect(pal.id)}
                    className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                        : 'bg-[#292a2f] hover:bg-[#34343a] text-[#b9cacb] border border-white/[0.04]'
                    }`}
                  >
                    {pal.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two Launch Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {/* Local Stems Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between h-28 ${
                isDragging
                  ? 'bg-[#00f0ff]/15 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                  : 'bg-[#1e1f25] border-white/[0.06] hover:bg-[#292a2f] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#00f0ff] tracking-wider">
                  BIBLIOTECA LOCAL
                </span>
                <svg
                  className="w-4 h-4 text-[#849495] group-hover:text-[#00f0ff] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="font-sans text-sm font-semibold text-[#e3e1e9] block">
                  Explorar Stems
                </span>
                <span className="font-mono text-[11px] text-[#849495]">
                  16 Tracks precargados o cargar
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.ogg"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Active Streaming (Mic / Line In) */}
            <div
              onClick={onMicStart}
              className="p-4 rounded-2xl bg-[#1e1f25] border border-white/[0.06] hover:bg-[#292a2f] hover:border-[#00ff9d]/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between h-28"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#00ff9d] tracking-wider">
                  STREAMING ACTIVO
                </span>
                <svg
                  className="w-4 h-4 text-[#849495] group-hover:text-[#00ff9d] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <span className="font-sans text-sm font-semibold text-[#e3e1e9] block">
                  WASAPI / Line In
                </span>
                <span className="font-mono text-[11px] text-[#849495]">
                  Ruta de audio directa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Keyboard Shortcuts & Badges Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2 pt-2 text-[#849495] font-mono text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#292a2f] text-[#dbfcff] font-semibold text-[10px] border border-white/[0.06]">
              ESPACIO
            </kbd>{' '}
            Iniciar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#292a2f] text-[#dbfcff] font-semibold text-[10px] border border-white/[0.06]">
              M
            </kbd>{' '}
            Micrófono
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#292a2f] text-[#dbfcff] font-semibold text-[10px] border border-white/[0.06]">
              SCROLL
            </kbd>{' '}
            Canales
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[#292a2f] text-[#dbfcff] font-semibold text-[10px] border border-white/[0.06]">
              G
            </kbd>{' '}
            Galería 3D
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#00e5ff]">48 kHz DSP</span>
          <span>•</span>
          <span className="text-[#8c38ff]">8-Band EQ</span>
          <span>•</span>
          <span className="text-[#ff088a]">WebGL Shaders</span>
        </div>
      </div>
    </div>
  );
};

export default StudioLaunchDeck;
