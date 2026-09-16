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
    default: 'border-border-subtle text-text-tertiary bg-surface-subtle',
    cyan: 'border-ios-teal/30 text-ios-teal bg-ios-teal/10',
    emerald: 'border-status-success/30 text-status-success bg-status-success/10',
    amber: 'border-status-warning/30 text-status-warning bg-status-warning/10',
    rose: 'border-status-error/30 text-status-error bg-status-error/10',
  };

  const dotStyles = {
    default: 'bg-text-tertiary',
    cyan: 'bg-ios-teal',
    emerald: 'bg-status-success',
    amber: 'bg-status-warning',
    rose: 'bg-status-error',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-caption font-mono tracking-wider uppercase px-2 py-0.5 rounded-badge border select-none ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      <span>{label}</span>
    </span>
  );
};

export default StudioBadge;
