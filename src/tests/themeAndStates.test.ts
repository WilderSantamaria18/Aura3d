import { describe, it, expect, beforeEach } from 'vitest';
import { themeService, ACCENT_PALETTES } from '../services/themeService';

describe('ThemeService & Design System Theming', () => {
  beforeEach(() => {
    themeService.setMode('dark');
    themeService.setAccent('cyan');
  });

  it('should initialize with dark mode and cyan accent by default', () => {
    expect(themeService.getMode()).toBe('dark');
    expect(themeService.getAccent()).toBe('cyan');
    expect(themeService.getEffectiveTheme()).toBe('dark');
  });

  it('should switch to light mode and compute effective theme correctly', () => {
    themeService.setMode('light');
    expect(themeService.getMode()).toBe('light');
    expect(themeService.getEffectiveTheme()).toBe('light');
  });

  it('should update accent color to violet and provide valid hex/glow tokens', () => {
    themeService.setAccent('violet');
    expect(themeService.getAccent()).toBe('violet');
    const palette = themeService.getAccentPalette();
    expect(palette.hex).toBe(ACCENT_PALETTES.violet.hex);
    expect(palette.glow).toContain('rgba');
  });

  it('should notify subscribers when theme or accent changes', () => {
    let callCount = 0;
    const unsubscribe = themeService.subscribe(() => {
      callCount++;
    });

    themeService.setMode('dark');
    themeService.setAccent('amber');

    expect(callCount).toBeGreaterThan(0);
    unsubscribe();
  });
});
