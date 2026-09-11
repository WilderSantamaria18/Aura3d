import type { ScenePreset } from '../types/presets';
import { usePlayerStore } from '../stores/playerStore';
import { createLucidTheme } from '../types/audio';

const STORAGE_KEY = 'aura3d_user_presets';

export const FACTORY_PRESETS: ScenePreset[] = [
  {
    id: 'factory_cyberpunk_club',
    name: 'Cyberpunk Neon Club',
    description: 'Barras radiales arcoíris, estroboscopio reactivo a graves y paleta neón cian-magenta para electrónica y phonk.',
    author: 'Aura3D Studio',
    createdAt: 1700000000000,
    isFactory: true,
    tags: ['Party', 'Cyberpunk', 'High Energy', 'Laser'],
    visualizerMode: 'party',
    visualizerShape: 'icosahedron',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 1.0,
    bassBoomThreshold: 0.70,
    bassBoomIntensity: 1.0,
    isLucid: true,
    lucidPrimaryColor: '#00f5ff',
    lucidSecondaryColor: '#ff007f',
    sphereScale: 1.1,
    sphereOpacity: 0.95,
    musicSensitivity: 0.82,
    audioSpeed: 0.82,
  },
  {
    id: 'factory_deep_space_void',
    name: 'Deep Space Cosmic Void',
    description: 'Esfera 3D con 2000 anillos cósmicos en violeta profundo y azul estelar para ambient, trap y chill.',
    author: 'Aura3D Studio',
    createdAt: 1700000000001,
    isFactory: true,
    tags: ['3D Sphere', 'Ambient', 'Chill', 'Cosmic'],
    visualizerMode: 'sphere',
    visualizerShape: 'octahedron',
    waveEffectMode: 'spiral',
    waveEffectIntensity: 0.85,
    bassBoomThreshold: 0.78,
    bassBoomIntensity: 0.85,
    isLucid: true,
    lucidPrimaryColor: '#8a2be2',
    lucidSecondaryColor: '#4169e1',
    sphereScale: 1.15,
    sphereOpacity: 0.92,
    musicSensitivity: 0.72,
    audioSpeed: 0.72,
  },
  {
    id: 'factory_retro_synthwave',
    name: 'Retro 80s Synthwave',
    description: 'Anillo blob ondulante con gradiente cónico cálido rosa-ámbar y 72 barras radiales pulsantes.',
    author: 'Aura3D Studio',
    createdAt: 1700000000002,
    isFactory: true,
    tags: ['Blob 2D', 'Synthwave', 'Retro', 'Warm'],
    visualizerMode: 'blob',
    visualizerShape: 'wave',
    waveEffectMode: 'sinusoidal',
    waveEffectIntensity: 0.95,
    bassBoomThreshold: 0.75,
    bassBoomIntensity: 0.90,
    isLucid: true,
    lucidPrimaryColor: '#ff007f',
    lucidSecondaryColor: '#ffaa00',
    sphereScale: 1.0,
    sphereOpacity: 0.9,
    blobScale: 1.05,
    musicSensitivity: 0.80,
    audioSpeed: 0.80,
  },
  {
    id: 'factory_ethereal_aurora',
    name: 'Ethereal Aurora Boreal',
    description: 'Partículas esmeralda y cian flotantes con deformación armónica suave para música clásica, lofi y acústica.',
    author: 'Aura3D Studio',
    createdAt: 1700000000003,
    isFactory: true,
    tags: ['3D Sphere', 'Nature', 'Lo-Fi', 'Green'],
    visualizerMode: 'sphere',
    visualizerShape: 'sphere',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 0.65,
    bassBoomThreshold: 0.82,
    bassBoomIntensity: 0.65,
    isLucid: true,
    lucidPrimaryColor: '#00ff88',
    lucidSecondaryColor: '#00e1d9',
    sphereScale: 1.0,
    sphereOpacity: 0.85,
    musicSensitivity: 0.70,
    audioSpeed: 0.70,
  },
  {
    id: 'factory_golden_sunset',
    name: 'Golden Sunset Horizon',
    description: 'Explosión de partículas doradas y estrobos ámbar con rotación acelerada para sets de verano y house.',
    author: 'Aura3D Studio',
    createdAt: 1700000000004,
    isFactory: true,
    tags: ['Party', 'House', 'Sunset', 'Warm'],
    visualizerMode: 'party',
    visualizerShape: 'rings',
    waveEffectMode: 'spiral',
    waveEffectIntensity: 0.90,
    bassBoomThreshold: 0.74,
    bassBoomIntensity: 0.95,
    isLucid: true,
    lucidPrimaryColor: '#ff6600',
    lucidSecondaryColor: '#ffd700',
    sphereScale: 1.05,
    sphereOpacity: 0.9,
    musicSensitivity: 0.82,
    audioSpeed: 0.82,
  },
  {
    id: 'factory_acid_reactor',
    name: 'Acid Techno Reactor',
    description: 'Verde radioactivo y cian con sensibilidad extrema a transitorios de bajo y ondas de choque.',
    author: 'Aura3D Studio',
    createdAt: 1700000000005,
    isFactory: true,
    tags: ['Blob 2D', 'Techno', 'High BPM', 'Acid'],
    visualizerMode: 'blob',
    visualizerShape: 'spikes',
    waveEffectMode: 'void',
    waveEffectIntensity: 1.0,
    bassBoomThreshold: 0.68,
    bassBoomIntensity: 1.0,
    isLucid: true,
    lucidPrimaryColor: '#39ff14',
    lucidSecondaryColor: '#00f5ff',
    sphereScale: 1.1,
    sphereOpacity: 0.95,
    blobScale: 1.1,
    musicSensitivity: 0.85,
    audioSpeed: 0.85,
  },
];

