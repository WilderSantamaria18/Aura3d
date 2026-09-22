/**
 * Feature Flags for Aura3D Studio
 * Controls progressive enhancement and safe rollbacks.
 */
export const FEATURES = {
  /**
   * Complete Apple visionOS Liquid Glass Index/Landing Screen redesign.
   * Features: 4 scroll-snap channels, Dynamic Island header, lateral glass dock,
   * superior gradient progress bar, and elastic transition curtain.
   */
  LANDING_V2: true,

  /**
   * Aura Wallpapers AI module: Generación, previsualización y aplicación
   * de fondos de pantalla 4K minimalistas con IA y presets curados.
   */
  WALLPAPERS_AI: true,
} as const;
