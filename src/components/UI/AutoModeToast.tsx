import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Sparkles, X, Bot, Palette } from 'lucide-react';

export const AutoModeToast: React.FC = () => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const autoFeedbackToast = usePlayerStore((s) => s.autoFeedbackToast);
  const setAutoFeedbackToast = usePlayerStore((s) => s.setAutoFeedbackToast);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');
  const baseColorHue = usePlayerStore((s) => s.baseColorHue || 180);
  const autoNotification = usePlayerStore((s) => s.autoNotification);
  const setAutoNotification = usePlayerStore((s) => s.setAutoNotification);

  useEffect(() => {
    if (autoFeedbackToast || autoNotification) {
      const timer = setTimeout(() => {
        setAutoFeedbackToast(false);
        setAutoNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [autoFeedbackToast, autoNotification, setAutoFeedbackToast, setAutoNotification]);

  if ((!autoFeedbackToast && !autoNotification) || !autoMode) return null;

  const message = autoNotification?.message || 'Modo Inteligente ACTIVADO: Color dinámico fluido';
  const isSuccess = autoNotification?.type === 'success';

  return (
    <div className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-sm sm:max-w-md w-[92vw] animate-aura-popover">
      <div
        className="rounded-[var(--radius-modal)] bg-[var(--surface-overlay)] backdrop-blur-2xl border border-[var(--border-medium)] p-4 sm:p-5 shadow-[var(--shadow-modal)] text-white font-sans flex flex-col gap-3 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center shadow-sm flex-shrink-0 transition-colors duration-500"
              style={{
                backgroundColor: dynamicColor,
              }}
            >
              {isSuccess ? (
                <Palette className="w-5 h-5 text-black" />
              ) : (
                <Bot className="w-5 h-5 text-black" />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 transition-colors duration-500" style={{ color: dynamicColor }} />
                {isSuccess ? 'Transición de Color' : 'Modo Inteligente ON'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                {message}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setAutoFeedbackToast(false);
              setAutoNotification(null);
            }}
            className="p-1.5 rounded-[8px] hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
            title="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Live Color Swatch Indicator */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block shadow-sm transition-colors duration-300 border border-white/20"
              style={{ backgroundColor: dynamicColor }}
            />
            <span className="font-mono text-white/90 font-tabular">Matiz Base: {Math.round(baseColorHue)}°</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider">Flujo Orgánico en Vivo</span>
        </div>
      </div>
    </div>
  );
};

export default AutoModeToast;


