/**
 * Las cuatro plantillas de la tarjeta y el punto de entrada `renderStoryCard`.
 * La vista previa del editor y la exportación a PNG llaman a esta misma función, así que lo que se
 * ve en pantalla es exactamente lo que se descarga.
 */
import {
  createLayout,
  drawArt,
  drawHeader,
  drawProfile,
  drawTextBlock,
  font,
  measureTextBlock,
  profileReserve,
  type CardRenderInput,
  type Layout,
} from './blocks';
import {
  getNoiseTile,
  hashString,
  mixHex,
  mulberry32,
  rgba,
  roundedRectPath,
  type Ctx,
} from './draw';

interface Zones {
  /** Borde inferior del bloque de texto */
  textBottom: number;
  textTop: number;
  /** Franja vertical disponible para la imagen principal */
  artTop: number;
  artH: number;
}

/**
 * Reparte la altura útil: cabecera arriba, perfil abajo, el texto encima del perfil y la imagen
 * ocupando lo que queda entre la cabecera y el texto.
 */
function computeZones(
  ctx: Ctx,
  L: Layout,
  input: CardRenderInput,
  opts: { textPad?: number; textMaxWidth?: number } = {}
): Zones {
  const { config } = input;
  const u = L.u;
  const hasHeader = config.elements.logo || config.elements.date;
  const headerBottom = hasHeader ? L.safeTop + 36 * u : L.safeTop;
  const textPad = (opts.textPad ?? 0) * u;

  const textBottom = L.safeBottom - profileReserve(L, input) - textPad;
  const textTop = textBottom - measureTextBlock(ctx, L, input, opts.textMaxWidth);
  const artTop = headerBottom + 40 * u;
  const artBottom = textTop - textPad - 52 * u;
  return { textBottom, textTop, artTop, artH: Math.max(120 * u, artBottom - artTop) };
}

function fillBackground(ctx: Ctx, L: Layout, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, L.W, L.H);
}

function radial(ctx: Ctx, cx: number, cy: number, r0: number, r1: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r1, cy - r1, r1 * 2, r1 * 2);
}

// ── Void ────────────────────────────────────────────────────────────────────

function voidTemplate(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config } = input;
  const u = L.u;
  fillBackground(ctx, L, config.backgroundColor);

  const z = computeZones(ctx, L, input);
  const size = Math.min(L.contentW * 0.92, z.artH);
  const cx = L.cx;
  const cy = z.artTop + z.artH / 2;

  // Aura principal y reflejo secundario
  radial(ctx, cx, cy, size * 0.1, L.W * 0.95, rgba(config.primaryColor, 0.36), rgba(config.primaryColor, 0));
  radial(ctx, cx + L.W * 0.28, cy + size * 0.42, 0, L.W * 0.55, rgba(config.secondaryColor, 0.2), rgba(config.secondaryColor, 0));

  // Anillos concéntricos, cada vez más tenues
  ctx.save();
  ctx.lineWidth = Math.max(1, 1.6 * u);
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + k * 42 * u, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(config.textColor, 0.12 - k * 0.03);
    ctx.stroke();
  }
  ctx.restore();

  drawArt(ctx, L, input, {
    shape: 'circle',
    x: cx - size / 2,
    y: cy - size / 2,
    w: size,
    h: size,
    backdrop: rgba(config.backgroundColor, 0.6),
  });
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.16);
  ctx.stroke();
  ctx.restore();

  drawHeader(ctx, L, input);
  drawTextBlock(ctx, L, input, { bottom: z.textBottom });
  drawProfile(ctx, L, input);
}

// ── Aesthetic ───────────────────────────────────────────────────────────────

