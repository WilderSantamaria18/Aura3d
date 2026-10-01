import { describe, it, expect } from 'vitest';
import { drawVoidEffect, createVoidFxState, type VoidFxFrame } from '../components/Visualizers/voidEffects';
import {
  DEFAULT_VOID_EFFECT,
  DEFAULT_VOID_FX_SETTINGS,
  LEGACY_VOID_EFFECT_RENAMES,
  RAINBOW_VOID_EFFECTS,
  isVoidEffectId,
  migrateVoidEffectId,
  resolveVoidFx,
  voidEffectForPreset,
} from '../config/visualPresets';

/** Contexto 2D que cuenta llamadas; los degradados validan sus colores como lo haría el navegador. */
function recordingCtx() {
  const calls: Record<string, number> = {};
  const sets: Array<[string, unknown]> = [];
  const valid = (c: string) => /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i.test(c.trim());
  const gradient = () => ({
    addColorStop: (_o: number, color: string) => {
      if (!valid(color)) throw new SyntaxError(`Color de degradado inválido: ${color}`);
    },
  });
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === 'createRadialGradient' || name === 'createLinearGradient') {
          return () => {
            calls[name] = (calls[name] ?? 0) + 1;
            return gradient();
          };
        }
        return () => {
          calls[name] = (calls[name] ?? 0) + 1;
        };
      },
      set: (_t, name: string, value: unknown) => {
        sets.push([name, value]);
        return true;
      },
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, sets };
}

function makeFrame(id: string, over: Partial<VoidFxFrame> = {}, fxOver: Partial<typeof DEFAULT_VOID_FX_SETTINGS> = {}): VoidFxFrame & { rec: ReturnType<typeof recordingCtx> } {
  const rec = recordingCtx();
  const chroma = new Float32Array(12);
  chroma[0] = 0.9;
  chroma[4] = 0.8;
  chroma[7] = 0.7;
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
    chroma,
    raw: new Uint8Array(256).map((_, i) => 40 + ((i * 37) % 180)),
    primary: '#00f0ff',
    secondary: '#ddb7ff',
    accent: '#ffffff',
    angleDeg: 30,
    stroke: 1,
    fx: resolveVoidFx({ ...DEFAULT_VOID_FX_SETTINGS, ...fxOver }, id as never),
    rec,
    ...over,
  };
}

const NEW_IDS = ['spectrum', 'wave', 'particles', 'geometry', 'radar', 'electro', 'laser', 'spiro', 'tunnel', 'hive', 'spiral', 'crystal'];
const OLD_IDS = ['cat', 'bunny', 'horns', 'crown', 'flame', 'wings', 'notes', 'spikes', 'sun', 'galaxy', 'orbits', 'storm', 'ribbon', 'constellation', 'tides'];

describe('catálogo de Rainbow Void', () => {
  it('tiene las 7 formas profesionales + la mándala, y ninguna de las antiguas', () => {
    const ids = RAINBOW_VOID_EFFECTS.map((e) => e.id as string);
    expect(ids).toEqual([...NEW_IDS, 'fractal']);
    for (const old of OLD_IDS) expect(isVoidEffectId(old)).toBe(false);
  });

  it('la mándala se conserva tal cual', () => {
    const fractal = RAINBOW_VOID_EFFECTS.find((e) => e.id === 'fractal')!;
    expect(fractal.name).toBe('Solo mándala');
    expect(fractal.param).toEqual({ label: 'Anillos', min: 2, max: 6, step: 1, def: 4 });
  });

  it('cada forma tiene nombre, descripción, etiqueta y parámetros coherentes', () => {
    for (const fx of RAINBOW_VOID_EFFECTS) {
      expect(fx.name.length).toBeGreaterThan(2);
      expect(fx.desc.length).toBeGreaterThan(20);
      expect(fx.tag.length).toBeGreaterThan(1);
      if (fx.param) {
        expect(fx.param.min).toBeLessThan(fx.param.max);
        expect(fx.param.def).toBeGreaterThanOrEqual(fx.param.min);
        expect(fx.param.def).toBeLessThanOrEqual(fx.param.max);
      }
    }
    expect(isVoidEffectId(DEFAULT_VOID_EFFECT)).toBe(true);
  });

  it('las formas guardadas antes migran a una válida y las actuales no cambian', () => {
    for (const old of OLD_IDS) {
      const migrated = migrateVoidEffectId(old);
      expect(isVoidEffectId(migrated)).toBe(true);
      expect(LEGACY_VOID_EFFECT_RENAMES[old]).toBe(migrated);
    }
    for (const id of NEW_IDS) expect(migrateVoidEffectId(id)).toBe(id);
    expect(migrateVoidEffectId('fractal')).toBe('fractal');
    expect(migrateVoidEffectId('desconocido')).toBe(DEFAULT_VOID_EFFECT);
    expect(migrateVoidEffectId(null)).toBe(DEFAULT_VOID_EFFECT);
  });

  it('los presets de fábrica y los que usan formas 3D antiguas resuelven a formas existentes', () => {
    for (const id of ['factory_ethereal_aurora', 'factory_zenith_tidal_ripples', 'factory_retro_synthwave', 'factory_crimson_blood_horizon', 'factory_midnight_cyber_rain', 'factory_rainbow_void']) {
      expect(isVoidEffectId(voidEffectForPreset({ id, visualizerShape: 'sphere' }))).toBe(true);
    }
    for (const shape of ['icosahedron', 'nebula', 'wave', 'torus', 'spikes', 'laser', 'vortex', 'kaleidoscope', 'cloud']) {
      expect(isVoidEffectId(voidEffectForPreset({ visualizerShape: shape }))).toBe(true);
    }
  });
});

