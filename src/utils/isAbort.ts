/** true si el error es una cancelación (AbortError), no un fallo real */
export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';