function aestheticTemplate(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config } = input;
  const u = L.u;

  fillBackground(ctx, L, config.backgroundColor);
  const diag = ctx.createLinearGradient(0, 0, L.W, L.H);
  diag.addColorStop(0, mixHex(config.backgroundColor, config.primaryColor, 0.28));
  diag.addColorStop(0.5, config.backgroundColor);
  diag.addColorStop(1, mixHex(config.backgroundColor, config.secondaryColor, 0.28));
  ctx.fillStyle = diag;
  ctx.fillRect(0, 0, L.W, L.H);

  // Orbes difusos que dan la sensación de degradado en malla
  radial(ctx, L.W * 0.12, L.H * 0.16, 0, L.W * 0.95, rgba(config.primaryColor, 0.38), rgba(config.primaryColor, 0));
  radial(ctx, L.W * 0.92, L.H * 0.86, 0, L.W * 0.95, rgba(config.secondaryColor, 0.32), rgba(config.secondaryColor, 0));
  radial(ctx, L.W * 0.5, L.H * 0.5, 0, L.W * 0.5, rgba(mixHex(config.primaryColor, config.secondaryColor, 0.5), 0.12), 'rgba(0,0,0,0)');

  const z = computeZones(ctx, L, input);
  const barSpace = 64 * u;
  const size = Math.min(L.contentW * 0.86, z.artH - barSpace);
  const x = L.cx - size / 2;
  const y = z.artTop + Math.max(0, (z.artH - barSpace - size) / 2);
  const radius = 64 * u;

  // Sombra profunda bajo la imagen
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 80 * u;
  ctx.shadowOffsetY = 30 * u;
  roundedRectPath(ctx, x, y, size, size, radius);
  ctx.fillStyle = config.backgroundColor;
  ctx.fill();
  ctx.restore();

  drawArt(ctx, L, input, {
    shape: 'roundrect',
    x,
    y,
    w: size,
    h: size,
    radius,
    backdrop: rgba(config.backgroundColor, 0.55),
  });

  // Borde de cristal
  ctx.save();
  roundedRectPath(ctx, x, y, size, size, radius);
  ctx.lineWidth = Math.max(1, 2.5 * u);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();
  ctx.restore();

  // Barra de progreso decorativa, como en un reproductor
  const barY = y + size + 36 * u;
  ctx.save();
  roundedRectPath(ctx, x, barY, size, 7 * u, 3.5 * u);
  ctx.fillStyle = rgba(config.textColor, 0.2);
  ctx.fill();
  const fillW = size * 0.38;
  const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
  grad.addColorStop(0, config.primaryColor);
  grad.addColorStop(1, config.secondaryColor);
  roundedRectPath(ctx, x, barY, fillW, 7 * u, 3.5 * u);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + fillW, barY + 3.5 * u, 11 * u, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  drawHeader(ctx, L, input);
  drawTextBlock(ctx, L, input, { bottom: z.textBottom });
  drawProfile(ctx, L, input);
}

// ── Studio ──────────────────────────────────────────────────────────────────

const SPECTRUM_BARS = 44;

/** Espectro decorativo determinista: único por canción (la misma tarjeta sale siempre igual) */
export function spectrumHeights(seedText: string, count = SPECTRUM_BARS): number[] {
  const rand = mulberry32(hashString(seedText));
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const f1 = 0.22 + rand() * 0.25;
  const f2 = 0.5 + rand() * 0.5;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const envelope = 0.55 + 0.45 * Math.sin(t * Math.PI); // más alto en el centro
    const wave = 0.5 + 0.28 * Math.sin(i * f1 + p1) + 0.22 * Math.sin(i * f2 + p2);
    return Math.min(1, Math.max(0.12, wave * envelope + (rand() - 0.5) * 0.12));
  });
}

