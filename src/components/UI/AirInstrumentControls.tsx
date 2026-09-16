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
      icon: <Piano className="w-4 h-4 text-ios-teal" />,
      desc: 'Teclado 3D pentatónico',
    },
    {
      id: 'drums',
      label: 'Cyber Drums',
      icon: <Disc3 className="w-4 h-4 text-ios-pink" />,
      desc: 'Batería 6 pads en arco',
    },
    {
      id: 'theremin',
      label: 'Laser Theremin',
      icon: <Waves className="w-4 h-4 text-status-success" />,
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
      <div className="relative rounded-modal border border-border-subtle p-4 shadow-[var(--shadow-modal)] bg-surface-overlay material-thick">
        {/* Top Bar: Title, Live Note Badge, Close */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-ios-teal">
              <Piano className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-caption font-mono font-medium tracking-wider text-text-primary uppercase">
                  Instrumentos Espaciales 3D
                </h3>
                <span className="text-caption px-1.5 py-0.5 rounded-badge border border-border-subtle bg-surface-subtle text-text-tertiary font-mono uppercase">
                  DSP EN VIVO
                </span>
                <span className="text-caption px-1.5 py-0.5 rounded-badge border border-status-success/30 bg-status-success/15 text-status-success font-mono flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${midiDevices.length > 0 ? 'bg-status-success animate-ping' : 'bg-status-success'}`} />
                  {midiDevices.length > 0 ? midiDevices[0].name.slice(0, 14) : 'MIDI LISTO'}
                </span>
              </div>
              <p className="text-caption text-text-tertiary">
                Toca en el aire con las yemas de los dedos o haz clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Note Badge */}
            {lastTriggeredNote && (
              <div className="px-2.5 py-1 rounded-control bg-ios-teal/20 border border-ios-teal/40 text-ios-teal text-caption font-mono font-bold animate-in zoom-in-95 duration-100">
                {lastTriggeredNote}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setAirInstrumentsActive(false)}
              className="min-h-11 min-w-11 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface-subtle transition-colors flex items-center justify-center"
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
                className={`min-h-11 flex flex-col items-center justify-center p-2.5 rounded-card border transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? 'bg-surface-active border-border-strong text-text-primary shadow-sm'
                    : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-active hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {inst.icon}
                  <span className="text-caption font-semibold">{inst.label}</span>
                </div>
                <span className="text-caption text-text-tertiary">{inst.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Options Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border-subtle text-caption">
          {/* Scale Selector for Synth */}
          {airInstrumentType === 'synth' && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-text-tertiary text-caption font-mono uppercase tracking-wider">ESCALA:</span>
              <div className="relative flex-1">
                <select
                  value={airSynthScale}
                  onChange={(e) => setAirSynthScale(e.target.value as SynthScale)}
                  className="w-full min-h-11 appearance-none bg-surface-subtle border border-border-subtle rounded-control px-2.5 py-1 text-caption text-text-primary focus:outline-none focus:border-ios-teal transition-colors pr-6 cursor-pointer font-mono"
                >
                  {Object.entries(SYNTH_SCALES).map(([key, def]) => (
                    <option key={key} value={key} className="bg-surface-overlay text-text-primary">
                      {def.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
              </div>
            </div>
          )}

          {/* Drum Kit Guide */}
          {airInstrumentType === 'drums' && (
            <div className="flex items-center gap-2 text-caption text-text-secondary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
              <span>Kick • Snare • Hi-Hat • Low Tom • Clap • Crash</span>
            </div>
          )}

          {/* Theremin Guide */}
          {airInstrumentType === 'theremin' && (
            <div className="flex items-center gap-2 text-caption text-text-secondary font-mono">
              <Volume2 className="w-3.5 h-3.5 text-ios-teal" />
              <span>Mueve índice: Horizontal = Frecuencia | Vertical = Volumen</span>
            </div>
          )}

          {/* Camera Status & Activation Helper */}
          <div className="flex items-center gap-2 ml-auto">
            {!vrMode ? (
              <button
                onClick={ensureTrackingActive}
                className="min-h-11 flex items-center gap-1.5 px-3 py-1 rounded-control bg-status-success/15 border border-status-success/30 text-status-success text-caption font-mono hover:bg-status-success/25 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ACTIVAR CÁMARA</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-caption font-mono text-status-success">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                <span>
                  {handLandmarks ? 'MANOS DETECTADAS' : 'BUSCANDO MANOS...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tip footer */}
        <div className="mt-2.5 flex items-center gap-1.5 text-caption text-text-tertiary font-mono">
          <Info className="w-3 h-3 text-text-tertiary" />
          <span>
            Baja rápidamente la yema del dedo (golpe aéreo) sobre cualquier tecla o pad para tocar.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AirInstrumentControls;
