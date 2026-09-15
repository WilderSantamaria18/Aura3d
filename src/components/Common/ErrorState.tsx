import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocurrió un error',
  message = 'No se pudo completar la operación solicitada.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-6 rounded-[12px] border border-rose-500/25 bg-rose-500/[0.05] flex flex-col items-center text-center space-y-3 ${className}`}
    >
      <div className="w-11 h-11 rounded-[10px] bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="type-h3 text-white">{title}</h4>
        <p className="type-body text-white/70 font-sans">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs font-mono font-medium text-white btn-spring flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reintentar</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
