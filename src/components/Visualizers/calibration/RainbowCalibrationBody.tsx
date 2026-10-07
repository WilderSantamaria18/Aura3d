import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Palette,
  Sliders,
  Trash2,
  Upload,
  Zap,
  Sparkles,
  RotateCw,
  Eye,
  Disc3,
  Sun,
  Shield,
  Circle,
  Gem,
} from 'lucide-react';
import { usePlayerStore } from '../../../stores/playerStore';
import { RAINBOW_VOID_EFFECTS } from '../../../config/visualPresets';
import { KICK_MAX_PEAK } from '../../../utils/kickSpring';
import { VoidFxCustomizer } from '../../UI/VoidFxCustomizer';
import type { ActiveLogo } from '../../../hooks/useActiveLogo';
import type { ProEffectDef } from '../../../hooks/useProEffectsManager';
import type { BlobShape } from '../../../types/audio';
import { Choice, Section, SliderRow, SwitchRow } from './controls';

type TabId = 'presets' | 'shape' | 'music' | 'look' | 'layers';

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'presets', label: 'Presets', icon: Sparkles },
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
  const [tab, setTab] = useState<TabId>('presets');

  return (
    <div className="space-y-3.5 text-xs text-white/90">
      {/* 5 Tab Navigation */}
      <div
        role="tablist"
        aria-label="Secciones de estudio Rainbow Void"
        className="grid grid-cols-5 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10"
      >
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
              className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border transition-all cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                on
                  ? 'bg-cyan-500/25 text-white border-cyan-400/70 font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${on ? 'text-cyan-300' : ''}`} />
              <span className="text-[10.5px] leading-none tracking-tight">{t.label}</span>
            </button>
          );
        })}
      </div>

      {props.proToast && (
        <div
          role="status"
          className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-[11px] flex items-center gap-2 shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="leading-snug">{props.proToast}</span>
        </div>
      )}

      <div role="tabpanel" className="space-y-3 animate-in fade-in-50 duration-150">
        {tab === 'presets' && <PresetsTab />}
        {tab === 'shape' && <ShapeTab />}
        {tab === 'music' && <MusicTab registerMeter={props.registerMeter} />}
        {tab === 'look' && <LookTab {...props} />}
        {tab === 'layers' && <LayersTab {...props} />}
      </div>
    </div>
  );
};