function studioTemplate(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config, content } = input;
  const u = L.u;

  fillBackground(ctx, L, config.backgroundColor);
  const wash = ctx.createLinearGradient(0, 0, 0, L.H);
  wash.addColorStop(0, rgba(config.primaryColor, 0.1));
  wash.addColorStop(1, rgba(config.secondaryColor, 0.06));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, L.W, L.H);

  // Rejilla técnica
  ctx.save();
  ctx.lineWidth = Math.max(1, 1 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.05);
  const step = 54 * u;
  ctx.beginPath();
  for (let gx = 0; gx <= L.W; gx += step) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, L.H);
  }
  for (let gy = 0; gy <= L.H; gy += step) {
    ctx.moveTo(0, gy);
    ctx.lineTo(L.W, gy);
  }
  ctx.stroke();
  ctx.restore();

  const panelPad = 36;
  const textMax = L.contentW - 80 * u;
  const z = computeZones(ctx, L, input, { textPad: panelPad, textMaxWidth: textMax });
  const spectrumH = 84 * u;
  const winH = Math.min(z.artH - spectrumH - 28 * u, L.contentW * 0.62);
  const winW = Math.min(L.contentW, winH / 0.62);
  const winX = L.cx - winW / 2;
  const winY = z.artTop + Math.max(0, (z.artH - spectrumH - 28 * u - winH) / 2);

  // Ventana del visualizador con esquinas de «pantalla de estudio»
  drawArt(ctx, L, input, {
    shape: 'roundrect',
    x: winX,
    y: winY,
    w: winW,
    h: winH,
    radius: 26 * u,
    backdrop: 'rgba(0, 0, 0, 0.5)',
  });
  ctx.save();
  roundedRectPath(ctx, winX, winY, winW, winH, 26 * u);
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.22);
  ctx.stroke();

  const b = 30 * u;
  const inset = 14 * u;
  ctx.strokeStyle = config.primaryColor;
  ctx.lineWidth = Math.max(1.5, 3 * u);
  ctx.lineCap = 'round';
  const corners: [number, number, number, number][] = [
    [winX + inset, winY + inset, 1, 1],
    [winX + winW - inset, winY + inset, -1, 1],
    [winX + inset, winY + winH - inset, 1, -1],
    [winX + winW - inset, winY + winH - inset, -1, -1],
  ];
  for (const [px, py, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(px + dx * b, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py + dy * b);
    ctx.stroke();
  }
  ctx.restore();

  // Espectro decorativo bajo la ventana
  const heights = spectrumHeights(content.title + content.artist);
  const gap = 5 * u;
  const barW = (winW - gap * (SPECTRUM_BARS - 1)) / SPECTRUM_BARS;
  const baseY = winY + winH + 28 * u + spectrumH;
  const grad = ctx.createLinearGradient(winX, 0, winX + winW, 0);
  grad.addColorStop(0, config.primaryColor);
  grad.addColorStop(1, config.secondaryColor);
  ctx.save();
  ctx.fillStyle = grad;
  heights.forEach((h, i) => {
    const bh = Math.max(4 * u, h * spectrumH);
    roundedRectPath(ctx, winX + i * (barW + gap), baseY - bh, barW, bh, Math.min(barW / 2, 4 * u));
    ctx.fill();
  });
  ctx.restore();

  // Panel de cristal con los datos de la canción
  const panelTop = z.textTop - panelPad * u;
  const panelBottom = z.textBottom + panelPad * u;
  ctx.save();
  roundedRectPath(ctx, L.marginX, panelTop, L.contentW, panelBottom - panelTop, 34 * u);
  ctx.fillStyle = rgba(config.textColor, 0.06);
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.8 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.16);
  ctx.stroke();
  ctx.restore();

  drawHeader(ctx, L, input);
  drawTextBlock(ctx, L, input, {
    bottom: z.textBottom,
    maxWidth: textMax,
    x: L.align === 'center' ? L.cx : L.marginX + 40 * u,
  });
  drawProfile(ctx, L, input);
}

// ── Vinyl ───────────────────────────────────────────────────────────────────

