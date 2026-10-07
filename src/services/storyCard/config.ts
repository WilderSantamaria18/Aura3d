/**
 * Modelo de la tarjeta social (historia de Instagram, post, cuadrado).
 * Todo el modelo, los valores por defecto, el saneado de lo guardado y la resolución del contenido
 * viven aquí como funciones puras, para que la vista previa y la exportación usen exactamente lo mismo.
 */

export type CardFormat = 'story' | 'post' | 'square';
export type CardTemplate = 'pure_void' | 'aesthetic' | 'studio' | 'vinyl' | 'liquid_glass';
export type CardFontId = 'sans' | 'serif' | 'mono' | 'display';
export type CardLayout = 'center' | 'left';
export type CardArtSource = 'visualizer' | 'cover';
export type CardProfileStyle = 'badge' | 'signature';
export type CardFileFormat = 'png' | 'jpeg';

export interface CardFormatSpec {
  label: string;
  ratio: string;
  width: number;
  height: number;
  /** Instagram tapa la cabecera y el campo de respuesta en las historias: solo ahí hay zona de riesgo */
  hasStoryChrome: boolean;
}

export const CARD_FORMATS: Record<CardFormat, CardFormatSpec> = {
  story: { label: 'Historia', ratio: '9:16', width: 1080, height: 1920, hasStoryChrome: true },
  post: { label: 'Post', ratio: '4:5', width: 1080, height: 1350, hasStoryChrome: false },
  square: { label: 'Cuadrado', ratio: '1:1', width: 1080, height: 1080, hasStoryChrome: false },
};

export const CARD_TEMPLATES: { id: CardTemplate; label: string; hint: string }[] = [
  { id: 'pure_void', label: 'Void', hint: 'Aura central sobre vacío' },
  { id: 'aesthetic', label: 'Aesthetic', hint: 'Degradado suave y cristal' },
  { id: 'studio', label: 'Studio', hint: 'Panel técnico de estudio' },
  { id: 'vinyl', label: 'Vinyl', hint: 'Disco analógico' },
  { id: 'liquid_glass', label: 'Liquid Glass', hint: 'Cápsula visionOS espacial' },
];

export interface CardFontSpec {
  label: string;
  /** Pila CSS de la fuente (la primera ya la carga index.html) */
  family: string;
  /** Familia y pesos a precargar antes de dibujar: el canvas no espera a las fuentes web */
  loadFamily: string;
}

