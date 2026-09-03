import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayerStore, type HandLandmark } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES } from '../../types/audio';
import { X, Eye, EyeOff, Sliders, Palette, Maximize2, Sparkles, Activity } from 'lucide-react';

const HISTORY_SIZE = 5;

// Gesture Labels for HUD
const GESTURE_LABELS: Record<string, { label: string; action: string; color: string }> = {
  fist: { label: 'PUÑO', action: 'CAMBIAR PALETA', color: '#ff088a' },
  one: { label: 'SIGNO 1', action: 'PANTALLA COMPLETA', color: '#00f2fe' },
  open: { label: 'MANO ABIERTA', action: 'ROTACIÓN 3D', color: '#39FF14' },
  pinch: { label: 'PELLIZCO', action: 'ZOOM / ESCALA', color: '#FFD700' },
  unknown: { label: 'DETECTANDO...', action: 'ESPERANDO GESTO', color: '#ffffff' },
};

export const HandTracker: React.FC = () => {
  const {
    vrMode,
    setVrMode,
    setHandLandmarks,
    setHandGesture,
    setHandRotation,
    setSphereOpacity,
    setSphereRadius,
    handSensitivity,
    setHandSensitivity,
    currentPaletteIndex,
    cyclePalette,
    cycleLucidTheme,
    isLucid,
  } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedGesture, setDetectedGesture] = useState<'fist' | 'one' | 'open' | 'pinch' | 'unknown'>('unknown');
  const [gestureFeedback, setGestureFeedback] = useState<string | null>(null);

  const rotationHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const lastGestureActionTime = useRef<number>(0);
  const feedbackTimeoutRef = useRef<number | null>(null);

  // Fullscreen toggle helper
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  // Show visual feedback toast
  const triggerFeedback = useCallback((text: string) => {
    setGestureFeedback(text);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setGestureFeedback(null);
    }, 1600);
  }, []);

  // Precise Gesture Calculation based on Landmarks
  const calculateGesture = useCallback((landmarks: HandLandmark[]): 'fist' | 'one' | 'open' | 'pinch' | 'unknown' => {
    if (!landmarks || landmarks.length < 21) return 'unknown';

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];

    // Helper: is finger extended away from wrist relative to PIP
    const isFingerExt = (tip: HandLandmark, pip: HandLandmark) => {
      const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      return dTip > dPip * 1.12;
    };

    const isIndexExt = isFingerExt(indexTip, indexPIP);
    const isMiddleExt = isFingerExt(middleTip, middlePIP);
    const isRingExt = isFingerExt(ringTip, ringPIP);
    const isPinkyExt = isFingerExt(pinkyTip, pinkyPIP);

    // 1. Pinch detection (Thumb tip & Index tip close together while middle is open)
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    if (pinchDist < 0.055 && (isMiddleExt || isRingExt)) {
      return 'pinch';
    }

    // 2. Fist detection (All fingers folded towards palm)
    if (!isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
      return 'fist';
    }

    // 3. Sign of "1" (Only index finger extended upwards)
    if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
      return 'one';
    }

    // 4. Open hand (All fingers extended)
    if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
      return 'open';
    }

    return 'unknown';
  }, []);

  // Moving average rotation smoothing with deadzone
  const smoothRotation = useCallback((rawRot: { x: number; y: number }) => {
    const history = rotationHistoryRef.current;
    
    // Deadzone check: ignore tiny jitter movements near center
    const deadzone = 0.04;
    const cleanX = Math.abs(rawRot.x) < deadzone ? 0 : rawRot.x;
    const cleanY = Math.abs(rawRot.y) < deadzone ? 0 : rawRot.y;

    history.push({ x: cleanX, y: cleanY });
    if (history.length > HISTORY_SIZE) history.shift();

    const avg = history.reduce(
      (acc, r) => ({
        x: acc.x + r.x / history.length,
        y: acc.y + r.y / history.length,
      }),
      { x: 0, y: 0 }
    );
    return avg;
  }, []);

  useEffect(() => {
    if (!vrMode) return;

    let cameraStream: MediaStream | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handsInstance: any = null;
    let animId: number;

    const initTracking = async () => {
      try {
        setErrorMessage(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        cameraStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraReady(true);
        }

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
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const HandsClass = (window as any).Hands;
        if (!HandsClass) {
          throw new Error('MediaPipe Hands no disponible');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handsInstance = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handsInstance.onResults((results: any) => {
          if (!canvasRef.current || !videoRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = videoRef.current.videoWidth || 320;
          canvas.height = videoRef.current.videoHeight || 240;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0];
            const landmarks: HandLandmark[] = rawLandmarks.map(
              (lm: { x: number; y: number; z?: number }) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
              })
            );

            // Draw hand skeleton on canvas mirror
            ctx.fillStyle = '#00f2fe';
            ctx.strokeStyle = '#39FF14';
            ctx.lineWidth = 2;

            for (let i = 0; i < landmarks.length; i++) {
              const x = landmarks[i].x * canvas.width;
              const y = landmarks[i].y * canvas.height;
              ctx.beginPath();
              ctx.arc(x, y, 3.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // Update hand landmarks in global store
            setHandLandmarks(landmarks);

            // 1. Detect Gesture
            const gesture = calculateGesture(landmarks);
            setDetectedGesture(gesture);
            setHandGesture(gesture);

            const now = Date.now();
            const sens = handSensitivity || 1.0;

            // 2. Execute Action based on Gesture
            if (gesture === 'fist') {
              // PUÑO -> Cambiar Paleta de Colores (Debounce 900ms)
              setSphereOpacity(1.0);
              if (now - lastGestureActionTime.current > 900) {
                if (isLucid) {
                  cycleLucidTheme();
                  triggerFeedback('TEMA LÚCIDO CAMBIADO');
                } else {
                  cyclePalette();
                  triggerFeedback('PALETA DE COLOR CAMBIADA');
                }
                lastGestureActionTime.current = now;
              }
            } else if (gesture === 'one') {
              // SIGNO 1 -> Alternar Pantalla Completa (Debounce 1200ms)
              if (now - lastGestureActionTime.current > 1200) {
                toggleFullscreen();
                triggerFeedback('PANTALLA COMPLETA');
                lastGestureActionTime.current = now;
              }
            } else if (gesture === 'pinch') {
              // PELLIZCO -> Control dinámico de radio/zoom
              const thumbTip = landmarks[4];
              const dynamicRadius = Math.max(0.6, Math.min(2.4, 1.0 + (0.5 - thumbTip.y) * 2.0));
              setSphereRadius(dynamicRadius);
            } else if (gesture === 'open') {
              // MANO ABIERTA -> Control de Rotación 3D Continuo
              const wrist = landmarks[0];
              // Map normalized (0-1) coordinates to angles (-PI to PI)
              const rawRotY = (wrist.x - 0.5) * Math.PI * 2.5 * sens;
              const rawRotX = (wrist.y - 0.5) * Math.PI * 2.0 * sens;
              const smoothed = smoothRotation({ x: rawRotX, y: rawRotY });
              setHandRotation(smoothed);
            }
          } else {
            setHandLandmarks(null);
            setDetectedGesture('unknown');
          }
        });

        const sendFrame = async () => {
          if (videoRef.current && handsInstance && vrMode) {
            if (videoRef.current.readyState >= 2) {
              await handsInstance.send({ image: videoRef.current });
            }
          }
          if (vrMode) {
            animId = requestAnimationFrame(sendFrame);
          }
        };

        animId = requestAnimationFrame(sendFrame);
      } catch (err: unknown) {
        const isUserCancel =
          err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError');
        if (isUserCancel) {
          console.log('Permiso de cámara cancelado por el usuario.');
          setVrMode(false);
        } else {
          console.warn('Aviso de tracking VR:', err);
          setErrorMessage(
            err instanceof Error ? err.message : 'Permite el acceso a la cámara para el control gestual VR.'
          );
        }
      }
    };

    initTracking();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (handsInstance) {
        try {
          handsInstance.close();
        } catch {
          // ignore
        }
      }
      setHandLandmarks(null);
      setHandGesture('open');
      setHandRotation({ x: 0, y: 0 });
    };
  }, [
    vrMode,
    setVrMode,
    setHandLandmarks,
    setHandGesture,
    setHandRotation,
    setSphereOpacity,
    setSphereRadius,
    handSensitivity,
    calculateGesture,
    smoothRotation,
    cyclePalette,
    cycleLucidTheme,
    isLucid,
    toggleFullscreen,
    triggerFeedback,
  ]);

  if (!vrMode) return null;

  const currentPal = PROFESSIONAL_PALETTES[currentPaletteIndex] || PROFESSIONAL_PALETTES[0];
  const activeGestureInfo = GESTURE_LABELS[detectedGesture] || GESTURE_LABELS.unknown;

  return (
    <div className="fixed bottom-24 right-3 sm:right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto select-none">
      
      {/* Toast Feedback Popup */}
      {gestureFeedback && (
        <div className="px-3.5 py-1.5 rounded-xl bg-black/90 border border-emerald-400 text-emerald-300 text-xs font-mono font-semibold shadow-[0_0_20px_rgba(0,255,179,0.5)] animate-in fade-in zoom-in-95 duration-150 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>{gestureFeedback}</span>
        </div>
      )}

      {/* Mini Video + Canvas Tracking Card */}
      <div className="relative w-52 sm:w-60 bg-black/90 backdrop-blur-2xl border-2 border-emerald-400/60 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(0,255,179,0.35)] flex flex-col">
        {/* Hidden source video element */}
        <video ref={videoRef} playsInline muted className="hidden" />

        {/* Render Canvas skeleton mirror */}
        <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-black/50">
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover transform -scale-x-100 ${
              showPreview ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Top Floating Badge & Action controls */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-emerald-400/50 text-[10px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>VR GESTURES</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 rounded-full bg-black/70 text-white/70 hover:text-white"
                title="Ajustes de sensibilidad"
              >
                <Sliders className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-1 rounded-full bg-black/70 text-white/70 hover:text-white"
                title={showPreview ? 'Ocultar preview' : 'Mostrar preview'}
              >
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setVrMode(false)}
                className="p-1 rounded-full bg-black/70 text-white/70 hover:text-pink-400"
                title="Cerrar modo VR"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active Gesture HUD Indicator */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-mono">
            <span style={{ color: activeGestureInfo.color }} className="font-bold">
              {activeGestureInfo.label}
            </span>
            <span className="text-white/50">{activeGestureInfo.action}</span>
          </div>
        </div>

        {/* VR Quick Controls Footer */}
        <div className="p-2.5 bg-black/85 border-t border-white/10 space-y-2">
          {/* Gesture legend & Palette toggle */}
          <div className="flex items-center justify-between text-[10px] font-mono text-white/80">
            <span className="text-cyan-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> {isCameraReady ? 'Tracking Activo' : 'Iniciando...'}
            </span>

            <button
              onClick={cyclePalette}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-400/30 transition-all"
              title="Cierra el puño para cambiar de color"
            >
              <Palette className="w-2.5 h-2.5" />
              <span>{currentPal.name}</span>
            </button>
          </div>

          {/* Expanded Settings: Sensitivity Slider */}
          {showSettings && (
            <div className="pt-2 border-t border-white/10 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[10px] text-white/70">
                <span>Sensibilidad de Giro:</span>
                <span className="font-mono text-cyan-300">{handSensitivity.toFixed(1)}x</span>
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

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-white/70">Pantalla:</span>
                <button
                  onClick={toggleFullscreen}
                  className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 flex items-center gap-1"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                  <span>Fullscreen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="absolute inset-0 bg-black/90 p-3 flex flex-col items-center justify-center text-center text-red-300 text-[11px] leading-tight space-y-2">
            <p>{errorMessage}</p>
            <button
              onClick={() => setVrMode(false)}
              className="px-3 py-1 bg-white/10 rounded-full text-white text-[10px]"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandTracker;