function vinylTemplate(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config } = input;
  const u = L.u;

  fillBackground(ctx, L, config.backgroundColor);
  const z = computeZones(ctx, L, input);
  const D = Math.min(L.contentW * 0.94, z.artH);
  const R = D / 2;
  const cx = L.cx;
  const cy = z.artTop + z.artH / 2;

  // Resplandores etéreos de fondo detrás del plato
  radial(ctx, cx, cy, R * 0.25, L.W * 0.92, rgba(config.primaryColor, 0.26), rgba(config.primaryColor, 0));
  radial(ctx, L.W * 0.1, L.H * 0.92, 0, L.W * 0.7, rgba(config.secondaryColor, 0.16), rgba(config.secondaryColor, 0));

  // Disco: cuerpo principal con relieve y profundidad de sombra
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 80 * u;
  ctx.shadowOffsetY = 28 * u;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  const vinylBg = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
  vinylBg.addColorStop(0, '#111218');
  vinylBg.addColorStop(0.6, '#090a0e');
  vinylBg.addColorStop(1, '#050508');
  ctx.fillStyle = vinylBg;
  ctx.fill();
  ctx.restore();

  const labelR = R * 0.38;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Surcos analógicos de alta densidad agrupados en pistas
  const innerTrack = labelR + 10 * u;
  const outerTrack = R - 6 * u;
  const trackSpan = outerTrack - innerTrack;

  ctx.lineWidth = Math.max(0.75, 0.95 * u);
  let gIdx = 0;
  for (let r = innerTrack; r < outerTrack; r += 3.8 * u, gIdx++) {
    const norm = (r - innerTrack) / trackSpan;
    // Bandas de canciones (pausas o silencios entre cortes de audio)
    const isSongGap = (norm > 0.31 && norm < 0.34) || (norm > 0.65 && norm < 0.68);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (isSongGap) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    } else if (gIdx % 10 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)';
    } else if (gIdx % 4 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
    }
    ctx.stroke();
  }

  // Reflejo anisótropo cónico ("bowtie sheen" en mariposa opuesta)
  const lobes: { angles: [number, number]; alpha: number }[] = [
    // Lóbulo principal superior-derecho / inferior-izquierdo
    { angles: [-0.95, -0.45], alpha: 0.11 },
    { angles: [-0.8, -0.6], alpha: 0.17 },
    { angles: [2.19, 2.69], alpha: 0.11 },
    { angles: [2.34, 2.54], alpha: 0.17 },
    // Lóbulo secundario perpendicular a 90° (iluminación de sala)
    { angles: [0.65, 1.05], alpha: 0.05 },
    { angles: [-2.45, -2.05], alpha: 0.05 },
  ];

  for (const lobe of lobes) {
    const sheenGrad = ctx.createRadialGradient(cx, cy, labelR, cx, cy, R);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.2, `rgba(255, 255, 255, ${lobe.alpha * 0.4})`);
    sheenGrad.addColorStop(0.55, `rgba(255, 255, 255, ${lobe.alpha})`);
    sheenGrad.addColorStop(0.85, `rgba(255, 255, 255, ${lobe.alpha * 0.6})`);
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, lobe.angles[0], lobe.angles[1]);
    ctx.closePath();
    ctx.fillStyle = sheenGrad;
    ctx.fill();
  }
  ctx.restore();

  // Borde exterior biselado con filo especular
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, 3 * u);
  const rimGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  rimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
  ctx.strokeStyle = rimGrad;
  ctx.stroke();
  ctx.restore();

  // Etiqueta central con la imagen principal
  drawArt(ctx, L, input, {
    shape: 'circle',
    x: cx - labelR,
    y: cy - labelR,
    w: labelR * 2,
    h: labelR * 2,
    backdrop: rgba(config.primaryColor, 0.35),
  });

  // Anillo exterior de la etiqueta con relieve
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, 4 * u);
  ctx.strokeStyle = rgba(config.primaryColor, 0.88);
  ctx.stroke();

  // Casquillo metálico torneado (Spindle Bushing)
  const grommetR = 15 * u;
  const holeR = 6 * u;
  const bushingGrad = ctx.createLinearGradient(cx - grommetR, cy - grommetR, cx + grommetR, cy + grommetR);
  bushingGrad.addColorStop(0, '#f1f5f9');
  bushingGrad.addColorStop(0.3, '#94a3b8');
  bushingGrad.addColorStop(0.7, '#cbd5e1');
  bushingGrad.addColorStop(1, '#475569');

  ctx.beginPath();
  ctx.arc(cx, cy, grommetR, 0, Math.PI * 2);
  ctx.fillStyle = bushingGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.stroke();

  // Agujero central de encastre
  ctx.beginPath();
  ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
  ctx.fillStyle = '#020204';
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, 1 * u);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();
  ctx.restore();

  // Brazo fonocaptor para audiófilos (Tonearm)
  const pivotX = cx + R * 0.98;
  const pivotY = cy - R * 0.8;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Base y pivote con textura metálica
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 34 * u, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 17, 26, 0.85)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, 3 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.35);
  ctx.stroke();

  // Anillo interior del pivote
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 18 * u, 0, Math.PI * 2);
  ctx.fillStyle = rgba(config.primaryColor, 0.3);
  ctx.fill();
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.strokeStyle = rgba(config.textColor, 0.6);
  ctx.stroke();

  // Tubo del brazo con degradado metálico y sombra proyectada
  const elbowX = cx + R * 0.58;
  const elbowY = cy + R * 0.12;
  const headX = cx + R * 0.44;
  const headY = cy + R * 0.34;

  const armGrad = ctx.createLinearGradient(pivotX, pivotY, headX, headY);
  armGrad.addColorStop(0, '#e2e8f0');
  armGrad.addColorStop(0.5, '#64748b');
  armGrad.addColorStop(1, '#94a3b8');

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12 * u;
  ctx.shadowOffsetY = 8 * u;

  ctx.strokeStyle = armGrad;
  ctx.lineWidth = Math.max(2.5, 7 * u);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(headX, headY);
  ctx.stroke();

  // Headshell / Cápsula fonocaptora
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.translate(headX, headY);
  ctx.rotate(0.52);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-7 * u, -12 * u, 14 * u, 24 * u);
  ctx.lineWidth = Math.max(1, 1.8 * u);
  ctx.strokeStyle = config.primaryColor;
  ctx.strokeRect(-7 * u, -12 * u, 14 * u, 24 * u);

  // Aguja / stylus
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, 10 * u, 2.5 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  drawHeader(ctx, L, input);
  drawTextBlock(ctx, L, input, { bottom: z.textBottom });
  drawProfile(ctx, L, input);
}

