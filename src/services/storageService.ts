import type { Playlist, Track, EqualizerBand, BlobCustomSettings } from '../types/audio';

const STORAGE_KEYS = {
  PLAYLISTS: 'auralis_playlists_v1',
  FAVORITES: 'auralis_favorites_v1',
  VOLUME: 'auralis_volume_v1',
  EQ_PRESET: 'auralis_eq_preset_v1',
  BLOB_SETTINGS: 'auralis_blob_settings_v1',
  SPHERE_SCALE: 'auralis_sphere_scale_v1',
  RAINBOW_SCALE: 'auralis_rainbow_scale_v1',
  LINK_SCALES: 'auralis_link_scales_v1',
  TOTAL_LISTENING_TIME: 'auralis_total_listening_time_v1',
  HIGH_SCORE: 'auralis_high_score_v1',
  LUCID_PRIMARY_COLOR: 'auralis_lucid_primary_color_v1',
  LUCID_SECONDARY_COLOR: 'auralis_lucid_secondary_color_v1',
  MUSIC_SENSITIVITY: 'auralis_music_sensitivity_v1',
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
  scaleSensitivity: 1.0,
};

export class StorageService {
  public static getLucidPrimaryColor(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.LUCID_PRIMARY_COLOR) || '#00f2fe';
    } catch {
      return '#00f2fe';
    }
  }

  public static saveLucidPrimaryColor(color: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LUCID_PRIMARY_COLOR, color);
    } catch (e) {
      console.warn('Failed to save lucid primary color to LocalStorage', e);
    }
  }

  public static getLucidSecondaryColor(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.LUCID_SECONDARY_COLOR) || '#ff088a';
    } catch {
      return '#ff088a';
    }
  }

  public static saveLucidSecondaryColor(color: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LUCID_SECONDARY_COLOR, color);
    } catch (e) {
      console.warn('Failed to save lucid secondary color to LocalStorage', e);
    }
  }

  public static getSphereScale(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SPHERE_SCALE);
      return val ? parseFloat(val) : 1.0;
    } catch {
      return 1.0;
    }
  }

  public static saveSphereScale(scale: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_SCALE, scale.toString());
    } catch (e) {
      console.warn('Failed to save sphere scale to LocalStorage', e);
    }
  }

  public static getRainbowScale(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.RAINBOW_SCALE);
      return val ? parseFloat(val) : 1.0;
    } catch {
      return 1.0;
    }
  }

  public static saveRainbowScale(scale: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RAINBOW_SCALE, scale.toString());
    } catch (e) {
      console.warn('Failed to save rainbow scale to LocalStorage', e);
    }
  }

  public static getMusicSensitivity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.MUSIC_SENSITIVITY);
      return val ? parseFloat(val) : 1.0;
    } catch {
      return 1.0;
    }
  }

  public static saveMusicSensitivity(sens: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MUSIC_SENSITIVITY, sens.toString());
    } catch (e) {
      console.warn('Failed to save music sensitivity to LocalStorage', e);
    }
  }

  public static getLinkScales(): boolean {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.LINK_SCALES);
      return val === 'true';
    } catch {
      return false;
    }
  }

  public static saveLinkScales(link: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LINK_SCALES, link ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save link scales to LocalStorage', e);
    }
  }

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

  public static getTotalListeningTime(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.TOTAL_LISTENING_TIME);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  public static saveTotalListeningTime(seconds: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TOTAL_LISTENING_TIME, Math.floor(seconds).toString());
    } catch (e) {
      console.warn('Failed to save total listening time to LocalStorage', e);
    }
  }

  public static getHighScore(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  public static saveHighScore(score: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, Math.floor(score).toString());
    } catch (e) {
      console.warn('Failed to save high score to LocalStorage', e);
    }
  }
}
