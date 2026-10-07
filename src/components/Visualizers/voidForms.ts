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

// Buffers dedicados para Spectral Crown (Fase 1) — Zero-GC
const CROWN_MAX_HALF = 80;
const CR_RAD = new Float32Array(CROWN_MAX_HALF);
const CR_VEL = new Float32Array(CROWN_MAX_HALF);
const CR_TGT = new Float32Array(CROWN_MAX_HALF);
const CR_X0 = new Float32Array(CROWN_MAX_HALF);
const CR_Y0 = new Float32Array(CROWN_MAX_HALF);
const CR_X1 = new Float32Array(CROWN_MAX_HALF);
const CR_Y1 = new Float32Array(CROWN_MAX_HALF);
let crLastT = 0;

// Caché de gradiente para velo atmosférico (Zero-GC por frame)
let gradAtmCache: CanvasGradient | null = null;
let gradAtmLastCx = 0;
let gradAtmLastCy = 0;
let gradAtmLastR0 = 0;
let gradAtmLastR1 = 0;
let gradAtmLastC0 = '';
let gradAtmLastC1 = '';

// Array de tips estático preasignado (Zero-GC en el retorno)
const CROWN_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   SPECTRAL CROWN (FASE 1) — Membrana espectral continua y elástica
   · Velo volumétrico sub-acústico de fondo con gradiente en caché Zero-GC.
   · Estrías de tensión elástica (filamentos subdérmicos orgánicos, no barras).
   · Membrana perimetral primaria continua con física spring-damper y tensión superficial.
   · Onda de choque acústica que viaja desde la base de graves hacia la cúspide en el kick.
   · Cresta de microdetalle y retención de transitorios agudos.
   · Resonador de cavidad interior en contrafase hidráulica modulado por notas (chroma).
   ══════════════════════════════════════════════════════════════════════════ */
