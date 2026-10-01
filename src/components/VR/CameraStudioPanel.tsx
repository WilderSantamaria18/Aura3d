import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CalibrationModal } from '../../spatial/calibration/CalibrationModal';
import { PerformanceManager, type PerformanceMetrics, type SpatialQualityMode } from '../../spatial/performance/PerformanceManager';
import {
  SpatialVisionService,
  type VisionTelemetry,
} from '../../services/spatialVisionService';
import {
  AirInstrumentsAudioEngine,
  type InstrumentMode,
  type OscillatorWaveform,
} from '../../services/airInstrumentsAudioEngine';
import { SpatialInstrumentEngine } from '../../spatial/instruments/SpatialInstrumentEngine';
import { LandmarkOverlay } from './LandmarkOverlay';
import { CameraControls } from './CameraControls';
import { usePlayerStore } from '../../stores/playerStore';
import { useShallow } from 'zustand/react/shallow';

const AR_KEYS = [
  { name: 'C4', freq: 261.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'Eb4', freq: 311.13 },
  { name: 'G4', freq: 392.00 },
  { name: 'Ab4', freq: 415.30 },
  { name: 'C5', freq: 523.25 },
  { name: 'D5', freq: 587.33 },
];

type TabId = 'camera' | 'instrument' | 'calibrate' | 'visual';

const TABS: { id: TabId; label: string }[] = [
  { id: 'camera', label: 'Cámara' },
  { id: 'instrument', label: 'Instrumentos' },
  { id: 'calibrate', label: 'Calibrar' },
  { id: 'visual', label: 'Visual' },
];

// Cada instrumento tiene su color de LED; la consola entera lo adopta como acento
const INSTRUMENTS = [
  { id: 'synth', name: 'Sintetizador', desc: 'Siete teclas flotantes en arco', spec: '7 teclas', color: '#38e8ff', hint: 'Suena al entrar en la tecla con la punta del índice. Mantener el dedo dentro sostiene la nota.' },
  { id: 'drums', name: 'Batería', desc: 'Kick, snare, hi-hat y clap por golpe', spec: '4 pads', color: '#ff3d8b', hint: 'Cada pad suena una vez al entrar. Sal del pad y vuelve a entrar para repetir el golpe.' },
  { id: 'theremin', name: 'Theremin', desc: 'X es el tono, Y el volumen, Z el filtro', spec: '3 ejes', color: '#ffc23d', hint: 'Mueve la mano de lado a lado para cambiar el tono y de arriba abajo para el volumen.' },
  { id: 'pads', name: 'Launchpad', desc: 'Rejilla armónica sin contacto', spec: '4 × 4', color: '#8b7bff', hint: 'Este instrumento todavía no tiene vista en la escena 3D.' },
  { id: 'pose', name: 'Danza', desc: 'Seguimiento del cuerpo completo', spec: '33 puntos', color: '#5dea8c', hint: 'Este modo todavía no tiene vista en la escena 3D.' },
];

const QUALITY_MODES: { id: SpatialQualityMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'LOW', label: 'Eco' },
  { id: 'MEDIUM', label: 'Medio' },
  { id: 'HIGH', label: 'Alto' },
];
const TIER_LABEL = { LOW: 'Eco', MEDIUM: 'Medio', HIGH: 'Alto' } as const;

const GESTURE_LABEL: Record<string, string> = {
  fist: 'puño',
  pinch: 'pellizco',
  open: 'palma abierta',
  pointing: 'índice',
  peace: 'paz',
  unknown: 'ninguno',
};

// El estado visual de las teclas AR se marca por atributo: cero re-renders de React por muestra
const setArKey = (idx: number, on: boolean) => {
  const el = document.getElementById(`ar-key-${idx}`);
  if (el) el.dataset.on = on ? 'true' : 'false';
};

