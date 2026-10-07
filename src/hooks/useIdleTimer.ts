import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
/** Píxeles mínimos para contar un mousemove: el navegador emite movimientos sintéticos al cambiar la UI bajo el cursor */
const MOVE_THRESHOLD = 4;

interface IdleTimerOptions {
  /** Milisegundos sin actividad antes de declarar inactividad */
  timeout: number;
  /** Con `false` se cancela el temporizador y se notifica «activo» */
  enabled: boolean;
  onIdleChange: (idle: boolean) => void;
}

/**
 * Detecta inactividad del usuario (ratón, teclado, táctil, rueda).
 * No guarda estado React: avisa solo cuando cambia, así los movimientos del ratón no re-renderizan nada.
 */
export function useIdleTimer({ timeout, enabled, onIdleChange }: IdleTimerOptions): void {
  const callbackRef = useRef(onIdleChange);
  callbackRef.current = onIdleChange;

  useEffect(() => {
    if (!enabled) {
      callbackRef.current(false);
      return;
    }

    let idle = false;
    let timer: number | undefined;
    let lastX = NaN;
    let lastY = NaN;

    const setIdle = (next: boolean) => {
      if (idle === next) return;
      idle = next;
      callbackRef.current(next);
    };
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), timeout);
    };
    const onActivity = (e: Event) => {
      if (e.type === 'mousemove') {
        const m = e as MouseEvent;
        const moved = Number.isNaN(lastX) || Math.hypot(m.clientX - lastX, m.clientY - lastY) >= MOVE_THRESHOLD;
        if (!moved) return;
        lastX = m.clientX;
        lastY = m.clientY;
      }
      setIdle(false);
      arm();
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    setIdle(false);
    arm();

    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [enabled, timeout]);
}