describe('dibujo de cada forma', () => {
  it.each([...NEW_IDS, 'fractal'])('«%s» dibuja sin lanzar, con música y en reposo', (id) => {
    const state = createVoidFxState();
    const loud = makeFrame(id);
    expect(() => drawVoidEffect(id, loud, state)).not.toThrow();
    expect((loud.rec.calls.stroke ?? 0) + (loud.rec.calls.fill ?? 0)).toBeGreaterThan(0);

    const idle = makeFrame(id, { active: false, bass: 0, mids: 0, treble: 0, energy: 0, kickStrength: 0, raw: new Uint8Array(256), chroma: new Float32Array(12) });
    expect(() => drawVoidEffect(id, idle, createVoidFxState())).not.toThrow();
  });

  it.each(NEW_IDS)('«%s» admite los tres acabados y colores hsl/rgb sin lanzar', (id) => {
    for (const formStyle of ['neon', 'glass', 'ink'] as const) {
      for (const primary of ['#00f0ff', 'rgb(10, 200, 255)', 'hsl(190, 100%, 50%)']) {
        const f = makeFrame(id, { primary }, { formStyle });
        expect(() => drawVoidEffect(id, f, createVoidFxState())).not.toThrow();
      }
    }
  });

  it.each(NEW_IDS)('«%s» no produce coordenadas inválidas (NaN/Infinity) con extremos de audio', (id) => {
    const f = makeFrame(id, { bass: 1.6, mids: 1.6, treble: 1.6, energy: 1.6, kickStrength: 1, boom: 1, raw: new Uint8Array(256).fill(255), chroma: new Float32Array(12).fill(1) });
    const pts: number[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, name: string) => {
          if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
          if (name === 'moveTo' || name === 'lineTo' || name === 'arc' || name === 'ellipse') {
            return (...a: number[]) => pts.push(...a);
          }
          return () => undefined;
        },
        set: () => true,
      }
    ) as unknown as CanvasRenderingContext2D;
    drawVoidEffect(id, { ...f, ctx }, createVoidFxState());
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.every(Number.isFinite)).toBe(true);
  });

  it('el número de elementos sigue al parámetro de cada forma', () => {
    const calls = (id: string, count: number, method: string) => {
      const f = makeFrame(id, {}, { counts: { [id]: count } });
      drawVoidEffect(id, f, createVoidFxState());
      return f.rec.calls[method] ?? 0;
    };
    expect(calls('spectrum', 160, 'moveTo')).toBeGreaterThan(calls('spectrum', 48, 'moveTo'));
    expect(calls('particles', 420, 'moveTo')).toBeGreaterThan(calls('particles', 120, 'moveTo'));
    expect(calls('geometry', 4, 'moveTo')).toBeGreaterThan(calls('geometry', 2, 'moveTo'));
    expect(calls('crystal', 12, 'arc')).toBeGreaterThan(calls('crystal', 4, 'arc'));
  });

  it('Electro regenera sus rayos con el kick y en reposo no cambia', () => {
    const state = createVoidFxState();
    const seedOf = () => state.electro.seed;
    const first = makeFrame('electro', { t: 1 });
    drawVoidEffect('electro', first, state);
    const s0 = seedOf();
    // Un golpe fuerte fuerza un rayo nuevo aunque no haya pasado el intervalo
    drawVoidEffect('electro', makeFrame('electro', { t: 1.001, boom: 0.9 }), state);
    expect(seedOf()).not.toBe(s0);

    const quiet = createVoidFxState();
    drawVoidEffect('electro', makeFrame('electro', { active: false, t: 1 }), quiet);
    const q0 = quiet.electro.seed;
    drawVoidEffect('electro', makeFrame('electro', { active: false, t: 5 }), quiet);
    expect(quiet.electro.seed).toBe(q0);
  });

  it('el Espectro responde a la señal: más energía → niveles más altos', () => {
    const quietSt = createVoidFxState();
    const loudSt = createVoidFxState();
    for (let i = 0; i < 30; i++) {
      drawVoidEffect('spectrum', makeFrame('spectrum', { t: 1 + i * 0.016, raw: new Uint8Array(256).fill(20) }), quietSt);
      drawVoidEffect('spectrum', makeFrame('spectrum', { t: 1 + i * 0.016, raw: new Uint8Array(256).fill(240) }), loudSt);
    }
    const avg = (a: Float32Array) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(loudSt.bars.lvl)).toBeGreaterThan(avg(quietSt.bars.lvl));
  });

  it('todas las formas dejan la sombra a cero (no contaminan a las capas siguientes)', () => {
    for (const id of NEW_IDS) {
      const f = makeFrame(id);
      drawVoidEffect(id, f, createVoidFxState());
      const blurs = f.rec.sets.filter(([n]) => n === 'shadowBlur').map(([, v]) => v as number);
      // Puede haber sombras dentro, pero el último valor asignado de cada trazo vuelve a 0
      expect(blurs[blurs.length - 1] ?? 0).toBe(0);
    }
  });
});
