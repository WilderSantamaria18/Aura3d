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
    info: 'border-cyan-400/50 text-cyan-200 bg-[#090e1c]/95 shadow-[0_0_35px_rgba(0,242,254,0.35)]',
    success: 'border-emerald-400/50 text-emerald-200 bg-[#06140e]/95 shadow-[0_0_35px_rgba(57,255,20,0.35)]',
    warning: 'border-pink-400/50 text-pink-200 bg-[#140610]/95 shadow-[0_0_35px_rgba(255,8,138,0.35)]',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-cyan-400 animate-pulse flex-shrink-0" />,
    success: <Sparkles className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-pink-400 animate-pulse flex-shrink-0" />,
  };

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-lg w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`px-5 py-3 rounded-2xl border-2 backdrop-blur-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-mono shadow-2xl transition-all ${colorStyles[type]}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icons[type]}
          <span className="font-semibold truncate">{message}</span>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Notification;
