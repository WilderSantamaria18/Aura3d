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

const CAUSTIC_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   LÁSER → CÁUSTICAS PRISMÁTICAS (PRISMATIC CAUSTICS)
   Lente refractiva virtual: luz colimada que se curva en envolventes cáusticas
   con dispersión cromática de Newton, cúspides focales y cámara de reflexión
   interna total (TIR) en contra-rotación.
   ══════════════════════════════════════════════════════════════════════════ */
const laser: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const n = clampInt(f.fx.count, 6, 24) & ~1;
  const half = n / 2;
  const bars = updateBars(f, state, half, e.dt);
  const fin = finish(f);

  const base = e.rb + r * 0.02;
  // Dinámica refractiva elástica: oscilación suave + perturbación por medios y choque del kick
  const fan = Math.sin(t * 0.35) * 0.18 + (f.mids - 0.5) * 0.22 + e.pop * 0.42;
  const spin = t * 0.08 + rad(f.angleDeg) * 0.02;
  const maxLen = r * f.fx.formScale * 1.9 * f.fx.reach;
  const refractK = 0.28 + f.bass * 0.32 + e.pop * 0.45;

  ctx.save();
  ctx.lineCap = 'round';

  // ── Capa 1: Anillo base refractivo (superficie de incidencia del prisma) ──
  ctx.beginPath();
  ctx.arc(cx, cy, base, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.5), (0.22 + e.pop * 0.45) * fin.alpha);
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.stroke();

  // ── Capa 2: Filamentos cáusticos exteriores con dispersión cromática ──
  let tipIdx = 0;
  const step = Math.max(1, Math.floor(n / 4));

  for (let g = 0; g < COLOR_BUCKETS; g++) {
    ctx.beginPath();
    let any = false;

    for (let i = 0; i < n; i++) {
      if (Math.floor((i / n) * COLOR_BUCKETS) !== g) continue;
      any = true;

      const dir = i % 2 === 0 ? 1 : -1;
      const normIdx = i / n;
      const ang = UP + normIdx * TAU + spin + dir * fan * (0.55 + 0.45 * normIdx);

      // Nivel espectral simétrico
      const lvl = bars.lvl[Math.min(half - 1, Math.floor((Math.abs(i - half) / half) * (half - 1)))];
      const len = r * 0.22 + maxLen * Math.min(1.25, lvl * 0.88 + f.energy * 0.22 + e.pop * 0.35);

      // Origen en el prisma
      const c0 = Math.cos(ang);
      const s0 = Math.sin(ang);
      const x0 = cx + c0 * base;
      const y0 = cy + s0 * base;

      // Deflexión tangencial de la cáustica (curvatura refractiva)
      const bend = dir * (0.32 + refractK * 0.55) * (0.6 + 0.4 * lvl);
      const rMid = base + len * 0.52;
      const angMid = ang + bend * 0.55;
      const xc = cx + Math.cos(angMid) * rMid;
      const yc = cy + Math.sin(angMid) * rMid;

      const rEnd = base + len;
      const angEnd = ang + bend;
      const xEnd = cx + Math.cos(angEnd) * rEnd;
      const yEnd = cy + Math.sin(angEnd) * rEnd;

      // 1) Haz cáustico primario
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(xc, yc, xEnd, yEnd);

      // 2) Sub-filamento de dispersión prismática (aberración cromática)
      const bendDisp = bend * 1.25;
      const rEndDisp = base + len * 0.94;
      const angMidDisp = ang + bendDisp * 0.55;
      const angEndDisp = ang + bendDisp;
      const xcDisp = cx + Math.cos(angMidDisp) * rMid;
      const ycDisp = cy + Math.sin(angMidDisp) * rMid;
      const xEndDisp = cx + Math.cos(angEndDisp) * rEndDisp;
      const yEndDisp = cy + Math.sin(angEndDisp) * rEndDisp;

      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(xcDisp, ycDisp, xEndDisp, yEndDisp);

      // Registro de cúspides cáusticas (Zero-GC, mutando CAUSTIC_TIPS)
      if (i % step === 0 && tipIdx < 4) {
        CAUSTIC_TIPS[tipIdx].x = xEnd;
        CAUSTIC_TIPS[tipIdx].y = yEnd;
        tipIdx++;
      }
    }

    if (any) {
      strokeGlow(f, colAt(f, (g + 0.5) / COLOR_BUCKETS), 0.94, Math.max(1.3, 1.8 * f.stroke * u), 3.5);
    }
  }

  // Si no se llenaron los 4 tips por paridad, clonar el primero
  while (tipIdx < 4) {
    CAUSTIC_TIPS[tipIdx].x = CAUSTIC_TIPS[0].x;
    CAUSTIC_TIPS[tipIdx].y = CAUSTIC_TIPS[0].y;
    tipIdx++;
  }

  // ── Capa 3: Cúspides fotónicas y destellos en los ápices (Highlights) ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  ctx.fillStyle = rgba(WHITE, 0.95 * fin.alpha);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const tp = CAUSTIC_TIPS[k];
    const tipR = Math.max(2, r * (0.016 + 0.02 * e.pop));
    ctx.moveTo(tp.x + tipR, tp.y);
    ctx.arc(tp.x, tp.y, tipR, 0, TAU);
  }
  ctx.fill();

  // Micro-destello en cruz en los ápices con alta energía
  if (f.energy > 0.35 || e.pop > 0.2) {
    ctx.strokeStyle = rgba(WHITE, 0.75 * fin.alpha);
    ctx.lineWidth = Math.max(0.8, u);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const tp = CAUSTIC_TIPS[k];
      const flare = Math.max(3, r * (0.025 + 0.035 * e.pop));
      ctx.moveTo(tp.x - flare, tp.y);
      ctx.lineTo(tp.x + flare, tp.y);
      ctx.moveTo(tp.x, tp.y - flare);
      ctx.lineTo(tp.x, tp.y + flare);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ── Capa 4: Cámara de Reflexión Interna Total (TIR Inner Layer) ──
  // Confinada entre 0.56·r y 0.88·r (seguridad total para el centro > 0.55·r y test > 0.45·r)
  const m = 14;
  ctx.beginPath();
  for (let j = 0; j < m; j++) {
    const ang0 = -spin * 1.5 + (j / m) * TAU;
    const r1 = r * 0.88;
    const chordLen = r * (0.16 + 0.16 * Math.min(1, f.mids * 0.75 + bars.lvl[j % half] * 0.35));
    const r0 = r1 - chordLen; // entre r * 0.56 y r * 0.72

    const xA = cx + Math.cos(ang0) * r1;
    const yA = cy + Math.sin(ang0) * r1;

    const ang1 = ang0 + 0.28 + 0.12 * Math.sin(j * 1.2 + t * 0.6);
    const xB = cx + Math.cos(ang1) * r0;
    const yB = cy + Math.sin(ang1) * r0;

    ctx.moveTo(xA, yA);
    ctx.lineTo(xB, yB);
  }
  strokeGlow(f, colAt(f, 0.82), 0.88, Math.max(1.1, 1.5 * u), 2.8);

  // Anillo concéntrico de refracción interna
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.68 + 0.04 * Math.sin(t * 1.2 + f.energy)), 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.28), (0.22 + f.treble * 0.4) * fin.alpha);
  ctx.lineWidth = Math.max(0.8, u);
  ctx.stroke();

  ctx.restore();
  return CAUSTIC_TIPS;
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

