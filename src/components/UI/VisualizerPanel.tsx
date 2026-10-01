import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Maximize2, Minimize2, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { ATMOSPHERE_LABELS, ATMOSPHERE_POLICY } from '../../config/vizAtmosphere';
import type { BackgroundAtmosphere } from '../../types/audio';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../stores/playerStore';
import { LUCID_THEMES } from '../../types/audio';
import {
  effectiveValue,
  getVizSchema,
  matchPreset,
  presetSettings,
  schemaDefaults,
  valueControls,
  clampToControl,
  type ActionControl,
  type ChoiceControl,
  type NoteControl,
  type RangeControl,
  type TrackingControl,
  type ToggleControl,
  type VizContext,
  type VizGroup,
  type VizModeSchema,
} from '../../config/vizControls';

/**
 * Panel de ajustes de los visualizadores (todos excepto Rainbow Void).
 *  - Escritorio: panel lateral a la derecha. Móvil: hoja inferior. No hay telón: la escena se sigue viendo y reaccionando.
 *  - Tres niveles: presets y calidad (esenciales), grupos de parámetros (avanzado) y color.
 *  - Se puede plegar a una píldora y recuperar con ratón, toque o teclado.
 */

const surface = 'bg-[var(--surface-overlay)] border-[var(--border-medium)]';
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]';

/**
 * Huecos que dejan la cabecera (arriba) y la cápsula de reproducción (abajo), para que el panel quede
 * entre ambas y nunca tape botones de la interfaz. Se mide en vivo porque la cabecera cambia de altura
 * según el ancho de pantalla y la cápsula se oculta en modo Zen.
 */
function useChromeInsets(active: boolean): { top: number; bottom: number } {
  const [insets, setInsets] = useState({ top: 76, bottom: 12 });
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      let top = 0;
      document.querySelectorAll('header > *').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.height > 0 && r.top < window.innerHeight / 2) top = Math.max(top, r.bottom);
      });
      const dock = document.querySelector('.aura-dock');
      let bottom = 0;
      if (dock) {
        const r = dock.getBoundingClientRect();
        const hidden = getComputedStyle(dock.parentElement ?? dock).opacity === '0';
        if (!hidden && r.height > 0 && r.top < window.innerHeight) bottom = Math.max(0, Math.round(window.innerHeight - r.top));
      }
      const next = { top: Math.max(12, Math.round(top) + 8), bottom: Math.max(12, bottom + 12) };
      setInsets((p) => (p.top === next.top && p.bottom === next.bottom ? p : next));
    };
    measure();
    const id = window.setInterval(measure, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
  }, [active]);
  return insets;
}

const formatValue = (c: RangeControl, v: number) => {
  if (c.unit === '%') return `${Math.round(v * 100)}%`;
  if (c.unit === '') return Number.isInteger(c.step) ? String(Math.round(v)) : v.toFixed(1);
  return `${v.toFixed(1)}×`;
};

