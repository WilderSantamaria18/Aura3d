/**
 * Efectos 2D de Rainbow Void.
 *
 * Idea común a todos:
 *   · INNER  — capas luminosas dentro del borde del disco (bisel interior).
 *   · BOOM   — cada golpe de bombo lanza una onda; su tamaño depende de la fuerza.
 *   · NOTAS  — las 12 notas musicales dirigen las formas y los colores.
 *
 * Todas las medidas son fracciones del radio del disco (`r`), así que el conjunto
 * escala en proporción al tamaño del núcleo y a su rebote con el bajo.
 *
 * Personalización (VoidFxParams): intensidad, alcance, brillo, cantidad de
 * elementos, capas internas, boom y modo de color.
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
  booms: Array<{ born: number; s: number }>;
  lastIdle: number;
  /** Estado de la forma del bombo: envolvente suavizada y rebote del golpe */
  form: { env: number; pop: number; last: number };
}

export const createVoidFxState = (): VoidFxState => ({ booms: [], lastIdle: 0, form: { env: 0, pop: 0, last: 0 } });

export type Tip = { x: number; y: number };

const TAU = Math.PI * 2;

/* ── utilidades de color ─────────────────────────────────────────────────── */
type RGB = [number, number, number];
const parseColor = (c: string): RGB => {
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
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const hsl = (h: number, s: number, l: number): RGB => {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

/** Color en la posición x (0..1) según el modo elegido. */
const colAt = (f: VoidFxFrame, x: number): RGB => {
  const p = parseColor(f.primary);
  if (f.fx.colorMode === 'mono') return p;
  if (f.fx.colorMode === 'spectrum') return hsl(170 + Math.max(0, Math.min(1, x)) * 150, 0.85, 0.62);
  return mixRGB(p, parseColor(f.secondary), Math.max(0, Math.min(1, x)));
};
const noteColor = (f: VoidFxFrame, pc: number): RGB => colAt(f, pc / 11);

const line = (f: VoidFxFrame, w = 1) => Math.max(0.8, w * f.stroke * f.u);
const blur = (f: VoidFxFrame, base: number) => Math.max(0, base * f.fx.glow);
const spec = (f: VoidFxFrame, idx: number, gamma = 1.3) => Math.pow(Math.min(1.4, ((f.raw[Math.max(0, Math.min(f.raw.length - 1, idx))] || 0) / 255) * f.fx.intensity), gamma);
const drive = (f: VoidFxFrame, v: number) => Math.min(1.6, v * f.fx.intensity);

/* ──────────────────────────────────────────────────────────────────────────
   INNER — bisel luminoso dentro del borde del disco
   ────────────────────────────────────────────────────────────────────────── */
function drawInner(f: VoidFxFrame) {
  if (!f.fx.inner) return;
  const { ctx, cx, cy, r } = f;
  const p = parseColor(f.primary);
  const s = parseColor(f.secondary);
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
  glow.addColorStop(0, rgba(p, 0));
  glow.addColorStop(0.75, rgba(p, (0.03 + f.bass * 0.06) * f.fx.glow));
  glow.addColorStop(1, rgba(p, (0.12 + f.bass * 0.22 + f.kickStrength * 0.3) * f.fx.glow));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();

  ctx.lineWidth = line(f, 1.1);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.94, 0, TAU);
  ctx.strokeStyle = rgba(p, 0.32 + f.bass * 0.4);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, TAU);
  ctx.strokeStyle = rgba(s, 0.16 + f.mids * 0.3);
  ctx.stroke();
  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────────────
   BOOM — onda expansiva proporcional a la fuerza del bombo
   ────────────────────────────────────────────────────────────────────────── */
function drawBoom(f: VoidFxFrame, state: VoidFxState) {
  const { ctx, cx, cy, r, t } = f;
  if (!f.fx.boom) {
    state.booms.length = 0;
    return;
  }
  if (f.boom > 0) {
    state.booms.push({ born: t, s: f.boom });
    if (state.booms.length > 4) state.booms.shift();
  }

  const p = parseColor(f.primary);
  const s = parseColor(f.secondary);
  ctx.save();
  state.booms = state.booms.filter((b) => t - b.born < 1.6);
  for (const b of state.booms) {
    const life = 0.8 + b.s * 0.7;
    const k = (t - b.born) / life;
    if (k >= 1) continue;
    const ease = 1 - Math.pow(1 - k, 3);
    const rad = r * (1.04 + ease * (0.7 + b.s * 1.7) * f.fx.reach);
    const alpha = Math.pow(1 - k, 1.5) * (0.3 + b.s * 0.55);

    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, TAU);
    ctx.strokeStyle = rgba(s, alpha * 0.35 * f.fx.glow);
    ctx.lineWidth = Math.max(2, r * 0.09 * (1 - k)) * f.stroke;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, TAU);
    ctx.strokeStyle = rgba(p, alpha);
    ctx.lineWidth = line(f, 1.4) * (1.2 - k * 0.6);
    ctx.stroke();
  }

  if (f.kickStrength > 0.02) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.005, 0, TAU);
    ctx.strokeStyle = rgba([255, 255, 255], f.kickStrength * 0.75);
    ctx.lineWidth = line(f, 1.2) + r * 0.02 * f.kickStrength;
    ctx.stroke();
  }
  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────────────
   3 · MÁNDALA SAGRADA — anillos de pétalos, cada uno escucha una banda
   ────────────────────────────────────────────────────────────────────────── */