export const CameraStudioPanel: React.FC = () => {
  const {
    isCameraStudioOpen,
    setCameraStudioOpen,
    airInstrumentType,
    setAirInstrumentType,
    setAirInstrumentsActive,
    isAirInstrumentsActive,
  } = usePlayerStore(
    useShallow((s) => ({
      isCameraStudioOpen: s.isCameraStudioOpen,
      setCameraStudioOpen: s.setCameraStudioOpen,
      airInstrumentType: s.airInstrumentType,
      setAirInstrumentType: s.setAirInstrumentType,
      setAirInstrumentsActive: s.setAirInstrumentsActive,
      isAirInstrumentsActive: s.isAirInstrumentsActive,
    }))
  );

  const [activeTab, setActiveTab] = useState<TabId>('camera');
  const [mounted, setMounted] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
  const activeKeysRef = useRef<Set<number>>(new Set());
  const nextKeysRef = useRef<Set<number>>(new Set());
  const activeTabRef = useRef<TabId>('camera');
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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

      // ── Detección de Colisión AR sobre las 7 Teclas del Panel (Zero Allocations) ──
      // Las teclas AR del preview solo existen en la pestaña Cámara
      if (activeTabRef.current !== 'camera' && activeKeysRef.current.size === 0) return;
      const currentActive = nextKeysRef.current;
      currentActive.clear();
      if (activeTabRef.current === 'camera') hands.forEach((hand) => {
        const tip = hand.landmarks[8]; // Punta del índice
        const thumb = hand.landmarks[4]; // Pulgar
        [tip, thumb].forEach((pt) => {
          if (!pt) return;
          const mirrorX = 1.0 - pt.x;
          const y = pt.y;
          // Zona interactiva: tercio inferior del video (Y >= 0.58 && Y <= 0.98)
          if (y >= 0.58 && y <= 0.98 && mirrorX >= 0.02 && mirrorX <= 0.98) {
            const keyIdx = Math.min(6, Math.max(0, Math.floor((mirrorX - 0.02) / (0.96 / 7))));
            currentActive.add(keyIdx);
          }
        });
      });

      const engine = SpatialInstrumentEngine.getInstance();
      AR_KEYS.forEach((key, idx) => {
        const wasActive = activeKeysRef.current.has(idx);
        const isActive = currentActive.has(idx);
        if (isActive && !wasActive) {
          engine.triggerNoteOn(idx, key.freq, 0.9);
          setArKey(idx, true);
        } else if (!isActive && wasActive) {
          engine.triggerNoteOff(idx);
          setArKey(idx, false);
        }
      });
      // Intercambio de sets: cero asignaciones por muestra
      nextKeysRef.current = activeKeysRef.current;
      activeKeysRef.current = currentActive;
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

  // Entrada suave y cierre con Escape (panel anclado, no modal)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCameraStudioOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [setCameraStudioOpen]);

  // Manejador de activación/desactivación de cámara
  const handleToggleCamera = async () => {
    const vision = SpatialVisionService.getInstance();
    if (!isCameraActive) {
      setCameraError(null);
      try {
        await vision.startCamera(videoRef.current || undefined);
        setIsCameraActive(true);
        setAirInstrumentsActive(true);
      } catch (err) {
        console.error('No se pudo activar la cámara:', err);
        const name = err instanceof DOMException ? err.name : '';
        setCameraError(
          name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en el candado de la barra de direcciones y reintenta.'
            : name === 'NotFoundError'
            ? 'No se encontró ninguna cámara conectada.'
            : name === 'NotReadableError'
            ? 'La cámara está siendo usada por otra aplicación.'
            : 'No se pudo iniciar la cámara o cargar los modelos de seguimiento. Revisa tu conexión e inténtalo de nuevo.'
        );
      }
    } else {
      // stopCamera conserva los modelos de MediaPipe cargados (destroy() los descartaba y obligaba a re-descargarlos)
      vision.stopCamera();
      setIsCameraActive(false);
      AirInstrumentsAudioEngine.getInstance().cleanup();
      SpatialInstrumentEngine.getInstance().cleanup();
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

  const inst = INSTRUMENTS.find((i) => i.id === airInstrumentType) ?? INSTRUMENTS[0];
  const accent = inst.color;
  const tierLabel = TIER_LABEL[perfMetrics.currentTier];
  const trackingHz = telemetry.detectionFps;

  return (
    <aside
      aria-label="Estudio espacial"
      style={{ '--inst': accent } as React.CSSProperties}
      className={`fixed z-40 pointer-events-auto select-none font-sans text-[#e8ecf4]
        inset-x-2 bottom-24 max-h-[64vh]
        lg:inset-x-auto lg:right-4 lg:top-[84px] lg:bottom-4 lg:max-h-none lg:w-[380px]
        flex flex-col rounded-2xl bg-[#0d1016] border border-white/[0.09]
        shadow-[0_2px_4px_rgba(0,0,0,0.45),0_18px_48px_rgba(0,0,0,0.55)]
        transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none
        selection:bg-white/20 ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
    >
      {/* ── Cabecera: título, lectura de seguimiento y cierre ── */}
      <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0 transition-colors duration-300"
          style={{
            backgroundColor: isCameraActive ? 'var(--inst)' : '#3a4152',
            boxShadow: isCameraActive ? '0 0 8px var(--inst)' : 'none',
          }}
        />
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] flex-1 truncate">Estudio espacial</h2>
        <p
          className="font-mono text-[11px] tabular-nums text-[#8a93a8] whitespace-nowrap"
          aria-label="Lectura de seguimiento"
        >
          {isCameraActive ? `${trackingHz} Hz · ${telemetry.latencyMs} ms` : 'en espera'}
        </p>
        <button
          onClick={() => setCameraStudioOpen(false)}
          className="w-7 h-7 -mr-1 rounded-lg flex items-center justify-center text-[#8a93a8] hover:text-white hover:bg-white/[0.08] active:bg-white/[0.14] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--inst)]"
          aria-label="Cerrar estudio espacial"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ── Pestañas: texto con subrayado del color del instrumento ── */}
      <div role="tablist" aria-label="Secciones" className="flex px-2 border-y border-white/[0.07]">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2.5 text-[12.5px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--inst)] ${
                selected ? 'text-white' : 'text-[#7d869a] hover:text-[#c5cbd9]'
              }`}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={`absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-[var(--inst)] transition-opacity duration-200 ${
                  selected ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ── Contenido ── */}
      <div
        role="tabpanel"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]"
      >
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Visor 4:3 con marcas de encuadre en las esquinas */}
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isCameraActive ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transform: 'scaleX(-1)' }}
              />

              {isCameraActive && (
                <LandmarkOverlay width={640} height={480} accentColor={accent} showTrails={showTrails} />
              )}

              {/* Marcas de encuadre */}
              {[
                'top-2 left-2 border-t border-l',
                'top-2 right-2 border-t border-r',
                'bottom-2 left-2 border-b border-l',
                'bottom-2 right-2 border-b border-r',
              ].map((pos) => (
                <span
                  key={pos}
                  aria-hidden="true"
                  className={`absolute w-3.5 h-3.5 border-white/40 pointer-events-none ${pos}`}
                />
              ))}

              {/* Teclado AR: 7 teclas táctiles sobre el visor, con LED inferior */}
              {isCameraActive && (
                <div className="absolute bottom-3 inset-x-3 h-[72px] flex gap-1 z-20">
                  {AR_KEYS.map((k, idx) => (
                    <button
                      key={k.name}
                      id={`ar-key-${idx}`}
                      data-on="false"
                      aria-label={`Nota ${k.name}`}
                      onPointerDown={() => {
                        SpatialInstrumentEngine.getInstance().triggerNoteOn(idx, k.freq, 0.9);
                        setArKey(idx, true);
                      }}
                      onPointerUp={() => {
                        SpatialInstrumentEngine.getInstance().triggerNoteOff(idx);
                        setArKey(idx, false);
                      }}
                      onPointerLeave={() => {
                        SpatialInstrumentEngine.getInstance().triggerNoteOff(idx);
                        setArKey(idx, false);
                      }}
                      className="group flex-1 h-full rounded-md bg-[#0d1016]/85 border border-white/25 flex flex-col items-center justify-end gap-1.5 pb-1.5 cursor-pointer transition-[background-color,transform] duration-75 data-[on=true]:bg-[var(--inst)] data-[on=true]:translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--inst)]"
                    >
                      <span className="font-mono text-[10px] text-white/80 group-data-[on=true]:text-black">{k.name}</span>
                      <span className="w-3/5 h-[3px] rounded-full bg-[var(--inst)] opacity-40 group-data-[on=true]:opacity-100 group-data-[on=true]:bg-black/70" />
                    </button>
                  ))}
                </div>
              )}

              {/* Estado apagado */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 p-5">
                  <div>
                    <p className="text-[15px] font-semibold text-white">Cámara apagada</p>
                    <p className="text-[12.5px] text-[#8a93a8] mt-1 max-w-[30ch] leading-relaxed">
                      Enciéndela para tocar teclas, pads y theremin en el aire con la mano.
                    </p>
                  </div>
                  {cameraError && (
                    <p role="alert" className="text-[12.5px] text-[#ff8fa3] max-w-[34ch] leading-relaxed">
                      {cameraError}
                    </p>
                  )}
                  <button
                    onClick={handleToggleCamera}
                    className="h-9 px-4 rounded-lg text-[13px] font-semibold text-[#06080c] bg-[var(--inst)] hover:brightness-110 active:brightness-95 active:translate-y-px transition-[filter,transform] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Encender cámara
                  </button>
                </div>
              )}
            </div>

            {/* Fila de estado bajo el visor (fuera del video: no tapa las manos) */}
            {isCameraActive && (
              <div className="flex items-center gap-2">
                <p className="font-mono text-[11px] text-[#8a93a8] flex-1 truncate">
                  Gesto <span className="text-white">{GESTURE_LABEL[currentGesture] ?? currentGesture}</span>
                </p>
                <button
                  onClick={handleToggleCamera}
                  className="h-8 px-3 rounded-lg text-[12.5px] font-medium text-[#ff8fa3] border border-white/[0.09] hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--inst)]"
                >
                  Apagar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'instrument' && (
          <div>
            <ul role="radiogroup" aria-label="Instrumento" className="divide-y divide-white/[0.06] -mx-1">
              {INSTRUMENTS.map((it) => {
                const selected = airInstrumentType === it.id;
                return (
                  <li key={it.id}>
                    <button
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelectInstrument(it.id as InstrumentMode)}
                      className={`w-full flex items-center gap-3 px-2 py-3 rounded-lg text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--inst)] ${
                        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.035]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-[background-color,box-shadow] duration-200"
                        style={{
                          backgroundColor: selected ? it.color : '#2a3040',
                          boxShadow: selected ? `0 0 8px ${it.color}` : 'none',
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[13.5px] font-medium ${selected ? 'text-white' : 'text-[#c5cbd9]'}`}>
                          {it.name}
                        </span>
                        <span className="block text-[12px] text-[#7d869a] mt-0.5 leading-snug">{it.desc}</span>
                      </span>
                      <span className="font-mono text-[10.5px] tabular-nums text-[#7d869a] shrink-0">{it.spec}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] text-[#7d869a] mt-4 leading-relaxed max-w-[42ch]">
              {inst.hint}
            </p>
          </div>
        )}

        {activeTab === 'calibrate' && (
          <div className="mb-5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium text-white">Calibración guiada</p>
              <p className="text-[12px] text-[#7d869a] mt-0.5 leading-snug">
                Cinco pasos para ajustar profundidad y bordes del área de juego.
              </p>
            </div>
            <button
              onClick={() => setIsCalibrationOpen(true)}
              className="h-9 px-4 rounded-lg text-[13px] font-semibold text-[#06080c] bg-[var(--inst)] hover:brightness-110 active:translate-y-px transition-[filter,transform] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
            accentColor={accent}
          />
        )}
      </div>

      {/* ── Calidad: siempre visible, con modo automático para GPU integrada ── */}
      <footer className="px-4 py-3 border-t border-white/[0.07]">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-[12px] font-medium text-[#c5cbd9]">Calidad</p>
          <p className="font-mono text-[10.5px] text-[#7d869a] truncate">
            {perfMetrics.gpuClass === 'integrated' ? 'GPU integrada · ' : ''}
            {perfMetrics.qualityMode === 'auto' ? `auto → ${tierLabel}` : tierLabel}
            {perfMetrics.preferCpuVision ? ' · manos en CPU' : ''}
          </p>
        </div>
        <div role="radiogroup" aria-label="Calidad gráfica" className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-black/40">
          {QUALITY_MODES.map((q) => {
            const selected = perfMetrics.qualityMode === q.id;
            return (
              <button
                key={q.id}
                role="radio"
                aria-checked={selected}
                onClick={() => PerformanceManager.getInstance().setQualityMode(q.id)}
                className={`h-7 rounded-md text-[12px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--inst)] ${
                  selected ? 'bg-white/[0.13] text-white' : 'text-[#7d869a] hover:text-[#c5cbd9]'
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </footer>

      {/* Calibración espacial guiada */}
      <CalibrationModal isOpen={isCalibrationOpen} onClose={() => setIsCalibrationOpen(false)} />
    </aside>
  );
};

export default CameraStudioPanel;
