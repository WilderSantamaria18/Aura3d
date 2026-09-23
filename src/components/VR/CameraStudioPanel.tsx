import React, { useRef, useEffect, useState } from 'react';
import {
  Camera,
  Music,
  Sliders,
  Sparkles,
  X,
  Zap,
  Activity,
  Maximize2,
  Volume2,
  VolumeX,
  Crosshair,
} from 'lucide-react';
import { CalibrationModal } from '../../spatial/calibration/CalibrationModal';
import { PerformanceManager, type PerformanceMetrics } from '../../spatial/performance/PerformanceManager';
import {
  SpatialVisionService,
  type VisionTelemetry,
} from '../../services/spatialVisionService';
import {
  AirInstrumentsAudioEngine,
  type InstrumentMode,
  type OscillatorWaveform,
} from '../../services/airInstrumentsAudioEngine';
import { LandmarkOverlay } from './LandmarkOverlay';
import { CameraControls } from './CameraControls';
import { usePlayerStore } from '../../stores/playerStore';

export const CameraStudioPanel: React.FC = () => {
  const {
    isCameraStudioOpen,
    setCameraStudioOpen,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    airInstrumentType,
    setAirInstrumentType,
    setAirInstrumentsActive,
    isAirInstrumentsActive,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'camera' | 'instrument' | 'calibrate' | 'visual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [telemetry, setTelemetry] = useState<VisionTelemetry>({
    videoFps: 0,
    detectionFps: 0,
    latencyMs: 0,
    isGpuAccelerated: true,
  });

  // Calibración y configuración
  const [sensitivity, setSensitivity] = useState(1.0);
  const [targetDistance, setTargetDistance] = useState(2.8);
  const [activeScale, setActiveScale] = useState('pentatonic_minor');
  const [waveform, setWaveform] = useState<OscillatorWaveform>('sawtooth');
  const [showTrails, setShowTrails] = useState(true);
  const [enablePose, setEnablePose] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string>('unknown');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>(() => PerformanceManager.getInstance().getMetrics());

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastGestureTimeRef = useRef(0);
  const currentGestureRef = useRef('unknown');
  const activeColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || '#00e5ff') : '#00e5ff';

  // Suscripción a telemetría y gestos (Throttled para CERO re-renders a 60 FPS)
  useEffect(() => {
    if (!isCameraStudioOpen) return;
    const vision = SpatialVisionService.getInstance();

    // Si la cámara ya estaba activa en segundo plano, reconectar el preview
    if (vision.getStream() && videoRef.current) {
      vision.attachPreview(videoRef.current);
      setIsCameraActive(true);
    }

    const unsubTelem = vision.subscribeTelemetry((stats) => {
      setTelemetry(stats);
    });

    const unsubHands = vision.subscribeHands((hands) => {
      const gesture = hands.length > 0 ? hands[0].gesture : 'unknown';
      const now = performance.now();
      // Throttle a 4 Hz y solo si hay cambio para evitar saturación del scheduler de React
      if (gesture !== currentGestureRef.current && (now - lastGestureTimeRef.current >= 250)) {
        currentGestureRef.current = gesture;
        lastGestureTimeRef.current = now;
        setCurrentGesture(gesture);
      }
    });

    const unsubPerf = PerformanceManager.getInstance().subscribe((m) => {
      setPerfMetrics(m);
    });

    return () => {
      unsubTelem();
      unsubHands();
      unsubPerf();
    };
  }, [isCameraStudioOpen]);

  // Manejador de activación/desactivación de cámara
  const handleToggleCamera = async () => {
    const vision = SpatialVisionService.getInstance();
    if (!isCameraActive) {
      try {
        await vision.startCamera(videoRef.current || undefined);
        setIsCameraActive(true);
        setAirInstrumentsActive(true);
      } catch (err) {
        console.error('No se pudo activar la cámara:', err);
      }
    } else {
      vision.stopCamera();
      setIsCameraActive(false);
      AirInstrumentsAudioEngine.getInstance().cleanup();
      setAirInstrumentsActive(false);
    }
  };

  const handleTogglePose = (enabled: boolean) => {
    setEnablePose(enabled);
    PerformanceManager.getInstance().setPoseTracking(enabled);
    if (enabled) {
      SpatialVisionService.getInstance().loadPoseModel();
    }
  };

  // Sincronizar escala y timbre con el motor de audio
  const handleScaleChange = (scale: string) => {
    setActiveScale(scale);
    AirInstrumentsAudioEngine.getInstance().setScale(scale);
  };

  const handleWaveformChange = (wave: OscillatorWaveform) => {
    setWaveform(wave);
    AirInstrumentsAudioEngine.getInstance().setWaveform(wave);
  };

  const handleSelectInstrument = (mode: InstrumentMode) => {
    setAirInstrumentType(mode as any);
    if (!isAirInstrumentsActive) {
      setAirInstrumentsActive(true);
    }
  };

  if (!isCameraStudioOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-[32px] saturate-[140%] pointer-events-auto select-none font-sans animate-aura-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCameraStudioOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-studio-title"
    >
      <div
        className="w-full max-w-2xl rounded-[28px] p-4 sm:p-5 relative flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 animate-aura-modal"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 20, 28, 0.65) 50%, rgba(8, 10, 16, 0.85) 100%)',
          backdropFilter: 'blur(48px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(48px) saturate(190%) contrast(105%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1px solid rgba(255, 255, 255, 0.28)',
          boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.85), inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Specular Liquid Top Line */}
        <div
          className="absolute top-0 inset-x-10 h-px pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${activeColor}99, transparent)`,
          }}
        />

        {/* ── Header ── */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border border-white/15"
              style={{
                backgroundColor: `${activeColor}18`,
                color: activeColor,
              }}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="camera-studio-title" className="text-white font-bold text-sm sm:text-base tracking-tight">
                  Spatial Camera Studio
                </h2>
                {isCameraActive && (
                  <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    DETECCIÓN ACTIVA
                  </span>
                )}
              </div>
              <p className="text-white/60 text-[11px] font-sans mt-0.5">
                Realidad Aumentada Musical · MediaPipe GPU & Three.js
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Telemetry HUD Badge */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[10px] font-mono text-white/70">
              <span className="text-white font-bold">{telemetry.videoFps || perfMetrics.fps || 60} FPS</span>
              <span className="text-white/30">•</span>
              <span className="text-cyan-300">{perfMetrics.frameTimeMs || 16.6}ms</span>
              <span className="text-white/30">•</span>
              <span className={`px-1.5 py-0.2 rounded font-bold ${
                perfMetrics.currentTier === 'HIGH' ? 'text-emerald-400 bg-emerald-500/15' :
                perfMetrics.currentTier === 'MEDIUM' ? 'text-cyan-400 bg-cyan-500/15' :
                'text-amber-400 bg-amber-500/15'
              }`}>
                {perfMetrics.currentTier}
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setCameraStudioOpen(false)}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Cerrar Camera Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Apple Segmented Control ── */}
        <div className="my-3 p-1 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md grid grid-cols-4 gap-1 flex-shrink-0">
          {[
            { id: 'camera', label: 'Cámara', icon: Camera },
            { id: 'instrument', label: 'Instrumentos', icon: Music },
            { id: 'calibrate', label: 'Calibrar', icon: Sliders },
            { id: 'visual', label: 'Visual', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-white/20 text-white font-semibold shadow-sm border border-white/20'
                    : 'text-white/60 hover:text-white'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${activeColor}25`,
                        borderColor: `${activeColor}60`,
                        color: '#ffffff',
                      }
                    : undefined
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {/* TAB 1: CÁMARA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Webcam Mirror Preview Frame */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isCameraActive ? 'opacity-90' : 'opacity-0'
                  }`}
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* 2D Landmark Overlay */}
                {isCameraActive && (
                  <LandmarkOverlay
                    width={640}
                    height={480}
                    accentColor={activeColor}
                    showTrails={showTrails}
                  />
                )}

                {/* Placeholder cuando la cámara está apagada */}
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 p-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Cámara Espacial Desactivada</p>
                      <p className="text-xs text-white/50 max-w-xs mt-0.5">
                        Activa la cámara para tocar sintetizadores, batería y theremin en el aire con tus manos.
                      </p>
                    </div>
                    <button
                      onClick={handleToggleCamera}
                      className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-transform active:scale-95 shadow-lg cursor-pointer"
                      style={{ backgroundColor: activeColor }}
                    >
                      Activar Cámara Web
                    </button>
                  </div>
                )}

                {/* HUD Overlay cuando está activa */}
                {isCameraActive && (
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
                    <div className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90 shadow-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Gesto: {currentGesture.toUpperCase()}</span>
                    </div>

                    <button
                      onClick={handleToggleCamera}
                      className="pointer-events-auto px-3 py-1 rounded-xl bg-black/70 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-white/15 backdrop-blur-md text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Detener
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INSTRUMENTOS */}
          {activeTab === 'instrument' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'synth',
                    name: 'Sintetizador 3D',
                    desc: '7 teclas flotantes con colisión en plano Z',
                    badge: 'POLIFÓNICO',
                  },
                  {
                    id: 'drums',
                    name: 'Batería Gestual',
                    desc: 'Kick 808, Snare, Hi-Hat y Clap por velocidad',
                    badge: 'DINÁMICO',
                  },
                  {
                    id: 'theremin',
                    name: 'Theremin Espacial',
                    desc: 'Eje X: Tono • Eje Y: Volumen • Eje Z: Filtro',
                    badge: 'CONTINUO',
                  },
                  {
                    id: 'pads',
                    name: 'Pads 4x4 Launchpad',
                    desc: 'Matriz armónica interactiva sin contacto',
                    badge: 'LOOP & FX',
                  },
                  {
                    id: 'pose',
                    name: 'Danza / Pose 3D',
                    desc: 'Trackeo cinemático corporal de 33 puntos',
                    badge: 'CUERPO',
                  },
                ].map((inst) => {
                  const isSelected = airInstrumentType === inst.id;
                  return (
                    <button
                      key={inst.id}
                      onClick={() => handleSelectInstrument(inst.id as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer backdrop-blur-md ${
                        isSelected
                          ? 'bg-white/20 border-white/40 text-white shadow-md ring-1 ring-white/30'
                          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white/80 hover:text-white'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${activeColor}25`,
                              borderColor: `${activeColor}70`,
                            }
                          : undefined
                      }
                    >
                      <div>
                        <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-bold uppercase">
                          {inst.badge}
                        </span>
                        <h4 className="text-xs font-bold mt-2 text-white">{inst.name}</h4>
                        <p className="text-[10px] text-white/50 mt-1 leading-snug">{inst.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CALIBRAR & TAB 4: VISUAL */}
          {activeTab === 'calibrate' && (
            <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-[#00e5ff]/10 via-[#ffbd00]/10 to-[#ff088a]/10 border border-[#00e5ff]/30 flex items-center justify-between backdrop-blur-md">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[#00e5ff] animate-spin-slow" />
                  Calibración Espacial AURA (5 Pasos)
                </h4>
                <p className="text-[10px] text-white/60 mt-0.5">
                  Mapea la profundidad neutra y los 4 bordes del frustum de interacción
                </p>
              </div>
              <button
                onClick={() => setIsCalibrationOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#00e5ff] text-black font-bold text-xs hover:bg-[#00e5ff]/90 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] active:scale-95 cursor-pointer"
              >
                Iniciar
              </button>
            </div>
          )}

          {(activeTab === 'calibrate' || activeTab === 'visual') && (
            <CameraControls
              sensitivity={sensitivity}
              onSensitivityChange={setSensitivity}
              targetDistance={targetDistance}
              onTargetDistanceChange={setTargetDistance}
              activeScale={activeScale}
              onScaleChange={handleScaleChange}
              waveform={waveform}
              onWaveformChange={handleWaveformChange}
              showTrails={showTrails}
              onToggleTrails={setShowTrails}
              enablePose={enablePose}
              onTogglePose={handleTogglePose}
              accentColor={activeColor}
            />
          )}
        </div>
      </div>

      {/* Modal de Calibración Espacial Guiada */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
      />
    </div>
  );
};

export default CameraStudioPanel;
