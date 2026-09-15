import { describe, it, expect } from 'vitest';
import i18n, { changeLanguage } from '../i18n';

describe('i18n Localization System', () => {
  it('should initialize with valid translations', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('app.title')).toBeDefined();
  });

  it('should translate correctly in Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('equalizer.title')).toBe('Ecualizador de Estudio de 10 Bandas');
    expect(i18n.t('controls.play')).toBe('Iniciar reproducción');
  });

  it('should switch language to English and translate accurately', async () => {
    changeLanguage('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('equalizer.title')).toBe('10-Band Studio Equalizer');
    expect(i18n.t('controls.play')).toBe('Start playback');
  });
});
