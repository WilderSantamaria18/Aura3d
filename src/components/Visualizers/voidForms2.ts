/**
 * Segundo grupo de formas del contorno (mismas reglas de diseño que voidForms.ts):
 *   exterior + capa interior dentro del disco, dinámica de ecualizador, color barrido por espectro o ángulo,
 *   muchos elementos en pocos trazados y cero asignaciones por frame.
 *
 *   Láser        haces que se abren en tijera con el golpe; su largo sigue el espectro
 *   Espirógrafo  curvas guilloché que se funden de un patrón al siguiente con la energía
 *   Túnel        anillos que nacen con el golpe y viajan afuera llevando una «foto» del espectro
 *   Panal        celdas hexagonales que se encienden por zona del espectro y se contagian con el bombo
 *   Espiral      brazos de barras en espiral: graves al centro, agudos en la punta
 */

import {
  COLOR_BUCKETS,
  TAU,
  TUNNEL_RINGS,
  TUNNEL_SNAP,
  UP,
  WHITE,
  clampInt,
  colAt,
  finish,
  mixRGB,
  noteColor,
  rad,
  rgba,
  strokeGlow,
  updateBars,
  wrapPi,
  type FormEnvelope,
  type Tip,
  type VoidFxFrame,
  type VoidFxState,
} from './voidFxKit';

type FormDrawer = (f: VoidFxFrame, state: VoidFxState, e: FormEnvelope) => Tip[];

/* ══════════════════════════════════════════════════════════════════════════
   LÁSER — haces que se abren en tijera con cada golpe
   Exterior: N haces cuyo largo sigue el espectro (simétrico), con chispa en la punta.
   Interior: rayos cortos que giran al revés dentro del disco.
   ══════════════════════════════════════════════════════════════════════════ */
const laser: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const n = clampInt(f.fx.count, 6, 24) & ~1;
  const half = n / 2;
  const bars = updateBars(f, state, half, e.dt);
  const fin = finish(f);

  const base = e.rb + r * 0.02;
  // Apertura en tijera: oscila despacio y el golpe abre el abanico de golpe
  const fan = Math.sin(t * 0.5) * 0.3 + e.pop * 0.55;
  const spin = t * 0.12 + rad(f.angleDeg) * 0.02;
  const maxLen = r * f.fx.formScale * 2.0 * f.fx.reach;
  const tips: Tip[] = [];

  ctx.save();
  ctx.lineCap = 'round';

  // Anillo base
  ctx.beginPath();
  ctx.arc(cx, cy, base, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.5), 0.18 + e.pop * 0.5);
  ctx.lineWidth = Math.max(1, u);
  ctx.stroke();

  // Haces por cubos de color
  for (let g = 0; g < COLOR_BUCKETS; g++) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < n; i++) {
      if (Math.floor((i / n) * COLOR_BUCKETS) !== g) continue;
      any = true;
      const dir = i % 2 ? -1 : 1;
      const ang = UP + (i / n) * TAU + spin + dir * fan * (0.6 + 0.4 * (i / n));
      // Simetría del espectro: el haz i y su espejo comparten nivel
      const lvl = bars.lvl[Math.min(half - 1, Math.floor((Math.abs(i - half) / half) * (half - 1)))];
      const len = r * 0.25 + maxLen * Math.min(1.2, lvl * 0.9 + f.energy * 0.25 + e.pop * 0.3);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      ctx.moveTo(cx + c * base, cy + s * base);
      ctx.lineTo(cx + c * (base + len), cy + s * (base + len));
      if (tips.length < 4 && i % Math.max(1, Math.floor(n / 4)) === 0) tips.push({ x: cx + c * (base + len), y: cy + s * (base + len) });
    }
    if (any) strokeGlow(f, colAt(f, (g + 0.5) / COLOR_BUCKETS), 0.95, Math.max(1.4, 2 * f.stroke * u), 3.8);
  }

  // Chispas en las puntas
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  ctx.fillStyle = rgba(WHITE, 0.9 * fin.alpha);
  ctx.beginPath();
  for (const tp of tips) {
    ctx.moveTo(tp.x + Math.max(2, r * 0.02), tp.y);
    ctx.arc(tp.x, tp.y, Math.max(2, r * 0.02), 0, TAU);
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // ── INTERIOR: rayos cortos que giran al revés + anillo punteado ──
  const m = 12;
  ctx.beginPath();
  for (let j = 0; j < m; j++) {
    const ang = -spin * 1.6 + (j / m) * TAU;
    const len = r * (0.12 + 0.3 * Math.min(1, f.mids * 0.8 + bars.lvl[j % half] * 0.4));
    ctx.moveTo(cx + Math.cos(ang) * r * 0.93, cy + Math.sin(ang) * r * 0.93);
    ctx.lineTo(cx + Math.cos(ang) * (r * 0.93 - len), cy + Math.sin(ang) * (r * 0.93 - len));
  }
  strokeGlow(f, colAt(f, 0.85), 0.9, Math.max(1.3, 1.7 * u), 3);

  ctx.setLineDash([r * 0.02, r * 0.045]);
  ctx.lineDashOffset = -t * r * 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.58, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.3), 0.25 + f.treble * 0.45);
  ctx.lineWidth = Math.max(0.9, u);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   ESPIRÓGRAFO — curvas guilloché r = R + A·sin(aθ+φ)·sin(bθ)
   Exterior: dos patrones que se funden de uno al siguiente según avanza el reloj de energía.
   Interior: un guilloché pequeño que gira al revés dentro del disco.
   ══════════════════════════════════════════════════════════════════════════ */