const spectrum: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const n = clampInt(f.fx.count, 48, 160) & ~1;
  const half = Math.min(CROWN_MAX_HALF, n / 2);
  const bars = updateBars(f, state, half, e.dt);

  const base = e.rb;
  const gap = r * 0.024;
  const minLen = r * 0.035;
  const maxLen = r * f.fx.formScale * 1.35 * Math.sqrt(f.fx.reach);
  const fin = finish(f);

  // Delta time acotado para física estable incluso en saltos de pestaña
  const dt = Math.min(0.05, Math.max(0.001, e.dt > 0 ? e.dt : (t - crLastT > 0 && t - crLastT < 0.2 ? t - crLastT : 0.016)));
  crLastT = t;

  // ── FÍSICA: Onda de choque del kick y resorte acoplado entre nodos vecinos ──
  for (let i = 0; i < half; i++) {
    const s = i / Math.max(1, half - 1); // 0 = graves (base), 1 = agudos (cúspide)
    const rawLvl = bars.lvl[i];

    // Presión y masa de Sub / Bass en el polo inferior
    const bassPressure = f.bass * Math.pow(1 - s, 1.8) * 0.42;

    // Ondulación superficial de medios
    const midWave = Math.sin(s * Math.PI * 3.5 - t * 4.2) * f.mids * 0.14;

    // Micro-vibraciones de agudos en la cúspide
    const trebleAgitation = s > 0.45 ? Math.sin(i * 9.7 + t * 18.0) * f.treble * 0.08 : 0;

    // Onda de choque acústica que viaja físicamente desde la base hacia la cúspide durante el kick
    const kickPhase = (1 - Math.min(1, e.pop)) * 1.35;
    const waveDist = Math.abs(s - kickPhase);
    const kickWave = e.pop * Math.exp(-waveDist * waveDist * 18.0) * 0.52;

    const target = f.active
      ? Math.min(1.45, rawLvl * 0.85 + bassPressure + midWave + trebleAgitation + kickWave)
      : 0;
    CR_TGT[i] = target;

    // Acoplamiento elástico con tensión superficial de vecinos contiguos
    const currentR = CR_RAD[i];
    const left = i > 0 ? CR_RAD[i - 1] : CR_RAD[0];
    const right = i < half - 1 ? CR_RAD[i + 1] : CR_RAD[half - 1];
    const tension = ((left + right) * 0.5 - currentR) * 16.0;
    const spring = (target - currentR) * 44.0;
    const damping = -CR_VEL[i] * 9.0;
    const accel = spring + tension + damping;

    CR_VEL[i] += accel * dt;
    CR_RAD[i] += CR_VEL[i] * dt;
    if (CR_RAD[i] < 0) {
      CR_RAD[i] = 0;
      CR_VEL[i] = 0;
    }

    // Coordenadas cartesianas bilaterales simétricas
    const a = ((i + 0.5) / half) * Math.PI;
    const ext = minLen + maxLen * CR_RAD[i];
    const nodeR = base + gap + ext;

    // Hemisferio derecho (k = 0)
    const th0 = HALF_PI - a;
    CR_X0[i] = cx + Math.cos(th0) * nodeR;
    CR_Y0[i] = cy + Math.sin(th0) * nodeR;

    // Hemisferio izquierdo (k = 1)
    const th1 = HALF_PI + a;
    CR_X1[i] = cx + Math.cos(th1) * nodeR;
    CR_Y1[i] = cy + Math.sin(th1) * nodeR;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── CAPA 1: Atmósfera y Velo Volumétrico Sub-Acústico (Zero-GC Cache) ──
  ctx.beginPath();
  for (let i = 0; i < half; i++) {
    if (i === 0) ctx.moveTo(CR_X0[0], CR_Y0[0]);
    else {
      const prevX = CR_X0[i - 1];
      const prevY = CR_Y0[i - 1];
      const midX = (prevX + CR_X0[i]) * 0.5;
      const midY = (prevY + CR_Y0[i]) * 0.5;
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
    }
  }
  ctx.lineTo(CR_X1[half - 1], CR_Y1[half - 1]);
  for (let i = half - 2; i >= 0; i--) {
    const prevX = CR_X1[i + 1];
    const prevY = CR_Y1[i + 1];
    const midX = (prevX + CR_X1[i]) * 0.5;
    const midY = (prevY + CR_Y1[i]) * 0.5;
    ctx.quadraticCurveTo(prevX, prevY, midX, midY);
  }
  ctx.closePath();

  const r0 = base;
  const r1 = base + maxLen * 0.9;
  const colCore = colAt(f, 0.25);
  const colCrest = colAt(f, 0.85);
  const c0Str = rgba(colCore, 1);
  const c1Str = rgba(colCrest, 1);

  if (
    !gradAtmCache ||
    cx !== gradAtmLastCx ||
    cy !== gradAtmLastCy ||
    r0 !== gradAtmLastR0 ||
    r1 !== gradAtmLastR1 ||
    c0Str !== gradAtmLastC0 ||
    c1Str !== gradAtmLastC1
  ) {
    gradAtmCache = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    gradAtmCache.addColorStop(0, rgba(colCore, 0.2));
    gradAtmCache.addColorStop(0.5, rgba(colCore, 0.95));
    gradAtmCache.addColorStop(1, rgba(colCrest, 0.35));
    gradAtmLastCx = cx;
    gradAtmLastCy = cy;
    gradAtmLastR0 = r0;
    gradAtmLastR1 = r1;
    gradAtmLastC0 = c0Str;
    gradAtmLastC1 = c1Str;
  }

  const fillAlpha = (0.04 + f.bass * 0.08 + e.pop * 0.06) * (fin.add ? 0.8 : 0.4) * fin.alpha;
  ctx.save();
  ctx.globalAlpha = fillAlpha;
  ctx.fillStyle = gradAtmCache;
  ctx.fill();
  ctx.restore();

  // ── CAPA 2: Estrías de Tensión Elástica (Filamentos de la membrana) ──
  // En reposo/silencio quedan integradas de manera sutil; activas muestran tensión acústica
  const strutW = Math.max(0.8 * u, ((TAU * base) / n) * 0.3);
  const strutPresence = f.active ? 0.35 + f.bass * 0.45 + e.pop * 0.3 : 0.08;
  for (let g = 0; g < COLOR_BUCKETS; g++) {
    const lo = Math.floor((g * half) / COLOR_BUCKETS);
    const hi = Math.floor(((g + 1) * half) / COLOR_BUCKETS);
    if (hi <= lo) continue;
    ctx.beginPath();
    for (let i = lo; i < hi; i++) {
      const a = ((i + 0.5) / half) * Math.PI;
      const th0 = HALF_PI - a;
      const th1 = HALF_PI + a;
      const bx0 = cx + Math.cos(th0) * (base + gap * 0.3);
      const by0 = cy + Math.sin(th0) * (base + gap * 0.3);
      const bx1 = cx + Math.cos(th1) * (base + gap * 0.3);
      const by1 = cy + Math.sin(th1) * (base + gap * 0.3);

      ctx.moveTo(bx0, by0);
      ctx.lineTo(CR_X0[i], CR_Y0[i]);

      ctx.moveTo(bx1, by1);
      ctx.lineTo(CR_X1[i], CR_Y1[i]);
    }
    const bucketEnergy = (bars.lvl[Math.floor((lo + hi) * 0.5)] ?? 0.3) * 0.5 + 0.5;
    strokeGlow(f, colAt(f, (g + 0.5) / COLOR_BUCKETS), 0.38 * bucketEnergy * strutPresence, strutW, 1.8);
  }

  // Anillo de base bioluminiscente
  ctx.beginPath();
  ctx.arc(cx, cy, base + gap * 0.3, 0, TAU);
  strokeGlow(f, colAt(f, 0.4), 0.32 + e.pop * 0.45, Math.max(1.1 * u, strutW), 2.4);

  // ── CAPA 3: Membrana Perimetral Primaria Continua ──
  ctx.beginPath();
  for (let i = 0; i < half; i++) {
    if (i === 0) ctx.moveTo(CR_X0[0], CR_Y0[0]);
    else {
      const prevX = CR_X0[i - 1];
      const prevY = CR_Y0[i - 1];
      const midX = (prevX + CR_X0[i]) * 0.5;
      const midY = (prevY + CR_Y0[i]) * 0.5;
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
    }
  }
  ctx.lineTo(CR_X1[half - 1], CR_Y1[half - 1]);
  for (let i = half - 2; i >= 0; i--) {
    const prevX = CR_X1[i + 1];
    const prevY = CR_Y1[i + 1];
    const midX = (prevX + CR_X1[i]) * 0.5;
    const midY = (prevY + CR_Y1[i]) * 0.5;
    ctx.quadraticCurveTo(prevX, prevY, midX, midY);
  }
  ctx.closePath();
  const crownStrokeW = Math.max(1.8 * u, strutW * 1.4);
  strokeGlow(f, colAt(f, 0.65), 0.95, crownStrokeW, 2.8);

  // ── CAPA 4: Cresta Luminiscente de Microdetalle (Highlights y picos) ──
  ctx.beginPath();
  for (let i = 0; i < half; i++) {
    if (bars.peak[i] < 0.08) continue;
    const pkExt = minLen + maxLen * bars.peak[i] + r * 0.015;
    const a = ((i + 0.5) / half) * Math.PI;
    const th0 = HALF_PI - a;
    const th1 = HALF_PI + a;
    const px0 = cx + Math.cos(th0) * (base + gap + pkExt);
    const py0 = cy + Math.sin(th0) * (base + gap + pkExt);
    const px1 = cx + Math.cos(th1) * (base + gap + pkExt);
    const py1 = cy + Math.sin(th1) * (base + gap + pkExt);

    ctx.moveTo(px0, py0);
    ctx.lineTo(px0 + Math.cos(th0) * 0.8, py0 + Math.sin(th0) * 0.8);
    ctx.moveTo(px1, py1);
    ctx.lineTo(px1 + Math.cos(th1) * 0.8, py1 + Math.sin(th1) * 0.8);
  }
  ctx.strokeStyle = rgba(WHITE, 0.88 * fin.alpha);
  ctx.lineWidth = Math.max(1.5 * u, strutW * 0.9);
  ctx.stroke();

  // ── CAPA 5: Resonador de Cavidad Acústica Interior (Inners) ──
  // Contrafase hidráulica con el bombo + modulación armónica por notas musicales (chroma)
  const inSteps = 64;
  const kickCompression = e.pop * r * 0.025; // Compresión centrípeta cuando el exterior se expande

  ctx.beginPath();
  for (let m = 0; m <= inSteps; m++) {
    const ang = (m / inSteps) * TAU;
    const chromaIdx = Math.floor((((ang / TAU) * 12) % 12 + 12) % 12);
    const chromaEnergy = f.chroma ? f.chroma[chromaIdx] ?? 0 : 0;
    const inWave = Math.sin(ang * 5 + t * 3.2) * r * (0.012 + f.mids * 0.02) + chromaEnergy * r * 0.018;
    const inRad = r * 0.84 - kickCompression + inWave;
    const ix = cx + Math.cos(ang) * inRad;
    const iy = cy + Math.sin(ang) * inRad;
    if (m === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.82), 0.65, Math.max(1.1 * u, strutW * 0.7), 2.2);

  // Membrana interior 2: filamento fino de armónicos agudos (0.70..0.73 r)
  ctx.beginPath();
  for (let m = 0; m <= inSteps; m++) {
    const ang = (m / inSteps) * TAU;
    const inWave2 = Math.cos(ang * 4 - t * 2.1) * r * (0.008 + f.treble * 0.015);
    const inRad2 = r * 0.71 - kickCompression * 0.5 + inWave2;
    const ix = cx + Math.cos(ang) * inRad2;
    const iy = cy + Math.sin(ang) * inRad2;
    if (m === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(colAt(f, 0.28), (0.28 + f.mids * 0.4) * fin.alpha);
  ctx.lineWidth = Math.max(0.8 * u, 1);
  ctx.stroke();

  ctx.restore();

  // ── ÁPICES POLARES PARA EFECTOS PRO (Zero-GC) ──
  for (let k = 0; k < 4; k++) {
    const i = Math.floor(((k + 1) / 5) * half);
    CROWN_TIPS[k].x = CR_X0[i];
    CROWN_TIPS[k].y = CR_Y0[i];
  }
  return CROWN_TIPS;
};

// Buffers dedicados para Liquid Resonance (Fase 2) — Zero-GC
const LR_STEPS = 180;
const LR_X1 = new Float32Array(LR_STEPS + 1);
const LR_Y1 = new Float32Array(LR_STEPS + 1);
const LR_X2 = new Float32Array(LR_STEPS + 1);
const LR_Y2 = new Float32Array(LR_STEPS + 1);
const LR_CAUSTIC = new Float32Array(LR_STEPS + 1);

// Tips estáticos prealojados para Liquid Resonance (Zero-GC)
const LR_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

// Caché de gradiente para el manto líquido
let lrGradCache: CanvasGradient | null = null;
let lrGradLastCx = 0;
let lrGradLastCy = 0;
let lrGradLastR0 = 0;
let lrGradLastR1 = 0;
let lrGradLastC0 = '';
let lrGradLastC1 = '';

/* ══════════════════════════════════════════════════════════════════════════
   LIQUID RESONANCE (FASE 2) — Campos de interferencia y cáusticas ópticas
   · Manto líquido volumétrico translúcido con gradiente en caché Zero-GC.
   · Dos campos de ondas polares interactuando en tiempo real:
       W1: Marea centrífuga de graves (modos m = 3, 5).
       W2: Propagación transversal de medios (modos m = 4, 7).
       W3: Micro-refracciones capilares de agudos (m = 13).
   · Interferencia constructiva (crestas cáusticas) y destructiva (valles de disipación).
   · Frente de choque radial expansivo del kick con atenuación elástica.
   · Cavidad de resonancia interior en contrafase hidráulica con el bombo.
   · Extracción de 4 ápices vivos en crestas de máxima interferencia (Zero-GC).
   ══════════════════════════════════════════════════════════════════════════ */
const wave: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const bars = updateBars(f, state, 24, e.dt);
  const fin = finish(f);
  const base = e.rb;
  const gap = r * 0.024;
  const reachScale = r * f.fx.formScale * 0.85 * Math.sqrt(f.fx.reach);
  const spin = rad(f.angleDeg) * 0.025;

  // Reactividad armónica desacoplada por bandas
  const bassDrive = f.active ? Math.min(1.45, f.bass * 1.15 + bars.lvl[1] * 0.6) : 0;
  const midsDrive = f.active ? Math.min(1.35, f.mids * 1.05 + bars.lvl[7] * 0.5) : 0;
  const trebleDrive = f.active ? Math.min(1.3, f.treble * 1.0 + bars.lvl[15] * 0.45) : 0;

  // Foco acústico radial del kick (frente de compresión viajero)
  const kickPhase = (1 - Math.min(1, e.pop)) * 1.35;
  const kickTravel = e.pop * 0.55;

  const steps = LR_STEPS;
  let maxCaustic = 0;
  let maxP = 0;

  for (let p = 0; p <= steps; p++) {
    const th = (p / steps) * TAU;

    // Campo W1: Marea centrífuga de graves (modos azimutales m = 3 y 5)
    const w1 = Math.cos(3 * th - t * 2.4 + spin) * 0.58 + Math.cos(5 * th - t * 3.2) * 0.36;

    // Campo W2: Propagación transversal de medios (modos m = 4 y 7 en sentido opuesto)
    const w2 = Math.sin(4 * th + t * 2.8 - spin * 1.4) * 0.52 + Math.cos(7 * th + t * 4.1) * 0.38;

    // Campo W3: Micro-refracciones capilares de agudos (alta frecuencia m = 13)
    const w3 = Math.cos(13 * th - t * 7.5 + spin * 2) * 0.22;

    // Patrón de interferencia acústica
    const interference = w1 * bassDrive + w2 * midsDrive + w3 * trebleDrive;
    const caustic = Math.max(0, interference + 0.3);
    LR_CAUSTIC[p] = caustic;

    if (caustic > maxCaustic) {
      maxCaustic = caustic;
      maxP = p;
    }

    // Frente de choque acústico del kick: distorsión radial
    const kickBump = kickTravel > 0.02
      ? Math.exp(-Math.pow((th % (Math.PI / 2)) - kickPhase * 0.5, 2) * 12) * kickTravel * r * 0.25
      : 0;

    // Frente cáustico exterior 1 (crestas primarias de interferencia)
    const r1 = Math.max(base + gap * 0.5, base + gap + reachScale * (0.35 + interference * 0.62) + e.pop * r * 0.08 + kickBump);
    LR_X1[p] = cx + Math.cos(th) * r1;
    LR_Y1[p] = cy + Math.sin(th) * r1;

    // Frente cáustico intermedio 2 (resonancia con desfase armónico)
    const inter2 = w1 * 0.55 - w2 * 0.65 + w3 * 0.4;
    const r2 = Math.max(base + gap * 0.3, base + gap + reachScale * (0.18 + inter2 * 0.45) + e.pop * r * 0.04);
    LR_X2[p] = cx + Math.cos(th) * r2;
    LR_Y2[p] = cy + Math.sin(th) * r2;
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ── CAPA 1: Manto Líquido Volumétrico (Fondo de fluido translúcido con Zero-GC Cache) ──
  ctx.beginPath();
  for (let p = 0; p <= steps; p++) {
    if (p === 0) ctx.moveTo(LR_X1[0], LR_Y1[0]);
    else ctx.lineTo(LR_X1[p], LR_Y1[p]);
  }
  ctx.closePath();

  const r0 = base;
  const r1 = base + reachScale * 1.1;
  const colCore = colAt(f, 0.15);
  const colMid = colAt(f, 0.55);
  const colOuter = colAt(f, 0.9);
  const c0Str = rgba(colCore, 1);
  const c1Str = rgba(colOuter, 1);

  if (
    !lrGradCache ||
    cx !== lrGradLastCx ||
    cy !== lrGradLastCy ||
    r0 !== lrGradLastR0 ||
    r1 !== lrGradLastR1 ||
    c0Str !== lrGradLastC0 ||
    c1Str !== lrGradLastC1
  ) {
    lrGradCache = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    lrGradCache.addColorStop(0, rgba(colCore, 0.25));
    lrGradCache.addColorStop(0.55, rgba(colMid, 0.9));
    lrGradCache.addColorStop(1, rgba(colOuter, 0));
    lrGradLastCx = cx;
    lrGradLastCy = cy;
    lrGradLastR0 = r0;
    lrGradLastR1 = r1;
    lrGradLastC0 = c0Str;
    lrGradLastC1 = c1Str;
  }

  const poolAlpha = (0.05 + f.bass * 0.1 + e.pop * 0.08) * (fin.add ? 0.75 : 0.4) * fin.alpha;
  ctx.save();
  ctx.globalAlpha = poolAlpha;
  ctx.fillStyle = lrGradCache;
  ctx.fill();
  ctx.restore();

  // ── CAPA 2: Filamentos Cáusticos (Frente Intermedio) ──
  ctx.beginPath();
  for (let p = 0; p <= steps; p++) {
    if (p === 0) ctx.moveTo(LR_X2[0], LR_Y2[0]);
    else ctx.lineTo(LR_X2[p], LR_Y2[p]);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.4), 0.72, Math.max(1.1 * u, 1.4 * f.stroke * u), 2.2);

  // ── CAPA 3: Superficie Resonante Principal (Frente Exterior) ──
  ctx.beginPath();
  for (let p = 0; p <= steps; p++) {
    if (p === 0) ctx.moveTo(LR_X1[0], LR_Y1[0]);
    else ctx.lineTo(LR_X1[p], LR_Y1[p]);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.75), 0.94, Math.max(1.5 * u, 2.0 * f.stroke * u), 3.0);

  // ── CAPA 4: Ondulaciones Capilares y Destellos de Refracción (Highs) ──
  ctx.beginPath();
  let inHighlight = false;
  for (let p = 0; p <= steps; p++) {
    if (LR_CAUSTIC[p] > 0.85) {
      if (!inHighlight) {
        ctx.moveTo(LR_X1[p], LR_Y1[p]);
        inHighlight = true;
      } else {
        ctx.lineTo(LR_X1[p], LR_Y1[p]);
      }
    } else {
      inHighlight = false;
    }
  }
  ctx.strokeStyle = rgba(WHITE, (0.75 + f.treble * 0.25) * fin.alpha);
  ctx.lineWidth = Math.max(1.0 * u, 1.2 * f.stroke * u);
  ctx.stroke();

  // ── CAPA 5: Frente de Choque Radial del Kick ──
  if (e.pop > 0.04) {
    const shockRad = base + gap + r * (0.05 + kickPhase * 0.75 * f.fx.reach);
    ctx.beginPath();
    ctx.arc(cx, cy, shockRad, 0, TAU);
    strokeGlow(f, colAt(f, 0.5), e.pop * 0.8, Math.max(1.2 * u, 2.2 * u), 3.4);
  }

  // ── CAPA 6: Cavidad de Resonancia Interior (Inners en contrafase) ──
  // Arco Líquido Interior 1 (0.81..0.87 r): marea modulada por graves en contrafase
  const inSteps = 48;
  const kickCompression = e.pop * r * 0.025;
  ctx.beginPath();
  for (let m = 0; m <= inSteps; m++) {
    const ang = (m / inSteps) * TAU;
    const inWave = Math.sin(ang * 5 - t * 3.5) * r * (0.015 + f.bass * 0.025);
    const inRad = r * 0.84 - kickCompression + inWave;
    const ix = cx + Math.cos(ang) * inRad;
    const iy = cy + Math.sin(ang) * inRad;
    if (m === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.82), 0.75, Math.max(1.1 * u, 1.3 * f.stroke * u), 2.4);

  // Arco Líquido Interior 2 (0.69..0.73 r): micro-refracciones interiores
  ctx.beginPath();
  for (let m = 0; m <= inSteps; m++) {
    const ang = (m / inSteps) * TAU;
    const inWave2 = Math.cos(ang * 6 + t * 2.8) * r * (0.012 + f.mids * 0.02);
    const inRad2 = r * 0.71 - kickCompression * 0.5 + inWave2;
    const ix = cx + Math.cos(ang) * inRad2;
    const iy = cy + Math.sin(ang) * inRad2;
    if (m === 0) ctx.moveTo(ix, iy);
    else ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(colAt(f, 0.3), (0.35 + f.mids * 0.35) * fin.alpha);
  ctx.lineWidth = Math.max(0.8 * u, 1);
  ctx.stroke();

  ctx.restore();

  // ── ÁPICES POLARES PARA EFECTOS PRO (Zero-GC) ──
  for (let k = 0; k < 4; k++) {
    const idx = Math.floor((maxP + (k * steps) / 4) % steps);
    LR_TIPS[k].x = LR_X1[idx];
    LR_TIPS[k].y = LR_Y1[idx];
  }
  return LR_TIPS;
};

// Tips estáticos prealojados para Stardust Flow (Zero-GC)
const STARDUST_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   STARDUST FLOW (FASE 3) — Vórtice de polvo estelar cósmico y cometas acústicos
   · Disco de acreción estelar con líneas de corriente gravitacionales continuas.
   · Jerarquía bimodal de masa:
       Micro-polvo estelar (70%): ultraligero, centelleo por agudos, niebla etérea.
       Cúmulos y cometas densos (30%): inercia radial profunda, impulsados por graves/kick.
   · Estelas arqueadas que siguen la curvatura orbital real Kepleriana.
   · Corrientes de acreción continuas (sustituyen los antiguos anillos punteados).
   · Horizonte de acreción interior (0.71..0.85 r) en contrafase gravitacional (Zero-GC).
   · Extracción de 4 cometas ápice vivos en cuadrantes opuestos (Zero-GC).
   ══════════════════════════════════════════════════════════════════════════ */
const LANES = 7;
const particles: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const ps = state.particles;
  const n = clampInt(f.fx.count, 120, 420);

  if (!ps.init) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const rng = mulberry32(9157 + i * 31);
      const m = i % (LANES + 1); // 0..6: exterior, 7: disco interior
      ps.layer[i] = m;
      if (m === LANES) {
        // Horizonte interior (0.72..0.85 r): seguro dentro del disco, fuera del logo (<0.55 r)
        ps.rho[i] = 0.72 + rng() * 0.13;
        ps.spd[i] = -(0.55 + rng() * 0.45); // Contrarrotante
        ps.size[i] = 1.4 + rng() * 1.8;
      } else {
        // Campo cósmico exterior: espiral continua (1.08..2.15 r)
        const tier = m / (LANES - 1);
        ps.rho[i] = 1.08 + tier * 0.95 + (rng() - 0.5) * 0.12;
        const dir = m % 2 === 0 ? 1 : -0.85;
        const kepler = 1.0 / Math.sqrt(Math.max(0.7, ps.rho[i]));
        ps.spd[i] = dir * kepler * (0.35 + rng() * 0.45);
        // 70% micro-polvo estelar, 30% cometas o cúmulos densos
        const isComet = rng() > 0.7;
        ps.size[i] = isComet ? 3.4 + rng() * 2.6 : 1.2 + rng() * 1.6;
      }
      ps.ang[i] = rng() * TAU;
      ps.phase[i] = rng() * TAU;
    }
    ps.init = true;
  }

  const spin = rad(f.angleDeg) * 0.02;
  const swirl = (f.active ? 1.0 : 0.35) + f.energy * 1.35 + e.pop * 2.8;
  const streak = (0.05 + (f.active ? f.treble * 0.04 + f.energy * 0.03 : 0) + e.pop * 0.07) * swirl;

  const bBand = Math.min(1.3, f.bass * 1.1);
  const mBand = Math.min(1.2, f.mids * 1.05);
  const tBand = Math.min(1.25, f.treble * 1.15);

  let q0Best = -1, q1Best = -1, q2Best = -1, q3Best = -1;
  let q0Idx = -1, q1Idx = -1, q2Idx = -1, q3Idx = -1;

  for (let i = 0; i < n; i++) {
    ps.ang[i] += ps.spd[i] * e.dt * swirl;
    const m = ps.layer[i];
    const isInner = m === LANES;
    const band = isInner ? mBand : m < 2 ? bBand : m < 5 ? mBand : tBand;

    // Empuje radial: expulsión cósmica en exterior, compresión leve en horizonte interior
    const outward = isInner ? -0.04 : 0.85 + (m / (LANES - 1)) * 0.35;
    const push = isInner
      ? -e.pop * 0.035 * r
      : (e.pop * 0.44 + bBand * 0.08) * outward * r;

    // Oscilación senoidal armónica (micro-deriva gravitatoria)
    const wob = 0.018 * Math.sin(ps.phase[i] + t * (1.1 + 0.3 * (m % 3))) * (1 + mBand * 1.4) * r;
    const dist = Math.max(r * 0.68, r * ps.rho[i] + push + wob);

    // Centelleo de micro-polvo por altas frecuencias
    const tw = 0.5 + 0.5 * Math.sin(ps.phase[i] * 4 + t * (2.2 + tBand * 8));

    // Estela aerodinámica polar (curvatura angular a lo largo de la órbita)
    const thHead = ps.ang[i] + spin;
    const thTail = thHead - ps.spd[i] * streak;
    const tailDist = dist * (1.0 - Math.min(0.06, Math.abs(ps.spd[i]) * 0.04 * (1 + e.pop)));

    PX[i] = cx + Math.cos(thHead) * dist;
    PY[i] = cy + Math.sin(thHead) * dist;
    TX[i] = cx + Math.cos(thTail) * tailDist;
    TY[i] = cy + Math.sin(thTail) * tailDist;

    const isComet = ps.size[i] > 3.0;
    const sizeScale = isComet ? 1.0 + bBand * 0.4 + e.pop * 0.4 : 0.75 + tBand * 0.5 * tw;
    PS[i] = Math.max(1, ps.size[i] * u * (0.8 + band * 0.5 + sizeScale * 0.4));

    const normAng = (((thHead % TAU) + TAU) % TAU) / TAU;
    const hue = Math.floor(normAng * COLOR_BUCKETS) % COLOR_BUCKETS;
    const isBright = isComet || tw > 0.65 || band > 0.75;
    PC[i] = hue * 2 + (isBright ? 1 : 0);

    // Rastreo de los 4 cometas ápice en 4 cuadrantes para efectos Pro (Zero-GC)
    if (!isInner) {
      const quad = Math.floor(normAng * 4) % 4;
      if (quad === 0 && PS[i] > q0Best) { q0Best = PS[i]; q0Idx = i; }
      else if (quad === 1 && PS[i] > q1Best) { q1Best = PS[i]; q1Idx = i; }
      else if (quad === 2 && PS[i] > q2Best) { q2Best = PS[i]; q2Idx = i; }
      else if (quad === 3 && PS[i] > q3Best) { q3Best = PS[i]; q3Idx = i; }
    }
  }

  ctx.save();
  ctx.lineCap = 'round';
  const fin = finish(f);

  // ── CAPA 1: Corrientes de Acreción Gravitacional (3 filamentos cósmicos sutiles) ──
  for (let c = 0; c < 3; c++) {
    const streamR = r * (1.18 + c * 0.38 + e.pop * 0.12);
    const streamBand = c === 0 ? bBand : c === 1 ? mBand : tBand;
    ctx.beginPath();
    ctx.arc(cx, cy, streamR, 0, TAU);
    ctx.strokeStyle = rgba(colAt(f, c / 2), (0.04 + streamBand * 0.08) * fin.alpha);
    ctx.lineWidth = Math.max(0.6 * u, 0.8);
    ctx.stroke();
  }

  // ── CAPAS 2 & 3: Estelas Cósmicas por cubos de color × brillo (Zero-GC Batching) ──
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
        // Pase 0: Halo difuso translúcido
        if (fin.glow <= 0.01) continue;
        ctx.strokeStyle = rgba(color, (bright ? 0.22 : 0.1) * fin.glow);
        ctx.lineWidth = w * 2.8;
      } else {
        // Pase 1: Filamento nítido con núcleo de color enriquecido
        ctx.strokeStyle = rgba(
          bright ? mixRGB(color, WHITE, 0.45 + fin.white) : mixRGB(color, WHITE, fin.white),
          (bright ? 0.98 : 0.6) * fin.alpha
        );
        ctx.lineWidth = w;
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  // ── ÁPICES DE COMETAS PARA EFECTOS PRO (Zero-GC) ──
  const qIndices = [q0Idx, q1Idx, q2Idx, q3Idx];
  for (let k = 0; k < 4; k++) {
    const idx = qIndices[k];
    if (idx >= 0 && idx < n) {
      STARDUST_TIPS[k].x = PX[idx];
      STARDUST_TIPS[k].y = PY[idx];
    } else {
      const fallbackTh = (k / 4) * TAU + spin;
      STARDUST_TIPS[k].x = cx + Math.cos(fallbackTh) * (r * 1.35);
      STARDUST_TIPS[k].y = cy + Math.sin(fallbackTh) * (r * 1.35);
    }
  }
  return STARDUST_TIPS;
};

