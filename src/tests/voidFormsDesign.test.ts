import { describe, it, expect } from 'vitest';
import { drawVoidEffect, createVoidFxState, type VoidFxFrame } from '../components/Visualizers/voidEffects';
import { DEFAULT_VOID_FX_SETTINGS, resolveVoidFx } from '../config/visualPresets';

/** Contexto 2D que cuenta trazos y registra los puntos dibujados. */
function recordingCtx() {
  const calls: Record<string, number> = {};
  const pts: number[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === 'createRadialGradient' || name === 'createLinearGradient') {
          return () => ({ addColorStop: () => undefined });
        }
        return (...a: number[]) => {
          calls[name] = (calls[name] ?? 0) + 1;
          if (name === 'moveTo' || name === 'lineTo') pts.push(a[0], a[1]);
          // Un arco se registra por su primer punto sobre la circunferencia: su centro no dice dónde se dibuja
          else if (name === 'arc') pts.push(a[0] + Math.cos(a[3]) * a[2], a[1] + Math.sin(a[3]) * a[2]);
          else if (name === 'ellipse') pts.push(a[0] + Math.cos(a[6]) * a[2], a[1] + Math.sin(a[6]) * a[3]);
        };
      },
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, pts };
}

type Rec = ReturnType<typeof recordingCtx>;

function frame(id: string, rec: Rec, over: Partial<VoidFxFrame> = {}, fxOver: Partial<typeof DEFAULT_VOID_FX_SETTINGS> = {}): VoidFxFrame {
  return {
    ctx: rec.ctx,
    cx: 350,
    cy: 350,
    r: 80,
    u: 1,
    t: 3.2,
    bass: 0.7,
    mids: 0.5,
    treble: 0.4,
    energy: 0.6,
    kickStrength: 0.4,
    boom: 0,
    active: true,
    chroma: new Float32Array(12).fill(0.6),
    raw: new Uint8Array(256).map((_, i) => 40 + ((i * 37) % 180)),
    primary: '#00f0ff',
    secondary: '#ddb7ff',
    accent: '#ffffff',
    angleDeg: 30,
    stroke: 1,
    fx: resolveVoidFx({ ...DEFAULT_VOID_FX_SETTINGS, ...fxOver }, id as never),
    ...over,
  };
}

/** Varios frames seguidos: los niveles del espectro necesitan unos cuantos para subir */
function run(id: string, over: Partial<VoidFxFrame>, frames = 20, fxOver: Partial<typeof DEFAULT_VOID_FX_SETTINGS> = {}) {
  const state = createVoidFxState();
  let rec = recordingCtx();
  for (let i = 0; i < frames; i++) {
    rec = recordingCtx();
    drawVoidEffect(id, frame(id, rec, { t: 1 + i / 60, ...over }, fxOver), state);
  }
  return rec;
}

const LOUD: Partial<VoidFxFrame> = {
  bass: 1,
  mids: 0.9,
  treble: 0.9,
  energy: 0.95,
  kickStrength: 0.8,
  raw: new Uint8Array(256).fill(235),
  chroma: new Float32Array(12).fill(0.9),
};
const QUIET: Partial<VoidFxFrame> = {
  active: false,
  bass: 0,
  mids: 0,
  treble: 0,
  energy: 0,
  kickStrength: 0,
  raw: new Uint8Array(256),
  chroma: new Float32Array(12),
};

const FORMS = ['spectrum', 'wave', 'particles', 'geometry', 'radar', 'electro', 'laser', 'spiro', 'tunnel', 'hive', 'spiral', 'crystal'];
const R = 80;
const dist = (rec: Rec, i: number) => Math.hypot(rec.pts[i] - 350, rec.pts[i + 1] - 350);

describe('formas de Rainbow Void: capas interiores («inners») y reacción', () => {
  it.each(FORMS)('«%s» tiene capa interior: dibuja dentro del disco sin tapar el centro', (id) => {
    const rec = run(id, LOUD);
    let inner = 0;
    let center = 0;
    for (let i = 0; i < rec.pts.length; i += 2) {
      const d = dist(rec, i);
      if (d >= R * 0.45 && d <= R * 0.96) inner++;
      if (d < R * 0.3) center++;
    }
    expect(inner).toBeGreaterThan(8);
    // El logo o la carátula del centro queda libre (se tolera una fracción mínima de puntos)
    expect(center).toBeLessThan(rec.pts.length / 2 / 15);
  });

  it.each(FORMS)('«%s» reacciona a la música: el dibujo con audio es distinto al de reposo', (id) => {
    const sig = (rec: Rec) => rec.pts.slice(0, 300).map((v) => Math.round(v * 10)).join(',');
    expect(sig(run(id, LOUD))).not.toBe(sig(run(id, QUIET)));
  });

  it('el Espectro y la Geometría se extienden más con el bajo y el golpe', () => {
    const extent = (id: string, over: Partial<VoidFxFrame>) => {
      const rec = run(id, over);
      let max = 0;
      for (let i = 0; i < rec.pts.length; i += 2) max = Math.max(max, dist(rec, i));
      return max;
    };
    expect(extent('spectrum', LOUD)).toBeGreaterThan(extent('spectrum', QUIET));
    expect(extent('geometry', LOUD)).toBeGreaterThan(extent('geometry', QUIET));
  });

  it('la mándala de fondo solo acompaña al Cristal: las demás formas ignoran ese ajuste', () => {
    const strokes = (id: string, mandala: boolean) => run(id, LOUD, 3, { mandala }).calls.stroke ?? 0;
    expect(strokes('crystal', true)).toBeGreaterThan(strokes('crystal', false));
    for (const id of ['spectrum', 'wave', 'radar', 'electro', 'geometry', 'particles']) {
      expect(strokes(id, true)).toBe(strokes(id, false));
    }
  });

  it('el Espectro agrupa las barras en pocos trazos (no uno por barra)', () => {
    const rec = run('spectrum', LOUD, 10, { counts: { spectrum: 160 } });
    // 160 barras exteriores + 80 interiores, pero solo decenas de stroke() por frame
    expect(rec.calls.stroke ?? 0).toBeLessThan(60);
    expect(rec.calls.moveTo ?? 0).toBeGreaterThan(200);
  });

  it('las Partículas pintan cientos de estelas con muy pocos trazos', () => {
    const rec = run('particles', LOUD, 10, { counts: { particles: 420 } });
    expect(rec.calls.lineTo ?? 0).toBeGreaterThan(300);
    expect(rec.calls.stroke ?? 0).toBeLessThan(80);
  });
});