export const CARD_FONTS: Record<CardFontId, CardFontSpec> = {
  sans: { label: 'Moderna', family: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', loadFamily: 'Inter' },
  serif: { label: 'Editorial', family: '"Playfair Display", Georgia, "Times New Roman", serif', loadFamily: 'Playfair Display' },
  mono: { label: 'Técnica', family: '"JetBrains Mono", ui-monospace, Consolas, monospace', loadFamily: 'JetBrains Mono' },
  display: { label: 'Display', family: 'Syne, Inter, system-ui, sans-serif', loadFamily: 'Syne' },
};

export interface CardPalette {
  id: string;
  name: string;
  background: string;
  primary: string;
  secondary: string;
  text: string;
}

export const CARD_PALETTES: CardPalette[] = [
  { id: 'aura', name: 'Aura', background: '#07070d', primary: '#8b5cf6', secondary: '#38bdf8', text: '#f8fafc' },
  { id: 'neon', name: 'Neón', background: '#05060f', primary: '#ff3df2', secondary: '#22d3ee', text: '#ffffff' },
  { id: 'sunset', name: 'Atardecer', background: '#120a0b', primary: '#fb923c', secondary: '#f43f5e', text: '#fff7ed' },
  { id: 'emerald', name: 'Esmeralda', background: '#04100b', primary: '#34d399', secondary: '#22d3ee', text: '#ecfdf5' },
  { id: 'rose', name: 'Rosa', background: '#12080e', primary: '#fb7185', secondary: '#c084fc', text: '#fff1f2' },
  { id: 'ice', name: 'Hielo', background: '#060b14', primary: '#7dd3fc', secondary: '#a5b4fc', text: '#f0f9ff' },
  { id: 'gold', name: 'Oro', background: '#0d0a05', primary: '#fbbf24', secondary: '#f59e0b', text: '#fffbeb' },
  { id: 'mono', name: 'Mono', background: '#050505', primary: '#ffffff', secondary: '#a1a1aa', text: '#ffffff' },
];

export interface CardProfile {
  show: boolean;
  /** Usuario de Instagram sin la arroba (se sanea al guardar y al dibujar) */
  handle: string;
  /** Foto de perfil como data URL cuadrada y pequeña; null = inicial sobre degradado */
  avatar: string | null;
  style: CardProfileStyle;
}

export interface CardElements {
  /** Marca "AURA3D" en la cabecera */
  logo: boolean;
  /** BPM y tono (solo si se conocen: nunca se inventan) */
  metadata: boolean;
  date: boolean;
}

export interface CardConfig {
  format: CardFormat;
  template: CardTemplate;
  layout: CardLayout;
  font: CardFontId;
  artSource: CardArtSource;
  /** true: título y artista siguen a la canción que suena; false: se usan los escritos a mano */
  /** PNG: sin pérdida (más pesado). JPEG: mucho más ligero, el formato habitual de Instagram */
  fileFormat: CardFileFormat;
  autoText: boolean;
  caption: string;
  title: string;
  artist: string;
  paletteId: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  /** 0..1: halo alrededor de la imagen principal */
  bloom: number;
  /** 0..0.4: grano de película */
  grain: number;
  /** 0..1: oscurecimiento de bordes */
  vignette: number;
  elements: CardElements;
  profile: CardProfile;
}

export const DEFAULT_CARD_CONFIG: CardConfig = {
  format: 'story',
  template: 'pure_void',
  layout: 'center',
  font: 'sans',
  artSource: 'visualizer',
  fileFormat: 'png',
  autoText: true,
  caption: 'AHORA SUENA',
  title: 'Aura3D Soundscape',
  artist: 'Aura Spatial Audio',
  paletteId: 'aura',
  backgroundColor: '#07070d',
  primaryColor: '#8b5cf6',
  secondaryColor: '#38bdf8',
  textColor: '#f8fafc',
  bloom: 0.6,
  grain: 0.08,
  vignette: 0.45,
  elements: { logo: true, metadata: true, date: false },
  profile: { show: false, handle: '', avatar: null, style: 'badge' },
};

// ── Saneado ─────────────────────────────────────────────────────────────────

/** Alias de versiones anteriores del editor (guardaban 'pure-void' con guion) */
const TEMPLATE_ALIASES: Record<string, CardTemplate> = {
  pure_void: 'pure_void',
  'pure-void': 'pure_void',
  aesthetic: 'aesthetic',
  studio: 'studio',
  vinyl: 'vinyl',
  liquid_glass: 'liquid_glass',
  'liquid-glass': 'liquid_glass',
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_AVATAR_CHARS = 400_000;

export const MAX_HANDLE = 30;

/** Un usuario de Instagram: letras, números, punto y guion bajo; hasta 30 caracteres; sin arroba */
export function sanitizeHandle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, MAX_HANDLE);
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

const color = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX.test(v) ? v : fallback);

const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

const text = (v: unknown, max: number, fallback: string): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : fallback;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/**
 * Convierte lo leído del almacenamiento (o de una versión anterior) en una configuración válida.
 * Nunca lanza: cualquier campo inválido vuelve a su valor por defecto.
 */