function drawMandala(f: VoidFxFrame, rings: number): Tip[] {
  const { ctx, cx, cy, r, t } = f;
  const tips: Tip[] = [];
  ctx.save();
  ctx.lineJoin = 'round';
  for (let k = 0; k < rings; k++) {
    const petals = 6 + k * 2;
    const q = k / Math.max(1, rings - 1);
    const band = q < 0.25 ? f.bass : q < 0.55 ? f.bass * 0.5 + f.mids * 0.5 : q < 0.8 ? f.mids : f.treble * 0.6 + f.mids * 0.4;
    const radius = r * (1.3 + k * 0.32 * f.fx.reach) * (1 + f.kickStrength * 0.12);
    const amp = r * (0.07 + drive(f, band) * 0.26);
    const spin = t * (0.35 - k * 0.05) * (k % 2 === 0 ? 1 : -1) + ((f.angleDeg * Math.PI) / 180) * 0.02;
    const steps = 160;

    ctx.beginPath();
    for (let p = 0; p <= steps; p++) {
      const th = (p / steps) * TAU;
      const rr = radius + Math.cos(th * petals + spin * 3) * amp;
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (k === 0 && p % Math.round(steps / petals) === 0 && p < steps) tips.push({ x, y });
    }
    ctx.closePath();
    const col = colAt(f, q);
    ctx.strokeStyle = rgba(col, 0.92 - k * 0.1);
    ctx.lineWidth = line(f, k === 0 ? 1.4 : 1.1);
    ctx.shadowColor = rgba(col, 1);
    ctx.shadowBlur = blur(f, Math.max(4, r * 0.05));
    ctx.stroke();
  }
  ctx.restore();
  return tips.slice(0, 8);
}

/* ──────────────────────────────────────────────────────────────────────────
   FORMA DEL BOMBO — silueta que brota del borde del disco con el bajo
   Capa independiente: se combina con cualquier efecto base.
   Cada forma es un conjunto de "lóbulos" sobre el anillo; la altura de cada uno
   sigue una envolvente (bajo + golpe) y, según la forma, las notas o los medios.
   ────────────────────────────────────────────────────────────────────────── */
