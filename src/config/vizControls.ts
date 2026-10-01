/**
 * Esquema de controles y presets de los visualizadores (Rainbow Void queda fuera a propósito).
 *
 * Cada modo declara sus grupos de controles y sus presets. Todo se guarda en `blobSettings`
 * (mismo almacenamiento que ya usan los visualizadores). Un preset define TODOS los controles de
 * su modo, así que "¿qué preset está activo?" es una comparación exacta y, si ninguno coincide,
 * la interfaz muestra "Personalizado".
 */
import type { VisualizerMode } from '../types/audio';
import type { CameraPreset } from '../stores/playerStore.types';

export type VizValue = number | boolean | string;
export type VizSettings = Record<string, unknown>;

/** Contexto que el panel inyecta junto a los ajustes para evaluar `disabledReason` */
export interface VizContext extends VizSettings {
  mouseEffectsEnabled?: boolean;
  coarsePointer?: boolean;
}

const noCursor = (s: VizContext): string | null =>
  s.coarsePointer ? 'No disponible en pantallas táctiles' : s.mouseEffectsEnabled === false ? 'Los efectos de ratón están desactivados' : null;

interface ControlBase {
  key: string;
  /** Si está presente, el valor vive en el almacén del reproductor (no en blobSettings) bajo este binding del panel */
  store?: boolean;
  label: string;
  /** Explicación breve cuando el efecto no es evidente */
  hint?: string;
  /** Devuelve el motivo por el que el control no aplica con los ajustes actuales (o null si está activo) */
  disabledReason?: (s: VizContext) => string | null;
}

export interface RangeControl extends ControlBase {
  kind: 'range';
  min: number;
  max: number;
  step: number;
  def: number;
  unit?: 'x' | '%' | '';
}
export interface ToggleControl extends ControlBase {
  kind: 'toggle';
  def: boolean;
}
export interface ChoiceControl extends ControlBase {
  kind: 'choice';
  def: string;
  cols?: 2 | 3 | 4;
  /** Los valores son números (se guardan como número, no como texto) */
  numeric?: boolean;
  /** Miniatura dibujada: 'shape3d' (formas de la esfera), 'liquid' (contorno de la forma periférica) */
  thumbs?: 'shape3d' | 'liquid';
  /** Agrupa las opciones por familia (cada opción trae su `family`) */
  families?: { id: string; label: string }[];
  /** `glyph` es el id de una forma (octagon, hexagon, triangle, circle, star) que el panel dibuja como miniatura */
  options: { value: string; label: string; hint?: string; glyph?: string; family?: string }[];
}
/** Botón sin valor persistente: emite un evento de ventana que el visualizador escucha */
export interface ActionControl {
  kind: 'action';
  key: string;
  label: string;
  hint?: string;
  event: string;
}
/** Texto informativo que se adapta al dispositivo (ratón o táctil) */
export interface NoteControl {
  kind: 'note';
  key: string;
  label: string;
  fine: string;
  coarse: string;
}
/** Estado del seguimiento de manos/cuerpo: no compatible, requiere permiso o activo */
export interface TrackingControl {
  kind: 'tracking';
  key: string;
  label: string;
  hint?: string;
}
export type VizControl = RangeControl | ToggleControl | ChoiceControl | ActionControl | NoteControl | TrackingControl;

export interface VizGroup {
  id: string;
  title: string;
  controls: VizControl[];
}

export interface VizPreset {
  id: string;
  name: string;
  desc: string;
  values: Record<string, VizValue>;
  camera?: CameraPreset;
}

export interface CameraOption {
  id: CameraPreset;
  label: string;
  hint: string;
}

export interface VizModeSchema {
  mode: Exclude<VisualizerMode, 'blob'>;
  /** Evento global que usa «Centrar» del modo (si lo hay) */
  recenterEvent?: string;
  title: string;
  groups: VizGroup[];
  presets: VizPreset[];
  cameras?: CameraOption[];
  defaultCamera?: CameraPreset;
}

const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  def: number,
  hint?: string,
  unit: RangeControl['unit'] = 'x',
  disabledReason?: ControlBase['disabledReason']
): RangeControl => ({ kind: 'range', key, label, min, max, step, def, hint, unit, disabledReason });

const toggle = (
  key: string,
  label: string,
  def: boolean,
  hint?: string,
  disabledReason?: ControlBase['disabledReason']
): ToggleControl => ({ kind: 'toggle', key, label, def, hint, disabledReason });

