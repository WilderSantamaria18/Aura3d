import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Sparkles, X, Bot, Activity } from 'lucide-react';

export const AutoModeToast: React.FC = () => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const autoFeedbackToast = usePlayerStore((s) => s.autoFeedbackToast);
  const setAutoFeedbackToast = usePlayerStore((s) => s.setAutoFeedbackToast);
  const autoPalette = usePlayerStore((s) => s.autoPalette);

  useEffect(() => {
    if (autoFeedbackToast) {
      const timer = setTimeout(() => {
        setAutoFeedbackToast(false);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [autoFeedbackToast, setAutoFeedbackToast]);

  if (!autoFeedbackToast || !autoMode) return null;

  return (
    <div className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-sm sm:max-w-md w-[92vw] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className="rounded-3xl bg-[#080d1e]/95 backdrop-blur-2xl border-2 p-4 sm:p-5 shadow-2xl text-white font-mono flex flex-col gap-3 transition-all duration-300"
        style={{
          borderColor: autoPalette.primary,
          boxShadow: `0 0 35px ${autoPalette.primary}50, 0 20px 50px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center p-0.5 shadow-lg flex-shrink-0 animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${autoPalette.primary}, ${autoPalette.secondary})`,
              }}
            >
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: autoPalette.primary }} />
                Modo Inteligente ON
              </h3>
              <p className="text-[10px] text-white/60">
                La interfaz y visualizadores mutan con la música
              </p>
            </div>
          </div>

          <button
            onClick={() => setAutoFeedbackToast(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            title="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Color Distribution Bands */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span>Espectro Armónico Activo:</span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Activity className="w-3 h-3" /> DSP FFT en vivo
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div
              className="py-1.5 px-2 rounded-xl transition-all duration-300 shadow-sm"
              style={{ backgroundColor: autoPalette.primary, color: '#000' }}
            >
              <span className="block text-[9px] uppercase tracking-wider opacity-75">Bajos</span>
              <span className="text-[10px] font-mono">Dominante</span>
            </div>
            <div
              className="py-1.5 px-2 rounded-xl transition-all duration-300 shadow-sm"
              style={{ backgroundColor: autoPalette.secondary, color: '#000' }}
            >
              <span className="block text-[9px] uppercase tracking-wider opacity-75">Medios</span>
              <span className="text-[10px] font-mono">Cuerpo</span>
            </div>
            <div
              className="py-1.5 px-2 rounded-xl transition-all duration-300 shadow-sm"
              style={{ backgroundColor: autoPalette.accent, color: '#000' }}
            >
              <span className="block text-[9px] uppercase tracking-wider opacity-75">Agudos</span>
              <span className="text-[10px] font-mono">Acentos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoModeToast;