// Tips estáticos prealojados para Sacred Lattice (Zero-GC)
const LATTICE_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   SACRED LATTICE (FASE 4) — Matriz viva de geometría sagrada y resonancia cromática
   · Proyección armónica de poliedros sagrados y proporciones áureas (Metatrón / Merkaba).
   · Filamentos de celosía interconectados con diagonales cruzadas y resonancia de banda.
   · Nodos de afinación cromática que proyectan halos y núcleos diamantinos (f.chroma).
   · Onda de choque diamantina elástica en el kick (Zero-GC).
   · Sello geométrico interior hermético (0.70..0.84 r) libre de invasión del logo.
   · Extracción estática de 4 vértices armónicos para efectos Pro (Zero-GC).
   ══════════════════════════════════════════════════════════════════════════ */
const GEO_LAYERS = [
  { sides: 6, rad: 0.38, speed: 0.28, skip: 2 },
  { sides: 3, rad: 0.68, speed: -0.38, skip: 0 },
  { sides: 4, rad: 1.02, speed: 0.22, skip: 0 },
  { sides: 8, rad: 1.38, speed: -0.16, skip: 3 },
] as const;

const INNER_LATTICE_LAYERS = [
  { sides: 6, rad: 0.84, speed: -0.32, skip: 2 },
  { sides: 3, rad: 0.70, speed: 0.45, skip: 0 },
] as const;

