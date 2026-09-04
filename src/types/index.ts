/**
 * Core Type Definitions for Aura3D
 * Strict domain typing for Audio DSP, 3D Visualizer, VR Hand Tracking, and Device Capabilities
 */

import type { VisualizerShape, WaveEffectMode } from './audio';
export * from './audio';

export interface IAudioData {
  raw: Uint8Array;
  bass: number;          // 20Hz - 250Hz normalized [0..1]
  subBass: number;       // 20Hz - 80Hz normalized [0..1]
  mid: number;           // 250Hz - 4kHz normalized [0..1]
  treble: number;        // 4kHz - 16kHz normalized [0..1]
  intensity: number;     // RMS dynamic energy [0..1]
  isBeat: boolean;       // Transient kick drop flag
  beatPulse: number;     // Decay envelope [0..1]
}

export interface IVisualizerState {
  shape: VisualizerShape;
  waveMode: WaveEffectMode;
  radius: number;
  sensitivity: number;
  particleDensity: number;
  speed: number;
  bloomIntensity: number;
  autoMode: boolean;
}

export type GestureType = 'fist' | 'one' | 'open' | 'pinch' | 'thumbs_up' | 'peace' | 'none';

export interface IGestureLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface IGestureEvent {
  type: GestureType;
  confidence: number;
  handedness: 'left' | 'right' | 'unknown';
  normalizedCenter: { x: number; y: number };
  delta: { x: number; y: number };
  timestamp: number;
}

export interface IDeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  maxDpr: number;
  particleCount: number;
  waveParticleCount: number;
  fftBarCount: number;
  enableShadows: boolean;
  enableHeavyBlur: boolean;
  hardwareConcurrency: number;
}

export interface IVisualShapeConfig {
  id: VisualizerShape;
  name: string;
  description: string;
  baseRadius: number;
  pointSize: number;
  baseSpeed: number;
  bassReactivity: number;
  colorDistribution: 'concentric' | 'frequency' | 'radial' | 'uniform';
  deformationAlgorithm: 'harmonic' | 'spikes' | 'orbital' | 'turbulent' | 'toroidal';
}
