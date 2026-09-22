import type { CardConfig } from '../store/recorderStore';
import type { Track } from '../types/audio';
import { findVisualizerCanvas } from '../utils/visualizerCanvas';

export interface CardTrackInfo {
  title: string;
  artist: string;
  coverUrl?: string | null;
  bpm?: number;
  key?: string;
}

export async function generateStoryCard(
  config: CardConfig,
  track: CardTrackInfo | null
): Promise<Blob> {
  const width = config.resolution.width || 1080;
  const height = config.resolution.height || 1920;

  // Use OffscreenCanvas if supported, fallback to regular Canvas element
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto de renderizado de la tarjeta.');
  }

  // 1. Capture Active Visualizer Canvas snapshot
  const visualizerCanvas = findVisualizerCanvas();

  // 2. Render Template Background & Aesthetics
  await renderTemplate(ctx, config, track, width, height, visualizerCanvas);

  // 3. Apply Post-Processing Filters (Bloom, Film Grain, Vignette)
  applyPostFilters(ctx, config, width, height);

  // 4. Convert to High-Res Blob
  if ('convertToBlob' in canvas) {
    return await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
  } else {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Falló la conversión de canvas a Blob'));
      }, 'image/png');
    });
  }
}

async function renderTemplate(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  config: CardConfig,
  track: CardTrackInfo | null,
  width: number,
  height: number,
  visualizerCanvas: HTMLCanvasElement | null
) {
  const template = config.template;
  const palette = config.palette;
  const title = track?.title || 'Aura3D Spatial Soundscape';
  const artist = track?.artist || 'Estudio de Audio Espacial';
  const bpm = track?.bpm ? `${track.bpm} BPM` : '128 BPM';
  const key = track?.key || '8A (Am)';

  // Color mappings
  const colors = getPaletteColors(palette);

  if (template === 'pure-void') {
    // ── Template A: Pure Void ──────────────────────────────────────────
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, width, height);

    // Subtle radial aura behind center
    const aura = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.65);
    aura.addColorStop(0, colors.glow);
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    // Draw Visualizer in Center
    if (visualizerCanvas) {
      drawCenteredVisualizer(ctx, visualizerCanvas, width / 2, height / 2, width * 0.72);
    }

    // Top-Right Logo Badge
    if (config.elements.showLogo) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '700 24px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('AURA3D // DHONKIO', width - 70, 95);

      ctx.fillStyle = colors.primary;
      ctx.font = '500 16px "JetBrains Mono", monospace';
      ctx.fillText('SPATIAL ENGINE 4.2', width - 70, 125);
      ctx.restore();
    }

    // Bottom-Left Track Information
    renderTrackTypography(ctx, title, artist, config, width, height, colors);
  } else if (template === 'aesthetic') {
    // ── Template B: Aesthetic Gradient ─────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0c0721');
    grad.addColorStop(0.35, colors.primary + '33');
    grad.addColorStop(0.7, colors.secondary + '25');
    grad.addColorStop(1, '#05040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient glow orbs
    drawGlowOrb(ctx, width * 0.25, height * 0.3, 300, colors.primary + '20');
    drawGlowOrb(ctx, width * 0.75, height * 0.7, 340, colors.secondary + '20');

    // Draw visualizer with soft opacity
    if (visualizerCanvas) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      drawCenteredVisualizer(ctx, visualizerCanvas, width / 2, height / 2, width * 0.70);
      ctx.restore();
    }

    // Typography in Aesthetic layout
    renderTrackTypography(ctx, title, artist, config, width, height, colors);

    // Date / Time Badge
    if (config.elements.showDate) {
      ctx.save();
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '500 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`• ${dateStr} •`, width / 2, height - 85);
      ctx.restore();
    }
  } else if (template === 'studio') {
    // ── Template C: Studio Card (Frosted Liquid Glass & Telemetry) ─────
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // Upper Hemisphere Visualizer
    const vizY = height * 0.40;
    if (visualizerCanvas) {
      drawCenteredVisualizer(ctx, visualizerCanvas, width / 2, vizY, width * 0.65);
    }

    // Frosted Liquid Glass Card in Bottom Half
    const cardW = width - 120;
    const cardH = height * 0.38;
    const cardX = 60;
    const cardY = height - cardH - 100;

    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
    ctx.fillStyle = 'rgba(18, 24, 38, 0.78)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    // Specular top highlight on card
    ctx.beginPath();
    ctx.moveTo(cardX + 36, cardY);
    ctx.lineTo(cardX + cardW - 36, cardY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Studio Telemetry Details inside card
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 38px ${getFontFamily(config.typography)}`;
    ctx.textAlign = 'left';
    ctx.fillText(truncateText(ctx, title, cardW - 80), cardX + 45, cardY + 75);

    ctx.fillStyle = colors.primary;
    ctx.font = `500 24px ${getFontFamily(config.typography)}`;
    ctx.fillText(truncateText(ctx, artist, cardW - 80), cardX + 45, cardY + 120);

    // Mini Spectrum Waveform Simulation
    const barCount = 36;
    const barW = (cardW - 90) / barCount - 3;
    for (let b = 0; b < barCount; b++) {
      const bH = 14 + Math.sin(b * 0.45 + 1.2) * 28 + Math.cos(b * 0.8) * 18;
      const bx = cardX + 45 + b * (barW + 3);
      const by = cardY + 185;
      ctx.fillStyle = b % 2 === 0 ? colors.primary : colors.secondary;
      ctx.fillRect(bx, by - bH, barW, bH);
    }

    // Telemetry Pills (BPM | KEY | STEREO)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, cardX + 45, cardY + 220, 140, 42, 14);
    ctx.fill();
    ctx.fillStyle = colors.primary;
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText(bpm, cardX + 65, cardY + 247);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, cardX + 200, cardY + 220, 150, 42, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(key, cardX + 220, cardY + 247);
    ctx.restore();
  } else {
    // ── Template D: Vinyl Classic ──────────────────────────────────────
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, width, height);

    // Repeating Radial Vinyl Grooves
    const cx = width / 2;
    const cy = height * 0.44;
    const vinylRadius = width * 0.44;

    ctx.save();
    for (let r = 50; r < vinylRadius; r += 7) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = r % 21 === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    ctx.restore();

    // Center Disc with Artwork or Visualizer
    if (visualizerCanvas) {
      drawCenteredVisualizer(ctx, visualizerCanvas, cx, cy, width * 0.58);
    }

    // Typography
    renderTrackTypography(ctx, title, artist, config, width, height, colors);
  }
}

function drawCenteredVisualizer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: HTMLCanvasElement,
  cx: number,
  cy: number,
  size: number
) {
  try {
    const sW = source.width || 700;
    const sH = source.height || 700;
    ctx.drawImage(source, 0, 0, sW, sH, cx - size / 2, cy - size / 2, size, size);
  } catch (e) {
    console.warn('[cardGenerator] Could not draw visualizer canvas:', e);
  }
}

function drawGlowOrb(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderTrackTypography(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  title: string,
  artist: string,
  config: CardConfig,
  width: number,
  height: number,
  colors: { primary: string; secondary: string }
) {
  const layout = config.layout;
  const font = getFontFamily(config.typography);

  ctx.save();
  let x = 70;
  let y = height - 150;
  let align: CanvasTextAlign = 'left';

  if (layout === 'center') {
    x = width / 2;
    y = height - 160;
    align = 'center';
  } else if (layout === 'top-right') {
    x = width - 70;
    y = 180;
    align = 'right';
  } else if (layout === 'split') {
    x = 70;
    y = height - 120;
    align = 'left';
  }

  ctx.textAlign = align;

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 44px ${font}`;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
  ctx.fillText(truncateText(ctx, title, width - 140), x, y);

  // Artist
  ctx.fillStyle = colors.primary;
  ctx.font = `600 26px ${font}`;
  ctx.shadowColor = colors.primary;
  ctx.shadowBlur = config.filters.bloom ? 14 : 0;
  ctx.fillText(truncateText(ctx, artist, width - 140), x, y + 44);

  ctx.restore();
}

function applyPostFilters(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  config: CardConfig,
  width: number,
  height: number
) {
  // 1. Cinematic Vignette
  if (config.filters.vignette) {
    const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.85);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(0.8, 'rgba(0, 0, 0, 0.45)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Subtle Analog Film Grain
  if (config.filters.grain) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 14;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

function getFontFamily(typography: string): string {
  switch (typography) {
    case 'playfair':
      return '"Playfair Display", Georgia, serif';
    case 'caveat':
      return '"Caveat", cursive, sans-serif';
    case 'jetbrains':
      return '"JetBrains Mono", monospace';
    case 'orbitron':
      return '"Orbitron", sans-serif';
    case 'inter':
    default:
      return 'Inter, system-ui, -apple-system, sans-serif';
  }
}

function getPaletteColors(palette: string) {
  switch (palette) {
    case 'neon':
      return { primary: '#39ff14', secondary: '#00f5ff', glow: 'rgba(57, 255, 20, 0.35)' };
    case 'pastel':
      return { primary: '#ffb3ba', secondary: '#bae1ff', glow: 'rgba(255, 179, 186, 0.3)' };
    case 'mono':
      return { primary: '#ffffff', secondary: '#9ca3af', glow: 'rgba(255, 255, 255, 0.25)' };
    case 'rainbow':
    default:
      return { primary: '#00f2fe', secondary: '#ff088a', glow: 'rgba(0, 242, 254, 0.35)' };
  }
}

function truncateText(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

export const cardGenerator = {
  generateCard: async (config: CardConfig, _canvas?: HTMLCanvasElement) => {
    return await generateStoryCard(config, {
      title: config.title || 'Aura3D Soundscape',
      artist: config.artist || 'Aura3D',
    });
  },
  generateStoryCard,
};

