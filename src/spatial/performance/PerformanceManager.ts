export type SpatialPerformanceTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type SpatialQualityMode = 'auto' | SpatialPerformanceTier;
export type GpuClass = 'integrated' | 'discrete' | 'unknown';

const DISCRETE_GPU = /nvidia|geforce|quadro|rtx|gtx|radeon(\(tm\))?\s*(rx|pro)|arc\s*[ab]\d/i;
const INTEGRATED_GPU =
  /intel|uhd|iris|hd graphics|radeon(\(tm\))?\s*(r\d|vega|graphics)|apple|mali|adreno|powervr|swiftshader|llvmpipe|software/i;

/** Clasifica la GPU a partir del string UNMASKED_RENDERER de WebGL (función pura, testeable). */
export function classifyGpuRenderer(renderer: string): GpuClass {
  if (!renderer) return 'unknown';
  if (DISCRETE_GPU.test(renderer)) return 'discrete';
  if (INTEGRATED_GPU.test(renderer)) return 'integrated';
  return 'unknown';
}

function detectGpuClass(): GpuClass {
  if (typeof document === 'undefined') return 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'unknown';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return classifyGpuRenderer(renderer);
  } catch {
    return 'unknown';
  }
}

export interface PerformanceFeatureFlags {
  adaptiveQualityEnabled: boolean;
  enablePoseTracking: boolean;
  targetFps: number;
  degradationFloorFps: number;
}

export interface PerformanceMetrics {
  currentTier: SpatialPerformanceTier;
  fps: number;
  frameTimeMs: number;
  particleBudget: number;
  maxTrackedHands: number;
  postFxLevel: 'none' | 'bloom-half' | 'bloom-dof';
  cameraResolution: { width: number; height: number };
  minInferenceIntervalMs: number;
  dpr: number;
  gpuClass: GpuClass;
  /** GPU integrada: MediaPipe en CPU evita competir con el render por la misma GPU */
  preferCpuVision: boolean;
  qualityMode: SpatialQualityMode;
  flags: PerformanceFeatureFlags;
}

/**
 * PerformanceManager — Gestor adaptativo de rendimiento para Aura Spatial (Sprint 10).
 *
 * Especificación de Sección 6 de DESING_DECAMARA.md y DESING_CAMARA_IMPORTANT.md:
 * - Target: 60 FPS
 * - Degradation floor: 30 FPS
 * - Histéresis temporal:
 *   - Si frameTime > 20 ms durante 2 s -> bajar un nivel.
 *   - Si frameTime < 12 ms durante 5 s -> subir un nivel.
 */
export class PerformanceManager {
  private static instance: PerformanceManager | null = null;

  private currentTier: SpatialPerformanceTier = 'MEDIUM';
  private gpuClass: GpuClass = 'unknown';
  private qualityMode: SpatialQualityMode = 'auto';
  private frameTimes: number[] = [];
  private avgFrameTime = 16.6;
  private currentFps = 60;

  // Feature Flags & Rollout
  private flags: PerformanceFeatureFlags = {
    adaptiveQualityEnabled: true,
    enablePoseTracking: false,
    targetFps: 60,
    degradationFloorFps: 30,
  };

  // Temporizadores para histéresis
  private highLatencyStartTime = 0;
  private lowLatencyStartTime = 0;

  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set();

  private constructor() {
    this.detectInitialHardware();
  }

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Detección heurística inicial según hardware (GPU móvil vs dedicada)
   */
  private detectInitialHardware(): void {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

    this.gpuClass = detectGpuClass();

    if (isMobile || cores <= 4) {
      this.currentTier = 'LOW';
    } else if (this.gpuClass === 'integrated') {
      // GPU integrada: arrancar equilibrado; nunca HIGH de forma automática
      this.currentTier = 'MEDIUM';
    } else if (cores >= 8) {
      this.currentTier = 'HIGH';
    } else {
      this.currentTier = 'MEDIUM';
    }
  }

  /** En modo auto, una GPU integrada no sube de MEDIUM (HIGH solo se elige a mano) */
  private get autoMaxTier(): SpatialPerformanceTier {
    return this.gpuClass === 'integrated' ? 'MEDIUM' : 'HIGH';
  }