// ── Controles ────────────────────────────────────────────────────────────────
const RangeRow: React.FC<{
  control: RangeControl;
  value: number;
  disabledReason: string | null;
  onChange: (v: number) => void;
}> = ({ control, value, disabledReason, onChange }) => {
  const id = useId();
  const describedBy = [control.hint ? `${id}-hint` : '', disabledReason ? `${id}-why` : ''].filter(Boolean).join(' ') || undefined;
  const disabled = !!disabledReason;
  return (
    <div className={`py-2 ${disabled ? 'opacity-55' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-[var(--text-secondary)]">
          {control.label}
        </label>
        <output htmlFor={id} className="font-mono text-[12px] tabular-nums text-[var(--text-primary)]">
          {formatValue(control, value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(clampToControl(control, parseFloat(e.target.value)))}
        style={{ ['--viz-fill' as string]: `${((value - control.min) / (control.max - control.min)) * 100}%` }}
        className={`viz-range mt-1 w-full cursor-pointer disabled:cursor-not-allowed ${focusRing}`}
      />
      {control.hint && (
        <p id={`${id}-hint`} className="text-[11px] leading-snug text-[var(--text-muted)]">
          {control.hint}
        </p>
      )}
      {disabledReason && (
        <p id={`${id}-why`} className="mt-0.5 text-[11px] leading-snug text-[var(--accent-amber)]">
          {disabledReason}
        </p>
      )}
    </div>
  );
};

const ToggleRow: React.FC<{
  control: ToggleControl;
  value: boolean;
  disabledReason: string | null;
  onChange: (v: boolean) => void;
}> = ({ control, value, disabledReason, onChange }) => {
  const id = useId();
  const disabled = !!disabledReason;
  return (
    <div className={`py-1.5 ${disabled ? 'opacity-55' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-describedby={`${id}-d`}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 text-left hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed ${focusRing}`}
      >
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{control.label}</span>
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
            value ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/30' : 'border-[var(--border-medium)] bg-[var(--surface-hover)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[var(--text-primary)] transition-all ${value ? 'left-[18px]' : 'left-0.5'}`}
          />
        </span>
      </button>
      <p id={`${id}-d`} className="px-2 text-[11px] leading-snug text-[var(--text-muted)]">
        {disabledReason ? <span className="text-[var(--accent-amber)]">{disabledReason}</span> : control.hint}
      </p>
    </div>
  );
};

const ChoiceGrid: React.FC<{
  control: ChoiceControl;
  value: string;
  disabledReason: string | null;
  onChange: (v: string) => void;
}> = ({ control, value, disabledReason, onChange }) => {
  const id = useId();
  const disabled = !!disabledReason;
  const cols = control.cols === 4 ? 'grid-cols-4' : control.cols === 3 ? 'grid-cols-3' : 'grid-cols-2';
  const renderOption = (o: ChoiceControl['options'][number]) => {
    const selected = value === o.value;
    return (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={o.hint ? `${o.label}: ${o.hint}` : o.label}
        title={o.hint ? `${o.label} — ${o.hint}` : o.label}
        disabled={disabled}
        onClick={() => onChange(o.value)}
        className={`flex min-h-[44px] rounded-[var(--radius-control)] border px-2.5 py-1.5 text-left transition-colors disabled:cursor-not-allowed flex-col justify-center ${focusRing} ${
          selected
            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12 text-[var(--text-primary)]'
            : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
        }`}
      >
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold leading-tight">
          {o.label}
          {selected && <Check aria-hidden="true" className="ml-auto h-3 w-3 text-[var(--accent-cyan)]" />}
        </span>
        {o.hint && <span className="text-[10.5px] leading-tight text-[var(--text-muted)]">{o.hint}</span>}
      </button>
    );
  };

  return (
    <div className={`py-2 ${disabled ? 'opacity-55' : ''}`}>
      <div id={id} className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">
        {control.label}
      </div>
      <div role="radiogroup" aria-labelledby={id} aria-describedby={disabled ? `${id}-why` : undefined}>
        {control.families ? (
          control.families.map((f) => (
            <div key={f.id} className="mb-2">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{f.label}</div>
              <div className={`grid ${cols} gap-1.5`}>{control.options.filter((o) => o.family === f.id).map(renderOption)}</div>
            </div>
          ))
        ) : (
          <div className={`grid ${cols} gap-1.5`}>{control.options.map(renderOption)}</div>
        )}
      </div>
      {disabledReason && (
        <p id={`${id}-why`} className="mt-0.5 text-[11px] leading-snug text-[var(--accent-amber)]">
          {disabledReason}
        </p>
      )}
    </div>
  );
};

// Instrucciones que se adaptan al dispositivo
const NoteRow: React.FC<{ control: NoteControl; coarse: boolean }> = ({ control, coarse }) => (
  <div className="py-1.5">
    <div className="text-[13px] font-medium text-[var(--text-secondary)]">{control.label}</div>
    <p className="text-[11px] leading-snug text-[var(--text-muted)]">{coarse ? control.coarse : control.fine}</p>
  </div>
);

// Seguimiento de manos/cuerpo: distingue «no compatible», «requiere permiso», «listo» y «activo» con capacidades reales
type TrackingState = 'unsupported' | 'denied' | 'prompt' | 'ready' | 'active';
const TrackingRow: React.FC<{ control: TrackingControl; active: boolean; onToggle: () => void }> = ({ control, active, onToggle }) => {
  const [perm, setPerm] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const sync = () => status && !cancelled && setPerm(status.state as 'granted' | 'denied' | 'prompt');
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((s) => {
        status = s;
        sync();
        s.addEventListener('change', sync);
      })
      .catch(() => undefined); // Safari/Firefox no exponen el permiso de cámara: queda «requiere permiso»
    return () => {
      cancelled = true;
      status?.removeEventListener('change', sync);
    };
  }, [supported]);

  const state: TrackingState = !supported ? 'unsupported' : active ? 'active' : perm === 'denied' ? 'denied' : perm === 'granted' ? 'ready' : 'prompt';
  const label: Record<TrackingState, string> = {
    unsupported: 'No compatible',
    denied: 'Permiso denegado',
    prompt: 'Requiere permiso',
    ready: 'Listo',
    active: 'Activo',
  };
  const explain: Record<TrackingState, string> = {
    unsupported: 'Este navegador o dispositivo no da acceso a la cámara.',
    denied: 'Habilita la cámara para este sitio en los ajustes del navegador.',
    prompt: 'Al activarlo el navegador pedirá permiso para usar la cámara.',
    ready: control.hint ?? '',
    active: 'La cámara está siguiendo tus manos o tu cuerpo.',
  };
  const disabled = state === 'unsupported' || state === 'denied';
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">{control.label}</span>
        <span
          data-testid="tracking-state"
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            state === 'active' ? 'bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]' : disabled ? 'bg-[var(--surface-active)] text-[var(--text-muted)]' : 'bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]'
          }`}
        >
          {label[state]}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-[var(--text-muted)]">{explain[state]}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`mt-1.5 min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--border-medium)] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
      >
        {active ? 'Desactivar seguimiento' : 'Activar seguimiento'}
      </button>
    </div>
  );
};

