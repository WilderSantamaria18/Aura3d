import type {
  VisualizerMode,
  VisualizerShape,
  WaveEffectMode,
  BlobCustomSettings,
  BackgroundAtmosphere,
} from './audio';

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  author?: string;
  createdAt: number;
  isFactory?: boolean;
  tags: string[];

  // Visualizer settings
  visualizerMode: VisualizerMode;
  visualizerShape: VisualizerShape;
  waveEffectMode: WaveEffectMode;
  waveEffectIntensity: number;
  bassBoomThreshold: number;
  bassBoomIntensity: number;

  // Lucid Theme & Color
  isLucid: boolean;
  lucidPrimaryColor: string;
  lucidSecondaryColor: string;

  // 3D / Blob Scale & Opacity
  sphereScale: number;
  sphereOpacity: number;
  blobScale?: number;

  // Audio sensitivity & Speed
  musicSensitivity: number;
  audioSpeed: number;

  // Dynamic Scene Atmosphere & Custom details
  backgroundAtmosphere?: BackgroundAtmosphere;
  blobSettings?: BlobCustomSettings;
}
