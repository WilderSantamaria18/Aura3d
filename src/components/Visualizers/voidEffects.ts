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

import {
  TAU,
  UP,
  blur,
  clampInt,
  colAt,
  createVoidFxState,
  drive,
  hash01,
  line,
  mixRGB,
  noteColor,
  parseColor,
  rgba,
  spec,
  updateEnvelope,
  wrapPi,
  type RGB,
  type Tip,
  type VoidFxFrame,
  type VoidFxParams,
  type VoidFxState,
} from './voidFxKit';
import { CUSTOM_FORMS } from './voidForms';

// Tipos y fábrica de estado: se reexportan para no romper a quien los importaba de aquí
export { createVoidFxState };
export type { VoidFxFrame, VoidFxParams, VoidFxState, Tip };

/* ──────────────────────────────────────────────────────────────────────────
   INNER — bisel luminoso dentro del borde del disco
   ────────────────────────────────────────────────────────────────────────── */
function drawInner(f: VoidFxFrame) {
  if (!f.fx.inner) return;
  const { ctx, cx, cy, r } = f;
  const p = parseColor(f.primary);
  const s = parseColor(f.secondary);
  const bass = drive(f, f.bass);
  const mids = drive(f, f.mids);
  const treble = drive(f, f.treble);
  const kick = f.kickStrength;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Graves: el borde exterior responde en el mismo frame y concentra el destello del kick.
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.945 + kick * 0.012), 0, TAU);
  ctx.strokeStyle = rgba(p, Math.min(0.92, 0.18 + bass * 0.46 + kick * 0.28));
  ctx.lineWidth = line(f, 1.15) + r * (0.008 + bass * 0.012 + kick * 0.014);
  ctx.shadowColor = rgba(p, 0.75);
  ctx.shadowBlur = blur(f, 4 + kick * 7);
  ctx.stroke();

  // Medios: una capa separada para que voces y caja no muevan el anillo de graves.
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.865 + mids * 0.008), 0, TAU);
  ctx.strokeStyle = rgba(s, Math.min(0.72, 0.1 + mids * 0.48));
  ctx.lineWidth = line(f, 0.9 + mids * 0.55);
  ctx.stroke();

  // Agudos: aro fino y segmentado; la fase sigue la rotación musical sin crear partículas nuevas.
  ctx.setLineDash([Math.max(2, r * 0.025), Math.max(3, r * 0.045)]);
  ctx.lineDashOffset = -f.angleDeg * 0.08;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.785 + treble * 0.006), 0, TAU);
  ctx.strokeStyle = rgba(mixRGB(p, [255, 255, 255], 0.42), Math.min(0.68, 0.08 + treble * 0.5));
  ctx.lineWidth = line(f, 0.72 + treble * 0.35);
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
    state.booms.push({ born: t, s: f.boom, r });
    if (state.booms.length > 2) state.booms.shift();
  }

  const p = parseColor(f.primary);
  const s = parseColor(f.secondary);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Eliminación in-place: evita crear un array nuevo en cada frame.
  for (let i = state.booms.length - 1; i >= 0; i--) {
    const b = state.booms[i];
    if (t - b.born >= 0.46) state.booms.splice(i, 1);
  }
  for (const b of state.booms) {
    const life = 0.3 + b.s * 0.14;
    const k = Math.max(0, (t - b.born) / life);
    if (k >= 1) continue;
    const ease = 1 - Math.pow(1 - k, 4);
    const rad = b.r * (1.015 + ease * (0.55 + b.s * 1.2) * f.fx.reach);
    const alpha = Math.pow(1 - k, 2.25) * (0.38 + b.s * 0.58);

    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, TAU);
    ctx.strokeStyle = rgba(mixRGB(p, s, Math.min(1, k * 1.4)), alpha);
    ctx.lineWidth = line(f, 1.2) + b.r * 0.025 * (1 - k) * b.s;
    ctx.shadowColor = rgba(p, alpha * 0.8);
    ctx.shadowBlur = blur(f, 8 * (1 - k));
    ctx.stroke();
  }

  // Flash de ataque: solo existe en el frame del onset, no sigue una envolvente retrasada.
  if (f.boom > 0) {
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.005, 0, TAU);
    ctx.strokeStyle = rgba([255, 255, 255], Math.min(0.9, 0.38 + f.boom * 0.52));
    ctx.lineWidth = line(f, 1.1) + r * 0.018 * f.boom;
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


