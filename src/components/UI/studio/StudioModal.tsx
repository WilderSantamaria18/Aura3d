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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md pointer-events-auto select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.85)] relative flex flex-col max-h-[90vh] overflow-hidden bg-[#090d18] ${className}`}
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#00e5ff]">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-medium text-sm sm:text-base tracking-wide">
                  {title}
                </h2>
                {badge && (
                  <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.02] text-white/50 uppercase">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-white/40 text-[11px] font-mono tracking-wider mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 scrollbar-thin scrollbar-thumb-white/10 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudioModal;
