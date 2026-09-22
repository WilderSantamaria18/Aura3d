import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const StudioModal: React.FC<StudioModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  headerRight,
  children,
  maxWidth = '2xl',
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xl pointer-events-auto select-none font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-modal-title"
      aria-describedby={subtitle ? 'studio-modal-desc' : undefined}
    >
      <div
        className={`liquid-glass liquid-glass--modal w-full max-w-[calc(100vw-1.5rem)] ${maxWidthStyles[maxWidth]} relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 ${className}`}
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-[10px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-cyan-400 shadow-sm flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 id="studio-modal-title" className="text-white font-bold text-sm sm:text-base tracking-tight">
                  {title}
                </h2>
                {badge && (
                  <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300 font-bold uppercase">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p id="studio-modal-desc" className="text-white/65 text-[11px] font-mono tracking-wider mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-white/60 hover:text-white rounded-[8px] hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pt-3.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudioModal;
