import React from 'react';

export interface StudioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'active' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const StudioButton: React.FC<StudioButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none rounded-control font-sans tracking-tight ios-focus-ring';

  const sizeStyles = {
    sm: 'min-h-11 px-3 py-1.5 text-caption gap-1.5',
    md: 'min-h-11 px-4 py-2 text-caption gap-2',
    lg: 'min-h-11 px-5 py-2.5 text-body gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-white text-black font-semibold hover:bg-white/90 border border-white/20 shadow-sm',
    secondary:
      'bg-surface-subtle text-text-primary hover:text-text-primary hover:bg-surface-active border border-border-subtle',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-subtle border border-transparent',
    active:
      'bg-ios-teal/20 text-ios-teal border border-ios-teal/40 shadow-sm',
    danger:
      'bg-status-error/15 text-status-error border border-status-error/30 hover:bg-status-error/25',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default StudioButton;
