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
    name: 'Onda del bombo',
    desc: 'Un anillo que se expande con cada golpe de bombo.',
    enabledKey: 'shockwaveEnabled',
    intensityKey: 'shockwaveIntensity',
    costWeight: 1,
  },
  {
    id: 'chromaticRing',
    name: 'Aro cromático',
    desc: 'Un aro de colores desfasados que vibra con los agudos.',
    enabledKey: 'chromaticRingEnabled',
    intensityKey: 'chromaticRingIntensity',
    costWeight: 1,
  },
  {
    id: 'pulseGrid',
    name: 'Rejilla de pulso',
    desc: 'Puntos en cuadrícula que se encienden según el espectro.',
    enabledKey: 'pulseGridEnabled',
    intensityKey: 'pulseGridIntensity',
    costWeight: 1,
  },
  {
    id: 'mercuryTrails',
    name: 'Estelas de mercurio',
    desc: 'Un rastro plateado detrás de las puntas de la forma.',
    enabledKey: 'mercuryTrailsEnabled',
    intensityKey: 'mercuryTrailsIntensity',
    costWeight: 2,
  },
  {
    id: 'constellation',
    name: 'Constelación',
    desc: 'Líneas finas que unen las puntas de la forma.',
    enabledKey: 'constellationEnabled',
    intensityKey: 'constellationIntensity',
    costWeight: 2,
  },
  {
    id: 'plasmaVortex',
    name: 'Vórtice de plasma',
    desc: 'Espirales que giran dentro del disco.',
    enabledKey: 'plasmaVortexEnabled',
    intensityKey: 'plasmaVortexIntensity',
    costWeight: 1,
  },
  {
    id: 'gravitationalLens',
    name: 'Lente gravitacional',
    desc: 'Un anillo de luz ondulado que vibra con los graves.',
    enabledKey: 'gravitationalLensEnabled',
    intensityKey: 'gravitationalLensIntensity',
    costWeight: 1,
  },
  {
    id: 'auroraRibbons',
    name: 'Cintas de aurora',
    desc: 'Cortinas de luz que se mecen detrás del disco.',
    enabledKey: 'auroraRibbonsEnabled',
    intensityKey: 'auroraRibbonsIntensity',
    costWeight: 2,
  },
  {
    id: 'crystalShards',
    name: 'Esquirlas de cristal',
    desc: 'Fragmentos que salen disparados con cada golpe.',
    enabledKey: 'crystalShardsEnabled',
    intensityKey: 'crystalShardsIntensity',
    costWeight: 2,
  },
  {
    id: 'holographicScanlines',
    name: 'Líneas holográficas',
    desc: 'Un barrido de líneas finas dentro del disco.',
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
