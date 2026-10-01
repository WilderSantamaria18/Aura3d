/**
 * Formas del contorno dibujadas a medida. Cada una tiene dos partes:
 *   · EXTERIOR — el diseño que rodea el disco.
 *   · INTERIOR («inners») — capas dentro del disco, en el anillo entre 0.55 y 0.95 del radio, que dejan
 *     libre el centro para el logo o la carátula y reaccionan a otra parte del audio.
 *
 * Reglas de diseño comunes (lo que separa un visualizador de estudio de un dibujo):
 *   · densidad: decenas de elementos finos y regulares, no cuatro trazos gruesos;
 *   · dinámica: ataque casi instantáneo y caída lenta, picos retenidos, el kick empuja todo a la vez;
 *   · profundidad: pasada ancha y tenue aditiva (resplandor) bajo un trazo nítido, sin `shadowBlur`;
 *   · color: barrido de la paleta a lo largo del espectro o del ángulo, no un color plano;
 *   · coste: muchos elementos en pocos trazados (por cubos de color), sin asignar memoria por frame.
 *
 * Sin música quedan en reposo: no hay movimiento propio salvo una respiración mínima.
 */

import {
  COLOR_BUCKETS,
  MAX_PARTICLES,
  TAU,
  UP,
  clampInt,
  colAt,
  finish,
  mixRGB,
  mulberry32,
  noteColor,
  rad,
  rgba,
  strokeGlow,
  updateBars,
  WHITE,
  wrapPi,
  type FormEnvelope,
  type RGB,
  type Tip,
  type VoidFxFrame,
  type VoidFxState,
} from './voidFxKit';

import { MORE_FORMS } from './voidForms2';

export type FormDrawer = (f: VoidFxFrame, state: VoidFxState, e: FormEnvelope) => Tip[];

const HALF_PI = Math.PI / 2;

// Buffers reutilizados (sin asignaciones por frame)
const PX = new Float32Array(MAX_PARTICLES);
const PY = new Float32Array(MAX_PARTICLES);
const PS = new Float32Array(MAX_PARTICLES);
const PC = new Uint8Array(MAX_PARTICLES);
const TX = new Float32Array(MAX_PARTICLES);
const TY = new Float32Array(MAX_PARTICLES);
const VX = new Float32Array(16);
const VY = new Float32Array(16);
const AMP = new Float32Array(24);

/* ══════════════════════════════════════════════════════════════════════════
   ESPECTRO — ecualizador radial simétrico con picos retenidos
   Exterior: barras redondeadas (graves abajo, agudos arriba) + tapas de pico.
   Interior: barras que apuntan hacia el centro, con el mismo espectro en otro orden.
   ══════════════════════════════════════════════════════════════════════════ */
