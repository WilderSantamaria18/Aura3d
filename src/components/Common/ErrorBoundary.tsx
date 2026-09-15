import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { telemetryService } from '../../services/telemetryService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * ErrorBoundary
 * Captura excepciones no controladas en el árbol de componentes React,
 * previniendo caídas totales de la aplicación y proporcionando una interfaz
 * de recuperación estética alineada al Design System de Aura3D.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Aura3D ErrorBoundary] Excepción no controlada:', error, errorInfo);
    this.setState({ errorInfo });
    telemetryService.captureError(error, errorInfo.componentStack || undefined);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `Aura3D Crash Report:\nError: ${error?.message || 'Unknown'}\nStack: ${error?.stack || ''}\nComponentStack: ${errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#04060d]/95 backdrop-blur-3xl text-white font-sans select-none"
        >
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-[20px] bg-[#0c101a]/90 border border-rose-500/30 shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(244,63,94,0.15)] flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Interrupción en el Entorno Visual
              </h2>
              <p className="text-xs text-white/70 font-mono">
                Se detectó una excepción en tiempo de ejecución. Tu sesión y preferencias se han preservado.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3 rounded-xl bg-black/50 border border-white/[0.08] text-left text-[11px] font-mono text-rose-300/90 overflow-x-auto max-h-32 scrollbar-thin">
                <code>{this.state.error.message}</code>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 w-full">
              <button
                onClick={this.handleCopyDetails}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-white/80 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Diagnóstico</span>
                  </>
                )}
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-white text-black font-semibold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
