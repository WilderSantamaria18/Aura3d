import React, { useId } from 'react';

/**
 * Piezas comunes de la calibración de Rainbow Void.
 * Diseño opaco de alto contraste estilo Apple visionOS con acentos neón, legibilidad perfecta
 * y controles fluidos y accesibles.
 */

export const Section: React.FC<{
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, hint, action, children }) => (
  <section className="p-3.5 bg-white/[0.05] hover:bg-white/[0.07] rounded-2xl border border-white/[0.12] space-y-3 shadow-inner transition-colors">
    {(title || action) && (
      <div className="flex items-start justify-between gap-2 pb-1 border-b border-white/[0.06]">
        <div className="min-w-0">
          {title && <h5 className="text-xs font-bold text-white tracking-tight">{title}</h5>}
          {hint && <p className="text-[10.5px] leading-snug text-white/60 mt-0.5">{hint}</p>}
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
    <div className="space-y-1.5 py-0.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-white/90 cursor-pointer">
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-[11px] font-mono font-bold tabular-nums text-cyan-300 bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,229,255,0.2)] whitespace-nowrap"
        >
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
        className="w-full h-1.5 bg-white/[0.15] rounded-full cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      />
      {hint && <p className="text-[10.5px] leading-snug text-white/55">{hint}</p>}
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
  <div className="space-y-1.5 py-0.5">
    {label && <span className="text-xs font-medium text-white/90 block">{label}</span>}
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1.5"
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
            className={`min-h-[32px] px-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300 active:scale-95 ${
              on
                ? 'bg-cyan-500/25 border-cyan-400/70 text-white font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
    {hint && <p className="text-[10.5px] leading-snug text-white/55">{hint}</p>}
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
    className="w-full flex items-center gap-3 text-left cursor-pointer rounded-xl p-1.5 hover:bg-white/[0.04] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
  >
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-medium text-white/90">{label}</span>
      {hint && <span className="block text-[10.5px] leading-snug text-white/55 mt-0.5">{hint}</span>}
    </span>
    <span
      aria-hidden="true"
      className={`relative w-10 h-5.5 rounded-full shrink-0 transition-colors duration-200 border ${
        on
          ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
          : 'bg-white/[0.14] border-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${
          on ? 'translate-x-4.5 bg-black' : 'translate-x-0 bg-white'
        }`}
      />
    </span>
  </button>
);
