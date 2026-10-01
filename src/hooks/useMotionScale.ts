import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePlayerStore } from '../stores/playerStore';

/** Factor al que se reducen balanceos, torsión y apertura de FOV con movimiento reducido (la respuesta luminosa no cambia). */
export const REDUCED_MOTION_SCALE = 0.3;

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const getSnapshot = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;

/** ¿Hay que moderar el movimiento? Ajuste explícito del usuario o, si no hay, preferencia del sistema. */
export function resolveReducedMotion(userSetting: boolean | undefined, systemPrefers: boolean): boolean {
  return userSetting ?? systemPrefers;
}

/** Devuelve una ref con el factor de movimiento actual (1 = normal). Se lee dentro de los bucles de animación sin re-renderizar. */
export function useMotionScaleRef() {
  const userSetting = usePlayerStore((s) => s.blobSettings?.vizReducedMotion);
  const system = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const reduced = resolveReducedMotion(userSetting, system);
  const ref = useRef(reduced ? REDUCED_MOTION_SCALE : 1);
  useEffect(() => {
    ref.current = reduced ? REDUCED_MOTION_SCALE : 1;
  }, [reduced]);
  return ref;
}
