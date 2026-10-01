import { describe, it, expect } from 'vitest';
import {
  CARD_FORMATS,
  CARD_TEMPLATES,
  DEFAULT_CARD_CONFIG,
  resolveCardContent,
  type CardConfig,
  type CardFormat,
  type CardTemplate,
} from '../services/storyCard/config';
import { renderStoryCard, spectrumHeights } from '../services/storyCard/templates';
import { createLayout, type CardAssets, type CardRenderInput } from '../services/storyCard/blocks';
import { fitText, hexToRgb, mixHex, mulberry32, wrapText } from '../services/storyCard/draw';
import type { CanvasLike, Ctx } from '../services/storyCard/draw';

interface TextCall {
  text: string;
  x: number;
  y: number;
  size: number;
}

/** Lienzo simulado: registra qué se dibuja sin necesitar un navegador */
function recordingCtx() {
  const texts: TextCall[] = [];
  const methods: string[] = [];
  const state: Record<string, unknown> = { textAlign: 'left', textBaseline: 'alphabetic', font: '10px sans-serif' };
  const sizeOf = () => parseFloat(/(\d+(?:\.\d+)?)px/.exec(String(state.font))?.[1] ?? '10');

  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop in state) return state[prop];
      switch (prop) {
        case 'measureText':
          return (t: string) => ({ width: t.length * sizeOf() * 0.55 });
        case 'createLinearGradient':
        case 'createRadialGradient':
          methods.push(prop);
          return () => ({ addColorStop() {} });
        case 'createPattern':
          methods.push(prop);
          return () => ({});
        case 'createImageData':
          return (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) });
        case 'fillText':
          return (text: string, x: number, y: number) => {
            methods.push(prop);
            texts.push({ text, x, y, size: sizeOf() });
          };
        default:
          return () => {
            methods.push(prop);
          };
      }
    },
    set(_t, prop: string, value) {
      state[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as Ctx, texts, methods };
}

const createCanvas = (w: number, h: number): CanvasLike => ({
  width: w,
  height: h,
  getContext: () => recordingCtx().ctx,
});

const fakeImage = { width: 700, height: 700 } as unknown as CanvasImageSource;

const track = { title: 'Midnight Drive', artist: 'Dhonkio', bpm: 124, camelotKey: '8A', coverUrl: 'https://x/c.jpg' };

function build(patch: Partial<CardConfig> = {}, assets: Partial<CardAssets> = {}): CardRenderInput {
  const config: CardConfig = {
    ...DEFAULT_CARD_CONFIG,
    ...patch,
    elements: { ...DEFAULT_CARD_CONFIG.elements, ...(patch.elements ?? {}) },
    profile: { ...DEFAULT_CARD_CONFIG.profile, ...(patch.profile ?? {}) },
  };
  return {
    config,
    content: resolveCardContent(config, track, 0, new Date('2026-10-01T12:00:00')),
    assets: { visualizer: null, cover: null, avatar: null, ...assets },
    createCanvas,
  };
}

function draw(input: CardRenderInput, scale = 1) {
  const spec = CARD_FORMATS[input.config.format];
  const W = Math.round(spec.width * scale);
  const H = Math.round(spec.height * scale);
  const rec = recordingCtx();
  renderStoryCard(rec.ctx, W, H, input);
  return { ...rec, W, H };
}

const FORMATS = Object.keys(CARD_FORMATS) as CardFormat[];
const TEMPLATES = CARD_TEMPLATES.map((t) => t.id) as CardTemplate[];

