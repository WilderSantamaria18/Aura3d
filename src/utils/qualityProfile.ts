import type { QualityTier } from './adaptiveQuality';

export interface QualityProfile {
  /** Multiplicador de los halos (shadowBlur): la operación más cara del canvas 2D. 0 = sin halo */
  glow: number;
  /** Tope del devicePixelRatio de los canvas 2D */
  dprCap: number;
}

/** Lo que cada nivel de calidad exige a los visualizadores 2D. 'high' deja todo como estaba. */
export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  high: { glow: 1, dprCap: 2 },
  medium: { glow: 0.6, dprCap: 1.5 },
  eco: { glow: 0, dprCap: 1 },
};

/** DPR para dimensionar Y dibujar un canvas: debe ser el mismo valor en ambos sitios */
export const canvasDprFor = (profile: QualityProfile, deviceDpr: number = 1): number =>
  Math.min(deviceDpr || 1, profile.dprCap);
