import React, { useState } from 'react';
import {
  RotateCcw,
  ChevronDown,
  Image as ImageIcon,
  SunMedium,
  ScanText,
  Layers,
  Database,
  Minus,
  Plus,
  Sparkles,
  Aperture,
  Moon,
  Feather,
  Eye,
} from 'lucide-react';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperHistory } from '../../hooks/useWallpaperHistory';
import type { WallpaperApplicationSettings } from '../../types/wallpaper';

/* ────────────────────────── piezas reutilizables ────────────────────────── */

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/** Bloque desplegable: cabecera grande y contenido que se expande suavemente */
const Section: React.FC<SectionProps> = ({ icon, title, subtitle, open, onToggle, children }) => (
  <div className="glass-card !p-0 overflow-hidden shrink-0">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-white/[0.04] transition-colors"
    >
      <span className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-cyan-300 flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-white leading-tight">{title}</span>
        {subtitle && <span className="block text-[11px] text-white/45 truncate mt-0.5">{subtitle}</span>}
      </span>
      <ChevronDown
        className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  </div>
);

interface SliderProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  defaultValue?: number;
}

/** Deslizador con botones −/+ grandes y valor tocable para volver al predeterminado */
const Slider: React.FC<SliderProps> = ({ label, hint, value, min, max, step, format, onChange, defaultValue }) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-white/85">{label}</span>
        <button
          type="button"
          onClick={() => defaultValue !== undefined && onChange(defaultValue)}
          title={defaultValue !== undefined ? 'Volver al valor predeterminado' : undefined}
          className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10 text-cyan-200 tabular-nums cursor-pointer hover:bg-white/[0.12] transition-colors"
        >
          {format(value)}
        </button>
      </div>
      {hint && <span className="text-[10.5px] leading-snug text-white/40 -mt-0.5">{hint}</span>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Reducir ${label}`}
          onClick={() => onChange(clamp(value - step * (max - min > 10 ? 2 : 1)))}
          className="glass-btn w-7 h-7 !rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400"
          style={{
            background: `linear-gradient(90deg, rgba(34,211,238,0.85) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
          }}
        />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(clamp(value + step * (max - min > 10 ? 2 : 1)))}
          className="glass-btn w-7 h-7 !rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface ChoiceOption<T extends string> {
  id: T;
  label: string;
  desc?: string;
  icon?: React.ReactNode;
}

