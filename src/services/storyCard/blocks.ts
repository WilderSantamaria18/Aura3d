/**
 * Piezas compartidas por las plantillas: disposición con zonas seguras de Instagram, cabecera,
 * bloque de texto, insignia de perfil y arte de reserva. Todas las medidas se expresan en unidades
 * `u` (1 u = 1 px en una tarjeta de 1080 de ancho) para que la vista previa pequeña y la
 * exportación a 1080 sean la misma composición.
 */
import {
  CARD_FONTS,
  CARD_FORMATS,
  type CardConfig,
  type ResolvedCardContent,
} from './config';
import {
  drawImageContain,
  drawImageCover,
  drawTracked,
  hashString,
  measureTracked,
  mixHex,
  mulberry32,
  rgba,
  roundedRectPath,
  wrapText,
  type CanvasFactory,
  type Ctx,
} from './draw';

export interface CardAssets {
  /** Captura del visualizador activo (con transparencia) */
  visualizer: CanvasImageSource | null;
  /** Portada de la canción, solo si el navegador permitió leerla (CORS) */
  cover: CanvasImageSource | null;
  avatar: CanvasImageSource | null;
}

export interface CardRenderInput {
  config: CardConfig;
  content: ResolvedCardContent;
  assets: CardAssets;
  createCanvas: CanvasFactory;
}

export interface Layout {
  W: number;
  H: number;
  /** Factor de escala: 1 cuando la tarjeta mide 1080 de ancho */
  u: number;
  cx: number;
  marginX: number;
  contentW: number;
  /** Límites verticales del contenido importante (fuera quedan la cabecera y el campo de respuesta de IG) */
  safeTop: number;
  safeBottom: number;
  /** Escala del texto: las tarjetas menos altas necesitan texto algo menor */
  textScale: number;
  fontFamily: string;
  align: 'left' | 'center';
  textX: number;
}

export function createLayout(config: CardConfig, W: number, H: number): Layout {
  const u = W / 1080;
  const spec = CARD_FORMATS[config.format];
  const marginX = 72 * u;
  return {
    W,
    H,
    u,
    cx: W / 2,
    marginX,
    contentW: W - marginX * 2,
    // En historias, Instagram tapa ~14% arriba (barra de progreso y perfil) y ~20% abajo (responder)
    safeTop: H * (spec.hasStoryChrome ? 0.135 : 0.06),
    safeBottom: H * (spec.hasStoryChrome ? 0.8 : 0.94),
    textScale: config.format === 'story' ? 1 : config.format === 'post' ? 0.9 : 0.78,
    fontFamily: CARD_FONTS[config.font].family,
    align: config.layout === 'center' ? 'center' : 'left',
    textX: config.layout === 'center' ? W / 2 : marginX,
  };
}

export const font = (L: Layout, weight: number, size: number): string =>
  `${weight} ${Math.max(1, Math.round(size))}px ${L.fontFamily}`;

const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';
const monoFont = (weight: number, size: number): string => `${weight} ${Math.max(1, Math.round(size))}px ${MONO}`;

// ── Cabecera ────────────────────────────────────────────────────────────────