  /**
   * Registro de tiempo por frame llamado desde el render loop de Three.js (Zero allocations)
   */
  public recordFrame(deltaSeconds: number, nowMs: number): void {
    const frameTimeMs = deltaSeconds * 1000;
    this.avgFrameTime = this.avgFrameTime * 0.9 + frameTimeMs * 0.1;
    this.currentFps = Math.round(1000 / Math.max(1, this.avgFrameTime));

    if (!this.flags.adaptiveQualityEnabled) return;

    // ── 1. Comprobar Degradación (frameTime > 20 ms durante 2 s) ───────────────
    if (this.avgFrameTime > 20.0) {
      if (this.highLatencyStartTime === 0) {
        this.highLatencyStartTime = nowMs;
      } else if (nowMs - this.highLatencyStartTime >= 2000) {
        this.stepDown();
        this.highLatencyStartTime = 0;
      }
    } else {
      this.highLatencyStartTime = 0;
    }

    // ── 2. Comprobar Promoción (frameTime < 12 ms durante 5 s) ─────────────────
    if (this.avgFrameTime < 12.0) {
      if (this.lowLatencyStartTime === 0) {
        this.lowLatencyStartTime = nowMs;
      } else if (nowMs - this.lowLatencyStartTime >= 5000) {
        this.stepUp();
        this.lowLatencyStartTime = 0;
      }
    } else {
      this.lowLatencyStartTime = 0;
    }
  }

  private stepDown(): void {
    if (this.currentTier === 'HIGH') {
      this.setTier('MEDIUM');
    } else if (this.currentTier === 'MEDIUM') {
      this.setTier('LOW');
    }
  }

  private stepUp(): void {
    if (this.currentTier === 'LOW') {
      this.setTier('MEDIUM');
    } else if (this.currentTier === 'MEDIUM' && this.autoMaxTier === 'HIGH') {
      this.setTier('HIGH');
    }
  }

  /**
   * Modo de calidad elegido por el usuario: 'auto' deja actuar la histéresis;
   * un tier fijo desactiva la adaptación automática.
   */
  public setQualityMode(mode: SpatialQualityMode): void {
    this.qualityMode = mode;
    if (mode === 'auto') {
      this.flags.adaptiveQualityEnabled = true;
      this.highLatencyStartTime = 0;
      this.lowLatencyStartTime = 0;
      this.notifyListeners();
      return;
    }
    this.flags.adaptiveQualityEnabled = false;
    this.currentTier = mode;
    this.notifyListeners();
  }

  public getQualityMode(): SpatialQualityMode {
    return this.qualityMode;
  }

  public getGpuClass(): GpuClass {
    return this.gpuClass;
  }

  public setTier(tier: SpatialPerformanceTier): void {
    if (this.currentTier !== tier) {
      this.currentTier = tier;
      this.notifyListeners();
    }
  }

  public getTier(): SpatialPerformanceTier {
    return this.currentTier;
  }

  public setAdaptiveQuality(enabled: boolean): void {
    this.flags.adaptiveQualityEnabled = enabled;
    this.notifyListeners();
  }

  public setPoseTracking(enabled: boolean): void {
    this.flags.enablePoseTracking = enabled;
    this.notifyListeners();
  }

  public getFeatureFlags(): PerformanceFeatureFlags {
    return { ...this.flags };
  }

  public getMetrics(): PerformanceMetrics {
    const isLow = this.currentTier === 'LOW';
    const isHigh = this.currentTier === 'HIGH';

    return {
      currentTier: this.currentTier,
      fps: this.currentFps,
      frameTimeMs: Math.round(this.avgFrameTime * 10) / 10,
      particleBudget: isLow ? 700 : isHigh ? 3600 : 1600,
      maxTrackedHands: isLow ? 1 : 2,
      postFxLevel: isLow ? 'none' : isHigh ? 'bloom-dof' : 'bloom-half',
      cameraResolution: isLow ? { width: 480, height: 360 } : { width: 640, height: 480 },
      minInferenceIntervalMs: isLow ? 66 : isHigh ? 33 : 45, // 15 fps vs 22 fps vs 30 fps
      dpr: isLow ? 0.85 : isHigh ? 1.4 : 1.0,
      gpuClass: this.gpuClass,
      preferCpuVision: this.gpuClass === 'integrated' && !isHigh,
      qualityMode: this.qualityMode,
      flags: { ...this.flags },
    };
  }

  public subscribe(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach((fn) => fn(metrics));
  }
}