function lobeProfile(l: Lobe, d: number, hwScale: number): number {
  const u = d / (l.hw * hwScale);
  const au = Math.abs(u);
  if (au >= 1) return 0;
  if (l.round) return Math.pow(Math.cos((au * Math.PI) / 2), 0.62);
  const s = u < 0 ? l.sIn ?? 1.15 : l.sOut ?? 1.15;
  return Math.pow(1 - au, s);
}

/** Lóbulos de las formas construidas sobre el anillo, ya escalados por la altura viva (H en radios del disco) */
function buildLobes(id: string, f: VoidFxFrame, H: number): Lobe[] {
  const lobes: Lobe[] = [];
  switch (id) {
    case 'sun': {
      // Corona de rayos finos y alternos: los largos siguen los graves y el espectro, los cortos los medios
      const n = clampInt(f.fx.count, 12, 48) & ~1; // par, para alternar largo/corto
      const turn = f.t * 0.05 + ((f.angleDeg * Math.PI) / 180) * 0.01;
      for (let i = 0; i < n; i++) {
        const long = i % 2 === 0;
        const bin = 2 + Math.floor((i / n) * Math.min(72, f.raw.length * 0.3));
        const sp = spec(f, bin, 1.0);
        lobes.push({
          a: UP + (i / n) * TAU + turn,
          hw: (TAU / n) * (long ? 0.3 : 0.36),
          h: long ? 1.35 * H * (0.7 + 0.6 * sp) : 0.6 * H * (0.45 + 0.9 * f.mids + 0.5 * sp),
          sIn: 2.0,
          sOut: 2.0,
        });
      }
      break;
    }
    case 'crystal': {
      // Esquirlas irregulares y asimétricas; cada una escucha un tramo del espectro. La variación es fija
      // (hash por índice): cambia la forma de cada cristal, no parpadea entre frames.
      const n = clampInt(f.fx.count, 4, 12);
      for (let i = 0; i < n; i++) {
        const h1 = hash01(i, 1);
        const h2 = hash01(i, 2);
        const bin = 2 + Math.floor((i / n) * Math.min(72, f.raw.length * 0.3));
        lobes.push({
          a: UP + ((i + (h1 - 0.5) * 0.7) / n) * TAU,
          hw: (TAU / n) * (0.28 + 0.2 * h1),
          h: (0.65 + 0.7 * h2) * 1.45 * H * (0.35 + 1.15 * spec(f, bin, 1.0)),
          sIn: 0.75 + h2 * 0.5,
          sOut: 1.6 - h2 * 0.6,
          lean: (h1 - 0.5) * 0.35,
        });
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
    case 'sun':
      return [
        { hs: 1, ws: 1, color: c0, fill: 0.3, stroke: 0.9 },
        { hs: 0.52, ws: 0.6, color: mixRGB(c1, [255, 255, 255], 0.45), fill: 0.55, stroke: 0.45, accent: true },
      ];
    case 'crystal':
      return [
        { hs: 1, ws: 1, color: c0, fill: 0.18, stroke: 0.95 },
        { hs: 0.6, ws: 0.52, color: mixRGB(c1, [255, 255, 255], 0.35), fill: 0.45, stroke: 0.55, accent: true },
        { hs: 0.3, ws: 0.3, color: [255, 255, 255], fill: 0.4, stroke: 0.3, accent: true },
      ];
    default:
      return [{ hs: 1, ws: 1, color: c0, fill: 0.16, stroke: 0.95 }];
  }
}

/**
 * Facetas interiores del Cristal. Un vértice por cristal, en su mismo ángulo, cuyo radio sube con la altura
 * viva de ese cristal; se unen en un polígono, una estrella de diagonales y triángulos translúcidos.
 * Todo queda entre 0.5 y 0.92 del radio del disco: el centro (logo/carátula) no se toca.
 */
function drawCrystalInner(f: VoidFxFrame, lobes: Lobe[], Hrel: number, pop: number) {
  const { ctx, cx, cy, r, u, t } = f;
  const n = lobes.length;
  if (n < 3) return;
  const spin = t * 0.12;
  const col0 = colAt(f, 0.15);
  const col1 = colAt(f, 0.85);
  const xs: number[] = [];
  const ys: number[] = [];
  const hs: number[] = [];

  for (let i = 0; i < n; i++) {
    const l = lobes[i];
    // altura relativa del cristal (0..~1): el vértice interior crece con ella
    const k = Math.min(1, l.h / Math.max(0.0001, Hrel * 1.6));
    const rr = r * (0.52 + 0.4 * k + pop * 0.03);
    const a = l.a + spin;
    xs.push(cx + Math.cos(a) * rr);
    ys.push(cy + Math.sin(a) * rr);
    hs.push(k);
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Triángulos entre vértices consecutivos y el anillo interior: facetas de cristal
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = cx + (xs[i] + xs[j] - 2 * cx) * 0.5 * 0.55;
    const my = cy + (ys[i] + ys[j] - 2 * cy) * 0.5 * 0.55;
    ctx.beginPath();
    ctx.moveTo(xs[i], ys[i]);
    ctx.lineTo(xs[j], ys[j]);
    ctx.lineTo(mx, my);
    ctx.closePath();
    ctx.fillStyle = rgba(mixRGB(col0, col1, i / n), 0.05 + 0.2 * (hs[i] + hs[j]) * 0.5);
    ctx.fill();
  }

  // Polígono exterior de las facetas
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.closePath();
  ctx.strokeStyle = rgba(col0, 0.5 + 0.4 * f.mids);
  ctx.lineWidth = line(f, 1);
  ctx.stroke();

  // Diagonales: estrella que se enciende con la altura de los cristales que une
  ctx.beginPath();
  const skip = n >= 7 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const j = (i + skip) % n;
    ctx.moveTo(xs[i], ys[i]);
    ctx.lineTo(xs[j], ys[j]);
  }
  ctx.strokeStyle = rgba(mixRGB(col1, [255, 255, 255], 0.35), 0.16 + 0.35 * f.treble);
  ctx.lineWidth = Math.max(0.7, 0.8 * u);
  ctx.stroke();

  // Vértices brillantes
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xs[i], ys[i], Math.max(1.2 * u, r * (0.012 + 0.03 * hs[i])), 0, TAU);
    ctx.fillStyle = rgba(mixRGB(col1, [255, 255, 255], 0.5), 0.55 + 0.4 * hs[i]);
    ctx.fill();
  }
  ctx.restore();
}