const SPIRO_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [3, 2],
  [3, 4],
  [5, 4],
  [5, 6],
  [2, 3],
  [4, 5],
  [5, 3],
  [7, 6],
];

const spiro: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const sp = state.spiro;
  const bars = updateBars(f, state, 12, e.dt);

  // El reloj avanza con la energía y salta con el golpe; la parte entera elige el patrón, la fraccionaria funde
  sp.clock += e.dt * (f.active ? 0.18 + f.energy * 0.5 : 0.05) + (f.boom > 0 ? 0.3 : 0);
  const whole = Math.floor(sp.clock);
  const frac = sp.clock - whole;
  const ease = frac * frac * (3 - 2 * frac);
  const cur = SPIRO_PAIRS[whole % SPIRO_PAIRS.length];
  const next = SPIRO_PAIRS[(whole + 1) % SPIRO_PAIRS.length];

  // Nivel medio del espectro: una sola cifra suave (modular por punto daba un trazo áspero)
  let avg = 0;
  for (let i = 0; i < 12; i++) avg += bars.lvl[i];
  avg = Math.min(1.2, avg / 12);
  const phase = t * 0.6 + f.bass * 1.2 + rad(f.angleDeg) * 0.05;
  const R0 = e.rb + r * 0.95 * f.fx.reach;
  const amp = r * f.fx.formScale * (0.55 + 0.5 * Math.min(1.25, e.life)) + e.pop * r * 0.14;
  const steps = 360;

  ctx.save();
  ctx.lineJoin = 'round';

  const draw = (a: number, b: number, weight: number, scale: number, colX: number, width: number) => {
    if (weight < 0.03) return;
    ctx.beginPath();
    for (let p = 0; p <= steps; p++) {
      const th = (p / steps) * TAU;
      // El patrón «respira» con el nivel medio del audio
      const mod = 1 + 0.3 * avg * Math.sin(th * 2 + t);
      const rr = R0 * scale + amp * scale * Math.sin(a * th + phase) * Math.sin(b * th) * mod;
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    strokeGlow(f, colAt(f, colX), weight * 0.95, Math.max(1.1, width * f.stroke * u), 3.2);
  };
  // Dos escalas por patrón: la exterior gruesa y una interior más fina
  draw(cur[0], cur[1], 1 - ease, 1, 0.1, 2.6);
  draw(next[0], next[1], ease, 1, 0.1, 2.6);
  draw(cur[0], cur[1], (1 - ease) * 0.85, 0.7, 0.55, 1.7);
  draw(next[0], next[1], ease * 0.85, 0.7, 0.55, 1.7);
  draw(cur[0], cur[1], (1 - ease) * 0.6, 1.32, 0.9, 1.1);
  draw(next[0], next[1], ease * 0.6, 1.32, 0.9, 1.1);

  // ── INTERIOR: guilloché pequeño que gira al revés ──
  ctx.beginPath();
  const stepsIn = 240;
  for (let p = 0; p <= stepsIn; p++) {
    const th = (p / stepsIn) * TAU;
    const rr = r * 0.72 + r * (0.1 + 0.12 * f.treble) * Math.sin(3 * th - phase * 1.4) * Math.sin(5 * th + t * 0.3);
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.85), 0.95, Math.max(1.3, 1.8 * u), 2.8);

  ctx.restore();
  return [];
};

