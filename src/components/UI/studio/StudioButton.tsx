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
    'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer active:scale-98 disabled:opacity-40 disabled:pointer-events-none rounded-xl';

  const sizeStyles = {
    sm: 'px-2 py-1 text-[10px] gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-white text-black font-semibold hover:bg-neutral-200 border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.5)]',
    secondary:
      'bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] border border-white/[0.08]',
    ghost:
      'bg-transparent text-white/50 hover:text-white hover:bg-white/[0.04] border border-transparent',
    active:
      'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)]',
    danger:
      'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
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
