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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-surface-scrim material-regular pointer-events-auto select-none font-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-modal-title"
      aria-describedby={subtitle ? 'studio-modal-desc' : undefined}
    >
      <div
        className={`w-full max-w-[calc(100vw-1.5rem)] ${maxWidthStyles[maxWidth]} border border-border-subtle rounded-modal p-4 sm:p-6 shadow-[var(--shadow-modal)] relative flex flex-col max-h-[90vh] overflow-hidden bg-surface-overlay material-thick animate-in zoom-in-95 duration-150 ${className}`}
        style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-ios-teal shadow-sm flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 id="studio-modal-title" className="text-text-primary font-bold text-sm sm:text-base tracking-tight">
                  {title}
                </h2>
                {badge && (
                  <span className="text-caption font-mono tracking-wider px-2 py-0.5 rounded-badge border border-ios-teal/30 bg-ios-teal/15 text-ios-teal font-bold uppercase">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p id="studio-modal-desc" className="text-text-tertiary text-caption font-mono tracking-wider mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="min-h-11 min-w-11 flex items-center justify-center text-text-tertiary hover:text-text-primary rounded-control hover:bg-surface-subtle transition-colors cursor-pointer"
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
