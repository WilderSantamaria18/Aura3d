import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useVisualizer } from '../../hooks/useVisualizer';
import { X, Eye, EyeOff, Sliders, Activity, Zap, Flame, RefreshCw } from 'lucide-react';

// ── MediaPipe Pose 33-point Connections (Bones) ──────────────────────────────
const POSE_CONNECTIONS: [number, number][] = [
  // Head / Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left Arm (Bass Reactive - Pink / Magenta)
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right Arm (Treble Reactive - Cyan / Blue)
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left Leg (Kick Reactive)
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right Leg (Kick Reactive)
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export const PoseTracker: React.FC = () => {
  const {
    vrMode,
    setVrMode,
    setPoseLandmarks,
    setPoseKeypoints,
    setHandRotation,
    setSphereOpacity,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.2);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [danceEnergy, setDanceEnergy] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  const prevLandmarksRef = useRef<{ x: number; y: number }[]>([]);
  const lastProcessTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // ── Dance velocity & interaction calculation ──────────────────────────────
  const handlePoseResults = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (results: any) => {
      const landmarks = results.poseLandmarks;
      if (!landmarks || landmarks.length < 33) {
        setPoseLandmarks(null);
        return;
      }

      setPoseLandmarks(landmarks);

      const now = performance.now();
      // 30 FPS Throttling for MediaPipe processing
      if (now - lastProcessTimeRef.current < 32) return;
      lastProcessTimeRef.current = now;

      // Key Joints
      const head = landmarks[0];
      const rightWrist = landmarks[16];
      const leftWrist = landmarks[15];

      // 1. Calculate Dance Velocity across key limb landmarks
      let totalDisplacement = 0;
      const trackedIndices = [0, 11, 12, 15, 16, 23, 24, 27, 28];

      if (prevLandmarksRef.current.length === 33) {
        trackedIndices.forEach((idx) => {
          const curr = landmarks[idx];
          const prev = prevLandmarksRef.current[idx];
          if (curr && prev) {
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            totalDisplacement += Math.sqrt(dx * dx + dy * dy);
          }
        });
      }

      prevLandmarksRef.current = landmarks.map((l: { x: number; y: number }) => ({ x: l.x, y: l.y }));

      // Normalized dance energy [0..2.5]
      const velocity = Math.min(2.5, totalDisplacement * 18);
      setDanceEnergy(velocity);

      // 2. Interaction: Right Hand X controls Sphere Y Rotation
      if (rightWrist && rightWrist.visibility > 0.4) {
        const targetRotY = (0.5 - rightWrist.x) * 3.5;
        const targetRotX = (rightWrist.y - 0.5) * 1.8;
        setHandRotation({ x: targetRotX, y: targetRotY });
      }

      // 3. Interaction: Head Y controls Sphere Lumens / Opacity
      if (head && head.visibility > 0.5) {
        const dynamicOpacity = Math.max(0.45, Math.min(1.0, 1.25 - head.y * 1.1));
        setSphereOpacity(dynamicOpacity);
      }

      // 4. Update keypoints in player store
      setPoseKeypoints({
        rightHand: rightWrist ? { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z || 0 } : null,
        leftHand: leftWrist ? { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z || 0 } : null,
        head: head ? { x: head.x, y: head.y, z: head.z || 0 } : null,
        velocity,
      });

      // 5. Draw Glowing RGB Neon Skeleton onto Canvas HUD
      drawNeonSkeleton(landmarks);
    },
    [setPoseLandmarks, setHandRotation, setSphereOpacity, setPoseKeypoints]
  );

  // ── Neon Laser Skeleton Renderer ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawNeonSkeleton = (landmarks: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const { bass, highs, energy } = getSmoothedData();

    // ── 1. Draw Laser Bones (Lines) ──
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!p1 || !p2 || (p1.visibility && p1.visibility < 0.35) || (p2.visibility && p2.visibility < 0.35)) {
        return;
      }

      const x1 = p1.x * W;
      const y1 = p1.y * H;
      const x2 = p2.x * W;
      const y2 = p2.y * H;

      // Color coding based on body part + live audio frequency reaction
      let strokeColor = '#00f2fe';
      let shadowColor = '#00f2fe';

      if (startIdx >= 11 && endIdx <= 21 && (startIdx % 2 === 1 || endIdx % 2 === 1)) {
        strokeColor = `rgba(255, 8, 138, ${0.75 + bass * 0.25})`;
        shadowColor = '#ff088a';
      } else if (startIdx >= 12 && endIdx <= 22 && (startIdx % 2 === 0 || endIdx % 2 === 0)) {
        strokeColor = `rgba(0, 242, 254, ${0.75 + highs * 0.25})`;
        shadowColor = '#00f2fe';
      } else if (startIdx >= 23 || endIdx >= 23) {
        strokeColor = isLucid ? lucidTheme.primary : `rgba(57, 255, 20, ${0.7 + energy * 0.3})`;
        shadowColor = '#39FF14';
      } else {
        strokeColor = 'rgba(255, 215, 0, 0.85)';
        shadowColor = '#FFD700';
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5 + energy * 1.5;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 12 + energy * 8;
      ctx.stroke();
    });

    // ── 2. Draw Emissive Joint Spheres ──
    landmarks.forEach((pt: { x: number; y: number; visibility?: number }, idx: number) => {
      if (pt.visibility && pt.visibility < 0.4) return;
      const jx = pt.x * W;
      const jy = pt.y * H;

      let jointColor = '#ffffff';
      let radius = 3.5;

      if (idx === 15 || idx === 16) {
        jointColor = idx === 15 ? '#ff088a' : '#00f2fe';
        radius = 6.5 + (idx === 15 ? bass : highs) * 5;
      } else if (idx === 0) {
        jointColor = '#FFD700';
        radius = 5.5 + energy * 3;
      } else if (idx === 27 || idx === 28) {
        jointColor = '#39FF14';
        radius = 5.0 + bass * 4;
      }

      ctx.beginPath();
      ctx.arc(jx, jy, radius, 0, Math.PI * 2);
      ctx.fillStyle = jointColor;
      ctx.shadowColor = jointColor;
      ctx.shadowBlur = 15;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(jx, jy, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();
    });
  };

  // ── Initialize Camera & MediaPipe Pose ────────────────────────────────────
  useEffect(() => {
    if (!vrMode) {
      setPoseLandmarks(null);
      setIsCameraReady(false);
      return;
    }

    let isCancelled = false;
    let localStream: MediaStream | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let poseInstance: any = null;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Error cargando script: ${src}`));
        document.head.appendChild(script);
      });
    };

    const startPoseTracking = async () => {
      try {
        setErrorMessage(null);
        setIsCameraReady(false);

        // 1. Request webcam stream with low-light compatible constraints
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch {
          // Fallback to basic video constraint
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current && localStream) {
          videoRef.current.srcObject = localStream;
          await videoRef.current.play().catch(() => {});
          if (!isCancelled) setIsCameraReady(true);
        }

        // 2. Load MediaPipe Pose from CDN scripts
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

        if (isCancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PoseClass = (window as any).Pose;
        if (!PoseClass) {
          throw new Error('MediaPipe Pose no disponible en el navegador');
        }

        poseInstance = new PoseClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        poseInstance.setOptions({
          modelComplexity: 0, // Fast low-latency tracking
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseInstance.onResults(handlePoseResults);

        // 3. Process animation loop
        let isProcessing = false;
        const processFrame = async () => {
          if (isCancelled) return;

          if (
            videoRef.current &&
            videoRef.current.readyState >= 2 &&
            poseInstance &&
            !isProcessing
          ) {
            isProcessing = true;
            try {
              await poseInstance.send({ image: videoRef.current });
            } catch {
              // Ignore single frame drop
            } finally {
              isProcessing = false;
            }
          }

          if (!isCancelled) {
            animFrameIdRef.current = requestAnimationFrame(processFrame);
          }
        };

        animFrameIdRef.current = requestAnimationFrame(processFrame);
      } catch (err: unknown) {
        console.error('[PoseTracker] Camera/Pose error:', err);
        if (!isCancelled) {
          const errMsg =
            err instanceof DOMException && err.name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador.'
              : err instanceof DOMException && err.name === 'NotReadableError'
              ? 'La cámara está ocupada por otra app (Zoom/Teams/Meet).'
              : 'Error al inicializar la cámara o MediaPipe Pose.';
          setErrorMessage(errMsg);
        }
      }
    };

    startPoseTracking();

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (poseInstance && poseInstance.close) {
        try {
          poseInstance.close();
        } catch {}
      }
      setPoseLandmarks(null);
      setIsCameraReady(false);
    };
  }, [vrMode, retryCount, handlePoseResults, setPoseLandmarks]);

  if (!vrMode) return null;

  return (
    <div className="fixed bottom-28 sm:bottom-32 right-3 sm:right-6 z-40 select-none pointer-events-auto">
      <div
        className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
          showPreview ? 'w-56 sm:w-64' : 'w-auto'
        } ${
          isLucid
            ? 'bg-[#060a17]/90 border border-emerald-400/50 shadow-[0_0_35px_rgba(57,255,20,0.3)]'
            : 'bg-[#090e1c]/90 border border-cyan-400/40 shadow-[0_0_30px_rgba(0,242,254,0.3)]'
        } backdrop-blur-2xl`}
      >
        {/* Header HUD */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-white uppercase flex items-center gap-1 font-bold">
              <Flame className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              VR DANCE 33P
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-1 text-white/50 hover:text-white transition-colors"
              title={showPreview ? 'Ocultar cámara' : 'Mostrar cámara'}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 transition-colors ${showSettings ? 'text-cyan-300' : 'text-white/50 hover:text-white'}`}
              title="Ajustes de cámara"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVrMode(false)}
              className="p-1 text-white/50 hover:text-red-400 transition-colors"
              title="Desactivar VR"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Camera + Neon Skeleton Canvas */}
        {showPreview && (
          <div className="relative aspect-[4/3] bg-black overflow-hidden">
            {/* Low-Light Enhanced Camera Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover scale-x-[-1]"
              style={{
                filter: 'brightness(1.5) contrast(1.75) saturate(1.25)',
              }}
            />

            {/* Neon Skeleton Overlay Canvas */}
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
            />

            {/* Loading / Ready Badge */}
            {!isCameraReady && !errorMessage && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-mono text-cyan-300 tracking-wider">
                  ACTIVANDO CÁMARA...
                </span>
              </div>
            )}

            {/* Error Overlay with Retry Button */}
            {errorMessage && (
              <div className="absolute inset-0 bg-black/95 p-3.5 flex flex-col items-center justify-center text-center gap-2.5">
                <span className="text-xs text-red-400 font-bold">Error de Cámara</span>
                <p className="text-[10px] text-white/70 font-mono leading-relaxed">{errorMessage}</p>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  REINTENTAR
                </button>
              </div>
            )}

            {/* Dance Energy HUD Gauge */}
            {isCameraReady && !errorMessage && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono">
                <span className="text-white/60 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" /> DANZA:
                </span>
                <span
                  className="font-bold tracking-wider"
                  style={{ color: danceEnergy > 1.0 ? '#ff088a' : '#00f2fe' }}
                >
                  {danceEnergy > 1.2 ? '🔥 MODO FIESTA' : danceEnergy > 0.4 ? '⚡ BAILANDO' : 'LISTO'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Settings Panel */}
        {showSettings && (
          <div className="p-3 bg-black/80 border-t border-white/10 space-y-2 text-[10px] font-mono text-white/70">
            <div className="flex items-center justify-between">
              <span>Mano Derecha (X):</span>
              <span className="text-cyan-300">Rotación 3D Y</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mano Izquierda (Bass):</span>
              <span className="text-pink-400">Pulso Subwoofer</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cabeza (Y):</span>
              <span className="text-yellow-300">Brillo / Lumens</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Velocidad de Danza:</span>
              <span className="text-emerald-300">Acelera Partículas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoseTracker;