const spectrum: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const n = clampInt(f.fx.count, 48, 160) & ~1;
  const half = n / 2;
  const bars = updateBars(f, state, half, e.dt);

  const base = e.rb;
  const gap = r * 0.028;
  const minLen = r * 0.045;
  const maxLen = r * f.fx.formScale * 1.3 * Math.sqrt(f.fx.reach);
  const barW = Math.max(1.6 * u, ((TAU * base) / n) * 0.5);

  ctx.save();
  ctx.lineCap = 'round';

  // Anillo base y flash del golpe
  ctx.beginPath();
  ctx.arc(cx, cy, base + gap * 0.4, 0, TAU);
  strokeGlow(f, colAt(f, 0.5), 0.22 + e.pop * 0.5, 1, 2.4);

  // Barras exteriores por cubos de color (barrido graves → agudos)
  for (let g = 0; g < COLOR_BUCKETS; g++) {
    const lo = Math.floor((g * half) / COLOR_BUCKETS);
    const hi = Math.floor(((g + 1) * half) / COLOR_BUCKETS);
    if (hi <= lo) continue;
    ctx.beginPath();
    for (let i = lo; i < hi; i++) {
      const v = Math.min(1.35, bars.lvl[i] + e.pop * 0.32 * (1 - i / half));
      const len = minLen + maxLen * v;
      const a = ((i + 0.5) / half) * Math.PI;
      for (let k = 0; k < 2; k++) {
        const th = k === 0 ? HALF_PI - a : HALF_PI + a;
        const c = Math.cos(th);
        const s = Math.sin(th);
        ctx.moveTo(cx + c * (base + gap), cy + s * (base + gap));
        ctx.lineTo(cx + c * (base + gap + len), cy + s * (base + gap + len));
      }
    }
    strokeGlow(f, colAt(f, (g + 0.5) / COLOR_BUCKETS), 0.92, barW, 2.6);
  }

  // Tapas de pico: puntos blancos que flotan sobre cada barra
  ctx.beginPath();
  for (let i = 0; i < half; i++) {
    if (bars.peak[i] < 0.06) continue;
    const pr = base + gap + minLen + maxLen * bars.peak[i] + r * 0.035;
    const a = ((i + 0.5) / half) * Math.PI;
    for (let k = 0; k < 2; k++) {
      const th = k === 0 ? HALF_PI - a : HALF_PI + a;
      const x = cx + Math.cos(th) * pr;
      const y = cy + Math.sin(th) * pr;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(th) * 0.6, y + Math.sin(th) * 0.6);
    }
  }
  ctx.strokeStyle = rgba(WHITE, 0.85);
  ctx.lineWidth = Math.max(1.8 * u, barW * 0.95);
  ctx.stroke();

  // ── INTERIOR: barras hacia el centro + anillo punteado que gira ──
  const rim = r * 0.93;
  const innerW = Math.max(1.2 * u, barW * 0.62);
  const innerMax = r * 0.3;
  ctx.beginPath();
  for (let i = 0; i < half; i++) {
    const src = bars.lvl[Math.min(half - 1, Math.floor(i * 0.9))];
    const v = Math.min(1.2, src * 0.85 + f.mids * 0.15 + e.pop * 0.18);
    const len = r * 0.035 + innerMax * v;
    const a = ((i + 0.5) / half) * Math.PI;
    for (let k = 0; k < 2; k++) {
      const th = k === 0 ? HALF_PI - a : HALF_PI + a;
      const c = Math.cos(th);
      const s = Math.sin(th);
      ctx.moveTo(cx + c * rim, cy + s * rim);
      ctx.lineTo(cx + c * (rim - len), cy + s * (rim - len));
    }
  }
  strokeGlow(f, colAt(f, 0.85), 0.78, innerW, 2.4);

  ctx.setLineDash([r * 0.02, r * 0.045]);
  ctx.lineDashOffset = -t * r * 0.18;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.3), 0.22 + f.mids * 0.35);
  ctx.lineWidth = Math.max(0.8, u);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  const tips: Tip[] = [];
  for (let k = 0; k < 4; k++) {
    const i = Math.floor(((k + 1) / 5) * half);
    const a = ((i + 0.5) / half) * Math.PI;
    const pr = base + gap + minLen + maxLen * bars.lvl[i];
    tips.push({ x: cx + Math.cos(HALF_PI - a) * pr, y: cy + Math.sin(HALF_PI - a) * pr });
  }
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   ONDA — osciloscopio circular: cuatro curvas de armónicos que respiran con el audio
   Exterior: 4 curvas sintetizadas con 20 armónicos (graves → lóbulos grandes, agudos → detalle fino).
   Interior: una onda contraria más pequeña dentro del disco.
   ══════════════════════════════════════════════════════════════════════════ */
const wave: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const H = 20;
  const bars = updateBars(f, state, 24, e.dt);

  // Amplitud de cada armónico h = 2…21: la banda que le corresponde + el detalle de su zona del espectro
  let energy2 = 0;
  for (let i = 0; i < H; i++) {
    const h = i + 2;
    const band = h <= 5 ? f.bass : h <= 11 ? f.mids : f.treble;
    AMP[i] = (0.5 * bars.lvl[i + 2] + 0.5 * band) / Math.pow(h, 0.85);
    energy2 += 1 / Math.pow(h, 1.7);
  }
  // Se normaliza por la raíz de la suma de cuadrados (amplitud eficaz de la suma de cosenos), no por la suma
  // simple: así la curva se deforma de verdad en vez de quedarse casi circular.
  const k = (r * f.fx.formScale * (0.55 + 0.45 * Math.min(1.25, e.life)) * 0.8) / Math.sqrt(energy2);
  const spin = rad(f.angleDeg) * 0.02;

  ctx.save();
  ctx.lineJoin = 'round';

  const steps = 240;
  const curves = [
    { R: 0.5, A: 1.0, dir: 1, w: 2.4, col: colAt(f, 0.05), fill: 0.1 },
    { R: 0.78, A: 0.82, dir: -1, w: 1.7, col: colAt(f, 0.4), fill: 0.05 },
    { R: 1.06, A: 0.62, dir: 1, w: 1.2, col: colAt(f, 0.7), fill: 0 },
    { R: 1.34, A: 0.45, dir: -1, w: 0.9, col: colAt(f, 0.95), fill: 0 },
  ];
  // De fuera hacia dentro: el rellenado de las interiores se suma encima
  for (let c = curves.length - 1; c >= 0; c--) {
    const cv = curves[c];
    const R0 = e.rb + r * cv.R * f.fx.reach + r * 0.05;
    ctx.beginPath();
    for (let p = 0; p <= steps; p++) {
      const th = (p / steps) * TAU;
      let sum = 0;
      for (let i = 0; i < H; i++) {
        const h = i + 2;
        sum += AMP[i] * Math.cos(h * th + t * (0.5 + 0.09 * h) * cv.dir + h * 1.7 + c * 2.1 + spin);
      }
      sum = Math.max(-3, Math.min(3, sum));
      const rr = Math.max(e.rb + r * 0.08, R0 + sum * k * cv.A + e.pop * r * 0.06);
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (cv.fill > 0) {
      ctx.fillStyle = rgba(cv.col, cv.fill * finish(f).alpha);
      ctx.fill();
    }
    strokeGlow(f, cv.col, 1 - c * 0.1, Math.max(1.2, cv.w * f.stroke * u), 3.4);
  }

  // ── INTERIOR: onda contraria dentro del disco + anillo punteado ──
  ctx.beginPath();
  const stepsIn = 180;
  for (let p = 0; p <= stepsIn; p++) {
    const th = (p / stepsIn) * TAU;
    let sum = 0;
    for (let i = 3; i < H; i += 2) {
      const h = i + 2;
      sum += AMP[i] * Math.cos(h * th - t * (0.7 + 0.08 * h) + h * 0.9);
    }
    sum = Math.max(-3, Math.min(3, sum));
    const rr = r * 0.76 + sum * k * 0.42 + e.pop * r * 0.025;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.8), 0.95, Math.max(1.2, 1.5 * f.stroke * u), 2.8);

  ctx.setLineDash([r * 0.018, r * 0.04]);
  ctx.lineDashOffset = t * r * 0.15;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.2), 0.25 + f.treble * 0.45);
  ctx.lineWidth = Math.max(0.9, u);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
  return [];
};