/** Marca y fecha en la parte superior del área segura. Devuelve el borde inferior que ocupa. */
export function drawHeader(ctx: Ctx, L: Layout, input: CardRenderInput): number {
  const { config, content } = input;
  const { u } = L;
  const showLogo = config.elements.logo;
  const showDate = config.elements.date;
  if (!showLogo && !showDate) return L.safeTop;

  const y = L.safeTop;
  ctx.save();
  ctx.textBaseline = 'middle';
  const midY = y + 18 * u;

  if (showLogo) {
    const grad = ctx.createLinearGradient(L.marginX, midY, L.marginX + 28 * u, midY);
    grad.addColorStop(0, config.primaryColor);
    grad.addColorStop(1, config.secondaryColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(L.marginX + 10 * u, midY, 10 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(config.textColor, 0.92);
    ctx.font = font(L, 700, 26 * u);
    drawTracked(ctx, 'AURA3D', L.marginX + 34 * u, midY, 5 * u, 'left');
  }

  if (showDate) {
    ctx.fillStyle = rgba(config.textColor, 0.5);
    ctx.font = monoFont(500, 22 * u);
    drawTracked(ctx, content.dateLabel, L.W - L.marginX, midY, 2.5 * u, 'right');
  }
  ctx.restore();
  return y + 36 * u;
}

// ── Chips ───────────────────────────────────────────────────────────────────

function drawChip(ctx: Ctx, L: Layout, input: CardRenderInput, label: string, x: number, y: number): number {
  const { config } = input;
  const { u } = L;
  const h = 52 * u * L.textScale;
  ctx.save();
  ctx.font = monoFont(600, 22 * u * L.textScale);
  const textW = measureTracked(ctx, label, 2 * u);
  const w = textW + 44 * u * L.textScale;

  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = rgba(config.textColor, 0.07);
  ctx.fill();
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.strokeStyle = rgba(config.primaryColor, 0.45);
  ctx.stroke();

  ctx.fillStyle = rgba(config.textColor, 0.9);
  ctx.textBaseline = 'middle';
  drawTracked(ctx, label, x + 22 * u * L.textScale, y + h / 2 + 1 * u, 2 * u, 'left');
  ctx.restore();
  return w;
}

// ── Bloque de texto ─────────────────────────────────────────────────────────

export interface TextBlockOptions {
  /** Borde inferior del bloque: el texto se dibuja hacia arriba desde aquí */
  bottom: number;
  /** Ancho máximo (por defecto el del contenido) */
  maxWidth?: number;
  /** x de anclaje y alineación (por defecto, los del layout elegido) */
  x?: number;
  align?: 'left' | 'center';
}

interface TextPlan {
  chips: string[];
  lines: string[];
  titleSize: number;
  titleLine: number;
  artistSize: number;
  captionH: number;
  artistH: number;
  total: number;
}

/** Mide el bloque de texto (título reducido si no cabe en 2 líneas) sin dibujar nada */
function planTextBlock(ctx: Ctx, L: Layout, input: CardRenderInput, maxW: number): TextPlan {
  const { config, content } = input;
  const { u, textScale: ts } = L;

  const chips: string[] = [];
  if (config.elements.metadata) {
    if (content.bpm) chips.push(`${content.bpm} BPM`);
    if (content.key) chips.push(content.key);
  }

  // Título: se reduce hasta que quepa en 2 líneas sin recortar (con un mínimo legible)
  let titleSize = 92 * u * ts;
  const minTitle = 56 * u * ts;
  let lines: string[] = [];
  for (;;) {
    ctx.save();
    ctx.font = font(L, 800, titleSize);
    lines = wrapText(ctx, content.title, maxW, 2);
    ctx.restore();
    const clipped = lines.some((l) => l.endsWith('…'));
    if (!clipped || titleSize <= minTitle) break;
    titleSize = Math.max(minTitle, titleSize - 4 * u);
  }
  const titleLine = titleSize * 1.08;
  const artistSize = 44 * u * ts;
  const captionH = content.caption.length > 0 ? 26 * u * ts + 22 * u : 0;
  const artistH = artistSize * 1.25;
  const chipsH = chips.length ? 30 * u + 52 * u * ts : 0;
  const total = captionH + lines.length * titleLine + 14 * u + artistH + chipsH;
  return { chips, lines, titleSize, titleLine, artistSize, captionH, artistH, total };
}

/** Altura total del bloque de texto: las plantillas la usan para repartir el espacio del arte */
export function measureTextBlock(ctx: Ctx, L: Layout, input: CardRenderInput, maxWidth?: number): number {
  return planTextBlock(ctx, L, input, maxWidth ?? L.contentW).total;
}

/**
 * Sobretítulo, título (hasta 2 líneas), artista y chips de BPM/tono, dibujados hacia arriba desde
 * `opts.bottom`. Devuelve la y superior del bloque.
 */
export function drawTextBlock(ctx: Ctx, L: Layout, input: CardRenderInput, opts: TextBlockOptions): number {
  const { config, content } = input;
  const { u, textScale: ts } = L;
  const maxW = opts.maxWidth ?? L.contentW;
  const align = opts.align ?? L.align;
  const x = opts.x ?? L.textX;
  const plan = planTextBlock(ctx, L, input, maxW);

  let y = opts.bottom - plan.total;
  const top = y;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = align;

  if (plan.captionH > 0) {
    ctx.font = font(L, 600, 24 * u * ts);
    ctx.fillStyle = config.primaryColor;
    drawTracked(ctx, content.caption.toUpperCase(), x, y, 7 * u, align);
    y += plan.captionH;
  }

  ctx.font = font(L, 800, plan.titleSize);
  ctx.fillStyle = config.textColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24 * u;
  ctx.shadowOffsetY = 4 * u;
  for (const line of plan.lines) {
    ctx.fillText(line, x, y);
    y += plan.titleLine;
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  y += 14 * u;
  ctx.font = font(L, 500, plan.artistSize);
  ctx.fillStyle = rgba(config.textColor, 0.72);
  ctx.fillText(wrapText(ctx, content.artist, maxW, 1)[0] ?? '', x, y);
  y += plan.artistH;

  if (plan.chips.length) {
    y += 30 * u;
    ctx.textAlign = 'left';
    const widths = plan.chips.map((label) => {
      ctx.font = monoFont(600, 22 * u * ts);
      return measureTracked(ctx, label, 2 * u) + 44 * u * ts;
    });
    const gap = 14 * u;
    const rowW = widths.reduce((acc, w) => acc + w, 0) + gap * (plan.chips.length - 1);
    let cx = align === 'center' ? x - rowW / 2 : x;
    plan.chips.forEach((label, i) => {
      cx += drawChip(ctx, L, input, label, cx, y) + (i < plan.chips.length - 1 ? gap : 0);
    });
  }
  ctx.restore();
  return top;
}

// ── Perfil ──────────────────────────────────────────────────────────────────

export const PROFILE_ROW_H = 76;

/** ¿Hay algo que mostrar en la insignia de perfil? */
export function hasProfile(input: CardRenderInput): boolean {
  return input.config.profile.show && (input.content.handle.length > 0 || !!input.assets.avatar);
}

function drawAvatar(ctx: Ctx, L: Layout, input: CardRenderInput, cx: number, cy: number, r: number): void {
  const { config, content, assets } = input;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (assets.avatar) {
    drawImageCover(ctx, assets.avatar, cx - r, cy - r, r * 2, r * 2);
  } else {
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, config.primaryColor);
    grad.addColorStop(1, config.secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(L, 700, r * 1.05);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((content.handle[0] || 'A').toUpperCase(), cx, cy + r * 0.06);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, 2 * L.u);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();
  ctx.restore();
}

/**
 * Perfil del usuario (foto + @usuario) al pie del área segura. Estilo «badge»: pastilla de
 * cristal; estilo «signature»: firma discreta sin fondo.
 */
export function drawProfile(ctx: Ctx, L: Layout, input: CardRenderInput): void {
  if (!hasProfile(input)) return;
  const { config, content } = input;
  const { u } = L;
  const badge = config.profile.style === 'badge';
  const rowH = PROFILE_ROW_H * u;
  const top = L.safeBottom - rowH;
  const avatarR = (badge ? 26 : 22) * u;
  const label = content.handle ? `@${content.handle}` : '';

  ctx.save();
  ctx.font = font(L, 600, 30 * u);
  const textW = label ? ctx.measureText(label).width : 0;
  const padL = badge ? 14 * u : 0;
  const padR = badge ? 30 * u : 0;
  const gap = label ? 16 * u : 0;
  const width = padL + avatarR * 2 + gap + textW + padR;
  const x = L.align === 'center' ? L.cx - width / 2 : L.marginX;
  const cy = top + rowH / 2;

  if (badge) {
    roundedRectPath(ctx, x, top, width, rowH, rowH / 2);
    ctx.fillStyle = rgba(config.textColor, 0.08);
    ctx.fill();
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.strokeStyle = rgba(config.textColor, 0.18);
    ctx.stroke();
  }

  drawAvatar(ctx, L, input, x + padL + avatarR, cy, avatarR);

  if (label) {
    ctx.fillStyle = rgba(config.textColor, badge ? 0.95 : 0.85);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padL + avatarR * 2 + gap, cy + 1 * u);
  }
  ctx.restore();
}

/** Altura que el perfil resta al texto cuando está visible (incluye el aire superior) */
export const profileReserve = (L: Layout, input: CardRenderInput): number =>
  hasProfile(input) ? (PROFILE_ROW_H + 44) * L.u : 0;

// ── Arte ────────────────────────────────────────────────────────────────────

export type ArtShape = 'circle' | 'roundrect' | 'rect';

function shapePath(ctx: Ctx, shape: ArtShape, x: number, y: number, w: number, h: number, radius: number): void {
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  } else if (shape === 'roundrect') {
    roundedRectPath(ctx, x, y, w, h, radius);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

/**
 * Arte de reserva cuando no hay captura del visualizador ni portada: un aura generada con la
 * paleta y una semilla del título, para que la tarjeta nunca salga vacía y cada canción sea distinta.
 */
export function drawPlaceholderAura(ctx: Ctx, L: Layout, input: CardRenderInput, cx: number, cy: number, size: number): void {
  const { config, content } = input;
  const r = size / 2;
  const rand = mulberry32(hashString(content.title + content.artist));

  ctx.save();
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  core.addColorStop(0, rgba(config.primaryColor, 0.85));
  core.addColorStop(0.55, rgba(mixHex(config.primaryColor, config.secondaryColor, 0.5), 0.35));
  core.addColorStop(1, rgba(config.secondaryColor, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Anillos ondulados: forma única por canción
  for (let ring = 0; ring < 3; ring++) {
    const baseR = r * (0.42 + ring * 0.2);
    const lobes = 3 + Math.floor(rand() * 5);
    const amp = r * (0.03 + rand() * 0.05);
    const phase = rand() * Math.PI * 2;
    ctx.beginPath();
    for (let a = 0; a <= 360; a += 3) {
      const t = (a * Math.PI) / 180;
      const rr = baseR + Math.sin(t * lobes + phase) * amp;
      const px = cx + Math.cos(t) * rr;
      const py = cy + Math.sin(t) * rr;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.lineWidth = Math.max(1.5, 3 * L.u);
    ctx.strokeStyle = rgba(ring % 2 === 0 ? config.primaryColor : config.secondaryColor, 0.75 - ring * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

export interface DrawArtOptions {
  shape: ArtShape;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  /** Fondo detrás del arte (el visualizador es transparente) */
  backdrop?: string;
}

/**
 * Imagen principal de la tarjeta: portada o captura del visualizador (según la elección y lo que
 * haya disponible), con halo de «bloom». Si no hay ninguna, el aura generada.
 */
export function drawArt(ctx: Ctx, L: Layout, input: CardRenderInput, o: DrawArtOptions): void {
  const { config, assets } = input;
  const radius = o.radius ?? 0;
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const useCover = config.artSource === 'cover' && !!assets.cover;
  const source = useCover ? assets.cover : assets.visualizer;

  // Halo: la sombra de una forma rellena crea el resplandor alrededor de la imagen
  if (config.bloom > 0) {
    ctx.save();
    ctx.shadowColor = rgba(config.primaryColor, 0.85 * config.bloom);
    ctx.shadowBlur = 90 * L.u * config.bloom;
    ctx.fillStyle = o.backdrop ?? rgba(config.backgroundColor, 0.9);
    shapePath(ctx, o.shape, o.x, o.y, o.w, o.h, radius);
    ctx.fill();
    ctx.restore();
  }

  if (o.backdrop) {
    ctx.save();
    shapePath(ctx, o.shape, o.x, o.y, o.w, o.h, radius);
    ctx.fillStyle = o.backdrop;
    ctx.fill();
    ctx.restore();
  }

  if (useCover && source) {
    // La portada siempre se recorta a la forma de la plantilla
    ctx.save();
    shapePath(ctx, o.shape, o.x, o.y, o.w, o.h, radius);
    ctx.clip();
    drawImageCover(ctx, source, o.x, o.y, o.w, o.h);
    ctx.restore();
  } else if (source) {
    // El visualizador es transparente y sus picos pueden salirse: solo se recorta en marcos rectangulares
    ctx.save();
    if (o.shape !== 'circle') {
      shapePath(ctx, o.shape, o.x, o.y, o.w, o.h, radius);
      ctx.clip();
    }
    drawImageContain(ctx, source, o.x, o.y, o.w, o.h);
    ctx.restore();
  } else {
    drawPlaceholderAura(ctx, L, input, cx, cy, Math.min(o.w, o.h));
  }
}
