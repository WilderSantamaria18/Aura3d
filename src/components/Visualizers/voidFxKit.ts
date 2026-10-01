/**
 * Utilidades compartidas de los efectos 2D de Rainbow Void: tipos del fotograma, color, envolvente del
 * contorno y pintado según el acabado (neón / cristal / tinta). Las formas viven en voidEffects.ts
 * (mándala, lóbulos) y voidForms.ts (formas dibujadas a medida).
 */

import type { VoidFxParams } from '../../types/audio';

export type { VoidFxParams };

export interface VoidFxFrame {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  /** Radio del disco central en px (ya escalado por u y por el rebote de bajos) */
  r: number;
  /** Factor de escala responsivo (solo para grosores mínimos) */
  u: number;
  /** Tiempo en segundos */
  t: number;
  bass: number;
  mids: number;
  treble: number;
  energy: number;
  /** Envolvente del kick: sube al golpear y decae (0..1) */
  kickStrength: number;
  /** Fuerza del golpe en el frame en que se detecta (0 si no hay kick) */
  boom: number;
  /** Hay señal de audio real */
  active: boolean;
  /** Energía de las 12 notas (0 = Do … 11 = Si), 0..1 */
  chroma: Float32Array;
  /** Espectro crudo (0..255) */
  raw: Uint8Array;
  primary: string;
  secondary: string;
  accent: string;
  /** Rotación acumulada en grados (velocidad y sentido elegidos por el usuario) */
  angleDeg: number;
  /** Multiplicador de grosor de trazo (0.75 – 1.5) */
  stroke: number;
  fx: VoidFxParams;
}

export interface VoidFxState {
  /** Ondas activas. El radio se captura al detectar el golpe para que la onda no herede el rebote posterior del núcleo. */
  booms: Array<{ born: number; s: number; r: number }>;
  lastIdle: number;
  /** Estado de la forma del bombo: envolvente suavizada y rebote del golpe */
  form: { env: number; pop: number; last: number };
  /** Niveles del espectro con ataque rápido, caída lenta y pico retenido (se reutilizan los arrays) */
  bars: { lvl: Float32Array; peak: Float32Array; hold: Float32Array };
  /** Semilla y último instante de regeneración de los arcos de Electro */
  electro: { seed: number; last: number };
  /** Enjambre de partículas (se inicializa la primera vez) */
  particles: {
    init: boolean;
    ang: Float32Array;
    rho: Float32Array;
    spd: Float32Array;
    size: Float32Array;
    phase: Float32Array;
    layer: Uint8Array;
    push: number;
  };
  /** Barrido del radar y brillo de los destellos de cada nota */
  radar: { sweep: number; blip: Float32Array };
  /** Anillos del Túnel: nacimiento, fuerza y «foto» del espectro de cada uno */
  tunnel: { born: Float32Array; str: Float32Array; snap: Float32Array; next: number; cursor: number };
  /** Reloj que recorre los patrones del Espirógrafo */
  spiro: { clock: number };
}

export const TUNNEL_RINGS = 8;
export const TUNNEL_SNAP = 24;

export const MAX_BARS = 160;
export const MAX_PARTICLES = 480;

export const createVoidFxState = (): VoidFxState => ({
  booms: [],
  lastIdle: 0,
  form: { env: 0, pop: 0, last: 0 },
  bars: { lvl: new Float32Array(MAX_BARS), peak: new Float32Array(MAX_BARS), hold: new Float32Array(MAX_BARS) },
  electro: { seed: 1, last: 0 },
  particles: {
    init: false,
    ang: new Float32Array(MAX_PARTICLES),
    rho: new Float32Array(MAX_PARTICLES),
    spd: new Float32Array(MAX_PARTICLES),
    size: new Float32Array(MAX_PARTICLES),
    phase: new Float32Array(MAX_PARTICLES),
    layer: new Uint8Array(MAX_PARTICLES),
    push: 0,
  },
  radar: { sweep: 0, blip: new Float32Array(12) },
  tunnel: {
    born: new Float32Array(TUNNEL_RINGS),
    str: new Float32Array(TUNNEL_RINGS),
    snap: new Float32Array(TUNNEL_RINGS * TUNNEL_SNAP),
    next: 0,
    cursor: 0,
  },
  spiro: { clock: 0 },
});

export type Tip = { x: number; y: number };

