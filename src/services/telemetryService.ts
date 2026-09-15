/**
 * telemetryService.ts
 * Servicio de telemetría, observabilidad y reporte de errores en producción (Sentry / Plausible compatible)
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

class TelemetryService {
  private static instance: TelemetryService;
  private isEnabled: boolean = import.meta.env.PROD;

  private constructor() {
    this.initGlobalHandlers();
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private initGlobalHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message));
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason))
        );
      });
    }
  }

  public captureError(error: Error, componentStack?: string) {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    if (this.isEnabled) {
      // Envío de telemetría en producción si Sentry / endpoint está configurado
      try {
        if ('sendBeacon' in navigator) {
          navigator.sendBeacon(
            '/api/telemetry/errors',
            JSON.stringify(report)
          );
        }
      } catch {
        // Fallback silencioso
      }
    } else {
      console.debug('[TelemetryService] Error capturado en dev:', report);
    }
  }

  public trackEvent(eventName: string, props?: Record<string, unknown>) {
    if (this.isEnabled && typeof window !== 'undefined') {
      // @ts-expect-error - Plausible global tracker if present
      if (typeof window.plausible === 'function') {
        // @ts-expect-error - Call Plausible
        window.plausible(eventName, { props });
      }
    }
  }
}

export const telemetryService = TelemetryService.getInstance();
