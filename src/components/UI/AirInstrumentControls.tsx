import React from 'react';
import {
  Piano,
  Disc3,
  Waves,
  X,
  Sparkles,
  Camera,
  Volume2,
  ChevronDown,
  Info,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import {
  SYNTH_SCALES,
  type InstrumentType,
  type SynthScale,
} from '../../services/airSynthEngine';

export const AirInstrumentControls: React.FC = () => {
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const setAirInstrumentsActive = usePlayerStore((s) => s.setAirInstrumentsActive);
  const airInstrumentType = usePlayerStore((s) => s.airInstrumentType);
  const setAirInstrumentType = usePlayerStore((s) => s.setAirInstrumentType);
  const airSynthScale = usePlayerStore((s) => s.airSynthScale);
  const setAirSynthScale = usePlayerStore((s) => s.setAirSynthScale);
  const lastTriggeredNote = usePlayerStore((s) => s.lastTriggeredNote);
  const vrMode = usePlayerStore((s) => s.vrMode);
  const setVrMode = usePlayerStore((s) => s.setVrMode);
  const setVrTrackingMode = usePlayerStore((s) => s.setVrTrackingMode);
  const handLandmarks = usePlayerStore((s) => s.handLandmarks);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);

  if (!isAirInstrumentsActive) return null;

  // Ensure camera tracking is active in hands mode
  const ensureTrackingActive = () => {
    if (!vrMode) {
      setVrTrackingMode('hands');
      setVrMode(true);
    }
  };

  const instruments: { id: InstrumentType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'synth',
      label: 'Quantum Synth',
      icon: <Piano className="w-4 h-4 text-cyan-400" />,
      desc: 'Teclado 3D pentatónico',
    },
    {
      id: 'drums',
      label: 'Cyber Drums',
      icon: <Disc3 className="w-4 h-4 text-pink-500" />,
      desc: 'Batería 6 pads en arco',
    },
    {
      id: 'theremin',
      label: 'Laser Theremin',
      icon: <Waves className="w-4 h-4 text-emerald-400" />,
      desc: 'Cinta láser continua',
    },
  ];

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
      style={{
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      <div
        className={`relative backdrop-blur-2xl rounded-2xl border p-4 shadow-2xl transition-all ${
          isLucid
            ? 'lucid-panel'
            : 'bg-black/85 border-cyan-500/40 shadow-[0_0_40px_rgba(0,242,254,0.2)]'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: lucidTheme.glassColor,
                borderColor: lucidTheme.borderColor,
                boxShadow: `0 0 35px ${lucidTheme.glow}`,
              }
            : undefined
        }
      >
        {/* Top Bar: Title, Live Note Badge, Close */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  Instrumentos de Aire 3D
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-mono">
                  LIVE DSP
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Toca en el aire con las yemas de los dedos o haz clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Note Badge */}
            {lastTriggeredNote && (
              <div className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)] animate-in zoom-in-95 duration-100">
                {lastTriggeredNote}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setAirInstrumentsActive(false)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Cerrar instrumentos de aire"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instrument Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {instruments.map((inst) => {
            const isActive = airInstrumentType === inst.id;
            return (
              <button
                key={inst.id}
                onClick={() => setAirInstrumentType(inst.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-cyan-500/25 to-cyan-500/10 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,242,254,0.25)]'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {inst.icon}
                  <span className="text-xs font-semibold">{inst.label}</span>
                </div>
                <span className="text-[10px] text-white/40">{inst.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Options Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
          {/* Scale Selector for Synth */}
          {airInstrumentType === 'synth' && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-white/50 text-[11px] font-mono">ESCALA:</span>
              <div className="relative flex-1">
                <select
                  value={airSynthScale}
                  onChange={(e) => setAirSynthScale(e.target.value as SynthScale)}
                  className="w-full appearance-none bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors pr-6 cursor-pointer"
                >
                  {Object.entries(SYNTH_SCALES).map(([key, def]) => (
                    <option key={key} value={key} className="bg-slate-900 text-white">
                      {def.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Drum Kit Guide */}
          {airInstrumentType === 'drums' && (
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span>Kick • Snare • Hi-Hat • Low Tom • Clap • Crash</span>
            </div>
          )}

          {/* Theremin Guide */}
          {airInstrumentType === 'theremin' && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-300/80">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Mueve el dedo índice: Horizontal = Frecuencia | Vertical = Volumen</span>
            </div>
          )}

          {/* Camera Status & Activation Helper */}
          <div className="flex items-center gap-2 ml-auto">
            {!vrMode ? (
              <button
                onClick={ensureTrackingActive}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ACTIVAR CÁMARA</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {handLandmarks ? 'MANOS DETECTADAS' : 'BUSCANDO MANOS...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tip footer */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
          <Info className="w-3 h-3 text-cyan-400/70" />
          <span>
            Baja rápidamente la yema del dedo (golpe aéreo) sobre cualquier tecla o pad para tocar.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AirInstrumentControls;
