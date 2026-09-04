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
