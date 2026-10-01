/**
 * Aura de Rainbow Void — cálculo puro (sin canvas) de los lóbulos de luz.
 *
 * Dos capas de lóbulos radiales alrededor del disco:
 *  - cuerpo cromático: la nube de color principal, repartida por todo el contorno
 *  - bloom exterior: difusión más ancha y tenue, que reacciona con un pequeño desfase
 *
 * Las distancias y radios están en unidades del radio del disco (r = 1). Todas las entradas son
 * señales ya suavizadas y compartidas (kick del resorte, graves sostenidos, RMS, medios, chroma):
 * nada aquí detecta golpes por su cuenta.
 */

import { parseColor } from '../effects/color';

/** Orden angular de la referencia, empezando arriba y en sentido horario */
export const AURA_REFERENCE_PALETTE = [
  '#ff2bd6', // magenta (arriba)
  '#8b5cf6', // violeta
  '#22d3ee', // cian (derecha)
  '#2dd4bf', // turquesa
  '#4ade80', // verde (abajo)
  '#facc15', // amarillo
  '#fb923c', // naranja (izquierda)
  '#f43f5e', // rojo
] as const;

export const AURA_LOBES = AURA_REFERENCE_PALETTE.length;

export interface AuraLobe {
  /** Posición del centro del lóbulo */
  angle: number;
  dist: number;
  radius: number;
  alpha: number;
  colorIndex: number;
}

export interface AuraSignals {
  /** Tiempo en segundos */
  time: number;
  /** Expansión del kick en la capa: 0 = reposo, 1 ≈ golpe fuerte (ya con el desfase de esa capa) */
  kick: number;
  /** Envolvente corta del golpe (0..1), para el pico de brillo */
  kickEnv: number;
  bass: number;
  mids: number;
  treble: number;
  /** RMS / energía general */
  energy: number;
  /** Energía de las 12 notas (0..1) */
  chroma: ArrayLike<number>;
}

export interface AuraParams {
  /** Brillo global del aura (0..1.5) */
  intensity: number;
  /** Extensión (0.6..1.5) */
  reach: number;
  /** Suavidad (0..1): más suave = lóbulos más grandes y tenues */
  softness: number;
  /** Respuesta al kick (0..1.5) */
  kickResponse: number;
  /** Movimiento ambiental (0..1.5) */
  motion: number;
}

export const DEFAULT_AURA_PARAMS: AuraParams = {
  intensity: 0.9,
  reach: 1,
  softness: 0.6,
  kickResponse: 1,
  motion: 1,
};

export type AuraLayer = 'body' | 'bloom';

export function createAuraLobes(count = AURA_LOBES): AuraLobe[] {
  return Array.from({ length: count }, (_, i) => ({ angle: 0, dist: 0, radius: 0, alpha: 0, colorIndex: i }));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Rellena `out` con los lóbulos de una capa. No asigna memoria.
 * @param maxExtent distancia máxima (en radios del disco) a la que puede llegar la luz: los lóbulos se
 *        recortan para que se desvanezcan por completo antes del borde del canvas.
 */
export function computeAuraLobes(
  out: AuraLobe[],
  layer: AuraLayer,
  s: AuraSignals,
  p: AuraParams,
  maxExtent: number
): void {
  const n = out.length;
  const bloom = layer === 'bloom';
  const motion = clamp(p.motion, 0, 1.5);
  const soft = clamp(p.softness, 0, 1);
  const kickGain = clamp(p.kickResponse, 0, 1.5);

  // Geometría de reposo de cada capa (en radios del disco)
  const baseDist = bloom ? 1.9 : 1.3;
  const baseRadius = bloom ? 2.7 : 1.85;
  // Más suave = más grande y tenue (la luz se reparte)
  const softRadius = 0.85 + soft * 0.5;
  const softAlpha = 1.15 - soft * 0.3;

  const layerAlpha = bloom ? 0.5 : 0.7;
  const sustained = 0.5 + s.energy * 0.35; // respiración general con el RMS

  for (let i = 0; i < n; i++) {
    const lobe = out[i];
    const phase = (i / n) * Math.PI * 2;

    // Deriva lenta de posición, tamaño y opacidad (ambiente)
    const drift = Math.sin(s.time * 0.11 * motion + i * 1.3) * 0.3 * motion;
    const breathe = 1 + Math.sin(s.time * 0.23 * motion + i * 2.1) * 0.1 * motion;
    const flicker = 1 + Math.sin(s.time * 0.17 * motion + i * 3.7) * 0.12 * motion;

    // Variación local: medios ondulan cada lóbulo distinto; la nota correspondiente lo hincha
    const noteIdx = Math.min(11, Math.floor((i / n) * 12));
    const note = (s.chroma[noteIdx] ?? 0) as number;
    const ripple = s.mids * 0.22 * Math.sin(s.time * 0.9 * motion + i * 1.7) + note * 0.26;

    const kickExp = s.kick * 0.3 * kickGain;

    lobe.angle = -Math.PI / 2 + phase + drift;
    lobe.dist = baseDist * p.reach * (1 + kickExp * 0.55 + s.bass * 0.1);
    lobe.radius = baseRadius * p.reach * softRadius * breathe * (1 + s.bass * 0.26 + kickExp + ripple);
    lobe.alpha = clamp(
      p.intensity * layerAlpha * sustained * softAlpha * flicker * (1 + s.kickEnv * 0.25 * kickGain),
      0,
      0.9
    );

    // Que se desvanezca antes del borde: ni el centro ni el radio pueden sobrepasar `maxExtent`
    if (lobe.dist > maxExtent * 0.7) lobe.dist = maxExtent * 0.7;
    const room = maxExtent - lobe.dist;
    if (lobe.radius > room) lobe.radius = Math.max(0.05, room);
  }
}

/**
 * Paleta de 8 colores para el aura. Con el arcoíris activo usa la paleta de la referencia;
 * con una paleta concreta, mezcla sus dos colores a lo largo del contorno.
 */
export function buildAuraPalette(rainbow: boolean, primary: string, secondary: string): string[] {
  if (rainbow) return [...AURA_REFERENCE_PALETTE];
  const a = parseColor(primary);
  const b = parseColor(secondary);
  const out: string[] = [];
  for (let i = 0; i < AURA_LOBES; i++) {
    // Ida y vuelta (primario → secundario → primario) para que el contorno cierre sin salto
    const t = 1 - Math.abs((i / AURA_LOBES) * 2 - 1);
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    out.push(`rgb(${c[0]},${c[1]},${c[2]})`);
  }
  return out;
}
