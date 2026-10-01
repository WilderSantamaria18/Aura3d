import type { BackgroundAtmosphere, VisualizerMode } from '../types/audio';

/**
 * Política de ambiente por visualizador (Rainbow Void no figura aquí: conserva su comportamiento).
 *
 *  - `dust`: si la capa global de polvo flotante (AmbientGlow) se dibuja. Se apaga donde el propio visualizador
 *    ya trae estrellas o partículas, para no apilar dos fondos equivalentes ni dos bucles de animación.
 *  - `recommended`: atmósferas de fondo que combinan con la escena (se ofrecen primero en el panel).
 */
export interface AtmospherePolicy {
  dust: boolean;
  recommended: BackgroundAtmosphere[];
  note: string;
}

export const ATMOSPHERE_POLICY: Partial<Record<VisualizerMode, AtmospherePolicy>> = {
  synthwave: { dust: false, recommended: ['sunset', 'stars'], note: 'Cielo nocturno o atardecer. Ya incluye estrellas propias.' },
  terrain: { dust: false, recommended: ['sunset', 'light_beams'], note: 'Una atmósfera tras el horizonte separa el relieve del fondo.' },
};

/** ¿Se dibuja el polvo ambiental global en este modo? (true si no hay política: comportamiento original) */
export function ambientDustEnabled(mode: VisualizerMode): boolean {
  return ATMOSPHERE_POLICY[mode]?.dust ?? true;
}

export const ATMOSPHERE_LABELS: Record<BackgroundAtmosphere, string> = {
  none: 'Ninguna',
  sunset: 'Atardecer',
  rain: 'Lluvia',
  sand: 'Arena',
  stars: 'Estrellas',
  radial_burst: 'Ráfaga radial',
  stardust_drift: 'Polvo estelar',
  light_beams: 'Haces de luz',
  quantum_waves: 'Ondas cuánticas',
};