/* ══════════════════════════════════════════════════════════════════════════
   TÚNEL — anillos que nacen con el golpe y viajan hacia afuera
   Cada anillo es una «foto» del espectro en el instante del golpe: los tramos graves quedan gruesos y los
   silencios, huecos. Interior: anillos punteados que se contraen hacia dentro y guías en perspectiva.
   ══════════════════════════════════════════════════════════════════════════ */
const tunnel: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const tn = state.tunnel;
  const bars = updateBars(f, state, TUNNEL_SNAP, e.dt);

  const spawn = (strength: number) => {
    tn.cursor = (tn.cursor + 1) % TUNNEL_RINGS;
    tn.born[tn.cursor] = t;
    tn.str[tn.cursor] = Math.min(1, strength);
    for (let i = 0; i < TUNNEL_SNAP; i++) tn.snap[tn.cursor * TUNNEL_SNAP + i] = bars.lvl[i];
  };
  // Un anillo por golpe y, entre golpes, uno cada ~0.5 s mientras suene música
  tn.next -= f.active ? e.dt * (1.6 + f.energy * 2.2) : 0;
  if (f.boom > 0) {
    spawn(Math.max(0.45, f.boom));
    tn.next = 0.35;
  } else if (f.active && tn.next <= 0) {
    spawn(0.35 + f.energy * 0.35);
    tn.next = 0.5;
  }

  const segments = 96;
  ctx.save();
  ctx.lineCap = 'round';

  for (let c = 0; c < TUNNEL_RINGS; c++) {
    const born = tn.born[c];
    if (born <= 0) continue;
    const age = t - born;
    const str = tn.str[c];
    const life = 1.15 + str * 0.45;
    if (age < 0 || age > life) continue;
    const k = age / life;
    const ease = 1 - Math.pow(1 - k, 2.2);
    const R = e.rb + r * (0.12 + ease * 2.3 * f.fx.reach * (0.7 + 0.3 * str));
    const alpha = Math.pow(1 - k, 0.85) * (0.6 + 0.4 * str);

    ctx.beginPath();
    for (let s = 0; s < segments; s++) {
      const th = UP + ((s + 0.5) / segments) * TAU;
      const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
      const v = tn.snap[c * TUNNEL_SNAP + Math.floor((1 - uu) * (TUNNEL_SNAP - 1))];
      const w = (TAU / segments) * 0.5 * (0.25 + 0.9 * Math.min(1.2, v));
      ctx.moveTo(cx + Math.cos(th - w) * R, cy + Math.sin(th - w) * R);
      ctx.arc(cx, cy, R, th - w, th + w);
    }
    strokeGlow(f, colAt(f, k), alpha, Math.max(1.4, (2.4 + str * 3) * (1 - k * 0.55) * f.stroke * u), 3);
  }

  // Anillo base
  ctx.beginPath();
  ctx.arc(cx, cy, e.rb, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.5), 0.16 + e.pop * 0.5);
  ctx.lineWidth = Math.max(1, u);
  ctx.stroke();

  // ── INTERIOR: anillos punteados que se contraen + guías en perspectiva ──
  for (let q = 0; q < 3; q++) {
    ctx.setLineDash([r * 0.03, r * 0.05]);
    ctx.lineDashOffset = t * r * 0.2 * (q % 2 ? -1 : 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.88 - q * 0.14) * (1 - e.pop * 0.03), 0, TAU);
    ctx.strokeStyle = rgba(colAt(f, 0.3 + q * 0.3), 0.3 + e.pop * 0.5 + f.mids * 0.2);
    ctx.lineWidth = Math.max(0.9, 1.3 * u);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let g = 0; g < 16; g++) {
    const th = (g / 16) * TAU + t * 0.05;
    ctx.moveTo(cx + Math.cos(th) * r * 0.94, cy + Math.sin(th) * r * 0.94);
    ctx.lineTo(cx + Math.cos(th) * r * 0.56, cy + Math.sin(th) * r * 0.56);
  }
  ctx.strokeStyle = rgba(colAt(f, 0.8), 0.14 + f.treble * 0.25);
  ctx.lineWidth = Math.max(0.7, 0.9 * u);
  ctx.stroke();

  ctx.restore();
  return [];
};

