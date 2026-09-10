import React from 'react';

export interface StudioBadgeProps {
  label: string;
  variant?: 'default' | 'cyan' | 'emerald' | 'amber' | 'rose';
  dot?: boolean;
  className?: string;
}

export const StudioBadge: React.FC<StudioBadgeProps> = ({
  label,
  variant = 'default',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    default: 'border-white/[0.08] text-white/50 bg-white/[0.02]',
    cyan: 'border-[#00e5ff]/30 text-[#00e5ff] bg-[#00e5ff]/10',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    rose: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
  };

  const dotStyles = {
    default: 'bg-white/50',
    cyan: 'bg-[#00e5ff]',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded border select-none ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      <span>{label}</span>
    </span>
  );
};

export default StudioBadge;