interface Lobe {
  /** Ángulo central (rad) */
  a: number;
  /** Semiancho angular (rad) */
  hw: number;
  /** Altura relativa al radio del disco */
  h: number;
  /** Punta redondeada (true) o afilada (false) */
  round?: boolean;
  /** Exponente de cada flanco: >1 cóncavo (más afilado), <1 abombado */
  sIn?: number;
  sOut?: number;
  /** Cizalla: cuánto se desplaza la punta en ángulo por unidad de altura (curva la forma) */
  lean?: number;
}

interface FormLayer {
  hs: number;
  ws: number;
  color: RGB;
  fill: number;
  stroke: number;
  accent?: boolean;
}

const UP = -Math.PI / 2;
const wrapPi = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

function lobeProfile(l: Lobe, d: number, hwScale: number): number {
  const u = d / (l.hw * hwScale);
  const au = Math.abs(u);
  if (au >= 1) return 0;
  if (l.round) return Math.pow(Math.cos((au * Math.PI) / 2), 0.62);
  const s = u < 0 ? l.sIn ?? 1.15 : l.sOut ?? 1.15;
  return Math.pow(1 - au, s);
}

/** Lóbulos de cada forma, ya escalados por la altura viva */
function buildLobes(id: string, f: VoidFxFrame, H: number): Lobe[] {
  const lobes: Lobe[] = [];
  const chroma = f.chroma;
  switch (id) {
    case 'cat': {
      const twitch = 1 + 0.25 * f.mids;
      for (const s of [-1, 1]) {
        lobes.push({ a: UP + s * 0.74, hw: 0.31, h: 0.9 * H * twitch, sIn: s < 0 ? 1.7 : 0.95, sOut: s < 0 ? 0.95 : 1.7, lean: -s * 0.1 });
      }
      break;
    }
    case 'bunny': {
      for (const s of [-1, 1]) {
        lobes.push({ a: UP + s * 0.34, hw: 0.21, h: 1.55 * H * (1 + 0.2 * f.mids), round: true, lean: s * 0.06 });
      }
      break;
    }
    case 'horns': {
      for (const s of [-1, 1]) {
        lobes.push({ a: UP + s * 1.08, hw: 0.34, h: 1.15 * H, sIn: 1.0, sOut: 1.0, lean: -s * 0.55 });
      }
      break;
    }
    case 'crown': {
      const n = Math.max(3, Math.round(f.fx.count));
      const span = 1.75;
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : i / (n - 1) - 0.5;
        const note = chroma[Math.round((i / Math.max(1, n - 1)) * 11)] || 0;
        const centre = 1 - 0.28 * Math.abs(x) * 2;
        lobes.push({ a: UP + x * span, hw: (span / Math.max(1, n - 1)) * 0.62, h: 1.3 * H * centre * (0.85 + 0.55 * note), sIn: 1.05, sOut: 1.05 });
      }
      break;
    }
    case 'flame': {
      const n = Math.max(6, Math.round(f.fx.count));
      for (let i = 0; i < n; i++) {
        const a = UP + (i / n) * TAU;
        const note = chroma[Math.min(11, Math.floor((i / n) * 12))] || 0;
        // Cada lengua escucha su propia zona del espectro (nada se mueve sin música)
        const bin = 2 + Math.floor((i / n) * Math.min(64, f.raw.length * 0.3));
        const flick = 0.45 + 0.75 * spec(f, bin, 1.0);
        // hacia arriba: las lenguas se inclinan hacia el punto más alto del anillo
        const towardUp = Math.sin(UP - a);
        lobes.push({
          a,
          hw: (TAU / n) * 0.64,
          h: 1.5 * H * flick * (0.6 + 0.9 * note) * (1 + 0.35 * Math.max(0, Math.sin(-a))),
          sIn: 1.6,
          sOut: 1.6,
          lean: 0.55 * towardUp,
        });
      }
      break;
    }
    case 'wings': {
      const flap = 1 + 0.28 * Math.min(1, f.kickStrength + f.energy * 0.5);
      for (const s of [-1, 1]) {
        for (let j = 0; j < 4; j++) {
          lobes.push({ a: UP + s * (1.1 + j * 0.36), hw: 0.2, h: (1.5 - j * 0.3) * H * flap, sIn: 1.15, sOut: 1.15, lean: -s * 0.5 });
        }
      }
      break;
    }
    case 'notes': {
      // Reloj de Notas: el contorno se hincha en el ángulo de cada una de las 12 notas
      for (let k = 0; k < 12; k++) {
        lobes.push({ a: UP + (k / 12) * TAU, hw: (TAU / 12) * 0.5, h: H * (0.1 + 1.15 * (chroma[k] || 0)), round: true });
      }
      break;
    }
    case 'spikes': {
      // Púas: cada una sigue un tramo del espectro; simétrico para que se vea equilibrado
      const n = 36;
      for (let i = 0; i < n; i++) {
        const m = Math.min(i, n - i);
        const bin = 2 + Math.floor((m / (n / 2)) * Math.min(80, f.raw.length * 0.35));
        lobes.push({ a: UP + (i / n) * TAU, hw: (TAU / n) * 0.46, h: H * (0.18 + 1.4 * spec(f, bin, 1.05)), sIn: 1.3, sOut: 1.3 });
      }
      break;
    }
    default:
      break;
  }
  return lobes;
}