/* ══════════════════════════════════════════════════════════════════════════
   PANAL — celdas hexagonales alrededor del disco
   Cada celda se enciende según la zona del espectro de su ángulo; el golpe lanza una onda que se contagia
   celda a celda hacia afuera. Interior: 12 hexágonos pequeños, uno por nota.
   ══════════════════════════════════════════════════════════════════════════ */
const hive: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const bars = updateBars(f, state, 30, e.dt);
  const fin = finish(f);
  const rings = clampInt(f.fx.count, 2, 4);

  const s = r * 0.3; // radio de cada hexágono
  const minD = e.rb + r * 0.14;
  const maxD = e.rb + r * (0.4 + rings * 0.55) * f.fx.reach;
  const rot = t * 0.05 + rad(f.angleDeg) * 0.02;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const front = minD + (1 - e.pop) * (maxD - minD); // frente de la onda del golpe
  const tips: Tip[] = [];

  // Buckets de brillo: apagada, tenue, viva y encendida. Cada bucket es un trazado y un relleno.
  const buckets: Array<{ v0: number; v1: number; fill: number; stroke: number }> = [
    { v0: -1, v1: 0.15, fill: 0, stroke: 0.22 },
    { v0: 0.15, v1: 0.45, fill: 0.12, stroke: 0.45 },
    { v0: 0.45, v1: 0.8, fill: 0.3, stroke: 0.75 },
    { v0: 0.8, v1: 9, fill: 0.55, stroke: 1 },
  ];

  ctx.save();
  ctx.lineJoin = 'round';

  for (let b = 0; b < buckets.length; b++) {
    const bk = buckets[b];
    ctx.beginPath();
    let any = false;
    for (let q = -7; q <= 7; q++) {
      for (let rr = -7; rr <= 7; rr++) {
        // Coordenadas axiales → centro de celda; después se gira el panal entero
        const px0 = s * Math.sqrt(3) * (q + rr / 2);
        const py0 = s * 1.5 * rr;
        const dx = px0 * cosR - py0 * sinR;
        const dy = px0 * sinR + py0 * cosR;
        const d = Math.hypot(dx, dy);
        if (d < minD || d > maxD) continue;

        const th = Math.atan2(dy, dx);
        const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
        const falloff = 1 - ((d - minD) / (maxD - minD)) * 0.45;
        const wave = Math.exp(-(((d - front) / (s * 1.3)) ** 2)) * e.pop;
        const v = Math.min(1.3, bars.lvl[Math.min(29, Math.floor((1 - uu) * 29))] * falloff + wave * 0.9);
        if (!(v > bk.v0 && v <= bk.v1)) continue;

        any = true;
        // La celda respira: pequeña en silencio (queda una rejilla de puntos) y casi llena cuando suena
        const cs = s * (0.4 + 0.52 * Math.min(1, v)) + s * 0.08 * wave;
        for (let k = 0; k < 6; k++) {
          const a = rot + (k * Math.PI) / 3 + Math.PI / 6;
          const x = cx + dx + Math.cos(a) * cs;
          const y = cy + dy + Math.sin(a) * cs;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (b === 3 && tips.length < 4) tips.push({ x: cx + dx, y: cy + dy });
      }
    }
    if (!any) continue;
    const col = colAt(f, b / (buckets.length - 1));
    if (bk.fill > 0) {
      ctx.fillStyle = rgba(col, bk.fill * fin.alpha);
      ctx.fill();
    }
    strokeGlow(f, col, bk.stroke, Math.max(0.9, (0.9 + b * 0.4) * f.stroke * u), b >= 2 ? 3 : 1.6);
  }

  // ── INTERIOR: 12 hexágonos pequeños, uno por nota, en un anillo dentro del disco ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let k = 0; k < 12; k++) {
    const nv = Math.min(1, f.chroma[k] || 0);
    const th = UP + (k / 12) * TAU - t * 0.08;
    const hx = cx + Math.cos(th) * r * 0.76;
    const hy = cy + Math.sin(th) * r * 0.76;
    const hs = r * (0.06 + 0.05 * nv);
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = th + (j * Math.PI) / 3;
      const x = hx + Math.cos(a) * hs;
      const y = hy + Math.sin(a) * hs;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(mixRGB(noteColor(f, k), WHITE, 0.3 + nv * 0.4), (0.12 + 0.6 * nv) * fin.alpha);
    ctx.fill();
    ctx.strokeStyle = rgba(noteColor(f, k), (0.4 + 0.6 * nv) * fin.alpha);
    ctx.lineWidth = Math.max(0.9, 1.2 * u);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
  return tips;
};

