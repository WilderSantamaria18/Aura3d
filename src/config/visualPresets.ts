import type { VisualizerShape, IVisualShapeConfig, BlobShape, VoidFxSettings, VoidFxParams } from '../types';
import type { BackgroundAtmosphere, KickFormStyle } from '../types/audio';

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
    name: 'Cáusticas Prismáticas',
    description: 'Lente refractiva de cristal líquido con filamentos cáusticos de luz colimada y dispersión de Newton',
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
  cat_ears: {
    id: 'cat_ears',
    name: 'Cresta Dual Paramétrica',
    description: 'Estructura simétrica paramétrica con líneas ultrafinas hairline, rebote elástico Kick y capas Moiré',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  fox_ears: {
    id: 'fox_ears',
    name: 'Agujas Vectoriales',
    description: 'Picos esbeltos convergentes con líneas hairline y micro-nodos radiantes',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  cyber_horns: {
    id: 'cyber_horns',
    name: 'Arcos Hiperbólicos',
    description: 'Arcos curvados simétricos ascendentes con tensión polar y destellos en los vértices',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  valkyrie_wings: {
    id: 'valkyrie_wings',
    name: 'Aletas Aerodinámicas',
    description: 'Aletas laterales simétricas en los flancos con cresta triple y efecto Moiré',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  laser_crown: {
    id: 'laser_crown',
    name: 'Corona Armónica',
    description: 'Diadema geométrica de 4 crestas superiores con precisión matemática',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  dual_crest: {
    id: 'dual_crest',
    name: 'Cresta Dual visionOS',
    description: '2 crestas afiladas simétricas en ángulo cónico con trazo hairline de 1.0px',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  vector_spires: {
    id: 'vector_spires',
    name: 'Agujas Vectoriales',
    description: 'Picos esbeltos de alta tensión polar con micro-nodos radiantes en ápices',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  pulse_antennas: {
    id: 'pulse_antennas',
    name: 'Antenas de Pulso',
    description: 'Doble contorno armónico polar con resonancia de frecuencias medias',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  aero_fins: {
    id: 'aero_fins',
    name: 'Aletas Aerodinámicas',
    description: 'Aletas laterales escalonadas en los flancos con curvatura tangencial',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  apex_prism: {
    id: 'apex_prism',
    name: 'Prisma de Ápice',
    description: 'Crestas triangulares puras inspiradas en aristas de difracción óptica',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  harmonic_crown: {
    id: 'harmonic_crown',
    name: 'Corona Armónica',
    description: 'Crestas cuádruples en cruz simétrica de 90 grados con halo transparente',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  hyperbolic_arcs: {
    id: 'hyperbolic_arcs',
    name: 'Arcos Hiperbólicos',
    description: 'Arcos de barrido polar con deflexión tangencial y tensión de resorte',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  laser_needles: {
    id: 'laser_needles',
    name: 'Agujas Láser Hairline',
    description: 'Agujas radiales ultrafinas de 0.75px con micro-destellos de percusión',
    baseRadius: 1.0,
    pointSize: 4.2,
    baseSpeed: 0.8,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  wave_peaks: {
    id: 'wave_peaks',
    name: 'Halo de Ondas Reactivas',
    description: 'Halo orbital con picos ondulantes que viajan con el ritmo y se expanden con el kick',
    baseRadius: 1.15,
    pointSize: 3.6,
    baseSpeed: 1.2,
    bassReactivity: 1.7,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  cyber_hexagon: {
    id: 'cyber_hexagon',
    name: 'Hexágono Cyber',
    description: 'Polígono hexagonal con cada uno de los 6 lados reactivo a su propia banda FFT',
    baseRadius: 1.05,
    pointSize: 3.2,
    baseSpeed: 0.7,
    bassReactivity: 1.9,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'harmonic',
  },
  octagram_star: {
    id: 'octagram_star',
    name: 'Estrella 8 Puntas',
    description: 'Estrella de 8 puntas con alternancia sinusoidal interior/exterior reactiva',
    baseRadius: 1.10,
    pointSize: 3.8,
    baseSpeed: 0.9,
    bassReactivity: 2.0,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'harmonic',
  },
  phoenix_wings: {
    id: 'phoenix_wings',
    name: 'Alas Fénix',
    description: 'Perfil alar Joukowski asimétrico: ala superior abre con mids, inferior con bajos',
    baseRadius: 1.08,
    pointSize: 3.4,
    baseSpeed: 1.0,
    bassReactivity: 1.8,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  quantum_gyro: {
    id: 'quantum_gyro',
    name: 'Giroscopio Cuántico',
    description: 'Lissajous polar sin(3θ)·cos(2θ): 3 lóbulos giratorios con interferencia Moiré',
    baseRadius: 1.12,
    pointSize: 3.6,
    baseSpeed: 1.1,
    bassReactivity: 1.85,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  lotus_mandala: {
    id: 'lotus_mandala',
    name: 'Mandala Loto',
    description: 'Curva rosa polar k=5 (10 pétalos): se expanden con bajos, rotan con mids',
    baseRadius: 1.10,
    pointSize: 3.0,
    baseSpeed: 0.6,
    bassReactivity: 2.1,
    colorDistribution: 'radial',
    deformationAlgorithm: 'harmonic',
  },
  radar_heartbeat: {
    id: 'radar_heartbeat',
    name: 'Radar EKG',
    description: 'Barrido de radar con complejo QRS gaussiano que late al ritmo de los bajos',
    baseRadius: 1.0,
    pointSize: 2.8,
    baseSpeed: 1.6,
    bassReactivity: 2.2,
    colorDistribution: 'frequency',
    deformationAlgorithm: 'harmonic',
  },
};

export const getVisualShapeConfig = (shape: VisualizerShape): IVisualShapeConfig => {
  return VISUAL_SHAPE_PRESETS[shape] || VISUAL_SHAPE_PRESETS.sphere;
};

export interface EffectOption {
  id: BlobShape;
  name: string;
  desc: string;
  tag: string;
  category: string;
  /** Parámetro propio del efecto (cantidad de elementos), si tiene */
  param?: { label: string; min: number; max: number; step: number; def: number };
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
 * Catálogo de efectos 2D de Rainbow Void.
 * Minimalistas, de trazo fino y una sola paleta: cada uno responde a una parte
 * distinta del audio (graves, medios, agudos o espectro completo).
 */
export const RAINBOW_VOID_EFFECTS: EffectOption[] = [
  {
    id: 'spectrum',
    name: 'Corona Espectral',
    desc: 'Membrana acústica elástica con velo volumétrico, estrías de tensión y cresta de microdetalle.',
    tag: 'CORONA',
    category: 'Contorno del kick',
    param: { label: 'Resolución', min: 48, max: 160, step: 8, def: 96 },
  },
  {
    id: 'wave',
    name: 'Resonancia Líquida',
    desc: 'Manto líquido acústico con ondas de interferencia transversal, cáusticas ópticas y cavidad interior en contrafase.',
    tag: 'RESONANCIA',
    category: 'Contorno del kick',
  },
  {
    id: 'particles',
    name: 'Polvo Estelar',
    desc: 'Vórtice de polvo cósmico y cometas guiados por corrientes de acreción gravitacional con estelas de inercia acústica.',
    tag: 'ESTELAR',
    category: 'Contorno del kick',
    param: { label: 'Partículas', min: 120, max: 420, step: 20, def: 320 },
  },
  {
    id: 'geometry',
    name: 'Celosía Sagrada',
    desc: 'Matriz geométrica de proporciones áureas y celosía multidimensional con nodos de resonancia cromática.',
    tag: 'CELOSÍA',
    category: 'Contorno del kick',
    param: { label: 'Capas', min: 2, max: 4, step: 1, def: 4 },
  },
  {
    id: 'radar',
    name: 'Lente de Eco',
    desc: 'Lente acústica de refracción anamórfica con anillos de difracción de Fresnel y focos de eco cromático.',
    tag: 'LENTE',
    category: 'Contorno del kick',
  },
  {
    id: 'electro',
    name: 'Arco Neural',
    desc: 'Red sináptica bio-luminiscente con axones elásticos, potenciales de acción y disparo de neurotransmisores.',
    tag: 'NEURAL',
    category: 'Contorno del kick',
  },
  {
    id: 'laser',
    name: 'Cáusticas Prismáticas',
    desc: 'Refracciones de luz coherente que se curvan en envolventes cáusticas con dispersión cromática y cámara de reflexión interna.',
    tag: 'CÁUSTICAS',
    category: 'Contorno del kick',
    param: { label: 'Haces', min: 6, max: 24, step: 2, def: 12 },
  },
  {
    id: 'spiro',
    name: 'Espirógrafo',
    desc: 'Curvas guilloché que se funden de un patrón al siguiente con la energía de la música.',
    tag: 'ESPIRÓGRAFO',
    category: 'Contorno del kick',
  },
  {
    id: 'tunnel',
    name: 'Horizonte de Sucesos',
    desc: 'Lente gravitacional relativista con anillos de Einstein, arrastre de marco de Kerr y geodésicas de acreción.',
    tag: 'HORIZONTE',
    category: 'Contorno del kick',
  },
  {
    id: 'hive',
    name: 'Teselación Líquida',
    desc: 'Membrana celular elástica con propagación peristáltica de energía, tensión superficial y vesículas armónicas.',
    tag: 'TESELACIÓN',
    category: 'Contorno del kick',
    param: { label: 'Anillos', min: 2, max: 4, step: 1, def: 3 },
  },
  {
    id: 'spiral',
    name: 'Flujo Dorado',
    desc: 'Corrientes laminares en proporción áurea con bifurcación de plasma, filamentos entrelazados y vórtice interior.',
    tag: 'ÁUREO',
    category: 'Contorno del kick',
    param: { label: 'Brazos', min: 1, max: 4, step: 1, def: 2 },
  },
  {
    id: 'crystal',
    name: 'Cristal',
    desc: 'Esquirlas facetadas e irregulares que siguen el espectro; por dentro, facetas que reaccionan con cada cristal.',
    tag: 'CRISTAL',
    category: 'Contorno del kick',
    param: { label: 'Cristales', min: 4, max: 12, step: 1, def: 7 },
  },
  {
    id: 'fractal',
    name: 'Solo mándala',
    desc: 'La Mándala Sagrada sin contorno: anillos de pétalos que escuchan cada banda.',
    tag: 'MÁNDALA',
    category: 'Base',
    param: { label: 'Anillos', min: 2, max: 6, step: 1, def: 4 },
  },
];

/** Acabado del contorno: neón (trazo + brillo), cristal (translúcido) o tinta (sólido) */
export const KICK_FORM_STYLES: Array<{ id: KickFormStyle; name: string; desc: string }> = [
  { id: 'neon', name: 'Neón', desc: 'Trazo brillante' },
  { id: 'glass', name: 'Cristal', desc: 'Translúcido' },
  { id: 'ink', name: 'Tinta', desc: 'Sólido' },
];

export const DEFAULT_VOID_EFFECT: BlobShape = 'spectrum';

/** Valores por defecto de la personalización de efectos */
export const DEFAULT_VOID_FX_SETTINGS: VoidFxSettings = {
  intensity: 1,
  reach: 1,
  glow: 1,
  inner: true,
  mandala: true,
  shockwave: false,
  colorMode: 'palette',
  counts: {},
  formStyle: 'neon',
  formScale: 1.15,
};

/** Combina la personalización guardada con los valores por defecto para un efecto concreto */
export const resolveVoidFx = (settings: Partial<VoidFxSettings> | undefined, id: BlobShape): VoidFxParams => {
  const merged = { ...DEFAULT_VOID_FX_SETTINGS, ...settings };
  const meta = RAINBOW_VOID_EFFECTS.find((fx) => fx.id === id)?.param;
  const raw = merged.counts?.[id as string] ?? meta?.def ?? 1;
  const count = meta ? Math.max(meta.min, Math.min(meta.max, raw)) : raw;
  return {
    intensity: merged.intensity,
    reach: merged.reach,
    glow: merged.glow,
    inner: merged.inner,
    boom: merged.shockwave,
    colorMode: merged.colorMode,
    count,
    mandala: merged.mandala !== false,
    formStyle: merged.formStyle,
    formScale: merged.formScale,
  };
};

/**
 * Los presets antiguos guardan formas que ya no existen en Rainbow Void.
 * Cada una se traduce al efecto nuevo más parecido en carácter.
 */
const LEGACY_SHAPE_TO_VOID: Record<string, BlobShape> = {
  icosahedron: 'crystal',
  octahedron: 'crystal',
  nebula: 'particles',
  wave: 'wave',
  rings: 'geometry',
  torus: 'geometry',
  cloud: 'particles',
  spikes: 'spectrum',
  bars: 'spectrum',
  laser: 'electro',
  sphere: 'spectrum',
  vortex: 'particles',
  kaleidoscope: 'geometry',
};

/**
 * Las formas del contorno anteriores (gato, conejo, cuernos, corona, flama, alas, notas, púas) se
 * reemplazaron por las nuevas. Lo guardado con un id antiguo pasa a la forma más parecida en carácter.
 */
export const LEGACY_VOID_EFFECT_RENAMES: Record<string, BlobShape> = {
  // Primera generación (gato, conejo, cuernos…)
  cat: 'crystal',
  bunny: 'wave',
  horns: 'crystal',
  crown: 'spectrum',
  flame: 'electro',
  wings: 'particles',
  notes: 'radar',
  spikes: 'spectrum',
  // Segunda generación (reemplazada por el rediseño profesional)
  sun: 'spectrum',
  galaxy: 'particles',
  orbits: 'geometry',
  storm: 'electro',
  ribbon: 'wave',
  constellation: 'radar',
  tides: 'wave',
};

/** Presets de fábrica cuyo nombre pide un contorno concreto */
const PRESET_EFFECT_OVERRIDES: Record<string, BlobShape> = {
  factory_ethereal_aurora: 'wave',
  factory_zenith_tidal_ripples: 'radar',
  factory_retro_synthwave: 'spectrum',
  factory_crimson_blood_horizon: 'electro',
  factory_midnight_cyber_rain: 'geometry',
  factory_rainbow_void: 'spectrum',
};

/** Efecto de Rainbow Void que corresponde a un preset (propio o guardado por el usuario) */
export const voidEffectForPreset = (preset: { id?: string; visualizerShape: string }): BlobShape => {
  if (preset.id && PRESET_EFFECT_OVERRIDES[preset.id]) return PRESET_EFFECT_OVERRIDES[preset.id];
  if (isVoidEffectId(preset.visualizerShape)) return preset.visualizerShape;
  return LEGACY_SHAPE_TO_VOID[preset.visualizerShape] ?? DEFAULT_VOID_EFFECT;
};

/** true si el id pertenece al catálogo actual de Rainbow Void (descarta ids antiguos guardados) */
export const isVoidEffectId = (id: unknown): id is BlobShape =>
  typeof id === 'string' && RAINBOW_VOID_EFFECTS.some((fx) => fx.id === id);

/** Devuelve un efecto válido: el mismo si existe, su reemplazo si era una forma antigua, o el efecto por defecto */
export const migrateVoidEffectId = (id: unknown): BlobShape => {
  if (isVoidEffectId(id)) return id;
  if (typeof id === 'string') {
    return LEGACY_VOID_EFFECT_RENAMES[id] ?? LEGACY_SHAPE_TO_VOID[id] ?? DEFAULT_VOID_EFFECT;
  }
  return DEFAULT_VOID_EFFECT;
};

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
    name: 'Fondo Limpio Zen (Desactivado)',
    desc: 'Negro abisal puro sin velos ni interferencias visuales.',
    tag: 'LIMPIO',
  },
  {
    id: 'sunset',
    name: 'Atardecer & Acantilado (DHONKIO)',
    desc: 'Atardecer épico con sol pulsante, silueta de acantilado y chispas flotantes.',
    tag: 'ATARDECER',
  },
  {
    id: 'rain',
    name: 'Lluvia Neón Estelar',
    desc: 'Trazos de lluvia vertical que aceleran con la energía musical.',
    tag: 'LLUVIA',
  },
  {
    id: 'sand',
    name: 'Arena de Mar (Mareas Sub)',
    desc: 'Partículas doradas y cian en corrientes sinusoidales al ritmo de sub-bajos.',
    tag: 'ARENA',
  },
  {
    id: 'stars',
    name: 'Estrellas 3D (Warp Speed)',
    desc: 'Vuelo a velocidad hiperespacial con campo estelar tridimensional reactivo.',
    tag: 'ESTRELLAS',
  },
  {
    id: 'radial_burst',
    name: 'Partículas del Núcleo (Estallido Radial)',
    desc: 'Partículas cristalinas y chispas que emergen del centro y viajan hacia afuera reactivas al bombo.',
    tag: 'ESTALLIDO',
  },
  {
    id: 'stardust_drift',
    name: 'Polvo Cósmico (Bruma Estelar)',
    desc: 'Micro-polvo estelar flotando suavemente en espirales concéntricas zen.',
    tag: 'POLVO CÓSMICO',
  },
  {
    id: 'light_beams',
    name: 'Haces Radiantes (Rayos Zen)',
    desc: 'Haces de luz volumétrica suave que emanan desde el centro con rotación armónica.',
    tag: 'HACES LUZ',
  },
  {
    id: 'quantum_waves',
    name: 'Ondas Cuánticas (Anillos Concéntricos)',
    desc: 'Anillos concéntricos ultrafinos que se expanden hacia los bordes en cada golpe de bajo.',
    tag: 'ONDAS',
  },
];


