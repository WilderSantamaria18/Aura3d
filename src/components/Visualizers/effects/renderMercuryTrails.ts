import { parseColor } from './color';

export interface ApexTrailPoint {
  x: number;
  y: number;
}

export interface ApexTrail {
  history: ApexTrailPoint[];
  /** Instante (s) de la última muestra añadida */
  lastSample?: number;
}

/** Cadencia de muestreo de la estela; con tolerancia para que 60/120/144 Hz den ≈60 muestras/s */
const SAMPLE_INTERVAL = 1 / 60 - 0.0035;

export function renderMercuryTrails(
  ctx: CanvasRenderingContext2D,
  tipPoints: { x: number; y: number }[],
  apexTrails: Map<number, ApexTrail>,
  u: number,
  primaryColor: string,
  intensity = 1.0,
  timeSec?: number
): void {
  if (tipPoints.length === 0) return;

  ctx.save();
  const maxHistory = 8;
  const maxTips = Math.min(tipPoints.length, 6);

  // Color fijo de gota y opacidad por muestra con globalAlpha (sin cadenas nuevas por punto)
  ctx.fillStyle = '#ffffff';
  const [pr, pg, pb] = parseColor(primaryColor || '#00f2fe');
  ctx.shadowColor = `rgb(${pr},${pg},${pb})`;

  for (let i = 0; i < maxTips; i++) {
    const tip = tipPoints[i];
    let trail = apexTrails.get(i);
    if (!trail) {
      trail = { history: [] };
      apexTrails.set(i, trail);
    }

    // Sin `timeSec` (llamadas antiguas) se añade una muestra por frame, como antes
    const due = timeSec === undefined || trail.lastSample === undefined || timeSec - trail.lastSample >= SAMPLE_INTERVAL;
    if (due) {
      trail.history.unshift({ x: tip.x, y: tip.y });
      trail.lastSample = timeSec;
      if (trail.history.length > maxHistory) {
        trail.history.length = maxHistory;
      }
    }

    const histLen = trail.history.length;
    for (let h = 0; h < histLen; h++) {
      const pt = trail.history[h];
      const factor = 1 - h / maxHistory;
      const size = Math.max(0.6, (maxHistory - h) * 0.4 * u * Math.min(intensity, 1.4));

      ctx.globalAlpha = Math.min(0.8, factor * 0.55 * intensity);
      // shadowBlur es la operación más cara del canvas 2D: antes 8 por punta (hasta 48 por frame).
      // Solo la cabeza de cada estela (la muestra más reciente) conserva el resplandor.
      ctx.shadowBlur = h === 0 ? 8 * u * intensity : 0;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