const ActionRow: React.FC<{ control: ActionControl }> = ({ control }) => (
  <div className="py-1.5">
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(control.event))}
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-medium)] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ${focusRing}`}
    >
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      {control.label}
    </button>
    {control.hint && <p className="mt-1 px-1 text-[11px] leading-snug text-[var(--text-muted)]">{control.hint}</p>}
  </div>
);

const Section: React.FC<{ group: VizGroup; defaultOpen: boolean; children: React.ReactNode }> = ({ group, defaultOpen, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className={`flex min-h-[44px] w-full items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ${focusRing}`}
        >
          {group.title}
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={id} hidden={!open} className="px-4 pb-2">
        {children}
      </div>
    </section>
  );
};

// ── Panel ────────────────────────────────────────────────────────────────────
export const VisualizerPanel: React.FC = () => {
  const {
    visualizerMode,
    isOpen,
    setOpen,
    blobSettings,
    updateBlobSettings,
    cameraPreset,
    setCameraPreset,
    performanceTier,
    effectiveTier,
    setPerformanceTier,
    mouseEffectsEnabled,
    isLucid,
    toggleLucidMode,
    lucidTheme,
    setLucidTheme,
    vrMode,
    setVrMode,
  } = usePlayerStore(
    useShallow((s) => ({
      visualizerMode: s.visualizerMode,
      isOpen: s.isVisualizerSettingsOpen,
      setOpen: s.setVisualizerSettingsOpen,
      blobSettings: s.blobSettings,
      updateBlobSettings: s.updateBlobSettings,
      cameraPreset: s.cameraPreset,
      setCameraPreset: s.setCameraPreset,
      performanceTier: s.performanceTier,
      effectiveTier: s.effectiveTier,
      setPerformanceTier: s.setPerformanceTier,
      mouseEffectsEnabled: s.mouseEffectsEnabled,
      isLucid: s.isLucid,
      toggleLucidMode: s.toggleLucidMode,
      lucidTheme: s.lucidTheme,
      setLucidTheme: s.setLucidTheme,
      vrMode: s.vrMode,
      setVrMode: s.setVrMode,
    }))
  );

  const schema: VizModeSchema | null = getVizSchema(visualizerMode);
  const [collapsed, setCollapsed] = useState(false);
  // En pantallas estrechas los grupos arrancan plegados para dejar ver la escena
  const isNarrow = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const insets = useChromeInsets(isOpen && !!schema);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const coarsePointer = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  const ctx: VizContext = useMemo(() => {
    return { ...(blobSettings as unknown as Record<string, unknown>), mouseEffectsEnabled, coarsePointer };
  }, [blobSettings, mouseEffectsEnabled, coarsePointer]);

  /** Escribe un valor de control en blobSettings */
  const writeControl = useCallback(
    (key: string, value: unknown, _fromStore?: boolean) => {
      updateBlobSettings({ [key]: value } as never);
    },
    [updateBlobSettings]
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Al abrir, el foco pasa al panel para que el teclado empiece ahí; al cerrar vuelve a donde estaba
  useEffect(() => {
    if (!isOpen || !schema) return;
    const previous = document.activeElement as HTMLElement | null;
    setCollapsed(false);
    headingRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, [isOpen, schema?.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPresets = !!schema && schema.presets.length > 0;
  const active = schema && hasPresets ? matchPreset(schema, ctx, cameraPreset) : null;

  const applyPreset = useCallback(
    (id: string) => {
      if (!schema) return;
      const p = schema.presets.find((x) => x.id === id);
      if (!p) return;
      updateBlobSettings(presetSettings(schema, p) as never);
      if (p.camera) setCameraPreset(p.camera);
    },
    [schema, updateBlobSettings, setCameraPreset]
  );

  const reset = useCallback(() => {
    if (!schema) return;
    const blobDefaults: Record<string, unknown> = {};
    for (const c of valueControls(schema)) {
      if (c.store) writeControl(c.key, c.def, true);
      else blobDefaults[c.key] = c.kind === 'choice' && c.numeric ? Number(c.def) : c.def;
    }
    updateBlobSettings(blobDefaults as never);
    if (schema.defaultCamera) setCameraPreset(schema.defaultCamera);
  }, [schema, updateBlobSettings, setCameraPreset, writeControl]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  if (!isOpen || !schema || blobSettings?.isUiHidden) return null;

  const isDefault = valueControls(schema).every((c) => {
    const v = effectiveValue(c, ctx);
    return typeof v === 'number' ? Math.abs(v - (c.def as number)) < 1e-6 : v === c.def;
  }) && (!schema.defaultCamera || cameraPreset === schema.defaultCamera);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={`Abrir ajustes de ${schema.title}`}
        style={{ bottom: insets.bottom, ['--viz-top' as string]: `${insets.top}px` }}
        className={`fixed right-3 z-40 flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[12px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)] pointer-events-auto md:!bottom-auto md:top-[var(--viz-top)] ${surface} ${focusRing}`}
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[var(--accent-cyan)]" />
        {schema.title}
        {hasPresets && <span className="text-[var(--text-muted)]">· {active ? active.name : 'Personalizado'}</span>}
      </button>
    );
  }

  const fullscreenLabel = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';

  return (
    <aside
      ref={asideRef}
      role="complementary"
      aria-label={`Ajustes de ${schema.title}`}
      data-testid="visualizer-panel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setOpen(false);
        }
      }}
      style={{ bottom: insets.bottom, ['--viz-top' as string]: `${insets.top}px` }}
      className={`pointer-events-auto md:top-[var(--viz-top)] fixed inset-x-2 z-40 flex max-h-[42dvh] flex-col rounded-[var(--radius-modal)] border font-sans text-[var(--text-primary)] shadow-[var(--shadow-card)] md:inset-x-auto md:right-3 md:max-h-none md:w-[352px] ${surface}`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="truncate text-[15px] font-semibold tracking-tight outline-none">
            {schema.title}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">Ajustes del visualizador</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreenLabel}
            title={fullscreenLabel}
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ${focusRing}`}
          >
            {isFullscreen ? <Minimize2 aria-hidden="true" className="h-4 w-4" /> : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Ocultar panel y ver la escena"
            title="Ocultar panel"
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ${focusRing}`}
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4 md:-rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar ajustes"
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ${focusRing}`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Esenciales: presets (solo en modos que los definen) */}
        {hasPresets && (
        <div className="px-4 pb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span id="viz-preset-label" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              Preset
            </span>
            <span
              data-testid="preset-state"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                active ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]' : 'bg-[var(--surface-active)] text-[var(--text-secondary)]'
              }`}
            >
              {active ? active.name : 'Personalizado'}
            </span>
          </div>
          <div role="radiogroup" aria-labelledby="viz-preset-label" className="grid grid-cols-3 gap-1.5 md:grid-cols-1">
            {schema.presets.map((p) => {
              const selected = active?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => applyPreset(p.id)}
                  title={p.desc}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] border px-2 py-1.5 text-center transition-colors md:justify-between md:px-3 md:text-left ${focusRing} ${
                    selected
                      ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight">{p.name}</span>
                    <span className="hidden text-[11px] leading-tight text-[var(--text-muted)] md:block">{p.desc}</span>
                  </span>
                  {selected && <Check aria-hidden="true" className="hidden h-4 w-4 flex-shrink-0 text-[var(--accent-cyan)] md:block" />}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-muted)] md:hidden">{(active ?? schema.presets[0]) && active ? active.desc : 'Ningún preset coincide con los ajustes actuales'}</p>
        </div>
        )}

        {/* Cámara (solo modos con vistas) */}
        {schema.cameras && (
          <Section group={{ id: 'view', title: 'Vista', controls: [] }} defaultOpen>
            <div role="radiogroup" aria-label="Cámara" className="grid grid-cols-5 gap-1 md:grid-cols-5">
              {schema.cameras.map((c) => {
                const selected = cameraPreset === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={c.hint}
                    onClick={() => setCameraPreset(c.id)}
                    className={`min-h-[44px] rounded-[var(--radius-control)] border px-1 text-[11px] font-medium transition-colors ${focusRing} ${
                      selected
                        ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12 text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-muted)]" aria-live="polite">
              {schema.cameras.find((c) => c.id === cameraPreset)?.hint}
            </p>
          </Section>
        )}

        {/* Avanzado: grupos del modo */}
        {schema.groups.map((g, i) => (
          <Section key={g.id} group={g} defaultOpen={i === 0 && !isNarrow}>
            {g.controls.map((c) => {
              if (c.kind === 'action') return <ActionRow key={c.key} control={c} />;
              if (c.kind === 'note') return <NoteRow key={c.key} control={c} coarse={coarsePointer} />;
              if (c.kind === 'tracking') return <TrackingRow key={c.key} control={c} active={vrMode} onToggle={() => setVrMode(!vrMode)} />;
              const why = c.disabledReason?.(ctx) ?? null;
              const v = effectiveValue(c, ctx);
              if (c.kind === 'range')
                return <RangeRow key={c.key} control={c} value={v as number} disabledReason={why} onChange={(n) => writeControl(c.key, n, c.store)} />;
              if (c.kind === 'toggle')
                return <ToggleRow key={c.key} control={c} value={v as boolean} disabledReason={why} onChange={(b) => writeControl(c.key, b, c.store)} />;
              return (
                <ChoiceGrid
                  key={c.key}
                  control={c}
                  value={String(v)}
                  disabledReason={why}
                  onChange={(val) => writeControl(c.key, c.numeric ? Number(val) : val, c.store)}
                />
              );
            })}
          </Section>
        ))}

        {/* Color */}
        <Section group={{ id: 'palette', title: 'Paleta', controls: [] }} defaultOpen={false}>
          <ToggleRow
            control={{ kind: 'toggle', key: 'lucid', label: 'Modo Lúcido', def: false, hint: 'Temas de color fijos en lugar de los que propone la canción.' }}
            value={isLucid}
            disabledReason={null}
            onChange={() => toggleLucidMode()}
          />
          {isLucid && (
            <div role="radiogroup" aria-label="Tema Lúcido" className="mt-1 grid grid-cols-2 gap-1.5">
              {LUCID_THEMES.map((t) => {
                const selected = lucidTheme.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setLucidTheme(t)}
                    className={`flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] border px-2 text-left text-[12px] ${focusRing} ${
                      selected
                        ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <span aria-hidden="true" className="flex -space-x-1">
                      <span className="h-3.5 w-3.5 rounded-full border border-black/40" style={{ backgroundColor: t.primary }} />
                      <span className="h-3.5 w-3.5 rounded-full border border-black/40" style={{ backgroundColor: t.secondary }} />
                    </span>
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Fondo: atmósferas que combinan con este visualizador */}
        {schema && ATMOSPHERE_POLICY[schema.mode] && (
          <Section group={{ id: 'background', title: 'Fondo', controls: [] }} defaultOpen={false}>
            {(() => {
              const policy = ATMOSPHERE_POLICY[schema.mode]!;
              const current = (blobSettings?.backgroundAtmosphere ?? 'none') as BackgroundAtmosphere;
              const options: BackgroundAtmosphere[] = ['none', ...policy.recommended];
              if (!options.includes(current)) options.push(current);
              return (
                <div className="py-2">
                  <div id="viz-atmo-label" className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">
                    Atmósfera
                  </div>
                  <div role="radiogroup" aria-labelledby="viz-atmo-label" className="grid grid-cols-2 gap-1.5">
                    {options.map((o) => {
                      const selected = current === o;
                      return (
                        <button
                          key={o}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => updateBlobSettings({ backgroundAtmosphere: o })}
                          className={`flex min-h-[44px] flex-col justify-center rounded-[var(--radius-control)] border px-2.5 py-1.5 text-left ${focusRing} ${
                            selected
                              ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12'
                              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <span className="text-[12px] font-semibold leading-tight">{ATMOSPHERE_LABELS[o]}</span>
                          {policy.recommended.includes(o) && <span className="text-[10.5px] leading-tight text-[var(--text-muted)]">Recomendada</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-muted)]">{policy.note}</p>
                </div>
              );
            })()}
          </Section>
        )}

        {/* Comodidad y rendimiento (comunes) */}
        <Section group={{ id: 'system', title: 'Calidad y comodidad', controls: [] }} defaultOpen={false}>
          <div className="py-2">
            <div id="viz-quality-label" className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">
              Calidad gráfica
            </div>
            <div role="radiogroup" aria-labelledby="viz-quality-label" className="grid grid-cols-3 gap-1.5">
              {(['high', 'medium', 'eco'] as const).map((t) => {
                const selected = performanceTier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPerformanceTier(t)}
                    className={`min-h-[44px] rounded-[var(--radius-control)] border text-[12px] font-medium ${focusRing} ${
                      selected
                        ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/12'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {t === 'high' ? 'Alta' : t === 'medium' ? 'Media' : 'Eco'}
                  </button>
                );
              })}
            </div>
            {effectiveTier !== performanceTier && (
              <p className="mt-1 text-[11px] leading-snug text-[var(--accent-amber)]">
                La calidad automática está limitando a «{effectiveTier === 'medium' ? 'Media' : effectiveTier === 'eco' ? 'Eco' : 'Alta'}» para mantener la fluidez.
              </p>
            )}
          </div>
          <ToggleRow
            control={{
              kind: 'toggle',
              key: 'vizReducedMotion',
              label: 'Movimiento reducido',
              def: false,
              hint: 'Modera balanceos, torsión y cambios de campo de visión. La respuesta luminosa se mantiene.',
            }}
            value={(blobSettings?.vizReducedMotion ?? (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)) as boolean}
            disabledReason={null}
            onChange={(b) => updateBlobSettings({ vizReducedMotion: b })}
          />
        </Section>
      </div>

      {/* Pie: restaurar */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-4 py-2">
        <button
          type="button"
          onClick={reset}
          disabled={isDefault}
          className={`flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Restaurar {schema.title}
        </button>
        <span className="text-[10.5px] text-[var(--text-muted)]">Esc cierra</span>
      </div>
    </aside>
  );
};

export default VisualizerPanel;