function drawKickForm(id: string, f: VoidFxFrame, state: VoidFxState): Tip[] {
  if (id === 'fractal') {
    state.form.env = 0;
    state.form.pop = 0;
    return [];
  }
  const { ctx, cx, cy, r } = f;
  const e = updateEnvelope(f, state);

  // Formas dibujadas a medida (galaxia, órbitas, tormenta, cinta, constelación, mareas)
  const custom = CUSTOM_FORMS[id];
  if (custom) return custom(f, state, e);

  const { rb, H } = e;
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
      ctx.shadowBlur = blur(f, Math.max(6, r * 0.09) * (0.6 + e.env * 0.6));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  });

  // ── INTERIOR del Cristal: facetas dentro del disco que reaccionan con cada cristal ──
  if (id === 'crystal') drawCrystalInner(f, lobes, H / r, e.pop);

  // Puntas visibles (para chispas y constelación de los efectos Pro)
  for (const l of lobes) {
    if (e.env <= 0.45 || tips.length >= 4) break;
    const tipR = rb + l.h * r * 0.98;
    const ang = l.a + (l.lean || 0) * l.h * 0.98;
    tips.push({ x: cx + Math.cos(ang) * tipR, y: cy + Math.sin(ang) * tipR });
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
  const tips = id === 'fractal' || (id === 'crystal' && f.fx.mandala) ? drawMandala(f, id === 'fractal' ? Math.round(f.fx.count) : 4) : [];
  const contour = drawKickForm(id, f, state);
  return contour.length ? tips.concat(contour) : tips;
}
