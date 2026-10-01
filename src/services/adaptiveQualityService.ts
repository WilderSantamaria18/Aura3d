/**
 * Muestreador de FPS que aplica la calidad adaptativa. Un único bucle de requestAnimationFrame
 * para toda la app; la decisión en sí vive en utils/adaptiveQuality.ts (pura y probada).
 */
import { usePlayerStore } from '../stores/playerStore';
import { FrameRateMeter, initialAdaptiveState, stepAdaptiveQuality } from '../utils/adaptiveQuality';

/** Cada cuánto se evalúa la medición (no hace falta decidir en cada fotograma) */
const EVALUATE_EVERY_MS = 500;

let dispose: (() => void) | null = null;

export function installAdaptiveQuality(): () => void {
  if (dispose) return dispose;
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return () => {};

  const meter = new FrameRateMeter();
  let state = initialAdaptiveState(performance.now());
  let lastFrame = 0;
  let lastEvaluation = 0;
  let raf = 0;

  /** Empezar de cero: sin muestras ni contadores, y un nuevo periodo de enfriamiento */
  const reset = () => {
    meter.reset();
    state = initialAdaptiveState(performance.now());
    lastFrame = 0;
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (lastFrame) meter.push(now - lastFrame);
    lastFrame = now;
    if (now - lastEvaluation < EVALUATE_EVERY_MS) return;
    lastEvaluation = now;

    const s = usePlayerStore.getState();
    // Solo se mide con la sesión empezada: la landing y la carga inicial no representan el uso real
    if (!s.autoQuality || !s.hasStarted) return;

    const fps = meter.fps();
    if (fps === null) return;

    const next = stepAdaptiveQuality(state, fps, now, s.performanceTier, s.autoTierCap);
    state = next.state;
    if (next.cap !== s.autoTierCap) {
      console.info(`[calidad automática] ${s.autoTierCap} → ${next.cap} (${Math.round(fps)} FPS)`);
      s.setAutoTierCap(next.cap);
      meter.reset(); // los FPS anteriores pertenecen al nivel viejo
    }
  };

  // Al volver de otra pestaña los intervalos no representan el rendimiento real
  const onVisibility = () => {
    if (!document.hidden) reset();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Cambios que invalidan lo medido: empieza la sesión, se activa/desactiva el modo, o se elige nivel
  const unsubscribe = usePlayerStore.subscribe((state2, prev) => {
    if (
      state2.hasStarted !== prev.hasStarted ||
      state2.autoQuality !== prev.autoQuality ||
      state2.performanceTier !== prev.performanceTier
    ) {
      reset();
    }
  });

  raf = requestAnimationFrame(loop);

  dispose = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    unsubscribe();
    dispose = null;
  };
  return dispose;
}