export const TAU = Math.PI * 2;
/** Ángulo «hacia arriba» en coordenadas de canvas */
export const UP = -Math.PI / 2;

/* ── utilidades de color ─────────────────────────────────────────────────── */
export type RGB = [number, number, number];
export const parseColor = (c: string): RGB => {
  const m = c.trim();
  if (m.startsWith('#')) {
    const h = m.length === 4 ? m.slice(1).split('').map((x) => x + x).join('') : m.slice(1, 7);
    const n = parseInt(h, 16);
    if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = m.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
  return [255, 255, 255];
};
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
export const hsl = (h: number, s: number, l: number): RGB => {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

/** Color en la posición x (0..1) según el modo elegido. */
export const colAt = (f: VoidFxFrame, x: number): RGB => {
  const p = parseColor(f.primary);
  if (f.fx.colorMode === 'mono') return p;
  if (f.fx.colorMode === 'spectrum') return hsl(170 + Math.max(0, Math.min(1, x)) * 150, 0.85, 0.62);
  return mixRGB(p, parseColor(f.secondary), Math.max(0, Math.min(1, x)));
};
export const noteColor = (f: VoidFxFrame, pc: number): RGB => colAt(f, pc / 11);

export const line = (f: VoidFxFrame, w = 1) => Math.max(0.8, w * f.stroke * f.u);
export const blur = (f: VoidFxFrame, base: number) => Math.max(0, base * f.fx.glow);
export const spec = (f: VoidFxFrame, idx: number, gamma = 1.1) => {
  const b = f.raw[Math.max(0, Math.min(f.raw.length - 1, idx))] || 0;
  return Math.pow(Math.min(1.5, (b / 185) * f.fx.intensity), gamma);
};
export const drive = (f: VoidFxFrame, v: number) => Math.min(1.6, v * f.fx.intensity);

/* ── matemática auxiliar ─────────────────────────────────────────────────── */
export const wrapPi = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
export const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
/** Hash estable 0..1 a partir de un índice: variación «aleatoria» que no parpadea entre frames */
export const hash01 = (i: number, salt = 0) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** PRNG pequeño y determinista (mulberry32): mismo seed → misma secuencia */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ── envolvente del contorno (compartida por todas las formas) ───────────── */
export interface FormEnvelope {
  env: number;
  pop: number;
  /** Factor de vida: 0.22 en reposo, crece con el bajo y el golpe */
  life: number;
  /** Altura de referencia en px */
  H: number;
  /** Radio base del contorno en px (justo fuera del disco) */
  rb: number;
  dt: number;
}

/**
 * Envolvente: sube rápido con el bajo, baja despacio; el golpe añade un rebote.
 * Sin música queda en reposo: no hay movimiento propio.
 */
export function updateEnvelope(f: VoidFxFrame, state: VoidFxState): FormEnvelope {
  const form = state.form;
  const dt = Math.max(0, Math.min(0.06, f.t - form.last));
  form.last = f.t;

  // Reactividad plena a los transitorios de bombo y bajo
  const target = f.active ? drive(f, f.bass * 1.05) + f.kickStrength * 0.70 : 0;
  const rate = target > form.env ? 34 : 5.2;
  form.env += (target - form.env) * (1 - Math.exp(-dt * rate));
  if (f.boom > 0) form.pop = Math.max(form.pop, f.boom);
  form.pop *= Math.exp(-dt * 6.5);

  const life = 0.24 + Math.min(1.4, form.env) * 0.95 + form.pop * 0.40;
  return {
    env: form.env,
    pop: form.pop,
    life,
    H: f.r * f.fx.formScale * Math.sqrt(f.fx.reach) * life,
    rb: f.r * (1.03 + f.kickStrength * 0.04),
    dt,
  };
}

/**
 * Pinta el trazado actual según el acabado elegido (neón, cristal o tinta).
 * `fill` 0 → solo contorno (trazos abiertos). Restablece la sombra al terminar.
 */
export function paintPath(
  f: VoidFxFrame,
  color: RGB,
  opts: { fill?: number; stroke?: number; width?: number; glow?: number; closed?: boolean }
) {
  const { ctx } = f;
  const fill = opts.fill ?? 0;
  const strokeA = opts.stroke ?? 0.9;
  const width = line(f, opts.width ?? 1.2);
  const glow = blur(f, opts.glow ?? 6);
  const style = f.fx.formStyle;

  if (style === 'ink') {
    if (fill > 0) {
      ctx.fillStyle = rgba(color, Math.min(0.94, 0.5 + fill));
      ctx.fill();
    }
    ctx.strokeStyle = fill > 0 ? rgba([6, 8, 18], 0.55) : rgba(color, strokeA);
    ctx.lineWidth = width;
    ctx.stroke();
  } else if (style === 'glass') {
    if (fill > 0) {
      ctx.fillStyle = rgba(color, fill * 0.75);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(mixRGB(color, [255, 255, 255], 0.5), strokeA * 0.75);
    ctx.lineWidth = width * 0.85;
    ctx.shadowColor = rgba(color, 0.8);
    ctx.shadowBlur = glow * 0.5;
    ctx.stroke();
  } else {
    if (fill > 0) {
      ctx.fillStyle = rgba(color, fill * 0.6);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(color, strokeA);
    ctx.lineWidth = width;
    ctx.shadowColor = rgba(color, 1);
    ctx.shadowBlur = glow;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

/* ── espectro con dinámica de visualizador ───────────────────────────────── */

/**
 * Nivel 0..~1.25 de un bin del analizador. Los bytes vienen en dB (muy comprimidos): se quita el suelo
 * y se eleva a una potencia para que los picos destaquen sobre el fondo, como en un ecualizador real.
 */
export const level = (f: VoidFxFrame, idx: number) => {
  const b = f.raw[Math.max(0, Math.min(f.raw.length - 1, idx))] || 0;
  return Math.min(1.35, Math.pow(Math.max(0, (b - 18) / 145), 1.1) * f.fx.intensity);
};

/**
 * Actualiza `n` niveles repartidos en escala logarítmica (graves en el índice 0). Ataque casi instantáneo,
 * caída lenta y pico que se retiene ~0.3 s antes de bajar: el movimiento característico de un ecualizador.
 */
export function updateBars(f: VoidFxFrame, state: VoidFxState, n: number, dt: number) {
  const { lvl, peak, hold } = state.bars;
  const count = Math.min(n, MAX_BARS);
  const maxBin = Math.max(8, Math.min(420, Math.floor(f.raw.length * 0.6)));
  for (let i = 0; i < count; i++) {
    const idx = 2 + Math.floor(Math.pow(i / Math.max(1, count - 1), 1.7) * maxBin);
    const v = f.active ? level(f, idx) : 0;
    lvl[i] += (v - lvl[i]) * (1 - Math.exp(-dt * (v > lvl[i] ? 42 : 7)));
    if (lvl[i] >= peak[i]) {
      peak[i] = lvl[i];
      hold[i] = 0.3;
    } else {
      hold[i] -= dt;
      if (hold[i] <= 0) peak[i] = Math.max(lvl[i], peak[i] - dt * 0.9);
    }
  }
  return state.bars;
}

/**
 * Cómo pinta cada acabado las formas «profesionales»: neón = brillo aditivo, cristal = más tenue y claro,
 * tinta = sólido sin brillo. `glow` 0 desactiva las pasadas de resplandor (que son las caras).
 */
export function finish(f: VoidFxFrame) {
  const style = f.fx.formStyle;
  if (style === 'ink') return { glow: 0, alpha: 1, white: 0, add: false };
  if (style === 'glass') return { glow: 0.55 * f.fx.glow, alpha: 0.8, white: 0.35, add: true };
  return { glow: f.fx.glow, alpha: 1, white: 0, add: true };
}

/** Reparte el rango de ángulos de un lado en grupos de color para pintar muchos elementos en pocos trazos */
export const COLOR_BUCKETS = 8;

/* ── utilidades de dibujo compartidas por las formas ─────────────────────── */
export const WHITE: RGB = [255, 255, 255];
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Traza el camino actual con una pasada ancha aditiva (resplandor) y otra nítida encima. */
export function strokeGlow(f: VoidFxFrame, color: RGB, alpha: number, width: number, glowWidth = 3.2) {
  const { ctx } = f;
  const fin = finish(f);
  if (fin.glow > 0.01) {
    ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
    ctx.strokeStyle = rgba(color, alpha * 0.17 * fin.glow);
    ctx.lineWidth = width * glowWidth;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(mixRGB(color, WHITE, fin.white), alpha * fin.alpha);
  ctx.lineWidth = width;
  ctx.stroke();
}
