import type { VisualizerShape, IVisualShapeConfig } from '../types';

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
 */
export const RAINBOW_VOID_EFFECTS: EffectOption[] = [
  {
    id: 'kaleidoscope',
    name: 'Caleidoscopio Radial',
    desc: '12 prismas de cristal con alas reactivas sensibles a armónicos agudos.',
    tag: 'PRISMAS 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'vortex',
    name: 'Vórtex Hipnótico',
    desc: '3 espirales dobles de luz cuántica succionadas hacia el vacío al compás del bombo.',
    tag: 'ESPIRAL 2D',
    category: 'Efectos Cinéticos',
  },
  {
    id: 'fractal',
    name: 'Flor Fractal Sagrada',
    desc: 'Mándala de geometría sagrada con pétalos poligonales que respiran con los graves.',
    tag: 'MÁNDALA 2D',
    category: 'Geometría Sagrada',
  },
  {
    id: 'nebula',
    name: 'Nebulosa / Aurora Líquida',
    desc: '16 auroras de gas cósmico cromático con flujo turbulento y dispersión atmosférica.',
    tag: 'AURORA 2D',
    category: 'Efectos Atmosféricos',
  },
  {
    id: 'bars',
    name: 'Barras Spectrum Pro',
    desc: 'Ecualizador circular de 64 bandas con decaimiento de picos estilo consola DJ.',
    tag: 'SPECTRUM 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'laser',
    name: 'Rayos Láser Strobe',
    desc: 'Haces cinéticos de alta energía que se disparan en los transitorios de percusión.',
    tag: 'ESTROBO 2D',
    category: 'Efectos Cinéticos',
  },
  {
    id: 'rings',
    name: 'Anillos Concéntricos',
    desc: '5 ondas orbitales circulares que respiran al ritmo del compás.',
    tag: 'ONDAS 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'spikes',
    name: 'Picos Radiales 2D',
    desc: 'Corona de frecuencias que se expande hacia el halo exterior difuminado.',
    tag: 'PICOS 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'cloud',
    name: 'Nube Efervescente',
    desc: 'Partículas flotantes que emergen del núcleo hacia el halo exterior.',
    tag: 'BURBUJAS 2D',
    category: 'Efectos Atmosféricos',
  },
  {
    id: 'torus',
    name: 'Toroide Neón 2D',
    desc: 'Anillo toroidal con rotación de gradiente y grosor modulado por el bajo.',
    tag: 'ANILLO 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'wave',
    name: 'Onda Sinusoidal Perimetral',
    desc: 'Línea de onda senoidal que oscila perimetralmente sobre el halo.',
    tag: 'ONDA 2D',
    category: 'Efectos Radiales',
  },
  {
    id: 'icosahedron',
    name: 'Red Cristalina 2D',
    desc: 'Polígono facetado con acordes diagonales vibrantes al ritmo del compás.',
    tag: 'CRISTAL 2D',
    category: 'Geometría Sagrada',
  },
  {
    id: 'sphere',
    name: 'Núcleo Void Puro',
    desc: 'Diseño minimalista con halo exterior arcoíris difuminado y micro-surcos de vinilo.',
    tag: 'MINIMAL 2D',
    category: 'Geometría Sagrada',
  },
];

