import React from 'react';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 rounded-[12px] border border-white/[0.08] bg-white/[0.02] flex flex-col items-center text-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-[12px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-xs">
        <h4 className="type-h3 text-white">{title}</h4>
        {description && (
          <p className="type-body text-white/60 font-sans">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs font-mono font-medium text-white btn-spring cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
