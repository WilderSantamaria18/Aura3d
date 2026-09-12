/**
 * Backend Capabilities Detection
 * 
 * Determina si el entorno actual dispone de un backend con yt-dlp para streaming nativo Web Audio,
 * o si está en un entorno serverless (ej. Vercel) que debe utilizar directamente el reproductor
 * oficial de YouTube sin realizar peticiones fallidas que generen errores 503 en la consola.
 */

let cachedHasNativeBackend: boolean | null = null;
let checkPromise: Promise<boolean> | null = null;

export async function hasNativeStreamBackend(): Promise<boolean> {
  if (cachedHasNativeBackend !== null) {
    return cachedHasNativeBackend;
  }

  // Detección rápida de Vercel por hostname
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Si estamos en *.vercel.app o dominio de producción sin backend configurado
    if (host.includes('vercel.app')) {
      const envBackend = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_BACKEND_URL;
      if (!envBackend) {
        cachedHasNativeBackend = false;
        return false;
      }
    }
  }

  if (checkPromise) {
    return checkPromise;
  }

  checkPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/youtube/stream?check=1', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        cachedHasNativeBackend = Boolean(data.hasBackend);
      } else {
        cachedHasNativeBackend = false;
      }
    } catch {
      // Si la consulta falla o da timeout, asumir modo seguro (iframe)
      cachedHasNativeBackend = false;
    }
    return cachedHasNativeBackend;
  })();

  return checkPromise;
}

/**
 * Retorna de forma síncrona si se debe usar YouTube Iframe por defecto.
 * En Vercel (*.vercel.app) retorna true inmediatamente para evitar cualquier petición HEAD 503.
 */
export function isVercelDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app');
}