const HORIZON_TIPS: Tip[] = [];

/* ══════════════════════════════════════════════════════════════════════════
   TÚNEL → HORIZONTE DE SUCESOS (EVENT HORIZON)
   Lente gravitacional relativista: ondas espaciotemporales con arrastre de
   marco de Kerr (frame dragging), anillos de Einstein deformados por el
   espectro acústico, fotósfera cuántica y geodésicas de acreción interna.
   ══════════════════════════════════════════════════════════════════════════ */
const tunnel: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const tn = state.tunnel;
  const bars = updateBars(f, state, TUNNEL_SNAP, e.dt);
  const fin = finish(f);

  const spawn = (strength: number) => {
    tn.cursor = (tn.cursor + 1) % TUNNEL_RINGS;
    tn.born[tn.cursor] = t;
    tn.str[tn.cursor] = Math.min(1, strength);
    for (let i = 0; i < TUNNEL_SNAP; i++) tn.snap[tn.cursor * TUNNEL_SNAP + i] = bars.lvl[i];
  };

  // Dinámica de propagación de ondas gravitacionales: transitorio del kick o reloj armónico continuo
  tn.next -= f.active ? e.dt * (1.6 + f.energy * 2.2) : 0;
  if (f.boom > 0) {
    spawn(Math.max(0.45, f.boom));
    tn.next = 0.35;
  } else if (f.active && tn.next <= 0) {
    spawn(0.35 + f.energy * 0.35);
    tn.next = 0.5;
  }

  const spin = t * 0.14 + rad(f.angleDeg) * 0.02;
  const segments = 64;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── Capa 1: Fotósfera / Anillo de Fotones (Photon Sphere en el horizonte) ──
  ctx.beginPath();
  const pSteps = 48;
  for (let p = 0; p <= pSteps; p++) {
    const th = (p / pSteps) * TAU;
    // Fluctuación cuántica de vacío y perturbación de órbita fotónica
    const pr = e.rb * (1 + 0.018 * Math.sin(4 * th + t * 2.2) * (0.4 + f.treble * 0.6) - e.pop * 0.022);
    const x = cx + Math.cos(th) * pr;
    const y = cy + Math.sin(th) * pr;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(mixRGB(colAt(f, 0.5), WHITE, 0.4), 0.3 + e.pop * 0.55);
  ctx.lineWidth = Math.max(1.1, 1.4 * u);
  ctx.stroke();

  // ── Capa 2: Frentes de onda geodésicos relativistas (Anillos de Einstein) ──
  for (let c = 0; c < TUNNEL_RINGS; c++) {
    const born = tn.born[c];
    if (born <= 0) continue;
    const age = t - born;
    const str = tn.str[c];
    const life = 1.15 + str * 0.45;
    if (age < 0 || age > life) continue;

    const k = age / life;
    // Expansión acelerada relativista
    const ease = 1 - Math.pow(1 - k, 2.2);
    const baseR = e.rb + r * (0.12 + ease * 2.3 * f.fx.reach * (0.7 + 0.3 * str));
    const alpha = Math.pow(1 - k, 0.85) * (0.6 + 0.4 * str) * fin.alpha;

    // Arrastre espaciotemporal (Lense-Thirring): velocidad angular aumenta cerca de la singularidad
    const drag = spin + (1 - k) * 0.45;

    ctx.beginPath();
    for (let s = 0; s <= segments; s++) {
      const th = (s / segments) * TAU;
      // Deformación cuadrupolar gravitacional de Einstein
      const warp = 1 + 0.075 * (1 - k * 0.4) * Math.cos(2 * (th - drag))
                     + 0.045 * f.mids * Math.sin(3 * th + t * 0.6);

      // Modulación espectral del frente de onda según la instantánea grabada
      const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
      const snapIdx = Math.floor((1 - uu) * (TUNNEL_SNAP - 1));
      const v = tn.snap[c * TUNNEL_SNAP + snapIdx];
      const rMod = 1 + 0.14 * Math.min(1.2, v);

      const currR = baseR * warp * rMod;
      const x = cx + Math.cos(th) * currR;
      const y = cy + Math.sin(th) * currR;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    strokeGlow(
      f,
      colAt(f, (k + c * 0.08) % 1.0),
      alpha,
      Math.max(1.2, (2.2 + str * 2.8) * (1 - k * 0.5) * f.stroke * u),
      3.2
    );
  }

  // ── Capa 3: Cámara de Curvatura Interior (Geodésicas de Infalling Matter y Ergosfera) ──
  // Confinada estrictamente entre 0.58·r y 0.88·r (protección absoluta de la zona central < 0.55·r)
  const m = 16;
  ctx.beginPath();
  for (let g = 0; g < m; g++) {
    const th0 = (g / m) * TAU - spin * 1.4;
    const rOut = r * 0.88;
    const xA = cx + Math.cos(th0) * rOut;
    const yA = cy + Math.sin(th0) * rOut;

    // Torsión tangencial geodésica hacia el horizonte interno
    const rIn = r * (0.60 - 0.04 * e.pop);
    const th1 = th0 + 0.42 + 0.12 * Math.sin(g * 0.8 + t * 0.5);
    const xB = cx + Math.cos(th1) * rIn;
    const yB = cy + Math.sin(th1) * rIn;

    ctx.moveTo(xA, yA);
    ctx.lineTo(xB, yB);
  }
  strokeGlow(f, colAt(f, 0.82), 0.75, Math.max(0.9, 1.2 * u), 2.5);

  // Anillo interior elíptico de la ergosfera
  ctx.beginPath();
  const inSteps = 32;
  for (let q = 0; q <= inSteps; q++) {
    const th = (q / inSteps) * TAU;
    const rErgo = r * (0.72 + 0.045 * Math.sin(2 * th - t * 0.8) + 0.03 * f.mids);
    const x = cx + Math.cos(th) * rErgo;
    const y = cy + Math.sin(th) * rErgo;
    if (q === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(colAt(f, 0.35), 0.22 + f.treble * 0.35 + e.pop * 0.3);
  ctx.lineWidth = Math.max(0.9, 1.2 * u);
  ctx.stroke();

  ctx.restore();
  return HORIZON_TIPS;
};

const TESSELLATION_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   PANAL → TESELACIÓN LÍQUIDA (LIQUID TESSELLATION)
   Membrana elástica de celdas celulares con tensión superficial de Plateau,
   propagación peristáltica de energía entre celdas vecinas, deformación
   viscoelástica y vesículas interiores resonantes con el cromagrama.
   ══════════════════════════════════════════════════════════════════════════ */
const hive: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const bars = updateBars(f, state, 30, e.dt);
  const fin = finish(f);
  const rings = clampInt(f.fx.count, 2, 4);

  const base = e.rb + r * 0.02;
  const rot = t * 0.06 + rad(f.angleDeg) * 0.02;
  let tipIdx = 0;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ── Capa 1: Anillo de membrana base (tensión superficial interior) ──
  ctx.beginPath();
  ctx.arc(cx, cy, base, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.5), 0.2 + e.pop * 0.45);
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.stroke();

  // ── Capa 2: Celosía líquida exterior (membrana celular elástica) ──
  // Cada anillo polar divide la superficie en celdas deformables con bordes curvos
  for (let ringIdx = 0; ringIdx < rings; ringIdx++) {
    const sR = (ringIdx + 0.5) / rings;
    const rSpan = r * (0.18 + 0.06 * f.bass) * f.fx.reach * f.fx.formScale;
    const rMid = base + r * (0.16 + sR * 0.8 * f.fx.reach * f.fx.formScale);
    const r0 = rMid - rSpan * 0.48;
    const r1 = rMid + rSpan * 0.48;

    const numCells = 12 + ringIdx * 6; // celdas adaptativas por anillo
    const dTh = TAU / numCells;
    const ringOffset = (ringIdx % 2) * (dTh * 0.5);

    for (let c = 0; c < numCells; c++) {
      const thC = rot + c * dTh + ringOffset;
      const uu = Math.abs(wrapPi(thC - UP)) / Math.PI;
      const specIdx = Math.min(29, Math.floor((1 - uu) * 29));
      const localLvl = bars.lvl[specIdx];

      // Transferencia elástica vecinal (diferencial con la celda adyacente)
      const nextIdx = Math.min(29, (specIdx + 1) % 30);
      const adjLvl = bars.lvl[nextIdx];
      const shear = (localLvl - adjLvl) * 0.35;

      // Onda de propagación peristáltica continua
      const phase = thC * 3 - t * 1.8 + sR * 2.2;
      const wave = Math.sin(phase) * (0.08 + 0.12 * f.mids) + e.pop * Math.cos(phase * 0.5) * 0.18;

      // Presión hidrostática de la celda (turgencia)
      const pressure = Math.max(0.12, Math.min(1.4, 0.28 + localLvl * 0.78 + wave + f.energy * 0.2 + e.pop * 0.35));

      // Vértices de la celda líquida con deformación tangencial
      const thL = thC - dTh * 0.42 * (1 - 0.2 * shear);
      const thR = thC + dTh * 0.42 * (1 + 0.2 * shear);
      const rIn = r0 - rSpan * 0.2 * (pressure - 0.5);
      const rOut = r1 + rSpan * 0.24 * (pressure - 0.5);

      const cosL = Math.cos(thL);
      const sinL = Math.sin(thL);
      const cosR = Math.cos(thR);
      const sinR = Math.sin(thR);
      const cosC = Math.cos(thC);
      const sinC = Math.sin(thC);

      // Puntos esquina
      const x0 = cx + cosL * rIn;
      const y0 = cy + sinL * rIn;
      const x1 = cx + cosR * rIn;
      const y1 = cy + sinR * rIn;
      const x2 = cx + cosR * rOut;
      const y2 = cy + sinR * rOut;
      const x3 = cx + cosL * rOut;
      const y3 = cy + sinL * rOut;

      // Puntos de control de membrana curva
      const xcIn = cx + cosC * (rIn - rSpan * 0.12 * pressure);
      const ycIn = cy + sinC * (rIn - rSpan * 0.12 * pressure);
      const xcOut = cx + cosC * (rOut + rSpan * 0.16 * pressure);
      const ycOut = cy + sinC * (rOut + rSpan * 0.16 * pressure);

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(xcIn, ycIn, x1, y1);
      ctx.lineTo(x2, y2);
      ctx.quadraticCurveTo(xcOut, ycOut, x3, y3);
      ctx.closePath();

      const col = colAt(f, (thC / TAU + t * 0.02) % 1.0);
      // Relleno translúcido de la vesícula
      ctx.fillStyle = rgba(col, (0.05 + 0.32 * Math.min(1, pressure)) * fin.alpha);
      ctx.fill();

      // Trazo de pared celular con tensión elástica
      strokeGlow(
        f,
        col,
        (0.35 + 0.65 * Math.min(1, pressure)) * fin.alpha,
        Math.max(0.9, (0.9 + 0.8 * pressure) * f.stroke * u),
        pressure > 0.6 ? 2.8 : 1.5
      );

      // Registro de cúspides de tensión (Zero-GC) en el anillo exterior
      if (ringIdx === rings - 1 && c % Math.max(1, Math.floor(numCells / 4)) === 0 && tipIdx < 4) {
        TESSELLATION_TIPS[tipIdx].x = x2;
        TESSELLATION_TIPS[tipIdx].y = y2;
        tipIdx++;
      }
    }
  }

  // Si no se llenaron los 4 tips, clonar el primero
  while (tipIdx < 4) {
    TESSELLATION_TIPS[tipIdx].x = TESSELLATION_TIPS[0].x;
    TESSELLATION_TIPS[tipIdx].y = TESSELLATION_TIPS[0].y;
    tipIdx++;
  }

  // ── Capa 3: Nodos de Plateau y destellos en cúspides (Highlights) ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  ctx.fillStyle = rgba(WHITE, 0.9 * fin.alpha);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const tp = TESSELLATION_TIPS[k];
    const nodeR = Math.max(2, r * (0.015 + 0.02 * e.pop));
    ctx.moveTo(tp.x + nodeR, tp.y);
    ctx.arc(tp.x, tp.y, nodeR, 0, TAU);
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // ── Capa 4: Núcleo Vesicular Interior (Chroma Vesicles) ──
  // Confinado estrictamente en [0.62·r, 0.86·r] (seguridad absoluta > 0.55·r y test > 0.45·r)
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let k = 0; k < 12; k++) {
    const nv = Math.min(1, f.chroma[k] || 0);
    const thK = UP + (k / 12) * TAU - t * 0.08;
    const rVesicle = r * 0.74;
    const hx = cx + Math.cos(thK) * rVesicle;
    const hy = cy + Math.sin(thK) * rVesicle;
    const hs = r * (0.05 + 0.045 * nv + 0.015 * e.pop);

    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = thK + (j * Math.PI) / 3;
      // Membrana vesical elástica con ondulación armónica
      const rJ = hs * (1 + 0.16 * Math.sin(3 * a + t * 1.5 + nv));
      const x = hx + Math.cos(a) * rJ;
      const y = hy + Math.sin(a) * rJ;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const noteC = noteColor(f, k);
    ctx.fillStyle = rgba(mixRGB(noteC, WHITE, 0.25 + nv * 0.4), (0.12 + 0.55 * nv) * fin.alpha);
    ctx.fill();
    ctx.strokeStyle = rgba(noteC, (0.45 + 0.55 * nv) * fin.alpha);
    ctx.lineWidth = Math.max(0.9, 1.2 * u);
    ctx.stroke();

    // Puentes de tensión entre vesículas adyacentes
    const thNext = UP + ((k + 1) / 12) * TAU - t * 0.08;
    const nextHx = cx + Math.cos(thNext) * rVesicle;
    const nextHy = cy + Math.sin(thNext) * rVesicle;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(nextHx, nextHy);
    ctx.strokeStyle = rgba(noteC, 0.25 * (1 + nv) * fin.alpha);
    ctx.lineWidth = Math.max(0.8, u);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
  return TESSELLATION_TIPS;
};

const GOLDEN_FLOW_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   ESPIRAL → FLUJO DORADO (GOLDEN FLOW)
   Corrientes laminares fluidas en proporción áurea (espiral logarítmica de
   Bernoulli/Fibonacci), bifurcación de plasma, sub-filamentos helicoidales
   entrelazados y vórtice interior en contra-rotación.
   ══════════════════════════════════════════════════════════════════════════ */
const spiral: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const arms = clampInt(f.fx.count, 1, 4);
  const M = 48;
  const bars = updateBars(f, state, M, e.dt);
  const fin = finish(f);

  const spin = t * 0.16 + rad(f.angleDeg) * 0.02 + e.pop * 0.15;
  const wind = 2.8 + f.mids * 0.75;
  const Lmax = r * f.fx.formScale * 2.0 * f.fx.reach * (0.85 + 0.3 * f.bass);
  let tipIdx = 0;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── Capa 1: Anillo de manantial base ──
  ctx.beginPath();
  ctx.arc(cx, cy, e.rb, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.5), (0.2 + e.pop * 0.45) * fin.alpha);
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.stroke();

  // ── Capa 2: Corrientes troncales doradas y Capa 3: Sub-filamentos helicoidales ──
  for (let a = 0; a < arms; a++) {
    const baseAng = spin + (a / arms) * TAU;
    const colA = colAt(f, (a / arms + 0.1) % 1.0);
    const colB = colAt(f, (a / arms + 0.5) % 1.0);

    // 1) Corriente troncal principal (Laminar Core Stream)
    ctx.beginPath();
    for (let i = 0; i <= M; i++) {
      const s = i / M;
      const lvl = bars.lvl[i];
      const rr = e.rb + r * 0.04 + Math.pow(s, 1.15) * Lmax * (1 + 0.14 * lvl);
      const th = baseAng + s * wind + 0.08 * Math.sin(s * 6 - t * 2.0);
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      // Cúspide terminal en la punta del brazo exterior
      if (i === M && tipIdx < 4) {
        GOLDEN_FLOW_TIPS[tipIdx].x = x;
        GOLDEN_FLOW_TIPS[tipIdx].y = y;
        tipIdx++;
      }
    }
    strokeGlow(f, colA, 0.95, Math.max(1.6, (2.2 + e.pop * 1.5) * f.stroke * u), 3.2);

    // 2) Corriente satélite bifurcada (Bifurcated Stream)
    ctx.beginPath();
    for (let i = 0; i <= M; i++) {
      const s = i / M;
      const lvl = bars.lvl[Math.min(M - 1, i + 2)];
      // Se separa progresivamente formando un canal secundario
      const branchSpread = (0.05 + 0.15 * f.mids) * Math.sin(s * 7 - t * 2.4);
      const rr = e.rb + r * 0.04 + Math.pow(s, 1.22) * Lmax * (1 + 0.18 * lvl);
      const th = baseAng + s * wind - branchSpread;
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    strokeGlow(f, colB, 0.75, Math.max(0.9, 1.3 * f.stroke * u), 2.0);

    // 3) Filamentos de turbulencia y remolinos entre ambas corrientes
    ctx.beginPath();
    for (let i = 4; i < M; i += 4) {
      const s = i / M;
      const lvl = bars.lvl[i];
      const rr1 = e.rb + r * 0.04 + Math.pow(s, 1.15) * Lmax * (1 + 0.14 * lvl);
      const th1 = baseAng + s * wind + 0.08 * Math.sin(s * 6 - t * 2.0);
      const x1 = cx + Math.cos(th1) * rr1;
      const y1 = cy + Math.sin(th1) * rr1;

      const branchSpread = (0.05 + 0.15 * f.mids) * Math.sin(s * 7 - t * 2.4);
      const rr2 = e.rb + r * 0.04 + Math.pow(s, 1.22) * Lmax * (1 + 0.18 * lvl);
      const th2 = baseAng + s * wind - branchSpread;
      const x2 = cx + Math.cos(th2) * rr2;
      const y2 = cy + Math.sin(th2) * rr2;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = rgba(mixRGB(colA, WHITE, 0.35), (0.3 + 0.4 * f.treble) * fin.alpha);
    ctx.lineWidth = Math.max(0.8, u);
    ctx.stroke();
  }

  // Si no se llenaron los 4 tips, clonar el primero
  while (tipIdx < 4) {
    GOLDEN_FLOW_TIPS[tipIdx].x = GOLDEN_FLOW_TIPS[0].x;
    GOLDEN_FLOW_TIPS[tipIdx].y = GOLDEN_FLOW_TIPS[0].y;
    tipIdx++;
  }

  // ── Capa 3: Cúspides fotónicas en las puntas (Highlights) ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  ctx.fillStyle = rgba(WHITE, 0.95 * fin.alpha);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const tp = GOLDEN_FLOW_TIPS[k];
    const tipR = Math.max(2, r * (0.016 + 0.02 * e.pop));
    ctx.moveTo(tp.x + tipR, tp.y);
    ctx.arc(tp.x, tp.y, tipR, 0, TAU);
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // ── Capa 4: Vórtice Interior Contra-Rotante (Inner Golden Vortex) ──
  // Confinado estrictamente entre [0.60·r, 0.88·r] (seguridad absoluta > 0.55·r y test > 0.45·r)
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  const dots = 22;
  for (let a = 0; a < arms; a++) {
    const colArm = colAt(f, (a / arms + 0.7) % 1.0);
    ctx.beginPath();
    for (let j = 0; j < dots; j++) {
      const s = j / (dots - 1);
      const rr = r * (0.88 - s * 0.26); // de 0.88·r a 0.62·r (totalmente > 0.55·r)
      const ang = -spin * 1.5 + s * 2.8 + (a / arms) * TAU;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;

      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(colArm, (0.4 + 0.5 * f.mids) * fin.alpha);
    ctx.lineWidth = Math.max(1, 1.4 * u);
    ctx.stroke();

    // Nodos luminosos a lo largo del vórtice interior
    ctx.beginPath();
    for (let j = 0; j < dots; j += 3) {
      const s = j / (dots - 1);
      const rr = r * (0.88 - s * 0.26);
      const ang = -spin * 1.5 + s * 2.8 + (a / arms) * TAU;
      const v = Math.min(1, bars.lvl[Math.min(M - 1, Math.floor(s * (M - 1)))]);
      const nodeSize = Math.max(1.2 * u, r * (0.012 + 0.02 * v));
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      ctx.moveTo(x + nodeSize, y);
      ctx.arc(x, y, nodeSize, 0, TAU);
    }
    ctx.fillStyle = rgba(mixRGB(colArm, WHITE, 0.4), (0.35 + 0.55 * f.energy) * fin.alpha);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.restore();
  return GOLDEN_FLOW_TIPS;
};

export const MORE_FORMS: Record<string, FormDrawer> = {
  laser,
  spiro,
  tunnel,
  hive,
  spiral,
};

