import type { VisualizerShape, IVisualShapeConfig } from '../types';
import type { BackgroundAtmosphere } from '../types/audio';

/**
 * Centralized Visualizer Presets Configuration
 * Extensible configuration dictionary for all 3D geometries and shader modes.
 */
export const VISUAL_SHAPE_PRESETS: Record<VisualizerShape, IVisualShapeConfig> = {
  sphere: {
    id: 'sphere',
    name: 'Esfera Cúbica Cuántica',
    description: 'Nube esférica de partículas con deformación armónica esférica de 4 octavas',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.4,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'harmonic',
  },
  rings: {
    id: 'rings',
    name: 'Anillos Orbitales de Saturno',
    description: '5 anillos concéntricos con satélites reactivos a los armónicos agudos',
    baseRadius: 1.15,
    pointSize: 4.8,
    baseSpeed: 1.1,
    bassReactivity: 1.6,
    colorDistribution: 'concentric',
    deformationAlgorithm: 'orbital',
  },
  spikes: {
    id: 'spikes',
    name: 'Corona de Picos FFT',
    description: 'Estructura cristalina con agujas que se disparan en los transitorios de percusión',
    baseRadius: 0.95,
    pointSize: 4.0,
    baseSpeed: 0.6,
    bassReactivity: 1.9,
    colorDistribution: 'radial',
    deformationAlgorithm: 'spikes',
  },
  cloud: {
    id: 'cloud',
    name: 'Nébula Cuántica Turbulenta',
    description: 'Partículas flotantes con ruido Perlin 3D y dispersión por frecuencias medias',
    baseRadius: 1.25,
    pointSize: 3.6,
    baseSpeed: 0.45,
    bassReactivity: 1.2,
    colorDistribution: 'uniform',
    deformationAlgorithm: 'turbulent',
  },
  torus: {
    id: 'torus',
    name: 'Toroide Magnético',
    description: 'Dona electromagnética en rotación dual con vórtice gravitacional de bajos',
    baseRadius: 1.1,
    pointSize: 4.5,
    baseSpeed: 1.2,
    bassReactivity: 1.5,
    colorDistribution: 'concentric',
    deformationAlgorithm: 'toroidal',
  },
  wave: {
    id: 'wave',
    name: 'Océano de Terreno Sintético',
    description: 'Malla tridimensional ondulante inspirada en sintetizadores modulares retro',
    baseRadius: 1.3,
    pointSize: 3.8,
    baseSpeed: 0.9,
    bassReactivity: 1.7,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'harmonic',
  },
  kaleidoscope: {
    id: 'kaleidoscope',
    name: 'Caleidoscopio Radial',
    description: 'Simetría octa-radial con prismas de difracción rotatorios sensibles a armónicos agudos',
    baseRadius: 1.15,
    pointSize: 4.4,
    baseSpeed: 1.0,
    bassReactivity: 1.5,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  vortex: {
    id: 'vortex',
    name: 'Vórtex Hipnótico Gravitacional',
    description: 'Espirales dobles de luz cuántica succionadas hacia el vacío al compás del bombo',
    baseRadius: 1.2,
    pointSize: 4.2,
    baseSpeed: 1.4,
    bassReactivity: 1.8,
    colorDistribution: 'concentric',
    deformationAlgorithm: 'toroidal',
  },
  fractal: {
    id: 'fractal',
    name: 'Flor Fractal Sagrada',
    description: 'Mándala de geometría fractal con pétalos poligonales que respiran con los graves',
    baseRadius: 1.1,
    pointSize: 4.0,
    baseSpeed: 0.7,
    bassReactivity: 1.6,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebulosa / Aurora Líquida',
    description: 'Estelas de gas cósmico cromático con flujo turbulento y dispersión atmosférica',
    baseRadius: 1.3,
    pointSize: 3.8,
    baseSpeed: 0.5,
    bassReactivity: 1.4,
    colorDistribution: 'uniform',
    deformationAlgorithm: 'turbulent',
  },
  bars: {
    id: 'bars',
    name: 'Barras Radiales Spectrum Pro',
    description: 'Ecualizador circular de 64 bandas con decaimiento de picos estilo consola de audio DJ',
    baseRadius: 1.0,
    pointSize: 4.6,
    baseSpeed: 0.8,
    bassReactivity: 1.9,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'spikes',
  },
  laser: {
    id: 'laser',
    name: 'Rayos Láser Strobe',
    description: 'Haces cinéticos que se disparan en los transitorios de percusión y caja',
    baseRadius: 1.05,
    pointSize: 4.8,
    baseSpeed: 1.2,
    bassReactivity: 2.0,
    colorDistribution: 'radial',
    deformationAlgorithm: 'spikes',
  },
  icosahedron: {
    id: 'icosahedron',
    name: 'Icosaedro Sagrado',
    description: 'Geometría sagrada de 20 caras con vértices pulsantes al ritmo del compás',
    baseRadius: 1.05,
    pointSize: 5.0,
    baseSpeed: 0.75,
    bassReactivity: 1.5,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  octahedron: {
    id: 'octahedron',
    name: 'Octaedro de Diamante Neón',
    description: 'Estructura bipiramidal reflectante con facetas de difracción espectral',
    baseRadius: 1.0,
    pointSize: 4.6,
    baseSpeed: 0.85,
    bassReactivity: 1.6,
    colorDistribution: 'radial',
    deformationAlgorithm: 'spikes',
  },
};

export const getVisualShapeConfig = (shape: VisualizerShape): IVisualShapeConfig => {
  return VISUAL_SHAPE_PRESETS[shape] || VISUAL_SHAPE_PRESETS.sphere;
};

export interface EffectOption {
  id: VisualizerShape;
  name: string;
  desc: string;
  tag: string;
  category: string;
}

/**
 * Catálogo exclusivo de Geometrías 3D para la Esfera (WebGL / Three.js)
 */
export const SPHERE_3D_GEOMETRIES: EffectOption[] = [
  {
    id: 'sphere',
    name: 'Esfera Fibonacci',
    desc: 'Esfera cristalina áurea con deformación armónica esférica de 4 octavas.',
    tag: 'FIBONACCI 3D',
    category: 'Esferas & Enjambres',
  },
  {
    id: 'rings',
    name: 'Anillos Orbitales de Saturno',
    desc: '5 anillos orbitales toroides concéntricos con inclinación espacial y oscilación.',
    tag: 'ORBITAL 3D',
    category: 'Anillos & Órbitas',
  },
  {
    id: 'spikes',
    name: 'Corona de Picos FFT',
    desc: 'Geometría erizo 3D con agujas que se disparan en transitorios de percusión.',
    tag: 'RADIAL 3D',
    category: 'Picos & Frecuencias',
  },
  {
    id: 'cloud',
    name: 'Nube Cuántica de Partículas',
    desc: 'Enjambre browniano tridimensional con dispersión espacial continua.',
    tag: 'ENJAMBRE 3D',
    category: 'Esferas & Enjambres',
  },
  {
    id: 'torus',
    name: 'Toroide Cuántico 3D',
    desc: 'Dona electromagnética en rotación dual y deformación gravitacional.',
    tag: 'TOROIDE 3D',
    category: 'Anillos & Órbitas',
  },
  {
    id: 'wave',
    name: 'Océano de Ondas Sinusoidales',
    desc: 'Malla de terreno tridimensional con oleaje dinámico de frecuencias.',
    tag: 'TERRENO 3D',
    category: 'Superficies & Mallas',
  },
  {
    id: 'icosahedron',
    name: 'Icosaedro Sagrado',
    desc: 'Poliedro cristalino de 20 facetas con vértices pulsantes.',
    tag: 'CRISTAL 3D',
    category: 'Poliedros Cristalinos',
  },
  {
    id: 'octahedron',
    name: 'Octaedro Cuántico',
    desc: 'Diamante bipiramidal reflectante con simetría de 8 facetas nítidas.',
    tag: 'DIAMANTE 3D',
    category: 'Poliedros Cristalinos',
  },
];

/**
 * Catálogo exclusivo de Efectos Cinéticos 2D para Rainbow Void (Canvas 2D)
 * Los 7 modos esenciales calibrados para el núcleo circular:
 */
export const RAINBOW_VOID_EFFECTS: EffectOption[] = [
  {
    id: 'sphere',
    name: 'Núcleo Minimal Difuminado',
    desc: 'Aura de resplandor suave con capas de degradado radiante fluido y micro-surcos de vinilo.',
    tag: 'SPHERE 2D',
    category: 'Núcleo Minimal',
  },
  {
    id: 'spikes',
    name: 'Corona de Picos FFT Reactiva',
    desc: '48 agujas cristalinas radiales con micro-partículas brillantes disparadas por percusión.',
    tag: 'CORONA 48',
    category: 'Frecuencias & Picos',
  },
  {
    id: 'fractal',
    name: 'Mándala Sagrada Multicapa',
    desc: 'Mándala de 4 capas con pétalos oscilantes y vibración armónica reactiva.',
    tag: 'MÁNDALA 4L',
    category: 'Geometría Sagrada',
  },
  {
    id: 'wave',
    name: 'Ondas de Frecuencia Líquida',
    desc: 'Cintas de ondas radiales moduladas fluidamente por el espectro de frecuencia.',
    tag: 'ONDAS LÍQUIDAS',
    category: 'Cintas & Ondas',
  },
  {
    id: 'torus',
    name: 'Anillo Neón Orbital',
    desc: 'Banda elíptica neón en rotación dual modulada por los tonos bajos.',
    tag: 'TOROIDE DUAL',
    category: 'Órbitas & Anillos',
  },
  {
    id: 'nebula',
    name: 'Nebulosa / Aurora Líquida',
    desc: '16 auroras de gas cósmico cromático con flujo turbulento y dispersión atmosférica.',
    tag: 'AURORA 2D',
    category: 'Efectos Atmosféricos',
  },
  {
    id: 'cloud',
    name: 'Nube Efervescente',
    desc: 'Partículas flotantes que emergen del núcleo hacia el halo exterior.',
    tag: 'ENJAMBRE 2D',
    category: 'Efectos Atmosféricos',
  },
];

export interface AtmosphereOption {
  id: BackgroundAtmosphere;
  name: string;
  desc: string;
  tag: string;
}

/**
 * Catálogo de Atmósferas y Fondos de Pantalla Completa
 * Independiente del núcleo circular, renderizado en capa z-0 con pointer-events: none.
 */
export const ATMOSPHERE_OPTIONS: AtmosphereOption[] = [
  {
    id: 'none',
    name: 'Fondo Limpio Etéreo (Desactivado)',
    desc: 'Fondo limpio con degradado etéreo sutil y blur estático.',
    tag: 'LIMPIO',
  },
  {
    id: 'ripples',
    name: 'Gotas de Agua (Blur Liquid Ripples)',
    desc: 'Ondas circulares expansivas difuminadas a pantalla completa que se generan con cada golpe de bombo.',
    tag: 'ONDAS KICK',
  },
  {
    id: 'rain',
    name: 'Lluvia Neón Estelar',
    desc: 'Trazos de lluvia vertical en toda la pantalla que aceleran e iluminan su brillo según la energía.',
    tag: 'LLUVIA NEÓN',
  },
  {
    id: 'sand',
    name: 'Arena de Mar (Mareas de Sub-bajo)',
    desc: 'Partículas doradas y cian flotando en corrientes sinusoidales que se desplazan rítmicamente.',
    tag: 'MAREAS CIAN',
  },
  {
    id: 'sunset',
    name: 'Silueta & Atardecer (DHONKIO)',
    desc: 'Atardecer épico con sol rojizo, silueta humana en acantilado y núcleo con texto DHONKIO y barras en ciudad.',
    tag: 'DHONKIO',
  },
  {
    id: 'cyber_city',
    name: 'Silueta Urbana Cyberpunk (Rooftop)',
    desc: 'Rascacielos futuristas con ventanas reactivas al audio, haces de luz y silueta solitaria en la azotea.',
    tag: 'CYBERPUNK',
  },
  {
    id: 'cosmic_voyager',
    name: 'Silueta Viajero Cósmico (Luna Gigante)',
    desc: 'Luna monumental con corona etérea, auroras boreales y silueta de astrónomo contemplando el infinito.',
    tag: 'COSMOS',
  },
];


