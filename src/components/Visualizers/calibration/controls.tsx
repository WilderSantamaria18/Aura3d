import React, { useId } from 'react';

/**
 * Piezas comunes de la calibración de Rainbow Void. Un solo lenguaje para todas las pestañas:
 * tarjetas con título, deslizadores con lectura numérica y una línea de ayuda en lenguaje llano,
 * selectores segmentados e interruptores accesibles. Mismo aspecto (vidrio, acento cian) que el resto.
 */

export const Section: React.FC<{
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, hint, action, children }) => (
  <section className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-3">
    {(title || action) && (
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {title && <h5 className="text-[12px] font-semibold text-white/90 tracking-tight">{title}</h5>}
          {hint && <p className="text-[10.5px] leading-snug text-white/50 mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Texto de la lectura (por defecto el valor con 2 decimales) */
  display?: string;
  /** Ayuda de una línea: qué cambia al mover el control */
  hint?: string;
}> = ({ label, value, min, max, step, onChange, display, hint }) => {
  const id = useId();
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11.5px] text-white/80">
          {label}
        </label>
        <output htmlFor={id} className="text-[11px] font-mono tabular-nums text-cyan-300 whitespace-nowrap">
          {display ?? value.toFixed(2)}
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
        className="w-full h-1 bg-white/[0.1] rounded-full cursor-pointer accent-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      />
      {hint && <p className="text-[10.5px] leading-snug text-white/45">{hint}</p>}
    </div>
  );
};

export const Choice: React.FC<{
  label?: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  hint?: string;
  columns?: number;
}> = ({ label, options, value, onChange, hint, columns }) => (
  <div className="space-y-1.5">
    {label && <span className="text-[11.5px] text-white/80 block">{label}</span>}
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`min-h-[30px] px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300 ${
              on
                ? 'bg-cyan-500/20 border-cyan-400/60 text-white'
                : 'bg-white/[0.02] border-white/[0.07] text-white/55 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
    {hint && <p className="text-[10.5px] leading-snug text-white/45">{hint}</p>}
  </div>
);

export const SwitchRow: React.FC<{
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, hint, on, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className="w-full flex items-center gap-3 text-left cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
  >
    <span className="flex-1 min-w-0">
      <span className="block text-[11.5px] text-white/85">{label}</span>
      {hint && <span className="block text-[10.5px] leading-snug text-white/45 mt-0.5">{hint}</span>}
    </span>
    <span
      aria-hidden="true"
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors duration-200 ${on ? 'bg-cyan-400' : 'bg-white/[0.16]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${
          on ? 'translate-x-4 bg-[#05070e]' : 'translate-x-0 bg-white'
        }`}
      />
    </span>
  </button>
);
