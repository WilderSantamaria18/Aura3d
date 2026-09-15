import React, { useEffect, useState } from 'react';
import { Sparkles, Info, AlertTriangle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  duration?: number;
  onClose?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const colorStyles = {
    info: 'border-cyan-500/20 text-cyan-200 bg-[var(--surface-card)]',
    success: 'border-emerald-500/20 text-emerald-200 bg-[var(--surface-card)]',
    warning: 'border-rose-500/20 text-rose-200 bg-[var(--surface-card)]',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />,
    success: <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
  };

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-aura-popover">
      <div
        className={`px-4 py-3 rounded-[12px] border backdrop-blur-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-sans shadow-[var(--shadow-card)] transition-all ${colorStyles[type]}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icons[type]}
          <span className="font-medium truncate">{message}</span>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="p-1 rounded-[8px] hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Notification;
