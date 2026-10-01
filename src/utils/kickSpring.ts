/**
 * Resorte elástico del kick.
 *
 * `displacement` es la fracción de escala extra del núcleo (0.05 = +5 %). Un golpe le da una
 * velocidad; el resorte amortiguado lo devuelve al reposo. Se integra con la solución analítica
 * del oscilador, que es exacta para cualquier `dt`: el mismo golpe produce la misma curva a 30, 60
 * o 144 FPS (el integrador anterior usaba `dt = 0.016` y una amortiguación por frame fijos).
 *
 * Las señales compartidas por las capas del aura son `displacement` (estado) y el impulso
 * (`applyKickImpulse`): ninguna capa debe detectar golpes por su cuenta.
 */

export interface KickSpringState {
  displacement: number;
  velocity: number;
}

export interface KickSpringParams {
  /** Frecuencia natural (rad/s) */
  omega: number;
  /** Razón de amortiguación (<1 = rebote elástico) */
  zeta: number;
}

/**
 * Rigidez 140 y amortiguación equivalente a la del feel original (ζ ≈ 0.65, ~370 ms hasta reposo).
 */
export const KICK_SPRING: KickSpringParams = { omega: Math.sqrt(140), zeta: 0.65 };

/** Expansión máxima de un golpe aislado de fuerza 1 con intensidad 1 (9 % de escala del núcleo) */
export const KICK_MAX_PEAK = 0.09;

/** Tope de acumulación: golpes seguidos se suman, pero nunca más allá de esto (16 %) */
export const KICK_MAX_DISPLACEMENT = 0.16;

/** Exponente que separa golpes suaves de fuertes (fuerza 0.35 → 21 % del máximo, 0.7 → 61 %, 1 → 100 %) */
const STRENGTH_CURVE = 1.4;

export function createKickSpring(): KickSpringState {
  return { displacement: 0, velocity: 0 };
}

/**
 * Factor P tal que el pico de un golpe aislado es (v0 / ω) · P para un oscilador subamortiguado.
 * Pico en t* = atan(√(1−ζ²)/ζ) / ω_d.
 */
function peakFactor(zeta: number): number {
  const s = Math.sqrt(Math.max(1e-9, 1 - zeta * zeta));
  return Math.exp(-(zeta / s) * Math.atan(s / zeta));
}

/** Velocidad inicial necesaria para que un golpe aislado alcance exactamente `peak` de desplazamiento. */
export function velocityForPeak(peak: number, params: KickSpringParams = KICK_SPRING): number {
  return (peak * params.omega) / peakFactor(params.zeta);
}

/**
 * Expansión pico (fracción de escala) para un golpe.
 * @param strength fuerza normalizada del detector (0..1)
 * @param intensity ajuste del usuario (`kickIntensity`, 1 = neutro)
 * @param power ajuste "potencia del kick" ya normalizado (1 = neutro)
 */
export function kickPeakForStrength(strength: number, intensity = 1, power = 1): number {
  const s = Math.min(1, Math.max(0, strength));
  return KICK_MAX_PEAK * Math.pow(s, STRENGTH_CURVE) * Math.max(0, intensity) * Math.max(0, power);
}

/**
 * Aplica el impulso de un golpe. Los golpes consecutivos suman velocidad, con un tope, de modo que
 * una ráfaga se acumula de forma controlada sin disparar la escala.
 */
export function applyKickImpulse(
  state: KickSpringState,
  peak: number,
  params: KickSpringParams = KICK_SPRING,
  maxDisplacement = KICK_MAX_DISPLACEMENT
): void {
  if (peak <= 0) return;
  const vCap = velocityForPeak(maxDisplacement, params);
  state.velocity = Math.min(vCap, state.velocity + velocityForPeak(peak, params));
}

/**
 * Avanza el resorte `dt` segundos (solución analítica, exacta para cualquier `dt`).
 * El núcleo nunca se encoge por debajo de su tamaño de reposo: al volver a 0 se detiene ahí.
 */
export function stepKickSpring(
  state: KickSpringState,
  dt: number,
  params: KickSpringParams = KICK_SPRING,
  maxDisplacement = KICK_MAX_DISPLACEMENT
): void {
  const { omega, zeta } = params;
  const a = zeta * omega; // decaimiento
  const b = omega * Math.sqrt(Math.max(1e-9, 1 - zeta * zeta)); // frecuencia amortiguada
  const e = Math.exp(-a * dt);
  const c = Math.cos(b * dt);
  const s = Math.sin(b * dt);
  const x0 = state.displacement;
  const v0 = state.velocity;

  const x1 = e * (x0 * c + ((v0 + a * x0) / b) * s);
  const v1 = e * (v0 * c - ((a * (v0 + a * x0)) / b + b * x0) * s);

  if (x1 <= 0) {
    state.displacement = 0;
    // Tras cruzar el reposo hacia abajo se detiene; si aún sube (impulso recién aplicado) se conserva
    state.velocity = v1 > 0 ? v1 : 0;
  } else {
    state.displacement = Math.min(maxDisplacement, x1);
    state.velocity = v1;
  }
}