const geometry: FormDrawer = (f, _state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const layers = clampInt(f.fx.count, 2, 4);
  const bands = [f.bass, f.mids, f.mids * 0.6 + f.treble * 0.4, f.treble];
  const fin = finish(f);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  let topNoteIdx0 = -1, topNoteIdx1 = -1, topNoteIdx2 = -1, topNoteIdx3 = -1;
  let topNoteVal0 = -1, topNoteVal1 = -1, topNoteVal2 = -1, topNoteVal3 = -1;

  for (let i = 0; i < layers; i++) {
    const d = GEO_LAYERS[i];
    const band = Math.min(1.2, bands[i]);
    // Expansión radial armónica elástica: garantiza extent(LOUD) > extent(QUIET)
    const R = e.rb + r * d.rad * f.fx.reach * (1.0 + e.pop * 0.18 + f.bass * 0.14);
    const rot = t * d.speed + i * 0.52 + rad(f.angleDeg) * 0.02 + e.pop * 0.15 * (i % 2 ? -1 : 1);
    const col = colAt(f, layers > 1 ? i / (layers - 1) : 0);

    for (let v = 0; v < d.sides; v++) {
      const a = rot + (v / d.sides) * TAU + UP;
      VX[v] = cx + Math.cos(a) * R;
      VY[v] = cy + Math.sin(a) * R;
    }

    // ── CAPA 1 & 2: Perímetro de Celosía y Velo Armónico ──
    ctx.beginPath();
    ctx.moveTo(VX[0], VY[0]);
    for (let v = 1; v < d.sides; v++) ctx.lineTo(VX[v], VY[v]);
    ctx.closePath();
    ctx.fillStyle = rgba(col, (0.04 + band * 0.11) * fin.alpha);
    ctx.fill();
    strokeGlow(f, col, 0.65 + band * 0.45, Math.max(1.3 * u, 2.0 * f.stroke * u), 2.8);

    // ── Filamentos Cruzados Sagrados (Estrella de Metatrón / Merkaba) ──
    if (d.skip > 0) {
      ctx.beginPath();
      for (let v = 0; v < d.sides; v++) {
        const w = (v + d.skip) % d.sides;
        ctx.moveTo(VX[v], VY[v]);
        ctx.lineTo(VX[w], VY[w]);
      }
      ctx.strokeStyle = rgba(mixRGB(col, WHITE, 0.35 + fin.white), (0.24 + band * 0.55) * fin.alpha);
      ctx.lineWidth = Math.max(1.0, 1.25 * u);
      ctx.stroke();
    }

    // ── CAPA 3: Nodos de Resonancia Cromática (Prismas Vivos) ──
    ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
    for (let v = 0; v < d.sides; v++) {
      const note = (i * 3 + Math.floor((v * 12) / d.sides)) % 12;
      const nv = Math.min(1, f.chroma[note] || 0);
      const s = Math.max(2.2 * u, r * (0.024 + 0.075 * nv));
      const nCol = noteColor(f, note);

      // Micro-halo cromático difuso
      ctx.beginPath();
      ctx.arc(VX[v], VY[v], s * 1.4, 0, TAU);
      ctx.fillStyle = rgba(nCol, (0.22 + 0.38 * nv) * fin.alpha);
      ctx.fill();

      // Núcleo brillante diamante
      ctx.beginPath();
      ctx.arc(VX[v], VY[v], Math.max(1.1 * u, s * 0.45), 0, TAU);
      ctx.fillStyle = rgba(mixRGB(nCol, WHITE, 0.55 + nv * 0.4), (0.75 + 0.25 * nv) * fin.alpha);
      ctx.fill();

      // Selección armónica para tips en la capa más externa
      if (i === layers - 1) {
        if (nv > topNoteVal0) {
          topNoteVal3 = topNoteVal2; topNoteIdx3 = topNoteIdx2;
          topNoteVal2 = topNoteVal1; topNoteIdx2 = topNoteIdx1;
          topNoteVal1 = topNoteVal0; topNoteIdx1 = topNoteIdx0;
          topNoteVal0 = nv; topNoteIdx0 = v;
        } else if (nv > topNoteVal1) {
          topNoteVal3 = topNoteVal2; topNoteIdx3 = topNoteIdx2;
          topNoteVal2 = topNoteVal1; topNoteIdx2 = topNoteIdx1;
          topNoteVal1 = nv; topNoteIdx1 = v;
        } else if (nv > topNoteVal2) {
          topNoteVal3 = topNoteVal2; topNoteIdx3 = topNoteIdx2;
          topNoteVal2 = nv; topNoteIdx2 = v;
        } else if (nv > topNoteVal3) {
          topNoteVal3 = nv; topNoteIdx3 = v;
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── CAPA 4: Onda de Choque Diamantina en el Kick ──
  if (e.pop > 0.04) {
    const d = GEO_LAYERS[layers - 1];
    const R = e.rb + r * d.rad * f.fx.reach * (1.0 + e.pop * 0.18 + f.bass * 0.14);
    const rot = t * d.speed + (layers - 1) * 0.52 + rad(f.angleDeg) * 0.02;
    ctx.beginPath();
    for (let v = 0; v <= d.sides; v++) {
      const a = rot + ((v % d.sides) / d.sides) * TAU + UP;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      if (v === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(WHITE, e.pop * 0.65);
    ctx.lineWidth = Math.max(1.5 * u, 2.2 * u);
    ctx.stroke();
  }

  // ── CAPA 5: Sello Sagrado Interior (Zero-GC Preasignado) ──
  for (let q = 0; q < INNER_LATTICE_LAYERS.length; q++) {
    const d = INNER_LATTICE_LAYERS[q];
    const col = colAt(f, q === 0 ? 0.28 : 0.82);
    const inBand = q === 0 ? f.mids : f.treble;
    const inR = r * d.rad - e.pop * r * 0.02;

    for (let v = 0; v < d.sides; v++) {
      const a = t * d.speed + (v / d.sides) * TAU + UP;
      VX[v] = cx + Math.cos(a) * inR;
      VY[v] = cy + Math.sin(a) * inR;
    }
    ctx.beginPath();
    ctx.moveTo(VX[0], VY[0]);
    for (let v = 1; v < d.sides; v++) ctx.lineTo(VX[v], VY[v]);
    ctx.closePath();
    strokeGlow(f, col, 0.55 + Math.min(1, inBand) * 0.45, Math.max(1.2 * u, 1.5 * u), 2.6);

    for (let v = 0; v < d.sides; v++) {
      ctx.beginPath();
      ctx.arc(VX[v], VY[v], Math.max(1.8 * u, r * 0.02), 0, TAU);
      ctx.fillStyle = rgba(mixRGB(col, WHITE, 0.5), 0.85 * fin.alpha);
      ctx.fill();
    }
  }

  ctx.restore();

  // ── ÁPICES ARMÓNICOS PARA EFECTOS PRO (Zero-GC) ──
  const outerSides = GEO_LAYERS[layers - 1].sides;
  const tipIndices = [
    topNoteIdx0 >= 0 ? topNoteIdx0 : 0,
    topNoteIdx1 >= 0 ? topNoteIdx1 : Math.floor(outerSides / 4) % outerSides,
    topNoteIdx2 >= 0 ? topNoteIdx2 : Math.floor(outerSides / 2) % outerSides,
    topNoteIdx3 >= 0 ? topNoteIdx3 : Math.floor((outerSides * 3) / 4) % outerSides,
  ];

  for (let k = 0; k < 4; k++) {
    const v = tipIndices[k];
    LATTICE_TIPS[k].x = VX[v];
    LATTICE_TIPS[k].y = VY[v];
  }
  return LATTICE_TIPS;
};

// Tips estáticos prealojados para Echo Lens (Zero-GC)
const ECHO_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

const FRESNEL_RINGS = [0.42, 0.78, 1.15, 1.48] as const;
const ECHO_STEPS = 96;

/* ══════════════════════════════════════════════════════════════════════════
   ECHO LENS (FASE 5) — Lente acústica de refracción anamórfica y ecos de Fresnel
   · Frente de onda cáustico continuo con difracción angular y resplandor de cuarzo.
   · Anillos de difracción de Fresnel (4 frentes elásticos ondulados por el espectro).
   · Focos de refracción cromática (12 prismas de dispersión armónica con memoria).
   · Frente de compresión óptica en el kick (Zero-GC).
   · Diafragma de eco interior hermético (0.74..0.88 r) libre de invasión del logo.
   · Extracción estática de 4 focos de eco para efectos Pro (Zero-GC).
   ══════════════════════════════════════════════════════════════════════════ */
const radar: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const rs = state.radar;
  const bars = updateBars(f, state, 60, e.dt);
  const fin = finish(f);

  const spin = rad(f.angleDeg) * 0.02;
  const sweepSpeed = (f.active ? 1.0 : 0.3) + f.energy * 1.5 + e.pop * 3.5;
  rs.sweep = (rs.sweep + e.dt * sweepSpeed) % TAU;
  const sweep = rs.sweep - HALF_PI + spin;
  const base = e.rb + r * 0.025;
  const fade = Math.exp(-e.dt * 1.4);

  ctx.save();
  ctx.lineCap = 'round';

  // ── CAPA 1: Haz Cáustico Anamórfico de la Lente (Frente Óptico Continuo) ──
  const beamR = base + r * (1.2 + f.energy * 0.45) * f.fx.reach;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(sweep) * base, cy + Math.sin(sweep) * base);
  ctx.lineTo(cx + Math.cos(sweep) * beamR, cy + Math.sin(sweep) * beamR);
  strokeGlow(f, mixRGB(colAt(f, 0.15), WHITE, 0.55), 1.0, Math.max(1.8 * u, 2.4 * u), 3.8);

  const arcSteps = 24;
  const arcSpan = 1.6;
  ctx.beginPath();
  for (let s = 0; s <= arcSteps; s++) {
    const a = sweep - (s / arcSteps) * arcSpan;
    const radFrac = 1 - (s / arcSteps) * 0.35;
    const rx = cx + Math.cos(a) * (base + (beamR - base) * radFrac);
    const ry = cy + Math.sin(a) * (base + (beamR - base) * radFrac);
    if (s === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  for (let s = arcSteps; s >= 0; s--) {
    const a = sweep - (s / arcSteps) * arcSpan;
    const rx = cx + Math.cos(a) * base;
    const ry = cy + Math.sin(a) * base;
    ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(colAt(f, 0.22), (0.08 + f.energy * 0.12) * fin.alpha);
  ctx.fill();

  // ── CAPA 2: Anillos de Difracción de Fresnel (4 Frentes Continuos) ──
  for (let k = 0; k < FRESNEL_RINGS.length; k++) {
    const baseRad = base + r * FRESNEL_RINGS[k] * f.fx.reach;
    const band = k === 0 ? f.bass : k === 1 ? f.mids : f.treble;
    ctx.beginPath();
    for (let j = 0; j <= ECHO_STEPS; j++) {
      const th = (j / ECHO_STEPS) * TAU;
      const dSweep = wrapPi(th - sweep);
      const causticGlow = Math.exp(-Math.pow(dSweep, 2) * 5.0);
      const specIdx = Math.min(59, Math.floor((j / ECHO_STEPS) * 59));
      const specWave = (bars.lvl[specIdx] || 0) * r * 0.08 * f.fx.formScale;
      const kickExp = e.pop * r * 0.06 * (k + 1);
      const radJ = baseRad + specWave + kickExp + causticGlow * r * 0.05;
      const x = cx + Math.cos(th) * radJ;
      const y = cy + Math.sin(th) * radJ;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const colRing = colAt(f, k / 3);
    strokeGlow(f, colRing, (0.35 + band * 0.45) * fin.alpha, Math.max(1.1 * u, 1.4 * u), 2.4);
  }

  // ── CAPA 3: Focos de Refracción Cromática (12 Prismas de Eco) ──
  let topBlip0 = -1, topBlip1 = -1, topBlip2 = -1, topBlip3 = -1;
  let topBlipK0 = -1, topBlipK1 = -1, topBlipK2 = -1, topBlipK3 = -1;

  for (let k = 0; k < 12; k++) {
    const th = UP + (k / 12) * TAU + spin;
    const behind = wrapPi(sweep - th);
    const glow = behind >= 0 && behind < 0.35 ? 1 - behind / 0.35 : 0;
    rs.blip[k] = Math.max(rs.blip[k] * fade, Math.min(1, f.chroma[k] || 0) * glow);
    const b = rs.blip[k];

    if (b > topBlip0) {
      topBlip3 = topBlip2; topBlipK3 = topBlipK2;
      topBlip2 = topBlip1; topBlipK2 = topBlipK1;
      topBlip1 = topBlip0; topBlipK1 = topBlipK0;
      topBlip0 = b; topBlipK0 = k;
    } else if (b > topBlip1) {
      topBlip3 = topBlip2; topBlipK3 = topBlipK2;
      topBlip2 = topBlip1; topBlipK2 = topBlipK1;
      topBlip1 = b; topBlipK1 = k;
    } else if (b > topBlip2) {
      topBlip3 = topBlip2; topBlipK3 = topBlipK2;
      topBlip2 = b; topBlipK2 = k;
    } else if (b > topBlip3) {
      topBlip3 = b; topBlipK3 = k;
    }

    if (b < 0.04) continue;
    const rr = base + r * (0.38 + 0.14 * (k % 3)) + e.pop * r * 0.04;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    const s = Math.max(2.2 * u, r * (0.028 + 0.07 * b));
    const nCol = noteColor(f, k);

    ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
    // Halo de difracción óptica
    ctx.beginPath();
    ctx.arc(x, y, s * 2.0, 0, TAU);
    ctx.fillStyle = rgba(nCol, b * 0.28 * fin.alpha);
    ctx.fill();

    // Núcleo de diamante prismático
    ctx.beginPath();
    ctx.arc(x, y, s * 0.65, 0, TAU);
    ctx.fillStyle = rgba(mixRGB(nCol, WHITE, 0.55), Math.min(1, b + 0.25) * fin.alpha);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── CAPA 4: Impulso de Compresión Óptica en el Kick ──
  if (e.pop > 0.04) {
    ctx.beginPath();
    ctx.arc(cx, cy, base + r * (0.06 + e.pop * 0.12), 0, TAU);
    ctx.strokeStyle = rgba(WHITE, e.pop * 0.7);
    ctx.lineWidth = Math.max(1.4 * u, 2.2 * u);
    ctx.stroke();
  }

  // ── CAPA 5: Diafragma de Eco Interior (0.74..0.88 r) ──
  for (let a = 0; a < 3; a++) {
    const start = sweep + (a / 3) * TAU;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.76 + a * 0.04), start - 0.52, start + 0.52);
    strokeGlow(f, colAt(f, 0.35 + a * 0.25), 0.6 + Math.min(1, f.mids) * 0.4, Math.max(1.3 * u, 1.8 * u), 2.8);
  }

  // Micro-marcas de difracción armónica interior (64 puntos polares en 0.88 r)
  ctx.beginPath();
  for (let j = 0; j < 64; j++) {
    const th = (j / 64) * TAU;
    const v = bars.lvl[(j * 5) % 60] || 0;
    const len = r * (0.025 + 0.06 * Math.min(1, v));
    const rOuter = r * 0.88;
    ctx.moveTo(cx + Math.cos(th) * rOuter, cy + Math.sin(th) * rOuter);
    ctx.lineTo(cx + Math.cos(th) * (rOuter - len), cy + Math.sin(th) * (rOuter - len));
  }
  ctx.strokeStyle = rgba(colAt(f, 0.85), (0.4 + f.treble * 0.5) * fin.alpha);
  ctx.lineWidth = Math.max(0.8 * u, 1.1);
  ctx.stroke();

  ctx.restore();

  // ── ÁPICES DE ECO PARA EFECTOS PRO (Zero-GC) ──
  const tipK = [
    topBlipK0 >= 0 ? topBlipK0 : 0,
    topBlipK1 >= 0 ? topBlipK1 : 3,
    topBlipK2 >= 0 ? topBlipK2 : 6,
    topBlipK3 >= 0 ? topBlipK3 : 9,
  ];
  for (let m = 0; m < 4; m++) {
    const k = tipK[m];
    const th = UP + (k / 12) * TAU + spin;
    const rr = base + r * (0.42 + 0.12 * (k % 3));
    ECHO_TIPS[m].x = cx + Math.cos(th) * rr;
    ECHO_TIPS[m].y = cy + Math.sin(th) * rr;
  }
  return ECHO_TIPS;
};

// Tips estáticos prealojados para Neural Arc (Zero-GC)
const NEURAL_TIPS: Tip[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   NEURAL ARC (FASE 6) — Red sináptica bio-luminiscente y potenciales de acción
   · Axones elásticos interconectados con curvatura de catenaria bio-mórfica.
   · Potenciales de acción viajeros (pulsos de neurotransmisor con el ritmo).
   · Nodos somáticos con núcleos de diamante y halos sinápticos bio-luminiscentes.
   · Despolarización masiva en el kick (regeneración determinista de st.seed).
   · Membrana mielinizada interior (0.72..0.86 r) libre de invasión del logo.
   · Extracción estática de 4 axones eferentes para efectos Pro (Zero-GC).
   ══════════════════════════════════════════════════════════════════════════ */
const electro: FormDrawer = (f, state, e) => {
  const { ctx, cx, cy, r, u, t } = f;
  const st = state.electro;
  const bars = updateBars(f, state, 12, e.dt);
  const quiet = !f.active;
  const fin = finish(f);

  // Ciclo determinista de regeneración sináptica: obligatorio para tests de voidForms
  const interval = Math.max(0.035, 0.09 - f.treble * 0.05);
  if (!quiet && (f.boom > 0 || t - st.last > interval)) {
    st.seed = (st.seed + 1) % 65536;
    st.last = t;
  }
  const presence = quiet ? 0.45 : Math.min(1, 0.72 + e.env * 0.55 + f.treble * 0.45);
  const spin = rad(f.angleDeg) * 0.02;

  const NA = 24;
  const NB = 12;
  const RA = e.rb + r * 0.28 + e.pop * r * 0.05;
  const RB = e.rb + r * 0.85 * f.fx.reach + e.pop * r * 0.10;

  // Pre-cálculo de posiciones nodales (Anillo A somático y Anillo B eferente)
  for (let i = 0; i < NA; i++) {
    const th = UP + (i / NA) * TAU + spin;
    PX[i] = cx + Math.cos(th) * RA;
    PY[i] = cy + Math.sin(th) * RA;
  }
  for (let j = 0; j < NB; j++) {
    const th = UP + ((j + 0.5) / NB) * TAU + spin;
    PX[NA + j] = cx + Math.cos(th) * RB;
    PY[NA + j] = cy + Math.sin(th) * RB;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ── CAPA 1: Membrana Perimetral Mielinizada (Anillos Guía Elásticos) ──
  ctx.beginPath();
  ctx.arc(cx, cy, RA, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.35), (0.08 + e.pop * 0.28) * fin.alpha);
  ctx.lineWidth = Math.max(0.7 * u, 1);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, RB, 0, TAU);
  ctx.strokeStyle = rgba(colAt(f, 0.75), (0.12 + e.pop * 0.32) * fin.alpha);
  ctx.lineWidth = Math.max(0.8 * u, 1.2);
  ctx.stroke();

  // ── CAPA 2: Axones Inter-nodales de Potencial de Acción (Curvas Catenarias) ──
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? NA : NB;
      const off = ring === 0 ? 0 : NA;
      for (let i = 0; i < count; i++) {
        const k = (i + 1) % count;
        const thA = UP + ((i + (ring ? 0.5 : 0)) / count) * TAU + spin;
        const thB = UP + ((k + (ring ? 0.5 : 0)) / count) * TAU + spin;

        const uuA = Math.abs(wrapPi(thA - UP)) / Math.PI;
        const uuB = Math.abs(wrapPi(thB - UP)) / Math.PI;
        const lvA = Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uuA) * 11))] * (1 + 1.8 * (1 - uuA)));
        const lvB = Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uuB) * 11))] * (1 + 1.8 * (1 - uuB)));
        const lv = (lvA + lvB) * 0.5;

        if ((pass === 1) !== lv > 0.45) continue;

        const ax = PX[off + i];
        const ay = PY[off + i];
        const bx = PX[off + k];
        const by = PY[off + k];

        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const mx = (ax + bx) * 0.5 - cx;
        const my = (ay + by) * 0.5 - cy;
        const ml = Math.hypot(mx, my) || 1;

        // Tensión de catenaria elástica con ligera flexión hacia afuera
        const bulge = r * 0.05 * (0.4 + lv * 0.8) * (ring ? 1.5 : 1.0);
        const ctrlX = (ax + bx) * 0.5 + (mx / ml) * bulge + nx * (Math.sin(st.seed * 0.13 + i) * r * 0.015);
        const ctrlY = (ay + by) * 0.5 + (my / ml) * bulge + ny * (Math.sin(st.seed * 0.13 + i) * r * 0.015);

        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ctrlX, ctrlY, bx, by);
      }
    }
    const col = pass === 0 ? colAt(f, 0.28) : mixRGB(colAt(f, 0.65), WHITE, 0.55);
    strokeGlow(f, col, (pass === 0 ? 0.72 : 1.0) * presence, Math.max(1.2 * u, (pass === 0 ? 1.5 : 2.2) * f.stroke * u), 3.4);
  }

  // ── CAPA 3: Conexiones Sinápticas Transversales (Red A ↔ B) ──
  ctx.beginPath();
  for (let j = 0; j < NB; j++) {
    const thB = UP + ((j + 0.5) / NB) * TAU + spin;
    const uu = Math.abs(wrapPi(thB - UP)) / Math.PI;
    const lv = Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uu) * 11))] * (1 + 1.8 * (1 - uu)));
    if (lv < 0.22) continue;

    const i = Math.round(((j + 0.5) / NB) * NA) % NA;
    const ax = PX[i];
    const ay = PY[i];
    const bx = PX[NA + j];
    const by = PY[NA + j];

    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const lateralWave = Math.sin(t * 3.2 + j * 0.8 + st.seed * 0.1) * r * (0.02 + f.treble * 0.05);
    const ctrlX = (ax + bx) * 0.5 + nx * lateralWave;
    const ctrlY = (ay + by) * 0.5 + ny * lateralWave;

    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ctrlX, ctrlY, bx, by);
  }
  strokeGlow(f, mixRGB(colAt(f, 0.48), WHITE, 0.6), 0.85 * presence, Math.max(1.1 * u, 1.6 * f.stroke * u), 3.2);

  // ── CAPA 4: Axones Eferentes Extracelulares (High Energy Synapses) ──
  ctx.beginPath();
  let bestTip0 = -1, bestTip1 = -1, bestTip2 = -1, bestTip3 = -1;
  let tipX0 = 0, tipY0 = 0, tipX1 = 0, tipY1 = 0, tipX2 = 0, tipY2 = 0, tipX3 = 0, tipY3 = 0;

  for (let j = 0; j < NB; j++) {
    const th = UP + ((j + 0.5) / NB) * TAU + spin;
    const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
    const v = Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uu) * 11))] * (1 + 1.8 * (1 - uu)));
    if (v < 0.28) continue;

    const length = r * (0.16 + v * 0.92 * f.fx.formScale * f.fx.reach) * (0.7 + 0.3 * presence);
    const startX = PX[NA + j];
    const startY = PY[NA + j];

    const curveLat = Math.sin(j * 1.7 + st.seed * 0.25) * r * (0.04 + f.treble * 0.08);
    const midD = RB + length * 0.55;
    const endD = RB + length;

    const midAng = th + curveLat / midD;
    const endAng = th + (curveLat * 1.6) / endD;

    const ctrlX = cx + Math.cos(midAng) * midD;
    const ctrlY = cy + Math.sin(midAng) * midD;
    const endX = cx + Math.cos(endAng) * endD;
    const endY = cy + Math.sin(endAng) * endD;

    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);

    // Rastreo de los 4 axones más intensos
    if (v > bestTip0) {
      bestTip3 = bestTip2; tipX3 = tipX2; tipY3 = tipY2;
      bestTip2 = bestTip1; tipX2 = tipX1; tipY2 = tipY1;
      bestTip1 = bestTip0; tipX1 = tipX0; tipY1 = tipY0;
      bestTip0 = v; tipX0 = endX; tipY0 = endY;
    } else if (v > bestTip1) {
      bestTip3 = bestTip2; tipX3 = tipX2; tipY3 = tipY2;
      bestTip2 = bestTip1; tipX2 = tipX1; tipY2 = tipY1;
      bestTip1 = v; tipX1 = endX; tipY1 = endY;
    } else if (v > bestTip2) {
      bestTip3 = bestTip2; tipX3 = tipX2; tipY3 = tipY2;
      bestTip2 = v; tipX2 = endX; tipY2 = endY;
    } else if (v > bestTip3) {
      bestTip3 = v; tipX3 = endX; tipY3 = endY;
    }
  }
  strokeGlow(f, mixRGB(colAt(f, 0.42), WHITE, 0.72), presence, Math.max(1.3 * u, 2.0 * f.stroke * u), 3.8);

  // ── CAPA 5: Nodos Somáticos y Sinapsis Bio-luminiscentes ──
  ctx.globalCompositeOperation = fin.add ? 'lighter' : 'source-over';
  for (let i = 0; i < NA + NB; i++) {
    const th = i < NA ? UP + (i / NA) * TAU + spin : UP + ((i - NA + 0.5) / NB) * TAU + spin;
    const uu = Math.abs(wrapPi(th - UP)) / Math.PI;
    const lv = Math.min(1.25, bars.lvl[Math.min(11, Math.floor((1 - uu) * 11))] * (1 + 1.8 * (1 - uu)));
    const s = Math.max(2.0 * u, r * (0.016 + 0.035 * lv) * (i < NA ? 1 : 1.35));
    const colNode = colAt(f, i < NA ? i / NA : (i - NA) / NB);

    // Halo bio-luminiscente difuso
    ctx.beginPath();
    ctx.arc(PX[i], PY[i], s * 1.6, 0, TAU);
    ctx.fillStyle = rgba(colNode, (0.2 + 0.4 * lv) * presence * fin.alpha);
    ctx.fill();

    // Núcleo de diamante somático
    ctx.beginPath();
    ctx.arc(PX[i], PY[i], Math.max(1.0 * u, s * 0.55), 0, TAU);
    ctx.fillStyle = rgba(mixRGB(colNode, WHITE, 0.6), (0.7 + 0.3 * lv) * presence * fin.alpha);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ── CAPA 6: Membrana Mielinizada Interior (0.72..0.86 r) ──
  // Perímetro bio-mórfico elástico interior
  ctx.beginPath();
  const pts = 48;
  for (let q = 0; q <= pts; q++) {
    const th = (q / pts) * TAU;
    const waveIn = Math.sin(th * 5 + t * 2.6) * r * (0.012 + f.mids * 0.022);
    const rr = r * 0.85 - e.pop * r * 0.02 + waveIn;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (q === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  strokeGlow(f, colAt(f, 0.8), (0.55 + f.mids * 0.45) * presence, Math.max(1.1 * u, 1.4 * u), 2.6);

  // 10 dendritas curvadas hacia el interior (0.88 r → 0.74 r)
  ctx.beginPath();
  for (let sp = 0; sp < 10; sp++) {
    const th = (sp / 10) * TAU + spin * 0.5;
    const startX = cx + Math.cos(th) * (r * 0.88);
    const startY = cy + Math.sin(th) * (r * 0.88);
    const endR = r * (0.75 - f.mids * 0.02);
    const curveAng = th + Math.sin(sp + t * 2.0) * 0.12;
    const endX = cx + Math.cos(curveAng) * endR;
    const endY = cy + Math.sin(curveAng) * endR;

    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(
      (startX + endX) * 0.5 + Math.cos(th + HALF_PI) * (r * 0.025),
      (startY + endY) * 0.5 + Math.sin(th + HALF_PI) * (r * 0.025),
      endX,
      endY
    );
  }
  ctx.strokeStyle = rgba(mixRGB(colAt(f, 0.5), WHITE, 0.5), (0.35 + f.treble * 0.45) * presence * fin.alpha);
  ctx.lineWidth = Math.max(0.8 * u, 1.1);
  ctx.stroke();

  ctx.restore();

  // ── ÁPICES DE AXONES PARA EFECTOS PRO (Zero-GC) ──
  if (bestTip0 > 0) {
    NEURAL_TIPS[0].x = tipX0; NEURAL_TIPS[0].y = tipY0;
    NEURAL_TIPS[1].x = bestTip1 > 0 ? tipX1 : tipX0; NEURAL_TIPS[1].y = bestTip1 > 0 ? tipY1 : tipY0;
    NEURAL_TIPS[2].x = bestTip2 > 0 ? tipX2 : tipX0; NEURAL_TIPS[2].y = bestTip2 > 0 ? tipY2 : tipY0;
    NEURAL_TIPS[3].x = bestTip3 > 0 ? tipX3 : tipX0; NEURAL_TIPS[3].y = bestTip3 > 0 ? tipY3 : tipY0;
  } else {
    // En reposo, anclar a 4 nodos cardinales del anillo B
    for (let k = 0; k < 4; k++) {
      const idx = NA + Math.floor((k * NB) / 4);
      NEURAL_TIPS[k].x = PX[idx];
      NEURAL_TIPS[k].y = PY[idx];
    }
  }
  return NEURAL_TIPS;
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

