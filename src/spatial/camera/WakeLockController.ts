/**
 * WakeLockController — Gestiona la API Screen Wake Lock para evitar que la pantalla
 * se apague en dispositivos móviles durante la experiencia inmersiva de cámara espacial.
 *
 * Trampa de navegador #4 de DESING_DECAMARA.md:
 * "La pantalla se apaga durante la experiencia en móvil -> Wake Lock API con re-adquisición en visibilitychange".
 */
export class WakeLockController {
  private static instance: WakeLockController | null = null;
  private wakeLock: any = null;
  private isRequested = false;

  private constructor() {
    // Re-adquirir el bloqueo si el usuario regresa a la pestaña activa
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.requestLock();
        }
      });
    }
  }

  public static getInstance(): WakeLockController {
    if (!WakeLockController.instance) {
      WakeLockController.instance = new WakeLockController();
    }
    return WakeLockController.instance;
  }

  /**
   * Solicita el bloqueo de pantalla activa
   */
  public async requestLock(): Promise<boolean> {
    this.isRequested = true;

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
      return true;
    } catch {
      // Bloqueo denegado por el navegador o batería baja
      return false;
    }
  }

  /**
   * Libera el bloqueo de pantalla al salir de la experiencia
   */
  public async releaseLock(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {
        // Ignorar
      }
      this.wakeLock = null;
    }
  }

  public isLocked(): boolean {
    return this.wakeLock !== null;
  }
}