/* ══════════════════════════════════════════════════════════════════════════
   ESPIRAL — brazos de barras en espiral
   Exterior: cada brazo es una espiral de barras radiales (graves cerca del disco, agudos en la punta).
   Interior: una espiral de puntos que se enrolla hacia el centro, en sentido contrario.
   ══════════════════════════════════════════════════════════════════════════ */
const spiral: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const arms = clampInt(f.fx.count, 1, 4);
  const M = 56;
  const bars = updateBars(f, state, M, e.dt);
  const fin = finish(f);

  const spin = t * 0.3 + rad(f.angleDeg) * 0.02 + e.pop * 0.25;
  const wind = 3.6 + f.mids * 0.8;
  const Lmax = r * f.fx.formScale * 2.2 * f.fx.reach;
  const tips: Tip[] = [];

  ctx.save();
  ctx.lineCap = 'round';

  for (let a = 0; a < arms; a++) {
    const base = spin + (a / arms) * TAU;

    // Hilo guía: la espiral completa, fina, para que el brazo se lea como una curva continua
    ctx.beginPath();
    for (let i = 0; i <= M; i++) {
      const s = i / M;
      const rr = e.rb + r * 0.1 + s * Lmax;
      const ang = base + s * wind;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(colAt(f, 0.5), (0.16 + e.pop * 0.3) * fin.alpha);
    ctx.lineWidth = Math.max(0.8, u);
    ctx.stroke();

    for (let g = 0; g < COLOR_BUCKETS; g++) {
      const lo = Math.floor((g * M) / COLOR_BUCKETS);
      const hi = Math.floor(((g + 1) * M) / COLOR_BUCKETS);
      if (hi <= lo) continue;
      ctx.beginPath();
      for (let i = lo; i < hi; i++) {
        const s = (i + 0.5) / M;
        const rr = e.rb + r * 0.1 + s * Lmax;
        const ang = base + s * wind;
        const len = r * (0.06 + 0.46 * Math.min(1.25, bars.lvl[i] + e.pop * 0.25) * (0.55 + 0.9 * s));
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        ctx.moveTo(cx + c * rr, cy + sn * rr);
        ctx.lineTo(cx + c * (rr + len), cy + sn * (rr + len));
        if (i === M - 1 && tips.length < 4) tips.push({ x: cx + c * (rr + len), y: cy + sn * (rr + len) });
      }
      strokeGlow(f, colAt(f, (g + 0.5) / COLOR_BUCKETS), 0.98, Math.max(1.8, 3 * f.stroke * u), 3);
    }
  }

  // ── INTERIOR: espiral de puntos que se enrolla hacia el centro, en sentido contrario ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  ctx.beginPath();
  const dots = 26;
  for (let a = 0; a < arms; a++) {
    for (let j = 0; j < dots; j++) {
      const s = j / (dots - 1);
      const rr = r * (0.92 - s * 0.38);
      const ang = -spin * 1.4 + s * 3.2 + (a / arms) * TAU;
      const v = Math.min(1, bars.lvl[Math.min(M - 1, Math.floor(s * (M - 1)))]);
      const size = Math.max(1.3 * u, r * (0.01 + 0.022 * v));
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, TAU);
    }
  }
  ctx.fillStyle = rgba(mixRGB(colAt(f, 0.8), WHITE, 0.35), 0.85 * fin.alpha);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
  return tips;
};

export const MORE_FORMS: Record<string, FormDrawer> = {
  laser,
  spiro,
  tunnel,
  hive,
  spiral,
};

