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
    tags: ['Synthwave', 'Cyberpunk', 'High Energy', 'Laser'],
    visualizerMode: 'synthwave',
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
    tags: ['Synthwave', 'House', 'Sunset', 'Warm'],
    visualizerMode: 'synthwave',
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
  {
    id: 'factory_rainbow_void',
    name: 'Rainbow Void Core',
    description: 'Visualizador circular Rainbow Void con halo exterior de 202px, núcleo de 179px, bajo 2.8x y subwoofer kick de 160%.',
    author: 'Aura3D Studio',
    createdAt: 1700000000006,
    isFactory: true,
    tags: ['Rainbow Void', 'Halo 202px', 'Bass 2.8x', 'Subwoofer 160%'],
    visualizerMode: 'blob',
    visualizerShape: 'sphere',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 1.0,
    bassBoomThreshold: 0.68,
    bassBoomIntensity: 1.60,
    isLucid: false,
    lucidPrimaryColor: '#00f2fe',
    lucidSecondaryColor: '#ff088a',
    sphereScale: 1.0,
    sphereOpacity: 0.95,
    blobScale: 1.0,
    musicSensitivity: 1.0,
    audioSpeed: 1.0,
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#ff088a',
      haloColor2: '#00f2fe',
      isRainbowMode: true,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 30,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.40,
      backgroundAtmosphere: 'none',
      kickThreshold: 0.32,
      kickPower: 1.60,
    },
  },
  {
    id: 'factory_dhonkio_sunset',
    name: 'DHONKIO - Silueta & Atardecer',
    description: 'Atardecer épico con sol gigante, acantilado oscuro, silueta humana y núcleo DHONKIO con skyline y Bloom 1.33.',
    author: 'Aura3D Studio',
    createdAt: 1700000000007,
    isFactory: true,
    tags: ['DHONKIO', 'Sunset', 'Bloom 1.33', 'City Skyline'],
    visualizerMode: 'blob',
    visualizerShape: 'bars',
    waveEffectMode: 'void',
    waveEffectIntensity: 1.0,
    bassBoomThreshold: 0.68,
    bassBoomIntensity: 1.60,
    isLucid: false,
    lucidPrimaryColor: '#ffb300',
    lucidSecondaryColor: '#ff3d00',
    sphereScale: 1.0,
    sphereOpacity: 0.95,
    blobScale: 1.0,
    musicSensitivity: 1.0,
    audioSpeed: 1.0,
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#ff3d00',
      haloColor2: '#ffb300',
      isRainbowMode: true,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 43.5,
      bassBoost: 2.8,
      backgroundBlur: 30,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.40,
      backgroundAtmosphere: 'sunset',
      kickThreshold: 0.32,
      kickPower: 1.60,
      dhonkioBloom: 1.33,
      dhonkioInnerSize: 0.14,
      dhonkioOuterSize: 0.35,
      dhonkioOpacity: 0.42,
      dhonkioPowerBass: 1.035,
      dhonkioPowerMid: 1.08,
      dhonkioPowerKick: 1.045,
      dhonkioKickBoost: 6,
    },
  },
  {
    id: 'factory_cyber_metropolis',
    name: 'Cyber City Metropolis',
    description: 'Horizonte futurista con rascacielos iluminados, autopista láser y pulso de bajos en neón cian y magenta.',
    author: 'Aura3D Studio',
    createdAt: 1700000000010,
    isFactory: true,
    tags: ['Cyber City', 'Synthwave', 'Neón', 'Metropolis'],
    visualizerMode: 'synthwave',
    visualizerShape: 'wave',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 1.1,
    bassBoomThreshold: 0.68,
    bassBoomIntensity: 1.25,
    isLucid: true,
    lucidPrimaryColor: '#00f5ff',
    lucidSecondaryColor: '#ff007f',
    sphereScale: 1.05,
    sphereOpacity: 0.95,
    musicSensitivity: 0.84,
    audioSpeed: 0.84,
    backgroundAtmosphere: 'cyber_city',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#ff007f',
      haloColor2: '#00f5ff',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'cyber_city',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_cosmic_moon_voyager',
    name: 'Cosmic Moon Voyager',
    description: 'Luna colosal resplandeciente en el espacio profundo con polvo estelar reactivo y esfera de ondas orbitales.',
    author: 'Aura3D Studio',
    createdAt: 1700000000011,
    isFactory: true,
    tags: ['Cosmic Voyager', '3D Sphere', 'Luna', 'Deep Space'],
    visualizerMode: 'sphere',
    visualizerShape: 'torus',
    waveEffectMode: 'spiral',
    waveEffectIntensity: 1.0,
    bassBoomThreshold: 0.72,
    bassBoomIntensity: 1.15,
    isLucid: true,
    lucidPrimaryColor: '#7928ca',
    lucidSecondaryColor: '#0070f3',
    sphereScale: 1.15,
    sphereOpacity: 0.92,
    musicSensitivity: 0.78,
    audioSpeed: 0.78,
    backgroundAtmosphere: 'cosmic_voyager',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#7928ca',
      haloColor2: '#0070f3',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'cosmic_voyager',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_crimson_blood_horizon',
    name: 'Crimson Blood Horizon',
    description: 'Sol gigante en llamarada solar carmesí y silueta montañosa profunda con vórtice reactivo de alta energía.',
    author: 'Aura3D Studio',
    createdAt: 1700000000012,
    isFactory: true,
    tags: ['Atardecer Carmesí', '2D Vortex', 'Fuego', 'Bass Heavy'],
    visualizerMode: 'blob',
    visualizerShape: 'vortex',
    waveEffectMode: 'spiral',
    waveEffectIntensity: 1.2,
    bassBoomThreshold: 0.65,
    bassBoomIntensity: 1.4,
    isLucid: true,
    lucidPrimaryColor: '#ff2a00',
    lucidSecondaryColor: '#ffb300',
    sphereScale: 1.0,
    sphereOpacity: 0.95,
    blobScale: 1.0,
    musicSensitivity: 0.85,
    audioSpeed: 0.85,
    backgroundAtmosphere: 'sunset',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#ff2a00',
      haloColor2: '#ffb300',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'sunset',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_matrix_digital_rain',
    name: 'Matrix Digital Rain Void',
    description: 'Lluvia de código binario digital verde lima y láseres reactivos de alta frecuencia cibernética.',
    author: 'Aura3D Studio',
    createdAt: 1700000000013,
    isFactory: true,
    tags: ['Matrix', 'Laser', 'Código', 'Cyberpunk'],
    visualizerMode: 'blob',
    visualizerShape: 'laser',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 1.1,
    bassBoomThreshold: 0.7,
    bassBoomIntensity: 1.2,
    isLucid: true,
    lucidPrimaryColor: '#00ff66',
    lucidSecondaryColor: '#00f2fe',
    sphereScale: 1.0,
    sphereOpacity: 0.9,
    blobScale: 1.0,
    musicSensitivity: 0.82,
    audioSpeed: 0.82,
    backgroundAtmosphere: 'matrix',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#00ff66',
      haloColor2: '#00f2fe',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'matrix',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_hyperdrive_warp_stars',
    name: 'Hyperdrive Warp Stars',
    description: 'Efecto de velocidad luz con estrellas en fuga hiperespacial y red synthwave pulsante.',
    author: 'Aura3D Studio',
    createdAt: 1700000000014,
    isFactory: true,
    tags: ['Estrellas', 'Warp Speed', 'Synthwave', 'Cosmos'],
    visualizerMode: 'synthwave',
    visualizerShape: 'spikes',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 1.15,
    bassBoomThreshold: 0.68,
    bassBoomIntensity: 1.3,
    isLucid: true,
    lucidPrimaryColor: '#00e5ff',
    lucidSecondaryColor: '#e0e7ff',
    sphereScale: 1.1,
    sphereOpacity: 0.95,
    musicSensitivity: 0.85,
    audioSpeed: 0.85,
    backgroundAtmosphere: 'stars',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#00e5ff',
      haloColor2: '#e0e7ff',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'stars',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_midnight_cyber_rain',
    name: 'Midnight Cyber Rain',
    description: 'Lluvia melancólica de neón nocturna con nube de partículas flotantes y reflejos púrpuras y cian.',
    author: 'Aura3D Studio',
    createdAt: 1700000000015,
    isFactory: true,
    tags: ['Lluvia', 'Lo-Fi', 'Chill', 'Atmósfera'],
    visualizerMode: 'blob',
    visualizerShape: 'cloud',
    waveEffectMode: 'sinusoidal',
    waveEffectIntensity: 0.9,
    bassBoomThreshold: 0.75,
    bassBoomIntensity: 0.9,
    isLucid: true,
    lucidPrimaryColor: '#a855f7',
    lucidSecondaryColor: '#06b6d4',
    sphereScale: 1.0,
    sphereOpacity: 0.9,
    blobScale: 1.0,
    musicSensitivity: 0.72,
    audioSpeed: 0.72,
    backgroundAtmosphere: 'rain',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#a855f7',
      haloColor2: '#06b6d4',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'rain',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
  },
  {
    id: 'factory_zenith_tidal_ripples',
    name: 'Zenith Tidal Ripples',
    description: 'Ondas líquidas concéntricas en el agua oceánica que reaccionan con suavidad zen a frecuencias graves.',
    author: 'Aura3D Studio',
    createdAt: 1700000000016,
    isFactory: true,
    tags: ['Ondas Agua', 'Zen', '3D Concentric', 'Esmeralda'],
    visualizerMode: 'sphere',
    visualizerShape: 'sphere',
    waveEffectMode: 'concentric',
    waveEffectIntensity: 0.85,
    bassBoomThreshold: 0.78,
    bassBoomIntensity: 0.8,
    isLucid: true,
    lucidPrimaryColor: '#10b981',
    lucidSecondaryColor: '#06b6d4',
    sphereScale: 1.05,
    sphereOpacity: 0.88,
    musicSensitivity: 0.7,
    audioSpeed: 0.7,
    backgroundAtmosphere: 'ripples',
    blobSettings: {
      circleColor: '#000000',
      haloColor1: '#10b981',
      haloColor2: '#06b6d4',
      isRainbowMode: false,
      circleSize: 179,
      haloSize: 202,
      posX: 50,
      posY: 50,
      bassBoost: 2.8,
      backgroundBlur: 20,
      logoStyle: 'ghost',
      customLogoUrl: null,
      scaleSensitivity: 1.4,
      backgroundAtmosphere: 'ripples',
      kickThreshold: 0.32,
      kickPower: 1.6,
    },
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
    const { blobSettings } = usePlayerStore.getState();
    const newPreset: ScenePreset = {
      ...presetData,
      backgroundAtmosphere: presetData.backgroundAtmosphere || blobSettings.backgroundAtmosphere,
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
    if (preset.backgroundAtmosphere) {
      store.updateBlobSettings({ backgroundAtmosphere: preset.backgroundAtmosphere });
    }

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
