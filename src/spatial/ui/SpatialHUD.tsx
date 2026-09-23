import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Box,
  Sparkles,
  Layers,
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
  }, []);

  const handleCleanExit = () => {
    SpatialVisionService.getInstance().stopCamera();
    SpatialState.getInstance().setCameraRunning(false);
    SpatialState.getInstance().resetHands();
    onExit?.();
  };

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

      {/* Barra de HUD Espacial Superior */}
      <AnimatePresence>
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 inset-x-0 mx-auto max-w-fit z-[80] flex items-center gap-2 p-1.5 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 shadow-2xl text-white select-none pointer-events-auto"
          >
            {/* Selector de Modo */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.04]">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-selector de Instrumentos (Sprint 9: Piano / Guitarra / Violín) */}
            {activeMode === 'synth' && (
              <>
                <div className="h-4 w-px bg-white/15 mx-0.5" />
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.04]">
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
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white/20 text-white font-bold border border-white/30 shadow-sm'
                            : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {inst.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Badges de Telemetría */}
            <div className="flex items-center gap-2 px-2 text-[11px] font-mono text-white/70">
              <span className="text-white font-bold">{perfMetrics.fps} FPS</span>
              <span className="text-white/30">•</span>
              <button
                onClick={() => {
                  const current = perfMetrics.currentTier;
                  const nextTier = current === 'HIGH' ? 'MEDIUM' : current === 'MEDIUM' ? 'LOW' : 'HIGH';
                  PerformanceManager.getInstance().setTier(nextTier);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
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

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Acciones Rápidas */}
            <button
              onClick={onOpenCalibration}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Calibrar espacio 3D"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="hidden sm:inline">Calibrar</span>
            </button>

            <button
              onClick={() => setIsZenMode(true)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Modo Zen (G)"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            <button
              onClick={handleCleanExit}
              className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
              title="Salir (Esc)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
