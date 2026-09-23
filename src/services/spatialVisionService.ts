import * as THREE from 'three';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Point3DOneEuroFilter } from '../utils/oneEuroFilter';
import { GestureEngine } from '../spatial/gestures/GestureEngine';
import { SpatialState } from '../spatial/state/SpatialState';
import { WakeLockController } from '../spatial/camera/WakeLockController';
import { PerformanceManager } from '../spatial/performance/PerformanceManager';

export interface SpatialLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandTrackingResult {
  landmarks: SpatialLandmark[];
  handedness: 'Left' | 'Right' | 'Unknown';
  gesture: 'fist' | 'pinch' | 'open' | 'pointing' | 'peace' | 'unknown';
  pinchDistance: number;
  indexVelocity: number; // Pixels / seg normalizado
}

export interface VisionTelemetry {
  videoFps: number;
  detectionFps: number;
  latencyMs: number;
  isGpuAccelerated: boolean;
}

export type HandUpdateListener = (hands: HandTrackingResult[]) => void;
export type PoseUpdateListener = (landmarks: SpatialLandmark[] | null, kineticEnergy: number) => void;
export type TelemetryListener = (stats: VisionTelemetry) => void;

// ── Vectores reutilizables para CERO Garbage Collection en bucle de render ────
const _ndcVec = new THREE.Vector3();

export function projectLandmarkToWorld(
  landmark: { x: number; y: number; z: number },
  camera: THREE.PerspectiveCamera,
  targetDistance: number,
  out: THREE.Vector3
): THREE.Vector3 {
  // Modo espejo horizontal: X invertido
  _ndcVec.set(
    -(landmark.x * 2 - 1),
    -(landmark.y * 2 - 1),
    0.5
  );
  _ndcVec.unproject(camera);
  _ndcVec.sub(camera.position).normalize();
  out.copy(camera.position).addScaledVector(_ndcVec, targetDistance);
  return out;
}

export class SpatialVisionService {
  private static instance: SpatialVisionService | null = null;

  // WebCam Stream & Element
  private stream: MediaStream | null = null;
  private internalVideo: HTMLVideoElement | null = null;
  private previewVideo: HTMLVideoElement | null = null;
  private isCameraActive = false;

  // MediaPipe Tasks-Vision
  private visionResolver: any = null;
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private isModelLoading = false;
  private isReady = false;
  private isInferenceRunning = false;

  // Smoothing & Filtering
  private handFilters: Map<string, Point3DOneEuroFilter[]> = new Map();
  private poseFilters: Point3DOneEuroFilter[] = [];

  // Frame skipping & Timing
  private animationFrameId: number | null = null;
  private frameCount = 0;
  private lastVideoTime = -1;
  private lastInferenceTime = 0;
  private previousHands: HandTrackingResult[] = [];
  private previousPose: SpatialLandmark[] | null = null;
  private previousTipPositions: { x: number; y: number; t: number }[] = [];

  // Telemetry metrics
  private fpsCounter = 0;
  private lastFpsUpdate = 0;
  private detectionFpsCounter = 0;
  private currentTelemetry: VisionTelemetry = {
    videoFps: 0,
    detectionFps: 0,
    latencyMs: 0,
    isGpuAccelerated: true,
  };

  // Subscriptores
  private handListeners: Set<HandUpdateListener> = new Set();
  private poseListeners: Set<PoseUpdateListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();

