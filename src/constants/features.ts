/**
 * Feature Flags for Aura3D Studio
 * Controls progressive enhancement and safe rollbacks.
 */
export const FEATURES = {
  /**
   * Minimalist Apple-inspired 4-section Landing Screen (LandingMinimal)
   * Pure silence, monumental typography, generous negative space, single cyan accent, 2 Liquid Glass cards.
   */
  LANDING_MINIMAL: true,

  /**
   * Complete Apple visionOS Liquid Glass 7-Act Immersive Scroll Landing Experience (V3)
   * Powered by Lenis smooth lerp, reactive 3D sphere, Dynamic Island, and specular glass.
   */
  LANDING_V3: true,

  /**
   * Complete Apple visionOS Liquid Glass Index/Landing Screen redesign (V2 fallback).
   */
  LANDING_V2: true,

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
