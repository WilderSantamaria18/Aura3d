import React from 'react';
import { Sliders, Activity, Sparkles, Music, Waves } from 'lucide-react';
import {
  AirInstrumentsAudioEngine,
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
  accentColor = '#00e5ff',
}) => {
  return (
    <div className="space-y-4 text-white select-none font-sans text-xs">
      {/* 1. Sensibilidad Gestual & Profundidad */}
      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between text-white/80 font-mono text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-white/70" />
            Calibración de Hit-Testing
          </span>
          <span className="text-white/50">{sensitivity.toFixed(1)}x</span>
        </div>

        {/* Sensibilidad Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-white/60">
            <span>Sensibilidad de Toque</span>
            <span className="font-mono text-white/90">{Math.round(sensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={sensitivity}
            onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
            style={{ accentColor }}
          />
        </div>

        {/* Distancia Virtual Z */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-white/60">
            <span>Distancia Espacial del Plano</span>
            <span className="font-mono text-white/90">{targetDistance.toFixed(1)}m</span>
          </div>
          <input
            type="range"
            min="1.5"
            max="4.0"
            step="0.1"
            value={targetDistance}
            onChange={(e) => onTargetDistanceChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer focus:outline-none accent-white"
            style={{ accentColor }}
          />
        </div>
      </div>

      {/* 2. Escala y Sintetizador */}
      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between text-white/80 font-mono text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-white/70" />
            Escala & Timbre
          </span>
        </div>

        {/* Selector de Escalas */}
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(SYNTH_SCALES).map(([key, config]) => {
            const isSelected = activeScale === key;
            return (
              <button
                key={key}
                onClick={() => onScaleChange(key)}
                className={`py-1.5 px-2.5 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/20 border-white/40 text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.07] hover:text-white'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${accentColor}25`,
                        borderColor: `${accentColor}60`,
                      }
                    : undefined
                }
              >
                <span className="text-[10.5px] font-medium leading-tight truncate">
                  {config.name.split(' (')[0]}
                </span>
                <span className="text-[8px] font-mono text-white/50 truncate">
                  {config.notes[0]?.name} - {config.notes[config.notes.length - 1]?.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selector de Forma de Onda */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-white/60 uppercase">Forma de Onda</span>
          <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-black/30 border border-white/10">
            {(['sawtooth', 'sine', 'square', 'triangle'] as OscillatorWaveform[]).map((wave) => (
              <button
                key={wave}
                onClick={() => onWaveformChange(wave)}
                className={`py-1 rounded-lg text-[10px] font-mono uppercase transition-all ${
                  waveform === wave
                    ? 'bg-white/20 text-white font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {wave === 'sawtooth' ? 'Saw' : wave === 'triangle' ? 'Tri' : wave === 'square' ? 'Sqr' : 'Sin'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Toggles Visuales */}
      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] text-white/90">Estelas de Luz en Dedos</span>
          </div>
          <button
            onClick={() => onToggleTrails(!showTrails)}
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
              showTrails ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                showTrails ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-white/70" />
            <span className="text-[11px] text-white/90">Trackeo Corporal (Pose 33 pts)</span>
          </div>
          <button
            onClick={() => onTogglePose(!enablePose)}
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
              enablePose ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                enablePose ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
