import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, CheckCircle2, Hand, Sparkles, X, ChevronRight } from 'lucide-react';
import { CalibrationEngine, type CalibrationStep } from './CalibrationEngine';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<CalibrationStep>('FACE_PRESENCE');
  const [progress, setProgress] = useState(0.2);

  const engine = CalibrationEngine.getInstance();

  useEffect(() => {
    if (!isOpen) return;

    engine.start();

    const unsubscribe = engine.subscribe((newStep, newProgress) => {
      setStep(newStep);
      setProgress(newProgress);
    });

    return () => {
      unsubscribe();
      if (engine.isActive()) {
        engine.cancel();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#050710]/95 p-6 shadow-2xl backdrop-blur-xl text-white"
        >
          {/* Botón cerrar / salir */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Encabezado con HUD espacial */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <Crosshair className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-white">Calibración Espacial AURA</h2>
              <p className="text-xs text-white/50">Mapeo de volumen de interacción en tiempo real</p>
            </div>
          </div>

          {/* Barra de progreso interactiva */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white/60 mb-2 font-mono">
              <span>PROGRESO</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00e5ff] via-[#ffbd00] to-[#ff088a]"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Contenido dinámico según el paso */}
          <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
            {step === 'FACE_PRESENCE' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#00e5ff]/15 flex items-center justify-center border border-[#00e5ff]/40 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
                  <Crosshair className="h-7 w-7 text-[#00e5ff]" />
                </div>
                <h3 className="text-base font-medium">Paso 1: Posiciónate frente a la cámara</h3>
                <p className="text-xs text-white/60 max-w-xs">
                  Ubícate a unos 50-80 cm de tu webcam para calibrar la profundidad neutra del espacio.
                </p>
              </motion.div>
            )}

            {step === 'HANDS_RAISE' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#ffbd00]/15 flex items-center justify-center border border-[#ffbd00]/40 shadow-[0_0_20px_rgba(255,189,0,0.25)]">
                  <Hand className="h-7 w-7 text-[#ffbd00]" />
                </div>
                <h3 className="text-base font-medium">Paso 2: Levanta ambas manos</h3>
                <p className="text-xs text-white/60 max-w-xs">
                  Extiende las palmas hacia la cámara para medir la escala física de tus manos y calibrar el tracking.
                </p>
              </motion.div>
            )}

            {step === 'PINCH_CONFIRM' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#ff088a]/15 flex items-center justify-center border border-[#ff088a]/40 shadow-[0_0_20px_rgba(255,8,138,0.25)]">
                  <Sparkles className="h-7 w-7 text-[#ff088a]" />
                </div>
                <h3 className="text-base font-medium">Paso 3: Realiza un pellizco</h3>
                <p className="text-xs text-white/60 max-w-xs">
                  Junta el pulgar con el índice de tu mano para validar la máquina de estados de agarre con histéresis.
                </p>
              </motion.div>
            )}

            {step === 'BOUNDS_TOUCH' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-2 max-w-[200px] mx-auto py-2">
                  {engine.targets.map((t) => (
                    <div
                      key={t.id}
                      className={`h-8 rounded-lg flex items-center justify-center text-xs font-mono border transition-all ${
                        t.isConfirmed
                          ? 'bg-[#34c759]/20 border-[#34c759] text-[#34c759]'
                          : 'bg-white/5 border-white/20 text-white/60 animate-pulse'
                      }`}
                    >
                      {t.isConfirmed ? 'OK ✓' : `Punto ${t.id + 1}`}
                    </div>
                  ))}
                </div>
                <h3 className="text-base font-medium">Paso 4: Toca las 4 esquinas flotantes</h3>
                <p className="text-xs text-white/60 max-w-xs">
                  Mueve tu dedo índice hacia cada objetivo circular en tu pantalla 3D para delimitar el frustum de trabajo.
                </p>
              </motion.div>
            )}

            {step === 'COMPLETE' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#34c759]/15 flex items-center justify-center border border-[#34c759]/40 shadow-[0_0_25px_rgba(52,199,89,0.3)]">
                  <CheckCircle2 className="h-7 w-7 text-[#34c759]" />
                </div>
                <h3 className="text-base font-medium text-[#34c759]">¡Calibración Espacial Completada!</h3>
                <p className="text-xs text-white/60 max-w-xs">
                  Parámetros guardados con éxito. El espacio 3D responde ahora con máxima precisión a tus dimensiones.
                </p>
              </motion.div>
            )}
          </div>

          {/* Acciones de pie de modal */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Saltar / Usar por defecto
            </button>

            {step === 'COMPLETE' ? (
              <button
                onClick={onClose}
                className="flex items-center space-x-2 rounded-xl bg-[#34c759] px-5 py-2.5 text-xs font-semibold text-black transition-all hover:bg-[#34c759]/90 shadow-[0_0_15px_rgba(52,199,89,0.3)]"
              >
                <span>Finalizar</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="text-[11px] text-white/40 font-mono">
                SIGUIENDO INSTRUCCIONES EN VIVO...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
