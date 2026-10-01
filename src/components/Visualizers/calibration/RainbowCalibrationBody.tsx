import React, { useState } from 'react';
import { Activity, Layers, Palette, Sliders, Trash2, Upload, Zap } from 'lucide-react';
import { usePlayerStore } from '../../../stores/playerStore';
import { useWallpaperStore } from '../../../stores/wallpaperStore';
import { RAINBOW_VOID_EFFECTS } from '../../../config/visualPresets';
import { KICK_MAX_PEAK } from '../../../utils/kickSpring';
import { VoidFxCustomizer } from '../../UI/VoidFxCustomizer';
import type { ActiveLogo } from '../../../hooks/useActiveLogo';
import type { ProEffectDef } from '../../../hooks/useProEffectsManager';
import { Choice, Section, SliderRow, SwitchRow } from './controls';

/**
 * Cuerpo de la calibración de Rainbow Void. Cada ajuste vive en UN solo sitio:
 *
 *   Forma    qué se dibuja: tamaño del núcleo, efecto del contorno y sus ajustes, grosor del trazo
 *   Música   cómo reacciona al sonido: detección del bombo y cuánto se mueve cada cosa con él
 *   Aspecto  cómo se ve: color, aura, giro, logo del centro y (avanzado) el aro clásico
 *   Capas    efectos extra que se apilan encima (máximo 4)
 *
 * Fondo y atmósferas ya no se repiten aquí: se ajustan en el Estudio de Fondos (atajo W).
 */

type TabId = 'shape' | 'music' | 'look' | 'layers';

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'shape', label: 'Forma', icon: Sliders },
  { id: 'music', label: 'Música', icon: Activity },
  { id: 'look', label: 'Aspecto', icon: Palette },
  { id: 'layers', label: 'Capas', icon: Layers },
];

export interface LogoPresetOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface RainbowCalibrationBodyProps {
  /** Registra los elementos de los medidores: el bucle de render los actualiza directamente (sin pasar por React) */
  registerMeter: (key: string, el: HTMLElement | null) => void;
  isSunset: boolean;
  logoPresets: LogoPresetOption[];
  activeLogo: ActiveLogo;
  onUploadLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onEditLogo: () => void;
  proToast: string | null;
  proEffects: ProEffectDef[];
  proActiveCount: number;
  proMax: number;
  onToggleEffect: (id: string) => void;
  onEffectIntensity: (id: string, v: number) => void;
}

