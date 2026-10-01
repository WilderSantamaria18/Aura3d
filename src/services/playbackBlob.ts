/**
 * Blob URL del archivo local que suena ahora. Es único para toda la app (lo usan useAudioPlayer y
 * la suscripción global del motor al pasar a la siguiente pista), por eso vive aquí y no en un hook.
 */
export const activeBlobUrl: { current: string | null } = { current: null };

/** Sustituye el blob activo liberando el anterior, para no acumular memoria */
export function setActiveBlobUrl(url: string | null): void {
  if (activeBlobUrl.current && activeBlobUrl.current !== url) URL.revokeObjectURL(activeBlobUrl.current);
  activeBlobUrl.current = url;
}
