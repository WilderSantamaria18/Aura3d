import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Cargando...',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 border-[1.5px]',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[2.5px]',
  }[size];

  return (
    <div role="status" className={`flex items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses} border-white/20 border-t-[var(--accent-active,#00e5ff)] rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Spinner;
