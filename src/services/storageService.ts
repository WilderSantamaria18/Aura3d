import type { Playlist, Track, EqualizerBand, BlobCustomSettings } from '../types/audio';

const STORAGE_KEYS = {
  PLAYLISTS: 'auralis_playlists_v1',
  FAVORITES: 'auralis_favorites_v1',
  VOLUME: 'auralis_volume_v1',
  EQ_PRESET: 'auralis_eq_preset_v1',
  BLOB_SETTINGS: 'auralis_blob_settings_v1',
};

export const DEFAULT_BLOB_SETTINGS: BlobCustomSettings = {
  circleColor: '#050711',
  haloColor1: '#ff088a',
  haloColor2: '#00f2fe',
  isRainbowMode: true,
  circleSize: 220,
  haloSize: 320,
  posX: 50,
  posY: 50,
  bassBoost: 5,
  backgroundBlur: 30,
  logoStyle: 'ghost',
  customLogoUrl: null,
};

export class StorageService {
  public static getPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static savePlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.warn('Failed to save playlists to LocalStorage', e);
    }
  }

  public static getFavorites(): Track[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveFavorites(favorites: Track[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to LocalStorage', e);
    }
  }

  public static getVolume(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.VOLUME);
      return val ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  }

  public static saveVolume(volume: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VOLUME, volume.toString());
    } catch (e) {
      console.warn('Failed to save volume to LocalStorage', e);
    }
  }

  public static getEqBands(): EqualizerBand[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EQ_PRESET);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public static saveEqBands(bands: EqualizerBand[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EQ_PRESET, JSON.stringify(bands));
    } catch (e) {
      console.warn('Failed to save EQ preset to LocalStorage', e);
    }
  }

  public static getBlobSettings(): BlobCustomSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BLOB_SETTINGS);
      return data ? { ...DEFAULT_BLOB_SETTINGS, ...JSON.parse(data) } : DEFAULT_BLOB_SETTINGS;
    } catch {
      return DEFAULT_BLOB_SETTINGS;
    }
  }

  public static saveBlobSettings(settings: BlobCustomSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save Blob settings to LocalStorage', e);
    }
  }
}
