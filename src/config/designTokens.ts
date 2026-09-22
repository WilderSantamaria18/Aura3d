// src/config/designTokens.ts
export const DESIGN_TOKENS = {
  // Liquid Glass recetas
  glass: {
    blur: {
      drawer: '52px',
      modal: '48px',
      pill: '40px',
      card: '32px',
      micro: '20px',
    },
    saturation: '190%',
    contrast: '105%',
    // Resina base
    resin: {
      topLeft: 'rgba(255, 255, 255, 0.06)',
      center: 'rgba(18, 20, 28, 0.65)',
      bottomRight: 'rgba(8, 10, 16, 0.85)',
    },
    // Bordes especulares
    border: {
      base: 'rgba(255, 255, 255, 0.10)',
      top: 'rgba(255, 255, 255, 0.30)',
      bottom: 'rgba(255, 255, 255, 0.05)',
    },
    // Sombras
    shadow: {
      card: '0 28px 80px rgba(0, 0, 0, 0.85), inset 0 1px 1.5px rgba(255, 255, 255, 0.22)',
      pill: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
      modal: '0 40px 120px rgba(0, 0, 0, 0.95), inset 0 1.5px 2px rgba(255, 255, 255, 0.28)',
    },
    // Radios orgánicos
    radius: {
      pill: '9999px',
      micro: '16px',
      card: '24px',
      modal: '28px',
      drawer: '28px',
      island: '32px',
    },
  },
  
  // Animaciones
  motion: {
    spring: {
      fast: { type: 'spring', stiffness: 400, damping: 30 },
      normal: { type: 'spring', stiffness: 320, damping: 28 },
      smooth: { type: 'spring', stiffness: 260, damping: 24 },
      slow: { type: 'spring', stiffness: 180, damping: 22 },
    },
    duration: {
      micro: 0.15,
      short: 0.25,
      normal: 0.35,
      long: 0.5,
      cinematic: 0.9,
    },
    ease: {
      iOS: [0.16, 1, 0.3, 1], // cubic-bezier elástico
      appleEase: [0.4, 0, 0.2, 1],
    },
  },
  
  // Espaciado consistente
  spacing: {
    xs: 'clamp(4px, 0.5vw, 8px)',
    sm: 'clamp(8px, 1vw, 12px)',
    md: 'clamp(12px, 1.5vw, 16px)',
    lg: 'clamp(16px, 2vw, 24px)',
    xl: 'clamp(24px, 3vw, 32px)',
  },
  
  // Z-Index stack
  zIndex: {
    atmosphere: 0,
    ambientGlow: 1,
    caustics: 1,
    visualizer: 10,
    sidebar: 40,
    dock: 50,
    header: 60,
    modal: 80,
    commandPalette: 90,
    toast: 100,
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