// ── Liquid visionOS ─────────────────────────────────────────────────────────

function liquidGlassTemplate(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config } = input;
  const u = L.u;

  fillBackground(ctx, L, config.backgroundColor);

  // Fondo etéreo con aurora espacial multidireccional
  const bgGrad = ctx.createLinearGradient(0, 0, L.W, L.H);
  bgGrad.addColorStop(0, mixHex(config.backgroundColor, config.primaryColor, 0.22));
  bgGrad.addColorStop(0.45, config.backgroundColor);
  bgGrad.addColorStop(1, mixHex(config.backgroundColor, config.secondaryColor, 0.24));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, L.W, L.H);

  // Orbes de luz líquida difusa (VisionOS dynamic illumination)
  radial(ctx, L.W * 0.25, L.H * 0.22, 0, L.W * 0.85, rgba(config.primaryColor, 0.35), rgba(config.primaryColor, 0));
  radial(ctx, L.W * 0.78, L.H * 0.75, 0, L.W * 0.8, rgba(config.secondaryColor, 0.28), rgba(config.secondaryColor, 0));
  radial(
    ctx,
    L.W * 0.5,
    L.H * 0.5,
    0,
    L.W * 0.65,
    rgba(mixHex(config.primaryColor, config.secondaryColor, 0.5), 0.14),
    'rgba(0,0,0,0)'
  );

  const panelPad = 32;
  const textMax = L.contentW - 64 * u;
  const z = computeZones(ctx, L, input, { textPad: panelPad, textMaxWidth: textMax });

  const pillSpace = 54 * u;
  const artSize = Math.min(L.contentW * 0.84, z.artH - pillSpace);
  const artX = L.cx - artSize / 2;
  const artY = z.artTop + Math.max(0, (z.artH - pillSpace - artSize) / 2);
  const artRadius = 48 * u;

  // Resplandor de retroiluminación cromática detrás de la carátula
  radial(
    ctx,
    L.cx,
    artY + artSize / 2,
    artSize * 0.2,
    artSize * 0.85,
    rgba(config.primaryColor, 0.42 * (config.bloom ?? 0.6)),
    'rgba(0,0,0,0)'
  );

  // Sombra profunda flotante (Spatial Elevation)
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 90 * u;
  ctx.shadowOffsetY = 36 * u;
  roundedRectPath(ctx, artX, artY, artSize, artSize, artRadius);
  ctx.fillStyle = config.backgroundColor;
  ctx.fill();
  ctx.restore();

  // Carátula o visualizador
  drawArt(ctx, L, input, {
    shape: 'roundrect',
    x: artX,
    y: artY,
    w: artSize,
    h: artSize,
    radius: artRadius,
    backdrop: rgba(config.backgroundColor, 0.6),
  });

  // Bisel de cristal especular visionOS sobre la carátula
  ctx.save();
  roundedRectPath(ctx, artX, artY, artSize, artSize, artRadius);
  ctx.lineWidth = Math.max(1.5, 2.8 * u);
  const artEdgeGrad = ctx.createLinearGradient(artX, artY, artX, artY + artSize);
  artEdgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  artEdgeGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
  artEdgeGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
  artEdgeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
  ctx.strokeStyle = artEdgeGrad;
  ctx.stroke();
  ctx.restore();

  // Cápsula flotante translúcida de fidelidad espacial (Lossless Spatial Pill)
  const pillY = artY + artSize + 20 * u;
  const pillH = 34 * u;
  const pillW = Math.min(240 * u, artSize * 0.72);
  const pillX = L.cx - pillW / 2;
  const pillRadius = pillH / 2;

  ctx.save();
  // Cristal de la cápsula
  roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.4 * u);
  const pillStrokeGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  pillStrokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  pillStrokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
  ctx.strokeStyle = pillStrokeGrad;
  ctx.stroke();

  // Mini barras de ondas de audio dentro de la cápsula
  const waveBars = 4;
  const barW = 3 * u;
  const waveStartX = pillX + 16 * u;
  const waveCenterY = pillY + pillH / 2;
  ctx.fillStyle = config.primaryColor;
  for (let i = 0; i < waveBars; i++) {
    const h = (8 + (i % 2 === 0 ? 10 : 5)) * u;
    roundedRectPath(ctx, waveStartX + i * 7 * u, waveCenterY - h / 2, barW, h, barW / 2);
    ctx.fill();
  }

  // Texto de la cápsula
  ctx.font = font(L, 600, Math.max(9, 11 * u));
  ctx.fillStyle = rgba(config.textColor, 0.85);
  ctx.textBaseline = 'middle';
  ctx.fillText('AURA SPATIAL ENGINE', waveStartX + waveBars * 7 * u + 8 * u, waveCenterY);
  ctx.restore();

  // Dock de cristal para el bloque de texto (visionOS Frosted Glass Card)
  const dockTop = z.textTop - panelPad * u;
  const dockBottom = z.textBottom + panelPad * u;
  const dockH = dockBottom - dockTop;
  const dockRadius = 40 * u;

  ctx.save();
  // Sombra del panel
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 60 * u;
  ctx.shadowOffsetY = 20 * u;
  roundedRectPath(ctx, L.marginX, dockTop, L.contentW, dockH, dockRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.restore();

  // Borde de cristal con luz especular superior
  ctx.save();
  roundedRectPath(ctx, L.marginX, dockTop, L.contentW, dockH, dockRadius);
  ctx.lineWidth = Math.max(1, 2 * u);
  const dockStrokeGrad = ctx.createLinearGradient(L.marginX, dockTop, L.marginX, dockBottom);
  dockStrokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  dockStrokeGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.15)');
  dockStrokeGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.04)');
  dockStrokeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
  ctx.strokeStyle = dockStrokeGrad;
  ctx.stroke();

  // Línea de brillo especular interno en el borde superior
  ctx.beginPath();
  ctx.arc(L.marginX + dockRadius, dockTop + dockRadius, dockRadius, Math.PI, Math.PI * 1.5);
  ctx.lineTo(L.marginX + L.contentW - dockRadius, dockTop);
  ctx.arc(L.marginX + L.contentW - dockRadius, dockTop + dockRadius, dockRadius, Math.PI * 1.5, 0);
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();
  ctx.restore();

  drawHeader(ctx, L, input);
  drawTextBlock(ctx, L, input, {
    bottom: z.textBottom,
    maxWidth: textMax,
    x: L.align === 'center' ? L.cx : L.marginX + 32 * u,
  });
  drawProfile(ctx, L, input);
}

