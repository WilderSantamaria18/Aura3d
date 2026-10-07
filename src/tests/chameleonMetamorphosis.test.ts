import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseHex,
  interpolateHex,
  parseRgba,
  interpolateRgba,
  easeInOutCubic,
  interpolatePalette,
  DEFAULT_PALETTE,
  type ChameleonPalette,
} from '../services/chameleonPaletteService';

describe('Chameleon Metamorphosis & Palette Interpolation', () => {
  it('parseHex parses 3 and 6 digit hex colors into RGB', () => {
    expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHex('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseHex('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('interpolateHex smoothly blends hex colors at various intervals', () => {
    const start = '#000000';
    const end = '#ffffff';

    expect(interpolateHex(start, end, 0)).toBe('#000000');
    expect(interpolateHex(start, end, 1)).toBe('#ffffff');
    const mid = interpolateHex(start, end, 0.5);
    expect(mid).toBe('#808080');
  });

  it('parseRgba parses rgba and rgb strings properly', () => {
    const parsed = parseRgba('rgba(10, 20, 30, 0.5)');
    expect(parsed.r).toBe(10);
    expect(parsed.g).toBe(20);
    expect(parsed.b).toBe(30);
    expect(parsed.a).toBe(0.5);
  });

  it('interpolateRgba blends RGB components and alpha smoothly', () => {
    const colA = 'rgba(0, 0, 0, 0.2)';
    const colB = 'rgba(100, 200, 50, 0.8)';
    const blended = interpolateRgba(colA, colB, 0.5);

    expect(blended).toContain('rgba(50, 100, 25, 0.5)');
  });

  it('easeInOutCubic provides proper boundaries and curvature', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    // Acceleration early
    expect(easeInOutCubic(0.2)).toBeLessThan(0.2);
    // Deceleration late
    expect(easeInOutCubic(0.8)).toBeGreaterThan(0.8);
  });

  it('interpolatePalette generates a fully morphed ChameleonPalette', () => {
    const palA: ChameleonPalette = {
      primary: '#00e5ff',
      secondary: '#a855f7',
      accent: '#38bdf8',
      glow: 'rgba(0, 229, 255, 0.25)',
      border: 'rgba(0, 229, 255, 0.35)',
      meshGradient: '',
    };

    const palB: ChameleonPalette = {
      primary: '#ff007f',
      secondary: '#f59e0b',
      accent: '#ec4899',
      glow: 'rgba(255, 0, 127, 0.35)',
      border: 'rgba(255, 0, 127, 0.45)',
      meshGradient: '',
    };

    const morphed = interpolatePalette(palA, palB, 0.5);
    expect(morphed.primary).toBeDefined();
    expect(morphed.secondary).toBeDefined();
    expect(morphed.glow).toContain('rgba');
    expect(morphed.meshGradient).toContain('radial-gradient');
  });
});