/** Selector de tarjetas grandes (una opción activa) */
function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (v: T) => void;
  cols?: 2 | 3;
}) {
  return (
    <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`glass-item rounded-2xl px-3 py-2.5 text-left flex flex-col gap-0.5 cursor-pointer ${
              active ? 'is-active' : ''
            }`}
          >
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
              {o.icon}
              {o.label}
            </span>
            {o.desc && <span className="text-[10.5px] leading-snug text-white/50">{o.desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

const Toggle: React.FC<{ label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  desc,
  checked,
  onChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-3 w-full text-left cursor-pointer"
  >
    <span className="flex flex-col">
      <span className="text-[12px] font-medium text-white/85">{label}</span>
      {desc && <span className="text-[10.5px] text-white/40 leading-snug">{desc}</span>}
    </span>
    <span
      className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${
        checked ? 'bg-cyan-400' : 'bg-white/15'
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </span>
  </button>
);

/* ────────────────────────────── presets rápidos ────────────────────────────── */

interface LookPreset {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  app: Partial<WallpaperApplicationSettings>;
  blob: Record<string, unknown>;
}

const LOOK_PRESETS: LookPreset[] = [
  {
    id: 'sharp',
    label: 'Nítido',
    desc: 'Imagen pura, sin capas',
    icon: <Aperture className="w-3.5 h-3.5" />,
    app: { opacity: 1, blur: 0, brightness: 1, saturation: 1, vignette: false, blendMode: 'normal' },
    blob: { backgroundContrastMode: 'none', backgroundTextScrim: 0 },
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    desc: 'Se lee bien y se ve',
    icon: <Eye className="w-3.5 h-3.5" />,
    app: { opacity: 1, blur: 0, brightness: 1, saturation: 1.05, vignette: false, blendMode: 'normal' },
    blob: { backgroundContrastMode: 'text_clarity', backgroundTextScrim: 0.35 },
  },
  {
    id: 'cinema',
    label: 'Cine',
    desc: 'Viñeta y sombras profundas',
    icon: <Moon className="w-3.5 h-3.5" />,
    app: { opacity: 1, blur: 0, brightness: 0.95, saturation: 1.1, vignette: true, blendMode: 'normal' },
    blob: { backgroundContrastMode: 'deep_cinema', backgroundTextScrim: 0.5 },
  },
  {
    id: 'soft',
    label: 'Suave',
    desc: 'Desenfoque tipo cristal',
    icon: <Feather className="w-3.5 h-3.5" />,
    app: { opacity: 0.9, blur: 14, brightness: 1, saturation: 1.1, vignette: false, blendMode: 'normal' },
    blob: { backgroundContrastMode: 'lucid_tint', backgroundTextScrim: 0.3 },
  },
];

/* ─────────────────────────────────── panel ─────────────────────────────────── */

type SectionId = 'source' | 'image' | 'light' | 'legibility' | 'blend' | 'storage';

export const WallpaperSettings: React.FC = () => {
  const {
    backgroundMode,
    setBackgroundMode,
    applicationSettings,
    updateApplicationSettings,
    resetApplicationSettings,
  } = useWallpaperStore();
  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const updateBlobSettings = usePlayerStore((s) => s.updateBlobSettings);

  const { cacheSizeMb, clearAll } = useWallpaperHistory();
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    source: true,
    image: true,
    light: true,
    legibility: false,
    blend: false,
    storage: false,
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const toggle = (id: SectionId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const allOpen = Object.values(open).every(Boolean);
  const setAll = (v: boolean) =>
    setOpen({ source: v, image: v, light: v, legibility: v, blend: v, storage: v });

  const opacity = blobSettings.backgroundOpacity ?? applicationSettings.opacity;
  const blur = blobSettings.backgroundBlur ?? applicationSettings.blur;
  const fit = blobSettings.backgroundFit || 'cover';
  const scale = blobSettings.backgroundScale || 1;
  const contrastMode = blobSettings.backgroundContrastMode || 'text_clarity';
  const scrim = blobSettings.backgroundTextScrim ?? 0.35;
  const tint = blobSettings.backgroundThemeTint ?? 0.35;

  const applyPreset = (p: LookPreset) => {
    updateApplicationSettings(p.app);
    updateBlobSettings(p.blob);
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Presets rápidos */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-wider text-white/50 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            Acabado rápido
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAll(!allOpen)}
              className="glass-btn !rounded-full px-2.5 py-1 text-[10.5px] text-white/70 hover:text-white cursor-pointer"
            >
              {allOpen ? 'Plegar todo' : 'Desplegar todo'}
            </button>
            <button
              type="button"
              onClick={resetApplicationSettings}
              className="glass-btn !rounded-full px-2.5 py-1 text-[10.5px] text-white/70 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restablecer
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LOOK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="glass-item rounded-2xl px-3 py-2.5 text-left flex flex-col gap-0.5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                <span className="text-cyan-300">{p.icon}</span>
                {p.label}
              </span>
              <span className="text-[10.5px] text-white/50">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fuente */}
      <Section
        icon={<Layers className="w-4 h-4" />}
        title="Fuente del fondo"
        subtitle={
          backgroundMode === 'wallpaper' ? 'Imagen' : backgroundMode === 'atmosphere' ? 'Atmósfera animada' : 'Negro abisal'
        }
        open={open.source}
        onToggle={() => toggle('source')}
      >
        <ChoiceGrid
          cols={3}
          value={backgroundMode}
          onChange={(m) => setBackgroundMode(m)}
          options={[
            { id: 'wallpaper', label: 'Imagen', desc: 'Wallpaper IA o propio' },
            { id: 'atmosphere', label: 'Atmósfera', desc: 'Efectos animados' },
            { id: 'void', label: 'Abisal', desc: 'Negro puro' },
          ]}
        />
      </Section>

      {/* Imagen */}
      <Section
        icon={<ImageIcon className="w-4 h-4" />}
        title="Encuadre de la imagen"
        subtitle={`${fit === 'cover' ? 'Cubrir' : 'Contener'} · zoom ${pct(scale)}`}
        open={open.image}
        onToggle={() => toggle('image')}
      >
        <ChoiceGrid
          value={fit as 'cover' | 'contain'}
          onChange={(v) => updateBlobSettings({ backgroundFit: v })}
          options={[
            { id: 'cover', label: 'Cubrir', desc: 'Llena la pantalla, recorta bordes' },
            { id: 'contain', label: 'Contener', desc: 'Se ve completa, sin recorte' },
          ]}
        />
        <Slider
          label="Zoom"
          value={scale}
          min={0.75}
          max={1.75}
          step={0.05}
          defaultValue={1}
          format={pct}
          onChange={(v) => updateBlobSettings({ backgroundScale: v })}
        />
      </Section>

      {/* Luz y color */}
      <Section
        icon={<SunMedium className="w-4 h-4" />}
        title="Luz y color"
        subtitle={`Opacidad ${pct(opacity)} · brillo ${pct(applicationSettings.brightness)}`}
        open={open.light}
        onToggle={() => toggle('light')}
      >
        <Slider
          label="Opacidad"
          hint="Cuánto se ve la imagen sobre el fondo oscuro."
          value={opacity}
          min={0.1}
          max={1}
          step={0.05}
          defaultValue={1}
          format={pct}
          onChange={(v) => updateApplicationSettings({ opacity: v })}
        />
        <Slider
          label="Desenfoque"
          value={blur}
          min={0}
          max={40}
          step={1}
          defaultValue={0}
          format={(v) => `${v}px`}
          onChange={(v) => updateApplicationSettings({ blur: v })}
        />
        <Slider
          label="Brillo"
          value={applicationSettings.brightness}
          min={0.4}
          max={1.6}
          step={0.05}
          defaultValue={1}
          format={pct}
          onChange={(v) => updateApplicationSettings({ brightness: v })}
        />
        <Slider
          label="Saturación"
          value={applicationSettings.saturation}
          min={0.4}
          max={1.8}
          step={0.05}
          defaultValue={1}
          format={pct}
          onChange={(v) => updateApplicationSettings({ saturation: v })}
        />
        <Toggle
          label="Reactivo al audio"
          desc="El fondo late con los graves y el bombo: zoom y destello sutiles."
          checked={blobSettings.backgroundReactive === true}
          onChange={(v) => updateBlobSettings({ backgroundReactive: v })}
        />
        {blobSettings.backgroundReactive === true && (
          <Slider
            label="Intensidad de la reacción"
            value={blobSettings.backgroundReactiveAmount ?? 0.6}
            min={0.1}
            max={1.5}
            step={0.05}
            defaultValue={0.6}
            format={pct}
            onChange={(v) => updateBlobSettings({ backgroundReactiveAmount: v })}
          />
        )}
      </Section>

      {/* Legibilidad */}
      <Section
        icon={<ScanText className="w-4 h-4" />}
        title="Legibilidad y ambiente"
        subtitle={
          contrastMode === 'none'
            ? 'Sin capa protectora'
            : `${
                contrastMode === 'lucid_tint' ? 'Tinte Lúcido' : contrastMode === 'deep_cinema' ? 'Cine profundo' : 'Texto claro'
              } · ${pct(scrim)}`
        }
        open={open.legibility}
        onToggle={() => toggle('legibility')}
      >
        <ChoiceGrid
          value={contrastMode as 'none' | 'text_clarity' | 'deep_cinema' | 'lucid_tint'}
          onChange={(v) => updateBlobSettings({ backgroundContrastMode: v })}
          options={[
            { id: 'none', label: 'Ninguna', desc: 'Imagen sin sombreado' },
            { id: 'text_clarity', label: 'Texto claro', desc: 'Oscurece bordes y zonas de texto' },
            { id: 'deep_cinema', label: 'Cine profundo', desc: 'Centro luminoso, bordes negros' },
            { id: 'lucid_tint', label: 'Tinte Lúcido', desc: 'Mezcla los colores del tema' },
          ]}
        />
        {contrastMode !== 'none' && (
          <Slider
            label="Intensidad de la capa"
            hint="Más alto = más legible pero más oscuro."
            value={scrim}
            min={0}
            max={1}
            step={0.05}
            defaultValue={0.35}
            format={pct}
            onChange={(v) => updateBlobSettings({ backgroundTextScrim: v })}
          />
        )}
        {contrastMode === 'lucid_tint' && (
          <Slider
            label="Fuerza del tinte"
            value={tint}
            min={0}
            max={1}
            step={0.05}
            defaultValue={0.35}
            format={pct}
            onChange={(v) => updateBlobSettings({ backgroundThemeTint: v })}
          />
        )}
        <Toggle
          label="Viñeta en los bordes"
          desc="Oscurece suavemente las esquinas"
          checked={applicationSettings.vignette}
          onChange={(v) => updateApplicationSettings({ vignette: v })}
        />
      </Section>

      {/* Fusión */}
      <Section
        icon={<Aperture className="w-4 h-4" />}
        title="Modo de fusión"
        subtitle={applicationSettings.blendMode}
        open={open.blend}
        onToggle={() => toggle('blend')}
      >
        <ChoiceGrid
          cols={3}
          value={applicationSettings.blendMode}
          onChange={(v) => updateApplicationSettings({ blendMode: v })}
          options={[
            { id: 'normal', label: 'Normal', desc: 'Sin mezcla' },
            { id: 'screen', label: 'Screen', desc: 'Aclara' },
            { id: 'multiply', label: 'Multiply', desc: 'Oscurece' },
            { id: 'overlay', label: 'Overlay', desc: 'Contraste' },
            { id: 'soft-light', label: 'Soft light', desc: 'Suave' },
          ]}
        />
      </Section>

      {/* Almacenamiento */}
      <Section
        icon={<Database className="w-4 h-4" />}
        title="Almacenamiento"
        subtitle={`${cacheSizeMb} MB en este navegador`}
        open={open.storage}
        onToggle={() => toggle('storage')}
      >
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[11.5px] text-white/70">¿Vaciar todos los fondos guardados?</span>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="glass-btn !rounded-full px-3 py-1.5 text-[11px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
              className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] font-semibold cursor-pointer"
            >
              Vaciar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="glass-btn is-danger !rounded-2xl w-full py-2.5 text-[12px] font-semibold cursor-pointer"
          >
            Limpiar caché de fondos
          </button>
        )}
      </Section>
    </div>
  );
};
