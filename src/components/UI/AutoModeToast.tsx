import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Sparkles, X, Brain, Palette } from 'lucide-react';

export const AutoModeToast: React.FC = () => {
  const autoMode = usePlayerStore((s) => s.autoMode);
  const autoFeedbackToast = usePlayerStore((s) => s.autoFeedbackToast);
  const setAutoFeedbackToast = usePlayerStore((s) => s.setAutoFeedbackToast);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || 'var(--ios-teal)');
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

  const rawMessage = autoNotification?.message || 'Modo Inteligente ACTIVADO: Color dinámico fluido';
  const cleanMessage = rawMessage.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  const isSuccess = autoNotification?.type === 'success';

  return (
    <div className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-sm sm:max-w-md w-[92vw] animate-aura-popover">
      <div
        className="rounded-card bg-surface-overlay material-thin border border-border-subtle p-4 sm:p-5 shadow-[var(--shadow-modal)] text-text-primary font-sans flex flex-col gap-3 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-control flex items-center justify-center shadow-sm flex-shrink-0 transition-colors duration-500 bg-ios-teal/20 text-ios-teal border border-ios-teal/40"
            >
              {isSuccess ? (
                <Palette className="w-5 h-5 text-ios-teal" />
              ) : (
                <Brain className="w-5 h-5 text-ios-teal" />
              )}
            </div>
            <div>
              <h3 className="text-caption font-semibold tracking-tight text-text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ios-teal transition-colors duration-500" />
                {isSuccess ? 'Transición de Color' : 'Modo Inteligente ON'}
              </h3>
              <p className="text-caption text-text-secondary font-medium">
                {cleanMessage}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setAutoFeedbackToast(false);
              setAutoNotification(null);
            }}
            className="min-h-11 min-w-11 rounded-control hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors flex items-center justify-center"
            title="Cerrar notificación"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Live Color Swatch Indicator */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-caption text-text-tertiary">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block shadow-sm transition-colors duration-300 border border-border-subtle"
              style={{ backgroundColor: dynamicColor }}
            />
            <span className="font-mono text-text-primary font-tabular">Matiz Base: {Math.round(baseColorHue)}°</span>
          </div>
          <span className="text-caption uppercase tracking-wider">Flujo Orgánico en Vivo</span>
        </div>
      </div>
    </div>
  );
};

export default AutoModeToast;