// ── Synthwave ────────────────────────────────────────────────────────────────
const SYNTHWAVE: VizModeSchema = {
  mode: 'synthwave',
  title: 'Synthwave Grid',
  groups: [
    {
      id: 'route',
      title: 'Trayecto',
      controls: [
        range('synthwaveSpeed', 'Velocidad', 0.2, 3, 0.1, 1, 'Ritmo base de avance; la música lo acelera encima de este valor.'),
        range('synthwaveCurveIntensity', 'Curvas', 0, 2.5, 0.1, 1, 'Amplitud del balanceo en S de la carretera.'),
        range('synthwaveCursor', 'Respuesta al cursor', 0, 1, 0.05, 1, 'Cuánto mueven el ratón el horizonte y la curva. En táctil no se usa.', '%', noCursor),
      ],
    },
    {
      id: 'horizon',
      title: 'Horizonte',
      controls: [
        {
          kind: 'choice',
          key: 'synthwaveSunStyle',
          label: 'Estilo del sol',
          def: 'venetian',
          cols: 2,
          options: [
            { value: 'venetian', label: 'Veneciano', hint: 'Rendijas que bajan' },
            { value: 'corona', label: 'Corona', hint: 'Rayos con el espectro' },
            { value: 'wireframe', label: 'Esfera', hint: 'Orbe vectorial' },
            { value: 'eclipse', label: 'Eclipse', hint: 'Disco negro con halo' },
          ],
        },
        toggle('synthwaveMountains', 'Montañas', true, 'Cordillera que sigue al espectro.'),
        toggle('synthwaveCity', 'Ciudad', true, 'Siluetas de edificios en el horizonte.'),
        toggle('synthwavePalms', 'Palmeras', true, 'Palmeras de neón a los lados de la carretera.'),
      ],
    },
    {
      id: 'ambient',
      title: 'Ambiente',
      controls: [
        {
          kind: 'choice',
          key: 'synthwaveTheme',
          label: 'Paleta',
          def: 'outrun',
          cols: 2,
          options: [
            { value: 'outrun', label: 'Outrun' },
            { value: 'cyber', label: 'Cyber' },
            { value: 'vaporwave', label: 'Vaporwave' },
            { value: 'sunset_overdrive', label: 'Atardecer' },
          ],
        },
        range('synthwaveStars', 'Estrellas', 0, 1.5, 0.1, 1, 'Densidad del cielo estrellado.'),
        range('synthwaveParticles', 'Partículas de carretera', 0, 1.5, 0.1, 1, 'Chispas que cruzan el asfalto.'),
        range('synthwaveScanlines', 'Líneas de escaneo', 0, 0.5, 0.05, 0.25, 'Trama CRT sobre la escena. 0 la quita.', '%'),
      ],
    },
  ],
  presets: [
    {
      id: 'midnight_drive',
      name: 'Midnight Drive',
      desc: 'Avance moderado, curvas suaves y entorno contenido',
      values: {
        synthwaveTheme: 'outrun', synthwaveSunStyle: 'eclipse', synthwaveSpeed: 0.8, synthwaveCurveIntensity: 0.6,
        synthwaveCursor: 0.4, synthwaveMountains: true, synthwaveCity: true, synthwavePalms: false,
        synthwaveStars: 1, synthwaveParticles: 0.5, synthwaveScanlines: 0.15,
      },
    },
    {
      id: 'sunset_run',
      name: 'Sunset Run',
      desc: 'El sol manda, tonos cálidos',
      values: {
        synthwaveTheme: 'sunset_overdrive', synthwaveSunStyle: 'venetian', synthwaveSpeed: 1, synthwaveCurveIntensity: 1,
        synthwaveCursor: 0.6, synthwaveMountains: true, synthwaveCity: true, synthwavePalms: true,
        synthwaveStars: 0.5, synthwaveParticles: 0.8, synthwaveScanlines: 0.2,
      },
    },
    {
      id: 'neon_sprint',
      name: 'Neon Sprint',
      desc: 'Más energía y partículas, con límites',
      values: {
        synthwaveTheme: 'outrun', synthwaveSunStyle: 'corona', synthwaveSpeed: 1.8, synthwaveCurveIntensity: 1.6,
        synthwaveCursor: 1, synthwaveMountains: true, synthwaveCity: false, synthwavePalms: true,
        synthwaveStars: 1, synthwaveParticles: 1.5, synthwaveScanlines: 0.25,
      },
    },
  ],
};

