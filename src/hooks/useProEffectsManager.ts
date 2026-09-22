import { useMemo, useCallback } from 'react';
import type { BlobCustomSettings } from '../types/audio';

export interface ProEffectDef {
  id: string;
  name: string;
  desc: string;
  enabledKey: keyof BlobCustomSettings;
  intensityKey: keyof BlobCustomSettings;
  costWeight: number; // 1 = low, 2 = medium, 3 = high
}

export const PRO_EFFECTS_LIST: ProEffectDef[] = [
  {
    id: 'shockwave',
    name: 'Kick Shockwave',
    desc: 'Anillo expansivo en cada golpe de bombo',
    enabledKey: 'shockwaveEnabled',
    intensityKey: 'shockwaveIntensity',
    costWeight: 1,
  },
  {
    id: 'chromaticRing',
    name: 'Chromatic Ring',
    desc: 'Desfase RGB dinámico modulado por agudos',
    enabledKey: 'chromaticRingEnabled',
    intensityKey: 'chromaticRingIntensity',
    costWeight: 1,
  },
  {
    id: 'pulseGrid',
    name: 'Pulse Grid',
    desc: 'Rejilla 8x8 reactiva a frecuencias espaciales',
    enabledKey: 'pulseGridEnabled',
    intensityKey: 'pulseGridIntensity',
    costWeight: 1,
  },
  {
    id: 'mercuryTrails',
    name: 'Mercury Trails',
    desc: 'Rastro metálico en ápices de crestas polares',
    enabledKey: 'mercuryTrailsEnabled',
    intensityKey: 'mercuryTrailsIntensity',
    costWeight: 2,
  },
  {
    id: 'constellation',
    name: 'Constellation Lines',
    desc: 'Micro-nodos de ápices conectados en red geométrica',
    enabledKey: 'constellationEnabled',
    intensityKey: 'constellationIntensity',
    costWeight: 2,
  },
  {
    id: 'plasmaVortex',
    name: 'Plasma Vortex',
    desc: 'Brazos de plasma rotando en espiral dentro del núcleo',
    enabledKey: 'plasmaVortexEnabled',
    intensityKey: 'plasmaVortexIntensity',
    costWeight: 1,
  },
  {
    id: 'gravitationalLens',
    name: 'Gravitational Lens',
    desc: 'Distorsión radial inversa alrededor del borde del void',
    enabledKey: 'gravitationalLensEnabled',
    intensityKey: 'gravitationalLensIntensity',
    costWeight: 3,
  },
  {
    id: 'auroraRibbons',
    name: 'Aurora Ribbons',
    desc: 'Cortinas etéreas boreales detrás del void',
    enabledKey: 'auroraRibbonsEnabled',
    intensityKey: 'auroraRibbonsIntensity',
    costWeight: 2,
  },
  {
    id: 'crystalShards',
    name: 'Crystalline Shards',
    desc: 'Fragmentos balísticos en explosiones de kick',
    enabledKey: 'crystalShardsEnabled',
    intensityKey: 'crystalShardsIntensity',
    costWeight: 2,
  },
  {
    id: 'holographicScanlines',
    name: 'Holographic Scanlines',
    desc: 'Líneas de escaneo sutiles dentro del void',
    enabledKey: 'holographicScanlinesEnabled',
    intensityKey: 'holographicScanlinesIntensity',
    costWeight: 1,
  },
];

export const MAX_ACTIVE_PRO_EFFECTS = 4;

export function useProEffectsManager(
  blobSettings: BlobCustomSettings,
  updateBlobSettings: (partial: Partial<BlobCustomSettings>) => void,
  onLimitExceeded?: () => void
) {
  const activeEffects = useMemo(() => {
    return PRO_EFFECTS_LIST.filter((eff) => Boolean(blobSettings[eff.enabledKey]));
  }, [blobSettings]);

  const activeCount = activeEffects.length;

  const toggleEffect = useCallback(
    (effectId: string) => {
      const effect = PRO_EFFECTS_LIST.find((e) => e.id === effectId);
      if (!effect) return;

      const isCurrentlyActive = Boolean(blobSettings[effect.enabledKey]);

      if (!isCurrentlyActive) {
        if (activeCount >= MAX_ACTIVE_PRO_EFFECTS) {
          if (onLimitExceeded) onLimitExceeded();
          return false;
        }
        updateBlobSettings({ [effect.enabledKey]: true });
        return true;
      } else {
        updateBlobSettings({ [effect.enabledKey]: false });
        return true;
      }
    },
    [blobSettings, activeCount, onLimitExceeded, updateBlobSettings]
  );

  const setEffectIntensity = useCallback(
    (effectId: string, intensity: number) => {
      const effect = PRO_EFFECTS_LIST.find((e) => e.id === effectId);
      if (!effect) return;
      updateBlobSettings({ [effect.intensityKey]: intensity });
    },
    [updateBlobSettings]
  );

  const deactivateHeaviestEffects = useCallback(
    (count = 2) => {
      // Sort currently active effects by costWeight descending
      const sorted = [...activeEffects].sort((a, b) => b.costWeight - a.costWeight);
      const toDeactivate = sorted.slice(0, count);

      if (toDeactivate.length === 0) return [];

      const patch: Partial<BlobCustomSettings> = {};
      toDeactivate.forEach((eff) => {
        patch[eff.enabledKey] = false as any;
      });

      updateBlobSettings(patch);
      return toDeactivate.map((e) => e.name);
    },
    [activeEffects, updateBlobSettings]
  );

  return {
    effects: PRO_EFFECTS_LIST,
    activeEffects,
    activeCount,
    maxCount: MAX_ACTIVE_PRO_EFFECTS,
    toggleEffect,
    setEffectIntensity,
    deactivateHeaviestEffects,
  };
}