// ── Acabado ─────────────────────────────────────────────────────────────────

/** Viñeta y grano de película. El grano es un patrón repetido, no un recorrido píxel a píxel. */
function applyFinish(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  const { config, createCanvas } = input;

  if (config.vignette > 0) {
    const g = ctx.createRadialGradient(L.cx, L.H / 2, Math.min(L.W, L.H) * 0.3, L.cx, L.H / 2, Math.hypot(L.W, L.H) / 2);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(0.7, `rgba(0, 0, 0, ${config.vignette * 0.3})`);
    g.addColorStop(1, `rgba(0, 0, 0, ${config.vignette * 0.85})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.W, L.H);
  }

  if (config.grain > 0) {
    const tile = getNoiseTile(createCanvas);
    const pattern = ctx.createPattern(tile as unknown as CanvasImageSource, 'repeat');
    if (pattern) {
      ctx.save();
      ctx.scale(L.u, L.u); // el grano mantiene el mismo tamaño relativo en la vista previa y en 1080
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(1, config.grain * 1.7);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, L.W / L.u, L.H / L.u);
      ctx.restore();
    }
  }
}

const TEMPLATES = {
  pure_void: voidTemplate,
  aesthetic: aestheticTemplate,
  studio: studioTemplate,
  vinyl: vinylTemplate,
  liquid_glass: liquidGlassTemplate,
} as const;

/** Dibuja la tarjeta completa en `ctx` con el tamaño `width`×`height` (cualquier escala). */
export function renderStoryCard(ctx: Ctx, width: number, height: number, input: CardRenderInput): void {
  const L = createLayout(input.config, width, height);
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  TEMPLATES[input.config.template](ctx, L, input);
  applyFinish(ctx, L, input);
  ctx.restore();
}
