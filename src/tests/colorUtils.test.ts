import { describe, it, expect } from 'vitest';
import { hslToHex, multiplyHexColor } from '../utils/colorUtils';

describe('colorUtils - Dynamic Palettes & Lighting', () => {
  it('should convert pure HSL coordinates to correct hex strings', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000'); // Pure Red
    expect(hslToHex(1 / 3, 1, 0.5)).toBe('#00ff00'); // Pure Green
    expect(hslToHex(2 / 3, 1, 0.5)).toBe('#0000ff'); // Pure Blue
    expect(hslToHex(0, 0, 1)).toBe('#ffffff'); // White
    expect(hslToHex(0, 0, 0)).toBe('#000000'); // Black
  });

  it('should scale and darken hex colors accurately', () => {
    const darkened = multiplyHexColor('#ffffff', 0.5);
    expect(darkened).toBe('#808080');

    const blackScaled = multiplyHexColor('#000000', 0.5);
    expect(blackScaled).toBe('#000000');

    const colored = multiplyHexColor('#ff0000', 0.5);
    expect(colored).toBe('#800000');
  });

  it('should handle invalid hex gracefully', () => {
    expect(multiplyHexColor('invalid', 0.5)).toBe('#000000');
  });
});
