import type { Playlist, Track, EqualizerBand, BlobCustomSettings, VisualizerShape, WaveEffectMode, VisualizerMode } from '../types/audio';

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
  SPHERE_SHAPE: 'auralis_sphere_shape_v1',
  SPHERE_WAVE_MODE: 'auralis_sphere_wave_mode_v1',
  SPHERE_WAVE_INTENSITY: 'auralis_sphere_wave_intensity_v1',
  SPHERE_BASS_BOOM_THRESHOLD: 'auralis_sphere_bass_boom_threshold_v1',
  SPHERE_BASS_BOOM_INTENSITY: 'auralis_sphere_bass_boom_intensity_v1',
  BLOB_SHAPE: 'auralis_blob_shape_v1',
  BLOB_WAVE_MODE: 'auralis_blob_wave_mode_v1',
  BLOB_WAVE_INTENSITY: 'auralis_blob_wave_intensity_v1',
  BLOB_BASS_BOOM_THRESHOLD: 'auralis_blob_bass_boom_threshold_v1',
  BLOB_BASS_BOOM_INTENSITY: 'auralis_blob_bass_boom_intensity_v1',
  VISUALIZER_MODE: 'auralis_visualizer_mode_v1',
  ACTIVE_EQ_PRESET_ID: 'auralis_active_eq_preset_id_v1',
  PERFORMANCE_TIER: 'auralis_performance_tier_v1',
  USER_TOKEN: 'auralis_user_jwt_token',
};