  private constructor() {
    // Inicializar filtros para landmarks de pose (33 puntos)
    for (let i = 0; i < 33; i++) {
      this.poseFilters.push(new Point3DOneEuroFilter(1.0, 0.007, 1.0));
    }

    // Pausar/reanudar procesamiento según la visibilidad de la pestaña (ahorro de batería/GPU)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isCameraActive) {
          if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }
        } else if (!document.hidden && this.isCameraActive) {
          this.startDetectionLoop();
        }
      });
    }
  }

  public static getInstance(): SpatialVisionService {
    if (!SpatialVisionService.instance) {
      SpatialVisionService.instance = new SpatialVisionService();
    }
    return SpatialVisionService.instance;
  }

  /**
   * Carga de MediaPipe Tasks-Vision con aceleración GPU y Fallback a CPU (WASM).
   */
  public async loadModels(): Promise<void> {
    if (this.isReady || this.isModelLoading) return;
    this.isModelLoading = true;

    try {
      if (!this.visionResolver) {
        this.visionResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
      }

      const perfMetrics = PerformanceManager.getInstance().getMetrics();
      const numHands = perfMetrics.maxTrackedHands;

      // 1. Intentar Hand Landmarker con acelerador GPU
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(this.visionResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.currentTelemetry.isGpuAccelerated = true;
      } catch (gpuErr) {
        console.warn('[SpatialVisionService] Delegate GPU falló; reintentando con fallback CPU/WASM:', gpuErr);
        // Fallback a CPU (WASM) para garantizar que SIEMPRE funcione
        this.handLandmarker = await HandLandmarker.createFromOptions(this.visionResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1, // CPU: optimizar a 1 mano para evitar caídas de FPS
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        this.currentTelemetry.isGpuAccelerated = false;
      }

      // 2. Pose Landmarker: Cargar perezosamente solo si está habilitado en PerformanceManager
      if (perfMetrics.flags.enablePoseTracking) {
        await this.loadPoseModel();
      }

      this.isReady = true;
    } catch (err) {
      console.error('[SpatialVisionService] Error fatal al inicializar MediaPipe:', err);
      this.isReady = false;
    } finally {
      this.isModelLoading = false;
    }
  }

  /**
   * Carga de Pose Landmarker bajo demanda para evitar descargas pesadas innecesarias
   */
  public async loadPoseModel(): Promise<void> {
    if (this.poseLandmarker || !this.visionResolver) return;

    try {
      this.poseLandmarker = await PoseLandmarker.createFromOptions(this.visionResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: this.currentTelemetry.isGpuAccelerated ? 'GPU' : 'CPU',
        },
        runningMode: 'VIDEO',
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (err) {
      console.warn('[SpatialVisionService] No se pudo cargar PoseLandmarker opcional:', err);
    }
  }

  /**
   * Obtiene el stream activo de la cámara
   */
  public getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Enlaza un elemento HTMLVideoElement de preview (como el de CameraStudioPanel)
   */
  public attachPreview(videoElement: HTMLVideoElement | null): void {
    this.previewVideo = videoElement;
    if (videoElement && this.stream) {
      videoElement.srcObject = this.stream;
      videoElement.play().catch(() => {});
    }
  }

  /**
   * Inicia la captura de video y tracking espacial.
   */
  public async startCamera(previewElement?: HTMLVideoElement): Promise<void> {
    if (previewElement) {
      this.previewVideo = previewElement;
    }

    if (!this.internalVideo && typeof document !== 'undefined') {
      const v = document.createElement('video');
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      v.muted = true;
      v.autoplay = true;
      v.style.display = 'none';
      v.style.position = 'fixed';
      v.style.pointerEvents = 'none';
      document.body.appendChild(v);
      this.internalVideo = v;
    }

    if (!this.stream) {
      const perfTier = PerformanceManager.getInstance().getTier();
      const res = perfTier === 'LOW' ? { width: 480, height: 360 } : { width: 640, height: 480 };

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: res.width },
          height: { ideal: res.height },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (this.internalVideo) {
        this.internalVideo.srcObject = this.stream;
        if (this.internalVideo.readyState >= 1) {
          await this.internalVideo.play().catch(() => {});
        } else {
          await new Promise<void>((resolve) => {
            let done = false;
            const onReady = () => {
              if (done) return;
              done = true;
              this.internalVideo?.play().then(resolve).catch(resolve);
            };
            this.internalVideo!.onloadedmetadata = onReady;
            this.internalVideo!.oncanplay = onReady;
            setTimeout(onReady, 2500);
          });
        }
      }

      if (this.previewVideo) {
        this.previewVideo.srcObject = this.stream;
        this.previewVideo.play().catch(() => {});
      }
    }

    this.isCameraActive = true;
    SpatialState.getInstance().setCameraRunning(true);
    WakeLockController.getInstance().requestLock();

    if (!this.isReady) {
      await this.loadModels();
    }

    this.startDetectionLoop();
  }

  /**
   * Bucle unificado con inferencia adaptativa regulada por PerformanceManager.
   */
  private startDetectionLoop(): void {
    if (this.animationFrameId !== null) return;

    const processFrame = () => {
      if (!this.isCameraActive || !this.internalVideo) {
        this.animationFrameId = null;
        return;
      }

      const video = this.internalVideo;
      const now = performance.now();

      // Métricas de FPS del video
      this.fpsCounter++;
      if (now - this.lastFpsUpdate >= 1000) {
        this.currentTelemetry.videoFps = this.fpsCounter;
        this.currentTelemetry.detectionFps = this.detectionFpsCounter;
        this.fpsCounter = 0;
        this.detectionFpsCounter = 0;
        this.lastFpsUpdate = now;
        this.notifyTelemetry();
      }

      const isFrameNew = video.readyState >= 2 && video.currentTime !== this.lastVideoTime;
      if (isFrameNew) {
        this.lastVideoTime = video.currentTime;
        this.frameCount++;

        const perfMetrics = PerformanceManager.getInstance().getMetrics();
        const minInterval = perfMetrics.minInferenceIntervalMs;
        const timeSinceLastInference = now - this.lastInferenceTime;

        // Inferencia throttled según el tier de rendimiento
        if (timeSinceLastInference >= minInterval && this.isReady && !this.isInferenceRunning) {
          this.lastInferenceTime = now;
          this.runInference(video, now);
        } else if (this.previousHands.length > 0 || this.previousPose) {
          // Frame intermedio: emitir predicciones suavizadas a 60 FPS sin esperar a MediaPipe
          this.notifyHands(this.previousHands);
          if (this.previousPose) {
            this.notifyPose(this.previousPose, 0);
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  /**
   * Ejecuta MediaPipe Tasks-Vision para manos y opcionalmente pose.
   */
  private runInference(video: HTMLVideoElement, timestamp: number): void {
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    this.isInferenceRunning = true;
    const tStart = performance.now();

    try {
      // 1. Detección de Manos
      if (this.handLandmarker) {
        const handResults = this.handLandmarker.detectForVideo(video, timestamp);
        const hands: HandTrackingResult[] = [];

        if (handResults.landmarks && handResults.landmarks.length > 0) {
          handResults.landmarks.forEach((rawPoints, handIdx) => {
            const handKey = `hand_${handIdx}`;
            let filters = this.handFilters.get(handKey);
            if (!filters) {
              filters = [];
              for (let i = 0; i < 21; i++) {
                filters.push(new Point3DOneEuroFilter(1.0, 0.007, 1.0));
              }
              this.handFilters.set(handKey, filters);
            }

            // Filtrado One-Euro
            const smoothed: SpatialLandmark[] = rawPoints.map((pt, i) => {
              const f = filters![i] || new Point3DOneEuroFilter(1.0, 0.007, 1.0);
              return f.filter({ x: pt.x, y: pt.y, z: pt.z }, timestamp);
            });

            // Gesto y pinch
            const thumbTip = smoothed[4];
            const indexTip = smoothed[8];
            const middleTip = smoothed[12];
            const wrist = smoothed[0];

            const pinchDist = Math.hypot(
              thumbTip.x - indexTip.x,
              thumbTip.y - indexTip.y,
              thumbTip.z - indexTip.z
            );

            // Medición de velocidad del índice
            let indexVelocity = 0;
            const prevTip = this.previousTipPositions[handIdx];
            if (prevTip) {
              const dt = Math.max(0.001, (timestamp - prevTip.t) / 1000);
              const dist = Math.hypot(indexTip.x - prevTip.x, indexTip.y - prevTip.y);
              indexVelocity = dist / dt;
            }
            this.previousTipPositions[handIdx] = { x: indexTip.x, y: indexTip.y, t: timestamp };

            // Clasificación de Gesto
            let gesture: HandTrackingResult['gesture'] = 'unknown';
            if (pinchDist < 0.045) {
              gesture = 'pinch';
            } else {
              const dIndexWrist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
              const dMiddleWrist = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
              if (dIndexWrist < 0.22 && dMiddleWrist < 0.22) {
                gesture = 'fist';
              } else if (dIndexWrist > 0.35 && dMiddleWrist > 0.35) {
                gesture = 'open';
              } else if (dIndexWrist > 0.32 && dMiddleWrist < 0.25) {
                gesture = 'pointing';
              }
            }

            const handednessStr =
              handResults.handedness?.[handIdx]?.[0]?.categoryName || 'Unknown';

            hands.push({
              landmarks: smoothed,
              handedness: handednessStr as 'Left' | 'Right' | 'Unknown',
              gesture,
              pinchDistance: pinchDist,
              indexVelocity,
            });
          });
        }

        this.previousHands = hands;
        this.notifyHands(hands);
      }

      // 2. Detección de Pose (Solo si está habilitado expresamente)
      const enablePose = PerformanceManager.getInstance().getFeatureFlags().enablePoseTracking;
      if (enablePose && this.poseLandmarker) {
        const poseResults = this.poseLandmarker.detectForVideo(video, timestamp);
        if (poseResults.landmarks && poseResults.landmarks.length > 0) {
          const rawPose = poseResults.landmarks[0];
          const smoothedPose: SpatialLandmark[] = rawPose.map((pt, i) => {
            const f = this.poseFilters[i] || new Point3DOneEuroFilter(1.0, 0.007, 1.0);
            return f.filter({ x: pt.x, y: pt.y, z: pt.z }, timestamp);
          });

          let kineticEnergy = 0;
          if (this.previousPose) {
            const indicesToCheck = [15, 16, 27, 28]; // Muñecas y tobillos
            indicesToCheck.forEach((idx) => {
              if (smoothedPose[idx] && this.previousPose![idx]) {
                const d = Math.hypot(
                  smoothedPose[idx].x - this.previousPose![idx].x,
                  smoothedPose[idx].y - this.previousPose![idx].y
                );
                kineticEnergy += d;
              }
            });
          }

          this.previousPose = smoothedPose;
          this.notifyPose(smoothedPose, kineticEnergy);
        } else {
          this.previousPose = null;
          this.notifyPose(null, 0);
        }
      }

      this.detectionFpsCounter++;
      this.currentTelemetry.latencyMs = Math.round(performance.now() - tStart);
    } catch {
      // Frame omitido sin bloquear el hilo principal
    } finally {
      this.isInferenceRunning = false;
    }
  }

  // ── Suscripciones ──────────────────────────────────────────────────────────
  public subscribeHands(listener: HandUpdateListener): () => void {
    this.handListeners.add(listener);
    return () => this.handListeners.delete(listener);
  }

  public subscribePose(listener: PoseUpdateListener): () => void {
    this.poseListeners.add(listener);
    return () => this.poseListeners.delete(listener);
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  private notifyHands(hands: HandTrackingResult[]): void {
    // Pipeline Desacoplado: Tracker -> GestureEngine -> SpatialState
    GestureEngine.getInstance().processTracking(hands, performance.now());
    this.handListeners.forEach((fn) => fn(hands));
  }

  private notifyPose(pose: SpatialLandmark[] | null, energy: number): void {
    this.poseListeners.forEach((fn) => fn(pose, energy));
  }

  private notifyTelemetry(): void {
    this.telemetryListeners.forEach((fn) => fn(this.currentTelemetry));
  }

  /**
   * Detiene la cámara y libera todos los recursos de stream y video.
   */
  public stopCamera(): void {
    this.isCameraActive = false;
    SpatialState.getInstance().setCameraRunning(false);
    SpatialState.getInstance().resetHands();
    WakeLockController.getInstance().releaseLock();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.internalVideo) {
      this.internalVideo.srcObject = null;
      if (this.internalVideo.parentNode) {
        this.internalVideo.parentNode.removeChild(this.internalVideo);
      }
      this.internalVideo = null;
    }

    if (this.previewVideo) {
      this.previewVideo.srcObject = null;
      this.previewVideo = null;
    }

    this.previousHands = [];
    this.previousPose = null;
    this.handFilters.forEach((filters) => filters.forEach((f) => f.reset()));
    this.poseFilters.forEach((f) => f.reset());
  }

  public destroy(): void {
    this.stopCamera();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.isReady = false;
  }
}
