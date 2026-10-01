import { describe, it, expect } from 'vitest';
import { renderCrystalShards, type CrystalShard } from '../components/Visualizers/effects/renderCrystalShards';
import { renderMercuryTrails, type ApexTrail } from '../components/Visualizers/effects/renderMercuryTrails';

/** Contexto 2D inerte: solo interesa la lógica de tiempo, no el dibujo. */
const fakeCtx = () =>
  new Proxy(
    {},
    {
      get: () => () => undefined,
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;

function makeShard(): CrystalShard {
  return { x: 0, y: 0, vx: 10, vy: -10, rotation: 0, rotationSpeed: 0.2, size: 3, alpha: 1, color: '#fff' };
}

describe('renderCrystalShards — independiente de los FPS', () => {
  const simulate = (fps: number, seconds: number) => {
    let shards = [makeShard()];
    const dt = 1 / fps;
    for (let i = 0; i < fps * seconds && shards.length > 0; i++) {
      shards = renderCrystalShards(fakeCtx(), shards, 1, dt, 1);
    }
    return shards[0];
  };

  it('tras 0.3 s la opacidad y el giro son los mismos a 30, 60 y 120 FPS (frames enteros)', () => {
    const a30 = simulate(30, 0.3);
    const a60 = simulate(60, 0.3);
    const a144 = simulate(120, 0.3);
    expect(a30.alpha).toBeCloseTo(a60.alpha, 3);
    expect(a144.alpha).toBeCloseTo(a60.alpha, 3);
    expect(a30.rotation).toBeCloseTo(a60.rotation, 3);
    expect(a144.rotation).toBeCloseTo(a60.rotation, 3);
  });

  it('la esquirla desaparece en el mismo instante aproximado a cualquier tasa', () => {
    const lifetime = (fps: number) => {
      let shards = [makeShard()];
      let frames = 0;
      while (shards.length > 0 && frames < fps * 5) {
        shards = renderCrystalShards(fakeCtx(), shards, 1, 1 / fps, 1);
        frames++;
      }
      return frames / fps;
    };
    expect(Math.abs(lifetime(30) - lifetime(144))).toBeLessThan(1 / 30 + 1e-9);
    expect(Math.abs(lifetime(60) - lifetime(144))).toBeLessThan(1 / 60 + 1e-9);
  });
});

describe('renderMercuryTrails — muestreo temporal', () => {
  const tips = [{ x: 10, y: 10 }];

  const samplesAfter = (fps: number, seconds: number) => {
    const trails = new Map<number, ApexTrail>();
    let count = 0;
    let lastLen = 0;
    for (let i = 0; i < fps * seconds; i++) {
      renderMercuryTrails(fakeCtx(), tips, trails, 1, '#0ff', 1, (i + 1) / fps);
      const len = trails.get(0)!.history.length;
      // Cuenta muestras nuevas (el historial se recorta a 8, así que se mira si cambió el instante)
      const t = trails.get(0)!.lastSample!;
      if (t === (i + 1) / fps && (len !== lastLen || len === 8)) count++;
      lastLen = len;
    }
    return count / seconds;
  };

  it('genera ~60 muestras por segundo a 60, 120 y 144 FPS (antes: una por frame)', () => {
    expect(samplesAfter(60, 2)).toBeGreaterThan(55);
    expect(samplesAfter(60, 2)).toBeLessThan(65);
    expect(samplesAfter(120, 2)).toBeLessThan(75);
    expect(samplesAfter(144, 2)).toBeLessThan(80);
  });

  it('sin timeSec conserva el comportamiento antiguo (una muestra por llamada)', () => {
    const trails = new Map<number, ApexTrail>();
    for (let i = 0; i < 5; i++) renderMercuryTrails(fakeCtx(), tips, trails, 1, '#0ff', 1);
    expect(trails.get(0)!.history.length).toBe(5);
  });
});
