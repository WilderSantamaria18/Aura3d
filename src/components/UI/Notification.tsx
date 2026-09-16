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
    info: 'border-ios-teal/30 text-ios-teal bg-surface-overlay',
    success: 'border-status-success/30 text-status-success bg-surface-overlay',
    warning: 'border-status-warning/30 text-status-warning bg-surface-overlay',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-ios-teal flex-shrink-0" />,
    success: <Sparkles className="w-4 h-4 text-status-success flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />,
  };

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-aura-popover">
      <div
        className={`px-4 py-3 rounded-control border material-thin flex items-center justify-between gap-3 text-caption font-sans shadow-[var(--shadow-card)] transition-all ${colorStyles[type]}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icons[type]}
          <span className="font-medium truncate text-text-primary">{message}</span>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="min-h-11 min-w-11 rounded-control hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors flex items-center justify-center flex-shrink-0"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Notification;
