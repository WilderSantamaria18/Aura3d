import React, { useState, useEffect } from 'react';
import {
  Piano,
  Disc3,
  Waves,
  X,
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
import { midiService, type MidiDevice } from '../../services/midiService';

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

  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);

  useEffect(() => {
    if (isAirInstrumentsActive && midiService.isMidiAvailable()) {
      midiService.init().then(() => {
        setMidiDevices(midiService.getConnectedDevices());
      });
      const unsub = midiService.subscribeDevices((devices) => {
        setMidiDevices(devices);
      });
      return unsub;
    }
  }, [isAirInstrumentsActive]);

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
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto select-none"
      style={{
        fontFeatureSettings: "'ss01', 'cv01', 'tnum' 1",
      }}
    >
      <div className="relative backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-4 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] bg-[#090d18]/95">
        {/* Top Bar: Title, Live Note Badge, Close */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#00e5ff]">
              <Piano className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-medium tracking-wider text-white uppercase">
                  Instrumentos Espaciales 3D
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-white/50 font-mono uppercase">
                  DSP EN VIVO
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-mono flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${midiDevices.length > 0 ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
                  {midiDevices.length > 0 ? midiDevices[0].name.slice(0, 14) : 'MIDI LISTO'}
                </span>
              </div>
              <p className="text-[11px] text-white/40">
                Toca en el aire con las yemas de los dedos o haz clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Note Badge */}
            {lastTriggeredNote && (
              <div className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[#00e5ff] text-xs font-mono font-bold animate-in zoom-in-95 duration-100">
                {lastTriggeredNote}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setAirInstrumentsActive(false)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Cerrar instrumentos de aire"
              aria-label="Cerrar"
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
                    ? 'bg-white/10 border-white/25 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-white/[0.02] border-white/[0.05] text-white/60 hover:bg-white/[0.05] hover:text-white'
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
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/[0.06] text-xs">
          {/* Scale Selector for Synth */}
          {airInstrumentType === 'synth' && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-white/40 text-[10px] font-mono uppercase tracking-wider">ESCALA:</span>
              <div className="relative flex-1">
                <select
                  value={airSynthScale}
                  onChange={(e) => setAirSynthScale(e.target.value as SynthScale)}
                  className="w-full appearance-none bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/30 transition-colors pr-6 cursor-pointer font-mono"
                >
                  {Object.entries(SYNTH_SCALES).map(([key, def]) => (
                    <option key={key} value={key} className="bg-[#090d18] text-white">
                      {def.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Drum Kit Guide */}
          {airInstrumentType === 'drums' && (
            <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span>Kick • Snare • Hi-Hat • Low Tom • Clap • Crash</span>
            </div>
          )}

          {/* Theremin Guide */}
          {airInstrumentType === 'theremin' && (
            <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono">
              <Volume2 className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Mueve índice: Horizontal = Frecuencia | Vertical = Volumen</span>
            </div>
          )}

          {/* Camera Status & Activation Helper */}
          <div className="flex items-center gap-2 ml-auto">
            {!vrMode ? (
              <button
                onClick={ensureTrackingActive}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ACTIVAR CÁMARA</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>
                  {handLandmarks ? 'MANOS DETECTADAS' : 'BUSCANDO MANOS...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tip footer */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
          <Info className="w-3 h-3 text-white/30" />
          <span>
            Baja rápidamente la yema del dedo (golpe aéreo) sobre cualquier tecla o pad para tocar.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AirInstrumentControls;
