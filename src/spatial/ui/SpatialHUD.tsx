import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Box,
  Sparkles,
  Eye,
  EyeOff,
  SunMedium,
  Crosshair,
  LogOut,
} from 'lucide-react';
import { SpatialState } from '../state/SpatialState';
import { PerformanceManager, type PerformanceMetrics } from '../performance/PerformanceManager';
import { WakeLockController } from '../camera/WakeLockController';
import { SpatialVisionService } from '../../services/spatialVisionService';
import { SpatialInstrumentEngine } from '../instruments/SpatialInstrumentEngine';
import type { InstrumentId } from '../instruments/types';
import { usePlayerStore } from '../../stores/playerStore';

interface SpatialHUDProps {
  onOpenCalibration?: () => void;
  onExit?: () => void;
}

export const SpatialHUD: React.FC<SpatialHUDProps> = ({ onOpenCalibration, onExit }) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeMode, setActiveMode] = useState<'synth' | 'drums' | 'theremin' | 'manipulate'>('synth');
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId>('piano');
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>(() =>
    PerformanceManager.getInstance().getMetrics()
  );
  const [isLocked, setIsLocked] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Refs de telemetría holográfica (actualización a 60fps sin re-renderizar React)
  const pinchCircleRef = useRef<SVGCircleElement>(null);
  const pinchPercentRef = useRef<HTMLSpanElement>(null);
  const gestureLabelRef = useRef<HTMLSpanElement>(null);
  const gestureDotRef = useRef<HTMLSpanElement>(null);
  const depthLabelRef = useRef<HTMLSpanElement>(null);

  const handleCleanExit = useCallback(() => {
    SpatialVisionService.getInstance().destroy();
    SpatialState.getInstance().setCameraRunning(false);
    SpatialState.getInstance().resetHands();
    usePlayerStore.getState().setCameraStudioOpen(false);
    usePlayerStore.getState().setAirInstrumentsActive(false);
    SpatialInstrumentEngine.getInstance().cleanup();
    onExit?.();
  }, [onExit]);

  useEffect(() => {
    const unsubPerf = PerformanceManager.getInstance().subscribe(setPerfMetrics);

    const unsubDiscrete = SpatialState.getInstance().subscribeDiscrete(() => {
      setIsCameraActive(SpatialState.getInstance().isCameraRunning);
    });

    const timer = setInterval(() => {
      setIsLocked(WakeLockController.getInstance().isLocked());
    }, 1500);

    // Atajos de teclado: 'G' para Modo Zen, 'Escape' para salir
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        setIsZenMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        handleCleanExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubPerf();
      unsubDiscrete();
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCleanExit]);

  // Frame Loop de Telemetría Holográfica (0 lag, 60fps direct DOM manipulation)
  useEffect(() => {
    if (!isCameraActive) return;

    let animId: number;
    const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 14;

    const updateTelemetry = () => {
      const spatialState = SpatialState.getInstance();
      const domHand = spatialState.getDominantHand();

      if (domHand.isPresent && domHand.confidenceTier !== 'untrusted') {
        const pinch = domHand.pinchProgress ?? 0;
        const clampedPinch = Math.min(1, Math.max(0, pinch));
        const offset = CIRCLE_CIRCUMFERENCE * (1 - clampedPinch);

        if (pinchCircleRef.current) {
          pinchCircleRef.current.style.strokeDashoffset = `${offset}`;
          pinchCircleRef.current.style.stroke =
            clampedPinch >= 0.8
              ? '#34d399'
              : clampedPinch > 0.35
              ? '#00e5ff'
              : 'rgba(255,255,255,0.35)';
        }
        if (pinchPercentRef.current) {
          pinchPercentRef.current.textContent = `${Math.round(clampedPinch * 100)}%`;
        }
        if (gestureLabelRef.current && gestureDotRef.current) {
          const pinchState = domHand.pinchState;
          const gesture = domHand.gesture;
          const isPointing = domHand.isPointing;

          if (pinchState === 'PINCH_HOLD' || pinchState === 'PINCH_MOVE' || gesture === 'pinch') {
            gestureLabelRef.current.textContent = 'PELLIZCO';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]';
            gestureDotRef.current.className =
              'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
          } else if (pinchState === 'PINCH_START' || pinchState === 'PINCH_END') {
            gestureLabelRef.current.textContent = 'CONTACTO';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]';
            gestureDotRef.current.className =
              'w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]';
          } else if (isPointing || gesture === 'pointing') {
            gestureLabelRef.current.textContent = 'APUNTANDO';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-semibold text-sky-300';
            gestureDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-sky-400';
          } else if (gesture === 'open') {
            gestureLabelRef.current.textContent = 'PALMA';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-semibold text-purple-300';
            gestureDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-purple-400';
          } else if (gesture === 'fist') {
            gestureLabelRef.current.textContent = 'PUÑO';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-semibold text-amber-400';
            gestureDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
          } else {
            gestureLabelRef.current.textContent = 'MANO ACTIVA';
            gestureLabelRef.current.className =
              'text-[10px] font-mono uppercase tracking-wider font-normal text-white/70';
            gestureDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-white/50';
          }
        }
        if (depthLabelRef.current) {
          const relZ = Math.round((domHand.worldIndexTip.z - 3.4) * 100);
          depthLabelRef.current.textContent = `Z: ${relZ > 0 ? '+' : ''}${relZ} cm`;
        }
      } else {
        if (pinchCircleRef.current) {
          pinchCircleRef.current.style.strokeDashoffset = `${CIRCLE_CIRCUMFERENCE}`;
          pinchCircleRef.current.style.stroke = 'rgba(255,255,255,0.2)';
        }
        if (pinchPercentRef.current) pinchPercentRef.current.textContent = '--';
        if (gestureLabelRef.current) {
          gestureLabelRef.current.textContent = 'BUSCANDO';
          gestureLabelRef.current.className =
            'text-[10px] font-mono uppercase tracking-wider text-white/40';
        }
        if (gestureDotRef.current) gestureDotRef.current.className = 'w-1.5 h-1.5 rounded-full bg-white/20';
        if (depthLabelRef.current) depthLabelRef.current.textContent = 'Z: --';
      }

      animId = requestAnimationFrame(updateTelemetry);
    };

    animId = requestAnimationFrame(updateTelemetry);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive]);

  const handleModeChange = (mode: 'synth' | 'drums' | 'theremin' | 'manipulate') => {
    setActiveMode(mode);
    SpatialState.getInstance().setMode(mode);
  };

  const handleInstrumentChange = (inst: InstrumentId) => {
    setActiveInstrument(inst);
    SpatialInstrumentEngine.getInstance().setInstrument(inst);
  };

  if (!isCameraActive) return null;

  return (
    <>
      {/* Botón flotante para restaurar HUD en Modo Zen */}
      {isZenMode && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          onClick={() => setIsZenMode(false)}
          className="fixed top-5 left-5 z-[90] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-white/80 text-xs font-mono backdrop-blur-md cursor-pointer hover:bg-black/90 transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span>Salir de Modo Zen (G)</span>
        </motion.button>
      )}

      {/* Barra de HUD Espacial Superior (Apple visionOS Floating Island) */}
      <AnimatePresence>
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              e.currentTarget.style.setProperty('--hud-mx', `${x.toFixed(1)}%`);
              e.currentTarget.style.setProperty('--hud-my', `${y.toFixed(1)}%`);
            }}
            className="fixed top-4 inset-x-0 mx-auto max-w-fit z-[80] flex items-center gap-2 p-1.5 rounded-[22px] visionos-window text-white select-none pointer-events-auto"
          >
            {/* Selector de Modo con Platters visionOS */}
            <div className="flex items-center gap-1 p-0.5 rounded-[16px] bg-white/[0.03] border border-white/[0.06]">
              {[
                { id: 'synth', label: 'Instrumentos', icon: Music },
                { id: 'manipulate', label: 'Object Lab', icon: Box },
                { id: 'theremin', label: 'Theremin', icon: Sparkles },
              ].map((m) => {
                const isSelected = activeMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id as any)}
                    className={`visionos-platter flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      isSelected ? 'is-active' : ''
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cápsula Holográfica visionOS de Gestos */}
            <div className="h-4 w-px bg-white/15 mx-0.5" />
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[14px] bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
              {/* Circular Pinch Gauge SVG con Pulso Híbrido */}
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                  <circle
                    ref={pinchCircleRef}
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 14}
                    strokeDashoffset={2 * Math.PI * 14}
                    strokeLinecap="round"
                  />
                </svg>
                <span ref={pinchPercentRef} className="absolute text-[8px] font-mono font-bold text-white tabular-nums">0%</span>
              </div>
              {/* Gesto Badge & Profundidad Z */}
              <div className="flex flex-col min-w-[76px] leading-tight">
                <div className="flex items-center gap-1.5">
                  <span ref={gestureDotRef} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span ref={gestureLabelRef} className="text-[10px] font-mono uppercase tracking-wider font-semibold text-white/80">REPOSO</span>
                </div>
                <span ref={depthLabelRef} className="text-[9px] font-mono text-white/40 tabular-nums">Z: --</span>
              </div>
            </div>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            {/* Badges de Telemetría de Rendimiento */}
            <div className="flex items-center gap-2 px-1.5 text-[11px] font-mono text-white/70">
              <span className="text-white font-bold tabular-nums">{perfMetrics.fps} FPS</span>
              <span className="text-white/30">•</span>
              <button
                onClick={() => {
                  const current = perfMetrics.currentTier;
                  const nextTier = current === 'HIGH' ? 'MEDIUM' : current === 'MEDIUM' ? 'LOW' : 'HIGH';
                  PerformanceManager.getInstance().setTier(nextTier);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-102 active:scale-97 ${
                  perfMetrics.currentTier === 'HIGH'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : perfMetrics.currentTier === 'MEDIUM'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
                title="Calidad Espacial (Haz click para alternar LOW / MEDIUM / HIGH)"
              >
                {perfMetrics.currentTier}
              </button>

              {isLocked && (
                <span title="Wake Lock Activo" className="text-amber-400 flex items-center">
                  <SunMedium className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-white/15 mx-0.5" />

            {/* Acciones Rápidas con Platters visionOS */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenCalibration}
                className="visionos-platter flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/80 cursor-pointer"
                title="Calibrar espacio 3D"
              >
                <Crosshair className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="hidden sm:inline">Calibrar</span>
              </button>

              <button
                onClick={() => setIsZenMode(true)}
                className="visionos-platter p-1.5 text-white/60 hover:text-white cursor-pointer"
                title="Modo Zen (G)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCleanExit}
                className="visionos-platter p-1.5 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                title="Salir (Esc)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ornamento Flotante Desprendido (Apple visionOS Detached Ornament para Instrumentos) */}
      <AnimatePresence>
        {!isZenMode && activeMode === 'synth' && (
          <motion.div
            key="hud-ornament-synth"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[68px] inset-x-0 mx-auto max-w-fit z-[79] flex items-center gap-1.5 px-3 py-1.5 visionos-ornament select-none pointer-events-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 pl-1 pr-1 font-medium">Timbre 3D</span>
            {[
              { id: 'piano', label: 'Piano' },
              { id: 'guitar', label: 'Guitarra' },
              { id: 'violin', label: 'Violín' },
            ].map((inst) => {
              const isCurrent = activeInstrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => handleInstrumentChange(inst.id as any)}
                  className={`visionos-platter px-3 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                    isCurrent ? 'is-active font-semibold' : ''
                  }`}
                >
                  {inst.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
