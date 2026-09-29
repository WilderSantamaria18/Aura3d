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
    'inline-flex items-center justify-center font-medium select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none font-sans tracking-tight ios-focus-ring';

  const sizeStyles = {
    sm: 'px-3 py-1.5 min-h-[32px] text-[11px] gap-1.5',
    md: 'px-4 py-2 min-h-[38px] text-xs gap-2',
    lg: 'px-6 py-2.5 min-h-[46px] text-sm gap-2.5',
  };

  const variantStyles = {
    primary:
      'glass-btn is-active [--glass-accent:255,255,255] text-white font-semibold',
    secondary:
      'glass-btn text-white/85 hover:text-white',
    ghost:
      'rounded-full bg-transparent text-white/60 hover:text-white hover:bg-white/[0.08] border border-transparent transition-colors',
    active:
      'glass-btn is-active text-white',
    danger:
      'glass-btn is-danger text-rose-200',
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
