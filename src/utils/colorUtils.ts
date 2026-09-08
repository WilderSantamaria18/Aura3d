/**
 * Zero-dependency Color Utilities
 * Replaces Three.js Color class in UI/theme calculations to decouple the main bundle from Three.js.
 */

function euclideanModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function hue2rgb(p: number, q: number, t: number): number {
  let v = t;
  if (v < 0) v += 1;
  if (v > 1) v -= 1;
  if (v < 1 / 6) return p + (q - p) * 6 * v;
  if (v < 1 / 2) return q;
  if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
  return p;
}

/**
 * Converts HSL coordinates (each in [0, 1]) to a 6-character hex color string (#rrggbb).
 * Exact match for THREE.Color.setHSL().
 */
export function hslToHex(h: number, s: number, l: number): string {
  const wrappedHue = euclideanModulo(h, 1);
  const clampedS = Math.max(0, Math.min(1, s));
  const clampedL = Math.max(0, Math.min(1, l));

  let r: number, g: number, b: number;
  if (clampedS === 0) {
    r = g = b = clampedL;
  } else {
    const p = clampedL <= 0.5 ? clampedL * (1 + clampedS) : clampedL + clampedS - clampedL * clampedS;
    const q = 2 * clampedL - p;
    r = hue2rgb(p, q, wrappedHue + 1 / 3);
    g = hue2rgb(p, q, wrappedHue);
    b = hue2rgb(p, q, wrappedHue - 1 / 3);
  }

  const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
  const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
  const bHex = Math.round(b * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

/**
 * Multiplies an RGB hex color by a scalar value (e.g. 0.06 to darken for background).
 * Exact match for new THREE.Color(hex).multiplyScalar(factor).
 */
export function multiplyHexColor(hex: string, scalar: number): string {
  const clean = hex.replace('#', '');
  const expanded =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);

  const num = parseInt(expanded, 16);
  if (isNaN(num)) return '#000000';

  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * scalar)));
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * scalar)));
  const b = Math.min(255, Math.max(0, Math.round((num & 255) * scalar)));

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

