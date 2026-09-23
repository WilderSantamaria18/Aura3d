export type InstrumentId = 'piano' | 'guitar' | 'violin' | 'theremin' | 'drums';

export interface NoteTriggerOptions {
  freq: number;
  velocity?: number; // 0.0 a 1.0
  durationMs?: number;
  channel?: number;
}

/**
 * InstrumentVoice — Interfaz polimórfica para sintetizadores espaciales.
 *
 * Cumple con la recomendación de DESING_CAMARA_IMPORTANT.md:
 * Permite cambiar la implementación de síntesis (Synth, Karplus-Strong, Físico, Muestreado)
 * sin modificar una sola línea del tracking gestual ni de Three.js.
 */
export interface InstrumentVoice {
  start(freq: number, velocity: number, time: number): void;
  stop(time: number): void;
  updateContinuous?(x: number, y: number, z: number, time: number): void;
  dispose(): void;
  isAvailable(): boolean;
}