describe('renderStoryCard', () => {
  it.each(TEMPLATES.flatMap((t) => FORMATS.map((f) => [t, f] as const)))(
    '%s en formato %s se dibuja sin errores, con título y artista',
    (template, format) => {
      const { texts } = draw(build({ template, format }));
      const all = texts.map((t) => t.text).join(' ');
      expect(all).toContain('Midnight Drive');
      expect(all).toContain('Dhonkio');
    }
  );

  it.each(TEMPLATES)('%s funciona con todos los recursos presentes y con ninguno', (template) => {
    expect(() =>
      draw(build({ template, profile: { show: true, handle: 'dhonkio', avatar: 'x', style: 'badge' } }, { visualizer: fakeImage, cover: fakeImage, avatar: fakeImage }))
    ).not.toThrow();
    expect(() => draw(build({ template }))).not.toThrow();
  });

  it('el texto de una historia no invade las zonas que Instagram tapa', () => {
    for (const template of TEMPLATES) {
      const input = build({
        template,
        profile: { show: true, handle: 'dhonkio.music', avatar: null, style: 'badge' },
        elements: { logo: true, metadata: true, date: true },
      });
      const { texts, H } = draw(input);
      const L = createLayout(input.config, 1080, H);
      const tolerance = 40; // los textos centrados verticalmente se desvían unos píxeles
      for (const t of texts) {
        expect(t.y, `${template}: "${t.text}"`).toBeGreaterThanOrEqual(L.safeTop - tolerance);
        expect(t.y, `${template}: "${t.text}"`).toBeLessThanOrEqual(L.safeBottom + tolerance);
      }
    }
  });

  it('un título larguísimo no se sale del ancho disponible ni rompe el dibujo', () => {
    const long = 'Un título extremadamente largo que ocupa muchísimo espacio horizontal y vertical '.repeat(3);
    const input = build({ autoText: false, title: long.slice(0, 80), artist: 'A'.repeat(60) });
    const { texts } = draw(input);
    const L = createLayout(input.config, 1080, 1920);
    for (const t of texts.filter((x) => x.size >= 40)) {
      expect(t.text.length * t.size * 0.55).toBeLessThanOrEqual(L.contentW + 1);
    }
  });

  it('el perfil se dibuja solo cuando está activado y tiene usuario o foto', () => {
    const handleDrawn = (patch: Partial<CardConfig>, assets: Partial<CardAssets> = {}) =>
      draw(build(patch, assets)).texts.some((t) => t.text === '@dhonkio');

    const base = { show: true, handle: 'dhonkio', avatar: null, style: 'badge' as const };
    expect(handleDrawn({ profile: base })).toBe(true);
    expect(handleDrawn({ profile: { ...base, show: false } })).toBe(false);
    expect(handleDrawn({ profile: { ...base, handle: '' } })).toBe(false);
    expect(handleDrawn({ profile: { ...base, style: 'signature' } })).toBe(true);
  });

  it('con foto y sin usuario dibuja la insignia pero no un "@" vacío', () => {
    const { texts } = draw(build({ profile: { show: true, handle: '', avatar: 'x', style: 'badge' } }, { avatar: fakeImage }));
    expect(texts.some((t) => t.text.startsWith('@'))).toBe(false);
  });

  it('BPM y tono solo se dibujan si se conocen y si el elemento está activado', () => {
    const chips = (config: Partial<CardConfig>, t = track) => {
      const input = build(config);
      input.content = resolveCardContent(input.config, t, 0);
      // El texto con espaciado entre letras se dibuja letra a letra: se vuelve a unir para leerlo
      return draw(input).texts.map((x) => x.text).join('');
    };
    expect(chips({})).toContain('124 BPM');
    expect(chips({})).toContain('8A');
    expect(chips({ elements: { logo: true, metadata: false, date: false } })).not.toContain('124 BPM');
    expect(chips({}, { title: 'X', artist: 'Y' } as typeof track)).not.toContain('BPM');
  });

  it('nunca usa getImageData (el grano es un patrón, no un recorrido de 8 millones de píxeles)', () => {
    for (const template of TEMPLATES) {
      const { methods } = draw(build({ template, grain: 0.3 }));
      expect(methods).not.toContain('getImageData');
      expect(methods).toContain('createPattern');
    }
  });

  it('sin grano ni viñeta no se aplican los acabados', () => {
    const { methods } = draw(build({ grain: 0, vignette: 0 }));
    expect(methods).not.toContain('createPattern');
  });

  it('es determinista: la misma tarjeta produce exactamente el mismo dibujo', () => {
    for (const template of TEMPLATES) {
      const a = draw(build({ template }));
      const b = draw(build({ template }));
      expect(b.texts).toEqual(a.texts);
      expect(b.methods).toEqual(a.methods);
    }
  });

  it('la composición es la misma a cualquier escala (la vista previa coincide con la exportación)', () => {
    for (const template of TEMPLATES) {
      const full = draw(build({ template }), 1);
      const small = draw(build({ template }), 0.25);
      expect(small.texts.map((t) => t.text)).toEqual(full.texts.map((t) => t.text));
      small.texts.forEach((t, i) => {
        // Tolerancia de un par de píxeles: a escala pequeña los tamaños de fuente se redondean
        expect(Math.abs(t.y - full.texts[i].y * 0.25)).toBeLessThan(2);
        expect(Math.abs(t.x - full.texts[i].x * 0.25)).toBeLessThan(2);
      });
    }
  });
});

describe('utilidades de dibujo', () => {
  const fakeCtx = (charWidth: number) =>
    ({ measureText: (t: string) => ({ width: t.length * charWidth }) }) as unknown as Ctx;

  it('fitText recorta con puntos suspensivos solo si no cabe', () => {
    expect(fitText(fakeCtx(10), 'Hola', 100)).toBe('Hola');
    const out = fitText(fakeCtx(10), 'Un texto bastante largo', 100);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length * 10).toBeLessThanOrEqual(100);
  });

  it('wrapText reparte por palabras y recorta la última línea si sobra', () => {
    expect(wrapText(fakeCtx(10), 'uno dos tres', 1000, 2)).toEqual(['uno dos tres']);
    const lines = wrapText(fakeCtx(10), 'aaaa bbbb cccc dddd eeee ffff', 90, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(wrapText(fakeCtx(10), '', 100, 2)).toEqual([]);
  });

  it('una sola palabra enorme se recorta en vez de desbordar', () => {
    const lines = wrapText(fakeCtx(10), 'Supercalifragilisticoespialidoso', 100, 2);
    expect(lines).toHaveLength(1);
    expect(lines[0].length * 10).toBeLessThanOrEqual(100);
  });

  it('color: hexToRgb, mixHex y el generador con semilla', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('basura')).toEqual([255, 255, 255]);
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 5)).toBe('#ffffff'); // se limita a [0, 1]

    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('el espectro decorativo es único por canción, estable y está en rango', () => {
    const one = spectrumHeights('Canción A');
    expect(spectrumHeights('Canción A')).toEqual(one);
    expect(spectrumHeights('Canción B')).not.toEqual(one);
    for (const h of one) {
      expect(h).toBeGreaterThanOrEqual(0.12);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});