export class PresetService {
  static getUserPresets(): ScenePreset[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static getAllPresets(): ScenePreset[] {
    const userPresets = this.getUserPresets();
    return [...FACTORY_PRESETS, ...userPresets];
  }

  static saveUserPreset(presetData: Omit<ScenePreset, 'id' | 'createdAt' | 'isFactory'>): ScenePreset {
    const newPreset: ScenePreset = {
      ...presetData,
      id: 'preset_' + Date.now(),
      createdAt: Date.now(),
      isFactory: false,
    };
    const current = this.getUserPresets();
    const updated = [newPreset, ...current];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[PresetService] Failed to save preset to localStorage:', e);
    }
    return newPreset;
  }

  static deleteUserPreset(id: string): boolean {
    const current = this.getUserPresets();
    const updated = current.filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }

  static applyPreset(preset: ScenePreset): void {
    const store = usePlayerStore.getState();

    // 1. Set mode & geometry
    store.setVisualizerMode(preset.visualizerMode);
    store.setVisualizerShape(preset.visualizerShape);
    if (preset.visualizerMode === 'sphere') {
      store.setSphereShape(preset.visualizerShape);
    } else if (preset.visualizerMode === 'blob') {
      store.setBlobShape(preset.visualizerShape);
    }

    // 2. Wave & Bass boom
    store.setWaveEffectMode(preset.waveEffectMode);
    store.setWaveEffectIntensity(preset.waveEffectIntensity);
    store.setBassBoomThreshold(preset.bassBoomThreshold);
    store.setBassBoomIntensity(preset.bassBoomIntensity);

    // 3. Lucid Colors & Theme
    store.setIsLucid(preset.isLucid);
    store.setLucidPrimaryColor(preset.lucidPrimaryColor);
    store.setLucidSecondaryColor(preset.lucidSecondaryColor);
    store.setLucidTheme(
      createLucidTheme(preset.name, preset.lucidPrimaryColor, preset.lucidSecondaryColor)
    );

    // 4. Scales and sensitivities
    if (preset.sphereScale !== undefined) store.setSphereScale(preset.sphereScale);
    if (preset.sphereOpacity !== undefined) store.setSphereOpacity(preset.sphereOpacity);
    if (preset.blobScale !== undefined) store.setBlobScale(preset.blobScale);
    if (preset.musicSensitivity !== undefined) store.setMusicSensitivity(preset.musicSensitivity);
    if (preset.audioSpeed !== undefined) store.setAudioSpeed(preset.audioSpeed);
    if (preset.blobSettings) store.updateBlobSettings(preset.blobSettings);

    store.setAutoNotification({
      id: Date.now(),
      type: 'success',
      message: `✨ Preset activado: ${preset.name}`,
    });
  }

  static exportPresetsAsJson(presets?: ScenePreset[]): void {
    const dataToExport = presets || this.getAllPresets();
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura3d-presets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importPresetsFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      const validList: ScenePreset[] = list.filter(
        (item) => item && typeof item === 'object' && typeof item.name === 'string' && item.visualizerMode
      );

      if (validList.length === 0) {
        return { success: false, count: 0, error: 'El archivo JSON no contiene presets válidos de Aura3D' };
      }

      const existing = this.getUserPresets();
      const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
      const factoryNames = new Set(FACTORY_PRESETS.map((f) => f.name.toLowerCase()));

      let importedCount = 0;
      const toAdd: ScenePreset[] = [];

      for (const item of validList) {
        const checkName = item.name.toLowerCase();
        const finalName = factoryNames.has(checkName) || existingNames.has(checkName)
          ? `${item.name} (Importado)`
          : item.name;

        toAdd.push({
          ...item,
          id: 'imported_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: finalName,
          isFactory: false,
          createdAt: Date.now(),
        });
        importedCount++;
      }

      const updated = [...toAdd, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { success: true, count: importedCount };
    } catch (err) {
      return { success: false, count: 0, error: err instanceof Error ? err.message : 'Error desconocido al importar' };
    }
  }
}
