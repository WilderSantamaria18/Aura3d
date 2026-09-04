import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore, type HandLandmark, type PoseLandmark } from '../../stores/playerStore';
import { useVisualizer } from '../../hooks/useVisualizer';
import { useSmoothLandmarks } from '../../hooks/useSmoothLandmarks';
import { classifyHandGesture } from '../../features/vr/gestureMap';
import {
  X,
  Eye,
  EyeOff,
  Sliders,
  Activity,
  Zap,
  Flame,
  RefreshCw,
  Sparkles,
  Maximize2,
  AlertTriangle,
  Moon,
} from 'lucide-react';

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

// ── MediaPipe Hands 21-point Connections ────────────────────────────────────
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

const GESTURE_LABELS: Record<string, { label: string; action: string; color: string }> = {
  fist: { label: 'PUÑO', action: 'CAMBIAR PALETA / TEMA', color: '#ff088a' },
  one: { label: 'SIGNO 1', action: 'PANTALLA COMPLETA', color: '#00f2fe' },
  open: { label: 'MANO ABIERTA', action: 'ROTACIÓN 3D FLUIDA', color: '#39FF14' },
  pinch: { label: 'PELLIZCO', action: 'ZOOM / ESCALA 3D', color: '#FFD700' },
  thumbs_up: { label: 'PULGAR ARRIBA', action: 'REPRODUCIR / PAUSA', color: '#00ffb3' },
  peace: { label: 'PAZ / V', action: 'MODO AUTO COLOR', color: '#c471ed' },
  unknown: { label: 'DETECTANDO...', action: 'ESPERANDO GESTO', color: '#ffffff' },
};

