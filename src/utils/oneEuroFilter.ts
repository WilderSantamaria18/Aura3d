/**
 * 1€ Filter (One-Euro Filter)
 * Algoritmo de filtrado adaptativo de primer orden para señales ruidosas en tiempo real.
 * Reduce el jitter cuando la señal está casi estática y minimiza el retardo (lag)
 * cuando la señal se mueve rápidamente.
 *
 * Referencia: Casiez, G., Roussel, N. and Vogel, D. (2012)
 * "1 € filter: a simple speed-based low-pass filter for noisy input in human-computer interaction"
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;
  private alpha: number = 0;

  constructor(alpha: number = 0) {
    this.setAlpha(alpha);
  }

  public setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1.0) {
      alpha = 0.5;
    }
    this.alpha = alpha;
  }

  public filter(value: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = value;
    this.s = this.alpha * value + (1.0 - this.alpha) * (this.s ?? value);
    return this.s;
  }

  public lastValue(): number {
    return this.y ?? 0;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTimestamp: number | null = null;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(
    minCutoff: number = 1.0, // Frecuencia de corte mínima (Hz) para reducir jitter
    beta: number = 0.007,     // Coeficiente de velocidad para reducir latencia en movimientos rápidos
    dCutoff: number = 1.0     // Frecuencia de corte para la derivada (Hz)
  ) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = dt;
    return 1.0 / (1.0 + tau / te);
  }

  public filter(value: number, timestamp: number): number {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      return this.xFilter.filter(value);
    }

    const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000.0);
    this.lastTimestamp = timestamp;

    // Calcular la derivada (tasa de cambio)
    const dx = (value - this.xFilter.lastValue()) / dt;
    const edx = this.dxFilter.filter(dx);
    this.dxFilter.setAlpha(this.alpha(this.dCutoff, dt));

    // Adaptar la frecuencia de corte basada en la velocidad
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    this.xFilter.setAlpha(this.alpha(cutoff, dt));

    return this.xFilter.filter(value);
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTimestamp = null;
  }
}

/**
 * Filtro One-Euro tridimensional (X, Y, Z) para landmarks espaciales.
 */
export class Point3DOneEuroFilter {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private filterZ: OneEuroFilter;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.filterX = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterY = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.filterZ = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  public filter(point: { x: number; y: number; z: number }, timestamp: number): { x: number; y: number; z: number } {
    return {
      x: this.filterX.filter(point.x, timestamp),
      y: this.filterY.filter(point.y, timestamp),
      z: this.filterZ.filter(point.z, timestamp),
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.filterZ.reset();
  }
}