export function sanitizeCardConfig(raw: unknown, base: CardConfig = DEFAULT_CARD_CONFIG): CardConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const el = (r.elements && typeof r.elements === 'object' ? r.elements : {}) as Record<string, unknown>;
  const pr = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;

  const avatar =
    typeof pr.avatar === 'string' && pr.avatar.startsWith('data:image/') && pr.avatar.length <= MAX_AVATAR_CHARS
      ? pr.avatar
      : null;

  return {
    format: oneOf(r.format, ['story', 'post', 'square'] as const, base.format),
    template: typeof r.template === 'string' ? (TEMPLATE_ALIASES[r.template] ?? base.template) : base.template,
    layout: oneOf(r.layout, ['center', 'left'] as const, base.layout),
    font: oneOf(r.font, ['sans', 'serif', 'mono', 'display'] as const, base.font),
    artSource: oneOf(r.artSource, ['visualizer', 'cover'] as const, base.artSource),
    fileFormat: oneOf(r.fileFormat, ['png', 'jpeg'] as const, base.fileFormat),
    autoText: bool(r.autoText, base.autoText),
    caption: text(r.caption, 32, base.caption),
    title: text(r.title, 80, base.title),
    artist: text(r.artist, 60, base.artist),
    paletteId: text(r.paletteId, 24, base.paletteId) || base.paletteId,
    backgroundColor: color(r.backgroundColor, base.backgroundColor),
    primaryColor: color(r.primaryColor, base.primaryColor),
    secondaryColor: color(r.secondaryColor, base.secondaryColor),
    textColor: color(r.textColor, base.textColor),
    bloom: num(r.bloom, 0, 1, base.bloom),
    grain: num(r.grain, 0, 0.4, base.grain),
    vignette: num(r.vignette, 0, 1, base.vignette),
    elements: {
      logo: bool(el.logo, base.elements.logo),
      metadata: bool(el.metadata, base.elements.metadata),
      date: bool(el.date, base.elements.date),
    },
    profile: {
      show: bool(pr.show, base.profile.show),
      handle: sanitizeHandle(pr.handle),
      avatar,
      style: oneOf(pr.style, ['badge', 'signature'] as const, base.profile.style),
    },
  };
}

// ── Contenido ───────────────────────────────────────────────────────────────

export interface CardTrackInput {
  title?: string;
  artist?: string;
  coverUrl?: string;
  bpm?: number;
  camelotKey?: string;
}

export interface ResolvedCardContent {
  caption: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  /** null = no se conoce: no se dibuja (antes se mostraba siempre "128 BPM") */
  bpm: number | null;
  key: string | null;
  dateLabel: string;
  /** Sin arroba; '' si no hay usuario o el perfil está oculto */
  handle: string;
}

const FALLBACK_TITLE = 'Aura3D Soundscape';
const FALLBACK_ARTIST = 'Aura Spatial Audio';

export function formatCardDate(now: Date): string {
  return now
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .toUpperCase();
}

/**
 * Qué texto y datos lleva la tarjeta. Con `autoText` manda la canción que suena; el BPM y el tono
 * solo aparecen si de verdad se conocen.
 */
export function resolveCardContent(
  config: CardConfig,
  track: CardTrackInput | null,
  liveBpm = 0,
  now: Date = new Date()
): ResolvedCardContent {
  const follow = config.autoText && !!track?.title;
  const bpmRaw = track?.bpm && track.bpm > 0 ? track.bpm : liveBpm;

  return {
    caption: config.caption.trim(),
    title: follow ? track!.title! : config.title.trim() || track?.title || FALLBACK_TITLE,
    artist: follow ? track?.artist?.trim() || FALLBACK_ARTIST : config.artist.trim() || track?.artist || FALLBACK_ARTIST,
    coverUrl: track?.coverUrl || null,
    bpm: bpmRaw && bpmRaw > 0 ? Math.round(bpmRaw) : null,
    key: track?.camelotKey || null,
    dateLabel: formatCardDate(now),
    handle: config.profile.show ? sanitizeHandle(config.profile.handle) : '',
  };
}

/** ¿Cabe inventar el usuario a partir del perfil de Aura? Los invitados no tienen un usuario real. */
export function suggestHandle(username: string | undefined, isGuest: boolean | undefined): string {
  if (!username || isGuest) return '';
  return sanitizeHandle(username.replace(/\s+/g, '_').toLowerCase());
}

// ── Color ───────────────────────────────────────────────────────────────────

/**
 * Color de texto legible sobre un fondo (blanco sobre oscuro, casi negro sobre claro), por
 * luminancia relativa. Se usa cuando el usuario elige un fondo personalizado.
 */
export function readableTextColor(background: string): string {
  const hex = HEX.test(background) ? background.replace('#', '') : '000000';
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return luminance > 0.4 ? '#0b0b10' : '#ffffff';
}