function formLayers(id: string, f: VoidFxFrame): FormLayer[] {
  const c0 = colAt(f, 0.05);
  const c1 = colAt(f, 0.95);
  switch (id) {
    case 'cat':
    case 'bunny':
      return [
        { hs: 1, ws: 1, color: c0, fill: 0.16, stroke: 0.95 },
        { hs: id === 'cat' ? 0.62 : 0.72, ws: id === 'cat' ? 0.52 : 0.5, color: c1, fill: 0.5 + f.mids * 0.35, stroke: 0.5, accent: true },
      ];
    case 'flame':
      return [
        { hs: 1, ws: 1, color: c0, fill: 0.34, stroke: 0.9 },
        { hs: 0.68, ws: 0.78, color: mixRGB(c0, c1, 0.6), fill: 0.5, stroke: 0.6 },
        { hs: 0.4, ws: 0.55, color: mixRGB(c1, [255, 255, 255], 0.55), fill: 0.7, stroke: 0.4, accent: true },
      ];
    case 'notes':
    case 'spikes':
      return [{ hs: 1, ws: 1, color: c0, fill: 0.2, stroke: 0.95 }, { hs: 0.55, ws: 0.8, color: c1, fill: 0.32, stroke: 0.5, accent: true }];
    case 'wings':
      return [
        { hs: 1, ws: 1, color: c0, fill: 0.14, stroke: 0.95 },
        { hs: 0.66, ws: 0.62, color: c1, fill: 0.36, stroke: 0.5, accent: true },
      ];
    default:
      return [{ hs: 1, ws: 1, color: c0, fill: 0.16, stroke: 0.95 }];
  }
}

