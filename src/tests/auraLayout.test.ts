import { describe, it, expect } from 'vitest';
import {
  AURA_LOBES,
  AURA_REFERENCE_PALETTE,
  DEFAULT_AURA_PARAMS,
  buildAuraPalette,
  computeAuraLobes,
  createAuraLobes,
  type AuraSignals,
} from '../components/Visualizers/aura/auraLayout';

const rest = (over: Partial<AuraSignals> = {}): AuraSignals => ({
  time: 0,
  kick: 0,
  kickEnv: 0,
  bass: 0,
  mids: 0,
  treble: 0,
  energy: 0,
  chroma: new Float32Array(12),
  ...over,
});

describe('aura: lóbulos', () => {
  it('reparte 8 lóbulos por todo el contorno, empezando arriba', () => {
    const lobes = createAuraLobes();
    computeAuraLobes(lobes, 'body', rest(), { ...DEFAULT_AURA_PARAMS, motion: 0 }, 6);
    expect(lobes).toHaveLength(AURA_LOBES);
    // Sin movimiento ambiental: el primero queda arriba (-90°) y avanzan en sentido horario
    expect(lobes[0].angle).toBeCloseTo(-Math.PI / 2, 6);
    expect(lobes[2].angle).toBeCloseTo(0, 6); // derecha
    expect(lobes[4].angle).toBeCloseTo(Math.PI / 2, 6); // abajo
  });

  it('la paleta de referencia sigue el orden magenta/violeta, cian/turquesa, verde/amarillo, naranja/rojo', () => {
    expect(AURA_REFERENCE_PALETTE[0]).toBe('#ff2bd6');
    expect(AURA_REFERENCE_PALETTE[2]).toBe('#22d3ee');
    expect(AURA_REFERENCE_PALETTE[4]).toBe('#4ade80');
    expect(AURA_REFERENCE_PALETTE[6]).toBe('#fb923c');
  });

  it('un kick expande el aura y el bloom crece más que el cuerpo', () => {
    const calm = createAuraLobes();
    const hit = createAuraLobes();
    const params = { ...DEFAULT_AURA_PARAMS };
    computeAuraLobes(calm, 'body', rest(), params, 8);
    computeAuraLobes(hit, 'body', rest({ kick: 1, kickEnv: 1 }), params, 8);
    expect(hit[0].radius).toBeGreaterThan(calm[0].radius);
    expect(hit[0].dist).toBeGreaterThan(calm[0].dist);
    expect(hit[0].alpha).toBeGreaterThan(calm[0].alpha);

    // Aplicado a la misma señal, el bloom (capa exterior) queda detrás: es más grande y más tenue
    const body = createAuraLobes();
    const bloom = createAuraLobes();
    computeAuraLobes(body, 'body', rest({ kick: 1 }), params, 12);
    computeAuraLobes(bloom, 'bloom', rest({ kick: 1 }), params, 12);
    expect(bloom[0].radius).toBeGreaterThan(body[0].radius);
    expect(bloom[0].alpha).toBeLessThan(body[0].alpha);
  });

  it('la respuesta al kick escala la expansión; con 0 el aura no reacciona', () => {
    const none = createAuraLobes();
    const full = createAuraLobes();
    computeAuraLobes(none, 'body', rest({ kick: 1 }), { ...DEFAULT_AURA_PARAMS, kickResponse: 0, motion: 0 }, 9);
    computeAuraLobes(full, 'body', rest({ kick: 1 }), { ...DEFAULT_AURA_PARAMS, kickResponse: 1.5, motion: 0 }, 9);
    const still = createAuraLobes();
    computeAuraLobes(still, 'body', rest(), { ...DEFAULT_AURA_PARAMS, kickResponse: 0, motion: 0 }, 9);
    expect(none[0].radius).toBeCloseTo(still[0].radius, 10);
    expect(full[0].radius).toBeGreaterThan(none[0].radius);
  });

  it('la luz nunca sobrepasa la distancia máxima (se apaga antes del borde del canvas)', () => {
    const lobes = createAuraLobes();
    const maxExtent = 4.5;
    // Caso extremo: extensión máxima, kick acumulado, muchos graves y todas las notas encendidas
    const loud = rest({ kick: 1.8, kickEnv: 1, bass: 1, mids: 1, energy: 1, chroma: new Float32Array(12).fill(1) });
    for (const layer of ['body', 'bloom'] as const) {
      for (let t = 0; t < 40; t++) {
        computeAuraLobes(lobes, layer, { ...loud, time: t * 0.7 }, { ...DEFAULT_AURA_PARAMS, reach: 1.5, softness: 1, motion: 1.5, kickResponse: 1.5 }, maxExtent);
        for (const l of lobes) expect(l.dist + l.radius).toBeLessThanOrEqual(maxExtent + 1e-9);
      }
    }
  });

  it('la opacidad está acotada y responde a la intensidad sin blanquear', () => {
    const lobes = createAuraLobes();
    computeAuraLobes(lobes, 'body', rest({ energy: 1, kickEnv: 1, kick: 1 }), { ...DEFAULT_AURA_PARAMS, intensity: 1.5, kickResponse: 1.5 }, 10);
    for (const l of lobes) {
      expect(l.alpha).toBeGreaterThan(0);
      expect(l.alpha).toBeLessThanOrEqual(0.9);
    }
    computeAuraLobes(lobes, 'body', rest({ energy: 1 }), { ...DEFAULT_AURA_PARAMS, intensity: 0 }, 10);
    for (const l of lobes) expect(l.alpha).toBe(0);
  });

  it('más suavidad = lóbulos más grandes y más tenues', () => {
    const sharp = createAuraLobes();
    const soft = createAuraLobes();
    computeAuraLobes(sharp, 'body', rest(), { ...DEFAULT_AURA_PARAMS, softness: 0, motion: 0 }, 9);
    computeAuraLobes(soft, 'body', rest(), { ...DEFAULT_AURA_PARAMS, softness: 1, motion: 0 }, 9);
    expect(soft[0].radius).toBeGreaterThan(sharp[0].radius);
    expect(soft[0].alpha).toBeLessThan(sharp[0].alpha);
  });

  it('el movimiento ambiental mueve los lóbulos con el tiempo y se anula con motion 0', () => {
    const a = createAuraLobes();
    const b = createAuraLobes();
    computeAuraLobes(a, 'body', rest({ time: 0 }), { ...DEFAULT_AURA_PARAMS, motion: 1 }, 9);
    computeAuraLobes(b, 'body', rest({ time: 20 }), { ...DEFAULT_AURA_PARAMS, motion: 1 }, 9);
    expect(a[1].angle).not.toBeCloseTo(b[1].angle, 3);

    computeAuraLobes(a, 'body', rest({ time: 0 }), { ...DEFAULT_AURA_PARAMS, motion: 0 }, 9);
    computeAuraLobes(b, 'body', rest({ time: 20 }), { ...DEFAULT_AURA_PARAMS, motion: 0 }, 9);
    expect(a[1].angle).toBeCloseTo(b[1].angle, 10);
    expect(a[1].radius).toBeCloseTo(b[1].radius, 10);
  });

  it('una nota sostenida hincha el lóbulo que le corresponde', () => {
    const base = createAuraLobes();
    const note = createAuraLobes();
    const chroma = new Float32Array(12);
    chroma[6] = 1; // Fa# → lóbulo 4 (abajo)
    computeAuraLobes(base, 'body', rest(), { ...DEFAULT_AURA_PARAMS, motion: 0 }, 9);
    computeAuraLobes(note, 'body', rest({ chroma }), { ...DEFAULT_AURA_PARAMS, motion: 0 }, 9);
    expect(note[4].radius).toBeGreaterThan(base[4].radius);
    expect(note[0].radius).toBeCloseTo(base[0].radius, 10);
  });
});

describe('aura: paleta', () => {
  it('con el arcoíris activo usa la paleta de la referencia', () => {
    expect(buildAuraPalette(true, '#00f0ff', '#ff00ff')).toEqual([...AURA_REFERENCE_PALETTE]);
  });

  it('con una paleta concreta mezcla sus dos colores y cierra el contorno sin salto', () => {
    const p = buildAuraPalette(false, '#ff0000', '#0000ff');
    expect(p).toHaveLength(AURA_LOBES);
    expect(p[0]).toBe('rgb(255,0,0)'); // arranca en el primario
    expect(p[AURA_LOBES / 2]).toBe('rgb(0,0,255)'); // a mitad llega al secundario
    expect(p.every((c) => /^rgb\(\d+,\d+,\d+\)$/.test(c))).toBe(true);
  });
});
