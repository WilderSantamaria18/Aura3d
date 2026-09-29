import type { CaptureResult, CaptureSession } from '../types';

export interface CaptureEngine {
  prepare(session: CaptureSession): Promise<void>;
  /** onEnded se llama si la captura termina por sí sola (p. ej. el usuario pulsa «Dejar de compartir») */
  start(onProgress?: (elapsedSec: number) => void, onEnded?: () => void): Promise<void>;
  stop(): Promise<CaptureResult>;
  cancel(): Promise<void>;
  dispose(): Promise<void>;
}
