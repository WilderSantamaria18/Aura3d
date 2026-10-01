import React from 'react';
import {
  SYNTH_SCALES,
  type OscillatorWaveform,
} from '../../services/airInstrumentsAudioEngine';

interface CameraControlsProps {
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
  targetDistance: number;
  onTargetDistanceChange: (val: number) => void;
  activeScale: string;
  onScaleChange: (scale: string) => void;
  waveform: OscillatorWaveform;
  onWaveformChange: (wave: OscillatorWaveform) => void;
  showTrails: boolean;
  onToggleTrails: (show: boolean) => void;
  enablePose: boolean;
  onTogglePose: (enable: boolean) => void;
  accentColor?: string;
}

const WAVES: { id: OscillatorWaveform; label: string }[] = [
  { id: 'sawtooth', label: 'Sierra' },
  { id: 'sine', label: 'Seno' },
  { id: 'square', label: 'Cuadrada' },
  { id: 'triangle', label: 'Triángulo' },
];

/** Slider con lectura numérica tabular; el riel se rellena con el color del instrumento. */
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, display, onChange }) => {
  const id = React.useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-[12.5px] text-[#c5cbd9]">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[11.5px] tabular-nums text-white">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-range w-full h-1.5 rounded-full appearance-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--inst)]"
        style={{
          background: `linear-gradient(to right, var(--inst) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
    </div>
  );
};

const Switch: React.FC<{ label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }> = ({
  label,
  hint,
  on,
  onChange,
}) => (
  <button
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className="w-full flex items-center gap-3 py-2.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--inst)] rounded-md"
  >
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] text-[#e8ecf4]">{label}</span>
      {hint && <span className="block text-[12px] text-[#7d869a] mt-0.5 leading-snug">{hint}</span>}
    </span>
    <span
      aria-hidden="true"
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors duration-200 ${on ? 'bg-[var(--inst)]' : 'bg-white/[0.16]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${
          on ? 'translate-x-4 bg-[#06080c]' : 'translate-x-0 bg-white'
        }`}
      />
    </span>
  </button>
);

export const CameraControls: React.FC<CameraControlsProps> = ({
  sensitivity,
  onSensitivityChange,
  targetDistance,
  onTargetDistanceChange,
  activeScale,
  onScaleChange,
  waveform,
  onWaveformChange,
  showTrails,
  onToggleTrails,
  enablePose,
  onTogglePose,
  accentColor,
}) => {
  return (
    <div
      className="divide-y divide-white/[0.07] text-[#e8ecf4] select-none"
      style={accentColor ? ({ '--inst': accentColor } as React.CSSProperties) : undefined}
    >
      {/* Respuesta al toque */}
      <section aria-label="Respuesta al toque" className="space-y-4 pb-5">
        <h3 className="text-[13px] font-semibold text-white">Respuesta al toque</h3>
        <Slider
          label="Sensibilidad"
          value={sensitivity}
          min={0.5}
          max={2}
          step={0.1}
          display={`${Math.round(sensitivity * 100)}%`}
          onChange={onSensitivityChange}
        />
        <Slider
          label="Distancia del plano"
          value={targetDistance}
          min={1.5}
          max={4}
          step={0.1}
          display={`${targetDistance.toFixed(1)} m`}
          onChange={onTargetDistanceChange}
        />
      </section>

      {/* Sonido */}
      <section aria-label="Sonido" className="py-5 space-y-4">
        <h3 className="text-[13px] font-semibold text-white">Sonido</h3>

        <div>
          <p className="text-[12.5px] text-[#c5cbd9] mb-2">Escala</p>
          <div role="radiogroup" aria-label="Escala musical" className="grid grid-cols-2 gap-1.5">
            {Object.entries(SYNTH_SCALES).map(([key, config]) => {
              const selected = activeScale === key;
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onScaleChange(key)}
                  className={`px-2.5 py-2 rounded-lg text-left border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--inst)] ${
                    selected
                      ? 'bg-white/[0.08] border-[var(--inst)] text-white'
                      : 'border-white/[0.08] text-[#a3abbd] hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="block text-[12.5px] font-medium leading-tight truncate">
                    {config.name.split(' (')[0]}
                  </span>
                  <span className="block font-mono text-[10.5px] text-[#7d869a] mt-0.5 truncate">
                    {config.notes[0]?.name}–{config.notes[config.notes.length - 1]?.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[12.5px] text-[#c5cbd9] mb-2">Forma de onda</p>
          <div role="radiogroup" aria-label="Forma de onda" className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-black/40">
            {WAVES.map((w) => (
              <button
                key={w.id}
                role="radio"
                aria-checked={waveform === w.id}
                onClick={() => onWaveformChange(w.id)}
                className={`h-7 rounded-md text-[11.5px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--inst)] ${
                  waveform === w.id ? 'bg-white/[0.13] text-white' : 'text-[#7d869a] hover:text-[#c5cbd9]'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Visualización */}
      <section aria-label="Visualización" className="pt-3">
        <Switch
          label="Estelas en los dedos"
          hint="Deja una línea de luz al mover la mano."
          on={showTrails}
          onChange={onToggleTrails}
        />
        <Switch
          label="Seguimiento corporal"
          hint="Añade 33 puntos del cuerpo; consume más CPU."
          on={enablePose}
          onChange={onTogglePose}
        />
      </section>
    </div>
  );
};