export const RainbowCalibrationBody: React.FC<RainbowCalibrationBodyProps> = (props) => {
  const [tab, setTab] = useState<TabId>('shape');

  return (
    <div className="space-y-3.5 text-xs text-white/80">
      <div role="tablist" aria-label="Secciones de calibración" className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300 ${
                on
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 font-semibold'
                  : 'bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px] leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>

      {props.proToast && (
        <div role="status" className="p-2.5 bg-amber-500/15 border border-amber-400/35 rounded-xl text-amber-200 text-[11px] flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="leading-snug">{props.proToast}</span>
        </div>
      )}

      <div role="tabpanel" className="space-y-3 animate-in fade-in-50 duration-150">
        {tab === 'shape' && <ShapeTab />}
        {tab === 'music' && <MusicTab registerMeter={props.registerMeter} />}
        {tab === 'look' && <LookTab {...props} />}
        {tab === 'layers' && <LayersTab {...props} />}
      </div>
    </div>
  );
};

/* ═══ FORMA ═══════════════════════════════════════════════════════════════ */
const CORE_PRESETS = [
  { id: '240', label: 'Compacto' },
  { id: '340', label: 'Estándar' },
  { id: '430', label: 'Amplio' },
];
const STROKES = [
  { id: '0.75', label: 'Ultrafino' },
  { id: '1', label: 'Fino' },
  { id: '1.5', label: 'Marcado' },
];

const ShapeTab: React.FC = () => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);
  const blobShape = usePlayerStore((st) => st.blobShape);
  const setBlobShape = usePlayerStore((st) => st.setBlobShape);
  const size = s.circleSize || 340;
  const stroke = s.strokeHairline ?? s.catEarsStrokeWidth ?? 1;

  return (
    <>
      <Section title="Núcleo" hint="El disco oscuro del centro, donde se ve el logo o la carátula.">
        <SliderRow
          label="Tamaño"
          value={size}
          min={160}
          max={500}
          step={1}
          display={`${size} px`}
          onChange={(v) => update({ circleSize: Math.round(v) })}
        />
        <Choice options={CORE_PRESETS} value={String(size)} onChange={(id) => update({ circleSize: parseInt(id, 10) })} />
      </Section>

      <Section title="Forma del contorno" hint="Lo que se dibuja alrededor del disco y reacciona a la música.">
        <div className="grid grid-cols-2 gap-2">
          {RAINBOW_VOID_EFFECTS.map((fx) => {
            const on = blobShape === fx.id;
            return (
              <button
                key={fx.id}
                type="button"
                aria-pressed={on}
                onClick={() => setBlobShape(fx.id)}
                title={fx.desc}
                className={`glass-item !rounded-xl px-3 py-2.5 text-left flex flex-col gap-0.5 cursor-pointer ${on ? 'is-active text-white' : 'text-white/75'}`}
              >
                <span className="text-[12px] font-semibold tracking-tight">{fx.name}</span>
                <span className="text-[10.5px] leading-snug text-white/55 line-clamp-2">{fx.desc}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <VoidFxCustomizer />

      <Section title="Trazo" hint="Grosor de las líneas de todas las formas.">
        <Choice
          options={STROKES}
          value={String(stroke)}
          onChange={(id) => update({ strokeHairline: parseFloat(id) as never, catEarsStrokeWidth: parseFloat(id) })}
        />
      </Section>
    </>
  );
};

/* ═══ MÚSICA ══════════════════════════════════════════════════════════════ */
const MusicTab: React.FC<{ registerMeter: RainbowCalibrationBodyProps['registerMeter'] }> = ({ registerMeter }) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);

  // La sensibilidad se muestra al derecho (más = más golpes); internamente es un umbral (menos = más golpes)
  const threshold = s.kickThreshold ?? 0.32;
  const sensitivity = Math.round(((0.7 - threshold) / 0.6) * 100);
  const strength = s.kickIntensity ?? 1;

  return (
    <>
      <Section
        title="Señal en vivo"
        hint="Lo que el visualizador escucha ahora mismo. KICK se enciende con cada bombo detectado."
        action={
          <span
            ref={(el) => {
              registerMeter('kick', el);
            }}
            className="text-[11px] font-mono font-bold text-cyan-300 opacity-0"
          >
            ● KICK
          </span>
        }
      >
        <div className="space-y-2">
          {(
            [
              ['Graves', 'bass'],
              ['Medios', 'mids'],
              ['Agudos', 'treble'],
            ] as const
          ).map(([label, key]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-14 text-[11px] text-white/60">{label}</span>
              <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  ref={(el) => {
                    registerMeter(key, el);
                  }}
                  className="absolute inset-0 origin-left bg-gradient-to-r from-cyan-400 to-violet-400"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Detección del bombo">
        <SliderRow
          label="Sensibilidad"
          value={sensitivity}
          min={0}
          max={100}
          step={2}
          display={`${sensitivity}%`}
          onChange={(v) => update({ kickThreshold: Math.round((0.7 - (v / 100) * 0.6) * 100) / 100 })}
          hint="Más alto detecta más golpes. Súbelo hasta que KICK parpadee con cada bombo, y bájalo si se enciende con otros sonidos."
        />
      </Section>

      <Section title="Cuánto se mueve con la música">
        <SliderRow
          label="Fuerza del golpe"
          value={strength}
          min={0.5}
          max={1.5}
          step={0.05}
          display={`${strength.toFixed(2)}× · hasta +${Math.round(KICK_MAX_PEAK * strength * 100)}%`}
          onChange={(v) => update({ kickIntensity: v })}
          hint="Cuánto crece el núcleo con el bombo más fuerte. Los golpes suaves crecen menos."
        />
        <SliderRow
          label="Reacción del núcleo al volumen"
          value={s.scaleSensitivity ?? 1.4}
          min={0.4}
          max={2.2}
          step={0.05}
          display={`${(s.scaleSensitivity ?? 1.4).toFixed(2)}×`}
          onChange={(v) => update({ scaleSensitivity: v })}
          hint="Cuánto respira el núcleo con la música en general, aparte de los golpes."
        />
        {s.auraEnabled !== false && (
          <SliderRow
            label="Respuesta del aura al bombo"
            value={s.auraKickResponse ?? 1}
            min={0}
            max={1.5}
            step={0.05}
            display={`${Math.round((s.auraKickResponse ?? 1) * 100)}%`}
            onChange={(v) => update({ auraKickResponse: v })}
            hint="Cuánto se expande la nube de color con cada golpe. En 0% el aura no reacciona al bombo."
          />
        )}
      </Section>
    </>
  );
};

/* ═══ ASPECTO ═════════════════════════════════════════════════════════════ */
const PALETTES = [
  { id: 'neon', name: 'Neón líquido', desc: 'Cian y violeta' },
  { id: 'gold', name: 'Oro champán', desc: 'Lujo y obsidiana' },
  { id: 'crystal', name: 'Cristal', desc: 'Blanco esmerilado' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Magenta y cian' },
  { id: 'aurora', name: 'Aurora boreal', desc: 'Verde y aguamarina' },
  { id: 'lucid', name: 'Sincro lúcido', desc: 'Color del reproductor' },
  { id: 'custom', name: 'Personalizada', desc: 'Tus propios colores' },
] as const;

const LookTab: React.FC<RainbowCalibrationBodyProps> = (p) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);
  const lucidTheme = usePlayerStore((st) => st.lucidTheme);
  const palette = s.sacredPalette || 'neon';
  const auraOn = s.auraEnabled !== false;
  const colorsOf = (id: string): [string, string] => {
    switch (id) {
      case 'neon':
        return ['#00F0FF', '#8C38FF'];
      case 'gold':
        return ['#E2C889', '#FFF2CE'];
      case 'crystal':
        return ['#FFFFFF', '#B0C4DE'];
      case 'cyberpunk':
        return ['#ff007f', '#00f2fe'];
      case 'aurora':
        return ['#00ff87', '#60efff'];
      case 'lucid':
        return [lucidTheme.primary, lucidTheme.secondary];
      default:
        return [s.haloColor1 || '#00f0ff', s.haloColor2 || '#ffd166'];
    }
  };
  const classicTransparent = s.transparentHalo !== false;
  const hasLogoCustom = Boolean(s.customLogoUrl || s.logoAppearance || p.activeLogo.hasTrackImage || p.activeLogo.hasTrackAppearance);

  return (
    <>
      <Section title="Color" hint="Paleta del contorno, el aura y los efectos.">
        <div className="grid grid-cols-2 gap-1.5">
          {PALETTES.map((pal) => {
            const on = palette === pal.id;
            const [c0, c1] = colorsOf(pal.id);
            return (
              <button
                key={pal.id}
                type="button"
                aria-pressed={on}
                onClick={() => update({ sacredPalette: pal.id as never })}
                className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300 ${
                  on ? 'bg-cyan-500/20 border-cyan-400/60 text-white' : 'bg-white/[0.02] border-white/[0.07] text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold leading-tight truncate">{pal.name}</span>
                  <span className="block text-[10px] text-white/45 truncate">{pal.desc}</span>
                </span>
                <span className="flex gap-0.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c0 }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c1 }} />
                </span>
              </button>
            );
          })}
        </div>

        {palette === 'custom' && (
          <div className="pt-2 border-t border-white/[0.08] space-y-2">
            {(
              [
                ['Color 1', 'haloColor1', '#00f0ff'],
                ['Color 2', 'haloColor2', '#ffd166'],
                ['Fondo del núcleo', 'circleColor', '#070a16'],
              ] as const
            ).map(([label, key, fallback]) => (
              <label key={key} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-black/30 border border-white/10">
                <span className="text-[11px] text-white/75">{label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(s[key] as string) || fallback}
                    onChange={(e) => update({ [key]: e.target.value })}
                    className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-[10.5px] font-mono uppercase text-white/55">{(s[key] as string) || fallback}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Aura"
        hint="La nube de color que rodea al disco."
        action={
          <button
            type="button"
            role="switch"
            aria-checked={auraOn}
            onClick={() => update({ auraEnabled: !auraOn })}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold border cursor-pointer transition-colors ${
              auraOn ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40' : 'bg-white/[0.05] text-white/45 border-white/[0.08]'
            }`}
          >
            {auraOn ? 'ACTIVA' : 'APAGADA'}
          </button>
        }
      >
        {auraOn && (
          <>
            <SliderRow label="Intensidad" value={s.auraIntensity ?? 0.9} min={0} max={1.5} step={0.05} display={`${Math.round((s.auraIntensity ?? 0.9) * 100)}%`} onChange={(v) => update({ auraIntensity: v })} hint="Qué tan brillante se ve la nube." />
            <SliderRow label="Extensión" value={s.auraReach ?? 1} min={0.6} max={1.5} step={0.05} display={`${Math.round((s.auraReach ?? 1) * 100)}%`} onChange={(v) => update({ auraReach: v })} hint="Qué tan lejos del disco llega." />
            <SliderRow label="Suavidad" value={s.auraSoftness ?? 0.6} min={0} max={1} step={0.05} display={`${Math.round((s.auraSoftness ?? 0.6) * 100)}%`} onChange={(v) => update({ auraSoftness: v })} hint="Más suave = más difusa y más grande." />
            <SliderRow label="Movimiento ambiental" value={s.auraMotion ?? 1} min={0} max={1.5} step={0.05} display={`${Math.round((s.auraMotion ?? 1) * 100)}%`} onChange={(v) => update({ auraMotion: v })} hint="Cuánto derivan los colores solos, sin música." />
          </>
        )}
      </Section>

      <Section title="Giro">
        <SliderRow
          label="Velocidad"
          value={s.rotationSpeed ?? 1}
          min={0}
          max={2.5}
          step={0.05}
          display={(s.rotationSpeed ?? 1) === 0 ? 'Quieto' : `${(s.rotationSpeed ?? 1).toFixed(2)}×`}
          onChange={(v) => update({ rotationSpeed: v })}
          hint="Qué tan rápido gira el dibujo alrededor del disco."
        />
        <Choice
          label="Sentido"
          options={[
            { id: 'clockwise', label: '↻ Horario' },
            { id: 'counter_clockwise', label: '↺ Antihorario' },
          ]}
          value={s.rotationDirection === 'counter_clockwise' ? 'counter_clockwise' : 'clockwise'}
          onChange={(id) => update({ rotationDirection: id as never })}
        />
      </Section>

      {!p.isSunset && (
        <Section title="Logo del centro" hint="En Spotify y YouTube se usa la carátula de cada canción.">
          <div className="grid grid-cols-4 gap-1.5">
            {p.logoPresets.map((preset) => {
              const Icon = preset.icon;
              const on = s.logoStyle === preset.id && !s.customLogoUrl;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ logoStyle: preset.id, customLogoUrl: null })}
                  title={preset.name}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    on ? 'bg-white/[0.1] border-white/70 text-white' : 'bg-white/[0.02] border-white/[0.07] text-white/45 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] truncate max-w-full">{preset.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <label
              title={p.activeLogo.streaming ? 'En Spotify y YouTube la carátula cambia con cada canción' : undefined}
              className={`flex-1 min-h-[32px] px-2.5 border border-white/[0.08] rounded-lg flex items-center justify-center gap-1.5 text-[11px] ${
                p.activeLogo.streaming ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white cursor-pointer'
              }`}
            >
              <Upload className="w-3 h-3" />
              <span>{p.activeLogo.hasTrackImage ? 'Cambiar imagen' : 'Subir imagen propia'}</span>
              <input type="file" accept="image/*" onChange={p.onUploadLogo} className="hidden" disabled={p.activeLogo.streaming} />
            </label>
            {hasLogoCustom && (
              <button
                type="button"
                onClick={p.onRemoveLogo}
                className="px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg cursor-pointer"
                title="Quitar la personalización del logo"
                aria-label="Quitar la personalización del logo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={p.onEditLogo}
            className="w-full min-h-[34px] px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 rounded-xl text-[11.5px] font-medium text-cyan-100 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-300" />
            Editar encuadre y filtros
          </button>
        </Section>
      )}

      <Section title="Fondo y atmósfera" hint="Imagen de fondo, atmósferas, opacidad y desenfoque se ajustan en un solo lugar.">
        <button
          type="button"
          onClick={() => useWallpaperStore.getState().setPanelOpen(true)}
          className="w-full min-h-[34px] px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-[11.5px] font-medium text-white/85 cursor-pointer transition-colors"
        >
          Abrir Estudio de Fondos <span className="text-white/40 font-mono ml-1">(W)</span>
        </button>
      </Section>

      <details className="group rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <summary className="cursor-pointer select-none list-none px-3 py-2.5 flex items-center justify-between text-[12px] font-semibold text-white/80">
          <span>Avanzado: aro clásico</span>
          <span aria-hidden="true" className="text-white/40 text-[11px] group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[10.5px] leading-snug text-white/45">
            El aro difuso original. Con el aura activa casi no se nota: estos ajustes se ven sobre todo si apagas «Halo transparente».
          </p>
          <SwitchRow
            label="Halo transparente"
            hint={classicTransparent ? 'Activo: sin aro difuso, solo el aura.' : 'Apagado: aro difuso clásico visible.'}
            on={classicTransparent}
            onChange={(v) => update({ transparentHalo: v })}
          />
          <SliderRow
            label="Tamaño del aro"
            value={s.haloSize || 382}
            min={220}
            max={520}
            step={2}
            display={`${s.haloSize || 382} px`}
            onChange={(v) => update({ haloSize: Math.round(v) })}
            hint="Diámetro del aro difuso. Más grande que el núcleo = más halo visible."
          />
          <SliderRow
            label="Resplandor del aro"
            value={s.bloomIntensity ?? 1}
            min={0.3}
            max={2.2}
            step={0.05}
            display={`${(s.bloomIntensity ?? 1).toFixed(2)}×`}
            onChange={(v) => update({ bloomIntensity: v })}
            hint="Brillo de la sombra de luz del aro."
          />
        </div>
      </details>
    </>
  );
};

/* ═══ CAPAS ═══════════════════════════════════════════════════════════════ */
const LayersTab: React.FC<RainbowCalibrationBodyProps> = (p) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const full = p.proActiveCount >= p.proMax;

  return (
    <>
      <Section
        title="Capas extra"
        hint={`Efectos que se apilan encima de la forma. Máximo ${p.proMax} a la vez; si los FPS bajan de 45 se apagan solos los más pesados.`}
        action={
          <span
            className={`text-[10.5px] font-mono px-2 py-0.5 rounded-full border font-bold tabular-nums whitespace-nowrap ${
              full ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' : p.proActiveCount > 0 ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' : 'bg-white/[0.04] text-white/45 border-white/[0.08]'
            }`}
          >
            {p.proActiveCount} / {p.proMax}
          </span>
        }
      >
        <div className="space-y-2">
          {p.proEffects.map((eff) => {
            const on = Boolean(s[eff.enabledKey]);
            const intensity = (s[eff.intensityKey] as number) ?? 1;
            return (
              <div
                key={eff.id}
                className={`p-3 rounded-xl border space-y-2 transition-colors ${on ? 'bg-white/[0.05] border-cyan-500/30' : 'bg-white/[0.02] border-white/[0.06]'}`}
              >
                <SwitchRow label={eff.name} hint={eff.desc} on={on} onChange={() => p.onToggleEffect(eff.id)} />
                {on && (
                  <SliderRow
                    label="Intensidad"
                    value={intensity}
                    min={0}
                    max={2}
                    step={0.05}
                    display={`${intensity.toFixed(2)}×`}
                    onChange={(v) => p.onEffectIntensity(eff.id, v)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
};

export default RainbowCalibrationBody;
