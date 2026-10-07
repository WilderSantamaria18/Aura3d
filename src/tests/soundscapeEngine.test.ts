import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});

import { soundscapeEngine, SOUNDSCAPE_PRESETS, type SoundscapeType } from '../services/soundscapeEngine';

describe('SoundscapeEngine Pro', () => {
  beforeEach(() => {
    soundscapeEngine.stopAll();
  });

  it('exposes all 8 procedural soundscape channels in default configuration', () => {
    const config = soundscapeEngine.getConfig();
    const expectedChannels: SoundscapeType[] = [
      'rain',
      'fire',
      'cafe',
      'ocean',
      'cosmic',
      'vinyl',
      'thunder',
      'forest',
    ];

    expectedChannels.forEach((ch) => {
      expect(config[ch]).toBeDefined();
      expect(typeof config[ch].volume).toBe('number');
      expect(typeof config[ch].enabled).toBe('boolean');
      expect(config[ch].volume).toBeGreaterThan(0);
      expect(config[ch].volume).toBeLessThanOrEqual(1);
    });
  });

  it('clamps volume changes between 0.0 and 1.0', () => {
    soundscapeEngine.setVolume('cosmic', 1.8);
    expect(soundscapeEngine.getConfig().cosmic.volume).toBe(1.0);

    soundscapeEngine.setVolume('cosmic', -0.5);
    expect(soundscapeEngine.getConfig().cosmic.volume).toBe(0.0);

    soundscapeEngine.setVolume('cosmic', 0.65);
    expect(soundscapeEngine.getConfig().cosmic.volume).toBe(0.65);
  });

  it('toggles master mute correctly', () => {
    const initialMute = soundscapeEngine.getConfig().masterMuted;
    soundscapeEngine.toggleMasterMute();
    expect(soundscapeEngine.getConfig().masterMuted).toBe(!initialMute);
    soundscapeEngine.toggleMasterMute();
    expect(soundscapeEngine.getConfig().masterMuted).toBe(initialMute);
  });

  it('contains valid multi-channel mixing presets', () => {
    expect(SOUNDSCAPE_PRESETS.length).toBeGreaterThanOrEqual(5);

    SOUNDSCAPE_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.config).toBeDefined();
      const entries = Object.entries(preset.config);
      expect(entries.length).toBeGreaterThan(0);

      entries.forEach(([channel, vol]) => {
        expect(['rain', 'fire', 'cafe', 'ocean', 'cosmic', 'vinyl', 'thunder', 'forest']).toContain(channel);
        expect(vol).toBeGreaterThan(0);
        expect(vol).toBeLessThanOrEqual(1);
      });
    });
  });

  it('stops all active channels with stopAll', () => {
    soundscapeEngine.stopAll();
    const cfg = soundscapeEngine.getConfig();
    expect(cfg.rain.enabled).toBe(false);
    expect(cfg.cosmic.enabled).toBe(false);
    expect(cfg.vinyl.enabled).toBe(false);
    expect(cfg.thunder.enabled).toBe(false);
    expect(cfg.forest.enabled).toBe(false);
  });
});
