import React from 'react';
import { RotateCcw } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { DEFAULT_VOID_FX_SETTINGS, RAINBOW_VOID_EFFECTS, KICK_FORM_STYLES } from '../../config/visualPresets';
import type { KickFormStyle, VoidColorMode, VoidFxSettings } from '../../types/audio';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  /** Qué cambia al moverlo, en una línea */
  hint?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, format, onChange, hint }) => (
  <label className="block space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-white/70">{label}</span>
      <span className="font-mono tabular-nums text-cyan-300">{format ? format(value) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-white/[0.1] rounded-full cursor-pointer accent-cyan-400"
    />
    {hint && <span className="block text-[10.5px] leading-snug text-white/45">{hint}</span>}
  </label>
);

const COLOR_MODES: Array<{ id: VoidColorMode; label: string }> = [
  { id: 'palette', label: 'Paleta' },
  { id: 'spectrum', label: 'Espectro' },
  { id: 'mono', label: 'Mono' },
];

interface VoidFxCustomizerProps {
  /** Las ondas de choque no forman parte del efecto: solo se ofrecen en Ajustes */
  showShockwave?: boolean;
}

/**
 * Ajustes de la forma elegida: acabado, tamaño, reacción, alcance, resplandor, cantidad,
 * color y borde interior.
 */
export const VoidFxCustomizer: React.FC<VoidFxCustomizerProps> = ({ showShockwave = false }) => {
  const blobShape = usePlayerStore((s) => s.blobShape);
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const updateBlobSettings = usePlayerStore((s) => s.updateBlobSettings);

  const effect = RAINBOW_VOID_EFFECTS.find((fx) => fx.id === blobShape);
  const isContour = blobShape !== 'fractal';
  const fx: VoidFxSettings = { ...DEFAULT_VOID_FX_SETTINGS, ...blobSettings.voidFx, counts: { ...blobSettings.voidFx?.counts } };
  const set = (patch: Partial<VoidFxSettings>) => updateBlobSettings({ voidFx: { ...fx, ...patch } });

  const param = effect?.param;
  const countValue = param ? fx.counts[blobShape as string] ?? param.def : 0;

  const toggle = (key: 'inner' | 'mandala' | 'shockwave', label: string, hint?: string) => (
    <button
      type="button"
      onClick={() => set({ [key]: !fx[key] })}
      aria-pressed={fx[key]}
      title={hint}
      className={`glass-btn flex-1 min-h-[34px] px-3 text-[11px] font-medium ${fx[key] ? 'is-active text-white' : 'text-white/60'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="glass-card !rounded-2xl !p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/70">
          Personalizar{effect ? ` · ${effect.name}` : ''}
        </span>
        <button
          type="button"
          onClick={() => updateBlobSettings({ voidFx: DEFAULT_VOID_FX_SETTINGS })}
          className="glass-btn w-7 h-7 flex items-center justify-center text-white/70 hover:text-white"
          title="Restablecer personalización"
          aria-label="Restablecer personalización de efectos"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isContour && (
        <div className="space-y-2">
          <span className="text-[11px] text-white/70">Acabado</span>
          <div className="flex gap-1.5">
            {KICK_FORM_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => set({ formStyle: st.id as KickFormStyle })}
                aria-pressed={fx.formStyle === st.id}
                title={st.desc}
                className={`glass-btn flex-1 min-h-[34px] px-2 text-[11px] font-medium ${fx.formStyle === st.id ? 'is-active text-white' : 'text-white/60'}`}
              >
                {st.name}
              </button>
            ))}
          </div>
          <Slider label="Tamaño de la forma" hint="Escala toda la forma alrededor del disco." value={fx.formScale} min={0.5} max={1.7} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ formScale: v })} />
        </div>
      )}

      <Slider label="Reacción" hint="Cuánto responde la forma a la música." value={fx.intensity} min={0.4} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ intensity: v })} />
      <Slider label="Alcance" hint="Qué tan lejos del disco llega el dibujo." value={fx.reach} min={0.6} max={1.8} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ reach: v })} />
      <Slider label="Resplandor" hint="Luz suave alrededor del trazo." value={fx.glow} min={0} max={1.5} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ glow: v })} />
      {param && (
        <Slider
          label={param.label}
          value={countValue}
          min={param.min}
          max={param.max}
          step={param.step}
          onChange={(v) => set({ counts: { ...fx.counts, [blobShape as string]: v } })}
        />
      )}

      <div className="space-y-1.5">
        <span className="text-[11px] text-white/70">Color de la forma</span>
        <div className="flex gap-1.5">
          {COLOR_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => set({ colorMode: m.id })}
              aria-pressed={fx.colorMode === m.id}
              className={`glass-btn flex-1 min-h-[34px] px-3 text-[11px] font-medium ${fx.colorMode === m.id ? 'is-active text-white' : 'text-white/60'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {blobShape === 'crystal' && toggle('mandala', 'Mándala de fondo', 'Los anillos de pétalos detrás del Cristal')}
        {toggle('inner', 'Borde interior', 'Un borde luminoso dentro del disco')}
        {showShockwave && toggle('shockwave', 'Ondas de choque', 'Anillo expansivo con cada golpe de bombo')}
      </div>
    </div>
  );
};

export default VoidFxCustomizer;