export const DEFAULT_BLOB_SETTINGS: BlobCustomSettings = {
  circleColor: '#000000',
  haloColor1: '#ff088a',
  haloColor2: '#00f2fe',
  isRainbowMode: true,
  circleSize: 179, // Diámetro Núcleo (Void): 179px
  haloSize: 202,   // Diámetro Halo Exterior: 202px
  posX: 50,
  posY: 50,
  bassBoost: 2.8,  // Reacción al Bajo (Bass): Multiplicador de 2.8x
  backgroundBlur: 0,
  logoStyle: 'ghost',
  customLogoUrl: null,
  scaleSensitivity: 1.40, // Sensibilidad de Escala: 1.40x
  customBackgroundImage: null,
  backgroundOpacity: 0.85,
  backgroundFit: 'cover',
  backgroundScale: 1.0,
  backgroundAtmosphere: 'none', // Por defecto desactivado (fondo limpio etéreo)
  atmosphereSpeed: 1.0,
  atmosphereGlow: 1.0,
  atmosphereSmoothing: 0.20,
  atmosphereBlend: 'none',
  kickThreshold: 0.32, // Umbral Disparo Kick: 32%
  kickPower: 1.60,     // Potencia Subwoofer Kick: 160%
  dhonkioInnerSize: 0.14,
  dhonkioOuterSize: 0.35,
  dhonkioOpacity: 0.42,
  dhonkioBloom: 1.33,
  dhonkioPowerBass: 1.035,
  dhonkioPowerMid: 1.08,
  dhonkioPowerKick: 1.045,
  dhonkioKickBoost: 6,
  isUiHidden: false,
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
    // Rainbow Void scale strictly locked to reference 0.5x
    return 0.5;
  }

  public static saveRainbowScale(_scale: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RAINBOW_SCALE, '0.5');
    } catch (e) {
      console.warn('Failed to save rainbow scale to LocalStorage', e);
    }
  }

  public static getMusicSensitivity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.MUSIC_SENSITIVITY);
      const parsed = val ? parseFloat(val) : 0.75;
      return Math.min(0.85, Math.max(0.60, isNaN(parsed) ? 0.75 : parsed));
    } catch {
      return 0.75;
    }
  }

  public static saveMusicSensitivity(sens: number): void {
    try {
      const clamped = Math.min(0.85, Math.max(0.60, sens));
      localStorage.setItem(STORAGE_KEYS.MUSIC_SENSITIVITY, clamped.toString());
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

  public static getVisualizerMode(): VisualizerMode {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.VISUALIZER_MODE) as VisualizerMode;
      return val === 'sphere' || val === 'blob' || val === 'synthwave' ? val : 'sphere';
    } catch {
      return 'sphere';
    }
  }

  public static saveVisualizerMode(mode: VisualizerMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VISUALIZER_MODE, mode);
    } catch (e) {
      console.warn('Failed to save visualizer mode to LocalStorage', e);
    }
  }

  public static getActiveEqPresetId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_EQ_PRESET_ID) || 'flat';
    } catch {
      return 'flat';
    }
  }

  public static saveActiveEqPresetId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EQ_PRESET_ID, id);
    } catch (e) {
      console.warn('Failed to save active EQ preset ID to LocalStorage', e);
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

  // ── Sphere 3D Isolated Config Persistence ────────────────────────
  public static getSphereShape(): VisualizerShape {
    try {
      return (localStorage.getItem(STORAGE_KEYS.SPHERE_SHAPE) as VisualizerShape) || 'sphere';
    } catch {
      return 'sphere';
    }
  }

  public static saveSphereShape(shape: VisualizerShape): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_SHAPE, shape);
    } catch (e) {
      console.warn('Failed to save sphere shape to LocalStorage', e);
    }
  }

  public static getSphereWaveMode(): WaveEffectMode {
    try {
      return (localStorage.getItem(STORAGE_KEYS.SPHERE_WAVE_MODE) as WaveEffectMode) || 'concentric';
    } catch {
      return 'concentric';
    }
  }

  public static saveSphereWaveMode(mode: WaveEffectMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_WAVE_MODE, mode);
    } catch (e) {
      console.warn('Failed to save sphere wave mode to LocalStorage', e);
    }
  }

  public static getSphereWaveIntensity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SPHERE_WAVE_INTENSITY);
      return val !== null ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  }

  public static saveSphereWaveIntensity(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_WAVE_INTENSITY, val.toString());
    } catch (e) {
      console.warn('Failed to save sphere wave intensity to LocalStorage', e);
    }
  }

  public static getSphereBassBoomThreshold(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SPHERE_BASS_BOOM_THRESHOLD);
      return val !== null ? parseFloat(val) : 0.45;
    } catch {
      return 0.45;
    }
  }

  public static saveSphereBassBoomThreshold(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_BASS_BOOM_THRESHOLD, val.toString());
    } catch (e) {
      console.warn('Failed to save sphere bass boom threshold to LocalStorage', e);
    }
  }

  public static getSphereBassBoomIntensity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SPHERE_BASS_BOOM_INTENSITY);
      return val !== null ? parseFloat(val) : 1.0;
    } catch {
      return 1.0;
    }
  }

  public static saveSphereBassBoomIntensity(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SPHERE_BASS_BOOM_INTENSITY, val.toString());
    } catch (e) {
      console.warn('Failed to save sphere bass boom intensity to LocalStorage', e);
    }
  }

  // ── RainbowBlob 2D Isolated Config Persistence ───────────────────
  public static getBlobShape(): VisualizerShape {
    try {
      return (localStorage.getItem(STORAGE_KEYS.BLOB_SHAPE) as VisualizerShape) || 'sphere';
    } catch {
      return 'sphere';
    }
  }

  public static saveBlobShape(shape: VisualizerShape): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_SHAPE, shape);
    } catch (e) {
      console.warn('Failed to save blob shape to LocalStorage', e);
    }
  }

  public static getBlobWaveMode(): WaveEffectMode {
    try {
      return (localStorage.getItem(STORAGE_KEYS.BLOB_WAVE_MODE) as WaveEffectMode) || 'concentric';
    } catch {
      return 'concentric';
    }
  }

  public static saveBlobWaveMode(mode: WaveEffectMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_WAVE_MODE, mode);
    } catch (e) {
      console.warn('Failed to save blob wave mode to LocalStorage', e);
    }
  }

  public static getBlobWaveIntensity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BLOB_WAVE_INTENSITY);
      return val !== null ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  }

  public static saveBlobWaveIntensity(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_WAVE_INTENSITY, val.toString());
    } catch (e) {
      console.warn('Failed to save blob wave intensity to LocalStorage', e);
    }
  }

  public static getBlobBassBoomThreshold(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BLOB_BASS_BOOM_THRESHOLD);
      return val !== null ? parseFloat(val) : 0.68; // 32% kick trigger threshold
    } catch {
      return 0.68;
    }
  }

  public static saveBlobBassBoomThreshold(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_BASS_BOOM_THRESHOLD, val.toString());
    } catch (e) {
      console.warn('Failed to save blob bass boom threshold to LocalStorage', e);
    }
  }

  public static getBlobBassBoomIntensity(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BLOB_BASS_BOOM_INTENSITY);
      return val !== null ? parseFloat(val) : 1.6; // 160% subwoofer kick power
    } catch {
      return 1.6;
    }
  }

  public static saveBlobBassBoomIntensity(val: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOB_BASS_BOOM_INTENSITY, val.toString());
    } catch (e) {
      console.warn('Failed to save blob bass boom intensity to LocalStorage', e);
    }
  }

  public static getPerformanceTier(): 'high' | 'medium' | 'eco' {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PERFORMANCE_TIER);
      if (val === 'eco' || val === 'medium' || val === 'high') {
        return val;
      }
      return 'high';
    } catch {
      return 'high';
    }
  }

  public static savePerformanceTier(tier: 'high' | 'medium' | 'eco'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE_TIER, tier);
    } catch (e) {
      console.warn('Failed to save performance tier to LocalStorage', e);
    }
  }

  public static getUserToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    } catch {
      return null;
    }
  }

  public static saveUserToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    } catch (e) {
      console.warn('Failed to save user token to LocalStorage', e);
    }
  }

  public static removeUserToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    } catch (e) {
      console.warn('Failed to remove user token from LocalStorage', e);
    }
  }
}
