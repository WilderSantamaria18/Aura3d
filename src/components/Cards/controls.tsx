/**
 * Piezas de interfaz del estudio de tarjetas: sección, interruptor, selector segmentado y deslizador.
 * Accesibles (roles, etiquetas, foco visible) y con el mismo lenguaje visual en todo el editor.
 */
import React, { useId } from 'react';

/**
 * La app ya tiene un indicador de foco global y accesible (index.css: `:focus-visible` en cian con
 * !important). Se deja vacío a propósito: un anillo propio se sumaría al global y se vería doble.
 */
export const FOCUS_RING = '';

export const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, icon, hint, children }) => (
  <section className="space-y-3">
    <div>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {icon && <span className="text-violet-300">{icon}</span>}
        <span>{title}</span>
      </h3>
      {hint && <p className="mt-1 text-xs leading-relaxed text-white/40">{hint}</p>}
    </div>
    {children}
  </section>
);

export const Switch: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled }) => {
  const id = useId();
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-45' : ''}`}>
      <label htmlFor={id} className={`min-w-0 flex-1 ${disabled ? '' : 'cursor-pointer'}`}>
        <span className="block text-sm font-medium text-white/90">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-white/45">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors ${FOCUS_RING} ${
          checked ? 'border-violet-300/40 bg-violet-500' : 'border-white/15 bg-white/10'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Texto secundario bajo la etiqueta (por ejemplo, la proporción) */
  sub?: string;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  columns,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Nombre accesible del grupo */
  label: string;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition-all ${FOCUS_RING} ${
              active
                ? 'bg-gradient-to-b from-white/[0.2] to-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
            } ${opt.disabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-white/55' : 'cursor-pointer'}`}
          >
            <span className="block">{opt.label}</span>
            {opt.sub && <span className="mt-0.5 block text-[10px] font-normal text-white/40">{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Cómo mostrar el valor (por defecto, porcentaje sobre el máximo) */
  format?: (value: number) => string;
}> = ({ label, value, min, max, step, onChange, format }) => {
  const id = useId();
  const shown = format ? format(value) : `${Math.round((value / max) * 100)}%`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-medium text-white/75">
          {label}
        </label>
        <span className="font-mono text-white/45">{shown}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`h-1.5 w-full cursor-pointer rounded-full accent-violet-400 ${FOCUS_RING}`}
      />
    </div>
  );
};

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  prefix?: string;
  hint?: string;
  autoComplete?: string;
}> = ({ label, value, onChange, placeholder, maxLength, prefix, hint, autoComplete }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-white/65">
        {label}
      </label>
      <div
        className={`flex items-center rounded-2xl border border-white/12 bg-white/[0.05] transition-colors focus-within:border-violet-400/60 focus-within:bg-white/[0.07]`}
      >
        {prefix && <span className="pl-4 text-sm text-white/40">{prefix}</span>}
        <input
          id={id}
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete ?? 'off'}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus-visible:!outline-none ${
            prefix ? 'pl-1.5' : ''
          }`}
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-white/38">{hint}</p>}
    </div>
  );
};
