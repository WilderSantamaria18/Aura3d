/**
 * Color seguro para los efectos de canvas.
 *
 * Varios efectos construían colores con `${color}55` (alfa pegado como sufijo hex). Eso solo vale para
 * `#rrggbb`: con `rgb()`/`hsl()` el resultado es un color inválido y `addColorStop` LANZA una excepción,
 * que interrumpe el bucle de animación y congela el visualizador. `withAlpha` devuelve siempre una
 * cadena válida.
 */

type RGB = [number, number, number];

const FALLBACK: RGB = [255, 255, 255];

export function parseColor(input: string | undefined | null): RGB {
  if (!input) return FALLBACK;
  const c = input.trim();

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    let h: string;
    if (hex.length === 3 || hex.length === 4) h = hex.slice(0, 3).split('').map((x) => x + x).join('');
    else if (hex.length === 6 || hex.length === 8) h = hex.slice(0, 6);
    else return FALLBACK;
    const n = parseInt(h, 16);
    return Number.isNaN(n) ? FALLBACK : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgb = c.match(/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i);
  if (rgb) return [Math.round(+rgb[1]), Math.round(+rgb[2]), Math.round(+rgb[3])];

  const hsl = c.match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?[,\s]+(\d+(?:\.\d+)?)%[,\s]+(\d+(?:\.\d+)?)%/i);
  if (hsl) {
    const h = (((+hsl[1] % 360) + 360) % 360) / 360;
    const s = Math.min(1, +hsl[2] / 100);
    const l = Math.min(1, +hsl[3] / 100);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      const a = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))));
    };
    return [f(0), f(8), f(4)];
  }

  return FALLBACK;
}

/** `rgba(r,g,b,a)` válido para cualquier color de entrada (hex, rgb, hsl); blanco si no se reconoce. */
export function withAlpha(color: string | undefined | null, alpha: number): string {
  const [r, g, b] = parseColor(color);
  const a = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 0));
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