function drawKickForm(id: string, f: VoidFxFrame, state: VoidFxState): Tip[] {
  const form = state.form;
  if (id === 'fractal') {
    form.env = 0;
    form.pop = 0;
    return [];
  }
  const { ctx, cx, cy, r, t } = f;
  const dt = Math.max(0, Math.min(0.06, t - form.last));
  form.last = t;

  // Envolvente: sube rápido con el bajo, baja despacio; el golpe añade un rebote
  // Sin música la forma queda en reposo: no hay movimiento propio
  const target = f.active ? drive(f, f.bass * 0.85) + f.kickStrength * 0.55 : 0;
  const rate = target > form.env ? 32 : 5.5;
  form.env += (target - form.env) * (1 - Math.exp(-dt * rate));
  if (f.boom > 0) form.pop = Math.max(form.pop, f.boom);
  form.pop *= Math.exp(-dt * 7);

  const life = 0.22 + Math.min(1.25, form.env) * 0.85 + form.pop * 0.34;
  const H = r * f.fx.formScale * Math.sqrt(f.fx.reach) * life;
  const rb = r * (1.03 + f.kickStrength * 0.03);
  const lobes = buildLobes(id, f, H / r);
  if (lobes.length === 0) return [];

  const layers = formLayers(id, f);
  const style = f.fx.formStyle;
  const steps = 420;
  const tips: Tip[] = [];

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  layers.forEach((layer, li) => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const th = UP + (i / steps) * TAU;
      let ext = 0;
      let shift = 0;
      for (const l of lobes) {
        const c = lobeProfile(l, wrapPi(th - l.a), layer.ws) * l.h * layer.hs;
        if (c <= 0) continue;
        ext += c;
        if (l.lean) shift += l.lean * c;
      }
      const ang = th + shift;
      const rr = rb + ext * r;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const reach = rb + H * 1.4;
    if (style === 'ink') {
      ctx.fillStyle = rgba(layer.color, layer.accent ? 0.85 : 0.94);
      ctx.fill();
      ctx.strokeStyle = rgba([6, 8, 18], 0.6);
      ctx.lineWidth = line(f, 1);
      ctx.stroke();
    } else if (style === 'glass') {
      const g = ctx.createRadialGradient(cx, cy, rb, cx, cy, reach);
      g.addColorStop(0, rgba(layer.color, layer.fill * 0.55));
      g.addColorStop(1, rgba(layer.color, layer.fill * 1.1));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(mixRGB(layer.color, [255, 255, 255], 0.5), layer.stroke * 0.7);
      ctx.lineWidth = line(f, li === 0 ? 1.1 : 0.8);
      ctx.shadowColor = rgba(layer.color, 0.8);
      ctx.shadowBlur = blur(f, Math.max(3, r * 0.03));
      ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(cx, cy, rb, cx, cy, reach);
      g.addColorStop(0, rgba(layer.color, layer.fill * 0.35));
      g.addColorStop(1, rgba(layer.color, layer.fill));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(layer.color, layer.stroke);
      ctx.lineWidth = line(f, li === 0 ? 1.6 : 1.1);
      ctx.shadowColor = rgba(layer.color, 1);
      ctx.shadowBlur = blur(f, Math.max(6, r * 0.09) * (0.6 + form.env * 0.6));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  });

  // Joyas de la corona y puntas visibles (para chispas)
  for (const l of lobes) {
    const tipR = rb + l.h * r * 0.98;
    const ang = l.a + (l.lean || 0) * l.h * 0.98;
    const px = cx + Math.cos(ang) * tipR;
    const py = cy + Math.sin(ang) * tipR;
    if (id === 'crown') {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.6, r * 0.028), 0, TAU);
      ctx.fillStyle = rgba(mixRGB(colAt(f, 0.5), [255, 255, 255], 0.5), 0.95);
      ctx.shadowColor = f.primary;
      ctx.shadowBlur = blur(f, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (form.env > 0.45 && tips.length < 4) tips.push({ x: px, y: py });
  }
  ctx.restore();
  return tips;
}

/* ──────────────────────────────────────────────────────────────────────────
   Despachador — la Mándala Sagrada es la base; cada efecto es un contorno del kick
   ────────────────────────────────────────────────────────────────────────── */
export function drawVoidEffect(id: string, f: VoidFxFrame, state: VoidFxState): Tip[] {
  drawInner(f);
  drawBoom(f, state);
  // Anillos de la mándala: los elige el usuario solo cuando la mándala es el efecto
  const tips = id === 'fractal' || f.fx.mandala ? drawMandala(f, id === 'fractal' ? Math.round(f.fx.count) : 4) : [];
  const contour = drawKickForm(id, f, state);
  return contour.length ? tips.concat(contour) : tips;
}
