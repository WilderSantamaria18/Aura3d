import { describe, it, expect } from 'vitest';
import { parseColor, withAlpha } from '../components/Visualizers/effects/color';
import { renderPlasmaVortex } from '../components/Visualizers/effects/renderPlasmaVortex';
import { renderHolographicScanlines } from '../components/Visualizers/effects/renderHolographicScanlines';
import { renderMercuryTrails, type ApexTrail } from '../components/Visualizers/effects/renderMercuryTrails';
import { renderAuroraRibbons } from '../components/Visualizers/effects/renderAuroraRibbons';
import { renderConstellationLines } from '../components/Visualizers/effects/renderConstellationLines';
import { renderPulseGrid } from '../components/Visualizers/effects/renderPulseGrid';
import { renderGravitationalLensRings } from '../components/Visualizers/effects/renderGravitationalLens';
import { renderChromaticRing } from '../components/Visualizers/effects/renderChromaticRing';
import { renderKickShockwave } from '../components/Visualizers/effects/renderKickShockwave';
import { renderCrystalShards, spawnCrystalShards, type CrystalShard } from '../components/Visualizers/effects/renderCrystalShards';
import { PRO_EFFECTS_LIST } from '../hooks/useProEffectsManager';

/** Un color CSS que un canvas real aceptaría en addColorStop (los demás lanzan SyntaxError). */
const isValidStopColor = (c: string) => /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i.test(c.trim());

