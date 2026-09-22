import React from 'react';

interface GlassBadgeProps {
  label: string;
  ledColor?: 'green' | 'cyan' | 'magenta' | 'amber';
  icon?: React.ReactNode;
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  label,
  ledColor = 'green',
  icon,
  className = '',
}) => {
  const ledStyles: Record<string, string> = {
    green: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.85)]',
    magenta: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.85)]',
    amber: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]',
  };

  return (
    <div className={`landing-v2-badge ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ledStyles[ledColor] || ledStyles.green} animate-pulse`} />
      {icon && <span className="text-white/60">{icon}</span>}
      <span className="font-mono tracking-wider text-[10px] text-white/80">{label}</span>
    </div>
  );
};