/* ══════════════════════════════════════════════════════════════════════════
   PARTÍCULAS — carriles orbitales con estelas que el bombo empuja hacia afuera
   Exterior: 7 carriles concéntricos (graves adentro, agudos afuera), cada uno con su velocidad y sentido.
   Interior: un carril más rápido y contrario dentro del disco.
   Cada partícula es una estela corta (segmento tangente), no un punto: da sensación de velocidad.
   ══════════════════════════════════════════════════════════════════════════ */
const LANES = 7;
const particles: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const ps = state.particles;
  const n = clampInt(f.fx.count, 120, 420);

  if (!ps.init) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const rng = mulberry32(9157 + i * 31);
      const m = i % (LANES + 1);
      // m < 7: carril exterior m; m === 7: carril interior (dentro del disco)
      ps.layer[i] = m;
      ps.rho[i] = m < LANES ? 1.14 + m * 0.17 + (rng() - 0.5) * 0.03 : 0.62 + rng() * 0.28;
      ps.ang[i] = rng() * TAU;
      const dir = m === LANES ? -1 : m % 2 === 0 ? 1 : -1;
      ps.spd[i] = dir * (0.55 - Math.min(m, LANES - 1) * 0.06) * (0.6 + rng() * 0.8) * (m === LANES ? 1.6 : 1);
      ps.size[i] = 1.9 + rng() * 2.6;
      ps.phase[i] = rng() * TAU;
    }
    ps.init = true;
  }

  const swirl = 1 + f.energy * 1.4 + e.pop * 3;
  const streak = 0.09 * swirl;
  const tips: Tip[] = [];

  // Intensidad de cada carril según su banda: graves adentro, medios en medio, agudos afuera
  const laneBand = (m: number) => Math.min(1.2, m >= LANES ? f.mids : m < 2 ? f.bass : m < 5 ? f.mids : f.treble);

  for (let i = 0; i < n; i++) {
    ps.ang[i] += ps.spd[i] * e.dt * swirl;
    const m = ps.layer[i];
    const outward = m < LANES ? 1 + m * 0.22 : 0;
    const push = m < LANES ? e.pop * 0.5 * outward + f.bass * 0.06 * outward : 0;
    const wob = 0.025 * Math.sin(ps.phase[i] + t * (0.8 + 0.25 * (m % 4))) * (1 + f.mids * 1.6);
    const dist = r * (ps.rho[i] + push + wob);
    const tw = 0.5 + 0.5 * Math.sin(ps.phase[i] * 3 + t * (2 + f.treble * 9));
    const band = laneBand(m);
    // Cabeza de la estela y cola (ángulo anterior): el segmento entre ambas es la estela
    const back = ps.ang[i] - ps.spd[i] * streak;
    PX[i] = cx + Math.cos(ps.ang[i]) * dist;
    PY[i] = cy + Math.sin(ps.ang[i]) * dist;
    TX[i] = cx + Math.cos(back) * dist;
    TY[i] = cy + Math.sin(back) * dist;
    PS[i] = Math.max(1, ps.size[i] * u * (0.75 + band * 0.7 + f.treble * 0.5 * tw + e.pop * 0.4));
    const hue = Math.floor((((ps.ang[i] % TAU) + TAU) % TAU / TAU) * COLOR_BUCKETS) % COLOR_BUCKETS;
    PC[i] = hue * 2 + (tw > 0.6 || band > 0.6 ? 1 : 0);
    if (m === 2 && tips.length < 4 && i % 9 === 0) tips.push({ x: PX[i], y: PY[i] });
  }

  ctx.save();
  ctx.lineCap = 'round';
  const fin = finish(f);

  // Carriles: anillos finos que marcan la estructura (se encienden con su banda)
  ctx.setLineDash([r * 0.05, r * 0.07]);
  for (let m = 0; m < LANES; m++) {
    ctx.lineDashOffset = t * r * 0.1 * (m % 2 ? 1 : -1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1.14 + m * 0.17 + e.pop * 0.5 * (1 + m * 0.22) * 0.2), 0, TAU);
    ctx.strokeStyle = rgba(colAt(f, m / (LANES - 1)), (0.07 + laneBand(m) * 0.16) * fin.alpha);
    ctx.lineWidth = Math.max(0.7, 0.8 * u);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Estelas por cubos de color × brillo: 16 trazos para cientos de partículas
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let pass = 0; pass < 2; pass++) {
    for (let code = 0; code < COLOR_BUCKETS * 2; code++) {
      const bright = code % 2 === 1;
      const color = colAt(f, (code >> 1) / (COLOR_BUCKETS - 1));
      ctx.beginPath();
      let any = false;
      let wSum = 0;
      let wN = 0;
      for (let i = 0; i < n; i++) {
        if (PC[i] !== code) continue;
        any = true;
        wSum += PS[i];
        wN++;
        ctx.moveTo(TX[i], TY[i]);
        ctx.lineTo(PX[i], PY[i]);
      }
      if (!any) continue;
      const w = wSum / wN;
      if (pass === 0) {
        // Resplandor: estela más ancha y muy tenue
        if (fin.glow <= 0.01) continue;
        ctx.strokeStyle = rgba(color, (bright ? 0.2 : 0.1) * fin.glow);
        ctx.lineWidth = w * 3.2;
      } else {
        ctx.strokeStyle = rgba(bright ? mixRGB(color, WHITE, 0.45 + fin.white) : mixRGB(color, WHITE, fin.white), (bright ? 0.98 : 0.6) * fin.alpha);
        ctx.lineWidth = w;
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   GEOMETRÍA — polígonos concéntricos que giran en sentidos opuestos
   Exterior: hexágono, triángulo, cuadrado y octógono; los vértices brillan con las notas.
   Interior: hexágono y triángulo contrarrotantes dentro del disco.
   ══════════════════════════════════════════════════════════════════════════ */
const GEO_LAYERS = [
  { sides: 6, rad: 0.3, speed: 0.3, skip: 2 },
  { sides: 3, rad: 0.58, speed: -0.42, skip: 0 },
  { sides: 4, rad: 0.88, speed: 0.25, skip: 0 },
  { sides: 8, rad: 1.2, speed: -0.18, skip: 3 },
] as const;

const geometry: FormDrawer = (f, _state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const layers = clampInt(f.fx.count, 2, 4);
  const bands = [f.bass, f.mids, f.mids * 0.6 + f.treble * 0.4, f.treble];
  const tips: Tip[] = [];
  const fin = finish(f);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (let i = 0; i < layers; i++) {
    const d = GEO_LAYERS[i];
    const band = Math.min(1.2, bands[i]);
    const R = e.rb + r * d.rad * f.fx.reach * (1 + e.pop * 0.07 + f.bass * 0.05);
    const rot = t * d.speed + i * 0.4 + rad(f.angleDeg) * 0.02 + e.pop * 0.12 * (i % 2 ? -1 : 1);
    const col = colAt(f, layers > 1 ? i / (layers - 1) : 0);

    for (let v = 0; v < d.sides; v++) {
      const a = rot + (v / d.sides) * TAU + UP;
      VX[v] = cx + Math.cos(a) * R;
      VY[v] = cy + Math.sin(a) * R;
    }

    // Borde del polígono
    ctx.beginPath();
    ctx.moveTo(VX[0], VY[0]);
    for (let v = 1; v < d.sides; v++) ctx.lineTo(VX[v], VY[v]);
    ctx.closePath();
    ctx.fillStyle = rgba(col, (0.035 + band * 0.09) * fin.alpha);
    ctx.fill();
    strokeGlow(f, col, 0.55 + band * 0.45, Math.max(1.4, 2.1 * f.stroke * u), 3);

    // Estrella interior (hexagrama / octagrama): líneas más finas que respiran con la banda
    if (d.skip > 0) {
      ctx.beginPath();
      for (let v = 0; v < d.sides; v++) {
        const w = (v + d.skip) % d.sides;
        ctx.moveTo(VX[v], VY[v]);
        ctx.lineTo(VX[w], VY[w]);
      }
      ctx.strokeStyle = rgba(mixRGB(col, WHITE, 0.3 + fin.white), (0.2 + band * 0.5) * fin.alpha);
      ctx.lineWidth = Math.max(1, 1.15 * u);
      ctx.stroke();
    }

    // Vértices: puntos que crecen con la nota que les corresponde
    ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
    for (let v = 0; v < d.sides; v++) {
      const note = (i * 3 + Math.floor((v * 12) / d.sides)) % 12;
      const nv = Math.min(1, f.chroma[note] || 0);
      const s = Math.max(2 * u, r * (0.02 + 0.065 * nv));
      ctx.beginPath();
      ctx.arc(VX[v], VY[v], s, 0, TAU);
      ctx.fillStyle = rgba(mixRGB(noteColor(f, note), WHITE, 0.3 + nv * 0.5), (0.45 + 0.55 * nv) * fin.alpha);
      ctx.fill();
      if (i === layers - 1 && tips.length < 4 && nv > 0.3) tips.push({ x: VX[v], y: VY[v] });
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Destello del golpe sobre el polígono más grande
  if (e.pop > 0.05) {
    const d = GEO_LAYERS[layers - 1];
    const R = e.rb + r * d.rad * f.fx.reach * (1 + e.pop * 0.07 + f.bass * 0.05);
    const rot = t * d.speed + (layers - 1) * 0.4 + rad(f.angleDeg) * 0.02;
    ctx.beginPath();
    for (let v = 0; v <= d.sides; v++) {
      const a = rot + ((v % d.sides) / d.sides) * TAU + UP;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      if (v === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(WHITE, e.pop * 0.55);
    ctx.lineWidth = Math.max(1.5, 2 * u);
    ctx.stroke();
  }

  // ── INTERIOR: hexágono y triángulo contrarrotantes dentro del disco ──
  const inner = [
    { sides: 6, R: 0.86, speed: -0.35, band: f.mids },
    { sides: 3, R: 0.64, speed: 0.5, band: f.treble },
  ];
  for (let q = 0; q < inner.length; q++) {
    const d = inner[q];
    const col = colAt(f, q === 0 ? 0.25 : 0.8);
    for (let v = 0; v < d.sides; v++) {
      const a = t * d.speed + (v / d.sides) * TAU + UP;
      VX[v] = cx + Math.cos(a) * r * d.R;
      VY[v] = cy + Math.sin(a) * r * d.R;
    }
    ctx.beginPath();
    ctx.moveTo(VX[0], VY[0]);
    for (let v = 1; v < d.sides; v++) ctx.lineTo(VX[v], VY[v]);
    ctx.closePath();
    strokeGlow(f, col, 0.5 + Math.min(1, d.band) * 0.5, Math.max(1.3, 1.6 * u), 2.6);
    for (let v = 0; v < d.sides; v++) {
      ctx.beginPath();
      ctx.arc(VX[v], VY[v], Math.max(1.8 * u, r * 0.018), 0, TAU);
      ctx.fillStyle = rgba(mixRGB(col, WHITE, 0.5), 0.85 * fin.alpha);
      ctx.fill();
    }
  }

  ctx.restore();
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   RADAR — bisel de marcas con barrido y destellos por nota
   Exterior: 120 marcas cuyo largo sigue el espectro, haz giratorio y blips por nota.
   Interior: arcos que giran con el barrido y anillo de marcas finas.
   ══════════════════════════════════════════════════════════════════════════ */
const radar: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const rs = state.radar;
  const bars = updateBars(f, state, 60, e.dt);
  const fin = finish(f);

  // El barrido acelera con la energía y se adelanta con el golpe
  rs.sweep = (rs.sweep + e.dt * (1.1 + f.energy * 1.6 + e.pop * 4)) % TAU;
  const sweep = rs.sweep - HALF_PI;
  const base = e.rb + r * 0.03;
  const ticks = 120;
  const tips: Tip[] = [];

  ctx.save();
  ctx.lineCap = 'round';

  // Haz: abanico de triángulos que se desvanecen detrás de la línea de barrido
  const slices = 22;
  const span = 1.5;
  const beamR = base + r * 1.5 * f.fx.reach;
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let s = 0; s < slices; s++) {
    const a0 = sweep - (s / slices) * span;
    const a1 = sweep - ((s + 1) / slices) * span;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * base, cy + Math.sin(a0) * base);
    ctx.lineTo(cx + Math.cos(a0) * beamR, cy + Math.sin(a0) * beamR);
    ctx.lineTo(cx + Math.cos(a1) * beamR, cy + Math.sin(a1) * beamR);
    ctx.lineTo(cx + Math.cos(a1) * base, cy + Math.sin(a1) * base);
    ctx.closePath();
    ctx.fillStyle = rgba(colAt(f, 0.2), Math.pow(1 - s / slices, 1.4) * 0.3 * fin.alpha * (0.7 + f.energy));
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(sweep) * base, cy + Math.sin(sweep) * base);
  ctx.lineTo(cx + Math.cos(sweep) * beamR, cy + Math.sin(sweep) * beamR);
  strokeGlow(f, mixRGB(colAt(f, 0.15), WHITE, 0.4), 1, Math.max(1.6, 2.2 * u), 3.6);

  // Anillos punteados concéntricos que giran en sentidos alternos
  const dashes = [0.45, 0.85, 1.25];
  for (let k = 0; k < dashes.length; k++) {
    ctx.setLineDash([r * 0.03, r * 0.055]);
    ctx.lineDashOffset = t * r * 0.2 * (k % 2 ? -1 : 1);
    ctx.beginPath();
    ctx.arc(cx, cy, base + r * dashes[k] * f.fx.reach, 0, TAU);
    ctx.strokeStyle = rgba(colAt(f, k / 2), (0.3 + f.mids * 0.3) * fin.alpha);
    ctx.lineWidth = Math.max(1, 1.3 * u);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Bisel de marcas: largo = espectro (simétrico), brillo = lo que acaba de pasar el haz
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let j = 0; j < ticks; j++) {
      const th = UP + (j / ticks) * TAU;
      const uu = Math.abs(wrapPi(th - UP)) / Math.PI; // 0 arriba … 1 abajo
      const v = bars.lvl[Math.min(59, Math.floor((1 - uu) * 59))];
      const behind = wrapPi(sweep - th);
      const lit = behind >= 0 && behind < 1.2 ? 1 - behind / 1.2 : 0;
      const isLit = lit > 0.25 || v > 0.55;
      if ((pass === 1) !== isLit) continue;
      const len = r * (0.09 + 0.5 * v * f.fx.formScale + lit * 0.08);
      ctx.moveTo(cx + Math.cos(th) * base, cy + Math.sin(th) * base);
      ctx.lineTo(cx + Math.cos(th) * (base + len), cy + Math.sin(th) * (base + len));
    }
    if (pass === 0) {
      ctx.strokeStyle = rgba(colAt(f, 0.5), 0.5 * fin.alpha);
      ctx.lineWidth = Math.max(1.3, 1.8 * u);
      ctx.stroke();
    } else {
      strokeGlow(f, colAt(f, 0.1), 1, Math.max(1.6, 2.3 * u), 2.8);
    }
  }

  // Blips: cada nota se enciende cuando el haz pasa por su posición y se apaga despacio
  const fade = Math.exp(-e.dt * 1.3);
  for (let k = 0; k < 12; k++) {
    const th = UP + (k / 12) * TAU;
    const behind = wrapPi(sweep - th);
    const glow = behind >= 0 && behind < 0.35 ? 1 - behind / 0.35 : 0;
    rs.blip[k] = Math.max(rs.blip[k] * fade, Math.min(1, f.chroma[k] || 0) * glow);
    const b = rs.blip[k];
    if (b < 0.04) continue;
    const rr = base + r * (0.4 + 0.14 * (k % 3));
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    const s = Math.max(2.2 * u, r * (0.03 + 0.06 * b));
    ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
    ctx.beginPath();
    ctx.arc(x, y, s * 2.2, 0, TAU);
    ctx.fillStyle = rgba(noteColor(f, k), b * 0.22 * fin.alpha);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.fillStyle = rgba(mixRGB(noteColor(f, k), WHITE, 0.5), Math.min(1, b + 0.2) * fin.alpha);
    ctx.fill();
    if (b > 0.5 && tips.length < 4) tips.push({ x, y });
  }

  // Golpe: el bisel se enciende un instante
  if (e.pop > 0.05) {
    ctx.beginPath();
    ctx.arc(cx, cy, base, 0, TAU);
    ctx.strokeStyle = rgba(WHITE, e.pop * 0.6);
    ctx.lineWidth = Math.max(1.5, 2 * u);
    ctx.stroke();
  }

  // ── INTERIOR: tres arcos que giran con el haz + anillo de marcas finas ──
  for (let a = 0; a < 3; a++) {
    const start = sweep + (a / 3) * TAU;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, start - 0.45, start + 0.45);
    strokeGlow(f, colAt(f, 0.3 + a * 0.25), 0.55 + Math.min(1, f.mids) * 0.45, Math.max(1.4, 2 * u), 3);
  }
  ctx.beginPath();
  for (let j = 0; j < 72; j++) {
    const th = (j / 72) * TAU;
    const v = bars.lvl[(j * 7) % 60];
    const len = r * (0.04 + 0.08 * Math.min(1, v));
    ctx.moveTo(cx + Math.cos(th) * r * 0.93, cy + Math.sin(th) * r * 0.93);
    ctx.lineTo(cx + Math.cos(th) * (r * 0.93 - len), cy + Math.sin(th) * (r * 0.93 - len));
  }
  ctx.strokeStyle = rgba(colAt(f, 0.9), (0.5 + f.treble * 0.5) * fin.alpha);
  ctx.lineWidth = Math.max(1, 1.3 * u);
  ctx.stroke();

  ctx.restore();
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   ELECTRO — red de plasma: dos anillos de arcos unidos por zigzags, con rayos hacia afuera
   Exterior: anillo interno de 24 nodos y anillo externo de 12; los arcos saltan entre vecinos (más vivos
   con los agudos), zigzags conectan los nodos fuertes y los rayos parten del anillo externo.
   Interior: borde eléctrico dentro del disco y espinas cortas hacia el centro.
   ══════════════════════════════════════════════════════════════════════════ */
const electro: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const st = state.electro;
  const bars = updateBars(f, state, 12, e.dt);
  const quiet = !f.active;
  const fin = finish(f);

  // Nuevo dibujo de los arcos: con cada golpe y, entre golpes, más rápido cuanto más agudo suena
  const interval = Math.max(0.035, 0.09 - f.treble * 0.05);
  if (!quiet && (f.boom > 0 || t - st.last > interval)) {
    st.seed = (st.seed + 1) % 65536;
    st.last = t;
  }
  const presence = quiet ? 0.5 : Math.min(1, 0.7 + e.env * 0.6 + f.treble * 0.5);
  const NA = 24;
  const NB = 12;
  const RA = e.rb + r * 0.3 + e.pop * r * 0.05;
  const RB = e.rb + r * 0.85 * f.fx.reach + e.pop * r * 0.09;
  const tips: Tip[] = [];

  // Nivel de cada dirección (espectro simétrico, graves abajo) con inclinación que compensa los agudos
  const lvAt = (th: number) => {
    const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
    return Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uu) * 11))] * (1 + 1.8 * (1 - uu)));
  };

  // Nodos: anillo A en [0, NA) y anillo B en [NA, NA+NB)
  for (let i = 0; i < NA; i++) {
    const th = UP + (i / NA) * TAU;
    PX[i] = cx + Math.cos(th) * RA;
    PY[i] = cy + Math.sin(th) * RA;
  }
  for (let j = 0; j < NB; j++) {
    const th = UP + ((j + 0.5) / NB) * TAU;
    PX[NA + j] = cx + Math.cos(th) * RB;
    PY[NA + j] = cy + Math.sin(th) * RB;
  }

  // Polilínea eléctrica entre dos puntos: zigzag perpendicular con abombamiento hacia afuera
  const zig = (ax: number, ay: number, bx: number, by: number, rng: () => number, amp: number, bulge: number, segs: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const mx = (ax + bx) / 2 - cx;
    const my = (ay + by) / 2 - cy;
    const ml = Math.hypot(mx, my) || 1;
    ctx.moveTo(ax, ay);
    for (let s = 1; s < segs; s++) {
      const q = s / segs;
      const j = (rng() - 0.5) * 2 * amp;
      const bump = Math.sin(q * Math.PI) * bulge;
      ctx.lineTo(ax + dx * q + nx * j + (mx / ml) * bump, ay + dy * q + ny * j + (my / ml) * bump);
    }
    ctx.lineTo(bx, by);
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Anillos guía
  for (const R of [RA, RB]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = rgba(colAt(f, 0.5), (0.1 + e.pop * 0.35) * fin.alpha);
    ctx.lineWidth = Math.max(0.8, u);
    ctx.stroke();
  }

  // Arcos entre nodos vecinos de cada anillo (dos pasadas: débiles y fuertes)
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? NA : NB;
      const off = ring === 0 ? 0 : NA;
      const R = ring === 0 ? RA : RB;
      for (let i = 0; i < count; i++) {
        const k = (i + 1) % count;
        const thA = UP + ((i + (ring ? 0.5 : 0)) / count) * TAU;
        const thB = UP + ((k + (ring ? 0.5 : 0)) / count) * TAU;
        const lv = (lvAt(thA) + lvAt(thB)) / 2;
        if ((pass === 1) !== lv > 0.5) continue;
        const rng = mulberry32(st.seed * 7919 + (off + i) * 131 + 7);
        const amp = r * (0.05 + f.treble * 0.13 + e.pop * 0.09) * (ring ? 1.4 : 1);
        zig(PX[off + i], PY[off + i], PX[off + k], PY[off + k], rng, amp, r * 0.06 * (0.3 + lv) * (ring ? 1.6 : 1), ring ? 9 : 7);
      }
    }
    const col = pass === 0 ? colAt(f, 0.25) : mixRGB(colAt(f, 0.6), WHITE, 0.55);
    strokeGlow(f, col, (pass === 0 ? 0.75 : 1) * presence, Math.max(1.2, (pass === 0 ? 1.6 : 2.1) * f.stroke * u), 3.6);
  }

  // Zigzags radiales entre el anillo A y el B en los puntos con más energía: la «red» de plasma
  ctx.beginPath();
  for (let j = 0; j < NB; j++) {
    const th = UP + ((j + 0.5) / NB) * TAU;
    const lv = lvAt(th);
    if (lv < 0.25) continue;
    const i = Math.round(((j + 0.5) / NB) * NA) % NA;
    const rng = mulberry32(st.seed * 6959 + j * 577 + 5);
    zig(PX[i], PY[i], PX[NA + j], PY[NA + j], rng, r * (0.04 + f.treble * 0.1), 0, 6);
  }
  strokeGlow(f, mixRGB(colAt(f, 0.45), WHITE, 0.6), 0.85 * presence, Math.max(1.1, 1.5 * f.stroke * u), 3.4);

  // Rayos hacia afuera desde los nodos del anillo B con más nivel
  ctx.beginPath();
  for (let j = 0; j < NB; j++) {
    const th = UP + ((j + 0.5) / NB) * TAU;
    const v = lvAt(th);
    if (v < 0.3) continue;
    const rng = mulberry32(st.seed * 104729 + j * 977 + 3);
    const length = r * (0.15 + v * 0.95 * f.fx.formScale * f.fx.reach) * (0.7 + 0.3 * presence);
    const amp = r * (0.04 + f.treble * 0.1);
    let lat = 0;
    let ex = PX[NA + j];
    let ey = PY[NA + j];
    ctx.moveTo(ex, ey);
    for (let s = 1; s <= 8; s++) {
      lat = Math.max(-amp * 2, Math.min(amp * 2, lat + (rng() - 0.5) * amp));
      const d = RB + (length * s) / 8;
      const ang = th + lat / d;
      ex = cx + Math.cos(ang) * d;
      ey = cy + Math.sin(ang) * d;
      ctx.lineTo(ex, ey);
    }
    if (tips.length < 4) tips.push({ x: ex, y: ey });
  }
  strokeGlow(f, mixRGB(colAt(f, 0.4), WHITE, 0.7), presence, Math.max(1.4, 1.9 * f.stroke * u), 4);

  // Nodos: puntos que crecen con el nivel de su zona del espectro
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let i = 0; i < NA + NB; i++) {
    const th = i < NA ? UP + (i / NA) * TAU : UP + ((i - NA + 0.5) / NB) * TAU;
    const lv = lvAt(th);
    ctx.beginPath();
    ctx.arc(PX[i], PY[i], Math.max(1.8 * u, r * (0.013 + 0.03 * lv) * (i < NA ? 1 : 1.35)), 0, TAU);
    ctx.fillStyle = rgba(mixRGB(colAt(f, i < NA ? i / NA : (i - NA) / NB), WHITE, 0.5), (0.5 + 0.5 * lv) * presence * fin.alpha);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ── INTERIOR: borde eléctrico dentro del disco + espinas hacia el centro ──
  const rngIn = mulberry32(st.seed * 6151 + 11);
  ctx.beginPath();
  const pts = 56;
  for (let q = 0; q <= pts; q++) {
    const th = (q / pts) * TAU;
    const jit = (rngIn() - 0.5) * 2 * r * (0.014 + f.treble * 0.055);
    const rr = r * 0.86 + jit;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (q === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  strokeGlow(f, colAt(f, 0.8), (0.6 + f.mids * 0.4) * presence, Math.max(1.2, 1.6 * u), 3);

  ctx.beginPath();
  for (let sp = 0; sp < 10; sp++) {
    const th = (sp / 10) * TAU + st.seed * 0.37;
    let x = cx + Math.cos(th) * r * 0.9;
    let y = cy + Math.sin(th) * r * 0.9;
    ctx.moveTo(x, y);
    for (let q = 1; q <= 4; q++) {
      const d = r * (0.9 - 0.045 * q * (0.6 + f.mids));
      const jit = (rngIn() - 0.5) * r * 0.05;
      x = cx + Math.cos(th) * d - Math.sin(th) * jit;
      y = cy + Math.sin(th) * d + Math.cos(th) * jit;
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = rgba(mixRGB(colAt(f, 0.5), WHITE, 0.5), (0.4 + f.treble * 0.5) * presence * fin.alpha);
  ctx.lineWidth = Math.max(0.9, 1.1 * u);
  ctx.stroke();

  ctx.restore();
  return tips;
};

export const CUSTOM_FORMS: Record<string, FormDrawer> = {
  spectrum,
  wave,
  particles,
  geometry,
  radar,
  electro,
  ...MORE_FORMS,
};

