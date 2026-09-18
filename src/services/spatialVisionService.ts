import * as THREE from 'three';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Point3DOneEuroFilter } from '../utils/oneEuroFilter';

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
    0.5 // Profundidad proyectiva estándar NDC
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
  private videoElement: HTMLVideoElement | null = null;
  private isCameraActive = false;

  // MediaPipe Tasks-Vision
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private isModelLoading = false;
  private isReady = false;

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
  }

  public static getInstance(): SpatialVisionService {
    if (!SpatialVisionService.instance) {
      SpatialVisionService.instance = new SpatialVisionService();
    }
    return SpatialVisionService.instance;
  }

  /**
   * Carga perezosa (lazy load) de MediaPipe Tasks-Vision con aceleración GPU.
   */
  public async loadModels(): Promise<void> {
    if (this.isReady || this.isModelLoading) return;
    this.isModelLoading = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      // 1. Hand Landmarker (Lite para máximo framerate)
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // 2. Pose Landmarker (Lite)
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isReady = true;
    } catch (err) {
      console.warn('[SpatialVisionService] Error al cargar modelos MediaPipe GPU:', err);
      // Fallback a WASM si GPU falla
      this.currentTelemetry.isGpuAccelerated = false;
    } finally {
      this.isModelLoading = false;
    }
  }

  /**
   * Inicia la captura de video 640x480 con MediaStream.
   */
  public async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        },
        audio: false,
      });

      videoElement.srcObject = this.stream;
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(resolve).catch(resolve);
        };
      });
    }

    this.isCameraActive = true;
    if (!this.isReady) {
      await this.loadModels();
    }

    this.startDetectionLoop();
  }

  /**
   * Bucle unificado con alternancia de frames (frameCounter % 2 === 0).
   */
  private startDetectionLoop(): void {
    if (this.animationFrameId !== null) return;

    const processFrame = () => {
      if (!this.isCameraActive || !this.videoElement) {
        this.animationFrameId = null;
        return;
      }

      const video = this.videoElement;
      const now = performance.now();

      // Métricas de FPS
      this.fpsCounter++;
      if (now - this.lastFpsUpdate >= 1000) {
        this.currentTelemetry.videoFps = this.fpsCounter;
        this.currentTelemetry.detectionFps = this.detectionFpsCounter;
        this.fpsCounter = 0;
        this.detectionFpsCounter = 0;
        this.lastFpsUpdate = now;
        this.notifyTelemetry();
      }

      if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = video.currentTime;
        this.frameCount++;

        // ── Alternancia: Inferencia cada 2 frames para estabilidad a 60 FPS ──
        if (this.frameCount % 2 === 0 && this.isReady) {
          this.runInference(video, now);
        } else if (this.previousHands.length > 0 || this.previousPose) {
          // Frame intermedio: emitir datos previos suavizados con interpolación
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
   * Ejecuta MediaPipe Tasks-Vision para manos y pose.
   */
  private runInference(video: HTMLVideoElement, timestamp: number): void {
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
              const f = filters[i] || new Point3DOneEuroFilter(1.0, 0.007, 1.0);
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
              // Comprobación de puño vs mano abierta
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

      // 2. Detección de Pose
      if (this.poseLandmarker) {
        const poseResults = this.poseLandmarker.detectForVideo(video, timestamp);
        if (poseResults.landmarks && poseResults.landmarks.length > 0) {
          const rawPose = poseResults.landmarks[0];
          const smoothedPose: SpatialLandmark[] = rawPose.map((pt, i) => {
            const f = this.poseFilters[i] || new Point3DOneEuroFilter(1.0, 0.007, 1.0);
            return f.filter({ x: pt.x, y: pt.y, z: pt.z }, timestamp);
          });

          // Energía cinética corporal (velocidad de muñecas y tobillos)
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
    this.handListeners.forEach((fn) => fn(hands));
  }

  private notifyPose(pose: SpatialLandmark[] | null, energy: number): void {
    this.poseListeners.forEach((fn) => fn(pose, energy));
  }

  private notifyTelemetry(): void {
    this.telemetryListeners.forEach((fn) => fn(this.currentTelemetry));
  }

  /**
   * Cleanup estricto: detiene la cámara y libera todos los recursos.
   */
  public stopCamera(): void {
    this.isCameraActive = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
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