/* ═══ 1. PRESETS MAESTROS ══════════════════════════════════════════════════ */
const MASTER_PRESETS = [
  {
    id: 'zen_mandala',
    title: 'Mándala Zen',
    desc: 'Geometría sagrada de 8 pétalos, rotación suave y paleta Aurora mística',
    icon: Sparkles,
    badge: 'Místico',
    gradient: 'from-emerald-400 to-cyan-400',
    settings: {
      blobShape: 'fractal',
      catEarsCount: 8,
      catEarsLayers: 3,
      catEarsSharpness: 1.8,
      circleSize: 320,
      rotationSpeed: 0.6,
      rotationDirection: 'clockwise' as const,
      sacredPalette: 'aurora' as const,
      dhonkioBloom: 1.4,
      dhonkioOpacity: 0.85,
      bassBoost: 2.2,
      scaleSensitivity: 1.2,
      kickIntensity: 1.1,
      kickPower: 1.4,
      transparentHalo: true,
      strokeHairline: 0.75,
      auraEnabled: true,
      auraKickResponse: 0.9,
    },
  },
  {
    id: 'cyberpunk_overdrive',
    title: 'Cyberpunk Overdrive',
    desc: 'Vértices afilados de alta velocidad, bloom neón 2.4x y golpe de graves masivo',
    icon: Zap,
    badge: 'Club / Bass',
    gradient: 'from-pink-500 to-cyan-400',
    settings: {
      blobShape: 'geometry',
      catEarsCount: 6,
      catEarsLayers: 4,
      catEarsSharpness: 3.2,
      circleSize: 340,
      rotationSpeed: 1.8,
      rotationDirection: 'clockwise' as const,
      sacredPalette: 'cyberpunk' as const,
      dhonkioBloom: 2.3,
      dhonkioOpacity: 0.92,
      bassBoost: 3.8,
      scaleSensitivity: 1.7,
      kickIntensity: 1.4,
      kickPower: 2.1,
      transparentHalo: false,
      strokeHairline: 1.5,
      shockwaveEnabled: true,
      auraEnabled: true,
      auraKickResponse: 1.3,
    },
  },
  {
    id: 'nebula_stardust',
    title: 'Nebula Stardust',
    desc: 'Núcleo flotante con aura expansiva reactiva y estela de partículas cósmicas',
    icon: Sun,
    badge: 'Espacial',
    gradient: 'from-violet-500 to-indigo-400',
    settings: {
      blobShape: 'particles',
      catEarsCount: 4,
      catEarsLayers: 2,
      catEarsSharpness: 2.0,
      circleSize: 260,
      rotationSpeed: 1.0,
      rotationDirection: 'clockwise' as const,
      sacredPalette: 'neon' as const,
      dhonkioBloom: 1.8,
      dhonkioOpacity: 0.78,
      bassBoost: 2.5,
      scaleSensitivity: 1.5,
      kickIntensity: 1.2,
      kickPower: 1.6,
      transparentHalo: true,
      strokeHairline: 1.0,
      auraEnabled: true,
      auraKickResponse: 1.2,
    },
  },
  {
    id: 'imperial_gold',
    title: 'Imperial Gold',
    desc: 'Lujo en obsidiana con geometría concéntrica en oro champán y halo pulido',
    icon: Gem,
    badge: 'Luxury',
    gradient: 'from-amber-300 to-amber-600',
    settings: {
      blobShape: 'fractal',
      catEarsCount: 8,
      catEarsLayers: 4,
      catEarsSharpness: 2.4,
      circleSize: 360,
      rotationSpeed: 0.5,
      rotationDirection: 'counter_clockwise' as const,
      sacredPalette: 'gold' as const,
      dhonkioBloom: 1.3,
      dhonkioOpacity: 0.95,
      bassBoost: 2.0,
      scaleSensitivity: 1.1,
      kickIntensity: 1.0,
      kickPower: 1.3,
      transparentHalo: true,
      strokeHairline: 1.0,
      auraEnabled: true,
      auraKickResponse: 0.7,
    },
  },
  {
    id: 'crystal_prism',
    title: 'Crystal Prism',
    desc: '12 vértices diamante, dispersión cromática arcoíris y rotación invertida',
    icon: Disc3,
    badge: 'Prismático',
    gradient: 'from-cyan-300 via-white to-fuchsia-400',
    settings: {
      blobShape: 'crystal',
      catEarsCount: 12,
      catEarsLayers: 3,
      catEarsSharpness: 3.5,
      circleSize: 310,
      rotationSpeed: 1.2,
      rotationDirection: 'counter_clockwise' as const,
      sacredPalette: 'crystal' as const,
      dhonkioBloom: 1.9,
      dhonkioOpacity: 0.88,
      bassBoost: 2.6,
      scaleSensitivity: 1.4,
      kickIntensity: 1.25,
      kickPower: 1.7,
      transparentHalo: true,
      isRainbowMode: true,
      strokeHairline: 1.2,
      auraEnabled: true,
      auraKickResponse: 1.0,
    },
  },
  {
    id: 'pure_obsidian',
    title: 'Obsidian Minimal',
    desc: 'Estética purista monocroma, trazo ultrafino y reactividad sutil al audio',
    icon: Circle,
    badge: 'Minimal',
    gradient: 'from-gray-300 to-zinc-600',
    settings: {
      blobShape: 'wave',
      catEarsCount: 2,
      catEarsLayers: 1,
      catEarsSharpness: 1.5,
      circleSize: 340,
      rotationSpeed: 0.8,
      rotationDirection: 'clockwise' as const,
      sacredPalette: 'crystal' as const,
      dhonkioBloom: 0.9,
      dhonkioOpacity: 0.95,
      bassBoost: 1.8,
      scaleSensitivity: 1.0,
      kickIntensity: 0.9,
      kickPower: 1.2,
      transparentHalo: false,
      strokeHairline: 0.75,
      auraEnabled: false,
      auraKickResponse: 0.0,
    },
  },
];

