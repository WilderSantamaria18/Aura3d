import { describe, it, expect } from 'vitest';
import {
  MAX_FRAME_DT,
  clampDelta,
  decayForDt,
  frameScale,
  rateForDt,
  smoothToward,
} from '../utils/frameTiming';
import {
  KICK_MAX_DISPLACEMENT,
  KICK_MAX_PEAK,
  applyKickImpulse,
  createKickSpring,
  kickPeakForStrength,
  stepKickSpring,
} from '../utils/kickSpring';

/** Simula un golpe aislado a `fps` durante `seconds` y devuelve pico, instante del pico y tiempo de reposo. */
function simulate(fps: number, peakTarget: number, seconds = 1.5) {
  const dt = 1 / fps;
  const s = createKickSpring();
  applyKickImpulse(s, peakTarget);
  let peak = 0;
  let peakAt = 0;
  let rest: number | null = null;
  for (let i = 1; i <= fps * seconds; i++) {
    stepKickSpring(s, dt);
    if (s.displacement > peak) {
      peak = s.displacement;
      peakAt = i * dt;
    }
    if (rest === null && i > 2 && s.displacement < 0.0005 && peak > 0) rest = i * dt;
  }
  return { peak, peakAt, rest };
}

describe('frameTiming — factores calibrados a 60 FPS', () => {
  it('a 60 FPS devuelve exactamente el factor original', () => {
    expect(rateForDt(0.28, 1 / 60)).toBeCloseTo(0.28, 10);
    expect(decayForDt(0.9, 1 / 60)).toBeCloseTo(0.9, 10);
    expect(frameScale(1 / 60)).toBeCloseTo(1, 10);
  });

  it('dos frames a 120 FPS equivalen a uno a 60 FPS (suavizado consistente)', () => {
    const one = smoothToward(0, 1, 0.28, 1 / 60);
    let two = smoothToward(0, 1, 0.28, 1 / 120);
    two = smoothToward(two, 1, 0.28, 1 / 120);
    expect(two).toBeCloseTo(one, 10);
  });

  it('el decaimiento acumulado tras 1 s es el mismo a 30, 60 y 144 FPS', () => {
    const after = (fps: number) => {
      let v = 1;
      for (let i = 0; i < fps; i++) v *= decayForDt(0.9, 1 / fps);
      return v;
    };
    expect(after(30)).toBeCloseTo(after(60), 8);
    expect(after(144)).toBeCloseTo(after(60), 8);
  });

  it('clampDelta acota tirones y pestañas reanudadas, y tolera valores inválidos', () => {
    expect(clampDelta(5)).toBe(MAX_FRAME_DT);
    expect(clampDelta(0)).toBeGreaterThan(0);
    expect(clampDelta(-1)).toBeGreaterThan(0);
    expect(clampDelta(NaN)).toBeCloseTo(1 / 60, 10);
    expect(clampDelta(1 / 60)).toBeCloseTo(1 / 60, 10);
  });

  it('casos límite del factor', () => {
    expect(rateForDt(0, 1 / 60)).toBe(0);
    expect(rateForDt(1, 1 / 60)).toBe(1);
  });
});

describe('kickSpring — resorte elástico independiente de los FPS', () => {
  it('un golpe aislado alcanza exactamente el pico pedido', () => {
    const { peak } = simulate(240, 0.06);
    expect(peak).toBeCloseTo(0.06, 3);
  });

  it('la curva es la misma a 30, 60 y 144 FPS (pico, instante del pico y reposo)', () => {
    const r30 = simulate(30, 0.06);
    const r60 = simulate(60, 0.06);
    const r144 = simulate(144, 0.06);

    // El pico es idéntico salvo por el muestreo del propio frame
    expect(r30.peak).toBeGreaterThan(0.055);
    expect(r144.peak).toBeCloseTo(r60.peak, 2);
    // El instante del pico y el reposo coinciden dentro de un frame de la tasa más lenta
    expect(Math.abs(r30.peakAt - r144.peakAt)).toBeLessThanOrEqual(1 / 30 + 1e-6);
    expect(Math.abs(r60.rest! - r144.rest!)).toBeLessThanOrEqual(1 / 60 + 1e-6);
    expect(Math.abs(r30.rest! - r144.rest!)).toBeLessThanOrEqual(1 / 30 + 1e-6);
  });

  it('vuelve al reposo sin oscilar por debajo de cero y sin temblores', () => {
    const s = createKickSpring();
    applyKickImpulse(s, 0.08);
    let minDisp = Infinity;
    let last = 1;
    let reversals = 0;
    let prevDelta = 0;
    for (let i = 0; i < 240; i++) {
      stepKickSpring(s, 1 / 120);
      minDisp = Math.min(minDisp, s.displacement);
      const delta = s.displacement - last;
      if (prevDelta > 0 && delta < 0) reversals++;
      prevDelta = delta || prevDelta;
      last = s.displacement;
    }
    expect(minDisp).toBeGreaterThanOrEqual(0);
    expect(reversals).toBeLessThanOrEqual(1); // sube una vez y baja: sin rebotes múltiples
    expect(s.displacement).toBeLessThan(0.0005);
  });

  it('golpes suaves y fuertes se distinguen (antes el impulso se saturaba desde 0.7)', () => {
    const soft = kickPeakForStrength(0.35);
    const mid = kickPeakForStrength(0.7);
    const strong = kickPeakForStrength(1);
    expect(soft).toBeLessThan(mid);
    expect(mid).toBeLessThan(strong);
    expect(strong).toBeCloseTo(KICK_MAX_PEAK, 10);
    // Suave = respuesta sutil (menos de un tercio de la fuerte)
    expect(soft / strong).toBeLessThan(0.3);
  });

  it('intensidad y potencia escalan el pico; fuerza 0 no hace nada', () => {
    expect(kickPeakForStrength(1, 0.5)).toBeCloseTo(KICK_MAX_PEAK * 0.5, 10);
    expect(kickPeakForStrength(1, 1, 2)).toBeCloseTo(KICK_MAX_PEAK * 2, 10);
    expect(kickPeakForStrength(0)).toBe(0);
    const s = createKickSpring();
    applyKickImpulse(s, 0);
    expect(s.velocity).toBe(0);
  });

  it('golpes consecutivos se acumulan pero nunca superan el tope', () => {
    const single = simulate(120, kickPeakForStrength(1));

    const s = createKickSpring();
    let maxSeen = 0;
    for (let i = 0; i < 60; i++) {
      // Ráfaga: un golpe fuerte cada ~83 ms durante 5 s
      if (i % 10 === 0) applyKickImpulse(s, kickPeakForStrength(1));
      stepKickSpring(s, 1 / 120);
      maxSeen = Math.max(maxSeen, s.displacement);
    }
    expect(maxSeen).toBeGreaterThan(single.peak); // se acumula
    expect(maxSeen).toBeLessThanOrEqual(KICK_MAX_DISPLACEMENT + 1e-9); // pero acotado
  });

  it('un dt enorme (pestaña reanudada) no desestabiliza el resorte', () => {
    const s = createKickSpring();
    applyKickImpulse(s, 0.08);
    stepKickSpring(s, clampDelta(30));
    expect(Number.isFinite(s.displacement)).toBe(true);
    expect(s.displacement).toBeGreaterThanOrEqual(0);
    expect(s.displacement).toBeLessThanOrEqual(KICK_MAX_DISPLACEMENT);
  });
});
