import type { CaptureEngine } from '../engines/CaptureEngine';
import { SnapshotEngine } from '../engines/SnapshotEngine';
import { CanvasRecordingEngine } from '../engines/CanvasRecordingEngine';
import { ScreenRecordingEngine } from '../engines/ScreenRecordingEngine';
import { useCaptureStore } from '../store/captureStore';
import type { CaptureResult } from '../types';

class CaptureControllerClass {
  private activeEngine: CaptureEngine | null = null;
  private autoStopTimeout: ReturnType<typeof setTimeout> | null = null;

  public async takeSnapshot(): Promise<CaptureResult | null> {
    const store = useCaptureStore.getState();
    store.setStatus('preparing');
    store.setErrorMessage(null);

    const snapshotEngine = new SnapshotEngine();
    this.activeEngine = snapshotEngine;

    try {
      await snapshotEngine.prepare(store.session);
      const result = await snapshotEngine.capture();
      store.setResult(result);
      store.setStatus('ready');
      store.setMode('preview');
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CaptureController] Error en captura de foto:', msg);
      store.setErrorMessage(msg);
      store.setStatus('error');
      return null;
    } finally {
      this.activeEngine = null;
    }
  }

  public async startRecording(): Promise<boolean> {
    const store = useCaptureStore.getState();
    if (store.session.status === 'recording') {
      console.warn('[CaptureController] Ya hay una grabación en progreso.');
      return false;
    }

    store.setStatus('preparing');
    store.setErrorMessage(null);
    store.setElapsedSeconds(0);

    // Pick engine based on source mode
    if (store.session.source === 'screen_tab') {
      this.activeEngine = new ScreenRecordingEngine();
    } else {
      this.activeEngine = new CanvasRecordingEngine();
    }

    try {
      await this.activeEngine.prepare(store.session);
      await this.activeEngine.start(
        (sec) => {
          useCaptureStore.getState().setElapsedSeconds(sec);

          // Auto stop check
          const limit = useCaptureStore.getState().session.durationLimitSec;
          if (limit && sec >= limit) {
            this.stopRecording();
          }
        },
        // La captura terminó desde el navegador («Dejar de compartir»)
        () => {
          this.stopRecording();
        }
      );

      store.setStatus('recording');

      // Al grabar la pestaña, el propio estudio saldría en el video: se oculta.
      // El botón «REC» de la cabecera sigue disponible para detener.
      if (store.session.source === 'screen_tab') {
        useCaptureStore.getState().setStudioOpen(false);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CaptureController] Error al iniciar grabación:', msg);
      store.setErrorMessage(msg);
      store.setStatus('error');
      await this.cancelRecording();
      return false;
    }
  }

  public async stopRecording(): Promise<CaptureResult | null> {
    const store = useCaptureStore.getState();
    if (!this.activeEngine || store.session.status !== 'recording') {
      return null;
    }

    store.setStatus('processing');
    this.clearAutoStop();

    try {
      const result = await this.activeEngine.stop();
      store.setResult(result);
      store.setStatus('ready');
      store.setMode('preview');
      // Reabre el estudio para mostrar el resultado (pudo cerrarse durante la captura de pestaña)
      useCaptureStore.getState().setStudioOpen(true);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CaptureController] Error al detener grabación:', msg);
      store.setErrorMessage(msg);
      store.setStatus('error');
      return null;
    } finally {
      this.activeEngine = null;
    }
  }

  public async cancelRecording(): Promise<void> {
    this.clearAutoStop();
    if (this.activeEngine) {
      try {
        await this.activeEngine.cancel();
      } catch {}
      this.activeEngine = null;
    }
    const store = useCaptureStore.getState();
    store.setStatus('idle');
    store.setElapsedSeconds(0);
  }

  public downloadResult(customResult?: CaptureResult): void {
    const res = customResult || useCaptureStore.getState().result;
    if (!res) return;

    const anchor = document.createElement('a');
    anchor.href = res.url;
    anchor.download = res.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  public async dispose(): Promise<void> {
    await this.cancelRecording();
    useCaptureStore.getState().clearResult();
  }

  private clearAutoStop(): void {
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
  }
}

export const captureController = new CaptureControllerClass();