/** Contexto 2D que cuenta llamadas y valida los colores de los degradados, como haría el navegador. */
function recordingCtx() {
  const calls: Record<string, number> = {};
  const sets: Array<[string, unknown]> = [];
  const stopColors: string[] = [];
  const gradient = () => ({
    addColorStop: (_o: number, color: string) => {
      if (!isValidStopColor(color)) throw new SyntaxError(`Color de degradado inválido: ${color}`);
      stopColors.push(color);
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
  return { ctx, calls, sets, stopColors };
}

describe('color de efectos: withAlpha / parseColor', () => {
  it('interpreta hex (3, 6 y 8 dígitos), rgb/rgba y hsl', () => {
    expect(parseColor('#0ff')).toEqual([0, 255, 255]);
    expect(parseColor('#00f2fe')).toEqual([0, 242, 254]);
    expect(parseColor('#ff000080')).toEqual([255, 0, 0]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColor('rgba(10,20,30,0.5)')).toEqual([10, 20, 30]);
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual([255, 0, 0]);
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual([0, 255, 0]);
  });

  it('devuelve siempre una cadena válida, incluso con entradas inservibles', () => {
    for (const c of ['#00f2fe', 'rgb(1,2,3)', 'hsl(200, 80%, 50%)', 'rojo', '', undefined, null, '#12']) {
      expect(isValidStopColor(withAlpha(c as string, 0.4))).toBe(true);
    }
    expect(withAlpha('#ffffff', 2)).toBe('rgba(255,255,255,1.000)');
    expect(withAlpha('#ffffff', NaN)).toBe('rgba(255,255,255,0.000)');
  });
});

describe('Plasma Vortex', () => {
  it.each(['#00f2fe', 'rgb(10, 200, 255)', 'hsl(190, 100%, 50%)'])(
    'no lanza con el color %s (antes `${color}55` rompía con rgb/hsl)',
    (color) => {
      const { ctx, stopColors } = recordingCtx();
      expect(() => renderPlasmaVortex(ctx, 100, 100, 80, 1, 1, 0.5, 0.5, color, 1)).not.toThrow();
      expect(stopColors.length).toBe(3);
      expect(stopColors.every(isValidStopColor)).toBe(true);
    }
  );

  it('usa un único degradado y un único trazado para los 6 brazos', () => {
    const { ctx, calls } = recordingCtx();
    renderPlasmaVortex(ctx, 100, 100, 80, 1, 1, 0.5, 0.5, '#00f2fe', 1);
    expect(calls.createRadialGradient).toBe(1); // antes: 6
    expect(calls.stroke).toBe(1); // antes: 6
  });
});

describe('Holographic Scanlines', () => {
  it('dibuja todas las líneas con un único stroke (antes uno por línea)', () => {
    const { ctx, calls } = recordingCtx();
    renderHolographicScanlines(ctx, 100, 100, 100, 1, 2, 1, 'hsl(200, 90%, 50%)');
    expect(calls.stroke).toBe(1);
    expect(calls.moveTo).toBeGreaterThan(10);
  });
});

describe('Mercury Trails', () => {
  it('solo la cabeza de cada estela lleva resplandor (antes 8 shadowBlur por punta)', () => {
    const { ctx, sets } = recordingCtx();
    const trails = new Map<number, ApexTrail>();
    const tips = Array.from({ length: 6 }, (_, i) => ({ x: i * 10, y: i * 5 }));
    for (let f = 1; f <= 12; f++) renderMercuryTrails(ctx, tips, trails, 1, '#0ff', 1, f / 60);

    // Último frame: 6 puntas × 8 muestras = 48 puntos; solo 6 con sombra
    sets.length = 0;
    renderMercuryTrails(ctx, tips, trails, 1, '#0ff', 1, 13 / 60);
    const blurs = sets.filter(([n]) => n === 'shadowBlur').map(([, v]) => v as number);
    expect(blurs.length).toBe(48);
    expect(blurs.filter((b) => b > 0).length).toBe(6);
  });
});

describe('Aurora Ribbons', () => {
  it('reutiliza los degradados entre frames (antes 4 nuevos por frame) y usa la paleta', () => {
    const { ctx, calls, stopColors } = recordingCtx();
    for (let f = 0; f < 30; f++) renderAuroraRibbons(ctx, 100, 100, 80, 1.37, f / 60, 0.5, 1, '#aa00ff', '#ffaa00');
    expect(calls.createLinearGradient).toBe(2); // uno por color de paleta, una sola vez
    expect(stopColors.some((c) => c.startsWith('rgba(170,0,255'))).toBe(true);
    expect(stopColors.some((c) => c.startsWith('rgba(255,170,0'))).toBe(true);
  });
});

describe('Pulse Grid y Constellation', () => {
  it('no construyen una cadena de color por punto/línea: el color se fija una vez', () => {
    const grid = recordingCtx();
    renderPulseGrid(grid.ctx, new Uint8Array(128).fill(180), 100, 100, 80, 1, 1, '#ff8800');
    expect(grid.sets.filter(([n]) => n === 'fillStyle').length).toBe(1);
    expect(grid.sets.filter(([n]) => n === 'globalAlpha').length).toBeGreaterThan(10);

    const lines = recordingCtx();
    const tips = Array.from({ length: 6 }, (_, i) => ({ x: Math.cos(i) * 50, y: Math.sin(i) * 50 }));
    renderConstellationLines(lines.ctx, tips, 1, 0.6, 1, '#ff8800');
    expect(lines.sets.filter(([n]) => n === 'strokeStyle').length).toBe(1);
  });
});

describe('Los 10 efectos Pro con una paleta hsl()', () => {
  it('ninguno lanza excepción', () => {
    const { ctx } = recordingCtx();
    const c = 'hsl(280, 90%, 60%)';
    const raw = new Uint8Array(128).fill(150);
    const tips = Array.from({ length: 6 }, (_, i) => ({ x: i * 12, y: i * 7 }));
    const shards: CrystalShard[] = [];
    spawnCrystalShards(shards, 100, 100, 80, 1, c, 6);

    expect(() => {
      renderKickShockwave(ctx, [{ radius: 80, maxRadius: 200, alpha: 0.9, startTime: 0 }], 100, 100, 80, 1, 0.2, c, 1);
      renderChromaticRing(ctx, 100, 100, 80, 1, 0.5, 1);
      renderPulseGrid(ctx, raw, 100, 100, 80, 1, 1, c);
      renderMercuryTrails(ctx, tips, new Map(), 1, c, 1, 1);
      renderConstellationLines(ctx, tips, 1, 0.5, 1, c);
      renderPlasmaVortex(ctx, 100, 100, 80, 1, 1, 0.5, 0.5, c, 1);
      renderGravitationalLensRings(ctx, 100, 100, 80, 1, 1, 0.5, 1);
      renderAuroraRibbons(ctx, 100, 100, 80, 1, 1, 0.5, 1, c, c);
      renderCrystalShards(ctx, shards, 1, 1 / 60, 1);
      renderHolographicScanlines(ctx, 100, 100, 80, 1, 1, 1, c);
    }).not.toThrow();
  });
});

describe('Peso de coste de los efectos Pro', () => {
  it('la lente gravitacional (un solo trazado) ya no es la más pesada', () => {
    const weight = (id: string) => PRO_EFFECTS_LIST.find((e) => e.id === id)!.costWeight;
    expect(weight('gravitationalLens')).toBe(1);
    expect(weight('gravitationalLens')).toBeLessThan(weight('auroraRibbons'));
  });
});
