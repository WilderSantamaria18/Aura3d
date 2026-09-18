import { useState, useEffect } from 'react';

export interface MousePosition {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  clientX: number;
  clientY: number;
}

/**
 * useMousePosition
 * Hook ultra-liviano para iluminación ambiental reactiva estilo Apple visionOS.
 * Normaliza las coordenadas a rango [0, 1] y utiliza rAF para evitar jank o reflows.
 */
export const useMousePosition = (): MousePosition => {
  const [mousePos, setMousePos] = useState<MousePosition>({
    x: 0.5,
    y: 0.5,
    clientX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    clientY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });

  useEffect(() => {
    let frameId: number | null = null;
    let latestE: MouseEvent | null = null;

    const update = () => {
      if (latestE) {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        setMousePos({
          x: Math.max(0, Math.min(1, latestE.clientX / w)),
          y: Math.max(0, Math.min(1, latestE.clientY / h)),
          clientX: latestE.clientX,
          clientY: latestE.clientY,
        });
      }
      frameId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      latestE = e;
      if (!frameId) {
        frameId = requestAnimationFrame(update);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return mousePos;
};

export default useMousePosition;
