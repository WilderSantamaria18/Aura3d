import { describe, it, expect } from 'vitest';
import {
  ADAPTIVE,
  FrameRateMeter,
  effectiveTier,
  initialAdaptiveState,
  lowerTier,
  minTier,
  raiseTier,
  stepAdaptiveQuality,
  type AdaptiveState,
  type QualityTier,
} from '../utils/adaptiveQuality';

/** Simula N segundos a un FPS constante, evaluando cada 500 ms como hace el servicio */
function simulate(opts: {
  seconds: number;
  fps: number;
  userTier: QualityTier;
  cap: QualityTier;
  state?: AdaptiveState;
  startAt?: number;
}) {
  let state = opts.state ?? initialAdaptiveState(0);
  let cap = opts.cap;
  let now = opts.startAt ?? 0;
  const end = now + opts.seconds * 1000;
  const changes: { at: number; cap: QualityTier }[] = [];
  while (now < end) {
    now += 500;
    const r = stepAdaptiveQuality(state, opts.fps, now, opts.userTier, cap);
    state = r.state;
    if (r.cap !== cap) changes.push({ at: now, cap: r.cap });
    cap = r.cap;
  }
  return { state, cap, now, changes };
}

describe('niveles', () => {
  it('minTier, lowerTier y raiseTier respetan el orden eco < medium < high', () => {
    expect(minTier('high', 'medium')).toBe('medium');
    expect(minTier('eco', 'high')).toBe('eco');
    expect(lowerTier('high')).toBe('medium');
    expect(lowerTier('eco')).toBe('eco');
    expect(raiseTier('eco')).toBe('medium');
    expect(raiseTier('high')).toBe('high');
  });

  it('el nivel del usuario es un techo y con el automático apagado manda el usuario', () => {
    expect(effectiveTier('medium', 'high', true)).toBe('medium'); // el auto nunca supera al usuario
    expect(effectiveTier('high', 'eco', true)).toBe('eco');
    expect(effectiveTier('high', 'eco', false)).toBe('high');
  });
});

describe('stepAdaptiveQuality: bajar', () => {
  it('no baja por una caída breve', () => {
    const r = simulate({ seconds: ADAPTIVE.COOLDOWN_MS / 1000 + 2, fps: 20, userTier: 'high', cap: 'high' });
    expect(r.changes).toHaveLength(0);
  });

  it('baja un nivel tras mantener FPS bajos el tiempo configurado', () => {
    const r = simulate({ seconds: 20, fps: 25, userTier: 'high', cap: 'high', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes[0]).toMatchObject({ cap: 'medium' });
    expect(r.changes[0].at - ADAPTIVE.COOLDOWN_MS).toBeGreaterThanOrEqual(ADAPTIVE.DOWN_AFTER_MS);
  });

  it('con FPS bajos sostenidos baja de uno en uno (no salta a eco de golpe) con enfriamiento', () => {
    const r = simulate({ seconds: 60, fps: 15, userTier: 'high', cap: 'high', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes.map((c) => c.cap)).toEqual(['medium', 'eco']);
    expect(r.changes[1].at - r.changes[0].at).toBeGreaterThanOrEqual(ADAPTIVE.COOLDOWN_MS);
    expect(r.cap).toBe('eco');
  });

  it('en eco no baja más', () => {
    const r = simulate({ seconds: 60, fps: 5, userTier: 'eco', cap: 'high', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes).toHaveLength(0);
  });

  it('un fotograma bueno en medio reinicia la cuenta', () => {
    let state = initialAdaptiveState(0);
    let now = ADAPTIVE.COOLDOWN_MS;
    state = stepAdaptiveQuality(state, 20, now, 'high', 'high').state; // empieza a contar
    now += ADAPTIVE.DOWN_AFTER_MS - 500;
    state = stepAdaptiveQuality(state, 50, now, 'high', 'high').state; // zona media: reinicia
    now += 1000;
    const r = stepAdaptiveQuality(state, 20, now, 'high', 'high');
    expect(r.cap).toBe('high');
  });
});

describe('stepAdaptiveQuality: subir', () => {
  it('recupera un nivel tras mucho tiempo sobrado, y es más lento que bajar', () => {
    expect(ADAPTIVE.UP_AFTER_MS).toBeGreaterThan(ADAPTIVE.DOWN_AFTER_MS);
    const r = simulate({ seconds: 60, fps: 60, userTier: 'high', cap: 'eco', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes.map((c) => c.cap)).toEqual(['medium', 'high']);
    expect(r.changes[0].at - ADAPTIVE.COOLDOWN_MS).toBeGreaterThanOrEqual(ADAPTIVE.UP_AFTER_MS);
  });

  it('nunca supera la elección del usuario', () => {
    const r = simulate({ seconds: 120, fps: 60, userTier: 'medium', cap: 'eco', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.cap).toBe('medium');
    expect(effectiveTier('medium', r.cap, true)).toBe('medium');
  });

  it('si ya está en el nivel del usuario no hay nada que subir', () => {
    const r = simulate({ seconds: 120, fps: 60, userTier: 'high', cap: 'high', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes).toHaveLength(0);
  });

  it('en la zona intermedia (entre los umbrales) no cambia nada: sin oscilación', () => {
    const mid = (ADAPTIVE.DOWN_FPS + ADAPTIVE.UP_FPS) / 2;
    const r = simulate({ seconds: 120, fps: mid, userTier: 'high', cap: 'medium', startAt: ADAPTIVE.COOLDOWN_MS });
    expect(r.changes).toHaveLength(0);
  });
});

describe('stepAdaptiveQuality: enfriamiento', () => {
  it('justo después de un cambio no acumula tiempo ni decide', () => {
    const state: AdaptiveState = { lowSince: null, highSince: null, lastChangeAt: 10_000 };
    const r = stepAdaptiveQuality(state, 5, 10_000 + ADAPTIVE.COOLDOWN_MS - 1, 'high', 'medium');
    expect(r.cap).toBe('medium');
    expect(r.state.lowSince).toBeNull();
  });
});

describe('FrameRateMeter', () => {
  it('no da cifra hasta tener muestras suficientes', () => {
    const m = new FrameRateMeter(60, 30);
    for (let i = 0; i < 29; i++) m.push(16.67);
    expect(m.fps()).toBeNull();
    m.push(16.67);
    expect(m.fps()).toBeCloseTo(60, 0);
  });

  it('mide la media móvil de la ventana', () => {
    const m = new FrameRateMeter(60, 30);
    for (let i = 0; i < 60; i++) m.push(33.33);
    expect(m.fps()).toBeCloseTo(30, 0);
    for (let i = 0; i < 60; i++) m.push(16.67); // la ventana se renueva por completo
    expect(m.fps()).toBeCloseTo(60, 0);
  });

  it('ignora intervalos enormes (pestaña oculta) e inválidos', () => {
    const m = new FrameRateMeter(60, 30);
    for (let i = 0; i < 30; i++) m.push(16.67);
    m.push(5000); // volvió de segundo plano
    m.push(NaN);
    m.push(-3);
    m.push(0);
    expect(m.fps()).toBeCloseTo(60, 0);
  });

  it('reset vacía las muestras', () => {
    const m = new FrameRateMeter(60, 30);
    for (let i = 0; i < 60; i++) m.push(16.67);
    m.reset();
    expect(m.fps()).toBeNull();
  });
});