export const PoseTracker: React.FC = () => {
  const {
    vrMode,
    setVrMode,
    vrTrackingMode,
    setVrTrackingMode,
    setPoseLandmarks,
    setHandLandmarks,
    setHandGesture,
    setPoseKeypoints,
    setHandRotation,
    sphereOpacity,
    setSphereOpacity,
    sphereRadius,
    setSphereRadius,
    isLucid,
    lucidTheme,
    cyclePalette,
    cycleLucidTheme,
    handSensitivity,
    setHandSensitivity,
    togglePlay,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.2);
  const { processPose, processHands, reset: resetSmoothing } = useSmoothLandmarks();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [danceEnergy, setDanceEnergy] = useState<number>(0);
  const [detectedGesture, setDetectedGesture] = useState<string>('unknown');
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isNoDetection, setIsNoDetection] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);

  const pinchRadiusRef = useRef<number>(1.0);
  const lastEmittedRadiusRef = useRef<number>(1.0);

  const lastProcessTimeRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(Date.now());
  const lastActiveTimeRef = useRef<number>(Date.now());
  const isSleepingRef = useRef<boolean>(false);
  const lastGestureActionTime = useRef<number>(0);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Fullscreen helper
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  // Visual feedback toast
  const triggerFeedback = useCallback((text: string) => {
    setGestureFeedback(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setGestureFeedback(null);
    }, 1600);
  }, []);

  // Wake up handler on any interaction
  const wakeUp = useCallback(() => {
    lastActiveTimeRef.current = Date.now();
    lastDetectionTimeRef.current = Date.now();
    if (isSleepingRef.current) {
      isSleepingRef.current = false;
      setIsSleeping(false);
      triggerFeedback('TRACKING REACTIVADO');
    }
  }, [triggerFeedback]);

  // Global user activity listeners to wake up or refresh active timer
  useEffect(() => {
    const onActivity = () => {
      lastActiveTimeRef.current = Date.now();
      if (isSleepingRef.current) {
        wakeUp();
      }
    };

    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('mousemove', onActivity);

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('mousemove', onActivity);
    };
  }, [wakeUp]);

  // ── Periodic Detection Timeout (> 2000ms) & Inactivity Sleep (> 10s) Monitor ──
  useEffect(() => {
    if (!vrMode || !isCameraReady) {
      setIsNoDetection(false);
      setIsSleeping(false);
      isSleepingRef.current = false;
      return;
    }

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceDetection = now - lastDetectionTimeRef.current;
      const elapsedSinceActivity = now - lastActiveTimeRef.current;

      // 1. Framing timeout warning (> 2000ms without landmarks)
      setIsNoDetection(elapsedSinceDetection > 2000 && !isSleepingRef.current);

      // 2. Inactivity Sleep (> 10000ms): pauses MediaPipe to save massive CPU/battery
      if (elapsedSinceActivity > 10000 && !isSleepingRef.current) {
        isSleepingRef.current = true;
        setIsSleeping(true);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [vrMode, isCameraReady]);

  // ── Neon Laser Skeleton Renderer for Body Pose (33 points) ────────────────
  const drawBodySkeleton = useCallback(
    (landmarks: PoseLandmark[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const { bass, highs, energy } = getSmoothedData();

      // 1. Draw Bones
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        if (
          !p1 ||
          !p2 ||
          (p1.visibility !== undefined && p1.visibility < 0.35) ||
          (p2.visibility !== undefined && p2.visibility < 0.35)
        ) {
          return;
        }

        const x1 = p1.x * W;
        const y1 = p1.y * H;
        const x2 = p2.x * W;
        const y2 = p2.y * H;

        let strokeColor = '#00f2fe';
        let shadowColor = '#00f2fe';

        if (startIdx >= 11 && endIdx <= 21 && (startIdx % 2 === 1 || endIdx % 2 === 1)) {
          // Left Arm -> Bass Reactive (Pink)
          strokeColor = `rgba(255, 8, 138, ${0.75 + bass * 0.25})`;
          shadowColor = '#ff088a';
        } else if (startIdx >= 12 && endIdx <= 22 && (startIdx % 2 === 0 || endIdx % 2 === 0)) {
          // Right Arm -> Treble Reactive (Cyan)
          strokeColor = `rgba(0, 242, 254, ${0.75 + highs * 0.25})`;
          shadowColor = '#00f2fe';
        } else if (startIdx >= 23 || endIdx >= 23) {
          // Legs -> Kick Reactive (Green / Lucid)
          strokeColor = isLucid ? lucidTheme.primary : `rgba(57, 255, 20, ${0.7 + energy * 0.3})`;
          shadowColor = '#39FF14';
        } else {
          // Torso & Face
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

      // 2. Draw Emissive Joint Spheres
      landmarks.forEach((pt, idx) => {
        if (pt.visibility !== undefined && pt.visibility < 0.4) return;
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
    },
    [getSmoothedData, isLucid, lucidTheme]
  );

  // ── Neon Laser Skeleton Renderer for Hands (21 points) ────────────────────
  const drawHandSkeleton = useCallback(
    (landmarks: HandLandmark[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const { bass, highs, energy } = getSmoothedData();

      // 1. Draw Bones
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        if (!p1 || !p2) return;

        const x1 = p1.x * W;
        const y1 = p1.y * H;
        const x2 = p2.x * W;
        const y2 = p2.y * H;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isLucid
          ? lucidTheme.primary
          : `rgba(0, 242, 254, ${0.75 + highs * 0.25})`;
        ctx.lineWidth = 2.0 + energy * 1.5;
        ctx.shadowColor = isLucid ? lucidTheme.primary : '#00f2fe';
        ctx.shadowBlur = 10 + energy * 6;
        ctx.stroke();
      });

      // 2. Draw Fingertip Emissive Glows
      const fingertipIndices = [4, 8, 12, 16, 20];
      landmarks.forEach((pt, idx) => {
        const jx = pt.x * W;
        const jy = pt.y * H;
        const isTip = fingertipIndices.includes(idx);

        let jointColor = '#ffffff';
        let radius = isTip ? 5.5 + bass * 3 : 3.0;

        if (idx === 4 || idx === 8) {
          jointColor = '#ff088a';
        } else if (isTip) {
          jointColor = '#39FF14';
        }

        ctx.beginPath();
        ctx.arc(jx, jy, radius, 0, Math.PI * 2);
        ctx.fillStyle = jointColor;
        ctx.shadowColor = jointColor;
        ctx.shadowBlur = isTip ? 14 : 6;
        ctx.fill();
      });

      // 3. Draw Pinch indicator line if active
      const thumb = landmarks[4];
      const index = landmarks[8];
      if (thumb && index) {
        const dx = (thumb.x - index.x) * W;
        const dy = (thumb.y - index.y) * H;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          ctx.beginPath();
          ctx.moveTo(thumb.x * W, thumb.y * H);
          ctx.lineTo(index.x * W, index.y * H);
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 15;
          ctx.stroke();
        }
      }
    },
    [getSmoothedData, isLucid, lucidTheme]
  );

  // ── MediaPipe Results Callback ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleResults = useCallback(
    (results: any) => {
      lastDetectionTimeRef.current = Date.now();
      setIsNoDetection(false);

      if (vrTrackingMode === 'body') {
        const rawLandmarks = results.poseLandmarks;
        if (!rawLandmarks || rawLandmarks.length < 33) {
          setPoseLandmarks(null);
          return;
        }

        setPoseLandmarks(rawLandmarks);

        // Process smoothed world coordinates with Anti-Jitter Lerp + Outlier Rejection
        const { head, rightHand, leftHand, velocity, rotation } = processPose(rawLandmarks);

        setDanceEnergy(velocity);
        setHandRotation(rotation);

        setPoseKeypoints({
          rightHand,
          leftHand,
          head,
          velocity,
        });

        drawBodySkeleton(rawLandmarks);
      } else {
        // Hands Mode (21 points)
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const rawLandmarks: HandLandmark[] = results.multiHandLandmarks[0];
          setHandLandmarks(rawLandmarks);

          // 1. Process smoothed rotation
          const { rotation } = processHands(rawLandmarks, handSensitivity);
          setHandRotation(rotation);

          // 2. Classify Gestures
          const classified = classifyHandGesture(rawLandmarks);
          const gesture = classified.type;
          setDetectedGesture(gesture);
          setHandGesture(gesture === 'none' ? 'unknown' : (gesture as any));

          const now = Date.now();

          // 3. Gesture Actions with debouncing
          if (gesture === 'fist') {
            if (now - lastGestureActionTime.current > 900) {
              if (isLucid) {
                cycleLucidTheme();
                triggerFeedback('TEMA LÚCIDO CAMBIADO');
              } else {
                cyclePalette();
                triggerFeedback('PALETA CAMBIADA');
              }
              lastGestureActionTime.current = now;
            }
          } else if (gesture === 'one') {
            if (now - lastGestureActionTime.current > 1200) {
              toggleFullscreen();
              triggerFeedback('PANTALLA COMPLETA');
              lastGestureActionTime.current = now;
            }
          } else if (gesture === 'thumbs_up') {
            if (now - lastGestureActionTime.current > 1200) {
              togglePlay();
              triggerFeedback('PLAY / PAUSA');
              lastGestureActionTime.current = now;
            }
          } else if (gesture === 'pinch') {
            // Smooth zoom: thumb and index distance modulates radius without frame drops
            const thumb = rawLandmarks[4];
            const index = rawLandmarks[8];
            if (thumb && index) {
              const dx = thumb.x - index.x;
              const dy = thumb.y - index.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const targetRadius = Math.max(0.6, Math.min(2.2, 0.5 + dist * 5.0));
              pinchRadiusRef.current += (targetRadius - pinchRadiusRef.current) * 0.25;
              if (Math.abs(pinchRadiusRef.current - lastEmittedRadiusRef.current) > 0.02) {
                lastEmittedRadiusRef.current = pinchRadiusRef.current;
                setSphereRadius(pinchRadiusRef.current);
              }
            }
          }

          drawHandSkeleton(rawLandmarks);
        } else {
          setHandLandmarks(null);
          setDetectedGesture('unknown');
        }
      }
    },
    [
      vrTrackingMode,
      setPoseLandmarks,
      setHandLandmarks,
      setHandGesture,
      setPoseKeypoints,
      setHandRotation,
      setSphereOpacity,
      setSphereRadius,
      processPose,
      processHands,
      handSensitivity,
      isLucid,
      cycleLucidTheme,
      cyclePalette,
      toggleFullscreen,
      togglePlay,
      triggerFeedback,
      drawBodySkeleton,
      drawHandSkeleton,
    ]
  );

  // ── Script loader utility ─────────────────────────────────────────────────
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

  // ── Initialize Camera & MediaPipe Model Lifecycle ─────────────────────────
  useEffect(() => {
    if (!vrMode) {
      setPoseLandmarks(null);
      setHandLandmarks(null);
      setIsCameraReady(false);
      resetSmoothing();
      return;
    }

    let isCancelled = false;
    let localStream: MediaStream | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let modelInstance: any = null;

    const startTracking = async () => {
      try {
        setErrorMessage(null);
        setIsCameraReady(false);
        resetSmoothing();

        // 1. Request webcam stream with adaptive low-power constraints (320x240 on mobile, 480x360 on desktop)
        const isMobileOrLowEnd =
          typeof window !== 'undefined' &&
          (window.innerWidth < 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));

        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: isMobileOrLowEnd ? 320 : 480 },
              height: { ideal: isMobileOrLowEnd ? 240 : 360 },
            },
            audio: false,
          });
        } catch {
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

        // 2. Load required MediaPipe scripts dynamically based on active mode
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

        if (vrTrackingMode === 'body') {
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
          if (isCancelled) return;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const PoseClass = (window as any).Pose;
          if (!PoseClass) throw new Error('MediaPipe Pose no disponible');

          modelInstance = new PoseClass({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });

          modelInstance.setOptions({
            modelComplexity: 0, // Fast low-latency tracking
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } else {
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
          if (isCancelled) return;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const HandsClass = (window as any).Hands;
          if (!HandsClass) throw new Error('MediaPipe Hands no disponible');

          modelInstance = new HandsClass({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          modelInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        }

        modelInstance.onResults(handleResults);

        // 3. Ultra-Efficient 20 FPS Throttled Processing Loop with Smart Sleep Check
        let isProcessing = false;
        const processFrame = async () => {
          if (isCancelled) return;

          const now = performance.now();
          if (
            videoRef.current &&
            videoRef.current.readyState >= 2 &&
            modelInstance &&
            !isProcessing &&
            !isSleepingRef.current && // Skip processing during inactivity sleep
            now - lastProcessTimeRef.current >= 48 // ~20 FPS (every ~50ms) saves massive CPU
          ) {
            lastProcessTimeRef.current = now;
            isProcessing = true;
            try {
              await modelInstance.send({ image: videoRef.current });
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
        console.error('[VRTracker] Initialization error:', err);
        if (!isCancelled) {
          const errMsg =
            err instanceof DOMException && err.name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Permite el acceso a la cámara.'
              : err instanceof DOMException && err.name === 'NotReadableError'
              ? 'La cámara está ocupada por otra app.'
              : 'Error al inicializar cámara o MediaPipe.';
          setErrorMessage(errMsg);
        }
      }
    };

    startTracking();

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
      if (modelInstance && modelInstance.close) {
        try {
          modelInstance.close();
        } catch {}
      }
      setPoseLandmarks(null);
      setHandLandmarks(null);
      setIsCameraReady(false);
      resetSmoothing();
    };
  }, [vrMode, vrTrackingMode, retryCount, handleResults, setPoseLandmarks, setHandLandmarks, resetSmoothing]);

  if (!vrMode) return null;

  const activeGestureInfo = GESTURE_LABELS[detectedGesture] || GESTURE_LABELS.unknown;

  return (
    <div className="fixed bottom-28 sm:bottom-32 right-3 sm:right-6 z-40 select-none pointer-events-auto">
      {/* Toast Feedback Popup */}
      {gestureFeedback && (
        <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-black/95 border border-emerald-400 text-emerald-300 text-xs font-mono font-semibold shadow-[0_0_20px_rgba(0,255,179,0.5)] animate-in fade-in zoom-in-95 duration-150 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>{gestureFeedback}</span>
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
          showPreview ? 'w-60 sm:w-64' : 'w-auto'
        } ${
          isLucid
            ? 'bg-[#060a17]/90 border border-emerald-400/50 shadow-[0_0_35px_rgba(57,255,20,0.3)]'
            : 'bg-[#090e1c]/90 border border-cyan-400/40 shadow-[0_0_30px_rgba(0,242,254,0.3)]'
        } backdrop-blur-2xl`}
      >
        {/* Header HUD */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                vrTrackingMode === 'body' ? 'bg-pink-500' : 'bg-emerald-400'
              } animate-ping`}
            />
            <span className="text-[10px] font-mono tracking-widest text-white uppercase flex items-center gap-1 font-bold">
              {vrTrackingMode === 'body' ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  VR CUERPO 33P
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  VR MANOS 21P
                </>
              )}
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
              className={`p-1 transition-colors ${
                showSettings ? 'text-cyan-300' : 'text-white/50 hover:text-white'
              }`}
              title="Ajustes de VR"
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

        {/* Dual Mode Switcher Bar */}
        <div className="p-1.5 bg-black/60 border-b border-white/10 flex items-center gap-1">
          <button
            onClick={() => setVrTrackingMode('body')}
            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center justify-center gap-1 ${
              vrTrackingMode === 'body'
                ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-300 border border-pink-500/50 shadow-[0_0_12px_rgba(255,8,138,0.3)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🕺 Cuerpo</span>
          </button>
          <button
            onClick={() => setVrTrackingMode('hands')}
            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center justify-center gap-1 ${
              vrTrackingMode === 'hands'
                ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(0,255,179,0.3)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🤲 2 Manos</span>
          </button>
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

            {/* Loading Badge */}
            {!isCameraReady && !errorMessage && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-mono text-cyan-300 tracking-wider">
                  ACTIVANDO CÁMARA...
                </span>
              </div>
            )}

            {/* No Detection Warning (>2s) */}
            {isCameraReady && isNoDetection && !errorMessage && !isSleeping && (
              <div className="absolute top-2 left-2 right-2 p-2 rounded-xl bg-red-950/90 border border-red-500/60 shadow-[0_0_20px_rgba(255,0,0,0.5)] backdrop-blur-md text-center flex items-center justify-center gap-1.5 text-[9px] font-mono text-red-200 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span>🔴 Cámara activa, pero sin detección. ¿Estás en el encuadre?</span>
              </div>
            )}

            {/* Smart Inactivity Sleep Overlay (>10s) */}
            {isCameraReady && isSleeping && !errorMessage && (
              <div
                onClick={wakeUp}
                className="absolute inset-0 bg-black/90 p-3 flex flex-col items-center justify-center text-center gap-2 cursor-pointer z-20 backdrop-blur-md animate-in fade-in duration-300"
              >
                <Moon className="w-7 h-7 text-yellow-300 animate-bounce" />
                <span className="text-xs font-bold text-yellow-300 tracking-wider">
                  MODO AHORRO ACTIVADO
                </span>
                <p className="text-[10px] text-white/70 font-mono leading-tight max-w-[200px]">
                  Pausado por inactividad (10s) para ahorrar 100% de CPU.
                </p>
                <span className="mt-1 px-3 py-1 rounded-full bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 text-[10px] font-bold animate-pulse">
                  Toca para reactivar
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

            {/* Mode-Specific Real-Time HUD Gauge */}
            {isCameraReady && !errorMessage && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-mono">
                {vrTrackingMode === 'body' ? (
                  <>
                    <span className="text-white/60 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" /> DANZA:
                    </span>
                    <span
                      className="font-bold tracking-wider"
                      style={{ color: danceEnergy > 1.0 ? '#ff088a' : '#00f2fe' }}
                    >
                      {danceEnergy > 1.2 ? '🔥 MODO FIESTA' : danceEnergy > 0.4 ? '⚡ BAILANDO' : 'LISTO'}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: activeGestureInfo.color }} className="font-bold">
                      {activeGestureInfo.label}
                    </span>
                    <span className="text-white/50 text-[8px] truncate max-w-[110px]">
                      {activeGestureInfo.action}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Settings Panel */}
        {showSettings && (
          <div className="p-3 bg-black/90 border-t border-white/10 space-y-3 text-[10px] font-mono text-white/70 animate-in fade-in duration-150">
            {/* 1. Opacity Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white/90">Opacidad Esfera 3D:</span>
                <span className="text-cyan-300 font-bold">{Math.round(sphereOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={sphereOpacity}
                onChange={(e) => setSphereOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 2. Radius / Scale Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white/90">Radio / Escala 3D:</span>
                <span className="text-pink-300 font-bold">{sphereRadius.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.05"
                value={sphereRadius}
                onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg cursor-pointer accent-pink-500"
              />
            </div>

            {vrTrackingMode === 'body' ? (
              <div className="pt-1 space-y-1 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span>Mano Derecha (X):</span>
                  <span className="text-cyan-300 font-semibold">Rotación 3D Y</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mano Izquierda (Bass):</span>
                  <span className="text-pink-400 font-semibold">Pulso Subwoofer</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Velocidad de Danza:</span>
                  <span className="text-emerald-300 font-semibold">Acelera Partículas</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1 border-t border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Sensibilidad Giro:</span>
                    <span className="text-cyan-300 font-semibold">{handSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.1"
                    value={handSensitivity}
                    onChange={(e) => setHandSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg cursor-pointer accent-emerald-400"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span>Pantalla Completa:</span>
              <button
                onClick={toggleFullscreen}
                className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 flex items-center gap-1 hover:bg-cyan-500/30 transition-all"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>Fullscreen</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoseTracker;