const PresetsTab: React.FC = () => {
  const update = usePlayerStore((st) => st.updateBlobSettings);
  const setBlobShape = usePlayerStore((st) => st.setBlobShape);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const applyPreset = (preset: typeof MASTER_PRESETS[0]) => {
    setActivePresetId(preset.id);
    const { blobShape, ...rest } = preset.settings;
    if (blobShape) setBlobShape(blobShape as BlobShape);
    update(rest as never);
  };

  return (
    <div className="space-y-2.5">
      <div className="px-1">
        <span className="text-xs font-semibold text-white/90">Estilos Maestros Preconfigurados</span>
        <p className="text-[10.5px] text-white/50 leading-snug">
          Aplica combinaciones armoniosas completas de geometría, shaders, bloom y reactividad con un solo toque.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {MASTER_PRESETS.map((p) => {
          const Icon = p.icon;
          const isSelected = activePresetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400/80 shadow-[0_0_20px_rgba(0,229,255,0.3)] ring-1 ring-cyan-400/50'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${p.gradient} text-black font-bold shadow-md`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">{p.title}</span>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.2 rounded-full bg-white/10 text-white/80 border border-white/10">
                      {p.badge}
                    </span>
                  </div>
                  <span className="text-[10.5px] text-white/55 line-clamp-1">{p.desc}</span>
                </div>
              </div>

              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff] shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ═══ 2. FORMA & GEOMETRÍA SAGRADA ═════════════════════════════════════════ */
const CORE_PRESETS = [
  { id: '240', label: '240 px (Mini)' },
  { id: '340', label: '340 px (Estándar)' },
  { id: '430', label: '430 px (Amplio)' },
];

const PETALS_OPTIONS = [
  { id: '2', label: '2 Puntas' },
  { id: '3', label: '3 Puntas' },
  { id: '4', label: '4 Puntas' },
  { id: '6', label: '6 Puntas' },
  { id: '8', label: '8 Pétalos' },
  { id: '12', label: '12 Diamante' },
];

const STROKES = [
  { id: '0.75', label: 'Ultrafino (0.75px)' },
  { id: '1', label: 'Fino (1.0px)' },
  { id: '1.5', label: 'Marcado (1.5px)' },
  { id: '2.5', label: 'Grueso (2.5px)' },
];

const SHARPNESS_OPTIONS = [
  { id: '1.5', label: 'Suave' },
  { id: '2.2', label: 'Balanceado' },
  { id: '3.5', label: 'Afilado' },
];

const ShapeTab: React.FC = () => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);
  const blobShape = usePlayerStore((st) => st.blobShape);
  const setBlobShape = usePlayerStore((st) => st.setBlobShape);

  const size = s.circleSize || 340;
  const stroke = s.strokeHairline ?? s.catEarsStrokeWidth ?? 1;
  const petals = s.catEarsCount ?? 2;
  const layers = s.catEarsLayers ?? 2;
  const sharpness = s.catEarsSharpness ?? 2.2;

  return (
    <>
      <Section title="Núcleo del Visualizador" hint="Diámetro del disco central donde vibra el arte o logotipo.">
        <SliderRow
          label="Diámetro del Núcleo"
          value={size}
          min={160}
          max={500}
          step={1}
          display={`${size} px`}
          onChange={(v) => update({ circleSize: Math.round(v) })}
        />
        <Choice
          options={CORE_PRESETS}
          value={String(size)}
          onChange={(id) => update({ circleSize: parseInt(id, 10) })}
        />
      </Section>

      <Section title="Geometría Sagrada & Mándala" hint="Configuración de vértices matemáticos, pétalos y capas concéntricas.">
        <Choice
          label="Puntas / Pétalos Matemáticos"
          options={PETALS_OPTIONS}
          value={String(petals)}
          columns={3}
          onChange={(id) => update({ catEarsCount: parseInt(id, 10) })}
          hint="Controla la simetría del contorno (2 orejas, 4 crestas, 8 mándala o 12 diamante)."
        />

        <SliderRow
          label="Capas Concéntricas"
          value={layers}
          min={1}
          max={5}
          step={1}
          display={`${layers} ${layers === 1 ? 'capa' : 'capas'}`}
          onChange={(v) => update({ catEarsLayers: Math.round(v) })}
          hint="Multiplica las líneas en profundidad dimensional."
        />

        <Choice
          label="Agudeza de Vértices"
          options={SHARPNESS_OPTIONS}
          value={String(sharpness)}
          onChange={(id) => update({ catEarsSharpness: parseFloat(id) })}
          hint="Curvatura de los picos en cada impulso del bombo."
        />
      </Section>

      <Section title="Estilo de Contorno Activo" hint="Algoritmo procedural que envuelve el núcleo.">
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
                className={`p-2.5 rounded-xl text-left flex flex-col gap-0.5 border transition-all cursor-pointer ${
                  on
                    ? 'bg-cyan-500/25 border-cyan-400/80 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)] font-semibold'
                    : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span className="text-xs font-bold tracking-tight text-white">{fx.name}</span>
                <span className="text-[10px] leading-snug text-white/55 line-clamp-1">{fx.desc}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <VoidFxCustomizer />

      <Section title="Grosor de Trazo" hint="Definición vectorial de todas las líneas perimetrales.">
        <Choice
          options={STROKES}
          value={String(stroke)}
          columns={2}
          onChange={(id) =>
            update({ strokeHairline: parseFloat(id) as never, catEarsStrokeWidth: parseFloat(id) })
          }
        />
      </Section>
    </>
  );
};

/* ═══ 3. MÚSICA & DINÁMICAS DSP ═════════════════════════════════════════════ */
const MusicTab: React.FC<{ registerMeter: RainbowCalibrationBodyProps['registerMeter'] }> = ({
  registerMeter,
}) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);

  const threshold = s.kickThreshold ?? 0.32;
  const sensitivity = Math.round(((0.7 - threshold) / 0.6) * 100);
  const strength = s.kickIntensity ?? 1;
  const kickPower = s.kickPower ?? 1.6;
  const boost = s.bassBoost ?? 2.8;

  return (
    <>
      <Section
        title="Monitor de Audio en Vivo"
        hint="Medición FFT de transitorios. KICK se ilumina instantáneamente al detectar el bombo."
        action={
          <span
            ref={(el) => {
              registerMeter('kick', el);
            }}
            className="text-[11px] font-mono font-bold text-cyan-300 opacity-0 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_10px_#00e5ff]"
          >
            ● KICK
          </span>
        }
      >
        <div className="space-y-2">
          {(
            [
              ['Sub-Graves', 'bass'],
              ['Medios', 'mids'],
              ['Agudos', 'treble'],
            ] as const
          ).map(([label, key]) => (
            <div key={key} className="flex items-center gap-2.5">
              <span className="w-18 text-[11px] text-white/70 font-medium">{label}</span>
              <div className="relative flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  ref={(el) => {
                    registerMeter(key, el);
                  }}
                  className="absolute inset-0 origin-left bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Detección y Resorte de Bombo (Kick Dynamics)">
        <SliderRow
          label="Sensibilidad de Detección"
          value={sensitivity}
          min={0}
          max={100}
          step={2}
          display={`${sensitivity}%`}
          onChange={(v) =>
            update({ kickThreshold: Math.round((0.7 - (v / 100) * 0.6) * 100) / 100 })
          }
          hint="Ajusta el umbral hasta que el indicador KICK parpadee en sincronía exacta con cada bombo."
        />

        <SliderRow
          label="Fuerza del Golpe (Impulso)"
          value={strength}
          min={0.5}
          max={2.0}
          step={0.05}
          display={`${strength.toFixed(2)}× · hasta +${Math.round(KICK_MAX_PEAK * strength * 100)}%`}
          onChange={(v) => update({ kickIntensity: v })}
          hint="Magnitud física de la expansión en el ataque del bombo."
        />

        <SliderRow
          label="Potencia de Expansión del Resorte"
          value={kickPower}
          min={1.0}
          max={2.5}
          step={0.05}
          display={`${kickPower.toFixed(2)}×`}
          onChange={(v) => update({ kickPower: v })}
          hint="Elasticidad y rebote de amortiguación (física tipo resorte de iOS)."
        />
      </Section>

      <Section title="Resonancia & Expansión Musical">
        <SliderRow
          label="Boost de Graves & Sub-Bass"
          value={boost}
          min={1.0}
          max={5.0}
          step={0.1}
          display={`${boost.toFixed(1)}×`}
          onChange={(v) => update({ bassBoost: v })}
          hint="Multiplicador de respuesta a frecuencias sub-graves (<120Hz)."
        />

        <SliderRow
          label="Respiración Dinámica al Volumen"
          value={s.scaleSensitivity ?? 1.4}
          min={0.4}
          max={2.2}
          step={0.05}
          display={`${(s.scaleSensitivity ?? 1.4).toFixed(2)}×`}
          onChange={(v) => update({ scaleSensitivity: v })}
          hint="Expansión continua del núcleo con el volumen musical general."
        />

        {s.auraEnabled !== false && (
          <SliderRow
            label="Respuesta del Aura al Bombo"
            value={s.auraKickResponse ?? 1}
            min={0}
            max={1.5}
            step={0.05}
            display={`${Math.round((s.auraKickResponse ?? 1) * 100)}%`}
            onChange={(v) => update({ auraKickResponse: v })}
            hint="Expansión de la nebulosa perimetral en cada impacto de kick."
          />
        )}

        <SwitchRow
          label="Onda de Choque en Kicks Fuertes"
          hint="Dispara un anillo de onda expansiva translúcida cuando el bombo supera el umbral."
          on={Boolean(s.shockwaveEnabled)}
          onChange={(val) => update({ shockwaveEnabled: val })}
        />
      </Section>
    </>
  );
};

/* ═══ 4. SHADERS, BLOOM & ASPECTO ═══════════════════════════════════════════ */
const PALETTES = [
  { id: 'neon', name: 'Neón Líquido', desc: 'Cian & Violeta Eléctrico' },
  { id: 'gold', name: 'Oro Champán', desc: 'Obsidiana & Oro Pulido' },
  { id: 'crystal', name: 'Cristal Puro', desc: 'Blanco & Azul Hielo' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Magenta & Turquesa' },
  { id: 'aurora', name: 'Aurora Boreal', desc: 'Verde Esmeralda & Aguamarina' },
  { id: 'lucid', name: 'Sincro Lúcido', desc: 'Sincronizado con Acento UI' },
  { id: 'custom', name: 'Personalizado', desc: 'Colores Hex a Medida' },
] as const;

const LookTab: React.FC<RainbowCalibrationBodyProps> = (p) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const update = usePlayerStore((st) => st.updateBlobSettings);
  const lucidTheme = usePlayerStore((st) => st.lucidTheme);

  const palette = s.sacredPalette || 'neon';
  const bloom = s.dhonkioBloom ?? 1.33;
  const coreOpacity = s.dhonkioOpacity ?? 0.85;
  const rotSpeed = s.rotationSpeed ?? 1.0;
  const isClockwise = s.rotationDirection !== 'counter_clockwise';
  const isTransparentHalo = s.transparentHalo !== false;

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

  return (
    <>
      <Section title="Shaders & Resplandor Neón (Bloom)">
        <SliderRow
          label="Intensidad de Bloom / Resplandor"
          value={bloom}
          min={0.5}
          max={3.0}
          step={0.05}
          display={`${bloom.toFixed(2)}×`}
          onChange={(v) => update({ dhonkioBloom: v })}
          hint="Potencia del brillo neón alrededor del núcleo y contornos."
        />

        <SliderRow
          label="Opacidad del Disco Central"
          value={coreOpacity}
          min={0.2}
          max={1.0}
          step={0.02}
          display={`${Math.round(coreOpacity * 100)}%`}
          onChange={(v) => update({ dhonkioOpacity: v })}
          hint="Transparencia de la base central contra el fondo."
        />
      </Section>

      <Section title="Cinemática de Rotación">
        <SliderRow
          label="Velocidad de Giro"
          value={rotSpeed}
          min={0.0}
          max={3.0}
          step={0.05}
          display={`${rotSpeed.toFixed(2)}×`}
          onChange={(v) => update({ rotationSpeed: v })}
          hint="Acelera o frena la rotación angular del mándala."
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-white/90">Dirección de Rotación</span>
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => update({ rotationDirection: 'clockwise' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isClockwise
                  ? 'bg-cyan-500/25 border border-cyan-400/60 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Horario ↻
            </button>
            <button
              type="button"
              onClick={() => update({ rotationDirection: 'counter_clockwise' })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isClockwise
                  ? 'bg-cyan-500/25 border border-cyan-400/60 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Antihorario ↺
            </button>
          </div>
        </div>
      </Section>

      <Section title="Paleta de Color Neón" hint="Gama cromática de los contornos, shaders y partículas.">
        <div className="grid grid-cols-2 gap-2">
          {PALETTES.map((pal) => {
            const on = palette === pal.id;
            const [c0, c1] = colorsOf(pal.id);
            return (
              <button
                key={pal.id}
                type="button"
                aria-pressed={on}
                onClick={() => update({ sacredPalette: pal.id as never })}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 ${
                  on
                    ? 'bg-cyan-500/25 border-cyan-400/70 text-white font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <div className="min-w-0">
                  <span className="block text-xs font-bold leading-tight truncate">{pal.name}</span>
                  <span className="block text-[10px] text-white/50 truncate">{pal.desc}</span>
                </div>
                <div className="flex gap-1 shrink-0 p-1 rounded-md bg-black/40 border border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c0 }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c1 }} />
                </div>
              </button>
            );
          })}
        </div>

        <SwitchRow
          label="Dispersión Cromática Arcoíris"
          hint="Añade un desfase espectral prismático en los bordes iluminados."
          on={Boolean(s.isRainbowMode)}
          onChange={(val) => update({ isRainbowMode: val })}
        />
      </Section>

      <Section title="Aro Difuso & Halo de Cristal">
        <SwitchRow
          label="Modo Cristal Translúcido"
          hint="Aplica filtro esmerilado con resplandor suave en lugar de anillo sólido."
          on={isTransparentHalo}
          onChange={(val) => update({ transparentHalo: val })}
        />

        <SliderRow
          label="Diámetro del Halo"
          value={s.haloSize || 382}
          min={220}
          max={520}
          step={2}
          display={`${s.haloSize || 382} px`}
          onChange={(v) => update({ haloSize: Math.round(v) })}
          hint="Tamaño del resplandor difuso perimetral."
        />

        <SliderRow
          label="Resplandor de Sombra (Halo Glow)"
          value={s.bloomIntensity ?? 1}
          min={0.3}
          max={2.5}
          step={0.05}
          display={`${(s.bloomIntensity ?? 1).toFixed(2)}×`}
          onChange={(v) => update({ bloomIntensity: v })}
          hint="Intensidad lumínica de la sombra exterior."
        />
      </Section>

      {/* Logotipo Central */}
      <Section title="Logotipo & Arte Central" hint="Personaliza la imagen que vibra en el centro del mándala.">
        <div className="flex items-center gap-2 pt-1">
          <label className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-center text-xs font-semibold text-white/90 hover:text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95">
            <Upload className="w-3.5 h-3.5 text-cyan-300" />
            <span>Subir Imagen</span>
            <input type="file" accept="image/*" onChange={p.onUploadLogo} className="hidden" />
          </label>

          {Boolean(p.activeLogo.src) && (
            <>
              <button
                type="button"
                onClick={p.onEditLogo}
                className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={p.onRemoveLogo}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 cursor-pointer transition-all active:scale-95"
                title="Quitar logotipo personalizado"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </Section>
    </>
  );
};

/* ═══ 5. CAPAS PRO (VOID FX) ════════════════════════════════════════════════ */
const LayersTab: React.FC<RainbowCalibrationBodyProps> = (p) => {
  const s = usePlayerStore((st) => st.blobSettings);
  const full = p.proActiveCount >= p.proMax;

  return (
    <>
      <Section
        title="Capas Pro Apilables (Void FX)"
        hint={`Efectos cinemáticos que se dibujan encima del visualizador. Máximo ${p.proMax} simultáneos.`}
        action={
          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-bold tabular-nums whitespace-nowrap shadow-sm ${
              full
                ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                : p.proActiveCount > 0
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50'
                : 'bg-white/[0.06] text-white/50 border-white/10'
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
                className={`p-3 rounded-2xl border space-y-2 transition-all ${
                  on
                    ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_10px_rgba(0,229,255,0.15)]'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <SwitchRow
                  label={eff.name}
                  hint={eff.desc}
                  on={on}
                  onChange={() => p.onToggleEffect(eff.id)}
                />
                {on && (
                  <SliderRow
                    label="Ganancia de Efecto"
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
