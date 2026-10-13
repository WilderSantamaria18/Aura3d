/**
 * Feature Flags for Aura3D Studio
 * Controls progressive enhancement and safe rollbacks.
 */
export const FEATURES = {
  /**
   * Aura Wallpapers AI module: Generación, previsualización y aplicación
   * de fondos de pantalla 4K minimalistas con IA y presets curados.
   */
  WALLPAPERS_AI: true,

  /**
   * AURA3D Spatial Mode V2: Arquitectura de audio aislada (MusicBus/InstrumentBus),
   * máquina de estados gestual con histéresis y control tridimensional.
   */
  SPATIAL_MODE_V2: true,
} as const;
