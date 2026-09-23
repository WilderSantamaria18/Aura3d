import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceManager } from '../spatial/performance/PerformanceManager';

describe('PerformanceManager — Sprint 10 Adaptive Quality & Tiers', () => {
  let manager: PerformanceManager;

  beforeEach(() => {
    manager = PerformanceManager.getInstance();
    manager.setTier('HIGH');
    manager.setAdaptiveQuality(true);
  });

  it('proporciona métricas coherentes según el Tier activo', () => {
    manager.setTier('HIGH');
    let m = manager.getMetrics();
    expect(m.currentTier).toBe('HIGH');
    expect(m.particleBudget).toBe(3600);
    expect(m.maxTrackedHands).toBe(2);
    expect(m.minInferenceIntervalMs).toBe(33); // ~30 fps
    expect(m.dpr).toBe(1.4);

    manager.setTier('MEDIUM');
    m = manager.getMetrics();
    expect(m.currentTier).toBe('MEDIUM');
    expect(m.particleBudget).toBe(1600);
    expect(m.minInferenceIntervalMs).toBe(45); // ~22 fps
    expect(m.dpr).toBe(1.0);

    manager.setTier('LOW');
    m = manager.getMetrics();
    expect(m.currentTier).toBe('LOW');
    expect(m.particleBudget).toBe(700);
    expect(m.maxTrackedHands).toBe(1);
    expect(m.minInferenceIntervalMs).toBe(66); // ~15 fps
    expect(m.dpr).toBe(0.85);
  });

  it('degrada el tier tras latencia alta sostenida (>20 ms durante 2s)', () => {
    manager.setTier('HIGH');

    // Simular 20 frames de alta latencia (30 ms) durante 600 ms
    for (let t = 0; t <= 600; t += 30) {
      manager.recordFrame(0.03, t);
    }
    expect(manager.getTier()).toBe('HIGH'); // Aún no han pasado 2 segundos

    // Simular continuación hasta 2500 ms (> 2s continuos de >20 ms)
    for (let t = 630; t <= 2500; t += 30) {
      manager.recordFrame(0.03, t);
    }
    expect(manager.getTier()).toBe('MEDIUM'); // Degrada a MEDIUM

    // Simular otros 2200 ms continuos de alta latencia
    for (let t = 2530; t <= 4800; t += 30) {
      manager.recordFrame(0.03, t);
    }
    expect(manager.getTier()).toBe('LOW'); // Degrada a LOW (degradation floor)
  });

  it('promueve el tier tras latencia baja sostenida (<12 ms durante 5s)', () => {
    manager.setTier('LOW');

    // Simular 50 frames de latencia baja (8 ms) durante 1000 ms
    for (let t = 0; t <= 1000; t += 16) {
      manager.recordFrame(0.008, t);
    }
    expect(manager.getTier()).toBe('LOW');

    // Continuar hasta 6000 ms (> 5 s de fluidez continua <12 ms)
    for (let t = 1016; t <= 6500; t += 16) {
      manager.recordFrame(0.008, t);
    }
    expect(manager.getTier()).toBe('MEDIUM');

    // Continuar otros 5500 ms de alta fluidez sostenida
    for (let t = 6516; t <= 12200; t += 16) {
      manager.recordFrame(0.008, t);
    }
    expect(manager.getTier()).toBe('HIGH');
  });

  it('respeta las Feature Flags y permite deshabilitar la adaptación automática', () => {
    manager.setTier('MEDIUM');
    manager.setAdaptiveQuality(false);

    // Latencia extrema no debe cambiar el tier si adaptiveQualityEnabled está false
    manager.recordFrame(0.05, 1000);
    manager.recordFrame(0.05, 5000);
    expect(manager.getTier()).toBe('MEDIUM');

    const flags = manager.getFeatureFlags();
    expect(flags.adaptiveQualityEnabled).toBe(false);
  });
});