// ── Terrain ──────────────────────────────────────────────────────────────────
const TERRAIN: VizModeSchema = {
  mode: 'terrain',
  title: 'Cyber Terrain',
  cameras: [
    { id: 'front', label: 'Frontal', hint: 'Vista clásica hacia el horizonte' },
    { id: 'driver', label: 'Cockpit', hint: 'A ras de suelo, sobre la autopista' },
    { id: 'drone', label: 'Dron', hint: 'Vuelo bajo entre las crestas' },
    { id: 'orbit', label: 'Órbita', hint: 'Giro lento alrededor del valle' },
    { id: 'top', label: 'Cenital', hint: 'Vista de pájaro, estudio topográfico' },
  ],
  defaultCamera: 'front',
  groups: [
    {
      id: 'material',
      title: 'Material',
      controls: [
        {
          kind: 'choice',
          key: 'terrainStyle',
          label: 'Estilo de malla',
          def: 'wireframe',
          cols: 2,
          options: [
            { value: 'wireframe', label: 'Líneas', hint: 'Rejilla vectorial' },
            { value: 'dual_mesh', label: 'Dual', hint: 'Relleno tenue + líneas' },
            { value: 'surface', label: 'Superficie', hint: 'Sólido con luz de relieve' },
            { value: 'points', label: 'Puntos', hint: 'Nube topográfica' },
          ],
        },
      ],
    },
    {
      id: 'terrain',
      title: 'Terreno',
      controls: [
        range('terrainElevation', 'Altura', 0.2, 2.5, 0.1, 1, 'Escala vertical de montañas y valle.'),
        range('terrainReactivity', 'Respuesta musical', 0, 2, 0.1, 1, 'Cuánto crecen las crestas con graves y medios. 0 = relieve fijo.'),
        range('terrainRoughness', 'Rugosidad', 0.2, 2.5, 0.1, 1, 'Frecuencia del detalle: bajo = colinas suaves, alto = terreno quebrado.'),
        range('terrainSpeed', 'Velocidad de avance', 0.2, 3, 0.1, 1, 'Ritmo al que el terreno viene hacia la cámara.'),
      ],
    },
    {
      id: 'horizon',
      title: 'Horizonte',
      controls: [
        {
          kind: 'choice',
          key: 'terrainSunStyle',
          label: 'Sol',
          def: 'classic',
          cols: 2,
          options: [
            { value: 'classic', label: 'Disco' },
            { value: 'corona', label: 'Corona' },
            { value: 'grid_orb', label: 'Orbe' },
            { value: 'none', label: 'Sin sol' },
          ],
        },
      ],
    },
  ],
  presets: [
    {
      id: 'neon_valley',
      name: 'Neon Valley',
      desc: 'Rejilla y vista frontal',
      camera: 'front',
      values: {
        terrainStyle: 'wireframe', terrainElevation: 1, terrainReactivity: 1, terrainRoughness: 1, terrainSpeed: 1,
        terrainSunStyle: 'classic',
      },
    },
    {
      id: 'low_flight',
      name: 'Low Flight',
      desc: 'Cámara cockpit y relieve moderado',
      camera: 'driver',
      values: {
        terrainStyle: 'dual_mesh', terrainElevation: 0.7, terrainReactivity: 0.8, terrainRoughness: 1.2, terrainSpeed: 1.6,
        terrainSunStyle: 'corona',
      },
    },
    {
      id: 'topographic_study',
      name: 'Topographic Study',
      desc: 'Vista cenital y movimiento contenido',
      camera: 'top',
      values: {
        terrainStyle: 'points', terrainElevation: 0.6, terrainReactivity: 0.6, terrainRoughness: 0.8, terrainSpeed: 0.5,
        terrainSunStyle: 'none',
      },
    },
  ],
};

export const VIZ_SCHEMAS: Partial<Record<VisualizerMode, VizModeSchema>> = {
  synthwave: SYNTHWAVE,
  terrain: TERRAIN,
};

export function getVizSchema(mode: VisualizerMode): VizModeSchema | null {
  return VIZ_SCHEMAS[mode] ?? null;
}

/** Controles con valor persistente (sin las acciones) */
export function valueControls(schema: VizModeSchema): (RangeControl | ToggleControl | ChoiceControl)[] {
  return schema.groups
    .flatMap((g) => g.controls)
    .filter((c): c is RangeControl | ToggleControl | ChoiceControl => c.kind === 'range' || c.kind === 'toggle' || c.kind === 'choice');
}

/** Valores por defecto de todos los controles del modo */
export function schemaDefaults(schema: VizModeSchema): Record<string, VizValue> {
  const out: Record<string, VizValue> = {};
  for (const c of valueControls(schema)) out[c.key] = c.def;
  return out;
}

/** Valor efectivo de un control: lo guardado o, si no hay, el de por defecto */
export function effectiveValue(control: RangeControl | ToggleControl | ChoiceControl, settings: VizSettings): VizValue {
  const raw = settings[control.key];
  return raw === undefined || raw === null ? control.def : (raw as VizValue);
}

const sameValue = (a: VizValue, b: VizValue) =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b;

/** Preset cuyos valores (y cámara, si la define) coinciden exactamente con los ajustes actuales; null = «Personalizado» */
export function matchPreset(schema: VizModeSchema, settings: VizSettings, camera?: CameraPreset): VizPreset | null {
  for (const p of schema.presets) {
    if (p.camera && camera && p.camera !== camera) continue;
    const full = { ...schemaDefaults(schema), ...p.values };
    const ok = valueControls(schema).every((c) => sameValue(effectiveValue(c, settings), full[c.key]));
    if (ok) return p;
  }
  return null;
}

/** Ajustes a escribir al aplicar un preset (completos, para que no queden restos de otro preset) */
export function presetSettings(schema: VizModeSchema, preset: VizPreset): Record<string, VizValue> {
  return { ...schemaDefaults(schema), ...preset.values };
}

/** Un valor se sale del rango declarado (por ajustes antiguos o manipulados) */
export function clampToControl(control: RangeControl, value: number): number {
  return Math.min(control.max, Math.max(control.min, value));
}
