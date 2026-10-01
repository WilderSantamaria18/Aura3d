import { describe, it, expect, beforeEach, vi } from 'vitest';

// playerStore arrastra audioEngine, que crea un <audio> al importarse; en Node se sustituye por un stub inerte
vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});
import { usePlayerStore } from '../stores/playerStore';
import { QUALITY_PROFILES, canvasDprFor } from '../utils/qualityProfile';

describe('perfiles de calidad', () => {
  it('high deja todo como estaba; eco apaga los halos y baja la resolución', () => {
    expect(QUALITY_PROFILES.high).toEqual({ glow: 1, dprCap: 2 });
    expect(QUALITY_PROFILES.eco.glow).toBe(0);
    expect(QUALITY_PROFILES.eco.dprCap).toBe(1);
    expect(QUALITY_PROFILES.medium.glow).toBeGreaterThan(0);
    expect(QUALITY_PROFILES.medium.glow).toBeLessThan(1);
  });

  it('el DPR del canvas nunca supera el tope del perfil ni el del dispositivo', () => {
    expect(canvasDprFor(QUALITY_PROFILES.high, 3)).toBe(2);
    expect(canvasDprFor(QUALITY_PROFILES.medium, 3)).toBe(1.5);
    expect(canvasDprFor(QUALITY_PROFILES.eco, 3)).toBe(1);
    expect(canvasDprFor(QUALITY_PROFILES.high, 1)).toBe(1); // pantalla normal: no se sube
    expect(canvasDprFor(QUALITY_PROFILES.high, 0)).toBe(1); // valor inválido
  });
});

describe('estado de calidad en el store', () => {
  beforeEach(() => {
    usePlayerStore.setState({ performanceTier: 'high', autoQuality: true, autoTierCap: 'high', effectiveTier: 'high' });
  });

  it('el tope automático baja el nivel efectivo sin tocar la elección del usuario', () => {
    usePlayerStore.getState().setAutoTierCap('eco');
    const s = usePlayerStore.getState();
    expect(s.effectiveTier).toBe('eco');
    expect(s.performanceTier).toBe('high'); // la elección guardada no se pisa
  });

  it('el nivel automático nunca supera la elección del usuario', () => {
    usePlayerStore.getState().setPerformanceTier('medium');
    usePlayerStore.getState().setAutoTierCap('high');
    expect(usePlayerStore.getState().effectiveTier).toBe('medium');
  });

  it('elegir un nivel a mano reinicia el tope automático', () => {
    usePlayerStore.getState().setAutoTierCap('eco');
    usePlayerStore.getState().setPerformanceTier('high');
    const s = usePlayerStore.getState();
    expect(s.autoTierCap).toBe('high');
    expect(s.effectiveTier).toBe('high');
  });

  it('con la calidad automática apagada manda siempre el usuario', () => {
    usePlayerStore.getState().setAutoTierCap('eco');
    usePlayerStore.getState().setAutoQuality(false);
    expect(usePlayerStore.getState().effectiveTier).toBe('high');

    usePlayerStore.getState().setAutoTierCap('eco'); // aunque algo intente bajarlo
    expect(usePlayerStore.getState().effectiveTier).toBe('high');
  });

  it('activar o desactivar el modo parte de cero (sin tope heredado)', () => {
    usePlayerStore.getState().setAutoTierCap('eco');
    usePlayerStore.getState().setAutoQuality(false);
    usePlayerStore.getState().setAutoQuality(true);
    const s = usePlayerStore.getState();
    expect(s.autoTierCap).toBe('high');
    expect(s.effectiveTier).toBe('high');
  });

  it('cyclePerformanceTier también reinicia el tope y recalcula el efectivo', () => {
    usePlayerStore.getState().setAutoTierCap('eco');
    usePlayerStore.getState().cyclePerformanceTier(); // high → medium
    const s = usePlayerStore.getState();
    expect(s.performanceTier).toBe('medium');
    expect(s.autoTierCap).toBe('high');
    expect(s.effectiveTier).toBe('medium');
  });
});
